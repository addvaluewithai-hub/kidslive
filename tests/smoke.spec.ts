import { expect, test } from '@playwright/test';

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

test('enters a representative place and returns without breaking the hub', async ({ page }, testInfo) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(250);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected a configured browser viewport');

  const compact = viewport.width < 700;
  const centerX = viewport.width / 2;
  const centerY = compact ? Math.max(360, viewport.height * 0.52) : Math.max(350, viewport.height * 0.54);
  const spreadX = Math.min(compact ? 520 : 1040, viewport.width - (compact ? 32 : 120));
  const spreadY = Math.min(compact ? 660 : 520, viewport.height - (compact ? 150 : 170));
  const english = {
    x: centerX - 0.34 * spreadX,
    y: centerY - 0.2 * spreadY,
  };
  if (compact) {
    english.x = centerX - 0.23 * spreadX;
    english.y = centerY - 0.28 * spreadY;
  }

  const pressCanvas = async (position: { x: number; y: number }) => {
    if (compact) {
      await page.touchscreen.tap(position.x, position.y);
    } else {
      await canvas.click({ position });
    }
  };

  const overview = await page.screenshot({ animations: 'disabled' });

  await pressCanvas(english);
  await page.waitForTimeout(320);
  await pressCanvas({ x: 92, y: viewport.height - 36 });
  await page.waitForTimeout(700);

  const place = await page.screenshot({ animations: 'disabled' });
  expect(place.equals(overview)).toBe(false);
  await testInfo.attach(`place-entry-${testInfo.project.name}`, {
    body: place,
    contentType: 'image/png',
  });

  await pressCanvas({ x: 92, y: 76 });
  await page.waitForTimeout(700);

  const returnedHub = await page.screenshot({ animations: 'disabled' });
  expect(returnedHub.equals(place)).toBe(false);
  await testInfo.attach(`place-return-${testInfo.project.name}`, {
    body: returnedHub,
    contentType: 'image/png',
  });

  // Repeat once to catch scene/listener lifecycle regressions in the same browser session.
  await pressCanvas({ x: 92, y: viewport.height - 36 });
  await page.waitForTimeout(700);
  await pressCanvas({ x: 92, y: 76 });
  await page.waitForTimeout(700);
  await expect(canvas).toBeVisible();
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
