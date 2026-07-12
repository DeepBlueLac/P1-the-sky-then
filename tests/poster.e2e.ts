import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} renders a complete poster without overflow`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByText('此刻星空', { exact: true })).toBeVisible();
    await expect(page.getByText(/颗可见恒星/)).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible();
    expect(await page.locator('svg circle').count()).toBeGreaterThan(1000);
    if (viewport.name === 'desktop') {
      const poster = page.locator('svg').filter({ has: page.locator('rect') }).first();
      expect((await poster.boundingBox())?.y ?? 9999).toBeLessThan(220);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `test-results/${viewport.name}.png`, fullPage: true });
  });
}

test('theme selection updates the poster and PNG export works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByText('Atlas', { exact: true }).click();
  await expect(page.locator('svg rect').first()).toHaveAttribute('fill', '#f7f7f4');
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('下载 PNG', { exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^the-sky-then-.*\.png$/);
});
