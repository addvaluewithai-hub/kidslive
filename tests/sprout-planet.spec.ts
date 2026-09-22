import { expect, test } from '@playwright/test';

type StoryState = {
  currentDay: number;
  habits: { water: string; read: string; bed: string };
  dayResolved: boolean;
  seedDiscovered: boolean;
  seedChoice: 'water' | 'tree' | null;
  flowerType: 'water' | 'moon' | null;
  lumiDiscovered: boolean;
  shelterProgress: number;
  hiddenPathUnlocked: boolean;
  storyEventsSeen: string[];
};

async function storyAction(
  page: import('@playwright/test').Page,
  action: string,
  argument?: unknown,
): Promise<StoryState> {
  return page.evaluate(
    async ({ actionName, arg }) => {
      const modulePath = '/src/story/storyStore.ts';
      const { sproutStoryStore } = await import(/* @vite-ignore */ modulePath);
      const store = sproutStoryStore as unknown as Record<string, (...args: unknown[]) => unknown> & {
        getState: () => StoryState;
      };
      const fn = store[actionName];
      if (typeof fn !== 'function') throw new Error(`Unknown Sprout story action: ${actionName}`);
      if (arg === undefined) fn.call(store);
      else fn.call(store, arg);
      return store.getState();
    },
    { actionName: action, arg: argument },
  );
}

async function currentStoryState(page: import('@playwright/test').Page): Promise<StoryState> {
  return page.evaluate(async () => {
    const modulePath = '/src/story/storyStore.ts';
    const { sproutStoryStore } = await import(/* @vite-ignore */ modulePath);
    return sproutStoryStore.getState() as StoryState;
  });
}

test('Sprout 7-day state machine keeps approval, choice, Lumi and cliffhanger persistent', async ({ page }, testInfo) => {
  test.setTimeout(55_000);
  await page.goto('/?dev=1');
  const canvas = page.locator('.game-root > canvas').first();
  await expect(canvas).toBeVisible();

  await storyAction(page, 'reset');
  let state = await storyAction(page, 'toggleHabit', 'water');
  expect(state.habits.water).toBe('done');
  state = await storyAction(page, 'toggleHabit', 'bed');
  expect(state.habits.bed).toBe('pending');
  expect(state.dayResolved).toBe(false);

  state = await storyAction(page, 'approveBed');
  expect(state.habits.bed).toBe('done');
  expect(state.dayResolved).toBe(true);
  expect(state.storyEventsSeen).toContain('light_strengthens');

  await storyAction(page, 'jumpToDay', 3);
  state = await storyAction(page, 'completeTrustedHabits');
  expect(state.seedDiscovered).toBe(true);
  expect(state.dayResolved).toBe(false);

  state = await storyAction(page, 'chooseSeed', 'tree');
  expect(state.seedChoice).toBe('tree');
  expect(state.flowerType).toBe('moon');
  expect(state.dayResolved).toBe(true);

  state = await storyAction(page, 'jumpToDay', 5);
  expect(state.seedChoice).toBe('tree');
  expect(state.flowerType).toBe('moon');
  const day5Before = await page.screenshot({ animations: 'disabled' });
  state = await storyAction(page, 'completeTrustedHabits');
  expect(state.lumiDiscovered).toBe(true);
  await page.waitForTimeout(900);

  state = await storyAction(page, 'jumpToDay', 7);
  expect(state.lumiDiscovered).toBe(true);
  expect(state.shelterProgress).toBe(1);
  state = await storyAction(page, 'completeTrustedHabits');
  expect(state.shelterProgress).toBe(2);
  expect(state.hiddenPathUnlocked).toBe(true);
  expect(state.dayResolved).toBe(true);
  await page.waitForTimeout(1500);

  const day7 = await page.screenshot({ animations: 'disabled' });
  expect(day7.equals(day5Before)).toBe(false);
  await testInfo.attach(`sprout-day7-${testInfo.project.name}`, {
    body: day7,
    contentType: 'image/png',
  });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(canvas).toBeVisible();
  const persisted = await currentStoryState(page);
  expect(persisted.currentDay).toBe(7);
  expect(persisted.seedChoice).toBe('tree');
  expect(persisted.flowerType).toBe('moon');
  expect(persisted.lumiDiscovered).toBe(true);
  expect(persisted.shelterProgress).toBe(2);
  expect(persisted.hiddenPathUnlocked).toBe(true);
});
