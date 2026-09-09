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
        detail: 'places=6 tweens=0',
      }),
    ).toBe(
      [
        'scene planet-hub',
        'viewport 390x844',
        'camera z=1.08 x=12 y=18',
        'mode english',
        'objects 24',
        'places=6 tweens=0',
      ].join('\n'),
    );
  });
});
