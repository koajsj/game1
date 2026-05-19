import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const gameUrl = pathToFileURL(path.resolve(process.cwd(), 'index.html')).href;

test('loads canvas and HUD', async ({ page }) => {
  await page.goto(gameUrl);
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#startBtn')).toBeVisible();
});

test('starts game from start button', async ({ page }) => {
  await page.goto(gameUrl);
  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
});

test('draws a non-empty game canvas after start', async ({ page }) => {
  await page.goto(gameUrl);
  await page.locator('#startBtn').click();
  await page.waitForTimeout(250);
  const hasPaintedPixels = await page.locator('#game').evaluate((canvas) => {
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const sample = context.getImageData(0, 0, width, height).data;
    for (let i = 3; i < sample.length; i += 64) {
      if (sample[i] > 0) return true;
    }
    return false;
  });
  expect(hasPaintedPixels).toBe(true);
});

test('keeps running when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage blocked');
      },
    });
  });
  await page.goto(gameUrl);
  await expect(page.locator('#overlay')).toBeVisible();
  await page.locator('#startBtn').click();
  await expect(page.locator('#overlay')).toHaveClass(/hidden/);
});

test('touch-only controls visibility follows media query', async ({ page, isMobile }) => {
  await page.goto(gameUrl);
  const display = await page.locator('#moveStick').evaluate((el) => getComputedStyle(el).display);
  if (isMobile) {
    expect(display).not.toBe('none');
    await expect(page.locator('#dashBtn')).toBeVisible();
    await expect(page.locator('#pulseBtn')).toBeVisible();
  } else {
    expect(display).toBe('none');
  }
});
