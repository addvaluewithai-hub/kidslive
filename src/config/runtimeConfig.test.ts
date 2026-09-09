import { describe, expect, it } from 'vitest';
import { createRuntimeConfig } from './runtimeConfig';

describe('createRuntimeConfig', () => {
  it('defaults to development mode with diagnostics enabled', () => {
    expect(createRuntimeConfig({})).toEqual({
      mode: 'development',
      diagnosticsEnabled: true,
    });
  });

  it('defaults diagnostics off in production', () => {
    expect(createRuntimeConfig({ MODE: 'production' })).toEqual({
      mode: 'production',
      diagnosticsEnabled: false,
    });
  });

  it('parses explicit boolean-like diagnostics values', () => {
    expect(createRuntimeConfig({ VITE_DIAGNOSTICS_ENABLED: 'true' }).diagnosticsEnabled).toBe(true);
    expect(createRuntimeConfig({ VITE_DIAGNOSTICS_ENABLED: '0' }).diagnosticsEnabled).toBe(false);
    expect(createRuntimeConfig({ VITE_DIAGNOSTICS_ENABLED: true }).diagnosticsEnabled).toBe(true);
  });

  it('falls back safely for invalid mode and diagnostics values', () => {
    expect(
      createRuntimeConfig({
        MODE: 'staging',
        VITE_DIAGNOSTICS_ENABLED: 'sometimes',
      }),
    ).toEqual({
      mode: 'development',
      diagnosticsEnabled: true,
    });
  });

  it('returns an immutable config object', () => {
    expect(Object.isFrozen(createRuntimeConfig({}))).toBe(true);
  });
});
