import { describe, expect, it } from 'vitest';

import { createProductContext } from './ProductContext';

describe('createProductContext', () => {
  it('keeps audience, theme, profile, and world identity replaceable', () => {
    const context = createProductContext({
      audience: { id: 'kids-primary' },
      theme: { id: 'space-learning' },
      profile: { profileId: 'profile-1' },
      world: {
        worldId: 'world-1',
        ownerProfileId: 'profile-1',
        visibility: 'private',
      },
    });

    expect(context).toEqual({
      audience: { id: 'kids-primary' },
      theme: { id: 'space-learning' },
      profile: { profileId: 'profile-1' },
      world: {
        worldId: 'world-1',
        ownerProfileId: 'profile-1',
        visibility: 'private',
      },
    });
  });

  it('rejects a world that is not owned by the active profile', () => {
    expect(() =>
      createProductContext({
        audience: { id: 'kids-primary' },
        theme: { id: 'space-learning' },
        profile: { profileId: 'profile-1' },
        world: {
          worldId: 'world-1',
          ownerProfileId: 'profile-2',
          visibility: 'private',
        },
      }),
    ).toThrow('World owner must match the active profile');
  });
});
