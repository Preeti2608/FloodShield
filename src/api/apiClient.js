import { DATA_MODES } from '../types/apiTypes.js';
import { fetchRealWeather } from './weatherApi.js';
import { calculateLocationRisk } from '../utils/riskEngine.js';
import { getStoredReports, saveUserReport, updateStoredReportStatus } from '../utils/reportStorage.js';
import { matchesStatusFilter, isActiveIncident } from '../utils/incidentStatus.js';
import { COPILOT_TOOLS } from '../utils/copilotTools.js';

export function getApiBaseUrl() {
  return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || '';
}

export function getUseMockData() {
  const val = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK_DATA) || (typeof process !== 'undefined' && process.env?.VITE_USE_MOCK_DATA);
  return val === 'true';
}

/**
 * Checks backend health status honestly
 */
export async function getHealth() {
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (!API_BASE_URL || USE_MOCK_DATA) {
    return {
      status: 'LOCAL_MODE',
      connected: false,
      dataMode: DATA_MODES.USER_REPORTED,
      message: 'Running in local client mode (VITE_API_BASE_URL is not set or mock mode is active)',
      timestamp: new Date().toISOString()
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        ...data,
        connected: true,
        dataMode: DATA_MODES.LIVE,
        timestamp: new Date().toISOString()
      };
    }
  } catch (e) {
    console.warn('[FloodShield Client] Backend health check failed:', e.message);
  }

  return {
    status: 'UNAVAILABLE',
    connected: false,
    dataMode: DATA_MODES.UNAVAILABLE,
    message: 'Backend AWS API Gateway endpoint unreachable; using local browser storage.',
    timestamp: new Date().toISOString()
  };
}

export const SACHET_PORTAL_URL = 'https://sachet.ndma.gov.in/CapFeed';
export const SACHET_API_DIRECT = 'https://sachet.ndma.gov.in/cap_public_website/FetchAllAlertDetails';
export const SACHET_API_PROXY = '/api-sachet/cap_public_website/FetchAllAlertDetails';

let _lastSuccessfulFetchTime = null;

/**
 * Safely parses an NDMA SACHET date string with an explicit Asia/Kolkata (+05:30) timezone.
 * Returns standard ISO 8601 string, or null if invalid/missing.
 * Never fabricates timestamps or relies on browser-dependent "IST" timezone parsing.
 */
