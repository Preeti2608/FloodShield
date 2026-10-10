import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Navigation, Compass, CloudRain, Thermometer, Wind, Bell, Info, RefreshCw, X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { fetchRealWeather } from '../api/weatherApi';
import { searchGeocodeLocation } from '../api/geocodingApi';
import { getStoredReports } from '../utils/reportStorage';
import { calculateDistanceKm } from '../utils/distance';
import { getAlertPreferences, saveAlertPreferences, requestBrowserNotificationPermission, generateGenuineAlerts } from '../utils/alertManager';

// Leaflet map bounds setter helper component
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    } else if (center) {
      map.setView(center, zoom || 12);
    }
  }, [center, zoom, bounds, map]);
  return null;
}

// Custom Marker Icons
const createMarkerIcon = (type) => {
  let color = '#C7F36B'; // Lime
  let size = 20;

  if (type === 'gps') {
    color = '#29B6F6'; // Bright Blue GPS Pin
    size = 24;
  } else if (type === 'selected') {
    color = '#FF5252'; // Red Search Target
    size = 22;
  } else if (type === 'user_report') {
    color = '#FF6438'; // Signal Orange Incident
    size = 20;
  }

  return L.divIcon({
    className: 'custom-atlas-pin',
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid #090A0A;
      box-shadow: 0 0 14px ${color};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  });
};

