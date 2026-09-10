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

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(800);

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
    await page.waitForTimeout(320);
    await pressCanvas(enterButton);
    await page.waitForTimeout(700);

    if (index === 0 || index === HUB_PLACES.length - 1) {
      const placeScreenshot = await page.screenshot({ animations: 'disabled' });
      expect(placeScreenshot.equals(overview)).toBe(false);
      await testInfo.attach(`place-${place.id}-${testInfo.project.name}`, {
        body: placeScreenshot,
        contentType: 'image/png',
      });
    }

    await pressCanvas(placeBack);
    await page.waitForTimeout(700);
    await expect(canvas).toBeVisible();

    if (index < HUB_PLACES.length - 1) {
      await pressCanvas(overviewButton);
      await page.waitForTimeout(320);
    }
  }

  const returnedHub = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`hub-after-all-places-${testInfo.project.name}`, {
    body: returnedHub,
    contentType: 'image/png',
  });
});

test('failed authored place art falls back and still returns safely', async ({ page }, testInfo) => {
  await page.route('**/assets/places/place-marker.svg', async (route) => {
    await route.abort('failed');
  });

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(800);

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

  const english = HUB_PLACES[0];
  const overview = await page.screenshot({ animations: 'disabled' });
  await pressCanvas(resolveHubPlacePosition(english, viewport.width, viewport.height));
  await page.waitForTimeout(320);

  const failedAssetRequest = page.waitForRequest((request) =>
    request.url().endsWith('/assets/places/place-marker.svg'),
  );
  await pressCanvas({ x: 92, y: viewport.height - 36 });
  const request = await failedAssetRequest;
  expect(request.url()).toContain('/assets/places/place-marker.svg');
  await page.waitForTimeout(700);

  const failureState = await page.screenshot({ animations: 'disabled' });
  expect(failureState.equals(overview)).toBe(false);
  await testInfo.attach(`place-asset-fallback-${testInfo.project.name}`, {
    body: failureState,
    contentType: 'image/png',
  });

  const placeBack = compact ? { x: 92, y: viewport.height - 40 } : { x: 92, y: 76 };
  await pressCanvas(placeBack);
  await page.waitForTimeout(700);
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
  test.setTimeout(60_000);
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
  const waitForScene = async (scene: string) => {
    await page.waitForFunction(
      (expectedScene) =>
        (
          window as Window & {
            __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string };
          }
        ).__KIDSLIVE_RUNTIME_DEBUG__?.scene === expectedScene,
      scene,
    );
    await page.waitForTimeout(300);
    const snapshot = await readSnapshot();
    if (!snapshot) throw new Error(`Expected runtime debug snapshot for ${scene}`);
    return snapshot;
  };
  const expectBoundedActorRuntime = (snapshot: DebugSnapshot) => {
    expect(snapshot.metrics?.actors).toBe(1);
    expect(snapshot.metrics?.resizeListeners).toBe(1);
    expect(snapshot.metrics?.tweens).toBe(0);
  };
  const pressCanvas = async (position: { x: number; y: number }) => {
    const viewport = page.viewportSize();
    if (!viewport) throw new Error('Expected a configured browser viewport');
    if (isCompactHubViewport(viewport.width)) {
      const bounds = await canvas.boundingBox();
      if (!bounds) throw new Error('Expected visible game canvas bounds');
      await page.touchscreen.tap(bounds.x + position.x, bounds.y + position.y);
    } else {
      await canvas.click({ position });
    }
  };

  const initialHub = await waitForScene('planet-hub');
  expectBoundedActorRuntime(initialHub);

  let viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');
  await pressCanvas(resolveHubPlacePosition(HUB_PLACES[0], viewport.width, viewport.height));
  await page.waitForTimeout(100);

  const compact = isCompactHubViewport(viewport.width);
  await page.setViewportSize(
    compact ? { width: 430, height: 760 } : { width: 960, height: 680 },
  );
  const resizedHub = await waitForScene('planet-hub');
  expect(resizedHub.mode).toBe('overview');
  expectBoundedActorRuntime(resizedHub);

  viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected resized browser viewport');
  await pressCanvas(resolveHubPlacePosition(HUB_PLACES[0], viewport.width, viewport.height));
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

  for (let cycle = 0; cycle < 3; cycle += 1) {
    await pressCanvas(enterButton);
    const placeSnapshot = await waitForScene('placeholder-place');
    expectBoundedActorRuntime(placeSnapshot);
    expect(placeSnapshot.detail).toContain('actors=1');
    expect(placeSnapshot.detail).toContain('ops=idle/idle/silent');
    placeObjectCounts.push(placeSnapshot.objects);

    await pressCanvas(placeBack);
    const hubSnapshot = await waitForScene('planet-hub');
    expectBoundedActorRuntime(hubSnapshot);
    expect(hubSnapshot.mode).toBe('english');
    expect(hubSnapshot.detail).toContain('actor=nova');
    hubObjectCounts.push(hubSnapshot.objects);
  }

  expect(new Set(placeObjectCounts).size).toBe(1);
  expect(new Set(hubObjectCounts).size).toBe(1);
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
