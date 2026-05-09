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