export function parseSachetDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr.toISOString();
  }
  if (typeof dateStr === 'number') {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Handles NDMA format: 'Sun Oct 11 14:49:00 IST 2026', 'Oct 11 14:49:00 IST 2026',
  // or with comma: 'Sun, Oct 11 14:49:00 IST 2026'
  const istMatch = trimmed.match(/^(?:[A-Za-z]{3},?\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+IST\s+(\d{4})$/i);
  if (istMatch) {
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monthNum = months[istMatch[1].toLowerCase()];
    if (monthNum) {
      const dayPadded = istMatch[2].padStart(2, '0');
      const isoWithOffset = `${istMatch[6]}-${monthNum}-${dayPadded}T${istMatch[3]}:${istMatch[4]}:${istMatch[5]}+05:30`;
      const parsed = new Date(isoWithOffset);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  // Handles '11 Oct 2026 14:49:00 IST' or 'Sun, 11 Oct 2026 14:49:00 IST'
  const istMatchAlt = trimmed.match(/^(?:[A-Za-z]{3},?\s+)?(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+IST$/i);
  if (istMatchAlt) {
    const months = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const monthNum = months[istMatchAlt[2].toLowerCase()];
    if (monthNum) {
      const dayPadded = istMatchAlt[1].padStart(2, '0');
      const isoWithOffset = `${istMatchAlt[3]}-${monthNum}-${dayPadded}T${istMatchAlt[4]}:${istMatchAlt[5]}:${istMatchAlt[6]}+05:30`;
      const parsed = new Date(isoWithOffset);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  // Handles YYYY-MM-DD HH:mm:ss IST
  const istMatchIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+IST$/i);
  if (istMatchIso) {
    const isoWithOffset = `${istMatchIso[1]}-${istMatchIso[2]}-${istMatchIso[3]}T${istMatchIso[4]}:${istMatchIso[5]}:${istMatchIso[6]}+05:30`;
    const parsed = new Date(isoWithOffset);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // Handle standard ISO or RFC date strings
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  return null;
}

/**
 * Safely format time string or timestamp consistently in Asia/Kolkata (+05:30).
 * Returns "Time unavailable" if missing or invalid.
 */
export function formatAlertTime(val) {
  if (!val) return 'Time unavailable';
  let d;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date(val);
  } else if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return 'Time unavailable';
    const parsedIso = parseSachetDate(s);
    d = parsedIso ? new Date(parsedIso) : new Date(s);
  } else {
    return 'Time unavailable';
  }
  if (!d || isNaN(d.getTime())) return 'Time unavailable';
  try {
    const formatted = d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit'
    });
    if (!formatted || formatted.toLowerCase().includes('invalid')) {
      return 'Time unavailable';
    }
    return formatted;
  } catch {
    return 'Time unavailable';
  }
}

/**
 * Safely format date & time string or timestamp consistently in Asia/Kolkata (+05:30).
 * Includes both month, day, and time in Indian Standard Time (IST).
 * Returns "Time unavailable" if missing or invalid.
 */
export function formatAlertDateTime(val) {
  if (!val) return 'Time unavailable';
  let d;
  if (val instanceof Date) {
    d = val;
  } else if (typeof val === 'number') {
    d = new Date(val);
  } else if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return 'Time unavailable';
    const parsedIso = parseSachetDate(s);
    d = parsedIso ? new Date(parsedIso) : new Date(s);
  } else {
    return 'Time unavailable';
  }
  if (!d || isNaN(d.getTime())) return 'Time unavailable';
  try {
    const formatted = d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    if (!formatted || formatted.toLowerCase().includes('invalid')) {
      return 'Time unavailable';
    }
    return formatted;
  } catch {
    return 'Time unavailable';
  }
}

/**
 * Normalizes an alert from NDMA SACHET's official feed into FloodShield schema.
 * Audited timestamp semantics:
 * - <cap:sent>: sent/issued time (when the agency released the alert)
 * - <cap:effective>: effective/start time (when the hazard event begins)
 * - <cap:expires>: expiry time (valid until)
 * Never invents timestamps or claims an alert was released at an effective start time.
 */
export function parseSachetAlert(raw) {
  const isFloodRelated = /flood|rain|inundat|water|river|dam|monsoon|cyclone|depression|storm|barrage/i.test(
    `${raw.disaster_type || ''} ${raw.warning_message || ''}`
  );

  const identifierStr = raw.identifier ? String(raw.identifier) : String(raw.alert_id_sdma_autoinc || Date.now());

  // 1. Sent / Issued time: represents when the alert message was originated/released by the agency (<cap:sent>)
  const rawSent = raw.sent || raw.sent_time || raw.issue_time || raw.issued || null;
  const parsedSent = parseSachetDate(rawSent);

  // 2. Effective / Start time: represents when the hazard event/alert takes effect (<cap:effective>)
  const rawEffective = raw.effective_start_time || raw.effective || raw.start_time || null;
  const parsedEffective = parseSachetDate(rawEffective);

  // 3. Expiry / End time: represents when the alert expires ("Valid until") (<cap:expires>)
  const rawExpires = raw.effective_end_time || raw.expires || raw.expiry || raw.end_time || null;
  const parsedExpires = parseSachetDate(rawExpires);

  return {
    id: `SACHET-${identifierStr}`,
    identifier: identifierStr,
    source: raw.alert_source || 'NDMA / SDMA (Government of India)',
    event: raw.disaster_type || 'Civil Alert',
    disasterType: raw.disaster_type || 'Civil Alert',
    affectedArea: (raw.area_description || 'Region Unspecified').trim(),
    severity: (raw.severity || raw.severity_level || 'ALERT').toUpperCase(),
    severityLevel: raw.severity_level || raw.severity || 'Normal',
    severityColor: raw.severity_color || 'orange',

    // Timestamp semantics audit:
    // Actual Sent/Issued time (only if provided in source data, never fabricated)
    rawSentTime: rawSent,
    sentTime: parsedSent,
    issueTime: parsedSent, // null if feed only provides effective_start_time

    // Effective start time of hazard (<cap:effective>)
    rawEffectiveStartTime: rawEffective,
    effectiveStartTime: parsedEffective,
    rawStartTime: rawEffective, // backwards compatibility
    startTime: parsedEffective, // backwards compatibility

    // Expiry time of alert (<cap:expires>)
    rawExpiryTime: rawExpires,
    effectiveEndTime: parsedExpires,
    expiry: parsedExpires,
    rawEndTime: rawExpires, // backwards compatibility
    endTime: parsedExpires, // backwards compatibility

    title: `${raw.disaster_type || 'Civil Alert'}: ${(raw.area_description || 'Warning Zone').trim()}`,
    description: raw.warning_message || `${raw.disaster_type} alert issued by ${raw.alert_source || 'civil defense'}.`,
    originalAlertLink: SACHET_PORTAL_URL,
    capXmlUrl: raw.identifier ? `https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${raw.identifier}` : null,
    centroid: raw.centroid || null,
    isFloodRelated,
    _source: 'OFFICIAL_NDMA_SACHET'
  };
}

/**
 * Fetch Official Flood Warnings from genuine NDMA SACHET CAP feed or cloud backend.
 * Never fabricates official warnings or labels sample/weather/citizen data as official.
 */
export async function getOfficialWarnings(options = {}) {
  const filterFloodOnly = options.filterFloodOnly !== false;
  const timeoutMs = options.timeoutMs || 6000;

  // In browser environments, first try local dev proxy if configured
  const isBrowser = typeof window !== 'undefined';
  const urlsToTry = isBrowser
    ? [SACHET_API_PROXY, SACHET_API_DIRECT]
    : [SACHET_API_DIRECT];

  let rawData = null;
  let fetchSucceeded = false;
  let isCorsBlocked = false;
  let lastError = null;

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const text = await res.text();
        if (text && (text.startsWith('[') || text.startsWith('{'))) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            rawData = parsed;
            fetchSucceeded = true;
            break;
          }
        }
      }
    } catch (err) {
      lastError = err;
      if (isBrowser && (err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError'))) {
        isCorsBlocked = true;
      }
    }
  }

  // 1. If live NDMA SACHET feed was fetched successfully
  if (fetchSucceeded && Array.isArray(rawData)) {
    _lastSuccessfulFetchTime = new Date().toISOString();
    const allAlerts = rawData.map(parseSachetAlert);
    const floodAlerts = filterFloodOnly ? allAlerts.filter(a => a.isFloodRelated) : allAlerts;

    if (floodAlerts.length > 0) {
      return {
        connected: true,
        status: 'LIVE_OFFICIAL_FEED',
        isCorsBlocked: false,
        source: 'NDMA SACHET Portal (Govt of India)',
        portalUrl: SACHET_PORTAL_URL,
        warnings: floodAlerts,
        allAlerts,
        count: floodAlerts.length,
        totalNationalAlerts: allAlerts.length,
        timestamp: _lastSuccessfulFetchTime,
        lastSuccessfulFetch: _lastSuccessfulFetchTime
      };
    } else {
      return {
        connected: true,
        status: 'NO_ACTIVE_ALERTS',
        isCorsBlocked: false,
        source: 'NDMA SACHET Portal (Govt of India)',
        portalUrl: SACHET_PORTAL_URL,
        warnings: [],
        allAlerts,
        count: 0,
        totalNationalAlerts: allAlerts.length,
        message: `Live NDMA SACHET stream connected (${allAlerts.length} national disaster advisories active). No active flood or heavy rainfall warnings are currently issued.`,
        timestamp: _lastSuccessfulFetchTime,
        lastSuccessfulFetch: _lastSuccessfulFetchTime
      };
    }
  }

  // 2. Fallback: Honest unavailable or CORS-blocked state
  return {
    connected: false,
    status: 'FEED_UNAVAILABLE',
    isCorsBlocked: isCorsBlocked,
    source: 'NDMA SACHET Portal (Govt of India)',
    portalUrl: SACHET_PORTAL_URL,
    error: isCorsBlocked
      ? 'Direct browser access blocked by NDMA Sachet CORS policy' 
      : (lastError ? `Feed currently unavailable: ${lastError.message}` : 'Official warning feed currently unavailable'),
    message: isCorsBlocked
      ? 'The official NDMA SACHET CAP feed is active at https://sachet.ndma.gov.in/CapFeed, but does not provide Access-Control-Allow-Origin headers for direct browser requests. Institutional civil protection feeds require server proxy.'
      : 'Live official government alert streams (NDMA SACHET / CWC / IMD) are currently unreachable. Direct portal verification is recommended.',
    warnings: [],
    allAlerts: [],
    count: 0,
    totalNationalAlerts: 0,
    timestamp: new Date().toISOString(),
    lastSuccessfulFetch: _lastSuccessfulFetchTime
  };
}

