import { expect, test, vi } from 'vitest';
import { loadMap, savePoint } from './api';
import { initialModel, jsonResponse, saved } from '../../test/models';

test('loads map configuration and saved points from the API', async () => {
  const model = { ...initialModel, points: [saved] };
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(model, 200));
  vi.stubGlobal('fetch', fetchMock);
  await expect(loadMap()).resolves.toEqual(model);
  expect(fetchMock).toHaveBeenCalledWith('/web/map', { headers: { Accept: 'application/json' } });
});

test.each([
  ['server failure', () => Promise.resolve(jsonResponse({}, 503))],
  ['network failure', () => Promise.reject(new TypeError('offline'))],
  ['invalid JSON', () => Promise.resolve(new Response('<html>Unavailable</html>'))],
])('rejects map loading on %s', async (_label, response) => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(response));
  await expect(loadMap()).rejects.toThrow();
});

test('preserves HTML in point names through JSON', async () => {
  const name = '</script><b>Observation point</b>&';
  const point = { ...saved, name };
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(point));
  vi.stubGlobal('fetch', fetchMock);
  await expect(savePoint({ name, coordinate: saved.coordinate })).resolves.toEqual(point);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).name).toBe(name);
});
