import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

test('boots the KidsLive shell without viewport overflow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('KidsLive')).toBeVisible();
  await expect(page.getByTestId('game-root')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

  expect(hasHorizontalOverflow).toBe(false);
});

test('all authored places enter and return without breaking the hub', async ({ page }, testInfo) => {
  test.setTimeout(100_000);

  await page.goto('/?runtimeDebug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const waitForRuntime = async (scene: string, mode?: string) => {
    await page.waitForFunction(
      ({ expectedScene, expectedMode }) => {
        const snapshot = (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string };
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__;
        return (
          snapshot?.scene === expectedScene &&
          (expectedMode === undefined || snapshot.mode === expectedMode)
        );
      },
      { expectedScene: scene, expectedMode: mode },
    );
  };
  await waitForRuntime('planet-hub', 'overview');

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');

  const compact = isCompactHubViewport(viewport.width);
  const pressCanvas = async (position: { x: number; y: number }) => {
    if (compact) {
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error('Expected visible game canvas bounds');
      await page.touchscreen.tap(bounds.x + position.x, bounds.y + position.y);
    } else {
      await canvas.click({ position });
    }
  };
  const enterButton = { x: 92, y: viewport.height - 36 };
  const overviewButton = { x: viewport.width - 74, y: viewport.height - 36 };
  const placeBack = compact ? { x: 92, y: viewport.height - 40 } : { x: 92, y: 76 };

  const overview = await page.screenshot({ animations: 'disabled' });

  for (const [index, place] of HUB_PLACES.entries()) {
    const position = resolveHubPlacePosition(place, viewport.width, viewport.height);
    await pressCanvas(position);
    await waitForRuntime('planet-hub', place.id);
    await pressCanvas(enterButton);
    await waitForRuntime(place.id === 'english' ? 'english-world' : 'placeholder-place');

    if (index === 0 || index === HUB_PLACES.length - 1) {
      const placeScreenshot = await page.screenshot({ animations: 'disabled' });
      expect(placeScreenshot.equals(overview)).toBe(false);
      await testInfo.attach(`place-${place.id}-${testInfo.project.name}`, {
        body: placeScreenshot,
        contentType: 'image/png',
      });
    }

    await pressCanvas(placeBack);
    await waitForRuntime('planet-hub', place.id);
    await expect(canvas).toBeVisible();

    if (index < HUB_PLACES.length - 1) {
      await pressCanvas(overviewButton);
      await waitForRuntime('planet-hub', 'overview');
    }
  }

  const returnedHub = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`hub-after-all-places-${testInfo.project.name}`, {
    body: returnedHub,
    contentType: 'image/png',
  });
});

test('failed authored place art falls back and still returns safely', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  let failedMarkerRequest = false;
  await page.route('**/assets/places/place-marker.svg', async (route) => {
    failedMarkerRequest = true;
    await route.abort('failed');
  });

  await page.goto('/?runtimeDebug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');

  const compact = isCompactHubViewport(viewport.width);
  const pressCanvas = async (position: { x: number; y: number }) => {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Expected visible game canvas bounds');
    const local = {
      x: (position.x / viewport.width) * bounds.width,
      y: (position.y / viewport.height) * bounds.height,
    };
    if (compact) {
      await page.touchscreen.tap(bounds.x + local.x, bounds.y + local.y);
    } else {
      await canvas.click({ position: local });
    }
  };
  const waitForRuntime = async (scene: string, mode?: string) => {
    await page.waitForFunction(
      ({ expectedScene, expectedMode }) => {
        const snapshot = (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string };
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__;
        return (
          snapshot?.scene === expectedScene &&
          (expectedMode === undefined || snapshot.mode === expectedMode)
        );
      },
      { expectedScene: scene, expectedMode: mode },
    );
  };

  await waitForRuntime('planet-hub', 'overview');
  const english = HUB_PLACES[0];
  const overview = await page.screenshot({ animations: 'disabled' });
  await pressCanvas(resolveHubPlacePosition(english, viewport.width, viewport.height));
  await waitForRuntime('planet-hub', english.id);
  await pressCanvas({ x: 92, y: viewport.height - 36 });
  await waitForRuntime('english-world', 'lesson:welcome');

  expect(failedMarkerRequest).toBe(true);
  const failureState = await page.screenshot({ animations: 'disabled' });
  expect(failureState.equals(overview)).toBe(false);
  await testInfo.attach(`place-asset-fallback-${testInfo.project.name}`, {
    body: failureState,
    contentType: 'image/png',
  });

  const placeBack = compact ? { x: 92, y: viewport.height - 40 } : { x: 92, y: 76 };
  await pressCanvas(placeBack);
  await waitForRuntime('planet-hub', english.id);
  await expect(canvas).toBeVisible();

  const returnedHub = await page.screenshot({ animations: 'disabled' });
  expect(returnedHub.equals(failureState)).toBe(false);
});

