import { useState } from 'react';
import type { RouteItem, Checkpoint } from '../types/route';
import RouteMap from './RouteMap';
import {
  Sparkles,
  Clock,
  Compass,
  AlertTriangle,
  Weight,
  Wind,
  CloudRain,
  Snowflake,
  ShieldCheck,
  Check,
  Download,
  Copy,
  ChevronRight,
  Info,
  Thermometer,
  Droplets,
  Sun,
  Cloud,
  CloudSun
} from 'lucide-react';
import './RouteDisplay.css';

const getWeatherIcon = (weatherCode?: number | null, condition?: string) => {
  if (weatherCode !== null && weatherCode !== undefined) {
    if (weatherCode === 0) return <Sun size={13} color="#f59e0b" />;
    if (weatherCode <= 2) return <CloudSun size={13} color="#f59e0b" />;
    if (weatherCode === 3 || weatherCode === 45 || weatherCode === 48) return <Cloud size={13} color="#64748b" />;
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 82)) return <CloudRain size={13} color="#2563eb" />;
    if ((weatherCode >= 71 && weatherCode <= 77) || (weatherCode >= 85 && weatherCode <= 86)) return <Snowflake size={13} color="#06b6d4" />;
  }
  if (condition?.toLowerCase().includes('rain')) return <CloudRain size={13} color="#2563eb" />;
  if (condition?.toLowerCase().includes('snow')) return <Snowflake size={13} color="#06b6d4" />;
  return <CloudSun size={13} color="#f59e0b" />;
};

interface RouteDisplayProps {
  routes: RouteItem[];
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  loading: boolean;
  error: string | null;
  origin?: string;
  destination?: string;
  loadWeightLbs?: number;
  departureTime?: string;
  onLoadDemo?: () => void;
}

