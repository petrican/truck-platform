export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe' | 'No Travel' | 'Unknown';

export interface WeatherInfo {
  available: boolean;
  wind_mph: number | null;
  wind_kmh?: number | null;
  rain_in_hr: number | null;
  rain_mm_hr?: number | null;
  snow_in_hr: number | null;
  snow_cm_hr?: number | null;
  temp_c?: number | null;
  temp_f?: number | null;
  humidity?: number | null;
  weather_code?: number | null;
  condition?: string;
}

export interface WeatherForecastHour {
  offset_hours: number;
  valid_at: string;
  weather: WeatherInfo;
  risk_level: RiskLevel;
}

export interface Checkpoint {
  lat: number;
  lng: number;
  distance_from_start_miles: number;
  eta_seconds_from_start?: number;
  eta_formatted?: string;
  weather?: WeatherInfo;
  forecast?: WeatherForecastHour[];
  risk_level?: RiskLevel;
}

export interface RiskSummary {
  max_risk_level: RiskLevel;
  avg_risk_score: number;
  severe_miles: number;
  high_miles: number;
}

export interface RouteGeometry {
  type: string;
  coordinates: [number, number][]; // [lng, lat]
}

export interface RouteItem {
  route_index: number;
  is_primary: boolean;
  is_recommended: boolean;
  distance_km: number;
  distance_miles: number;
  duration_mins: number;
  duration_hours: number;
  geometry: RouteGeometry;
  checkpoints: Checkpoint[];
  risk_summary: RiskSummary;
}

export interface RouteApiResponse {
  status: string;
  departure_time: string;
  load_weight_lbs: number;
  sampling_interval_miles: number;
  routes_count: number;
  routes: RouteItem[];
  error?: string;
}

export interface ShipmentFormData {
  origin: string;
  destination: string;
  departureTime: string;
  weight: string;
  weightUnit?: 'kg' | 'lbs';
  samplingMiles?: number;
}
