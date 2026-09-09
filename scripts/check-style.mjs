import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const ROOT = process.cwd();
const INCLUDED_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.yaml',
  '.yml',
]);
const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  'android',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

async function collectFiles(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRECTORIES.has(entry)) continue;

    const path = join(directory, entry);
    const info = await stat(path);

    if (info.isDirectory()) {
      files.push(...(await collectFiles(path)));
      continue;
    }

    if (INCLUDED_EXTENSIONS.has(extname(entry)) || entry === '.editorconfig') {
      files.push(path);
    }
  }

  return files;
}

const problems = [];
for (const path of await collectFiles(ROOT)) {
  const content = await readFile(path, 'utf8');
  const name = relative(ROOT, path);

  if (content.includes('\r')) problems.push(`${name}: use LF line endings`);
  if (content.includes('\t')) problems.push(`${name}: use spaces, not tabs`);
  if (!content.endsWith('\n')) problems.push(`${name}: add a final newline`);

  content.split('\n').forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      problems.push(`${name}:${index + 1}: remove trailing whitespace`);
    }
  });
}

if (problems.length > 0) {
  console.error('Style check failed:\n' + problems.map((problem) => `- ${problem}`).join('\n'));
  process.exit(1);
}

console.log('Style check passed.');