export const RouteDisplay: React.FC<RouteDisplayProps> = ({
  routes,
  selectedRouteIndex,
  onSelectRoute,
  loading,
  error,
  origin,
  destination,
  loadWeightLbs,
  departureTime,
  onLoadDemo,
}) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [filterSevereOnly, setFilterSevereOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active route
  const activeRoute = routes.find((r) => r.route_index === selectedRouteIndex) || routes[0];

  const handleCopySummary = () => {
    if (!activeRoute) return;
    const text = `Truck Route #${activeRoute.route_index}: ${origin || 'Origin'} -> ${destination || 'Destination'} | Distance: ${activeRoute.distance_km} km (${activeRoute.distance_miles} mi) | Duration: ${activeRoute.duration_hours} hrs | Risk Level: ${activeRoute.risk_summary.max_risk_level}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!activeRoute) return;
    const blob = new Blob([JSON.stringify(activeRoute, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-${activeRoute.route_index}-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. Error State
  if (error) {
    return (
      <div className="display-panel-wrapper">
        <div className="error-alert-banner">
          <div className="error-icon-box">
            <AlertTriangle size={24} />
          </div>
          <div className="error-details">
            <h3>Routing Calculation Error</h3>
            <p>{error}</p>
            <div className="error-actions">
              {onLoadDemo && (
                <button type="button" className="demo-btn" onClick={onLoadDemo}>
                  <Sparkles size={14} />
                  Simulate Live Route Demo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="display-panel-wrapper">
        <div className="loading-hud-card">
          <div className="radar-spinner">
            <div className="radar-sweep" />
            <div className="radar-core" />
          </div>
          <h2>Synthesizing Optimal Trajectories</h2>
          <p className="loading-subtext">
            Consulting OSRM road infrastructure & querying Open-Meteo multi-checkpoint weather telemetry...
          </p>
          <div className="loading-steps">
            <div className="loading-step active">
              <span className="step-dot" />
              <span>Waypoints Resolution</span>
            </div>
            <div className="loading-step active">
              <span className="step-dot" />
              <span>OSRM Multi-Trajectory Computation</span>
            </div>
            <div className="loading-step active">
              <span className="step-dot" />
              <span>Hourly Weather Sampling</span>
            </div>
            <div className="loading-step active">
              <span className="step-dot" />
              <span>Gross Payload Crosswind Safety Analysis</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Initial Empty / Welcome State
  if (!routes || routes.length === 0) {
    return (
      <div className="display-panel-wrapper">
        <div className="welcome-command-center">
          <div className="welcome-header">
            <div className="status-live-chip">
              <span className="ping-dot" />
              <span>&copy; 2026 - PN</span>
            </div>
            <h1>Weather-Aware Truck Routing</h1>
            <p className="welcome-lead">
              Precision transit planning powered by OpenStreetMap routing protocols and real-time checkpoint meteorological forecasting.
            </p>
          </div>

          <div className="features-showcase-grid">
            <div className="feature-card">
              <div className="feature-icon-bubble blue">
                <Compass size={22} />
              </div>
              <h3>Multi-Path Alternatives</h3>
              <p>Generates up to 3 viable transit geometries via OSRM to balance travel duration against highway elevation and traffic choke points.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-bubble green">
                <Wind size={22} />
              </div>
              <h3>Micro-Weather Checkpoints</h3>
              <p>Monitors wind velocity, precipitation, and snowfall forecasts at precise 10, 25, or 50 mile intervals synchronized with your vehicle ETA.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon-bubble purple">
                <Weight size={22} />
              </div>
              <h3>Payload Dynamic Risk</h3>
              <p>Calibrates vehicle rollover and emergency braking thresholds against heavy gross weights (&gt;30k and &gt;40k lbs) in severe gusts.</p>
            </div>
          </div>

          <div className="welcome-footer-cta">
            <div className="cta-tip">
              <Info size={16} />
              <span>Configure your cargo details on the left sidebar to generate live routing analytics.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Active Routes Rendered View
  const hours = Math.floor(activeRoute.duration_hours);
  const minutes = Math.round((activeRoute.duration_hours - hours) * 60);
  const checkpointsToDisplay = filterSevereOnly
    ? activeRoute.checkpoints.filter((cp) => cp.risk_level && cp.risk_level !== 'Low')
    : activeRoute.checkpoints;

  return (
    <div className="display-panel-wrapper">
      {/* Top Corridor Bar */}
      <div className="corridor-top-bar">
        <div className="corridor-meta">
          <div className="corridor-title-group">
            <span className="corridor-point">{origin || 'Start'}</span>
            <span className="corridor-arrow">➔</span>
            <span className="corridor-point">{destination || 'End'}</span>
          </div>
          <div className="corridor-submeta">
            <span>Departure: {departureTime || 'Immediate'}</span>
            <span>•</span>
            <span>Cargo: {loadWeightLbs ? `${loadWeightLbs.toLocaleString()} lbs` : 'Standard'}</span>
            <span>•</span>
            <span className="routes-avail-tag">{routes.length} Trajectories Available</span>
          </div>
        </div>
      </div>

      {/* Routes Cards Deck - The Routes given from the backend rendered prominently on the right */}
      <div className="routes-deck-container">
        <div className="section-title-row">
          <div className="title-with-pill">
            <h3>Calculated Route Trajectories</h3>
            <span className="deck-count-pill">{routes.length} Options</span>
          </div>
          <span className="deck-subtext">Click any route option to project on map and inspect checkpoints</span>
        </div>

        <div className="routes-cards-grid">
          {routes.map((route) => {
            const isSelected = route.route_index === activeRoute.route_index;
            const rHours = Math.floor(route.duration_hours);
            const rMinutes = Math.round((route.duration_hours - rHours) * 60);
            const riskClass = `risk-${route.risk_summary.max_risk_level.toLowerCase().replace(' ', '-')}`;

            return (
              <div
                key={route.route_index}
                className={`route-deck-card ${isSelected ? 'active-deck-card' : ''} ${
                  route.is_recommended ? 'recommended-deck-card' : ''
                }`}
                onClick={() => onSelectRoute(route.route_index)}
                role="button"
                tabIndex={0}
              >
                <div className="card-badge-row">
                  <div className="route-title-cluster">
                    <span className="deck-route-name">Route #{route.route_index}</span>
                    {route.is_recommended && (
                      <span className="deck-badge-rec">
                        <Sparkles size={11} /> Recommended
                      </span>
                    )}
                    {route.is_primary && !route.is_recommended && (
                      <span className="deck-badge-prim">Primary</span>
                    )}
                  </div>
                  <span className={`deck-risk-tag ${riskClass}`}>
                    <span className="risk-indicator-dot" />
                    {route.risk_summary.max_risk_level} Risk
                  </span>
                </div>

                <div className="deck-metrics-row">
                  <div className="deck-metric">
                    <span className="d-label">Distance</span>
                    <span className="d-val">
                      <strong>{route.distance_km}</strong> km <small>({route.distance_miles} mi)</small>
                    </span>
                  </div>
                  <div className="deck-metric">
                    <span className="d-label">Est. Duration</span>
                    <span className="d-val">
                      <strong>{rHours}h {rMinutes}m</strong>
                    </span>
                  </div>
                </div>

                <div className="deck-footer-row">
                  <span className="deck-checkpoints-info">
                    {route.checkpoints.length} weather checkpoints
                  </span>
                  <span className={`deck-status-txt ${isSelected ? 'selected' : ''}`}>
                    {isSelected ? '● Active Route' : 'Select Route →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Distance</span>
            <div className="kpi-icon-box blue">
              <Compass size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{activeRoute.distance_km}</span>
            <span className="kpi-unit">km</span>
          </div>
          <span className="kpi-sub-text">{activeRoute.distance_miles} miles continuous highway</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Estimated Transit Time</span>
            <div className="kpi-icon-box indigo">
              <Clock size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">{hours}h {minutes}m</span>
          </div>
          <span className="kpi-sub-text">Average speed ~{Math.round(activeRoute.distance_km / activeRoute.duration_hours)} km/h</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Weather Hazard Profile</span>
            <div className={`kpi-icon-box ${activeRoute.risk_summary.max_risk_level === 'Low' ? 'green' : 'amber'}`}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className={`kpi-main-val risk-text-${activeRoute.risk_summary.max_risk_level.toLowerCase().replace(' ', '-')}`}>
              {activeRoute.risk_summary.max_risk_level}
            </span>
          </div>
          <span className="kpi-sub-text">
            {activeRoute.risk_summary.severe_miles > 0
              ? `⚠️ ${activeRoute.risk_summary.severe_miles} mi severe weather zones`
              : 'Zero severe hazard segments'}
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Payload Capacity Status</span>
            <div className="kpi-icon-box purple">
              <Weight size={16} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-main-val">
              {loadWeightLbs ? (loadWeightLbs / 1000).toFixed(1) : '25.0'}k
            </span>
            <span className="kpi-unit">lbs</span>
          </div>
          <span className="kpi-sub-text">
            {loadWeightLbs && loadWeightLbs > 40000
              ? 'Heavy class: &gt;35 mph wind warning'
              : 'Standard stability threshold'}
          </span>
        </div>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="map-section-container">
        <div className="section-title-row">
          <div>
            <h3>Geospatial Route Telemetry</h3>
            <p>Interactive vector path displaying sampled weather checkpoints every 25 miles.</p>
          </div>
          <div className="map-legend">
            <span className="legend-item"><span className="legend-dot dot-low" /> Low Risk</span>
            <span className="legend-item"><span className="legend-dot dot-moderate" /> Moderate</span>
            <span className="legend-item"><span className="legend-dot dot-severe" /> Severe / Storm</span>
          </div>
        </div>

        <RouteMap
          routes={routes}
          selectedRouteIndex={activeRoute.route_index}
          onSelectCheckpoint={(cp) => setSelectedCheckpoint(cp)}
        />
      </div>

      {/* Checkpoints Weather Journey Timeline */}
      <div className="checkpoints-section-container">
        <div className="section-title-row">
          <div>
            <div className="timeline-title-row">
              <h3>Weather Checkpoint Timeline</h3>
              <span className="live-weather-sync-badge">
                <span className="sync-pulse-dot" />
                Open-Meteo Verified per Checkpoint ETA
              </span>
            </div>
            <p>Localized atmospheric conditions retrieved for vehicle arrival time along the corridor.</p>
          </div>
          <div className="timeline-filter">
            <button
              type="button"
              className={`filter-toggle-btn ${!filterSevereOnly ? 'active' : ''}`}
              onClick={() => setFilterSevereOnly(false)}
            >
              All Checkpoints ({activeRoute.checkpoints.length})
            </button>
            <button
              type="button"
              className={`filter-toggle-btn ${filterSevereOnly ? 'active' : ''}`}
              onClick={() => setFilterSevereOnly(true)}
            >
              Hazard Alerts Only
            </button>
          </div>
        </div>

        <div className="checkpoints-horizontal-scroll">
          {checkpointsToDisplay.map((cp, idx) => {
            const isSelected = selectedCheckpoint === cp;
            const windKmh = cp.weather?.wind_kmh ?? Math.round((cp.weather?.wind_mph || 0) * 1.6);
            const rainMm = cp.weather?.rain_mm_hr ?? Math.round((cp.weather?.rain_in_hr || 0) * 25.4 * 10) / 10;
            const condition = cp.weather?.condition || (rainMm > 0 ? 'Rain showers' : 'Clear sky');

            return (
              <div
                key={idx}
                className={`checkpoint-step-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedCheckpoint(cp)}
              >
                <div className="cp-header">
                  <span className="cp-badge">Mile {cp.distance_from_start_miles}</span>
                  <span className={`cp-risk-badge risk-${(cp.risk_level || 'Low').toLowerCase().replace(' ', '-')}`}>
                    {cp.risk_level || 'Low'}
                  </span>
                </div>

                <div className="cp-time">
                  <Clock size={12} />
                  <span>{cp.eta_formatted ? cp.eta_formatted.split(' ')[1] + ' UTC' : 'T+0'}</span>
                </div>

                <div className="cp-condition-strip">
                  <div className="cp-condition-label">
                    {getWeatherIcon(cp.weather?.weather_code, condition)}
                    <span>{condition}</span>
                  </div>
                  {cp.weather?.temp_c !== null && cp.weather?.temp_c !== undefined && (
                    <span className="cp-temp-chip">
                      <Thermometer size={10} />
                      {cp.weather.temp_c}°C
                    </span>
                  )}
                </div>

                <div className="cp-weather-grid">
                  <div className="weather-metric" title="Wind speed">
                    <Wind size={12} className="weather-icon" />
                    <span><strong>{windKmh}</strong> km/h <small>({cp.weather?.wind_mph ?? 0} mph)</small></span>
                  </div>
                  <div className="weather-metric" title="Precipitation">
                    <CloudRain size={12} className="weather-icon" />
                    <span><strong>{rainMm}</strong> mm/h <small>({cp.weather?.rain_in_hr ?? 0} in/h)</small></span>
                  </div>
                  {cp.weather?.humidity ? (
                    <div className="weather-metric" title="Relative humidity">
                      <Droplets size={12} className="weather-icon" />
                      <span>{cp.weather.humidity}% humidity</span>
                    </div>
                  ) : null}
                  {cp.weather?.snow_cm_hr && cp.weather.snow_cm_hr > 0 ? (
                    <div className="weather-metric snow" title="Snowfall">
                      <Snowflake size={12} className="weather-icon" />
                      <span>{cp.weather.snow_cm_hr} cm/h</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternative Routes Comparison Matrix */}
      <div className="comparison-section-container">
        <div className="section-title-row">
          <div>
            <h3>Trajectory Comparison Matrix</h3>
            <p>Evaluate route efficiency, mileage delta, and atmospheric risk across alternatives.</p>
          </div>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Trajectory</th>
                <th>Status</th>
                <th>Distance</th>
                <th>Travel Time</th>
                <th>Peak Risk Level</th>
                <th>Severe Weather Miles</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => {
                const isCurrent = route.route_index === activeRoute.route_index;
                return (
                  <tr key={route.route_index} className={isCurrent ? 'active-row' : ''}>
                    <td>
                      <div className="route-td-name">
                        <strong>Route {route.route_index}</strong>
                        {route.is_recommended && (
                          <span className="badge-rec">Recommended</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {isCurrent ? (
                        <span className="active-badge">Active</span>
                      ) : (
                        <span className="alt-badge">Alternative</span>
                      )}
                    </td>
                    <td>
                      <strong>{route.distance_km} km</strong>
                      <span className="td-sub">({route.distance_miles} mi)</span>
                    </td>
                    <td>{route.duration_hours} hrs</td>
                    <td>
                      <span className={`table-risk-pill risk-${route.risk_summary.max_risk_level.toLowerCase().replace(' ', '-')}`}>
                        {route.risk_summary.max_risk_level}
                      </span>
                    </td>
                    <td>
                      {route.risk_summary.severe_miles > 0 ? (
                        <span className="severe-alert-txt">{route.risk_summary.severe_miles} miles</span>
                      ) : (
                        <span className="clean-txt">0.0 miles</span>
                      )}
                    </td>
                    <td>
                      {isCurrent ? (
                        <span className="selected-btn-txt">Viewing</span>
                      ) : (
                        <button
                          type="button"
                          className="table-switch-btn"
                          onClick={() => onSelectRoute(route.route_index)}
                        >
                          Select Route
                          <ChevronRight size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RouteDisplay;
