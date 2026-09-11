import { describe, expect, it } from 'vitest';
import { formatRuntimeDebugSnapshot, parseRuntimeDebugOptions } from './runtimeDebug';

describe('formatRuntimeDebugSnapshot', () => {
  it('keeps the runtime facts compact and deterministic', () => {
    expect(
      formatRuntimeDebugSnapshot({
        scene: 'planet-hub',
        viewport: '390x844',
        camera: 'z=1.08 x=12 y=18',
        mode: 'english',
        objects: 24,
        detail: 'places=6 actor=nova',
        metrics: {
          actors: 1,
          tweens: 0,
          resizeListeners: 1,
        },
      }),
    ).toBe(
      [
        'scene planet-hub',
        'viewport 390x844',
        'camera z=1.08 x=12 y=18',
        'mode english',
        'objects 24',
        'places=6 actor=nova',
        'actors=1 tweens=0 resizeListeners=1',
      ].join('\n'),
    );
  });
});

describe('parseRuntimeDebugOptions', () => {
  it('publishes deterministic snapshots without showing instrumentation by default', () => {
    expect(parseRuntimeDebugOptions('?runtimeDebug=1', true)).toEqual({
      enabled: true,
      overlay: false,
    });
  });

  it('shows the overlay only when explicitly requested with runtime instrumentation', () => {
    expect(parseRuntimeDebugOptions('?runtimeDebug=1&runtimeDebugOverlay=1', true)).toEqual({
      enabled: true,
      overlay: true,
    });
    expect(parseRuntimeDebugOptions('?runtimeDebugOverlay=1', true)).toEqual({
      enabled: false,
      overlay: false,
    });
  });

  it('keeps all runtime debug instrumentation disabled outside development', () => {
    expect(parseRuntimeDebugOptions('?runtimeDebug=1&runtimeDebugOverlay=1', false)).toEqual({
      enabled: false,
      overlay: false,
    });
  });
});
