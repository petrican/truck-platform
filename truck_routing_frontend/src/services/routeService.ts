import type { RouteApiResponse, ShipmentFormData, RouteItem, RiskLevel } from '../types/route';

// Built-in dictionary for instant geocoding of major logistics corridors
const CITY_COORDINATES: Record<string, [number, number]> = {
  // [longitude, latitude]
  'berlin': [13.4050, 52.5200],
  'berlin, de': [13.4050, 52.5200],
  'berlin, germany': [13.4050, 52.5200],
  'munich': [11.5820, 48.1351],
  'munich, de': [11.5820, 48.1351],
  'munich, germany': [11.5820, 48.1351],
  'hamburg': [9.9937, 53.5511],
  'frankfurt': [8.6821, 50.1109],
  'paris': [2.3522, 48.8566],
  'paris, fr': [2.3522, 48.8566],
  'paris, france': [2.3522, 48.8566],
  'lyon': [4.8357, 45.7640],
  'marseille': [5.3698, 43.2965],
  'london': [-0.1276, 51.5074],
  'london, uk': [-0.1276, 51.5074],
  'london, gb': [-0.1276, 51.5074],
  'manchester': [-2.2426, 53.4808],
  'birmingham': [-1.8904, 52.4862],
  'amsterdam': [4.9041, 52.3676],
  'amsterdam, nl': [4.9041, 52.3676],
  'rotterdam': [4.4777, 51.9244],
  'brussels': [4.3517, 50.8503],
  'vienna': [16.3738, 48.2082],
  'prague': [14.4378, 50.0755],
  'warsaw': [21.0122, 52.2297],
  'bucharest': [26.1025, 44.4268],
  'bucharest, ro': [26.1025, 44.4268],
  'iasi': [27.6014, 47.1585],
  'iasi, ro': [27.6014, 47.1585],
  'cluj': [23.6236, 46.7712],
  'cluj-napoca': [23.6236, 46.7712],
  'cluj-napoca, ro': [23.6236, 46.7712],
  'brasov': [25.6012, 45.6579],
  'brasov, ro': [25.6012, 45.6579],
  'timisoara': [21.2272, 45.7489],
  'madrid': [-3.7038, 40.4168],
  'barcelona': [2.1734, 41.3851],
  'rome': [12.4964, 41.9028],
  'milan': [9.1900, 45.4642],
  'chicago': [-87.6298, 41.8781],
  'dallas': [-96.7970, 32.7767],
  'new york': [-74.0060, 40.7128],
};

