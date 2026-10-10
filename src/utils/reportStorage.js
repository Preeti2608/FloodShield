/**
 * FloodShield Reliable Browser Local Storage Persistence
 * Manages user-submitted incident reports in localStorage with strict coordinate integrity.
 */

const STORAGE_KEY = 'floodshield_user_reports_v1';

export function getStoredReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn('[FloodShield Storage] Corrupted reports key, clearing storage:', e);
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveUserReport(reportInput) {
  try {
    const existing = getStoredReports();
    
    // Explicit coordinate validation: Ensure lat & lng are valid numbers or null
    const lat = (typeof reportInput.lat === 'number' && !isNaN(reportInput.lat)) ? reportInput.lat : null;
    const lng = (typeof reportInput.lng === 'number' && !isNaN(reportInput.lng)) ? reportInput.lng : null;

    const newReport = {
      id: `INC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      title: reportInput.title ? reportInput.title.trim() : 'Incident Report',
      category: reportInput.category || 'Waterlogging',
      location: reportInput.location ? reportInput.location.trim() : 'Unspecified Location',
      lat: lat,
      lng: lng,
      waterDepthCm: Number(reportInput.waterDepthCm) || 10,
      severity: reportInput.severity || 'MEDIUM',
      description: reportInput.description ? reportInput.description.trim() : '',
      photoUrl: reportInput.photoUrl || null,
      timestamp: new Date().toISOString(),
      dataMode: 'USER-REPORTED · LOCAL STORAGE',
      status: 'SUBMITTED (UNVERIFIED BY SERVER)',
      actionHistory: [
        `Submitted via Citizen Portal at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      ]
    };

    // Prevent duplicate submission
    const isDuplicate = existing.some(r => 
      r.title === newReport.title && 
      r.description === newReport.description &&
      (Date.now() - new Date(r.timestamp).getTime()) < 2000
    );

    if (isDuplicate) {
      console.warn('[FloodShield Storage] Duplicate submission prevented.');
      return { success: false, duplicate: true, report: existing[0] };
    }

    const updated = [newReport, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return { success: true, report: newReport, allReports: updated };
  } catch (e) {
    console.error('[FloodShield Storage] Failed to save report:', e);
    return { success: false, error: e.message };
  }
}

export function clearStoredReports() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}
