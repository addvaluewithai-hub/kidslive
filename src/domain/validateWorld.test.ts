import { describe, expect, it } from 'vitest';
import { PLACES } from '../game/worldConfig';
import { validatePlaces } from './validateWorld';

describe('world definition', () => {
  it('keeps place ids unique and all places inside world bounds', () => {
    expect(validatePlaces()).toEqual({ ok: true });
  });

  it('contains the six initial product directions', () => {
    expect(PLACES.map((place) => place.id)).toEqual([
      'english',
      'german',
      'chess',
      'knowledge',
      'habits',
      'lab',
    ]);
  });
});
