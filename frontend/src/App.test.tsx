import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { App } from './App';
import type { Coordinate, MapPageViewModel, PointViewModel } from './models';

vi.mock('./MapCanvas', () => ({
  MapCanvas: ({ onSelect, selection, points }: {
    onSelect: (coordinate: Coordinate) => void; selection: Coordinate | null; points: PointViewModel[];
  }) => <div>
    <button onClick={() => onSelect({ latitude: 60.4, longitude: 5.3 })}>Select first location</button>
    <button onClick={() => onSelect({ latitude: 61.5, longitude: 6.2 })}>Select second location</button>
    <output data-testid="selection">{JSON.stringify(selection)}</output>
    <output data-testid="saved-points">{JSON.stringify(points)}</output>
  </div>,
}));

const initialModel: MapPageViewModel = {
  map: { center: { latitude: 60.4055, longitude: 5.3435 }, zoom: 13.5, maxZoom: 18,
    tileUrl: 'https://example.test/{z}/{x}/{y}.png', attribution: 'Test map' },
  points: [],
};
const saved: PointViewModel = {
  id: 'server-id', name: 'Observation point', coordinate: { latitude: 60.4, longitude: 5.3 },
  coordinateLabel: '60.40000, 5.30000',
};

async function openForm() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Select first location' }));
  await user.click(screen.getByRole('button', { name: /Submit point/ }));
  return user;
}

test('renders bootstrapped points without an initial data request', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={{ ...initialModel, points: [saved] }} />);
  expect(screen.getByText('1 saved point')).toBeInTheDocument();
  expect(screen.getByTestId('saved-points')).toHaveTextContent('server-id');
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: /Submit point/ })).not.toBeInTheDocument();
});

test('a second map selection replaces the first and clearing removes it', async () => {
  render(<App initialModel={initialModel} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Select first location' }));
  await user.click(screen.getByRole('button', { name: 'Select second location' }));
  expect(screen.getByTestId('selection')).toHaveTextContent('61.5');
  await user.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByTestId('selection')).toHaveTextContent('null');
});

test('opens the form with focus and cancel retains selection and restores focus', async () => {
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByLabelText(/Name/)).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Submit point/ })).toHaveFocus();
  expect(screen.getByTestId('selection')).toHaveTextContent('60.4');
});

test('sends selected coordinates and displays the canonical server response', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => saved });
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText(/Name/), ' Observation point ');
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  await waitFor(() => expect(screen.getByText('1 saved point')).toBeInTheDocument());
  expect(fetchMock).toHaveBeenCalledWith('/web/points', expect.objectContaining({
    method: 'POST', body: JSON.stringify({ name: ' Observation point ', coordinate: { latitude: 60.4, longitude: 5.3 } }),
  }));
  expect(screen.getByTestId('saved-points')).toHaveTextContent('server-id');
  expect(screen.getByTestId('selection')).toHaveTextContent('null');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByText('“Observation point” saved.')).toHaveAttribute('role', 'status');
});

test('prevents duplicate requests while saving', async () => {
  let resolve: (response: unknown) => void = () => {};
  const fetchMock = vi.fn().mockReturnValue(new Promise(result => { resolve = result; }));
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText(/Name/), 'Observation point');
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent.submit(screen.getByLabelText(/Name/).closest('form')!);
  expect(fetchMock).toHaveBeenCalledTimes(1);
  resolve({ ok: true, json: async () => saved });
  await waitFor(() => expect(screen.getByText('1 saved point')).toBeInTheDocument());
});

test('shows server validation errors and permits retry without losing input', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({
      message: 'Check the highlighted fields.', fieldErrors: { name: 'Use 100 characters or fewer.' },
    }) })
    .mockResolvedValueOnce({ ok: true, json: async () => saved });
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.type(screen.getByLabelText(/Name/), 'Observation point');
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check the highlighted fields.');
  expect(screen.getByLabelText(/Name/)).toHaveValue('Observation point');
  expect(screen.getByLabelText(/Name/)).toHaveAttribute('aria-invalid', 'true');
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  await waitFor(() => expect(screen.getByText('1 saved point')).toBeInTheDocument());
});

test('network failure retains the draft and a blank name never sends a request', async () => {
  const fetchMock = vi.fn().mockRejectedValue(new TypeError('offline'));
  vi.stubGlobal('fetch', fetchMock);
  render(<App initialModel={initialModel} />);
  const user = await openForm();
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  expect(fetchMock).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/Name/), 'Observation point');
  await user.click(screen.getByRole('button', { name: 'Save point' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.');
  expect(screen.getByLabelText(/Name/)).toHaveValue('Observation point');
  expect(screen.getByTestId('saved-points')).toHaveTextContent('[]');
});
