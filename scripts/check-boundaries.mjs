import { readFile, readdir } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const coreRoot = resolve(repoRoot, 'src/core');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const forbiddenPackages = ['react', 'react-dom', 'phaser', '@capacitor/'];
const forbiddenCoreDestinations = ['src/game/', 'src/config/'];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (sourceExtensions.has(extname(entry.name))) files.push(path);
  }

  return files;
}

function extractSpecifiers(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }

  return specifiers;
}

function packageViolation(specifier) {
  return forbiddenPackages.find(
    (name) => specifier === name || (name.endsWith('/') && specifier.startsWith(name)),
  );
}

function relativeViolation(file, specifier) {
  if (!specifier.startsWith('.')) return null;

  const target = resolve(file, '..', specifier);
  const repoRelativeTarget = relative(repoRoot, target).replaceAll('\\', '/');
  return forbiddenCoreDestinations.find((prefix) => repoRelativeTarget.startsWith(prefix)) ?? null;
}

const violations = [];

for (const file of await walk(coreRoot)) {
  const source = await readFile(file, 'utf8');
  for (const specifier of extractSpecifiers(source)) {
    const forbiddenPackage = packageViolation(specifier);
    const forbiddenDestination = relativeViolation(file, specifier);

    if (forbiddenPackage || forbiddenDestination) {
      violations.push({
        file: relative(repoRoot, file).replaceAll('\\', '/'),
        specifier,
        reason: forbiddenPackage
          ? `framework/native dependency "${forbiddenPackage}"`
          : `outward core dependency into "${forbiddenDestination}"`,
      });
    }
  }
}

if (violations.length > 0) {
  console.error('Core package boundary violations found:');
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.specifier} (${violation.reason})`);
  }
  process.exitCode = 1;
} else {
  console.log('Core package boundaries OK.');
}
