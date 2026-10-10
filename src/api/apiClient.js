import { DATA_MODES } from '../types/apiTypes';
import { fetchRealWeather } from './weatherApi';
import { calculateLocationRisk, interpretCitizenReportText } from '../utils/riskEngine';
import { getStoredReports, saveUserReport } from '../utils/reportStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * GET /health — Checks backend status honestly
 */
export async function getHealth() {
  if (!API_BASE_URL) {
    return {
      status: 'UNAVAILABLE',
      dataMode: DATA_MODES.UNAVAILABLE,
      message: 'AWS API Gateway URL not configured (VITE_API_BASE_URL is empty)',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        dataMode: DATA_MODES.LIVE,
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) {
    // API Gateway unreachable
  }

  return {
    status: 'UNAVAILABLE',
    dataMode: DATA_MODES.UNAVAILABLE,
    message: 'Backend AWS API Gateway Endpoint Unreachable',
    timestamp: new Date().toISOString()
  };
}

/**
 * GET /weather — Open-Meteo Real Weather Feed
 */
export async function getWeather(lat = 19.0760, lng = 72.8777) {
  return fetchRealWeather(lat, lng);
}

/**
 * GET /risk?locationId=...
 */
export async function getRisk(locationId = 'DEFAULT_ZONE', lat = 19.0760, lng = 72.8777) {
  const weather = await fetchRealWeather(lat, lng);
  const realPrecipitation = weather.success ? weather.precipitationMmHr : 0;
  const userReports = getStoredReports();

  const riskResult = calculateLocationRisk({
    rainfallRate: realPrecipitation,
    elevationM: 6,
    drainEfficiency: 60,
    incidentCount: userReports.length,
    maxIncidentSeverity: userReports[0]?.severity || 'LOW'
  });

  return {
    locationId,
    weatherSource: weather.source,
    precipitationMmHr: realPrecipitation,
    riskScore: riskResult.riskScore,
    riskLevel: riskResult.riskLevel,
    contributingFactors: riskResult.contributingFactors,
    missingInputs: [
      'Municipal Stream Gauge Telemetry (Awaiting Backend Deployment)',
      'Sub-surface Soil Saturation Index'
    ],
    confidenceLimitations: weather.success
      ? 'Rainfall factor derived from live Open-Meteo public weather feed. Stream gauge telemetry sensors awaiting AWS deployment.'
      : 'Live weather feed unavailable. Risk score calculation paused.',
    dataMode: weather.success ? DATA_MODES.LIVE : DATA_MODES.UNAVAILABLE,
    timestamp: weather.timestamp || new Date().toISOString()
  };
}

/**
 * POST /reports — Saves report reliably into localStorage
 */
export async function submitReport(reportPayload) {
  const result = saveUserReport(reportPayload);

  if (result.success) {
    return {
      success: true,
      dataMode: 'USER-REPORTED · LOCAL STORAGE',
      ticket: result.report
    };
  } else {
    return {
      success: false,
      error: result.error || 'Failed to save report to browser local storage'
    };
  }
}

/**
 * GET /reports — Reads user reports from localStorage
 */
export async function getReports() {
  const userReports = getStoredReports();
  return {
    reports: userReports,
    dataMode: userReports.length > 0 ? 'USER-REPORTED · LOCAL STORAGE' : DATA_MODES.UNAVAILABLE,
    timestamp: new Date().toISOString()
  };
}
