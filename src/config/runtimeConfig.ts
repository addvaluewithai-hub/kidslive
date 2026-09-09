export type RuntimeMode = 'development' | 'test' | 'production';

export interface RuntimeConfig {
  mode: RuntimeMode;
  diagnosticsEnabled: boolean;
}

export type RuntimeEnv = Readonly<Record<string, string | boolean | undefined>>;

function parseMode(value: RuntimeEnv[string]): RuntimeMode {
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

function parseBoolean(value: RuntimeEnv[string], fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;

  switch (value.trim().toLowerCase()) {
    case '1':
    case 'true':
    case 'yes':
    case 'on':
      return true;
    case '0':
    case 'false':
    case 'no':
    case 'off':
      return false;
    default:
      return fallback;
  }
}

export function createRuntimeConfig(env: RuntimeEnv): RuntimeConfig {
  const mode = parseMode(env.MODE);

  return Object.freeze({
    mode,
    diagnosticsEnabled: parseBoolean(env.VITE_DIAGNOSTICS_ENABLED, mode !== 'production'),
  });
}

export function loadRuntimeConfig(): RuntimeConfig {
  return createRuntimeConfig(import.meta.env);
}
