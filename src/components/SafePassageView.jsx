import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Compass, 
  Navigation, 
  AlertTriangle, 
  ShieldAlert, 
  MapPin, 
  Hospital, 
  Info, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { PRESET_ROUTES } from '../data/mockData';
import { getReports, getOfficialWarnings, formatAlertDateTime } from '../api/apiClient';
import { getIncidentProvenanceLabel } from '../utils/provenance';
import {
  evaluateRouteCorridor,
  compareRouteOptions,
  formatDistanceDisplay,
  formatCorridorProximity
} from '../utils/routeAssessment';

// Helper component to auto-fit map view to active route waypoints
function MapRouteController({ waypoints }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      try {
        const bounds = L.latLngBounds(waypoints);
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch {
        map.setView(waypoints[0], 13);
      }
    }
  }, [waypoints, map]);
  return null;
}

// Custom Leaflet Icons for Safe Passage Routing
const createRoutePin = (type, label = '') => {
  let bg = '#C7F36B';
  let border = '#090A0A';
  let color = '#090A0A';
  let size = 26;

  if (type === 'origin') {
    bg = '#C7F36B';
    color = '#090A0A';
    size = 28;
  } else if (type === 'destination') {
    bg = '#FF5252';
    color = '#FFFFFF';
    size = 28;
  } else if (type === 'facility') {
    bg = '#29B6F6';
    color = '#090A0A';
    size = 22;
  } else if (type === 'hazard_closure') {
    bg = '#FF5252'; // Red for confirmed road closures
    color = '#FFFFFF';
    size = 26;
  } else if (type === 'hazard_verified') {
    bg = '#E5A93C'; // Amber for verified flood hazard
    color = '#090A0A';
    size = 24;
  } else if (type === 'hazard_reported') {
    bg = '#FF6438'; // Orange for citizen reported incidents
    color = '#FFFFFF';
    size = 22;
  } else if (type === 'official_area') {
    bg = '#00E5FF'; // Cyan for official regional disaster advisory
    color = '#090A0A';
    size = 24;
  }

  return L.divIcon({
    className: 'custom-passage-pin',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${bg};
      color: ${color};
      border: 2px solid ${border};
      box-shadow: 0 0 14px ${bg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      font-family: monospace;
    ">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
};

export default function SafePassageView() {
  const [selectedRoute, setSelectedRoute] = useState(PRESET_ROUTES[0]);
  const [originInput, setOriginInput] = useState(PRESET_ROUTES[0].origin?.name || "Downtown Terminal (BKC)");
  const [destInput, setDestInput] = useState(PRESET_ROUTES[0].destination?.name || "General Hospital Emergency Gate");
  const [routeMode, setRouteMode] = useState('ELEVATED'); // 'LOWLAND' | 'ELEVATED'
  
  // Real Reports from AWS DynamoDB / LocalStorage & Official NDMA Warnings
  const [reports, setReports] = useState([]);
  const [officialWarnings, setOfficialWarnings] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastIncidentsFetch, setLastIncidentsFetch] = useState(null);
  const [lastWarningsFetch, setLastWarningsFetch] = useState(null);
  const [incidentsFetchError, setIncidentsFetchError] = useState(null);
  const [warningsFetchError, setWarningsFetchError] = useState(null);

  // Active highlighted item for inspection
  const [activeHazardInspect, setActiveHazardInspect] = useState(null);

  // Guards to prevent duplicate polling requests
  const isRefreshingRef = useRef(false);

  // Dynamic Telemetry Fetch Function
  const fetchTelemetry = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);

    try {
      const [repRes, warnRes] = await Promise.allSettled([
        getReports(),
        getOfficialWarnings({ filterFloodOnly: false })
      ]);

      // 1. Process Incident Reports
      if (repRes.status === 'fulfilled' && repRes.value) {
        setReports(repRes.value.reports || []);
        setLastIncidentsFetch(new Date().toISOString());
        setIncidentsFetchError(null);
      } else {
        setIncidentsFetchError('Cloud incident query failed. Retaining local cache.');
      }

      // 2. Process Official Warnings
      if (warnRes.status === 'fulfilled' && warnRes.value) {
        const wVal = warnRes.value;
        setOfficialWarnings(wVal.warnings || wVal.allAlerts || []);
        if (wVal.lastSuccessfulFetch) {
          setLastWarningsFetch(wVal.lastSuccessfulFetch);
        } else if (wVal.connected) {
          setLastWarningsFetch(new Date().toISOString());
        }
        setWarningsFetchError(wVal.connected ? null : (wVal.isCorsBlocked ? 'CORS restricted; access via NDMA portal' : wVal.error || 'Stream offline'));
      } else {
        setWarningsFetchError('Unable to connect to NDMA SACHET feed.');
      }
    } catch {
      setIncidentsFetchError('Network error during telemetry update.');
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, []);

  // Fetch on mount and setup clean 60-second polling interval
  useEffect(() => {
    fetchTelemetry();
    const intervalId = setInterval(() => {
      fetchTelemetry();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [fetchTelemetry]);

  const selectPreset = (route) => {
    setSelectedRoute(route);
    setOriginInput(route.origin?.name || route.name.split(" → ")[0]);
    setDestInput(route.destination?.name || route.name.split(" → ")[1]);
    setActiveHazardInspect(null);
  };

  // Active waypoints based on selected mode
  const activeWaypoints = routeMode === 'ELEVATED'
    ? (selectedRoute.elevatedWaypoints || [])
    : (selectedRoute.lowlandWaypoints || []);

  const originCoords = selectedRoute.origin ? [selectedRoute.origin.lat, selectedRoute.origin.lng] : activeWaypoints[0];
  const destCoords = selectedRoute.destination ? [selectedRoute.destination.lat, selectedRoute.destination.lng] : activeWaypoints[activeWaypoints.length - 1];

  // Evaluate BOTH corridors dynamically against current telemetry
  const lowlandAssessment = evaluateRouteCorridor(selectedRoute.lowlandWaypoints || [], reports, officialWarnings);
  const elevatedAssessment = evaluateRouteCorridor(selectedRoute.elevatedWaypoints || [], reports, officialWarnings);

  // Compare routes and determine recommendation with transparent rationale
  const recommendation = compareRouteOptions(lowlandAssessment, elevatedAssessment, selectedRoute);

  // Currently active assessment
  const activeAssessment = routeMode === 'ELEVATED' ? elevatedAssessment : lowlandAssessment;
  const corridorHazards = activeAssessment.corridorHazards;
  const verifiedClosures = activeAssessment.verifiedClosures;
  const verifiedHazards = activeAssessment.verifiedHazards;
  const reportedIncidents = activeAssessment.reportedIncidents;
  const officialAreaAlerts = activeAssessment.officialAreaAlerts;
  const nearestHazard = activeAssessment.nearestHazard;

  // Active route distance and estimated travel time
  const activeDistanceKm = routeMode === 'ELEVATED'
    ? (selectedRoute.safeDistanceKm || 6.2)
    : (selectedRoute.lowlandDistanceKm || (selectedRoute.id === 'route-2' ? 9.1 : 5.4));

  const activeTimeMin = routeMode === 'ELEVATED'
    ? (selectedRoute.safeTimeMin || 16)
    : (selectedRoute.lowlandTimeMin || (selectedRoute.id === 'route-2' ? 19 : 14));

  return (
    <div className="safepassage-view-container animate-fade-in">
      {/* Header */}
      <div className="safepassage-header">
        <div>
          <div className="header-badge-row">
            <span className="mono label-uppercase">SECTION 05</span>
            <span className={`badge ${recommendation.badgeClass} mono`}>
              {recommendation.badgeLabel}
            </span>
          </div>
          <h2 className="section-title">SAFE PASSAGE</h2>
          <span className="mono desc-sub">ELEVATION DETOUR ROUTING & HYPERLOCAL HAZARD AVOIDANCE</span>
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

      {/* Dynamic Hazard Warning Banner */}
      {corridorHazards.length > 0 ? (
        <div className="corridor-warning-banner mono animate-fade-in">
          <div className="banner-alert-content">
            <AlertTriangle size={18} color="var(--color-orange)" />
            <div>
              <strong>HAZARD WARNING ALONG {routeMode} CORRIDOR:</strong> Route passes within <strong>{formatDistanceDisplay(nearestHazard.distanceKm)}</strong> of reported incident <em>"{nearestHazard.title}"</em> ({nearestHazard.waterDepthCm != null ? `${nearestHazard.waterDepthCm} cm depth` : nearestHazard.severity} · {nearestHazard.classification.label}).
            </div>
          </div>
          {routeMode === 'LOWLAND' ? (
            <button 
              onClick={() => setRouteMode('ELEVATED')} 
              className="switch-detour-btn"
            >
              <Compass size={14} />
              <span>SWITCH TO ELEVATED FLYOVER DETOUR</span>
            </button>
          ) : (
            <div className="detour-active-tag">
              <CheckCircle2 size={14} color="var(--color-lime)" />
              <span>ELEVATED DETOUR LINK ACTIVE ({selectedRoute.safeElevationGain})</span>
            </div>
          )}
        </div>
      ) : (
        <div className="corridor-clear-banner mono">
          <CheckCircle2 size={16} color="var(--color-lime)" />
          <span>NO REPORTED INCIDENTS WITHIN 1.5 KM OF THIS {routeMode} CORRIDOR. UNMONITORED ROAD SECTIONS HAVE UNKNOWN CONDITIONS.</span>
        </div>
      )}

      {/* Main 3-Column Layout: Controls & Refresh | Interactive Map | Profile & Route Details */}
      <div className="safepassage-main-grid">
        {/* Left Side: Waypoint Form Controls, Refresh Bar & Road Condition Classification */}
        <div className="waypoint-panel editorial-card">
          <div className="panel-header-strip">
            <Navigation size={14} color="var(--color-lime)" />
            <span className="mono header-title">CORRIDOR PLANNER & CONDITIONS</span>
          </div>

          <div className="waypoint-form">
            {/* Live Telemetry Refresh & Status Bar */}
            <div className="telemetry-refresh-strip mono">
              <div className="telemetry-meta-row">
                <div className="telemetry-meta-item">
                  <span className="tel-label">INCIDENTS:</span>
                  <span className="tel-val">
                    {lastIncidentsFetch ? formatAlertDateTime(lastIncidentsFetch) : (isRefreshing ? 'Fetching...' : 'Loaded')}
                  </span>
                  {incidentsFetchError && (
                    <span className="stale-cache-badge" title={incidentsFetchError}>STALE CACHE</span>
                  )}
                </div>
                <div className="telemetry-meta-item">
                  <span className="tel-label">GOVT STREAM:</span>
                  <span className="tel-val">
                    {lastWarningsFetch ? formatAlertDateTime(lastWarningsFetch) : (isRefreshing ? 'Checking...' : 'Disconnected')}
                  </span>
                  {warningsFetchError && (
                    <span className="stale-cache-badge" title={warningsFetchError}>OFFLINE</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchTelemetry(true)}
                disabled={isRefreshing}
                className="telemetry-refresh-btn mono"
                title="Refresh incident reports and official warnings"
              >
                <RefreshCw size={11} className={isRefreshing ? 'spin-icon' : ''} />
                <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH HAZARDS'}</span>
              </button>
            </div>

            {/* Origin & Destination Inputs */}
            <div className="waypoint-input-group">
              <span className="label-uppercase">START LOCATION</span>
              <div className="input-with-pin">
                <MapPin size={16} color="var(--color-lime)" />
                <input
                  type="text"
                  value={originInput}
                  onChange={(e) => setOriginInput(e.target.value)}
                  className="waypoint-input mono"
                />
              </div>
            </div>

            <div className="waypoint-input-group">
              <span className="label-uppercase">DESTINATION / CRITICAL FACILITY</span>
              <div className="input-with-pin">
                <MapPin size={16} color="var(--color-red)" />
                <input
                  type="text"
                  value={destInput}
                  onChange={(e) => setDestInput(e.target.value)}
                  className="waypoint-input mono"
                />
              </div>
            </div>

            {/* Corridor Mode Selector */}
            <div className="route-mode-selector-block">
              <div className="mode-selector-header">
                <span className="label-uppercase">SELECT ROUTE CORRIDOR</span>
                <span className="mode-hint mono">Click buttons or map lines</span>
              </div>
              <div className="mode-btn-row">
                <button
                  onClick={() => setRouteMode('LOWLAND')}
                  className={`mode-btn mono ${routeMode === 'LOWLAND' ? 'active-lowland' : ''}`}
                >
                  <div className="btn-main">LOWLAND (DIRECT)</div>
                  <div className="btn-sub">{selectedRoute.lowlandDistanceKm || (selectedRoute.id === 'route-2' ? '9.1' : '5.4')} km • ~{selectedRoute.lowlandTimeMin || (selectedRoute.id === 'route-2' ? '19' : '14')} min</div>
                </button>
                <button
                  onClick={() => setRouteMode('ELEVATED')}
                  className={`mode-btn mono ${routeMode === 'ELEVATED' ? 'active-elevated' : ''}`}
                >
                  <div className="btn-main">ELEVATED (RECOMMENDED)</div>
                  <div className="btn-sub">{selectedRoute.safeDistanceKm} km • ~{selectedRoute.safeTimeMin} min</div>
                </button>
              </div>
            </div>

            {/* Road Condition Breakdown Table */}
            <div className="road-conditions-card mono">
              <span className="label-uppercase">CORRIDOR ROAD STATUS CLASSIFICATION</span>
              <div className="condition-row">
                <div className="cond-label">
                  <span className="cond-dot dot-red" />
                  <span>Verified Closures (Confirmed Closed):</span>
                </div>
                <strong className={verifiedClosures.length > 0 ? 'text-red' : 'text-grey'}>
                  {verifiedClosures.length}
                </strong>
              </div>
              <div className="condition-row">
                <div className="cond-label">
                  <span className="cond-dot dot-amber" />
                  <span>Verified Flood Hazards (Confirmed Hazard):</span>
                </div>
                <strong className={verifiedHazards.length > 0 ? 'text-amber' : 'text-grey'}>
                  {verifiedHazards.length}
                </strong>
              </div>
              <div className="condition-row">
                <div className="cond-label">
                  <span className="cond-dot dot-orange" />
                  <span>Reported Incidents (Citizen Reports):</span>
                </div>
                <strong className={reportedIncidents.length > 0 ? 'text-orange' : 'text-grey'}>
                  {reportedIncidents.length}
                </strong>
              </div>
              <div className="condition-row">
                <div className="cond-label">
                  <span className="cond-dot dot-cyan" />
                  <span>Official Regional Advisories (NDMA):</span>
                </div>
                <strong className={officialAreaAlerts.length > 0 ? 'text-cyan' : 'text-grey'}>
                  {officialAreaAlerts.length}
                </strong>
              </div>
              <div className="condition-row">
                <div className="cond-label">
                  <span className="cond-dot dot-grey" />
                  <span>Roads with Unknown Conditions:</span>
                </div>
                <strong className="text-grey">4.1 km (Unmonitored)</strong>
              </div>
              <div className="cond-caption">
                * Road conditions between sensor/reporting points are unmonitored. Never assume unmonitored segments are dry.
              </div>
            </div>

            {/* Nearby Reported Hazards Feed */}
            {corridorHazards.length > 0 && (
              <div className="nearby-hazards-block mono">
                <span className="label-uppercase">NEARBY REPORTED HAZARDS ({corridorHazards.length})</span>
                <div className="hazards-mini-list">
                  {corridorHazards.map(h => (
                    <div 
                      key={h.id} 
                      className={`hazard-mini-card ${activeHazardInspect?.id === h.id ? 'active-inspect' : ''}`}
                      onClick={() => setActiveHazardInspect(h)}
                    >
                      <div className="h-top">
                        <span className={`badge ${h.classification.badgeClass}`}>
                          {h.classification.label}
                        </span>
                        <span className="h-dist">{formatDistanceDisplay(h.distanceKm)}</span>
                      </div>
                      <div className="h-title">{h.title}</div>
                      <div className="h-meta">
                        {h.waterDepthCm != null ? `Depth: ${h.waterDepthCm}cm · ` : ''}
                        {getIncidentProvenanceLabel(h)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Leaflet Interactive Map */}
        <div className="passage-map-panel editorial-card">
          {/* Floating Top Route Status Bar */}
          <div className="map-route-indicator-bar mono">
            <div className="indicator-left">
              <span className={`badge ${routeMode === 'ELEVATED' ? 'badge-lime' : 'badge-orange'}`}>
                {routeMode === 'ELEVATED' ? 'ELEVATED DETOUR (ACTIVE)' : 'DIRECT LOWLAND (ACTIVE)'}
              </span>
              <span className="indicator-metrics">
                {activeDistanceKm} km (Est.) • ~{activeTimeMin} min (Est.)
              </span>
            </div>
            <div className="indicator-right">
              <span>Click route polylines to switch corridors</span>
            </div>
          </div>

          <div className="map-wrapper-inner">
            <MapContainer
              center={originCoords || [19.0760, 72.8777]}
              zoom={13}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', borderRadius: '4px' }}
            >
              <MapRouteController waypoints={activeWaypoints} />

              {/* OpenStreetMap Basemap */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* 1. Lowland Route Polyline (Dual-Layer: Outer Dark Casing + Center Line) */}
              {selectedRoute.lowlandWaypoints && (
                <>
                  {/* Outer dark casing for contrast against map background */}
                  <Polyline
                    positions={selectedRoute.lowlandWaypoints}
                    pathOptions={{
                      color: '#090A0A',
                      weight: routeMode === 'LOWLAND' ? 10 : 7,
                      opacity: routeMode === 'LOWLAND' ? 0.95 : 0.75,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                    interactive={false}
                  />
                  {/* Inner clickable route line */}
                  <Polyline
                    positions={selectedRoute.lowlandWaypoints}
                    pathOptions={{
                      color: '#FF6438',
                      weight: routeMode === 'LOWLAND' ? 5 : 3.5,
                      opacity: routeMode === 'LOWLAND' ? 1 : 0.7,
                      dashArray: routeMode === 'LOWLAND' ? undefined : '6, 8',
                      lineCap: 'round',
                      lineJoin: 'round',
                      className: routeMode === 'LOWLAND' ? 'route-polyline-selected-lowland' : 'route-polyline-alt'
                    }}
                    eventHandlers={{
                      click: () => setRouteMode('LOWLAND')
                    }}
                  >
                    <Tooltip sticky className="route-tooltip mono">
                      <strong>DIRECT LOWLAND BASIN CORRIDOR</strong>
                      <div>{selectedRoute.lowlandDistanceKm || (selectedRoute.id === 'route-2' ? '9.1' : '5.4')} km • ~{selectedRoute.lowlandTimeMin || (selectedRoute.id === 'route-2' ? '19' : '14')} min</div>
                      <div style={{ color: 'var(--color-orange)', fontSize: '0.7rem' }}>
                        {lowlandAssessment.totalHazardsCount > 0 ? `${lowlandAssessment.totalHazardsCount} reported hazard(s) nearby` : 'Unmonitored basin catchment'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#bbb', marginTop: '2px' }}>Click to select this route</div>
                    </Tooltip>
                  </Polyline>
                </>
              )}

              {/* 2. Elevated Detour Route Polyline (Dual-Layer: Outer Dark Casing + Cyan Center Line) */}
              {selectedRoute.elevatedWaypoints && (
                <>
                  {/* Outer dark casing for contrast against map background */}
                  <Polyline
                    positions={selectedRoute.elevatedWaypoints}
                    pathOptions={{
                      color: '#090A0A',
                      weight: routeMode === 'ELEVATED' ? 10 : 7,
                      opacity: routeMode === 'ELEVATED' ? 0.95 : 0.75,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                    interactive={false}
                  />
                  {/* Inner clickable route line */}
                  <Polyline
                    positions={selectedRoute.elevatedWaypoints}
                    pathOptions={{
                      color: '#00E5FF',
                      weight: routeMode === 'ELEVATED' ? 5 : 3.5,
                      opacity: routeMode === 'ELEVATED' ? 1 : 0.7,
                      dashArray: routeMode === 'ELEVATED' ? '10, 6' : '6, 8',
                      lineCap: 'round',
                      lineJoin: 'round',
                      className: routeMode === 'ELEVATED' ? 'route-polyline-selected' : 'route-polyline-alt'
                    }}
                    eventHandlers={{
                      click: () => setRouteMode('ELEVATED')
                    }}
                  >
                    <Tooltip sticky className="route-tooltip mono">
                      <strong>ELEVATED FLYOVER DETOUR (RECOMMENDED)</strong>
                      <div>{selectedRoute.safeDistanceKm} km • ~{selectedRoute.safeTimeMin} min • {selectedRoute.safeElevationGain}</div>
                      <div style={{ color: 'var(--color-cyan)', fontSize: '0.7rem' }}>
                        {elevatedAssessment.totalHazardsCount > 0 ? `${elevatedAssessment.totalHazardsCount} reported hazard(s) nearby` : 'Ridge corridor clear of reported hazards'}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#bbb', marginTop: '2px' }}>Click to select this route</div>
                    </Tooltip>
                  </Polyline>
                </>
              )}

              {/* 3. Origin Marker */}
              {originCoords && (
                <Marker
                  position={originCoords}
                  icon={createRoutePin('origin', 'A')}
                  zIndexOffset={1200}
                >
                  <Popup className="route-popup mono">
                    <strong style={{ color: 'var(--color-lime)' }}>START LOCATION (A)</strong>
                    <div style={{ fontWeight: 700, margin: '4px 0' }}>{originInput}</div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                      {originCoords[0]?.toFixed(4)}°N, {originCoords[1]?.toFixed(4)}°E
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* 4. Destination Marker */}
              {destCoords && (
                <Marker
                  position={destCoords}
                  icon={createRoutePin('destination', 'B')}
                  zIndexOffset={1200}
                >
                  <Popup className="route-popup mono">
                    <strong style={{ color: 'var(--color-red)' }}>DESTINATION / FACILITY (B)</strong>
                    <div style={{ fontWeight: 700, margin: '4px 0' }}>{destInput}</div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                      {destCoords[0]?.toFixed(4)}°N, {destCoords[1]?.toFixed(4)}°E
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* 5. Facility Markers */}
              {(selectedRoute.facilities || []).map((fac, idx) => (
                <Marker
                  key={`fac-${idx}`}
                  position={[fac.lat, fac.lng]}
                  icon={createRoutePin('facility', '+')}
                  zIndexOffset={900}
                >
                  <Popup className="route-popup mono">
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>CRITICAL FACILITY</span>
                    <strong style={{ display: 'block', margin: '4px 0' }}>{fac.name}</strong>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                      {fac.type === 'hospital' ? 'Emergency Trauma Hub' : fac.type === 'depot' ? 'Fire Rescue Command Depot' : 'Designated Relief Camp'}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* 6. Incident Hazard Markers */}
              {corridorHazards.map(hz => (
                <Marker
                  key={hz.id}
                  position={[hz.lat, hz.lng]}
                  icon={createRoutePin(hz.classification.pinType, '!')}
                  zIndexOffset={hz.classification.type === 'VERIFIED_CLOSURE' ? 1100 : 1000}
                >
                  <Popup className="route-popup mono">
                    <span className={`badge ${hz.classification.badgeClass}`} style={{ fontSize: '0.65rem' }}>
                      {hz.classification.label}
                    </span>
                    <strong style={{ display: 'block', margin: '6px 0 4px' }}>{hz.title}</strong>
                    <div style={{ fontSize: '0.72rem' }}><strong>Location:</strong> {hz.location}</div>
                    {hz.waterDepthCm != null && <div style={{ fontSize: '0.72rem' }}><strong>Water Depth:</strong> {hz.waterDepthCm} cm</div>}
                    <div style={{ fontSize: '0.72rem' }}><strong>Status:</strong> {hz.status || 'UNVERIFIED'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-orange)', marginTop: '2px' }}>
                      <strong>Corridor Proximity:</strong> {formatCorridorProximity(hz.distanceKm)}
                    </div>
                    {hz.timestamp && (
                      <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '2px' }}>
                        Reported: {formatAlertDateTime(hz.timestamp)}
                      </div>
                    )}
                    <div style={{ fontSize: '0.68rem', color: 'var(--color-lime)', marginTop: '4px' }}>
                      Source: {getIncidentProvenanceLabel(hz)}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Comprehensive Map Legend Overlay */}
            <div className="map-legend-overlay mono">
              <span className="label-uppercase" style={{ fontSize: '0.65rem' }}>MAP ROUTE LEGEND</span>
              <div className="leg-item">
                <span className="leg-line line-cyan" />
                <span>Elevated Detour ({routeMode === 'ELEVATED' ? 'Active Selected' : 'Alternate'})</span>
              </div>
              <div className="leg-item">
                <span className="leg-line line-orange" />
                <span>Lowland Direct ({routeMode === 'LOWLAND' ? 'Active Selected' : 'Direct'})</span>
              </div>
              <div className="leg-item">
                <span className="leg-dot pin-red" />
                <span>Verified Road Closure (Confirmed Closed)</span>
              </div>
              <div className="leg-item">
                <span className="leg-dot pin-amber" />
                <span>Verified Flood Hazard (Confirmed Water)</span>
              </div>
              <div className="leg-item">
                <span className="leg-dot pin-orange" />
                <span>Citizen Reported Incident (Pending Review)</span>
              </div>
              <div className="leg-item">
                <span className="leg-dot pin-blue" />
                <span>Critical Facility / Emergency Shelter</span>
              </div>
              <div className="leg-item">
                <span className="leg-dot pin-grey" />
                <span>Unknown Road Condition (Unmonitored)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Route Profile, Detour Recommendation & Instructions */}
        <div className="comparison-panel">
          {/* Honest Route Safety Provenance Notice */}
          <div className="route-disclaimer-card editorial-card mono">
            <div className="disclaimer-top">
              <ShieldAlert size={16} color="var(--color-amber)" />
              <span>HAZARD-AWARE ROUTE ESTIMATE NOTICE</span>
            </div>
            <p className="disclaimer-body">
              This route assessment is an <strong>estimate</strong> based on reported citizen incidents, AWS-synced reports, and terrain elevation profiles. Real-time road inundation conditions between sensor/reporting points are unmonitored. <strong>Never assume an unmonitored road is flood-free based only on OpenStreetMap or forecasts.</strong>
            </p>
          </div>

          {/* Active Corridor Card */}
          <div className={`route-compare-card editorial-card ${routeMode === 'ELEVATED' ? 'safe-card' : 'warn-card'}`}>
            <div className="compare-card-header">
              <div className="header-left-title">
                <span className={`badge ${routeMode === 'ELEVATED' ? 'badge-lime' : 'badge-orange'}`}>
                  {routeMode === 'ELEVATED' ? 'RECOMMENDED ALTERNATE' : 'DIRECT LOWLAND PATH'}
                </span>
                <h3 className="route-card-title">
                  {routeMode === 'ELEVATED' ? 'ELEVATED FLYOVER DETOUR' : 'DIRECT LOWLAND BASIN'}
                </h3>
              </div>
              <div className="header-metrics mono">
                <span>{activeDistanceKm} km (Est.)</span> • <span>~{activeTimeMin} min (Est.)</span>
              </div>
            </div>

            {/* Recommendation & Rationale Banner */}
            <div className={`safe-banner ${routeMode === 'ELEVATED' ? 'banner-safe' : 'banner-warn'}`}>
              <Info size={18} color={routeMode === 'ELEVATED' ? 'var(--color-lime)' : 'var(--color-orange)'} />
              <div className="banner-text mono">
                <strong>{recommendation.rationaleTitle}:</strong> {recommendation.rationaleText}
              </div>
            </div>

            {/* Route Stats & Hazard Exposure Breakdown */}
            <div className="corridor-metrics-card mono">
              <span className="label-uppercase">CORRIDOR HAZARD EXPOSURE PROFILE</span>
              <div className="c-stat-row">
                <span>Nearby Reported Hazards:</span>
                <strong className={corridorHazards.length > 0 ? 'text-orange' : 'text-lime'}>
                  {corridorHazards.length}
                </strong>
              </div>
              <div className="c-stat-row">
                <span>Confirmed Road Closures:</span>
                <strong className={verifiedClosures.length > 0 ? 'text-red' : 'text-grey'}>
                  {verifiedClosures.length}
                </strong>
              </div>
              <div className="c-stat-row">
                <span>Peak Reported Water Depth:</span>
                <strong className={activeAssessment.maxWaterDepthCm > 0 ? 'text-amber' : 'text-grey'}>
                  {activeAssessment.maxWaterDepthCm > 0 ? `${activeAssessment.maxWaterDepthCm} cm` : 'None reported'}
                </strong>
              </div>
              <div className="c-stat-row">
                <span>Terrain Profile Clearance:</span>
                <strong className="text-lime">
                  {routeMode === 'ELEVATED' ? selectedRoute.safeElevationGain : 'Baseline Lowland Catchment'}
                </strong>
              </div>
            </div>

            {/* Quick Facilities Along Path */}
            <div className="shelters-list-block">
              <span className="label-uppercase">CRITICAL FACILITIES ALONG CORRIDOR</span>
              <div className="shelter-chips">
                {(selectedRoute.safeSheltersNearby || []).map((s, i) => (
                  <div key={i} className="shelter-chip mono">
                    <Hospital size={12} color="var(--color-lime)" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Turn by turn detour steps */}
            <div className="turn-instructions">
              <span className="label-uppercase">CORRIDOR WAYPOINT INSTRUCTIONS</span>
              <div className="instructions-list mono">
                <div className="step-item">
                  <span>1. Depart {originInput} on Main Arterial Corridor (1.2 km)</span>
                </div>
                {routeMode === 'ELEVATED' ? (
                  <div className="step-item highlight">
                    <span>2. RECOMMENDED DETOUR: Ascend Elevated Flyover Ramp ({selectedRoute.safeElevationGain})</span>
                  </div>
                ) : (
                  <div className="step-item highlight-warn">
                    <span>2. CAUTION: Proceed through Low-Lying Underpass Link (monitor water depth)</span>
                  </div>
                )}
                <div className="step-item">
                  <span>3. Continue along corridor to {destInput} (3.8 km)</span>
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
          gap: 16px;
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

        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .route-presets-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .route-preset-btn {
          padding: 8px 12px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-ivory-muted);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .route-preset-btn.active, .route-preset-btn:hover {
          border-color: var(--color-lime);
          color: var(--color-lime);
          background: rgba(199, 243, 107, 0.08);
        }

        .corridor-warning-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding: 12px 18px;
          background: rgba(255, 100, 56, 0.1);
          border: 1px solid rgba(255, 100, 56, 0.35);
          border-left: 4px solid var(--color-orange);
          border-radius: 4px;
          font-size: 0.76rem;
        }

        .banner-alert-content {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--color-ivory);
        }

        .switch-detour-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: var(--color-lime);
          color: var(--bg-obsidian);
          border-radius: 3px;
          font-weight: 700;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .switch-detour-btn:hover {
          background: #d4f788;
        }

        .detour-active-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-lime);
          font-size: 0.72rem;
          font-weight: 700;
        }

        .corridor-clear-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          background: rgba(199, 243, 107, 0.06);
          border: 1px solid rgba(199, 243, 107, 0.2);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-lime);
        }

        .safepassage-main-grid {
          display: grid;
          grid-template-columns: 340px 1fr 340px;
          gap: 16px;
          height: calc(100vh - 220px);
          min-height: 600px;
        }

        .waypoint-panel {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .panel-header-strip {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(9, 10, 10, 0.5);
        }

        .header-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-ivory);
          letter-spacing: 0.5px;
        }

        .waypoint-form {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Telemetry Refresh Strip */
        .telemetry-refresh-strip {
          padding: 10px 12px;
          background: rgba(14, 16, 15, 0.95);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .telemetry-meta-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .telemetry-meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          flex-wrap: wrap;
        }

        .tel-label {
          color: var(--color-grey);
          font-weight: 700;
        }

        .tel-val {
          color: var(--color-ivory);
        }

        .stale-cache-badge {
          padding: 1px 4px;
          background: rgba(229, 169, 60, 0.15);
          border: 1px solid rgba(229, 169, 60, 0.4);
          color: var(--color-amber);
          font-size: 0.58rem;
          border-radius: 2px;
          font-weight: 700;
        }

        .telemetry-refresh-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 6px 10px;
          background: rgba(240, 237, 228, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          font-size: 0.65rem;
          color: var(--color-ivory);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .telemetry-refresh-btn:hover:not(:disabled) {
          border-color: var(--color-lime);
          color: var(--color-lime);
        }

        .telemetry-refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .waypoint-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .input-with-pin {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 8px 12px;
          border-radius: 4px;
        }

        .waypoint-input {
          font-size: 0.8rem;
          color: var(--color-ivory);
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
        }

        .route-mode-selector-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mode-selector-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mode-hint {
          font-size: 0.6rem;
          color: var(--color-grey);
        }

        .mode-btn-row {
          display: flex;
          gap: 6px;
        }

        .mode-btn {
          flex: 1;
          padding: 8px 6px;
          background: rgba(9, 10, 10, 0.7);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .mode-btn .btn-main {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-ivory-muted);
        }

        .mode-btn .btn-sub {
          font-size: 0.6rem;
          color: var(--color-grey);
        }

        .mode-btn.active-lowland {
          border-color: var(--color-orange);
          background: rgba(255, 100, 56, 0.12);
        }

        .mode-btn.active-lowland .btn-main {
          color: var(--color-orange);
        }

        .mode-btn.active-elevated {
          border-color: var(--color-cyan);
          background: rgba(0, 229, 255, 0.12);
        }

        .mode-btn.active-elevated .btn-main {
          color: var(--color-cyan);
        }

        .road-conditions-card {
          padding: 12px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.7rem;
        }

        .condition-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cond-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-grey);
        }

        .cond-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot-red { background: #FF5252; }
        .dot-amber { background: var(--color-amber); }
        .dot-orange { background: #FF6438; }
        .dot-cyan { background: #00E5FF; }
        .dot-grey { background: #858783; }

        .text-red { color: #FF5252; }
        .text-amber { color: var(--color-amber); }
        .text-orange { color: #FF6438; }
        .text-cyan { color: #00E5FF; }
        .text-lime { color: var(--color-lime); }
        .text-grey { color: var(--color-grey); }

        .cond-caption {
          font-size: 0.62rem;
          color: var(--color-grey);
          line-height: 1.35;
          margin-top: 4px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 6px;
        }

        .nearby-hazards-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .hazards-mini-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 160px;
          overflow-y: auto;
        }

        .hazard-mini-card {
          padding: 8px 10px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.68rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .hazard-mini-card:hover, .hazard-mini-card.active-inspect {
          border-color: var(--color-orange);
          background: rgba(255, 100, 56, 0.08);
        }

        .h-top { display: flex; justify-content: space-between; align-items: center; }
        .h-dist { font-size: 0.65rem; color: var(--color-orange); font-weight: 700; }
        .h-title { color: var(--color-ivory); font-weight: 600; }
        .h-meta { color: var(--color-grey); font-size: 0.62rem; }

        .passage-map-panel {
          position: relative;
          overflow: hidden;
          padding: 0;
          display: flex;
          flex-direction: column;
        }

        /* Floating Top Route Status Bar on Map */
        .map-route-indicator-bar {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          background: rgba(9, 10, 10, 0.9);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 8px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 500;
          font-size: 0.7rem;
        }

        .indicator-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .indicator-metrics {
          color: var(--color-ivory);
          font-weight: 600;
        }

        .indicator-right {
          color: var(--color-grey);
          font-size: 0.65rem;
        }

        .map-wrapper-inner {
          width: 100%;
          height: 100%;
          position: relative;
        }

        /* Subtle animated dash flow on selected route polyline */
        .route-polyline-selected path {
          stroke-dasharray: 10, 14;
          animation: routeDashFlow 28s linear infinite;
          cursor: pointer;
        }

        .route-polyline-selected-lowland path {
          cursor: pointer;
        }

        .route-polyline-alt path {
          cursor: pointer;
        }

        @keyframes routeDashFlow {
          to { stroke-dashoffset: -240; }
        }

        .route-tooltip {
          background: rgba(9, 10, 10, 0.95) !important;
          border: 1px solid var(--border-strong) !important;
          color: var(--color-ivory) !important;
          font-size: 0.72rem !important;
          padding: 6px 10px !important;
          border-radius: 4px !important;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6) !important;
        }

        .map-legend-overlay {
          position: absolute;
          bottom: 14px;
          left: 14px;
          background: rgba(9, 10, 10, 0.88);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 10px 14px;
          z-index: 500;
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 0.66rem;
          color: var(--color-grey);
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }

        .leg-item { display: flex; align-items: center; gap: 8px; }
        .leg-line { width: 16px; height: 3px; border-radius: 1px; }
        .line-cyan { background: #00E5FF; }
        .line-orange { background: #FF6438; }
        .leg-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pin-red { background: #FF5252; }
        .pin-amber { background: #E5A93C; }
        .pin-orange { background: #FF6438; }
        .pin-blue { background: #29B6F6; }
        .pin-grey { background: #858783; }

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
          margin: 0;
        }

        .route-compare-card {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .safe-card { border-left: 4px solid var(--color-cyan); }
        .warn-card { border-left: 4px solid var(--color-orange); }

        .compare-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .route-card-title {
          font-size: 1.15rem;
          color: var(--color-ivory);
          margin-top: 4px;
        }

        .header-metrics {
          font-size: 0.78rem;
          color: var(--color-grey);
        }

        .safe-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 4px;
        }

        .banner-safe {
          background: rgba(0, 229, 255, 0.08);
          border: 1px solid rgba(0, 229, 255, 0.25);
        }

        .banner-warn {
          background: rgba(255, 100, 56, 0.08);
          border: 1px solid rgba(255, 100, 56, 0.25);
        }

        .banner-text {
          font-size: 0.72rem;
          color: var(--color-ivory);
          line-height: 1.35;
        }

        .corridor-metrics-card {
          padding: 12px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.7rem;
        }

        .c-stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--color-grey);
        }

        .shelters-list-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
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
          padding: 6px 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.7rem;
          color: var(--color-ivory);
        }

        .turn-instructions {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .instructions-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .step-item {
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

        .step-item.highlight {
          background: rgba(0, 229, 255, 0.08);
          border-color: rgba(0, 229, 255, 0.3);
          color: var(--color-cyan);
        }

        .step-item.highlight-warn {
          background: rgba(255, 100, 56, 0.08);
          border-color: rgba(255, 100, 56, 0.3);
          color: var(--color-orange);
        }

        @media (max-width: 1200px) {
          .safepassage-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .passage-map-panel {
            height: 520px;
          }
        }
      `}</style>
    </div>
  );
}
