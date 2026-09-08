import { expect, test } from '@playwright/test';

test('boots the production benchmark and exercises realistic busy load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('planet-stage')).toBeVisible();
  await expect(page.getByTestId('benchmark-mode')).toContainText('PRODUCTION STEADY', { timeout: 10_000 });

  await page.getByRole('button', { name: /English Grove/ }).click();
  await expect(page.getByText(/Let’s fly into a story/)).toBeVisible();

  await page.getByRole('button', { name: 'Busy lesson' }).click();
  await expect(page.getByTestId('benchmark-mode')).toContainText('BUSY LESSON');

  await page.getByRole('button', { name: 'Reset sample' }).click();
  await page.getByRole('button', { name: /German Harbor/ }).click();
  await expect(page.getByText(/Ready for a tiny language mission/)).toBeVisible();
});
