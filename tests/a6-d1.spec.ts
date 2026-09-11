import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

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
  await page.waitForFunction(() => {
    const snapshot = (
      window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string } }
    ).__KIDSLIVE_RUNTIME_DEBUG__;
    return snapshot?.scene === 'english-world' && snapshot.mode === 'lesson:welcome';
  });
  return { canvas, viewport, tap };
}

test('English Hub entry opens authored lesson with tutor and returns safely', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.goto('/?runtimeDebug=1');
  await page.waitForFunction(() => {
    const snapshot = (
      window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string } }
    ).__KIDSLIVE_RUNTIME_DEBUG__;
    return snapshot?.scene === 'planet-hub' && snapshot.mode === 'overview';
  });

  const { canvas, viewport, tap } = await enterEnglish(page);
  const lesson = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`a6-d1-english-entry-${testInfo.project.name}`, {
    body: lesson,
    contentType: 'image/png',
  });

  const back = isCompactHubViewport(viewport.width)
    ? { x: 92, y: viewport.height - 40 }
    : { x: 92, y: 76 };
  await tap(back);
  await page.waitForFunction(() => {
    const snapshot = (
      window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string } }
    ).__KIDSLIVE_RUNTIME_DEBUG__;
    return snapshot?.scene === 'planet-hub' && snapshot.mode === 'english';
  });
  await expect(canvas).toBeVisible();
});

test('English World uses deterministic fallback when authored art fails', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  await page.route('**/assets/places/place-marker.svg', (route) => route.abort('failed'));
  await page.goto('/?runtimeDebug=1');
  await page.waitForFunction(() => {
    const snapshot = (
      window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: { scene: string; mode: string } }
    ).__KIDSLIVE_RUNTIME_DEBUG__;
    return snapshot?.scene === 'planet-hub';
  });

  await enterEnglish(page);
  const snapshot = await page.evaluate(
    () => (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: { detail: string } }).__KIDSLIVE_RUNTIME_DEBUG__,
  );
  expect(snapshot?.detail).toContain('assets=error');
  const fallback = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`a6-d1-english-fallback-${testInfo.project.name}`, {
    body: fallback,
    contentType: 'image/png',
  });
});
