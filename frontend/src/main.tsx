import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { loadMap } from './features/points/api';
import 'maplibre-gl/dist/maplibre-gl.css';
import './app/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('The page is missing the React root.');
const appRoot = createRoot(root);
appRoot.render(<p className="startup-message" role="status">Loading map…</p>);
loadMap().then(
  initialModel => appRoot.render(<StrictMode><App initialModel={initialModel} /></StrictMode>),
  () => appRoot.render(<p className="startup-message" role="alert">The map could not be loaded. Please reload.</p>),
);