test('actor runs scripted action and speech and survives interruption', async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1_200);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  const compact = isCompactHubViewport(viewport.width);
  const pressCanvas = async (position: { x: number; y: number }) => {
    if (compact) {
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error('Expected visible game canvas bounds');
      await page.touchscreen.tap(bounds.x + position.x, bounds.y + position.y);
    } else {
      await canvas.click({ position });
    }
  };
  const overviewButton = { x: viewport.width - 74, y: viewport.height - 36 };
  const overview = await page.screenshot({ animations: 'disabled' });

  await pressCanvas(resolveHubPlacePosition(HUB_PLACES[0], viewport.width, viewport.height));
  await page.waitForTimeout(1_150);
  const scriptedSpeech = await page.screenshot({ animations: 'disabled' });
  expect(scriptedSpeech.equals(overview)).toBe(false);
  await testInfo.attach(`actor-scripted-speech-${testInfo.project.name}`, {
    body: scriptedSpeech,
    contentType: 'image/png',
  });

  await pressCanvas(overviewButton);
  await page.waitForTimeout(560);
  const home = await page.screenshot({ animations: 'disabled' });
  expect(home.equals(scriptedSpeech)).toBe(false);
  await testInfo.attach(`actor-home-after-interrupt-${testInfo.project.name}`, {
    body: home,
    contentType: 'image/png',
  });

  await pressCanvas(resolveHubPlacePosition(HUB_PLACES[1], viewport.width, viewport.height));
  await page.waitForTimeout(100);
  await pressCanvas(overviewButton);
  await page.waitForTimeout(560);

  expect(pageErrors).toEqual([]);
  await expect(canvas).toBeVisible();
});

test('cohesive actor flow stays bounded through resize and repeated scene ownership', async ({
  page,
}, testInfo) => {
  test.setTimeout(75_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?runtimeDebug=1');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();

  type DebugSnapshot = {
    scene: string;
    mode: string;
    objects: number;
    detail?: string;
    metrics?: Record<string, string | number | boolean>;
  };
  const readSnapshot = () =>
    page.evaluate(
      () =>
        (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: DebugSnapshot })
          .__KIDSLIVE_RUNTIME_DEBUG__,
    );
  const waitForRuntime = async (scene: string, mode?: string) => {
    await page.waitForFunction(
      ({ expectedScene, expectedMode }) => {
        const snapshot = (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string };
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__;
        return (
          snapshot?.scene === expectedScene &&
          (expectedMode === undefined || snapshot.mode === expectedMode)
        );
      },
      { expectedScene: scene, expectedMode: mode },
    );
    await page.waitForTimeout(300);
    const snapshot = await readSnapshot();
    if (!snapshot) throw new Error(`Expected runtime debug snapshot for ${scene}`);
    return snapshot;
  };
  const expectSettledActorRuntime = (snapshot: DebugSnapshot) => {
    expect(snapshot.metrics?.actors).toBe(1);
    expect(snapshot.metrics?.tweens).toBe(0);
  };
  const pressCanvas = async (position: { x: number; y: number }) => {
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
  };

  const initialHub = await waitForRuntime('planet-hub', 'overview');
  expectSettledActorRuntime(initialHub);
  const initialResizeListeners = initialHub.metrics?.resizeListeners;
  expect(typeof initialResizeListeners).toBe('number');

  const lifecyclePlace = HUB_PLACES[1];
  let viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  await pressCanvas(resolveHubPlacePosition(lifecyclePlace, viewport.width, viewport.height));
  await waitForRuntime('planet-hub', lifecyclePlace.id);
  await page.waitForTimeout(100);

  const compact = isCompactHubViewport(viewport.width);
  await page.setViewportSize(
    compact ? { width: 430, height: 760 } : { width: 960, height: 680 },
  );
  const resizedHub = await waitForRuntime('planet-hub', 'overview');
  expectSettledActorRuntime(resizedHub);
  expect(resizedHub.metrics?.resizeListeners).toBe(initialResizeListeners);

  viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected resized browser viewport');
  await pressCanvas(resolveHubPlacePosition(lifecyclePlace, viewport.width, viewport.height));
  await waitForRuntime('planet-hub', lifecyclePlace.id);
  await page.waitForTimeout(1_050);

  const activeSequence = await readSnapshot();
  expect(activeSequence?.scene).toBe('planet-hub');
  expect(activeSequence?.metrics?.actors).toBe(1);
  expect(activeSequence?.detail).toContain('actor=nova');

  const enterButton = { x: 92, y: viewport.height - 36 };
  const placeBack = isCompactHubViewport(viewport.width)
    ? { x: 92, y: viewport.height - 40 }
    : { x: 92, y: 76 };
  const hubObjectCounts: number[] = [];
  const placeObjectCounts: number[] = [];
  const resizeListenerCounts: number[] = [Number(initialResizeListeners)];

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await pressCanvas(enterButton);
    const placeSnapshot = await waitForRuntime('placeholder-place');
    expectSettledActorRuntime(placeSnapshot);
    expect(placeSnapshot.detail).toContain('actors=1');
    expect(placeSnapshot.detail).toContain('ops=idle/idle/silent');
    placeObjectCounts.push(placeSnapshot.objects);
    resizeListenerCounts.push(Number(placeSnapshot.metrics?.resizeListeners));

    await pressCanvas(placeBack);
    const hubSnapshot = await waitForRuntime('planet-hub', lifecyclePlace.id);
    expectSettledActorRuntime(hubSnapshot);
    expect(hubSnapshot.detail).toContain('actor=nova');
    hubObjectCounts.push(hubSnapshot.objects);
    resizeListenerCounts.push(Number(hubSnapshot.metrics?.resizeListeners));
  }

  expect(new Set(placeObjectCounts).size).toBe(1);
  expect(new Set(hubObjectCounts).size).toBe(1);
  expect(new Set(resizeListenerCounts).size).toBe(1);
  expect(pageErrors).toEqual([]);

  const finalEvidence = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`actor-cohesive-runtime-${testInfo.project.name}`, {
    body: finalEvidence,
    contentType: 'image/png',
  });
});

test('captures current stage-gate visual evidence', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('game-root')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  // Give the Phaser boot scene one deterministic frame window before capture.
  await page.waitForTimeout(250);

  const screenshot = await page.screenshot({
    fullPage: true,
    animations: 'disabled',
  });

  await testInfo.attach(`stage-gate-${testInfo.project.name}`, {
    body: screenshot,
    contentType: 'image/png',
  });
});
