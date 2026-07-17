import { expect, test } from '@playwright/test';
import { stat } from 'node:fs/promises';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name} renders the sky-first experience without horizontal overflow`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/');

    await expect(page.getByTestId('app-ready')).toBeAttached();
    await expect(page.getByTestId('sky-video')).toHaveAttribute('src', /hf_20260315_073750/);
    await expect(page.getByRole('heading', { name: /回到那一刻/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /进入这片星空/ })).toBeVisible();
    await expect.poll(async () => Number(await page.getByTestId('sky-stage').getAttribute('data-star-count'))).toBeGreaterThan(1000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    expect(pageErrors).toEqual([]);
  });
}

test('entering the sky changes to the exploration state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: /进入这片星空/ }).click();
  await expect(page.getByRole('button', { name: '退出观星' })).toBeVisible();
  await expect(page.getByTestId('sky-stage')).toBeVisible();
  await expect(page.getByText('星座线')).toBeVisible();
  await expect(page.getByLabel('时间轴')).toBeVisible();
  await page.getByLabel('时间轴').fill('1320');
  await expect(page.getByText(/上海 · 2024\.05\.20 · 22:00/)).toBeVisible();
  await page.getByRole('button', { name: '回到这一刻' }).click();
  await expect(page.getByText(/上海 · 2024\.05\.20 · 20:30/)).toBeVisible();
});

test('data explanation makes the browser-rendered architecture clear', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /关于数据/ }).click();
  await expect(page.getByRole('complementary', { name: '数据与隐私说明' })).toBeVisible();
  await expect(page.getByText('地点 API')).toBeVisible();
  await expect(page.getByText('Web Worker')).toBeVisible();
  await expect(page.getByText('GPU', { exact: true })).toBeVisible();
});

test('artwork mode is a dedicated editable surface', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => Number(await page.getByTestId('sky-stage').getAttribute('data-star-count'))).toBeGreaterThan(1000);
  await page.getByRole('button', { name: '作品模式' }).click();
  await expect(page.getByRole('region', { name: '作品模式' })).toBeVisible();
  await expect(page.getByLabel('可导出的星空作品')).toBeVisible();
  await expect(page.getByRole('button', { name: '下载 PNG' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PNG' }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  expect((await stat(downloadPath!)).size).toBeGreaterThan(100_000);
  await page.getByRole('button', { name: '返回观星' }).click();
  await expect(page.getByRole('heading', { name: /回到那一刻/ })).toBeVisible();
});

test('location search selects an API-normalized place', async ({ page }) => {
  await page.route('**/api/geocode?**', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ results: [{ id: 2988507, name: 'Paris', admin1: 'Ile-de-France', country: 'France', latitude: 48.85341, longitude: 2.3488, timezone: 'Europe/Paris' }] }),
  }));
  await page.goto('/');
  await page.getByLabel('城市或地点').fill('Paris');
  await page.getByLabel('搜索地点').click();
  await page.getByLabel('选择 Paris').click();
  await expect(page.getByText(/Paris · 2024\.05\.20 · 20:30/)).toBeVisible();
  await expect(page.getByText(/48\.85°，2\.35° · Europe\/Paris/)).toBeVisible();
});

test('invalid dates expose a recoverable validation message', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('日期').fill('2024-02-30');
  await expect(page.getByText('请输入真实存在的日期')).toBeVisible();
  await expect(page.getByRole('button', { name: /进入这片星空/ })).toBeDisabled();
});
