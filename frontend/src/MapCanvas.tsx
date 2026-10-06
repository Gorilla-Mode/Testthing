import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as LibreMap } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { FeatureCollection, Point } from 'geojson';
import type { Coordinate, MapConfigurationViewModel, PointViewModel } from './models';

// MapLibre 6 needs its worker bundled explicitly, including the worker's shared imports.
maplibregl.setWorkerUrl(workerUrl);

interface MapCanvasProps {
  config: MapConfigurationViewModel;
  points: PointViewModel[];
  selection: Coordinate | null;
  onSelect: (coordinate: Coordinate) => void;
}

function savedFeatures(points: PointViewModel[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: points.map(point => ({
      type: 'Feature', id: point.id,
      properties: { name: point.name, coordinateLabel: point.coordinateLabel },
      geometry: { type: 'Point', coordinates: [point.coordinate.longitude, point.coordinate.latitude] },
    })),
  };
}

function pendingFeatures(coordinate: Coordinate | null): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: coordinate ? [{
      type: 'Feature', properties: {},
      geometry: { type: 'Point', coordinates: [coordinate.longitude, coordinate.latitude] },
    }] : [],
  };
}

export function MapCanvas({ config, points, selection, onSelect }: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const latest = useRef({ points, selection, onSelect });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { latest.current = { points, selection, onSelect }; }, [points, selection, onSelect]);

  useEffect(() => {
    if (!container.current) return;
    let map: LibreMap;
    try {
      map = new maplibregl.Map({
        container: container.current,
        center: [config.center.longitude, config.center.latitude],
        zoom: config.zoom, maxZoom: config.maxZoom,
        style: {
          version: 8,
          sources: { topographic: {
            type: 'raster', tiles: [config.tileUrl], tileSize: 256, attribution: config.attribution,
          } },
          layers: [{ id: 'topographic', type: 'raster', source: 'topographic' }],
        },
      });
    } catch {
      setError('The map could not start. Check that your browser supports WebGL.');
      return;
    }
    mapRef.current = map;
    const popup = new maplibregl.Popup({ closeButton: true, maxWidth: '260px' });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('error', () => setError('The map could not load completely. Try reloading or check your connection.'));
    map.on('load', () => {
      map.addSource('saved-points', { type: 'geojson', data: savedFeatures(latest.current.points) });
      map.addLayer({ id: 'saved-points', type: 'circle', source: 'saved-points', paint: {
        'circle-radius': 8, 'circle-color': '#176449', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff',
      } });
      map.addSource('pending-point', { type: 'geojson', data: pendingFeatures(latest.current.selection) });
      map.addLayer({ id: 'pending-point', type: 'circle', source: 'pending-point', paint: {
        'circle-radius': 10, 'circle-color': '#245edb', 'circle-stroke-width': 3, 'circle-stroke-color': '#ffffff',
      } });
      map.on('mouseenter', 'saved-points', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'saved-points', () => { map.getCanvas().style.cursor = ''; });
      setReady(true);
    });
    map.on('click', event => {
      const feature = map.getLayer('saved-points')
        ? map.queryRenderedFeatures(event.point, { layers: ['saved-points'] })[0] : undefined;
      if (feature?.geometry.type === 'Point') {
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = String(feature.properties.name);
        const coordinates = document.createElement('p');
        coordinates.textContent = String(feature.properties.coordinateLabel);
        content.append(title, coordinates);
        popup.setLngLat([feature.geometry.coordinates[0], feature.geometry.coordinates[1]])
          .setDOMContent(content).addTo(map);
        return;
      }
      popup.remove();
      const coordinate = event.lngLat.wrap();
      latest.current.onSelect({ latitude: coordinate.lat, longitude: coordinate.lng });
    });
    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [config]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource('saved-points') as GeoJSONSource | undefined)?.setData(savedFeatures(points));
  }, [points, ready]);

  useEffect(() => {
    if (!ready) return;
    (mapRef.current?.getSource('pending-point') as GeoJSONSource | undefined)?.setData(pendingFeatures(selection));
  }, [selection, ready]);

  return <>
    <div className="map-canvas" ref={container} aria-label="Point registration map" />
    {!ready && !error && <div className="map-message" role="status">Loading map…</div>}
    {error && <div className="map-message map-message--error" role="alert">{error}</div>}
  </>;
}