export const WMO_WEATHER_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Fog', icon: '🌫️' },
  48: { condition: 'Depositing rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌦️' },
  53: { condition: 'Moderate drizzle', icon: '🌦️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  56: { condition: 'Light freezing drizzle', icon: '🌨️' },
  57: { condition: 'Dense freezing drizzle', icon: '🌨️' },
  61: { condition: 'Slight rain', icon: '🌧️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '🌧️' },
  66: { condition: 'Light freezing rain', icon: '🌨️' },
  67: { condition: 'Heavy freezing rain', icon: '🌨️' },
  71: { condition: 'Slight snowfall', icon: '❄️' },
  73: { condition: 'Moderate snowfall', icon: '❄️' },
  75: { condition: 'Heavy snowfall', icon: '❄️' },
  77: { condition: 'Snow grains', icon: '❄️' },
  80: { condition: 'Slight rain showers', icon: '🌦️' },
  81: { condition: 'Moderate rain showers', icon: '🌧️' },
  82: { condition: 'Violent rain showers', icon: '⛈️' },
  85: { condition: 'Slight snow showers', icon: '🌨️' },
  86: { condition: 'Heavy snow showers', icon: '❄️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
  99: { condition: 'Severe thunderstorm', icon: '⛈️' },
};

const RISK_SCORE_MAP: Record<RiskLevel, number> = {
  'Low': 1,
  'Moderate': 2,
  'High': 3,
  'Severe': 4,
  'No Travel': 5,
  'Unknown': 6,
};

export function computeRiskLevel(
  windMph: number,
  rainInHr: number,
  snowInHr: number,
  loadWeight: number,
  weatherCode?: number | null
): RiskLevel {
  let baseRisk: RiskLevel = 'Low';
  if (weatherCode !== null && weatherCode !== undefined) {
    if ([66, 67, 95, 96, 99].includes(weatherCode)) {
      baseRisk = 'Severe';
    } else if ([56, 57, 75, 82, 86].includes(weatherCode)) {
      baseRisk = 'High';
    } else if ([45, 48, 53, 55, 63, 73, 81, 85].includes(weatherCode)) {
      baseRisk = 'Moderate';
    }
  }

  let risk: RiskLevel = baseRisk;
  if (windMph >= 55 || rainInHr > 1.00 || snowInHr > 3.0) {
    risk = 'No Travel';
  } else if (windMph >= 45 || rainInHr >= 0.50 || snowInHr >= 2.0) {
    risk = 'Severe';
  } else if (windMph >= 35 || rainInHr >= 0.25 || snowInHr >= 1.0) {
    risk = 'High';
  } else if (windMph >= 25 || rainInHr >= 0.10 || snowInHr >= 0.5) {
    risk = 'Moderate';
  }

  // Heavy cargo crosswind limits
  if (windMph >= 55) return 'No Travel';
  if (windMph >= 45 && windMph < 55 && loadWeight > 30000) return 'No Travel';
  if (windMph >= 35 && windMph < 45 && loadWeight > 40000) return 'Severe';

  return risk;
}

/**
 * Resolve an address or coordinate string into a "lng,lat" string expected by the backend
 */
export async function resolveCoordinates(input: string): Promise<string> {
  const trimmed = input.trim();

  // 1. Check if the input is already in "number, number" coordinate format
  const coordRegex = /^[-+]?([0-9]*\.[0-9]+|[0-9]+)\s*,\s*[-+]?([0-9]*\.[0-9]+|[0-9]+)$/;
  if (coordRegex.test(trimmed)) {
    const [part1, part2] = trimmed.split(',').map((s) => parseFloat(s.trim()));
    return `${part1},${part2}`;
  }

  // 2. Lookup in local dictionary
  const normalized = trimmed.toLowerCase();
  if (CITY_COORDINATES[normalized]) {
    const [lng, lat] = CITY_COORDINATES[normalized];
    return `${lng},${lat}`;
  }

  for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return `${coords[0]},${coords[1]}`;
    }
  }

  // 3. Fallback to OpenStreetMap Nominatim geocoder
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trimmed)}&limit=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TruckRoutingPlatform/2026',
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const lng = parseFloat(data[0].lon);
        const lat = parseFloat(data[0].lat);
        return `${lng},${lat}`;
      }
    }
  } catch (err) {
    console.warn('Geocoding service unavailable, using default fallback', err);
  }

  throw new Error(`Could not resolve location "${trimmed}". Please provide coordinates (e.g. 13.40,52.52) or a recognized city.`);
}

/**
 * Directly queries Open-Meteo API for each route checkpoint to ensure 100% accurate,
 * localized meteorological conditions at the vehicle's exact estimated time of arrival.
 */
