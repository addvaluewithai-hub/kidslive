import { englishSliceCompletion } from './english/EnglishSliceCompletion';

export type HubNormalizedPosition = {
  x: number;
  y: number;
};

export type HubPlace = {
  id: string;
  label: string;
  subtitle: string;
  color: number;
  layout: {
    desktop: HubNormalizedPosition;
    compact: HubNormalizedPosition;
  };
};

const ENGLISH_PLACE: HubPlace = {
  id: 'english',
  label: 'English',
  get subtitle() {
    return englishSliceCompletion.completed ? 'First word learned ✓' : 'Words & stories';
  },
  color: 0x68b8ff,
  layout: { desktop: { x: -0.34, y: -0.2 }, compact: { x: -0.23, y: -0.28 } },
};

export const HUB_PLACES: readonly HubPlace[] = [
  ENGLISH_PLACE,
  {
    id: 'science',
    label: 'Science',
    subtitle: 'Discover & test',
    color: 0x72d6a3,
    layout: { desktop: { x: 0, y: -0.32 }, compact: { x: 0.23, y: -0.2 } },
  },
  {
    id: 'math',
    label: 'Math',
    subtitle: 'Patterns & puzzles',
    color: 0xffc766,
    layout: { desktop: { x: 0.34, y: -0.14 }, compact: { x: -0.2, y: 0.02 } },
  },
  {
    id: 'chess',
    label: 'Chess',
    subtitle: 'Think ahead',
    color: 0xb59cff,
    layout: { desktop: { x: -0.28, y: 0.24 }, compact: { x: 0.21, y: 0.1 } },
  },
  {
    id: 'art',
    label: 'Art',
    subtitle: 'Make & imagine',
    color: 0xff8eb5,
    layout: { desktop: { x: 0.08, y: 0.18 }, compact: { x: -0.22, y: 0.31 } },
  },
  {
    id: 'music',
    label: 'Music',
    subtitle: 'Listen & create',
    color: 0x65ded7,
    layout: { desktop: { x: 0.36, y: 0.3 }, compact: { x: 0.2, y: 0.38 } },
  },
];

export function getHubPlace(placeId: string): HubPlace | undefined {
  return HUB_PLACES.find((place) => place.id === placeId);
}

export function isCompactHubViewport(width: number): boolean {
  return width < 700;
}

export function resolveHubPlacePosition(
  place: HubPlace,
  width: number,
  height: number,
): HubNormalizedPosition {
  const compact = isCompactHubViewport(width);
  const normalized = compact ? place.layout.compact : place.layout.desktop;
  const centerX = width / 2;
  const centerY = compact ? Math.max(360, height * 0.52) : Math.max(350, height * 0.54);
  const spreadX = Math.min(compact ? 520 : 1040, width - (compact ? 32 : 120));
  const spreadY = Math.min(compact ? 660 : 520, height - (compact ? 150 : 170));

  return {
    x: centerX + normalized.x * spreadX,
    y: centerY + normalized.y * spreadY,
  };
}
