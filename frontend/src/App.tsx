import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MapCanvas } from './MapCanvas';
import { savePoint, SubmissionError } from './api';
import type { Coordinate, InputError, MapPageViewModel } from './models';

export function App({ initialModel }: { initialModel: MapPageViewModel }) {
  const [points, setPoints] = useState(initialModel.points);
  const [selection, setSelection] = useState<Coordinate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<InputError | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const submitTrigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    if (formOpen) {
      dialog.current?.showModal();
      nameInput.current?.focus();
    } else {
      dialog.current?.close();
      if (notice) heading.current?.focus();
      else submitTrigger.current?.focus();
    }
  }, [formOpen, notice]);

  function selectPoint(coordinate: Coordinate) {
    setSelection(coordinate);
    setName('');
    setError(null);
    setNotice('');
  }

  function closeForm() {
    if (savingRef.current) return;
    setFormOpen(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || savingRef.current) return;
    if (!name.trim()) {
      setError({ message: 'Enter a name for this point.', fieldErrors: { name: 'Enter a name.' } });
      nameInput.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const point = await savePoint(name, selection);
      setPoints(current => [...current, point]);
      setFormOpen(false);
      setSelection(null);
      setName('');
      setNotice(`“${point.name}” saved.`);
    } catch (failure) {
      setError(failure instanceof SubmissionError ? failure.details
        : { message: 'The point could not be saved. Please try again.', fieldErrors: {} });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <main className="app">
    <div className="map-workspace" inert={formOpen}>
      <MapCanvas config={initialModel.map} points={points} selection={selection} onSelect={selectPoint} />
      <header className="app-header">
        <div className="brand" aria-label="NRL"><span className="brand-mark" aria-hidden="true">N</span>
          <div><strong>NRL</strong><span>Point registration</span></div>
        </div>
        <div className="saved-count"><span className="saved-dot" aria-hidden="true" />
          {points.length} saved {points.length === 1 ? 'point' : 'points'}
        </div>
      </header>
      <section className="action-panel" aria-label="Point selection">
        <span className="eyebrow">{selection ? 'Selected location' : 'Add a point'}</span>
        <h1 ref={heading} tabIndex={-1}>{selection ? 'Ready to register this point?' : 'Start with a place on the map.'}</h1>
        <p>{selection
          ? `${selection.latitude.toFixed(5)}, ${selection.longitude.toFixed(5)} · Click elsewhere to move it.`
          : 'Click or tap to select a location, then give your point a name.'}</p>
        {selection && <div className="actions">
          <button className="button button--secondary" onClick={() => { setSelection(null); setName(''); }}>Clear selection</button>
          <button ref={submitTrigger} className="button button--primary" onClick={() => { setError(null); setFormOpen(true); }}>Submit point <span aria-hidden="true">→</span></button>
        </div>}
        <p className="storage-note">Saved on this server until it restarts.</p>
      </section>
    </div>
    <p className={`notice${notice ? ' notice--visible' : ''}`} role="status">{notice}</p>
    <dialog ref={dialog} className="point-dialog" aria-labelledby="dialog-title"
      onCancel={event => { event.preventDefault(); closeForm(); }}
      onClose={() => { if (!savingRef.current) setFormOpen(false); }}>
      <form onSubmit={submit} noValidate>
        <span className="eyebrow">New point</span>
        <h2 id="dialog-title">Give this place a name.</h2>
        <p className="dialog-description">Your point will appear on the map once it is saved.</p>
        {selection && <div className="coordinate-summary"><span>Selected coordinates</span>
          <strong>{selection.latitude.toFixed(5)}, {selection.longitude.toFixed(5)}</strong></div>}
        <label htmlFor="point-name">Name <span className="required-note">Required</span></label>
        <input ref={nameInput} id="point-name" name="name" value={name} maxLength={100} required
          placeholder="e.g. Observation point" autoComplete="off" disabled={saving}
          aria-invalid={Boolean(error?.fieldErrors.name)} aria-describedby={error?.fieldErrors.name ? 'name-error' : undefined}
          onChange={event => setName(event.target.value)} />
        {error?.fieldErrors.name && <p id="name-error" className="field-error">{error.fieldErrors.name}</p>}
        {error && <p className="form-error" role="alert">{error.message}</p>}
        <div className="actions dialog-actions">
          <button type="button" className="button button--secondary" onClick={closeForm} disabled={saving}>Cancel</button>
          <button type="submit" className="button button--primary" disabled={saving}>{saving ? 'Saving…' : 'Save point'}</button>
        </div>
      </form>
    </dialog>
  </main>;
}
