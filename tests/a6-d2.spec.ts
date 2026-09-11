import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

type RuntimeSnapshot = { scene: string; mode: string; detail: string };

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

test('English lesson shows authoritative wrong, hint, retry and correct states', async ({ page }, testInfo) => {
  test.setTimeout(70_000);
  await page.goto('/?runtimeDebug=1');
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'overview');
  const { viewport, tap } = await enterEnglish(page);
  const compact = isCompactHubViewport(viewport.width);
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  const primary = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 55 });
    else await page.keyboard.press('Enter');
  };
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-practice');
  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:word-check');

  const wrong = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 73 });
    else await page.keyboard.press('2');
  };
  await repeatUntil(page, wrong, (snapshot) => snapshot.detail.includes('attempts=1'));
  await waitForTutorSettled(page);
  await testInfo.attach(`a6-d2-wrong-retry-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  const hint = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 175 });
    else await page.keyboard.press('h');
  };
  await repeatUntil(page, hint, (snapshot) => snapshot.detail.includes('hint=used'));
  await waitForTutorSettled(page);
  await testInfo.attach(`a6-d2-hint-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  const correct = async () => {
    if (compact) await tap({ x: centerX, y: centerY + 25 });
    else await page.keyboard.press('1');
  };
  await repeatUntil(page, correct, (snapshot) => snapshot.mode === 'lesson:celebrate');
  await waitForTutorSettled(page);
  await testInfo.attach(`a6-d2-correct-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  await repeatUntil(page, primary, (snapshot) => snapshot.mode === 'lesson:completed');
  const completed = await runtimeSnapshot(page);
  expect(completed?.detail).toContain('attempts=2');
});
