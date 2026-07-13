import { expect, test } from '@playwright/test';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} renders a complete poster without overflow`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByTestId('app-ready')).toBeAttached();
    await expect(page.getByText('此刻星空', { exact: true })).toBeVisible();
    await expect(page.getByText(/颗可见恒星/)).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible();
    expect(await page.locator('svg circle').count()).toBeGreaterThan(1000);
    if (viewport.name === 'desktop') {
      const poster = page.locator('svg').filter({ has: page.locator('rect') }).first();
      expect((await poster.boundingBox())?.y ?? 9999).toBeLessThan(220);
      const controls = await page.getByTestId('controls').boundingBox();
      const preview = await page.getByTestId('preview-area').boundingBox();
      expect(controls?.x ?? 9999).toBeLessThan(preview?.x ?? 0);
      await expect(page.getByTestId('mobile-edit')).toBeHidden();
    } else {
      const controls = await page.getByTestId('controls').boundingBox();
      const preview = await page.getByTestId('preview-area').boundingBox();
      expect(preview?.y ?? 9999).toBeLessThan(controls?.y ?? 0);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
    await page.screenshot({ path: `test-results/${viewport.name}.png`, fullPage: true });
    expect(pageErrors).toEqual([]);
  });
}

test('theme selection updates the poster and PNG export works', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-ready')).toBeAttached();
  await page.getByTestId('theme-atlas').click();
  await expect(page.locator('svg rect').first()).toHaveAttribute('fill', '#f7f7f4');
  const downloadPromise = page.waitForEvent('download');
  await page.getByText('下载 PNG', { exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^the-sky-then-.*\.png$/);
});

test('invalid date shows a recoverable error and disables export', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-ready')).toBeAttached();
  await page.getByLabel('日期').fill('2024-02-30');
  await expect(page.getByText('请输入真实存在的日期')).toBeVisible();
  await expect(page.getByText('日期或时间需要修正')).toBeVisible();
  await expect(page.getByLabel('下载海报')).toHaveAttribute('aria-disabled', 'true');
});

test('restore example requires confirmation before replacing edits', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('app-ready')).toBeAttached();
  const title = page.getByLabel('主标题');
  await title.fill('A PRIVATE MEMORY');
  await page.getByLabel('恢复示例').click();
  await expect(title).toHaveValue('A PRIVATE MEMORY');
  await expect(page.getByText('恢复示例会替换当前海报设置。')).toBeVisible();
  await page.getByLabel('确认恢复示例').click();
  await expect(title).toHaveValue('THE NIGHT WE MET');
  await expect(page.getByText('示例内容已恢复')).toBeVisible();
});

test('location search selects a validated result', async ({ page }) => {
  await page.route('**/api/geocode?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      results: [{ id: 2988507, name: 'Paris', admin1: 'Ile-de-France', country: 'France', latitude: 48.85341, longitude: 2.3488, timezone: 'Europe/Paris' }],
    }),
  }));
  await page.goto('/');
  await expect(page.getByTestId('app-ready')).toBeAttached();
  await page.getByLabel('城市或地点').fill('Paris');
  await page.getByLabel('搜索地点').click();
  await page.getByLabel('选择 Paris').click();
  await expect(page.getByText(/Paris · 48\.85°.*Europe\/Paris/)).toBeVisible();
});

test('premium interest is explicit and never implies a charge', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('app-ready')).toBeAttached();
  await page.getByLabel('我对印刷级版本感兴趣').click();
  await expect(page.getByText('兴趣已记录。支付尚未开放，本次没有扣款。')).toBeVisible();
  await expect(page.getByLabel('我对印刷级版本感兴趣')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('¥19.9 买断')).toBeVisible();
});