/**
 * Fetch Weather from Open-Meteo Public API
 */
export async function getWeather(lat = 19.0760, lng = 72.8777) {
  return fetchRealWeather(lat, lng);
}

/**
 * Calculate or Fetch Risk Assessment
 */
export async function getRisk(locationId = 'LOC-1', lat = 19.0760, lng = 72.8777) {
  // 1. Fetch live Open-Meteo weather
  const weather = await fetchRealWeather(lat, lng);
  const realPrecipitation = weather.success ? weather.precipitationMmHr : 30;

  // 2. Try AWS Backend if configured
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const url = `${API_BASE_URL}/risk?lat=${lat}&lng=${lng}&locationId=${encodeURIComponent(locationId)}&rainfall=${realPrecipitation}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const cloudData = await res.json();
        return {
          ...cloudData,
          weatherSource: weather.source,
          precipitationMmHr: realPrecipitation,
          dataMode: DATA_MODES.LIVE
        };
      }
    } catch (e) {
      console.warn('[FloodShield Client] Falling back to local risk calculation:', e.message);
    }
  }

  // 3. Fallback: Local deterministic calculation
  const userReports = getStoredReports();
  const activeReports = userReports.filter(isActiveIncident);
  const riskResult = calculateLocationRisk({
    rainfallRate: realPrecipitation,
    elevationM: 6,
    drainEfficiency: 60,
    incidentCount: activeReports.length,
    maxIncidentSeverity: activeReports[0]?.severity || 'LOW'
  });

  return {
    locationId,
    coordinates: { lat, lng },
    weatherSource: weather.source,
    precipitationMmHr: realPrecipitation,
    riskScore: riskResult.riskScore,
    riskLevel: riskResult.riskLevel,
    contributingFactors: riskResult.contributingFactors,
    missingInputs: [
      'Municipal Stream Gauge Telemetry (Awaiting Physical Sensors)',
      'Sub-surface Soil Saturation Index'
    ],
    confidenceLimitations: weather.success
      ? 'Rainfall derived from live Open-Meteo feed. Multi-factor terrain formula applied.'
      : 'Live weather feed unavailable. Risk estimate baseline.',
    dataMode: weather.success ? DATA_MODES.LIVE : DATA_MODES.USER_REPORTED,
    timestamp: new Date().toISOString()
  };
}

/**
 * Submit Citizen Report: Synchronizes to AWS DynamoDB if configured, and persists locally
 */
export async function submitReport(reportPayload) {
  // Always save locally first to guarantee persistence
  const localResult = saveUserReport(reportPayload);

  // If live AWS backend configured, synchronize to DynamoDB
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const cloudData = await res.json();
        const rawTicket = cloudData.ticket || localResult.report;
        return {
          success: true,
          persistedToCloud: true,
          dataMode: 'LIVE_AWS_DYNAMODB',
          ticket: {
            ...rawTicket,
            dataMode: 'LIVE_AWS_DYNAMODB',
            _source: 'AWS_API'
          }
        };
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        console.warn('[FloodShield Client] Cloud report submission failed (HTTP error):', errorMsg);
        if (localResult.success) {
          return {
            success: true,
            persistedToCloud: false,
            cloudFailed: true,
            cloudError: `AWS DynamoDB sync failed (${errorMsg}). Saved to browser storage only.`,
            dataMode: 'USER-REPORTED · LOCAL STORAGE',
            ticket: {
              ...localResult.report,
              dataMode: 'USER-REPORTED · LOCAL STORAGE',
              _source: 'LOCAL_STORAGE'
            }
          };
        }
      }
    } catch (err) {
      console.warn('[FloodShield Client] Cloud report submission failed (network):', err.message);
      if (localResult.success) {
        return {
          success: true,
          persistedToCloud: false,
          cloudFailed: true,
          cloudError: `AWS DynamoDB sync failed (${err.message}). Saved to browser storage only.`,
          dataMode: 'USER-REPORTED · LOCAL STORAGE',
          ticket: {
            ...localResult.report,
            dataMode: 'USER-REPORTED · LOCAL STORAGE',
            _source: 'LOCAL_STORAGE'
          }
        };
      }
    }
  }

  if (localResult.success) {
    return {
      success: true,
      persistedToCloud: false,
      dataMode: 'USER-REPORTED · LOCAL STORAGE',
      ticket: {
        ...localResult.report,
        dataMode: 'USER-REPORTED · LOCAL STORAGE',
        _source: 'LOCAL_STORAGE'
      }
    };
  } else {
    return {
      success: false,
      persistedToCloud: false,
      error: localResult.error || 'Failed to save incident report'
    };
  }
}

/**
 * Fetch Incident Reports from AWS DynamoDB or browser LocalStorage
 */
export async function getReports(statusFilter = 'ALL') {
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const q = statusFilter && statusFilter !== 'ALL' ? `?status=${encodeURIComponent(statusFilter)}` : '';
      const res = await fetch(`${API_BASE_URL}/reports${q}`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const cloudData = await res.json();
        const rawReports = cloudData.reports || [];
        const reports = rawReports.map(r => ({
          ...r,
          dataMode: r.dataMode || 'LIVE_AWS_DYNAMODB',
          _source: 'AWS_API'
        }));
        return {
          reports,
          dataMode: 'LIVE_AWS_DYNAMODB',
          timestamp: cloudData.timestamp || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('[FloodShield Client] Cloud reports fetch failed, falling back to local storage:', err.message);
    }
  }

  const localReports = getStoredReports();
  const filtered = statusFilter && statusFilter !== 'ALL'
    ? localReports.filter(r => matchesStatusFilter(r, statusFilter))
    : localReports;

  const markedReports = filtered.map(r => ({
    ...r,
    dataMode: r.dataMode || 'USER-REPORTED · LOCAL STORAGE',
    _source: 'LOCAL_STORAGE'
  }));

  return {
    reports: markedReports,
    dataMode: markedReports.length > 0 ? 'USER-REPORTED · LOCAL STORAGE' : DATA_MODES.UNAVAILABLE,
    timestamp: new Date().toISOString()
  };
}

/**
 * Update Incident Status (Triage Action)
 */
export async function updateReportStatus(reportId, newStatus, actionText) {
  // Update local replica in browser storage
  const localRes = updateStoredReportStatus(reportId, newStatus, actionText);

  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE_URL}/reports/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: newStatus, actionText }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const cloudData = await res.json();
        return {
          success: true,
          persistedToCloud: true,
          dataMode: 'LIVE_AWS_DYNAMODB',
          report: cloudData.report
        };
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${res.status}`;
        console.warn('[FloodShield Client] Cloud status update failed (HTTP error):', errorMsg);
        return {
          success: localRes.success,
          persistedToCloud: false,
          cloudFailed: true,
          error: `AWS status update failed: ${errorMsg}. Persisted locally only.`,
          dataMode: 'USER-REPORTED · LOCAL STORAGE'
        };
      }
    } catch (err) {
      console.warn('[FloodShield Client] Cloud status update failed (network):', err.message);
      return {
        success: localRes.success,
        persistedToCloud: false,
        cloudFailed: true,
        error: `AWS status update failed: ${err.message}. Persisted locally only.`,
        dataMode: 'USER-REPORTED · LOCAL STORAGE'
      };
    }
  }

  return {
    success: localRes.success,
    persistedToCloud: false,
    localOnly: true,
    dataMode: 'USER-REPORTED · LOCAL STORAGE'
  };
}

