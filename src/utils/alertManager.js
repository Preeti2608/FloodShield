/**
 * FloodShield Alert Preferences and Genuine Alert Engine
 */

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
 * Generates genuine alert list based on verifiable weather data & real user reports
 */
export function generateGenuineAlerts(weatherData, userReports = [], radiusKm = 5, centerLat, centerLng) {
  const alerts = [];

  // 1. Weather Watch Alert (Based on real Open-Meteo rainfall rate)
  const prefs = getAlertPreferences();
  const threshold = prefs.rainfallThresholdMmHr || 15;

  if (weatherData && weatherData.success && weatherData.precipitationMmHr >= threshold) {
    alerts.push({
      id: `ALT-WX-${Date.now()}`,
      type: 'WEATHER WATCH',
      severity: weatherData.precipitationMmHr > 40 ? 'HIGH' : 'MEDIUM',
      title: `HEAVY RAINFALL WATCH (${weatherData.precipitationMmHr} mm/h)`,
      location: `Coordinates ${weatherData.latitude?.toFixed(2)}°N, ${weatherData.longitude?.toFixed(2)}°E`,
      source: 'Open-Meteo Real Weather Feed',
      timestamp: weatherData.timestamp,
      explanation: `Live precipitation rate of ${weatherData.precipitationMmHr} mm/h exceeds configured watch threshold of ${threshold} mm/h.`
    });
  }

  // 2. User-Reported Incident Alerts
  userReports.forEach(report => {
    alerts.push({
      id: `ALT-REP-${report.id}`,
      type: 'USER-REPORTED INCIDENT',
      severity: report.severity || 'MEDIUM',
      title: report.title,
      location: report.location,
      source: 'Citizen Incident Report (Local Storage)',
      timestamp: report.timestamp,
      explanation: `User report: ${report.description || 'No description provided'}`
    });
  });

  // 3. Official Warning Status
  alerts.push({
    id: 'ALT-OFFICIAL-NONE',
    type: 'OFFICIAL FLOOD WARNING',
    severity: 'INFO',
    title: 'OFFICIAL WARNING STREAM DISCONNECTED',
    location: 'Nationwide / Ward Level',
    source: 'Civil Emergency Defense Stream',
    timestamp: new Date().toISOString(),
    explanation: 'Awaiting backend deployment of AWS official civil defense warning feed (POST /assess).'
  });

  return alerts;
}
