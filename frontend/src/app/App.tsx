import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MapCanvas } from '../features/points/MapCanvas';
import { savePoint } from '../features/points/api';
import type { Coordinate, MapPageViewModel } from '../generated/models';

export function App({ initialModel }: { initialModel: MapPageViewModel }) {
  const [points, setPoints] = useState(initialModel.points);
  const [selection, setSelection] = useState<Coordinate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (formOpen) dialog.current?.showModal();
    else dialog.current?.close();
  }, [formOpen]);

  function selectPoint(coordinate: Coordinate) {
    if (savingRef.current) return;
    setSelection(coordinate);
    setName('');
    setError('');
  }

  function closeForm() {
    if (savingRef.current) return;
    setFormOpen(false);
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const point = await savePoint({ name, coordinate: selection });
      setPoints(current => [...current, point]);
      setFormOpen(false);
      setSelection(null);
      setName('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The point could not be saved. Please try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <main className="app">
    <MapCanvas config={initialModel.map} points={points} selection={selection} onSelect={selectPoint} />
    <div className="map-action">
      {selection
        ? <button onClick={() => setFormOpen(true)}>Submit point</button>
        : <p>Select a location on the map.</p>}
    </div>
    <dialog ref={dialog} aria-labelledby="dialog-title"
      onCancel={event => { event.preventDefault(); closeForm(); }}
      onClose={closeForm}>
      <form onSubmit={submit}>
        <h1 id="dialog-title">Save point</h1>
        <label htmlFor="point-name">Name</label>
        <input id="point-name" name="name" value={name} maxLength={100} required autoFocus
          disabled={saving} onChange={event => setName(event.target.value)} />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={closeForm} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </dialog>
  </main>;
}
