/**
 * FloodShield Alert Preferences and Genuine Alert Engine
 */
import { getIncidentProvenanceLabel } from './provenance.js';
import { isActiveIncident } from './incidentStatus.js';

const ALERT_PREFS_KEY = 'floodshield_alert_prefs_v1';

export function getAlertPreferences() {
  try {
    const raw = localStorage.getItem(ALERT_PREFS_KEY);
    if (!raw) return getDefaultPrefs();
    return JSON.parse(raw);
  } catch (e) {
    return getDefaultPrefs();
  }
}

function getDefaultPrefs() {
  return {
    useGpsLocation: false,
    selectedRadiusKm: 5,
    rainfallThresholdMmHr: 15,
    browserNotificationsEnabled: false
  };
}

export function saveAlertPreferences(prefs) {
  try {
    localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(prefs));
    return true;
  } catch (e) {
    return false;
  }
}

export async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) {
    return { supported: false, granted: false, message: 'Browser does not support desktop notifications.' };
  }

  if (Notification.permission === 'granted') {
    return { supported: true, granted: true, message: 'Notification permission already granted.' };
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    return {
      supported: true,
      granted,
      message: granted ? 'Notifications enabled successfully.' : 'Notification permission was denied.'
    };
  } catch (e) {
    return { supported: true, granted: false, message: e.message };
  }
}

/**
 * Generates genuine alert list based on verifiable weather data, real user reports, and genuine official warnings.
 * Never fabricates official alerts or labels sample/community data as official.
 */
export function generateGenuineAlerts(weatherData, userReports = [], radiusKm = 5, centerLat, centerLng, officialWarnings = []) {
  const alerts = [];

  // 1. Official Government Flood Warnings (only when genuine source provides them)
  if (Array.isArray(officialWarnings)) {
    officialWarnings.forEach(w => {
      alerts.push({
        id: w.id || `ALT-OFFICIAL-${Date.now()}`,
        category: 'OFFICIAL',
        type: 'OFFICIAL FLOOD WARNING',
        event: w.event || w.disasterType || 'Official Flood Warning',
        severity: w.severity || 'HIGH',
        severityLevel: w.severityLevel || w.severity || 'Normal',
        severityColor: w.severityColor || 'red',
        title: w.title || `OFFICIAL FLOOD WARNING: ${w.affectedArea || 'Notice'}`,
        location: w.affectedArea || w.location || 'Official Zone',
        affectedArea: w.affectedArea || w.location || 'Official Zone',
        source: w.source || 'Government Emergency Feed',
        sentTime: w.sentTime || null,
        issueTime: w.sentTime || w.issueTime || null,
        effectiveStartTime: w.effectiveStartTime || w.startTime || null,
        startTime: w.effectiveStartTime || w.startTime || null,
        effectiveEndTime: w.effectiveEndTime || w.endTime || w.expiry || null,
        endTime: w.effectiveEndTime || w.endTime || w.expiry || null,
        expiry: w.effectiveEndTime || w.expiry || w.endTime || null,
        timestamp: w.sentTime || w.effectiveStartTime || w.startTime || null,
        originalAlertLink: w.originalAlertLink || 'https://sachet.ndma.gov.in/CapFeed',
        capXmlUrl: w.capXmlUrl || null,
        centroid: w.centroid || null,
        explanation: w.description || w.warningMessage || 'Official flood warning advisory issued by civil defense authority.'
      });
    });
  }

  // 2. Weather Watch Alert (Based on real Open-Meteo rainfall rate)
  const prefs = getAlertPreferences();
  const threshold = prefs.rainfallThresholdMmHr || 15;

  if (weatherData && weatherData.success && weatherData.precipitationMmHr >= threshold) {
    alerts.push({
      id: `ALT-WX-${Date.now()}`,
      category: 'WEATHER',
      type: 'WEATHER WATCH',
      severity: weatherData.precipitationMmHr > 40 ? 'HIGH' : 'MEDIUM',
      title: `HEAVY RAINFALL WATCH (${weatherData.precipitationMmHr} mm/h)`,
      location: `Coordinates ${weatherData.latitude?.toFixed(2)}°N, ${weatherData.longitude?.toFixed(2)}°E`,
      source: 'Open-Meteo Real Weather Feed',
      timestamp: weatherData.timestamp,
      explanation: `Live precipitation rate of ${weatherData.precipitationMmHr} mm/h exceeds configured watch threshold of ${threshold} mm/h.`
    });
  }

  // 3. User-Reported Incident Alerts (Active only, with truthful provenance)
  userReports.filter(isActiveIncident).forEach(report => {
    alerts.push({
      id: `ALT-REP-${report.id}`,
      category: 'COMMUNITY',
      type: 'USER-REPORTED INCIDENT',
      severity: report.severity || 'MEDIUM',
      title: report.title,
      location: report.location,
      source: getIncidentProvenanceLabel(report),
      timestamp: report.timestamp,
      waterDepthCm: report.waterDepthCm,
      status: report.status,
      explanation: `User report: ${report.description || 'No description provided'}`
    });
  });

  return alerts;
}
