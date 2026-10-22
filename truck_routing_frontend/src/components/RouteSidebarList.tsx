import React from 'react';
import type { RouteItem, RiskLevel } from '../types/route';
import { 
  Sparkles, 
  Route as RouteIcon, 
  Clock, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Zap
} from 'lucide-react';
import './RouteSidebarList.css';

interface RouteSidebarListProps {
  routes: RouteItem[];
  selectedRouteIndex: number;
  onSelectRoute: (routeIndex: number) => void;
  loading?: boolean;
  onQuickPreset?: (origin: string, destination: string, weight: string) => void;
}

const getRiskMeta = (risk: RiskLevel) => {
  switch (risk) {
    case 'Low':
      return { label: 'Low Risk', className: 'risk-low', color: '#10b981' };
    case 'Moderate':
      return { label: 'Moderate Risk', className: 'risk-moderate', color: '#f59e0b' };
    case 'High':
      return { label: 'High Risk', className: 'risk-high', color: '#ea580c' };
    case 'Severe':
    case 'No Travel':
      return { label: 'Severe Risk', className: 'risk-severe', color: '#dc2626' };
    default:
      return { label: 'Unknown', className: 'risk-unknown', color: '#64748b' };
  }
};

export const RouteSidebarList: React.FC<RouteSidebarListProps> = ({
  routes,
  selectedRouteIndex,
  onSelectRoute,
  loading = false,
  onQuickPreset,
}) => {
  // Preset scenarios for instant testing
  const presets = [
    { origin: 'Berlin, DE', destination: 'Munich, DE', weight: '24000', label: 'Berlin ➔ Munich' },
    { origin: 'Paris, FR', destination: 'Lyon, FR', weight: '32000', label: 'Paris ➔ Lyon' },
    { origin: 'London, UK', destination: 'Manchester, UK', weight: '18000', label: 'London ➔ Manchester' },
    { origin: 'Bucharest, RO', destination: 'Cluj-Napoca, RO', weight: '22000', label: 'Bucharest ➔ Cluj' },
  ];

  // 1. Loading State
  if (loading) {
    return (
      <div className="routes-sidebar-panel">
        <div className="routes-panel-header">
          <div className="routes-header-title">
            <RouteIcon className="icon-pulse spin" size={18} />
            <span>Calculating Alternatives...</span>
          </div>
          <span className="sampling-tag">OSRM + Weather Engine</span>
        </div>
        <div className="skeleton-cards-container">
          {[1, 2].map((i) => (
            <div key={i} className="route-card-skeleton">
              <div className="skeleton-shimmer skeleton-title" />
              <div className="skeleton-shimmer skeleton-metrics" />
              <div className="skeleton-shimmer skeleton-footer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Initial State (No Routes computed yet)
  if (!routes || routes.length === 0) {
    return (
      <div className="routes-sidebar-panel initial-panel">
        <div className="routes-panel-header">
          <div className="routes-header-title">
            <RouteIcon size={18} />
            <span>Route Trajectories (2026)</span>
          </div>
          <span className="status-idle-pill">Standby</span>
        </div>

        <div className="initial-empty-card">
          <div className="empty-glow-icon">
            <Zap size={22} />
          </div>
          <h3>Multi-Path Routing Engine</h3>
          <p>
            Submit your shipment specifications above to stream multi-alternative routes, real-time Open-Meteo weather checkpoints, and gross weight hazard forecasts.
          </p>
        </div>

        {onQuickPreset && (
          <div className="quick-presets-section">
            <div className="section-label">
              <Sparkles size={14} />
              <span>Or launch a quick freight corridor:</span>
            </div>
            <div className="preset-chips">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="preset-chip-btn"
                  onClick={() => onQuickPreset(preset.origin, preset.destination, preset.weight)}
                >
                  <span>{preset.label}</span>
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Rendered Routes from Backend
  return (
    <div className="routes-sidebar-panel">
      <div className="routes-panel-header">
        <div className="routes-header-title">
          <RouteIcon size={18} />
          <span>Available Routes</span>
          <span className="routes-count-badge">{routes.length}</span>
        </div>
        <span className="sampling-tag">25 mi Checkpoints</span>
      </div>

      <div className="routes-list-scroll">
        {routes.map((route) => {
          const isSelected = route.route_index === selectedRouteIndex;
          const riskMeta = getRiskMeta(route.risk_summary.max_risk_level);
          const hours = Math.floor(route.duration_hours);
          const minutes = Math.round((route.duration_hours - hours) * 60);

          return (
            <div
              key={route.route_index}
              className={`route-card ${isSelected ? 'is-selected' : ''} ${
                route.is_recommended ? 'is-recommended' : ''
              }`}
              onClick={() => onSelectRoute(route.route_index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectRoute(route.route_index);
                }
              }}
            >
              <div className="card-top-row">
                <div className="route-identity">
                  <span className="route-num">Route {route.route_index}</span>
                  {route.is_recommended && (
                    <span className="recommended-badge">
                      <Sparkles size={11} />
                      Recommended
                    </span>
                  )}
                  {route.is_primary && !route.is_recommended && (
                    <span className="primary-badge">Primary</span>
                  )}
                </div>

                <div className={`risk-tag ${riskMeta.className}`}>
                  <span className="risk-indicator-dot" />
                  <span>{riskMeta.label}</span>
                </div>
              </div>

              <div className="card-stats-grid">
                <div className="stat-box">
                  <div className="stat-label">
                    <MapPin size={12} />
                    <span>Distance</span>
                  </div>
                  <div className="stat-val">
                    <strong>{route.distance_km}</strong>
                    <span className="unit">km</span>
                    <span className="sub-unit">({route.distance_miles} mi)</span>
                  </div>
                </div>

                <div className="stat-box">
                  <div className="stat-label">
                    <Clock size={12} />
                    <span>Est. Time</span>
                  </div>
                  <div className="stat-val">
                    <strong>{hours}h {minutes}m</strong>
                  </div>
                </div>
              </div>

              <div className="card-footer-details">
                <div className="footer-weather-info">
                  {route.risk_summary.severe_miles > 0 ? (
                    <span className="severe-alert-tag">
                      <ShieldAlert size={12} />
                      {route.risk_summary.severe_miles} mi severe
                    </span>
                  ) : (
                    <span className="safe-weather-tag">
                      <CheckCircle2 size={12} />
                      Safe transit corridor
                    </span>
                  )}
                  <span className="score-label">
                    Risk Score: <strong>{route.risk_summary.avg_risk_score}</strong>
                  </span>
                </div>

                <div className="select-action">
                  <div className={`radio-indicator ${isSelected ? 'active' : ''}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RouteSidebarList;
