export type HabitId = 'water' | 'read' | 'bed';
export type HabitStatus = 'open' | 'done' | 'pending';
export type SeedChoice = 'water' | 'tree' | null;
export type FlowerType = 'water' | 'moon' | null;
export type StoryLocation = 'meadow' | 'river';
export type NovaMode = 'mock' | 'live';

export type StoryEventId =
  | 'light_strengthens'
  | 'path_opens'
  | 'seed_discovered'
  | 'flower_blooms'
  | 'lumi_emerges'
  | 'shelter_step_1'
  | 'shelter_complete'
  | 'hidden_path_unlock';

export type HabitDefinition = {
  id: HabitId;
  label: string;
  verification: 'child_trust' | 'parent_approval';
};

export type DayDefinition = {
  day: number;
  location: StoryLocation;
  entryState: string;
  hint: string;
  intro: string;
  requiredHabits: number;
  events: StoryEventId[];
  resolvedLine: string;
  hook: string;
};

export type SproutStoryState = {
  currentPlanet: 'sprout';
  currentDay: number;
  currentLocation: StoryLocation;
  habits: Record<HabitId, HabitStatus>;
  dayResolved: boolean;
  lastResolvedDate: string | null;
  seedDiscovered: boolean;
  seedChoice: SeedChoice;
  flowerType: FlowerType;
  lumiDiscovered: boolean;
  shelterProgress: 0 | 1 | 2;
  hiddenPathUnlocked: boolean;
  storyEventsSeen: StoryEventId[];
  novaMode: NovaMode;
};
