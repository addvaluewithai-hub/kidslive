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
  test.setTimeout(45_000);

  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(800);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');

  const compact = isCompactHubViewport(viewport.width);
  const pressCanvas = async (position: { x: number; y: number }) => {
    if (compact) {
      await page.touchscreen.tap(position.x, position.y);
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
