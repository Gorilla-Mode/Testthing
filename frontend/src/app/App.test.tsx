import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from './App';
import type { Coordinate, PointViewModel } from '../generated/models';
import { initialModel, jsonResponse, saved } from '../test/models';

vi.mock('../features/points/MapCanvas', () => ({
  MapCanvas: ({ onSelect, selection, points }: {
    onSelect: (coordinate: Coordinate) => void;
    selection: Coordinate | null;
    points: PointViewModel[];
  }) => <div>
    <button onClick={() => onSelect({ latitude: 60.4, longitude: 5.3 })}>Select location</button>
    <output data-testid="selection">{selection ? `${selection.latitude}, ${selection.longitude}` : 'none'}</output>
    <output data-testid="saved-points">{points.map(point => `${point.id}: ${point.name}`).join(',')}</output>
  </div>,
}));

async function openForm() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Select location' }));
  await user.click(screen.getByRole('button', { name: 'Submit point' }));
  return user;
}

test('displays the initial model supplied at startup', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={{ ...initialModel, points: [saved] }} />);
  expect(screen.getByTestId('saved-points')).toHaveTextContent('server-id: Observation point');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Submit point' })).not.toBeInTheDocument();
});

test('submits JSON and displays the saved point returned by the server', async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(saved));
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText('Name'), ' Observation point ');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toBe('/web/points');
  expect(request.method).toBe('POST');
  expect(request.headers).toEqual({ Accept: 'application/json', 'Content-Type': 'application/json' });
  expect(JSON.parse(request.body)).toEqual({
    name: ' Observation point ', coordinate: { latitude: 60.4, longitude: 5.3 },
  });
  expect(screen.getByTestId('saved-points')).toHaveTextContent('server-id: Observation point');
  expect(screen.getByTestId('selection')).toHaveTextContent('none');
});

test('cancel closes the form and preserves the selected location', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByTestId('selection')).toHaveTextContent('60.4, 5.3');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('prevents duplicate requests and cancellation while saving', async () => {
  let resolve: (response: Response) => void = () => {};
  const fetchMock = vi.fn().mockReturnValue(new Promise<Response>(result => { resolve = result; }));
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText('Name'), 'Observation point');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  const dialog = screen.getByRole('dialog');
  fireEvent.submit(screen.getByLabelText('Name').closest('form')!);
  fireEvent(dialog, new Event('cancel'));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(dialog).toBeVisible();
  resolve(jsonResponse(saved));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test.each([
  ['validation error', () => Promise.resolve(jsonResponse({ message: 'Enter a name.' }, 400)), 'Enter a name.'],
  ['network failure', () => Promise.reject(new TypeError('offline')), 'Could not reach the server.'],
  ['server failure', () => Promise.resolve(jsonResponse({}, 500)), 'The point could not be saved.'],
])('%s preserves the draft and allows retry', async (_label, response, message) => {
  const fetchMock = vi.fn().mockImplementationOnce(response).mockResolvedValue(jsonResponse(saved));
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText('Name'), 'Draft');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.getByLabelText('Name')).toHaveValue('Draft');
  expect(screen.getByTestId('saved-points')).toBeEmptyDOMElement();
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByTestId('saved-points')).toHaveTextContent('server-id: Observation point');
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
