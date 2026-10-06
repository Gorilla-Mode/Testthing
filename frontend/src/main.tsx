import 'vite/modulepreload-polyfill';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import type { MapPageViewModel } from './models';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

const root = document.getElementById('root');
const data = document.getElementById('app-data');
if (!root || !data?.textContent) throw new Error('The server did not provide the initial map view model.');
const initialModel = JSON.parse(data.textContent) as MapPageViewModel;
createRoot(root).render(<StrictMode><App initialModel={initialModel} /></StrictMode>);
