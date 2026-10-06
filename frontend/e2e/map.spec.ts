import { expect, test } from '@playwright/test';
import type { MapPageViewModel, PointViewModel } from '../src/generated/models';

// Keep the workflow independent of the tile provider.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

test('serves the page and its referenced scripts and stylesheets', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('text/html');
  const html = await response.text();
  expect(html).toContain('<div id="root"></div>');
  const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(match => match[1]);
  const styles = [...html.matchAll(/<link[^>]*href="([^"]+)"/g)].map(match => match[1]);
  expect(scripts.length).toBeGreaterThan(0);
  if (process.env.FRONTEND_DEV !== '1') expect(styles.length).toBeGreaterThan(0);
  for (const asset of [...scripts, ...styles]) {
    const assetResponse = await request.get(asset);
    expect(assetResponse.status(), asset).toBe(200);
    expect(assetResponse.headers()['content-type']).toMatch(/javascript|css/);
    expect((await assetResponse.body()).length).toBeGreaterThan(0);
  }
});

test('shows loading and a reload message when the initial map request fails', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/web/map', async route => {
    await pending;
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Loading map…');
  release();
  await expect(page.getByRole('alert')).toHaveText('The map could not be loaded. Please reload.');
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('.maplibregl-canvas')).toHaveCount(0);
});

test('selects a location, saves a point, and displays it after reload', async ({ page }) => {
  await page.route('https://cache.kartverket.no/**', route => route.fulfill({ contentType: 'image/png', body: tile }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate(element => element.setAttribute('data-map-instance', 'original'));
  await canvas.click({ position: { x: 500, y: 300 } });
  await expect(page.locator('.maplibregl-marker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Submit point' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const name = `<b>Browser point ${Date.now()}</b>&`;
  await page.getByLabel('Name', { exact: true }).fill(name);
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/web/points') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  expect(response.request().postDataJSON().name).toBe(name);
  const point: PointViewModel = await response.json();
  expect(point.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(Number.isFinite(point.coordinate.latitude)).toBe(true);
  expect(Number.isFinite(point.coordinate.longitude)).toBe(true);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByTitle(name, { exact: true })).toBeVisible();
  await expect(canvas).toHaveAttribute('data-map-instance', 'original');
  await expect(page.getByRole('button', { name: 'Submit point' })).toBeHidden();

  await page.reload();
  await expect(page.getByTitle(name, { exact: true })).toBeVisible();
  const model: MapPageViewModel = await (await page.request.get('/web/map')).json();
  expect(model.points.some(saved => saved.id === point.id)).toBe(true);
  expect(errors).toEqual([]);
});