/**
 * Response Copilot: Tactical Assessment via AWS Bedrock / Lambda or Local Tool Suite
 */
export async function assessWithCopilot(prompt, locationId = 'LOC-1') {
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE_URL}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, locationId }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('[FloodShield Client] Cloud copilot assessment failed, using local engine:', err.message);
    }
  }

  // Local Triage Fallback Engine
  const riskEval = COPILOT_TOOLS.assess_flood_risk(locationId);
  const reportsEval = COPILOT_TOOLS.get_recent_reports();
  const facilitiesEval = COPILOT_TOOLS.find_affected_facilities(locationId);
  const roadsEval = COPILOT_TOOLS.check_road_accessibility();
  const actionsEval = COPILOT_TOOLS.generate_recommended_actions();

  const fallbackAdvice = `Based on deterministic analysis of ${reportsEval.result.totalReports} citizen report(s) and elevation profile for ${riskEval.result.location}:\n\n` +
    `• Flood Risk Level: ${riskEval.result.riskLevel} (Score ${riskEval.result.riskScore}/100).\n` +
    `• Road Access: Arterial flyovers remain open; avoid low-lying underpasses.\n` +
    `• Facilities: ${facilitiesEval.result.facilities[0]?.name} access operational; subway stations experience standing water.\n` +
    `• Precaution: Stay above 20cm water level and monitor official emergency alerts.`;

  return {
    success: true,
    provider: 'Local Deterministic Decision Engine (Client-Side)',
    query: prompt,
    advice: fallbackAdvice,
    evidence: {
      totalReports: reportsEval.result.totalReports,
      facilities: facilitiesEval.result.facilities,
      roadCorridors: roadsEval.result.affectedRoads
    },
    recommendations: {
      citizenPrecautions: actionsEval.result.citizenPrecautions,
      responderPriorities: actionsEval.result.responderPriorities
    },
    disclaimer: 'Calculated tactical decision support. Verify ground conditions with official civil authorities before deployment.',
    timestamp: new Date().toISOString()
  };
}

/**
 * Backend Hydrodynamic Simulation
 */
export async function simulateScenarioBackend(params) {
  const API_BASE_URL = getApiBaseUrl();
  const USE_MOCK_DATA = getUseMockData();

  if (API_BASE_URL && !USE_MOCK_DATA) {
    try {
      const res = await fetch(`${API_BASE_URL}/scenarios/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('[FloodShield Client] Backend simulation failed, using local model:', e.message);
    }
  }

  // Local formula
  const { rainfallRate = 65, surgeHeight = 1.5, drainEfficiency = 50, durationHours = 4 } = params;
  const peakDepthCm = Math.round((rainfallRate * 0.7) + (surgeHeight * 18) + ((100 - drainEfficiency) * 0.45));
  const timeToInundationMin = Math.max(10, Math.round(120 - (rainfallRate * 0.6) - (surgeHeight * 12)));

  return {
    simulated: true,
    inputs: params,
    outputs: {
      peakDepthCm,
      timeToInundationMin,
      scenarioRiskLevel: peakDepthCm >= 60 ? 'HIGH' : 'MODERATE'
    },
    timestamp: new Date().toISOString()
  };
}
