import { expect, test } from '@playwright/test';

// A deterministic raster tile keeps interaction checks independent of the tile provider.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

for (const viewport of [
  { width: 390, height: 844 },
  { width: 834, height: 1194 },
  { width: 1440, height: 1024 },
]) {
  test(`point workflow and layout at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    if (process.env.NRL_LIVE_TILES !== '1') {
      await page.context().route('https://cache.kartverket.no/**', route => route.fulfill({ contentType: 'image/png', body: tile }));
    }
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const html = await page.goto('/');
    expect(html?.headers()['cache-control']).toBe('no-store');
    if (process.env.FRONTEND_DEV !== '1') {
      const entry = await page.locator('script[type="module"][src]').getAttribute('src');
      const asset = await page.request.get(entry!, { headers: { 'Accept-Encoding': 'gzip' } });
      expect(asset.status()).toBe(200);
      expect(asset.headers()['content-encoding']).toBe('gzip');
    }
    await expect(page.getByText('Loading map…')).toBeHidden();
    await expect(page.locator('.map-message')).toBeHidden();
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);

    const canvas = page.locator('.maplibregl-canvas');
    const location = { x: Math.round(viewport.width * .55), y: Math.round(viewport.height * .4) };
    await canvas.click({ position: location });
    const submit = page.getByRole('button', { name: /Submit point/ });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Name Required')).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('name-form.png') });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(submit).toBeFocused();
    await submit.click();
    await page.getByRole('button', { name: 'Save point' }).click();
    await expect(page.getByRole('alert')).toContainText('Enter a name');

    const name = `Browser point ${viewport.width} ${Date.now()}`;
    await page.getByLabel('Name Required').fill(name);
    const responsePromise = page.waitForResponse(response => response.url().endsWith('/web/points') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Save point' }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const point = await response.json();
    expect(point.name).toBe(name);
    expect(point.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isFinite(point.coordinate.latitude)).toBe(true);
    expect(Number.isFinite(point.coordinate.longitude)).toBe(true);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByText(`“${name}” saved.`)).toBeVisible();
    await expect(submit).toBeHidden();

    // The saved marker is at the selected screen position, without changing the map camera.
    await canvas.click({ position: location });
    await expect(page.locator('.maplibregl-popup-content')).toContainText(name);
    await expect(submit).toBeHidden();
    await page.reload();
    await expect(page.getByText('Loading map…')).toBeHidden();
    await canvas.click({ position: location });
    await expect(page.locator('.maplibregl-popup-content')).toContainText(name);
    expect(errors).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('saved-point.png') });
    const persisted = await page.request.get('/web/map');
    expect((await persisted.json()).points.some((saved: { id: string }) => saved.id === point.id)).toBe(true);
  });
}
