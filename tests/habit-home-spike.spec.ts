import { expect, test } from '@playwright/test';

const DESIGN_W = 1280;
const DESIGN_H = 720;

function designToViewport(viewport: { width: number; height: number }, point: { x: number; y: number }) {
  const scale = Math.min(viewport.width / DESIGN_W, viewport.height / DESIGN_H);
  const offsetX = (viewport.width - DESIGN_W * scale) / 2;
  const offsetY = (viewport.height - DESIGN_H * scale) / 2;
  return {
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale,
  };
}

test('habit home visual spike renders and demonstrates earn-to-decorate loop', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/?prototype=habit-home');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(700);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected configured viewport');

  const before = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`habit-home-before-${testInfo.project.name}`, {
    body: before,
    contentType: 'image/png',
  });

  const tapDesignPoint = async (point: { x: number; y: number }) => {
    const pointInViewport = designToViewport(viewport, point);
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Expected canvas bounds');
    const x = bounds.x + (pointInViewport.x / viewport.width) * bounds.width;
    const y = bounds.y + (pointInViewport.y / viewport.height) * bounds.height;
    if (testInfo.project.name.includes('mobile')) await page.touchscreen.tap(x, y);
    else await page.mouse.click(x, y);
  };

  // Complete the first habit (+25 coins), then buy/place the Tiny Palm (35 coins).
  await tapDesignPoint({ x: 169, y: 254 });
  await page.waitForTimeout(500);
  await tapDesignPoint({ x: 332 + 20 + 2 * 217 + 99, y: 590 + 36 + 29 });
  await page.waitForTimeout(700);

  const after = await page.screenshot({ animations: 'disabled' });
  await testInfo.attach(`habit-home-after-${testInfo.project.name}`, {
    body: after,
    contentType: 'image/png',
  });

  expect(after.equals(before)).toBe(false);
  expect(pageErrors).toEqual([]);
});
