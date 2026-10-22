import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteItem, Checkpoint } from '../types/route';
import './RouteMap.css';

interface RouteMapProps {
  routes: RouteItem[];
  selectedRouteIndex: number;
  forecastHour: number;
  onSelectCheckpoint?: (checkpoint: Checkpoint) => void;
}

const getRiskColor = (risk?: string): string => {
  switch (risk) {
    case 'Low':
      return '#10b981'; // Emerald
    case 'Moderate':
      return '#f59e0b'; // Amber
    case 'High':
      return '#f97316'; // Orange
    case 'Severe':
    case 'No Travel':
      return '#ef4444'; // Rose / Red
    default:
      return '#64748b'; // Slate
  }
};

export const RouteMap: React.FC<RouteMapProps> = ({
  routes,
  selectedRouteIndex,
  forecastHour,
  onSelectCheckpoint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);
  const lastFitRouteRef = useRef<RouteItem | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: true,
      }).setView([51.1657, 10.4515], 6); // Default center in Europe

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Add clean zoom control top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update polylines and markers when routes or selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    if (!routes || routes.length === 0) return;

    const activeRoute = routes.find((r) => r.route_index === selectedRouteIndex) || routes[0];
    const activeCheckpoints = activeRoute.checkpoints.map((checkpoint) => {
      const forecast = checkpoint.forecast?.[forecastHour];
      return {
        ...checkpoint,
        weather: forecast?.weather ?? checkpoint.weather,
        risk_level: forecast?.risk_level ?? checkpoint.risk_level,
      };
    });
    const allBounds: L.LatLngBounds = L.latLngBounds([]);

    // 1. Draw inactive routes first in the background
    routes.forEach((route) => {
      if (route.route_index === activeRoute.route_index) return;

      const latLngs: [number, number][] = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      if (latLngs.length > 0) {
        const polyline = L.polyline(latLngs, {
          color: '#94a3b8',
          weight: 4,
          opacity: 0.5,
          dashArray: '6, 8',
          lineCap: 'round',
        });
        polyline.bindTooltip(`Route ${route.route_index} (Alternative: ${route.distance_km} km)`, {
          sticky: true,
          className: 'route-map-tooltip',
        });
        layers.addLayer(polyline);
      }
    });

    // 2. Draw active route polyline with primary glow
    const activeLatLngs: [number, number][] = activeRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    if (activeLatLngs.length > 0) {
      // Glow underlay
      const underlay = L.polyline(activeLatLngs, {
        color: activeRoute.is_recommended ? '#059669' : '#1d4ed8',
        weight: 8,
        opacity: 0.25,
        lineCap: 'round',
      });
      layers.addLayer(underlay);

      // Main route polyline
      const activePolyline = L.polyline(activeLatLngs, {
        color: activeRoute.is_recommended ? '#10b981' : '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      });
      layers.addLayer(activePolyline);

      activeLatLngs.forEach((coord) => allBounds.extend(coord));
    }

    const closestGeometryIndex = (checkpoint: Checkpoint): number => {
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      activeLatLngs.forEach(([lat, lng], idx) => {
        const distance = (lat - checkpoint.lat) ** 2 + (lng - checkpoint.lng) ** 2;
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = idx;
        }
      });
      return closestIndex;
    };
    activeCheckpoints.slice(0, -1).forEach((checkpoint, idx) => {
      const nextCheckpoint = activeCheckpoints[idx + 1];
      const startIndex = closestGeometryIndex(checkpoint);
      const endIndex = closestGeometryIndex(nextCheckpoint);
      const segment = activeLatLngs.slice(startIndex, endIndex + 1);
      if (segment.length < 2) return;

      layers.addLayer(L.polyline(
        segment,
        {
          color: getRiskColor(checkpoint.risk_level),
          weight: 6,
          opacity: 0.95,
          lineCap: 'round',
        }
      ));
    });

    // 3. Draw Checkpoints along active route
    if (activeCheckpoints.length > 0) {
      activeCheckpoints.forEach((cp, idx) => {
        const isStart = idx === 0;
        const isEnd = idx === activeCheckpoints.length - 1;
        const color = getRiskColor(cp.risk_level);
        const conditionText = cp.weather?.condition || (cp.weather?.rain_mm_hr && cp.weather.rain_mm_hr > 0 ? 'Rain showers' : 'Clear');
        const tempDisplay = cp.weather?.temp_c !== null && cp.weather?.temp_c !== undefined
          ? `${cp.weather.temp_c}°C (${cp.weather.temp_f}°F)`
          : '--';
        const windDisplay = cp.weather?.wind_kmh !== null && cp.weather?.wind_kmh !== undefined
          ? `${cp.weather.wind_kmh} km/h (${cp.weather.wind_mph ?? '--'} mph)`
          : `${cp.weather?.wind_mph ?? '--'} mph`;
        const rainDisplay = cp.weather?.rain_mm_hr !== null && cp.weather?.rain_mm_hr !== undefined
          ? `${cp.weather.rain_mm_hr} mm/h (${cp.weather.rain_in_hr ?? '--'} in/h)`
          : `${cp.weather?.rain_in_hr ?? '--'} in/h`;
        const checkpointTooltip = `
          <div class="weather-tooltip-card">
            <strong>${isStart ? 'Origin' : isEnd ? 'Destination' : `Checkpoint #${idx + 1}`} · Mile ${cp.distance_from_start_miles}</strong>
            <span>${conditionText} · ${tempDisplay}</span>
            <span>💨 Wind: ${windDisplay}</span>
            <span>🌧 Precip: ${rainDisplay}${cp.weather?.snow_cm_hr ? ` · ❄ Snow: ${cp.weather.snow_cm_hr} cm/h` : ''}</span>
            <span>Risk: ${cp.risk_level || 'Unknown'} · Forecast +${forecastHour} h</span>
          </div>
        `;

        if (isStart || isEnd) {
          // Special start / end icons
          const pinHtml = `
            <div class="map-terminal-pin ${isStart ? 'start-pin' : 'end-pin'}">
              <span class="pin-ring"></span>
              <span class="pin-core">${isStart ? 'A' : 'B'}</span>
            </div>
          `;
          const customIcon = L.divIcon({
            html: pinHtml,
            className: 'terminal-div-icon',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const marker = L.marker([cp.lat, cp.lng], { icon: customIcon });
          marker.bindPopup(`
            <div class="marker-popup-card">
                <h4>${isStart ? 'Origin Departure' : 'Destination'}</h4>
                <p><strong>Forecast:</strong> +${forecastHour} h</p>
              <p><strong>Risk Level:</strong> <span class="badge-${(cp.risk_level || 'Low').toLowerCase().replace(' ', '-')}">${cp.risk_level || 'Low'}</span></p>
            </div>
          `);
          marker.bindTooltip(checkpointTooltip, {
            direction: 'top',
            offset: [0, -12],
            sticky: true,
            opacity: 0.98,
            className: 'weather-checkpoint-tooltip',
          });
          layers.addLayer(marker);
        } else {
          const heatHalo = L.circleMarker([cp.lat, cp.lng], {
              radius: 17,
              fillColor: color,
              fillOpacity: 0.22,
              color,
              opacity: 0.15,
              weight: 1,
              interactive: false,
          });
          layers.addLayer(heatHalo);

          const circle = L.circleMarker([cp.lat, cp.lng], {
            radius: 6,
            fillColor: color,
            fillOpacity: 0.95,
            color: '#ffffff',
            weight: 2,
          });

          circle.bindPopup(`
            <div class="marker-popup-card">
              <div class="popup-header">
                <strong>Checkpoint #${idx + 1}</strong>
                <span class="badge-risk badge-${(cp.risk_level || 'Low').toLowerCase().replace(' ', '-')}">${cp.risk_level || 'Low'}</span>
              </div>
              <p class="popup-sub">Mile ${cp.distance_from_start_miles} • Forecast +${forecastHour} h</p>
              <div class="popup-condition-row">
                <span class="condition-badge">🌤️ ${conditionText}</span>
                <span class="temp-badge">${tempDisplay}</span>
              </div>
              <div class="popup-weather">
                <span class="weather-item">💨 <strong>Wind:</strong> ${windDisplay}</span>
                <span class="weather-item">🌧️ <strong>Precip:</strong> ${rainDisplay}</span>
                ${cp.weather?.snow_cm_hr && cp.weather.snow_cm_hr > 0 ? `<span class="weather-item">❄️ <strong>Snow:</strong> ${cp.weather.snow_cm_hr} cm/h</span>` : ''}
                ${cp.weather?.humidity ? `<span class="weather-item">💧 <strong>Humidity:</strong> ${cp.weather.humidity}%</span>` : ''}
              </div>
              <div class="popup-coords-footer">
                <span>GPS: ${cp.lat.toFixed(4)}, ${cp.lng.toFixed(4)}</span>
                <span class="source-tag">Open-Meteo Synced</span>
              </div>
            </div>
          `);
          circle.bindTooltip(checkpointTooltip, {
            direction: 'top',
            sticky: true,
            opacity: 0.98,
            className: 'weather-checkpoint-tooltip',
          });

          circle.on('click', () => {
            if (onSelectCheckpoint) onSelectCheckpoint(cp);
          });

          layers.addLayer(circle);
        }
      });
    }

    // Zoom and pan to fit bounds nicely
    if (allBounds.isValid() && lastFitRouteRef.current !== activeRoute) {
      map.fitBounds(allBounds, { padding: [50, 50], maxZoom: 12 });
      lastFitRouteRef.current = activeRoute;
    }

    // Delayed resize trigger for smooth layout transition
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timeout);
  }, [routes, selectedRouteIndex, forecastHour, onSelectCheckpoint]);

  return (
    <div className="route-map-wrapper">
      <div className="route-map-inner" ref={mapContainerRef} />
      <div className="map-glass-badge">
        <span className="live-dot" />
        <span>Weather risk at +{forecastHour} h</span>
      </div>
    </div>
  );
};
export default RouteMap;