export async function enrichRoutesWithLiveWeather(
  routes: RouteItem[],
  loadWeightLbs: number,
  departureIso: string
): Promise<RouteItem[]> {
  const departureDate = new Date(departureIso);

  return Promise.all(
    routes.map(async (route) => {
      if (!route.checkpoints || route.checkpoints.length === 0) return route;

      try {
        const lats = route.checkpoints.map((cp) => cp.lat.toFixed(4)).join(',');
        const lngs = route.checkpoints.map((cp) => cp.lng.toFixed(4)).join(',');

        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,rain,snowfall&timezone=UTC&past_days=2&forecast_days=7`;

        const res = await fetch(openMeteoUrl);
        if (!res.ok) {
          console.warn('Open-Meteo batch request failed with status:', res.status);
          return route;
        }

        const rawData = await res.json();
        const locationsData = Array.isArray(rawData) ? rawData : [rawData];

        let severeMiles = 0;
        let highMiles = 0;
        let totalScore = 0;
        let maxRisk: RiskLevel = 'Low';

        const enrichedCheckpoints = route.checkpoints.map((cp, idx) => {
          const loc = locationsData[idx] || locationsData[0];
          const hourly = loc?.hourly;

          if (!hourly?.time?.length) {
            return cp;
          }

          // Calculate expected arrival time at this checkpoint
          const arrivalTime = new Date(departureDate.getTime() + (cp.eta_seconds_from_start || 0) * 1000);
          const arrivalHourStr = arrivalTime.toISOString().slice(0, 13) + ':00';

          const times: string[] = hourly.time;
          const nearestHourIndex = (target: Date): number => times.reduce((nearestIdx, timeStr, i) => {
            const diffCurrent = Math.abs(new Date(`${timeStr}Z`).getTime() - target.getTime());
            const diffNearest = Math.abs(new Date(`${times[nearestIdx]}Z`).getTime() - target.getTime());
            return diffCurrent < diffNearest ? i : nearestIdx;
          }, 0);
          const weatherAt = (hourIdx: number) => {
            const tempC = hourly.temperature_2m?.[hourIdx] ?? null;
            const humidity = hourly.relative_humidity_2m?.[hourIdx] ?? null;
            const weatherCode = hourly.weather_code?.[hourIdx] ?? null;
            const windKmh = hourly.wind_speed_10m?.[hourIdx] ?? 0;
            const rainMm = hourly.rain?.[hourIdx] ?? hourly.precipitation?.[hourIdx] ?? 0;
            const snowfallCm = hourly.snowfall?.[hourIdx] ?? 0;
            const windMph = Math.round((windKmh / 1.60934) * 10) / 10;
            const rainInHr = Math.round((rainMm / 25.4) * 1000) / 1000;
            const snowInHr = Math.round((snowfallCm / 2.54) * 100) / 100;
            const condition = weatherCode !== null && WMO_WEATHER_MAP[weatherCode]
              ? WMO_WEATHER_MAP[weatherCode].condition
              : rainMm > 0 ? 'Rain showers' : 'Partly cloudy';

            return {
              weather: {
                available: true,
                wind_mph: windMph,
                wind_kmh: Math.round(windKmh * 10) / 10,
                rain_in_hr: rainInHr,
                rain_mm_hr: Math.round(rainMm * 100) / 100,
                snow_in_hr: snowInHr,
                snow_cm_hr: Math.round(snowfallCm * 100) / 100,
                temp_c: tempC !== null ? Math.round(tempC * 10) / 10 : null,
                temp_f: tempC !== null ? Math.round((tempC * 9 / 5 + 32) * 10) / 10 : null,
                humidity: humidity !== null ? Math.round(humidity) : null,
                weather_code: weatherCode,
                condition,
              },
              riskLevel: computeRiskLevel(windMph, rainInHr, snowInHr, loadWeightLbs, weatherCode),
            };
          };
          const etaIndex = times.indexOf(arrivalHourStr);
          const hourIdx = etaIndex >= 0 ? etaIndex : nearestHourIndex(arrivalTime);
          const forecast = Array.from({ length: 49 }, (_, offsetHours) => {
            const validAt = new Date(departureDate.getTime() + offsetHours * 60 * 60 * 1000);
            const sample = weatherAt(nearestHourIndex(validAt));
            return {
              offset_hours: offsetHours,
              valid_at: validAt.toISOString(),
              weather: sample.weather,
              risk_level: sample.riskLevel,
            };
          });
          const etaWeather = weatherAt(hourIdx);

          return {
            ...cp,
            eta_formatted: arrivalTime.toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
            weather: etaWeather.weather,
            forecast,
            risk_level: etaWeather.riskLevel,
          };
        });

        // Recompute route risk metrics
        enrichedCheckpoints.forEach((cp, idx) => {
          const risk = cp.risk_level || 'Low';
          const score = RISK_SCORE_MAP[risk] || 1;
          totalScore += score;

          if (score > (RISK_SCORE_MAP[maxRisk] || 1)) {
            maxRisk = risk;
          }

          if (idx + 1 < enrichedCheckpoints.length) {
            const nextCp = enrichedCheckpoints[idx + 1];
            const segMiles = Math.max(0, nextCp.distance_from_start_miles - cp.distance_from_start_miles);
            if (risk === 'Severe' || risk === 'No Travel') {
              severeMiles += segMiles;
            } else if (risk === 'High') {
              highMiles += segMiles;
            }
          }
        });

        const avgScore = enrichedCheckpoints.length > 0 ? totalScore / enrichedCheckpoints.length : 1;

        return {
          ...route,
          checkpoints: enrichedCheckpoints,
          risk_summary: {
            max_risk_level: maxRisk,
            avg_risk_score: Math.round(avgScore * 10) / 10,
            severe_miles: Math.round(severeMiles * 10) / 10,
            high_miles: Math.round(highMiles * 10) / 10,
          },
        };
      } catch (error) {
        console.warn('Could not enrich route with live Open-Meteo weather:', error);
        return route;
      }
    })
  );
}

/**
 * Call the backend to compute OSRM routes, then verifies and enriches
 * all checkpoint weather using the Open-Meteo API.
 */
export async function fetchCalculatedRoutes(data: ShipmentFormData): Promise<RouteApiResponse> {
  const [startCoords, endCoords] = await Promise.all([
    resolveCoordinates(data.origin),
    resolveCoordinates(data.destination),
  ]);

  const rawWeight = parseFloat(data.weight) || 0;
  const weightInLbs = data.weightUnit === 'lbs' ? rawWeight : Math.round(rawWeight * 2.20462);

  const departureIso = data.departureTime
    ? new Date(data.departureTime).toISOString()
    : new Date().toISOString();

  const payload = {
    start: startCoords,
    end: endCoords,
    departure_time: departureIso,
    load_weight: weightInLbs,
    sampling_miles: data.samplingMiles || 25,
  };

  const response = await fetch('/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok || responseData.status === 'error') {
    const message = responseData.error || responseData.details || `Server responded with status ${response.status}`;
    throw new Error(message);
  }

  // Cross-check & enrich checkpoints with verified Open-Meteo meteorological telemetry
  if (responseData.routes && responseData.routes.length > 0) {
    responseData.routes = await enrichRoutesWithLiveWeather(responseData.routes, weightInLbs, departureIso);
  }

  return responseData as RouteApiResponse;
}

/**
 * Fallback demo simulation data in case the backend or network is offline
 */
export function getMockRoutes(data: ShipmentFormData): RouteApiResponse {
  const weight = parseFloat(data.weight) || 25000;
  const weightInLbs = data.weightUnit === 'lbs' ? weight : Math.round(weight * 2.20462);

  return {
    status: 'success',
    departure_time: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
    load_weight_lbs: weightInLbs,
    sampling_interval_miles: data.samplingMiles || 25,
    routes_count: 2,
    routes: [
      {
        route_index: 1,
        is_primary: true,
        is_recommended: true,
        distance_km: 585.13,
        distance_miles: 363.58,
        duration_mins: 352.4,
        duration_hours: 5.87,
        geometry: {
          type: 'LineString',
          coordinates: [
            [13.4050, 52.5200],
            [13.2500, 52.3500],
            [12.9800, 52.0200],
            [12.4500, 51.3400],
            [12.1500, 50.8000],
            [11.9500, 50.2500],
            [11.6000, 49.4500],
            [11.5820, 48.1351],
          ],
        },
        checkpoints: [
          {
            lat: 52.5200,
            lng: 13.4050,
            distance_from_start_miles: 0,
            eta_seconds_from_start: 0,
            eta_formatted: '2026-10-22 10:00 UTC',
            weather: {
              available: true,
              wind_mph: 12.4,
              wind_kmh: 20.0,
              rain_in_hr: 0.0,
              rain_mm_hr: 0.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 12.5,
              temp_f: 54.5,
              humidity: 78,
              weather_code: 2,
              condition: 'Partly cloudy',
            },
            risk_level: 'Low',
          },
          {
            lat: 52.0200,
            lng: 12.9800,
            distance_from_start_miles: 48.5,
            eta_seconds_from_start: 3100,
            eta_formatted: '2026-10-22 10:51 UTC',
            weather: {
              available: true,
              wind_mph: 18.2,
              wind_kmh: 29.3,
              rain_in_hr: 0.04,
              rain_mm_hr: 1.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 11.2,
              temp_f: 52.2,
              humidity: 84,
              weather_code: 61,
              condition: 'Slight rain',
            },
            risk_level: 'Low',
          },
          {
            lat: 51.3400,
            lng: 12.4500,
            distance_from_start_miles: 112.3,
            eta_seconds_from_start: 7200,
            eta_formatted: '2026-10-22 12:00 UTC',
            weather: {
              available: true,
              wind_mph: 22.0,
              wind_kmh: 35.4,
              rain_in_hr: 0.08,
              rain_mm_hr: 2.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 10.4,
              temp_f: 50.7,
              humidity: 88,
              weather_code: 63,
              condition: 'Moderate rain',
            },
            risk_level: 'Moderate',
          },
          {
            lat: 50.2500,
            lng: 11.9500,
            distance_from_start_miles: 215.7,
            eta_seconds_from_start: 13800,
            eta_formatted: '2026-10-22 13:50 UTC',
            weather: {
              available: true,
              wind_mph: 28.5,
              wind_kmh: 45.9,
              rain_in_hr: 0.15,
              rain_mm_hr: 3.8,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 8.5,
              temp_f: 47.3,
              humidity: 92,
              weather_code: 63,
              condition: 'Moderate rain',
            },
            risk_level: 'Moderate',
          },
          {
            lat: 48.1351,
            lng: 11.5820,
            distance_from_start_miles: 363.58,
            eta_seconds_from_start: 21144,
            eta_formatted: '2026-10-22 15:52 UTC',
            weather: {
              available: true,
              wind_mph: 14.1,
              wind_kmh: 22.7,
              rain_in_hr: 0.0,
              rain_mm_hr: 0.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 11.0,
              temp_f: 51.8,
              humidity: 74,
              weather_code: 1,
              condition: 'Mainly clear',
            },
            risk_level: 'Low',
          },
        ],
        risk_summary: {
          max_risk_level: 'Moderate',
          avg_risk_score: 1.4,
          severe_miles: 0.0,
          high_miles: 0.0,
        },
      },
      {
        route_index: 2,
        is_primary: false,
        is_recommended: false,
        distance_km: 612.45,
        distance_miles: 380.56,
        duration_mins: 385.1,
        duration_hours: 6.42,
        geometry: {
          type: 'LineString',
          coordinates: [
            [13.4050, 52.5200],
            [13.7383, 51.0504],
            [13.0000, 50.2000],
            [12.1000, 49.0000],
            [11.5820, 48.1351],
          ],
        },
        checkpoints: [
          {
            lat: 52.5200,
            lng: 13.4050,
            distance_from_start_miles: 0,
            eta_seconds_from_start: 0,
            eta_formatted: '2026-10-22 10:00 UTC',
            weather: {
              available: true,
              wind_mph: 12.4,
              wind_kmh: 20.0,
              rain_in_hr: 0.0,
              rain_mm_hr: 0.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 12.5,
              temp_f: 54.5,
              humidity: 78,
              weather_code: 2,
              condition: 'Partly cloudy',
            },
            risk_level: 'Low',
          },
          {
            lat: 51.0504,
            lng: 13.7383,
            distance_from_start_miles: 125.0,
            eta_seconds_from_start: 7800,
            eta_formatted: '2026-10-22 12:10 UTC',
            weather: {
              available: true,
              wind_mph: 36.2,
              wind_kmh: 58.3,
              rain_in_hr: 0.28,
              rain_mm_hr: 7.1,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 9.8,
              temp_f: 49.6,
              humidity: 94,
              weather_code: 81,
              condition: 'Moderate rain showers',
            },
            risk_level: 'High',
          },
          {
            lat: 48.1351,
            lng: 11.5820,
            distance_from_start_miles: 380.56,
            eta_seconds_from_start: 23106,
            eta_formatted: '2026-10-22 16:25 UTC',
            weather: {
              available: true,
              wind_mph: 15.0,
              wind_kmh: 24.1,
              rain_in_hr: 0.0,
              rain_mm_hr: 0.0,
              snow_in_hr: 0.0,
              snow_cm_hr: 0.0,
              temp_c: 11.0,
              temp_f: 51.8,
              humidity: 74,
              weather_code: 1,
              condition: 'Mainly clear',
            },
            risk_level: 'Low',
          },
        ],
        risk_summary: {
          max_risk_level: 'High',
          avg_risk_score: 2.1,
          severe_miles: 0.0,
          high_miles: 25.0,
        },
      },
    ],
  };
}
