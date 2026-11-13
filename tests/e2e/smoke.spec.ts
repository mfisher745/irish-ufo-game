import { expect, test } from '@playwright/test';

test('page loads and the canvas exists', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('canvas')).toHaveCount(1);
});
