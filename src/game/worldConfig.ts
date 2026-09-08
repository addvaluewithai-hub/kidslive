export type PlaceDefinition = {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  accent: number;
};

export const WORLD_SIZE = { width: 2600, height: 1600 } as const;

export const PLACES: readonly PlaceDefinition[] = [
  { id: 'english', name: 'English Grove', subtitle: 'Stories & speaking', x: 620, y: 430, accent: 0x58d7ff },
  { id: 'german', name: 'German Harbor', subtitle: 'Words & adventures', x: 1320, y: 280, accent: 0xffca5c },
  { id: 'chess', name: 'Chess Citadel', subtitle: 'Think ahead', x: 2030, y: 470, accent: 0xc48cff },
  { id: 'knowledge', name: 'Wonder Observatory', subtitle: 'How do we know?', x: 520, y: 1120, accent: 0xff83bd },
  { id: 'habits', name: 'Habit Garden', subtitle: 'Grow your streaks', x: 1320, y: 1260, accent: 0x72e6a6 },
  { id: 'lab', name: 'Experiment Lab', subtitle: 'Play, build, discover', x: 2100, y: 1080, accent: 0xff8e62 },
] as const;
