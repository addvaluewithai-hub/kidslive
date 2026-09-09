import { expect, test } from '@playwright/test';

test('boots the KidsLive shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('KidsLive')).toBeVisible();
  await expect(page.getByTestId('game-root')).toBeVisible();
});
