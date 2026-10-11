/**
 * FloodShield Incident Status & Active Incident Utilities
 *
 * Defines the application incident status lifecycle model and filtering logic.
 *
 * Status Lifecycle:
 * - UNVERIFIED: Initial citizen report awaiting official field/sensor corroboration.
 * - VERIFIED: Triage confirmed by emergency ops or municipal responders.
 * - DISPATCHED: Rescue / dewatering unit sent to incident location.
 * - RESOLVED: Inundation cleared or incident closed. (Excluded from active counts).
 */

export const INCIDENT_STATUSES = {
  ALL: 'ALL',
  UNVERIFIED: 'UNVERIFIED',
  VERIFIED: 'VERIFIED',
  DISPATCHED: 'DISPATCHED',
  RESOLVED: 'RESOLVED'
};

/**
 * Checks whether an incident is active in the application status model.
 * In FloodShield, RESOLVED incidents are closed and excluded from active counts.
 *
 * @param {Object} incident
 * @returns {boolean}
 */
export function isActiveIncident(incident) {
  if (!incident || typeof incident !== 'object') return false;
  const status = (incident.status || '').toUpperCase().trim();
  if (!status) return false;
  return status !== INCIDENT_STATUSES.RESOLVED;
}

/**
 * Calculates the number of active (unresolved) incidents in a list.
 *
 * @param {Array} incidents
 * @returns {number}
 */
export function getActiveIncidentsCount(incidents = []) {
  if (!Array.isArray(incidents)) return 0;
  return incidents.filter(isActiveIncident).length;
}

/**
 * Determines if an incident matches a specific status filter.
 *
 * @param {Object} incident
 * @param {string} filter - 'ALL' | 'UNVERIFIED' | 'VERIFIED' | 'DISPATCHED' | 'RESOLVED'
 * @returns {boolean}
 */
export function matchesStatusFilter(incident, filter = 'ALL') {
  if (!incident || typeof incident !== 'object') return false;
  if (!filter || filter === 'ALL') return true;

  const status = (incident.status || '').toUpperCase().trim();
  const targetFilter = filter.toUpperCase().trim();

  if (targetFilter === INCIDENT_STATUSES.UNVERIFIED) {
    return (
      status === INCIDENT_STATUSES.UNVERIFIED ||
      status.includes('UNVERIFIED') ||
      status.startsWith('SUBMITTED')
    );
  }

  return status === targetFilter;
}
