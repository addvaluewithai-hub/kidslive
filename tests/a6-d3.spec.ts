import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

type RuntimeSnapshot = { scene: string; mode: string; detail: string };

type A6BrowserState = {
  completed: boolean;
  subtitle: string | undefined;
};

async function runtimeSnapshot(page: import('@playwright/test').Page): Promise<RuntimeSnapshot | undefined> {
  return page.evaluate(
    () =>
      (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: RuntimeSnapshot }).__KIDSLIVE_RUNTIME_DEBUG__,
  );
}

async function waitForRuntime(
  page: import('@playwright/test').Page,
  predicate: (snapshot: RuntimeSnapshot) => boolean,
) {
  await expect
    .poll(
      async () => {
        const snapshot = await runtimeSnapshot(page);
        return snapshot ? predicate(snapshot) : false;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
}

async function waitForTutorSettled(page: import('@playwright/test').Page) {
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
}

async function browserA6State(page: import('@playwright/test').Page): Promise<A6BrowserState> {
  return page.evaluate(async () => {
    const completionModulePath = '/src/game/english/EnglishSliceCompletion.ts';
    const placesModulePath = '/src/game/places.ts';
    const completion = await import(/* @vite-ignore */ completionModulePath);
    const places = await import(/* @vite-ignore */ placesModulePath);
    return {
      completed: completion.englishSliceCompletion.completed as boolean,
      subtitle: places.getHubPlace('english')?.subtitle as string | undefined,
    };
  });
}

async function enterEnglish(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected configured viewport');
  const english = HUB_PLACES.find((place) => place.id === 'english');
  if (!english) throw new Error('Expected authored English place');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected visible canvas bounds');
  const tap = async (position: { x: number; y: number }) => {
    const local = {
      x: (position.x / viewport.width) * bounds.width,
      y: (position.y / viewport.height) * bounds.height,
    };
    if (isCompactHubViewport(viewport.width)) {
      await page.touchscreen.tap(bounds.x + local.x, bounds.y + local.y);
    } else {
      await canvas.click({ position: local });
    }
  };

  await tap(resolveHubPlacePosition(english, viewport.width, viewport.height));
  await tap({ x: 92, y: viewport.height - 36 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world' && snapshot.mode === 'lesson:welcome');
  return { canvas, viewport, tap };
}

async function repeatUntil(
  page: import('@playwright/test').Page,
  action: () => Promise<void>,
  predicate: (snapshot: RuntimeSnapshot) => boolean,
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await action();
    await page.waitForTimeout(350);
    const snapshot = await runtimeSnapshot(page);
    if (snapshot && predicate(snapshot)) return;
  }
  throw new Error(`Runtime did not reach expected state. Last snapshot: ${JSON.stringify(await runtimeSnapshot(page))}`);
}

test('English completion grants once, changes the Hub, and is recognized on re-entry', async ({ page }, testInfo) => {
  test.setTimeout(80_000);
  await page.goto('/?runtimeDebug=1');
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'overview');

  expect(await browserA6State(page)).toEqual({ completed: false, subtitle: 'Words & stories' });
  await testInfo.attach(`a6-d3-hub-before-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  const { viewport, tap } = await enterEnglish(page);
  const compact = isCompactHubViewport(viewport.width);
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const primary = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 55 });
    else await page.keyboard.press('Enter');
  };

  await waitForTutorSettled(page);
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-practice');
  await waitForTutorSettled(page);
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-check');
  await waitForTutorSettled(page);

  const correct = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 25 });
    else await page.keyboard.press('1');
  };
  await repeatUntil(page, correct, (snapshot) => snapshot.mode === 'lesson:celebrate');
  await waitForTutorSettled(page);
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:completed');

  await expect.poll(async () => (await browserA6State(page)).completed).toBe(true);
  expect((await browserA6State(page)).subtitle).toBe('First word learned ✓');

  const back = compact ? { x: 82, y: viewport.height - 36 } : { x: 88, y: 78 };
  await tap(back);
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'english');
  expect(await browserA6State(page)).toEqual({ completed: true, subtitle: 'First word learned ✓' });
  await testInfo.attach(`a6-d3-hub-after-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  await tap({ x: 92, y: viewport.height - 36 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world' && snapshot.mode === 'lesson:welcome');
  expect(await browserA6State(page)).toEqual({ completed: true, subtitle: 'First word learned ✓' });
  await testInfo.attach(`a6-d3-completed-reentry-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
});
