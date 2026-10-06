import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import type { Coordinate, MapConfigurationViewModel, PointViewModel } from '../../generated/models';

// MapLibre 6 needs its worker bundled explicitly, including the worker's shared imports.
maplibregl.setWorkerUrl(workerUrl);

interface MapCanvasProps {
  config: MapConfigurationViewModel;
  points: PointViewModel[];
  selection: Coordinate | null;
  onSelect: (coordinate: Coordinate) => void;
}

export function MapCanvas({ config, points, selection, onSelect }: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectRef = useRef(onSelect);

  useEffect(() => { selectRef.current = onSelect; }, [onSelect]);

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      center: [config.center.longitude, config.center.latitude],
      zoom: config.zoom,
      maxZoom: config.maxZoom,
      style: {
        version: 8,
        sources: { topographic: {
          type: 'raster', tiles: [config.tileUrl], tileSize: 256, attribution: config.attribution,
        } },
        layers: [{ id: 'topographic', type: 'raster', source: 'topographic' }],
      },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.on('click', event => {
      const coordinate = event.lngLat.wrap();
      selectRef.current({ latitude: coordinate.lat, longitude: coordinate.lng });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [config]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = points.map(point => {
      const marker = new maplibregl.Marker({ color: '#176449' })
        .setLngLat([point.coordinate.longitude, point.coordinate.latitude]).addTo(map);
      marker.getElement().title = point.name;
      return marker;
    });
    return () => { markers.forEach(marker => marker.remove()); };
  }, [points, config]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selection) return;
    const marker = new maplibregl.Marker({ color: '#245edb' })
      .setLngLat([selection.longitude, selection.latitude]).addTo(map);
    return () => { marker.remove(); };
  }, [selection, config]);

  return <div className="map-canvas" ref={container} aria-label="Point registration map" />;
}
