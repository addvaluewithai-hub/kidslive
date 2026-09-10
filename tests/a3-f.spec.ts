import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

type DebugSnapshot = {
  scene: string;
  mode: string;
  objects: number;
  detail?: string;
  metrics?: Record<string, string | number | boolean>;
};

const readSnapshot = async (page: import('@playwright/test').Page) =>
  page.evaluate(
    () =>
      (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot })
        .__KIDSLIVE_RUNTIME_DEBUG__,
  );

async function waitForRuntime(
  page: import('@playwright/test').Page,
  scene: string,
  mode?: string,
): Promise<DebugSnapshot> {
  await page.waitForFunction(
    ({ expectedScene, expectedMode }) => {
      const snapshot = (
        window as Window & {
          __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot;
        }
      ).__KIDSLIVE_RUNTIME_DEBUG__;
      return (
        snapshot?.scene === expectedScene &&
        (expectedMode === undefined || snapshot.mode === expectedMode) &&
        snapshot.metrics?.actors === 1 &&
        snapshot.metrics?.tweens === 0
      );
    },
    { expectedScene: scene, expectedMode: mode },
  );

  const snapshot = await readSnapshot(page);
  if (!snapshot) throw new Error(`Expected runtime debug snapshot for ${scene}`);
  return snapshot;
}

async function pressCanvas(
  page: import('@playwright/test').Page,
  canvas: import('@playwright/test').Locator,
  position: { x: number; y: number },
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected visible game canvas bounds');

  const local = {
    x: (position.x / viewport.width) * bounds.width,
    y: (position.y / viewport.height) * bounds.height,
  };

  if (isCompactHubViewport(viewport.width)) {
    await page.touchscreen.tap(bounds.x + local.x, bounds.y + local.y);
  } else {
    await canvas.click({ position: local });
  }
}

test('companion art failure keeps fallback actor usable across hub place and return', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const pageErrors: string[] = [];
  let failedCompanionRequest = false;
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/assets/characters/companion-shell.svg', async (route) => {
    failedCompanionRequest = true;
    await route.abort('failed');
  });

  await page.goto('/?runtimeDebug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const initialHub = await waitForRuntime(page, 'planet-hub', 'overview');
  expect(failedCompanionRequest).toBe(true);
  expect(initialHub.detail).toContain('actor=nova');

  const fallbackHub = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`companion-art-fallback-hub-${testInfo.project.name}`, {
    body: fallbackHub,
    contentType: 'image/png',
  });

  let viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  const english = HUB_PLACES[0];
  await pressCanvas(
    page,
    canvas,
    resolveHubPlacePosition(english, viewport.width, viewport.height),
  );
  await waitForRuntime(page, 'planet-hub', english.id);
  await page.waitForTimeout(1_050);

  viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  await pressCanvas(page, canvas, { x: 92, y: viewport.height - 36 });
  const placeSnapshot = await waitForRuntime(page, 'placeholder-place');
  expect(placeSnapshot.detail).toContain('actors=1');
  expect(placeSnapshot.detail).toContain('actor=nova');
  expect(placeSnapshot.detail).toContain('ops=idle/idle/silent');

  const fallbackPlace = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`companion-art-fallback-place-${testInfo.project.name}`, {
    body: fallbackPlace,
    contentType: 'image/png',
  });

  viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  const back = isCompactHubViewport(viewport.width)
    ? { x: 92, y: viewport.height - 40 }
    : { x: 92, y: 76 };
  await pressCanvas(page, canvas, back);
  const returnedHub = await waitForRuntime(page, 'planet-hub', english.id);
  expect(returnedHub.metrics?.actors).toBe(1);
  expect(returnedHub.metrics?.tweens).toBe(0);
  expect(pageErrors).toEqual([]);
});

test('resize and repeated ownership settle back to one stable listener footprint', async ({ page }) => {
  test.setTimeout(75_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?runtimeDebug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const initialHub = await waitForRuntime(page, 'planet-hub', 'overview');
  const baselineListeners = Number(initialHub.metrics?.resizeListeners);
  expect(Number.isFinite(baselineListeners)).toBe(true);

  const originalViewport = page.viewportSize();
  if (!originalViewport) throw new Error('Expected a configured browser viewport');
  await page.setViewportSize(
    isCompactHubViewport(originalViewport.width)
      ? { width: 430, height: 760 }
      : { width: 960, height: 680 },
  );

  await page.waitForFunction(
    ({ expectedListeners }) => {
      const snapshot = (
        window as Window & {
          __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot;
        }
      ).__KIDSLIVE_RUNTIME_DEBUG__;
      return (
        snapshot?.scene === 'planet-hub' &&
        snapshot.mode === 'overview' &&
        snapshot.metrics?.actors === 1 &&
        snapshot.metrics?.tweens === 0 &&
        snapshot.metrics?.resizeListeners === expectedListeners
      );
    },
    { expectedListeners: baselineListeners },
  );

  let viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected resized browser viewport');
  const english = HUB_PLACES[0];
  await pressCanvas(
    page,
    canvas,
    resolveHubPlacePosition(english, viewport.width, viewport.height),
  );
  await waitForRuntime(page, 'planet-hub', english.id);

  const enter = { x: 92, y: viewport.height - 36 };
  const back = isCompactHubViewport(viewport.width)
    ? { x: 92, y: viewport.height - 40 }
    : { x: 92, y: 76 };

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await pressCanvas(page, canvas, enter);
    await page.waitForFunction(
      ({ expectedListeners }) => {
        const snapshot = (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot;
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__;
        return (
          snapshot?.scene === 'placeholder-place' &&
          snapshot.metrics?.actors === 1 &&
          snapshot.metrics?.tweens === 0 &&
          snapshot.metrics?.resizeListeners === expectedListeners
        );
      },
      { expectedListeners: baselineListeners },
    );

    await pressCanvas(page, canvas, back);
    await page.waitForFunction(
      ({ expectedListeners, expectedMode }) => {
        const snapshot = (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot;
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__;
        return (
          snapshot?.scene === 'planet-hub' &&
          snapshot.mode === expectedMode &&
          snapshot.metrics?.actors === 1 &&
          snapshot.metrics?.tweens === 0 &&
          snapshot.metrics?.resizeListeners === expectedListeners
        );
      },
      { expectedListeners: baselineListeners, expectedMode: english.id },
    );
  }

  expect(pageErrors).toEqual([]);
});
