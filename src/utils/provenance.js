/**
 * FloodShield Incident Data Provenance Utilities
 * 
 * Determines and formats verifiable data source provenance labels.
 * 
 * Rules:
 * - Confirmed AWS API / DynamoDB source: 'AWS-SYNCED INCIDENT'
 * - Confirmed browser local storage source: 'LOCAL-ONLY INCIDENT'
 * - Source cannot be established: 'SOURCE UNVERIFIED'
 * - Never assume cloud sync merely because the API is available.
 */

export const PROVENANCE_LABELS = {
  AWS_SYNCED: 'AWS-SYNCED INCIDENT',
  LOCAL_ONLY: 'LOCAL-ONLY INCIDENT',
  UNVERIFIED: 'SOURCE UNVERIFIED'
};

/**
 * Determines the verifiable data-source label for an incident report.
 *
 * @param {Object} incident - Incident report object
 * @returns {string} Provenance label ('AWS-SYNCED INCIDENT' | 'LOCAL-ONLY INCIDENT' | 'SOURCE UNVERIFIED')
 */
export function getIncidentProvenanceLabel(incident) {
  if (!incident || typeof incident !== 'object') {
    return PROVENANCE_LABELS.UNVERIFIED;
  }

  const { dataMode, _source } = incident;

  // 1. Confirmed AWS API / DynamoDB source
  if (
    _source === 'AWS_API' ||
    dataMode === 'LIVE_AWS_DYNAMODB' ||
    dataMode === 'AWS_DYNAMODB'
  ) {
    return PROVENANCE_LABELS.AWS_SYNCED;
  }

  // 2. Confirmed browser local storage source
  if (
    _source === 'LOCAL_STORAGE' ||
    dataMode === 'USER-REPORTED · LOCAL STORAGE' ||
    dataMode === 'LOCAL_STORAGE' ||
    dataMode === 'LOCAL-ONLY'
  ) {
    return PROVENANCE_LABELS.LOCAL_ONLY;
  }

  // 3. Unverified or ambiguous source (never assume cloud sync)
  return PROVENANCE_LABELS.UNVERIFIED;
}

/**
 * Returns CSS badge class matching provenance level.
 *
 * @param {string} label - Provenance label
 * @returns {string} CSS badge class
 */
export function getProvenanceBadgeClass(label) {
  switch (label) {
    case PROVENANCE_LABELS.AWS_SYNCED:
      return 'badge-lime';
    case PROVENANCE_LABELS.LOCAL_ONLY:
      return 'badge-orange';
    case PROVENANCE_LABELS.UNVERIFIED:
    default:
      return 'badge-grey';
  }
}
