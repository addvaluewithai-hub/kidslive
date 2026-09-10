import { describe, expect, it } from 'vitest';
import { KIDSLIVE_COMPANION, TEST_COMPANION } from './characterDefinitions';

describe('character definitions', () => {
  it('keeps identity and authored asset keys replaceable behind one renderer contract', () => {
    expect(KIDSLIVE_COMPANION.id).toBe('nova');
    expect(TEST_COMPANION.id).toBe('ember');
    expect(TEST_COMPANION.displayName).not.toBe(KIDSLIVE_COMPANION.displayName);
    expect(TEST_COMPANION.palette).not.toEqual(KIDSLIVE_COMPANION.palette);

    expect(TEST_COMPANION.supportedActions).toEqual(KIDSLIVE_COMPANION.supportedActions);
    expect(TEST_COMPANION.supportedEmotions).toEqual(KIDSLIVE_COMPANION.supportedEmotions);
    expect(TEST_COMPANION.assetPack.assets).toHaveLength(1);
    expect(TEST_COMPANION.visual.shellTextureKey).toBe('character:ember:shell');
    expect(TEST_COMPANION.assetPack.assets[0]).toMatchObject({
      key: 'character:ember:shell',
      url: '/assets/characters/companion-shell.svg',
      ownership: 'persistent',
    });
  });
});
