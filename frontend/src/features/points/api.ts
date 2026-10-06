import type { CreatePointRequest, InputError, MapPageViewModel, PointViewModel } from '../../generated/models';

export async function loadMap(): Promise<MapPageViewModel> {
  const response = await fetch('/web/map', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('The map could not be loaded. Please reload.');
  return response.json();
}

export async function savePoint(request: CreatePointRequest): Promise<PointViewModel> {
  let response: Response;
  try {
    response = await fetch('/web/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
    });
  } catch {
    throw new Error('Could not reach the server. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 400) {
      const error: InputError = await response.json();
      throw new Error(error.message);
    }
    throw new Error('The point could not be saved. Please try again.');
  }
  const point: PointViewModel = await response.json();
  return point;
}
