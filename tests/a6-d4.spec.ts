import { expect, test } from '@playwright/test';
import { HUB_PLACES, isCompactHubViewport, resolveHubPlacePosition } from '../src/game/places';

type RuntimeSnapshot = { scene: string; mode: string; detail: string; viewport?: string };

async function runtimeSnapshot(page: import('@playwright/test').Page): Promise<RuntimeSnapshot | undefined> {
  return page.evaluate(
    () =>
      (window as Window & { __KIDSLIVE_RUNTIME_DEBUG__?: RuntimeSnapshot }).__KIDSLIVE_RUNTIME_DEBUG__,
  );
}

async function waitForRuntime(
  page: import('@playwright/test').Page,
  predicate: (snapshot: RuntimeSnapshot) => boolean,
  timeout = 20_000,
) {
  await expect
    .poll(
      async () => {
        const snapshot = await runtimeSnapshot(page);
        return snapshot ? predicate(snapshot) : false;
      },
      { timeout },
    )
    .toBe(true);
}

async function tapCanvasPoint(
  page: import('@playwright/test').Page,
  position: { x: number; y: number },
) {
  const canvas = page.locator('canvas');
  const viewport = page.viewportSize();
  const bounds = await canvas.boundingBox();
  if (!viewport || !bounds) throw new Error('Expected configured viewport and visible canvas');
  const local = {
    x: (position.x / viewport.width) * bounds.width,
    y: (position.y / viewport.height) * bounds.height,
  };
  if (isCompactHubViewport(viewport.width)) {
    await page.touchscreen.tap(bounds.x + local.x, bounds.y + local.y);
  } else {
    await canvas.click({ position: local });
  }
}

async function enterEnglish(page: import('@playwright/test').Page) {
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub' && snapshot.mode === 'overview');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected configured viewport');
  const english = HUB_PLACES.find((place) => place.id === 'english');
  if (!english) throw new Error('Expected authored English place');
  await tapCanvasPoint(page, resolveHubPlacePosition(english, viewport.width, viewport.height));
  await tapCanvasPoint(page, { x: 92, y: viewport.height - 36 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world');
}

async function returnToHub(page: import('@playwright/test').Page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Expected configured viewport');
  await tapCanvasPoint(
    page,
    isCompactHubViewport(viewport.width)
      ? { x: 76, y: viewport.height - 38 }
      : { x: 82, y: 80 },
  );
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'planet-hub');
}

test('English tutor failure is recoverable and the next authored step still runs', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/?runtimeDebug=1&tutorFixture=fail-once');
  await enterEnglish(page);
  await waitForRuntime(
    page,
    (snapshot) => snapshot.detail.includes('busy=no') && snapshot.detail.includes('fixture=fail-once/normal'),
  );
  await testInfo.attach(`a6-d4-tutor-failure-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });

  await page.keyboard.press('Enter');
  await waitForRuntime(page, (snapshot) => snapshot.mode === 'lesson:word-practice' && snapshot.detail.includes('busy=no'));
  expect((await runtimeSnapshot(page))?.detail).toContain('tutor=active');
});

test('speech failure is contained and learner controls recover', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('/?runtimeDebug=1&speechFixture=fail-once');
  await enterEnglish(page);
  await waitForRuntime(
    page,
    (snapshot) => snapshot.detail.includes('busy=no') && snapshot.detail.includes('fixture=normal/fail-once'),
  );
  await page.keyboard.press('Enter');
  await waitForRuntime(page, (snapshot) => snapshot.mode === 'lesson:word-practice' && snapshot.detail.includes('busy=no'));
  await testInfo.attach(`a6-d4-speech-recovery-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
});

test('rapid exit during a slow tutor turn leaves the Hub stable with no stale scene effects', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/?runtimeDebug=1&tutorFixture=slow-once');
  await enterEnglish(page);
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=yes'));
  await returnToHub(page);
  await page.waitForTimeout(2_400);
  const snapshot = await runtimeSnapshot(page);
  expect(snapshot?.scene).toBe('planet-hub');
  expect(snapshot?.mode).toBe('overview');
});

test('repeated Hub-English cycles and short-landscape resize keep the lesson usable', async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  await page.goto('/?runtimeDebug=1');

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await enterEnglish(page);
    await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
    await returnToHub(page);
  }

  await enterEnglish(page);
  await waitForRuntime(page, (snapshot) => snapshot.detail.includes('busy=no'));
  await page.setViewportSize({ width: 900, height: 500 });
  await waitForRuntime(page, (snapshot) => snapshot.scene === 'english-world' && snapshot.viewport === '900x500');
  await page.keyboard.press('Enter');
  await waitForRuntime(page, (snapshot) => snapshot.mode === 'lesson:word-practice' && snapshot.detail.includes('busy=no'));
  await testInfo.attach(`a6-d4-short-landscape-${testInfo.project.name}`, {
    body: await page.screenshot({ animations: 'disabled' }),
    contentType: 'image/png',
  });
});