export default function AtlasView() {
  // Map Mode State: 'NEAR_ME' | 'INDIA' | 'SEARCH'
  const [mapMode, setMapMode] = useState('NEAR_ME');

  // Coordinates and Center
  const [mapCenter, setMapCenter] = useState([19.0760, 72.8777]);
  const [mapZoom, setMapZoom] = useState(12);
  const [indiaBounds, setIndiaBounds] = useState(null);

  // Geolocation state
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsAccuracyM, setGpsAccuracyM] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [gpsExplained, setGpsExplained] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedSearchLoc, setSelectedSearchLoc] = useState(null);

  // Weather Telemetry
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);

  // User Reports & Radius Filter
  const [userReports, setUserReports] = useState([]);
  const [radiusKm, setRadiusKm] = useState(5); // 1, 5, 10, or 'ALL'

  // Legend and Alert Center Modals
  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [isAlertCenterOpen, setIsAlertCenterOpen] = useState(false);
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false);
  const [alertPrefs, setAlertPrefs] = useState(getAlertPreferences());
  const [notifMessage, setNotifMessage] = useState('');

  // Selected Marker Inspector
  const [selectedMarkerDetail, setSelectedMarkerDetail] = useState(null);

  // Load User Reports on Mount
  useEffect(() => {
    setUserReports(getStoredReports());
  }, []);

  // Fetch Weather whenever center coordinates change
  useEffect(() => {
    let isMounted = true;
    setLoadingWeather(true);

    const [lat, lng] = mapCenter;
    fetchRealWeather(lat, lng).then(res => {
      if (isMounted) {
        setWeatherData(res);
        setLoadingWeather(false);
      }
    });

    return () => { isMounted = false; };
  }, [mapCenter]);

  // Handle Mode Selection
  const handleSelectMode = (mode) => {
    setMapMode(mode);
    setIndiaBounds(null);

    if (mode === 'INDIA') {
      setIndiaBounds([[6.4626999, 68.1097], [35.5137, 97.3953]]);
    } else if (mode === 'NEAR_ME' && gpsLocation) {
      setMapCenter([gpsLocation.lat, gpsLocation.lng]);
      setMapZoom(13);
    } else if (mode === 'SEARCH' && selectedSearchLoc) {
      setMapCenter([selectedSearchLoc.lat, selectedSearchLoc.lng]);
      setMapZoom(13);
    }
  };

  // Trigger Browser Geolocation (Mode A: Near Me)
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser does not support geolocation.");
      return;
    }

    setIsLocatingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);

        setGpsLocation({ lat, lng });
        setGpsAccuracyM(accuracy);
        setIsLocatingGps(false);
        setMapMode('NEAR_ME');
        setMapCenter([lat, lng]);
        setMapZoom(14);
        setIndiaBounds(null);
      },
      (error) => {
        setIsLocatingGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError("Location permission denied. Please allow location access in your browser settings.");
        } else if (error.code === error.TIMEOUT) {
          setGpsError("Location request timed out. Please try again.");
        } else {
          setGpsError(`Geolocation error: ${error.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Submit Location Search (Mode C: Search)
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    const res = await searchGeocodeLocation(searchQuery);
    setIsSearching(false);

    if (res.success && res.results.length > 0) {
      setSearchResults(res.results);
      handleSelectSearchResult(res.results[0]);
    } else {
      setSearchResults([]);
      setSearchError(res.error || 'No location results found. Try searching a city name or landmark.');
    }
  };

  const handleSelectSearchResult = (loc) => {
    setSelectedSearchLoc(loc);
    setMapMode('SEARCH');
    setMapCenter([loc.lat, loc.lng]);
    setMapZoom(13);
    setIndiaBounds(null);
  };

  // Filter user reports by distance ONLY when valid coordinates exist (Requirement 3)
  const filteredReportsByRadius = userReports.filter(r => {
    if (radiusKm === 'ALL') return true;
    
    // If report lacks valid numeric coordinates, exclude from numeric radius filter
    if (typeof r.lat !== 'number' || typeof r.lng !== 'number' || isNaN(r.lat) || isNaN(r.lng)) {
      return false;
    }
    
    const [centerLat, centerLng] = mapCenter;
    const dist = calculateDistanceKm(centerLat, centerLng, r.lat, r.lng);
    return dist <= Number(radiusKm);
  });

  // Map markers list ONLY for reports with valid numeric coordinates (Requirement 3)
  const reportsWithValidCoords = userReports.filter(r => 
    typeof r.lat === 'number' && typeof r.lng === 'number' && !isNaN(r.lat) && !isNaN(r.lng)
  );

  // Genuine Alerts List
  const genuineAlerts = generateGenuineAlerts(
    weatherData, 
    userReports, 
    radiusKm === 'ALL' ? 50 : Number(radiusKm),
    mapCenter[0],
    mapCenter[1]
  );

  const handleSavePrefs = (newPrefs) => {
    setAlertPrefs(newPrefs);
    saveAlertPreferences(newPrefs);
  };

  const handleEnableNotifications = async () => {
    const res = await requestBrowserNotificationPermission();
    setNotifMessage(res.message);
    if (res.granted) {
      const updated = { ...alertPrefs, browserNotificationsEnabled: true };
      setAlertPrefs(updated);
      saveAlertPreferences(updated);
    }
  };

  return (
    <div className="atlas-view-container animate-fade-in">
      {/* Top Header & View Selector Controls */}
      <div className="atlas-control-header">
        <div className="atlas-title-block">
          <span className="mono label-uppercase">SECTION 01</span>
          <h2 className="section-title">FLOOD ATLAS</h2>
          <span className="mono desc-sub">VERIFIABLE GEOSPATIAL INTELLIGENCE & REAL WEATHER</span>
        </div>

        {/* 3 Real Map Mode Selector Buttons */}
        <div className="atlas-mode-selector-group mono">
          <button
            onClick={() => handleSelectMode('NEAR_ME')}
            className={`mode-tab-btn ${mapMode === 'NEAR_ME' ? 'active' : ''}`}
          >
            <Navigation size={14} />
            <span>NEAR ME</span>
          </button>

          <button
            onClick={() => handleSelectMode('INDIA')}
            className={`mode-tab-btn ${mapMode === 'INDIA' ? 'active' : ''}`}
          >
            <Compass size={14} />
            <span>INDIA OVERVIEW</span>
          </button>

          <button
            onClick={() => handleSelectMode('SEARCH')}
            className={`mode-tab-btn ${mapMode === 'SEARCH' ? 'active' : ''}`}
          >
            <Search size={14} />
            <span>SEARCH LOCATION</span>
          </button>

          {/* Genuine Alert Center Trigger */}
          <button
            onClick={() => setIsAlertCenterOpen(!isAlertCenterOpen)}
            className="alert-center-trigger-btn"
            title="Open Genuine Alert Center"
          >
            <Bell size={15} color="var(--color-orange)" />
            <span className="mono alert-count-badge">{genuineAlerts.filter(a => a.severity !== 'INFO').length}</span>
          </button>
        </div>
      </div>

      {/* Mode Specific Sub-Bar Controls */}
      <div className="mode-sub-header editorial-card">
        {mapMode === 'NEAR_ME' && (
          <div className="near-me-controls mono">
            {!gpsExplained && !gpsLocation && (
              <div className="gps-explain-banner">
                <Info size={16} color="var(--color-lime)" />
                <span>Clicking <strong>USE MY LOCATION</strong> requests browser GPS to center the map and fetch local weather. Your coordinates stay local in your browser.</span>
              </div>
            )}

            <button onClick={handleRequestGps} disabled={isLocatingGps} className="use-location-btn">
              <Navigation size={14} className={isLocatingGps ? 'spin-icon' : ''} />
              <span>{isLocatingGps ? "DETECTING GPS LOCATION..." : "USE MY LOCATION"}</span>
            </button>

            {gpsLocation && (
              <div className="gps-status-pill">
                <CheckCircle2 size={14} color="var(--color-lime)" />
                <span>GPS ACTIVE: {gpsLocation.lat.toFixed(4)}°N, {gpsLocation.lng.toFixed(4)}°E (±{gpsAccuracyM}m accuracy)</span>
              </div>
            )}

            {gpsError && (
              <div className="gps-error-pill">
                <AlertTriangle size={14} color="var(--color-red)" />
                <span>{gpsError}</span>
                <button onClick={handleRequestGps} className="retry-gps-btn">RETRY</button>
              </div>
            )}
          </div>
        )}

        {mapMode === 'INDIA' && (
          <div className="india-controls mono">
            <span className="badge badge-grey">GEOGRAPHIC BOUNDS: INDIA NATIONAL REGION</span>
            {/* Requirement 2: Accurate India Overview Label */}
            <span className="sub-desc">Locally saved user reports (Browser Storage); nationwide coverage requires backend aggregation.</span>
          </div>
        )}

        {mapMode === 'SEARCH' && (
          <form onSubmit={handleSearchSubmit} className="search-form-bar">
            <div className="search-bar-input-wrap">
              <Search size={16} color="var(--color-grey)" />
              <input
                type="text"
                placeholder="Search city, district, landmark (e.g. Mumbai, New Delhi, Chennai)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="geocode-search-input"
              />
            </div>
            <button type="submit" disabled={isSearching} className="search-submit-btn mono">
              {isSearching ? "SEARCHING..." : "SEARCH"}
            </button>
          </form>
        )}
      </div>

      {/* Main Grid */}
      <div className="atlas-main-grid">
        {/* Left Side: Dynamic Location & Telemetry Panel */}
        <div className="sensor-list-panel editorial-card">
          <div className="panel-header-strip">
            <Layers size={14} color="var(--color-lime)" />
            <span className="mono header-title">LOCATION TELEMETRY PANEL</span>
          </div>

          <div className="dynamic-panel-content">
            {/* Active Mode Tag */}
            <div className="active-mode-card mono">
              <span className="label-uppercase">ACTIVE MAP MODE</span>
              <div className="mode-title-bold">{mapMode.replace('_', ' ')}</div>
              <div className="coords-text">Center: {mapCenter[0].toFixed(4)}°N, {mapCenter[1].toFixed(4)}°E</div>
            </div>

            {/* Radius Filter for User Reports */}
            <div className="radius-filter-block mono">
              <span className="label-uppercase">REPORT RADIUS FILTER (RELATIVE TO CENTER)</span>
              <div className="radius-btn-group">
                {[1, 5, 10, 'ALL'].map(r => (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`radius-btn ${radiusKm === r ? 'active' : ''}`}
                  >
                    {r === 'ALL' ? 'ALL' : `${r}km`}
                  </button>
                ))}
              </div>
            </div>

            {/* User Reports within Radius List */}
            <div className="radius-reports-block">
              <span className="label-uppercase mono">USER-REPORTED INCIDENTS ({filteredReportsByRadius.length})</span>

              {filteredReportsByRadius.length === 0 ? (
                <div className="no-reports-radius-box mono">
                  <span>No user reports logged within {radiusKm === 'ALL' ? 'the region' : `${radiusKm}km radius`}.</span>
                </div>
              ) : (
                <div className="radius-reports-list">
                  {filteredReportsByRadius.map(rep => (
                    <div
                      key={rep.id}
                      onClick={() => {
                        setSelectedMarkerDetail({
                          type: 'USER-REPORTED INCIDENT · LOCAL STORAGE',
                          title: rep.title,
                          location: rep.location,
                          lat: rep.lat,
                          lng: rep.lng,
                          timestamp: rep.timestamp,
                          severity: rep.severity,
                          dataMode: rep.dataMode,
                          description: rep.description
                        });
                      }}
                      className="radius-report-card mono"
                    >
                      <div className="rep-card-top">
                        <span className="rep-id">{rep.id}</span>
                        <span className="badge badge-orange">{rep.severity}</span>
                      </div>
                      <div className="rep-title">{rep.title}</div>
                      <div className="rep-loc">{rep.location}</div>
                      <div className="rep-coords mono">
                        {rep.lat != null ? `${rep.lat.toFixed(4)}°N, ${rep.lng.toFixed(4)}°E` : 'Coordinates: Unavailable (List only)'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Official Warnings Status */}
            <div className="official-status-card mono">
              <span className="label-uppercase">OFFICIAL FLOOD WARNINGS</span>
              <div className="status-sub">Awaiting AWS backend official civil alert stream.</div>
            </div>
          </div>
        </div>

        {/* Center: Leaflet Map Container */}
        <div className="map-view-wrapper editorial-card">
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            scrollWheelZoom={false}
            style={{ width: '100%', height: '100%', borderRadius: '4px' }}
          >
            <MapController center={mapCenter} zoom={mapZoom} bounds={indiaBounds} />

            {/* OpenStreetMap Basemap with Required Attribution */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 1. GPS Location Marker */}
            {gpsLocation && (
              <Marker 
                position={[gpsLocation.lat, gpsLocation.lng]} 
                icon={createMarkerIcon('gps')}
                eventHandlers={{
                  click: () => setSelectedMarkerDetail({
                    type: 'MY LOCATION (BROWSER GPS)',
                    title: 'Current Browser Geolocation',
                    location: `${gpsLocation.lat.toFixed(4)}°N, ${gpsLocation.lng.toFixed(4)}°E`,
                    lat: gpsLocation.lat,
                    lng: gpsLocation.lng,
                    accuracy: `±${gpsAccuracyM} meters`,
                    timestamp: new Date().toISOString()
                  })
                }}
              >
                <Popup>
                  <div className="map-popup-body mono">
                    <strong>MY LOCATION (GPS)</strong>
                    <div>Accuracy: ±{gpsAccuracyM}m</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 2. Selected Search Location Marker */}
            {selectedSearchLoc && (
              <Marker 
                position={[selectedSearchLoc.lat, selectedSearchLoc.lng]} 
                icon={createMarkerIcon('selected')}
                eventHandlers={{
                  click: () => setSelectedMarkerDetail({
                    type: 'SELECTED SEARCH LOCATION',
                    title: selectedSearchLoc.shortName,
                    location: selectedSearchLoc.name,
                    lat: selectedSearchLoc.lat,
                    lng: selectedSearchLoc.lng,
                    timestamp: new Date().toISOString()
                  })
                }}
              >
                <Popup>
                  <div className="map-popup-body mono">
                    <strong>{selectedSearchLoc.shortName}</strong>
                    <div>{selectedSearchLoc.name}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 3. User-Reported Incident Markers (ONLY for reports with valid numeric lat & lng) */}
            {reportsWithValidCoords.map(rep => (
              <Marker
                key={rep.id}
                position={[rep.lat, rep.lng]}
                icon={createMarkerIcon('user_report')}
                eventHandlers={{
                  click: () => setSelectedMarkerDetail({
                    type: 'USER-REPORTED INCIDENT · LOCAL STORAGE',
                    title: rep.title,
                    location: rep.location,
                    lat: rep.lat,
                    lng: rep.lng,
                    timestamp: rep.timestamp,
                    severity: rep.severity,
                    dataMode: rep.dataMode,
                    description: rep.description
                  })
                }}
              >
                <Popup>
                  <div className="map-popup-body mono">
                    <strong>{rep.title}</strong>
                    <div>{rep.location}</div>
                    <div>Depth: {rep.waterDepthCm}cm ({rep.severity})</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Interactive Map Legend */}
          <div className="map-legend-collapsible mono">
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)} 
              className="legend-toggle-header"
            >
              <span>MAP LEGEND</span>
              {isLegendOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>

            {isLegendOpen && (
              <div className="legend-items-list animate-fade-in">
                <div className="legend-row"><span className="legend-dot pin-blue" /> My location (Browser GPS)</div>
                <div className="legend-row"><span className="legend-dot pin-red" /> Selected search location</div>
                <div className="legend-row"><span className="legend-dot pin-orange" /> User-reported incident</div>
                <div className="legend-row"><span className="legend-dot pin-grey" /> Official flood warning (Unavailable)</div>
                <div className="legend-row"><span className="legend-dot pin-lime" /> Weather observation point</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Open-Meteo Weather Telemetry & Selected Marker Detail Panel */}
        <div className="sensor-inspector-panel editorial-card">
          <div className="panel-header-strip">
            <CloudRain size={14} color="var(--color-lime)" />
            <span className="mono header-title">VERIFIABLE TELEMETRY & DETAIL</span>
          </div>

          <div className="inspector-content">
            {/* Real Open-Meteo Weather Card */}
            {loadingWeather ? (
              <div className="weather-loading-box mono">
                <RefreshCw size={16} className="spin-icon" color="var(--color-lime)" />
                <span>Fetching Open-Meteo weather telemetry...</span>
              </div>
            ) : weatherData && weatherData.success ? (
              <div className="real-weather-card mono">
                <div className="weather-top-row">
                  <span className="badge badge-lime">LIVE OPEN-METEO WEATHER</span>
                  <span className="weather-time">{new Date(weatherData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="weather-metrics-grid">
                  <div className="w-cell">
                    <CloudRain size={16} color="var(--color-orange)" />
                    <span className="w-label">PRECIPITATION</span>
                    <span className="w-val">{weatherData.precipitationMmHr} mm/h</span>
                  </div>

                  <div className="w-cell">
                    <Thermometer size={16} color="var(--color-ivory)" />
                    <span className="w-label">TEMPERATURE</span>
                    <span className="w-val">{weatherData.temperatureC}°C</span>
                  </div>

                  <div className="w-cell">
                    <Wind size={16} color="var(--color-grey)" />
                    <span className="w-label">WIND SPEED</span>
                    <span className="w-val">{weatherData.windSpeedKmH} km/h</span>
                  </div>

                  <div className="w-cell">
                    <span className="w-label">HUMIDITY</span>
                    <span className="w-val">{weatherData.humidityPct}%</span>
                  </div>
                </div>

                <div className="weather-source-footer">
                  <Info size={12} color="var(--color-lime)" />
                  <span>{weatherData.attribution}</span>
                </div>
              </div>
            ) : (
              <div className="weather-unavailable-box mono">
                <AlertTriangle size={16} color="var(--color-amber)" />
                <span>Weather telemetry currently unavailable.</span>
              </div>
            )}

            {/* Selected Marker Detail Inspector */}
            {selectedMarkerDetail ? (
              <div className="selected-detail-box mono animate-fade-in">
                <div className="detail-top">
                  <span className="badge badge-orange">{selectedMarkerDetail.type}</span>
                  <button onClick={() => setSelectedMarkerDetail(null)} className="close-detail-btn"><X size={14} /></button>
                </div>

                <h4 className="detail-title">{selectedMarkerDetail.title}</h4>
                <div className="detail-row"><strong>Location:</strong> {selectedMarkerDetail.location}</div>
                <div className="detail-row">
                  <strong>Coordinates:</strong> {selectedMarkerDetail.lat != null ? `${selectedMarkerDetail.lat.toFixed(4)}°N, ${selectedMarkerDetail.lng.toFixed(4)}°E` : 'Unavailable (Not displayed on map)'}
                </div>
                {selectedMarkerDetail.timestamp && <div className="detail-row"><strong>Timestamp:</strong> {new Date(selectedMarkerDetail.timestamp).toLocaleString()}</div>}
                {selectedMarkerDetail.accuracy && <div className="detail-row"><strong>GPS Accuracy:</strong> {selectedMarkerDetail.accuracy}</div>}
                {selectedMarkerDetail.description && <div className="detail-row"><strong>Description:</strong> {selectedMarkerDetail.description}</div>}
              </div>
            ) : (
              <div className="no-detail-prompt mono">
                <span>Click any map marker or incident to inspect detailed provenance, exact coordinates, and source metadata.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Genuine Alert Center Drawer/Modal */}
      {isAlertCenterOpen && (
        <div className="alert-center-modal-overlay animate-fade-in">
          <div className="alert-center-modal editorial-card mono">
            <div className="modal-header">
              <div className="modal-title-row">
                <Bell size={18} color="var(--color-orange)" />
                <h3>GENUINE ALERT CENTER</h3>
              </div>
              <div className="modal-actions">
                <button onClick={() => setIsAlertSettingsOpen(!isAlertSettingsOpen)} className="opt-settings-btn">
                  <span>SETTINGS</span>
                </button>
                <button onClick={() => setIsAlertCenterOpen(false)} className="close-modal-btn"><X size={18} /></button>
              </div>
            </div>

            {/* Opt-In Alert Settings Sub-Panel */}
            {isAlertSettingsOpen && (
              <div className="alert-settings-box animate-fade-in">
                <span className="label-uppercase">OPT-IN ALERT PREFERENCES</span>
                <div className="settings-field-row">
                  <span>Rainfall Watch Threshold:</span>
                  <strong>{alertPrefs.rainfallThresholdMmHr} mm/h</strong>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={alertPrefs.rainfallThresholdMmHr}
                    onChange={(e) => handleSavePrefs({ ...alertPrefs, rainfallThresholdMmHr: Number(e.target.value) })}
                    className="hydro-slider"
                  />
                </div>

                <div className="settings-field-row">
                  <button onClick={handleEnableNotifications} className="enable-notif-btn">
                    <span>ENABLE BROWSER DESKTOP NOTIFICATIONS</span>
                  </button>
                  {notifMessage && <span className="notif-msg">{notifMessage}</span>}
                </div>
              </div>
            )}

            {/* Alert Items List */}
            <div className="alerts-scroll-list">
              {genuineAlerts.map(alt => (
                <div key={alt.id} className={`alert-item-card ${alt.type === 'WEATHER WATCH' ? 'watch-card' : ''}`}>
                  <div className="alt-top">
                    <span className={`badge ${alt.type === 'WEATHER WATCH' ? 'badge-amber' : alt.type === 'USER-REPORTED INCIDENT' ? 'badge-orange' : 'badge-grey'}`}>
                      {alt.type}
                    </span>
                    <span className="alt-time">{new Date(alt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <strong className="alt-title">{alt.title}</strong>
                  <div className="alt-loc">{alt.location} • {alt.source}</div>
                  <p className="alt-exp">{alt.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .atlas-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .atlas-control-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .atlas-mode-selector-group {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-card);
          padding: 4px;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
        }

        .mode-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-size: 0.72rem;
          color: var(--color-grey);
          border-radius: 2px;
          transition: all var(--transition-fast);
        }

        .mode-tab-btn:hover { color: var(--color-ivory); }
        .mode-tab-btn.active {
          background: var(--color-orange);
          color: var(--bg-obsidian);
          font-weight: 700;
        }

        .alert-center-trigger-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          background: rgba(255, 100, 56, 0.12);
          border: 1px solid rgba(255, 100, 56, 0.3);
          border-radius: 2px;
        }

        .alert-count-badge {
          font-size: 0.7rem;
          color: var(--color-orange);
          font-weight: 700;
        }

        .mode-sub-header {
          padding: 10px 16px;
          display: flex;
          align-items: center;
        }

        .near-me-controls, .india-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          width: 100%;
        }

        .gps-explain-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          color: var(--color-ivory-muted);
        }

        .use-location-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--color-lime);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .gps-status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--color-lime);
        }

        .gps-error-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          color: #FF5252;
        }

        .retry-gps-btn {
          padding: 2px 6px;
          background: rgba(229, 57, 53, 0.2);
          border: 1px solid rgba(229, 57, 53, 0.4);
          color: #FF5252;
          font-size: 0.65rem;
          border-radius: 2px;
        }

        .search-form-bar {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .search-bar-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 8px 14px;
          border-radius: 4px;
        }

        .geocode-search-input {
          width: 100%;
          font-size: 0.88rem;
          color: var(--color-ivory);
        }

        .search-submit-btn {
          padding: 8px 20px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.78rem;
        }

        .atlas-main-grid {
          display: grid;
          grid-template-columns: 320px 1fr 360px;
          gap: 20px;
          height: calc(100vh - 220px);
          min-height: 560px;
        }

        .dynamic-panel-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          overflow-y: auto;
        }

        .active-mode-card {
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 12px;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .mode-title-bold {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-orange);
        }

        .coords-text {
          font-size: 0.68rem;
          color: var(--color-grey);
        }

        .radius-filter-block {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .radius-btn-group {
          display: flex;
          gap: 6px;
        }

        .radius-btn {
          flex: 1;
          padding: 6px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          font-size: 0.7rem;
          color: var(--color-grey);
        }

        .radius-btn.active {
          border-color: var(--color-orange);
          color: var(--color-orange);
          background: rgba(255, 100, 56, 0.12);
        }

        .radius-reports-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .no-reports-radius-box {
          padding: 14px;
          background: rgba(9, 10, 10, 0.4);
          border: 1px dashed var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-grey);
        }

        .radius-reports-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .radius-report-card {
          padding: 10px 12px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .radius-report-card:hover { border-color: var(--color-orange); }

        .rep-card-top { display: flex; justify-content: space-between; }
        .rep-id { font-size: 0.68rem; color: var(--color-grey); }
        .rep-title { font-size: 0.85rem; font-weight: 700; color: var(--color-ivory); }
        .rep-loc { font-size: 0.68rem; color: var(--color-grey); }
        .rep-coords { font-size: 0.65rem; color: var(--color-lime); }

        .map-view-wrapper {
          position: relative;
          overflow: hidden;
        }

        .map-legend-collapsible {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: rgba(9, 10, 10, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border-strong);
          border-radius: 4px;
          z-index: 500;
          overflow: hidden;
        }

        .legend-toggle-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          font-size: 0.68rem;
          color: var(--color-ivory);
          width: 100%;
          justify-content: space-between;
        }

        .legend-items-list {
          padding: 8px 12px 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.68rem;
          color: var(--color-grey);
          border-top: 1px solid var(--border-subtle);
        }

        .legend-row { display: flex; align-items: center; gap: 8px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
        .pin-blue { background: #29B6F6; }
        .pin-red { background: #FF5252; }
        .pin-orange { background: #FF6438; }
        .pin-grey { background: #858783; }
        .pin-lime { background: #C7F36B; }

        .selected-detail-box {
          padding: 14px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-strong);
          border-left: 4px solid var(--color-orange);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.75rem;
        }

        .detail-top { display: flex; justify-content: space-between; align-items: center; }
        .detail-title { font-size: 1.1rem; color: var(--color-ivory); }
        .detail-row { color: var(--color-grey); }

        .no-detail-prompt {
          padding: 16px;
          background: rgba(9, 10, 10, 0.4);
          border: 1px dashed var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-grey);
        }

        .alert-center-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(9, 10, 10, 0.8);
          backdrop-filter: blur(10px);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .alert-center-modal {
          width: 100%;
          max-width: 650px;
          max-height: 85vh;
          background: var(--bg-card);
          border: 1px solid var(--border-strong);
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-title-row { display: flex; align-items: center; gap: 10px; }

        .opt-settings-btn {
          padding: 6px 12px;
          background: rgba(240, 237, 228, 0.08);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          font-size: 0.68rem;
          color: var(--color-ivory);
        }

        .alert-settings-box {
          padding: 16px 20px;
          background: rgba(9, 10, 10, 0.8);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-size: 0.75rem;
        }

        .settings-field-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        .enable-notif-btn {
          padding: 8px 14px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 2px;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .alerts-scroll-list {
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .alert-item-card {
          padding: 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .alert-item-card.watch-card { border-left: 4px solid var(--color-amber); }

        .alt-top { display: flex; justify-content: space-between; }
        .alt-title { font-size: 0.95rem; color: var(--color-ivory); }
        .alt-loc { font-size: 0.7rem; color: var(--color-grey); }
        .alt-exp { font-size: 0.75rem; color: var(--color-ivory-muted); line-height: 1.4; }

        @media (max-width: 1100px) {
          .atlas-main-grid { grid-template-columns: 1fr; height: auto; }
        }
      `}</style>
    </div>
  );
}
