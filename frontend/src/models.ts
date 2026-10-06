export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface PointViewModel {
  id: string;
  name: string;
  coordinate: Coordinate;
  coordinateLabel: string;
}

export interface MapConfigurationViewModel {
  center: Coordinate;
  zoom: number;
  maxZoom: number;
  tileUrl: string;
  attribution: string;
}

export interface MapPageViewModel {
  map: MapConfigurationViewModel;
  points: PointViewModel[];
}

export interface InputError {
  message: string;
  fieldErrors: Record<string, string>;
}
