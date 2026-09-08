import { PLACES, WORLD_SIZE, type PlaceDefinition } from '../game/worldConfig';

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validatePlaces(
  places: readonly PlaceDefinition[] = PLACES,
  bounds = WORLD_SIZE,
): ValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const place of places) {
    if (ids.has(place.id)) errors.push(`Duplicate place id: ${place.id}`);
    ids.add(place.id);

    if (place.x < 0 || place.x > bounds.width || place.y < 0 || place.y > bounds.height) {
      errors.push(`Place outside world bounds: ${place.id}`);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
