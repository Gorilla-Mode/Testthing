import type { MapPageViewModel, PointViewModel } from '../generated/models';

export const initialModel: MapPageViewModel = {
  map: { center: { latitude: 60.4055, longitude: 5.3435 }, zoom: 13.5, maxZoom: 18,
    tileUrl: 'https://example.test/{z}/{x}/{y}.png', attribution: 'Test map' },
  points: [],
};
export const saved: PointViewModel = {
  id: 'server-id', name: 'Observation point', coordinate: { latitude: 60.4, longitude: 5.3 },
};
export function jsonResponse(body: unknown, status = 201) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
