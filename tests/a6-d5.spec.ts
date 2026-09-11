import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

type RuntimeSnapshot = { scene: string; mode: string; detail: string };
type SliceState = { completed: boolean; grantId?: string; worldChangeId?: string; subtitle?: string };

async function runtimeSnapshot(page: import('@playwright/test').Page): Promise<RuntimeSnapshot | undefined> {
  return page.evaluate(
    () => (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: RuntimeSnapshot }).__KIDSLIVE_RUNTIME_DEBUG__,
  );
}

async function waitForRuntime(
  page: import('@playwright/test').Page,
  predicate: (snapshot: RuntimeSnapshot) => boolean,
  timeout = 20_000,
) {
  await expect.poll(async () => {
    const snapshot = await runtimeSnapshot(page);
    return snapshot ? predicate(snapshot) : false;
  }, { timeout }).toBe(true);
}

async function sliceState(page: import('@playwright/test').Page): Promise<SliceState> {
  return page.evaluate(async () => {
    const completionPath = '/src/game/english/EnglishSliceCompletion.ts';
    const placesPath = '/src/game/places.ts';
    const completion = await import(/* @vite-ignore */ completionPath);
    const places = await import(/* @vite-ignore */ placesPath);
    const receipt = completion.englishSliceCompletion.receipt as
      | { grantId: string; worldChangeId: string }
      | undefined;
    return {
      completed: completion.englishSliceCompletion.completed as boolean,
      grantId: receipt?.grantId,
      worldChangeId: receipt?.worldChangeId,
      subtitle: places.getHubPlace('english')?.subtitle as string | undefined,
    };
  });
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

async function enterEnglish(page: import('@playwright/test').Page) {
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const viewport = page.viewportSize();
  const bounds = await canvas.boundingBox();
  if (!viewport || !bounds) throw new Error('Expected configured viewport and visible canvas');
  const english = HUB_PLACES.find((place) => place.id === 'english');
  if (!english) throw new Error('Expected authored English place');

  const tap = async (position: { x: number; y: number }) => {
    const local = {
      x: (position.x / viewport.width) * bounds.width,
      y: (position.y / viewport.height) * bounds.height,
    };
    if (isCompactHubViewport(viewport.width)) await page.touchscreen.tap(bounds.x + local.x, bounds.y + local.y);
    else await canvas.click({ position: local });
  };

  const hub = await runtimeSnapshot(page);
  if (hub?.mode !== 'english') {
    await tap(resolveHubPlacePosition(english, viewport.width, viewport.height));
    await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'english');
  }
  await tap({ x: 92, y: viewport.height - 36 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world' && snapshot.mode === 'lesson:welcome');
  return { viewport, tap };
}

test('A6 cohesive product proof: learn, retry, hint, complete, grant once, change Hub, re-enter', async ({ page }, testInfo) => {
  test.setTimeout(95_000);
  await page.goto('/?runtimeDebug=1');
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'overview');
  expect(await sliceState(page)).toEqual({ completed: false, subtitle: 'Words & stories' });

  const { viewport, tap } = await enterEnglish(page);
  const compact = isCompactHubViewport(viewport.width);
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;
  const primary = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 55 });
    else await page.keyboard.press('Enter');
  };
  const wrong = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 73 });
    else await page.keyboard.press('2');
  };
  const hint = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 175 });
    else await page.keyboard.press('h');
  };
  const correct = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 25 });
    else await page.keyboard.press('1');
  };

  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-practice');
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-check');
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));

  await repeatUntil(page, wrong, (snapshot) => snapshot.detail.includes('attempts=1'));
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  expect((await sliceState(page)).completed).toBe(false);

  await repeatUntil(page, hint, (snapshot) => snapshot.detail.includes('hint=used'));
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  await testInfo.attach(`a6-d5-retry-hint-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  await repeatUntil(page, correct, (snapshot) => snapshot.mode === 'lesson:celebrate');
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:completed');

  const completed = await sliceState(page);
  expect(completed).toEqual({
    completed: true,
    grantId: 'a6:english-first-word-complete',
    worldChangeId: 'english:first-word-star',
    subtitle: 'First word learned ✓',
  });
  await testInfo.attach(`a6-d5-complete-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  const back = compact ? { x: 82, y: viewport.height - 36 } : { x: 88, y: 78 };
  await tap(back);
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'english');
  expect(await sliceState(page)).toEqual(completed);
  await testInfo.attach(`a6-d5-changed-hub-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  await tap({ x: 92, y: viewport.height - 36 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world' && snapshot.mode === 'lesson:welcome');
  expect(await sliceState(page)).toEqual(completed);
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  expect((await runtimeSnapshot(page))?.detail).toContain('phase=welcome');
  await testInfo.attach(`a6-d5-safe-reentry-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
});
