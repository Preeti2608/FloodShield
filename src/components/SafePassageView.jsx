import React, { useState } from 'react';
import { Compass, Navigation, AlertTriangle, ShieldAlert, MapPin, Hospital, Info } from 'lucide-react';
import { PRESET_ROUTES } from '../data/mockData';

export default function SafePassageView() {
  const [selectedRoute, setSelectedRoute] = useState(PRESET_ROUTES[0]);
  const [originInput, setOriginInput] = useState("Downtown Terminal");
  const [destInput, setDestInput] = useState("General Hospital Emergency Gate");

  const selectPreset = (route) => {
    setSelectedRoute(route);
    const parts = route.name.split(" → ");
    setOriginInput(parts[0]);
    setDestInput(parts[1]);
  };

  return (
    <div className="safepassage-view-container animate-fade-in">
      {/* Header */}
      <div className="safepassage-header">
        <div>
          <span className="mono label-uppercase">SECTION 05</span>
          <h2 className="section-title">SAFE PASSAGE</h2>
          <span className="mono desc-sub">ELEVATION DETOUR ROUTING & CRITICAL FACILITY MAPPER</span>
        </div>

        {/* Route Presets */}
        <div className="route-presets-group">
          {PRESET_ROUTES.map(r => (
            <button
              key={r.id}
              onClick={() => selectPreset(r)}
              className={`route-preset-btn mono ${selectedRoute.id === r.id ? 'active' : ''}`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Waypoint Planner + Route Comparison */}
      <div className="safepassage-main-grid">
        {/* Left Side: Waypoint Form Controls */}
        <div className="waypoint-panel editorial-card">
          <div className="panel-header-strip">
            <Navigation size={14} color="var(--color-lime)" />
            <span className="mono header-title">WAYPOINT NAVIGATION PLANNER</span>
          </div>

          <div className="waypoint-form">
            <div className="waypoint-input-group">
              <span className="label-uppercase">START LOCATION</span>
              <div className="input-with-pin">
                <MapPin size={16} color="var(--color-lime)" />
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  className="waypoint-input"
                />
              </div>
            </div>

            <div className="waypoint-input-group">
              <span className="label-uppercase">DESTINATION / CRITICAL FACILITY</span>
              <div className="input-with-pin">
                <MapPin size={16} color="var(--color-orange)" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  className="waypoint-input"
                />
              </div>
            </div>

            {/* Quick Facilities Along Path */}
            <div className="shelters-list-block">
              <span className="label-uppercase">CRITICAL FACILITIES ALONG PATH</span>
              <div className="shelter-chips">
                {selectedRoute.safeSheltersNearby.map((s, i) => (
                  <div key={i} className="shelter-chip mono">
                    <Hospital size={12} color="var(--color-lime)" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="elevation-gain-box mono">
              <Compass size={16} color="var(--color-lime)" />
              <div>
                <strong>ELEVATION GAIN PROFILE:</strong> {selectedRoute.safeElevationGain}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Honest Route Disclaimer & Detour Card */}
        <div className="comparison-panel">
          {/* Honest Route Safety Disclaimer (Requirement 6) */}
          <div className="route-disclaimer-card editorial-card mono">
            <div className="disclaimer-top">
              <ShieldAlert size={16} color="var(--color-amber)" />
              <span>ROUTE SAFETY PROVENANCE NOTICE</span>
            </div>
            <p className="disclaimer-body">
              Hazard-aware route recommendations require real-time road inundation telemetry (`GET /roads`). Route safety cannot be verified as 100% clear until municipal road sensors are deployed by the backend team. Always exercise caution during heavy rainfall events.
            </p>
          </div>

          {/* Elevated Flyover Detour Option */}
          <div className="route-compare-card safe-card editorial-card">
            <div className="compare-card-header">
              <div className="header-left-title">
                <span className="badge badge-grey">ELEVATED TERRAIN ROUTE</span>
                <h3 className="route-card-title">ELEVATED FLYOVER DETOUR LINK</h3>
              </div>
              <div className="header-metrics mono">
                <span>{selectedRoute.safeDistanceKm} km</span> • <span>~{selectedRoute.safeTimeMin} min</span>
              </div>
            </div>

            <div className="safe-banner">
              <Info size={18} color="var(--color-lime)" />
              <div className="banner-text mono">
                <strong>TERRAIN PROFILE RECOMMENDATION:</strong> Diverts traffic via elevated ridge link (+18m elevation gain) to avoid lowland basin dips.
              </div>
            </div>

            <div className="turn-instructions">
              <span className="label-uppercase">ELEVATED DETOUR STEPS</span>
              <div className="instructions-list mono">
                <div className="step-item">
                  <span>1. Proceed East on Main Arterial Corridor (1.2 km)</span>
                </div>
                <div className="step-item highlight">
                  <span>2. DETOUR: Ascend Elevated Flyover Ramp (Bypasses lowland basin dip)</span>
                </div>
                <div className="step-item">
                  <span>3. Continue along Ridge Bypass Road to Emergency Gate (3.8 km)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .safepassage-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .safepassage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .route-presets-group {
          display: flex;
          gap: 8px;
        }

        .route-preset-btn {
          padding: 8px 12px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-ivory-muted);
          transition: all var(--transition-fast);
        }

        .route-preset-btn.active, .route-preset-btn:hover {
          border-color: var(--color-lime);
          color: var(--color-lime);
          background: rgba(199, 243, 107, 0.08);
        }

        .safepassage-main-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 580px;
        }

        .waypoint-panel {
          display: flex;
          flex-direction: column;
        }

        .waypoint-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .waypoint-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-with-pin {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 10px 14px;
          border-radius: 4px;
        }

        .waypoint-input {
          font-size: 0.88rem;
          color: var(--color-ivory);
          width: 100%;
        }

        .shelters-list-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shelter-chips {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .shelter-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-ivory);
        }

        .elevation-gain-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: rgba(199, 243, 107, 0.08);
          border: 1px solid rgba(199, 243, 107, 0.2);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-lime);
        }

        .comparison-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .route-disclaimer-card {
          padding: 14px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--color-amber);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.72rem;
        }

        .disclaimer-top {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-amber);
          font-weight: 600;
        }

        .disclaimer-body {
          color: var(--color-grey);
          line-height: 1.4;
        }

        .route-compare-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .safe-card {
          border-left: 4px solid var(--color-lime);
        }

        .compare-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .route-card-title {
          font-size: 1.4rem;
          color: var(--color-ivory);
          margin-top: 4px;
        }

        .header-metrics {
          font-size: 0.85rem;
          color: var(--color-grey);
        }

        .safe-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: rgba(199, 243, 107, 0.12);
          border: 1px solid rgba(199, 243, 107, 0.3);
          border-radius: 4px;
        }

        .banner-text {
          font-size: 0.78rem;
          color: var(--color-ivory);
        }

        .turn-instructions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .instructions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.78rem;
          color: var(--color-ivory);
        }

        .step-item.highlight {
          background: rgba(199, 243, 107, 0.08);
          border-color: rgba(199, 243, 107, 0.3);
        }

        @media (max-width: 900px) {
          .safepassage-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
