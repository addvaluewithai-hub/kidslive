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
