import { expect, test } from '@playwright/test';

test('boots the planet and lets the product shell command the world', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('planet-stage')).toBeVisible();
  await expect(page.getByText('World spike ready')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /English Grove/ }).click();
  await expect(page.getByTestId('selected-place')).toContainText('English Grove');

  await page.getByRole('button', { name: 'Enable stress mode' }).click();
  await expect(page.getByRole('button', { name: 'Stress mode ON' })).toBeVisible();
});
