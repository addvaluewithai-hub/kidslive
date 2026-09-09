export type HubPlace = {
  id: string;
  label: string;
  subtitle: string;
  color: number;
};

export const HUB_PLACES: readonly HubPlace[] = [
  { id: 'english', label: 'English', subtitle: 'Words & stories', color: 0x68b8ff },
  { id: 'science', label: 'Science', subtitle: 'Discover & test', color: 0x72d6a3 },
  { id: 'math', label: 'Math', subtitle: 'Patterns & puzzles', color: 0xffc766 },
  { id: 'chess', label: 'Chess', subtitle: 'Think ahead', color: 0xb59cff },
  { id: 'art', label: 'Art', subtitle: 'Make & imagine', color: 0xff8eb5 },
  { id: 'music', label: 'Music', subtitle: 'Listen & create', color: 0x65ded7 },
];

export function getHubPlace(placeId: string): HubPlace | undefined {
  return HUB_PLACES.find((place) => place.id === placeId);
}
