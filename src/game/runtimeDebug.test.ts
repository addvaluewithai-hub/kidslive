import { describe, expect, it } from 'vitest';
import { formatRuntimeDebugSnapshot } from './runtimeDebug';

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
