import { getSproutDay } from './sproutStory';
import type { HabitId, SeedChoice, SproutStoryState, StoryEventId } from './types';

const STORAGE_KEY = 'kidslive.sprout-story.v1';
const CHANGE_EVENT = 'kidslive:sprout-story-change';

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const blankHabits = () => ({ water: 'open', read: 'open', bed: 'open' } as const);

export const initialSproutState = (): SproutStoryState => ({
  currentPlanet: 'sprout',
  currentDay: 1,
  currentLocation: 'meadow',
  habits: { ...blankHabits() },
  dayResolved: false,
  lastResolvedDate: null,
  seedDiscovered: false,
  seedChoice: null,
  flowerType: null,
  lumiDiscovered: false,
  shelterProgress: 0,
  hiddenPathUnlocked: false,
  storyEventsSeen: [],
  novaMode: 'mock',
});

function sanitize(input: Partial<SproutStoryState>): SproutStoryState {
  const base = initialSproutState();
  const currentDay = Math.max(1, Math.min(7, Number(input.currentDay) || 1));
  return {
    ...base,
    ...input,
    currentDay,
    currentLocation: currentDay >= 3 ? 'river' : 'meadow',
    habits: {
      water: input.habits?.water ?? 'open',
      read: input.habits?.read ?? 'open',
      bed: input.habits?.bed ?? 'open',
    },
    storyEventsSeen: Array.isArray(input.storyEventsSeen) ? input.storyEventsSeen : [],
  };
}

function load(): SproutStoryState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialSproutState();
    return sanitize(JSON.parse(raw) as Partial<SproutStoryState>);
  } catch {
    return initialSproutState();
  }
}

let state = load();

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: state }));
}

function markEvent(event: StoryEventId) {
  if (!state.storyEventsSeen.includes(event)) state.storyEventsSeen = [...state.storyEventsSeen, event];
  if (event === 'seed_discovered') state.seedDiscovered = true;
  if (event === 'lumi_emerges') state.lumiDiscovered = true;
  if (event === 'shelter_step_1') state.shelterProgress = 1;
  if (event === 'shelter_complete') state.shelterProgress = 2;
  if (event === 'hidden_path_unlock') state.hiddenPathUnlocked = true;
  if (event === 'path_opens') state.currentLocation = 'river';
}

function resolveDayIfReady() {
  if (state.dayResolved) return;
  const day = getSproutDay(state.currentDay);
  const completeCount = Object.values(state.habits).filter((status) => status === 'done').length;
  if (completeCount < day.requiredHabits) return;

  day.events.forEach(markEvent);
  if (state.currentDay === 3 && !state.seedChoice) {
    persist();
    return;
  }
  state.dayResolved = true;
  state.lastResolvedDate = todayKey();
  persist();
}

export const sproutStoryStore = {
  getState() {
    return state;
  },
  subscribe(listener: (next: SproutStoryState) => void) {
    const handler = (event: Event) => listener((event as CustomEvent<SproutStoryState>).detail);
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  },
  toggleHabit(id: HabitId) {
    if (state.dayResolved) return;
    const current = state.habits[id];
    if (id === 'bed') {
      state = { ...state, habits: { ...state.habits, bed: current === 'pending' ? 'open' : 'pending' } };
    } else {
      state = { ...state, habits: { ...state.habits, [id]: current === 'done' ? 'open' : 'done' } };
    }
    persist();
    resolveDayIfReady();
  },
  approveBed() {
    if (state.habits.bed !== 'pending') return;
    state = { ...state, habits: { ...state.habits, bed: 'done' } };
    persist();
    resolveDayIfReady();
  },
  chooseSeed(choice: Exclude<SeedChoice, null>) {
    if (!state.seedDiscovered || state.seedChoice) return;
    state = {
      ...state,
      seedChoice: choice,
      flowerType: choice === 'water' ? 'water' : 'moon',
      dayResolved: true,
      lastResolvedDate: todayKey(),
    };
    persist();
  },
  jumpToDay(day: number) {
    const currentDay = Math.max(1, Math.min(7, day));
    state = {
      ...state,
      currentDay,
      currentLocation: currentDay >= 3 ? 'river' : 'meadow',
      habits: { ...blankHabits() },
      dayResolved: false,
      lastResolvedDate: null,
    };
    persist();
  },
  completeTrustedHabits() {
    state = { ...state, habits: { ...state.habits, water: 'done', read: 'done' } };
    persist();
    resolveDayIfReady();
  },
  nextDayForDemo() {
    if (state.currentDay >= 7) return;
    this.jumpToDay(state.currentDay + 1);
  },
  setShelterProgress(progress: 0 | 1 | 2) {
    state = { ...state, shelterProgress: progress };
    persist();
  },
  setLumiDiscovered(value: boolean) {
    state = { ...state, lumiDiscovered: value };
    persist();
  },
  setHiddenPath(value: boolean) {
    state = { ...state, hiddenPathUnlocked: value };
    persist();
  },
  setNovaMode(mode: 'mock' | 'live') {
    state = { ...state, novaMode: mode };
    persist();
  },
  reset() {
    state = initialSproutState();
    persist();
  },
  rollForwardIfNewDay() {
    if (!state.dayResolved || !state.lastResolvedDate || state.currentDay >= 7) return;
    if (state.lastResolvedDate === todayKey()) return;
    this.jumpToDay(state.currentDay + 1);
  },
};
