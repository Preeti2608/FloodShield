/**
 * Safe Passage Flood-Aware Route Assessment Engine
 * Evaluates route geometries against AWS-synced reports, citizen incidents, and NDMA alerts.
 */
import { calculateDistanceKm } from './distance.js';
import { isActiveIncident } from './incidentStatus.js';

/**
 * Determine if an incident has explicit confirmation of road closure.
 * Never labels an incident "Verified Closure" solely because water depth is high or status is verified.
 */
export function hasExplicitClosureConfirmation(r) {
  if (!r) return false;
  if (r.roadClosed === true || r.isClosed === true) return true;
  const combined = `${r.title || ''} ${r.description || ''} ${r.actionTaken || ''}`.toLowerCase();
  return /\b(road\s+closed|street\s+closed|corridor\s+closed|highway\s+closed|closed\s+to\s+traffic|road\s+closure|traffic\s+blocked|barricaded|shut\s+down)\b/.test(combined);
}

/**
 * Classify incident according to verifiable evidence.
 */
export function getIncidentClassification(r) {
  if (!r) {
    return {
      type: 'UNKNOWN',
      label: 'Unknown Condition',
      badgeClass: 'badge-grey',
      pinType: 'hazard_reported'
    };
  }

  const isVerified = r.status === 'VERIFIED';
  const hasClosure = hasExplicitClosureConfirmation(r);

  if (isVerified && hasClosure) {
    return {
      type: 'VERIFIED_CLOSURE',
      label: 'Verified Closure',
      badgeClass: 'badge-red',
      pinType: 'hazard_closure'
    };
  }

  if (isVerified) {
    return {
      type: 'VERIFIED_HAZARD',
      label: 'Verified Flood Hazard',
      badgeClass: 'badge-amber',
      pinType: 'hazard_verified'
    };
  }

  return {
    type: 'REPORTED_INCIDENT',
    label: 'Reported Incident',
    badgeClass: 'badge-orange',
    pinType: 'hazard_reported'
  };
}

/**
 * Format distance without misleading "0 km away" for sub-100m proximity.
 */
export function formatDistanceDisplay(distanceKm) {
  if (distanceKm == null || !isFinite(distanceKm)) return 'Unknown distance';
  if (distanceKm < 0.1) {
    const meters = Math.max(20, Math.round(distanceKm * 1000));
    return `< 100m away (~${meters}m)`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

/**
 * Format proximity to corridor without misleading "0 km".
 */
export function formatCorridorProximity(distanceKm) {
  if (distanceKm == null || !isFinite(distanceKm)) return 'Unknown proximity';
  if (distanceKm < 0.1) {
    const meters = Math.max(20, Math.round(distanceKm * 1000));
    return `< 100m from route corridor (~${meters}m)`;
  }
  return `${distanceKm.toFixed(1)} km from route corridor`;
}

/**
 * Calculate minimum distance from a point to route waypoints.
 */
export function calculateMinDistanceToRoute(lat, lng, waypoints) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Array.isArray(waypoints) || waypoints.length === 0) {
    return Infinity;
  }
  let minDist = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    if (Array.isArray(wp) && typeof wp[0] === 'number' && typeof wp[1] === 'number') {
      const d = calculateDistanceKm(lat, lng, wp[0], wp[1]);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

/**
 * Evaluates route geometry against active incident reports and official warnings.
 */
export function evaluateRouteCorridor(waypoints, reports = [], officialWarnings = [], thresholdKm = 1.5) {
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return {
      corridorHazards: [],
      verifiedClosures: [],
      verifiedHazards: [],
      reportedIncidents: [],
      officialAreaAlerts: [],
      nearestHazard: null,
      maxWaterDepthCm: 0,
      totalHazardsCount: 0
    };
  }

  // 1. Process active incident reports
  const corridorHazards = reports
    .filter(isActiveIncident)
    .filter(r => typeof r.lat === 'number' && typeof r.lng === 'number' && !isNaN(r.lat) && !isNaN(r.lng))
    .map(r => {
      const distanceKm = calculateMinDistanceToRoute(r.lat, r.lng, waypoints);
      const classification = getIncidentClassification(r);
      return {
        ...r,
        distanceKm,
        classification
      };
    })
    .filter(r => r.distanceKm <= thresholdKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const verifiedClosures = corridorHazards.filter(h => h.classification.type === 'VERIFIED_CLOSURE');
  const verifiedHazards = corridorHazards.filter(h => h.classification.type === 'VERIFIED_HAZARD');
  const reportedIncidents = corridorHazards.filter(h => h.classification.type === 'REPORTED_INCIDENT');

  // Max water depth reported along corridor
  let maxWaterDepthCm = 0;
  corridorHazards.forEach(h => {
    if (typeof h.waterDepthCm === 'number' && h.waterDepthCm > maxWaterDepthCm) {
      maxWaterDepthCm = h.waterDepthCm;
    }
  });

  // 2. Process official warnings (area-level alerts)
  const officialAreaAlerts = [];
  if (Array.isArray(officialWarnings)) {
    officialWarnings.forEach(w => {
      if (w.centroid && typeof w.centroid === 'string') {
        const parts = w.centroid.split(',').map(s => parseFloat(s.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const lat = parts[0] <= 40 ? parts[0] : parts[1];
          const lng = parts[0] <= 40 ? parts[1] : parts[0];
          const dist = calculateMinDistanceToRoute(lat, lng, waypoints);
          if (dist <= 15.0) {
            officialAreaAlerts.push({
              ...w,
              isAreaAlert: true,
              distanceKm: dist
            });
          }
        }
      } else if (w.isFloodRelated) {
        officialAreaAlerts.push({
          ...w,
          isAreaAlert: true,
          distanceKm: null
        });
      }
    });
  }

  return {
    corridorHazards,
    verifiedClosures,
    verifiedHazards,
    reportedIncidents,
    officialAreaAlerts,
    nearestHazard: corridorHazards[0] || null,
    maxWaterDepthCm,
    totalHazardsCount: corridorHazards.length
  };
}

/**
 * Compare two route options and determine recommendation with transparent rationale.
 * Never calls a route "safe" without supporting data.
 */
export function compareRouteOptions(lowlandAssessment, elevatedAssessment, routeData = {}) {
  const lowlandClosures = lowlandAssessment.verifiedClosures.length;
  const lowlandHazards = lowlandAssessment.verifiedHazards.length;
  const lowlandTotal = lowlandAssessment.totalHazardsCount;

  const elevatedClosures = elevatedAssessment.verifiedClosures.length;
  const elevatedHazards = elevatedAssessment.verifiedHazards.length;
  const elevatedTotal = elevatedAssessment.totalHazardsCount;

  // Case 1: Lowland has confirmed closures, elevated does not
  if (lowlandClosures > 0 && elevatedClosures === 0) {
    return {
      recommendedMode: 'ELEVATED',
      badgeLabel: 'LOWER REPORTED HAZARD EXPOSURE',
      badgeClass: 'badge-lime',
      rationaleTitle: 'CONFIRMED ROAD CLOSURE ON DIRECT LOWLAND PATH',
      rationaleText: `Direct lowland corridor has ${lowlandClosures} confirmed road closure(s). Elevated flyover detour bypasses the blocked underpass section.`,
      isTerrainAssumption: false
    };
  }

  // Case 2: Lowland has verified flood hazards or high depth, elevated has none
  if ((lowlandHazards > elevatedHazards || lowlandAssessment.maxWaterDepthCm >= 30) && elevatedTotal === 0) {
    return {
      recommendedMode: 'ELEVATED',
      badgeLabel: 'LOWER REPORTED HAZARD EXPOSURE',
      badgeClass: 'badge-lime',
      rationaleTitle: 'VERIFIED FLOOD HAZARD ON DIRECT LOWLAND PATH',
      rationaleText: `Direct lowland corridor passes near verified flood hazard(s) (peak reported depth: ${lowlandAssessment.maxWaterDepthCm} cm). Elevated ridge detour avoids this waterlogging.`,
      isTerrainAssumption: false
    };
  }

  // Case 3: Lowland has more total hazards than elevated
  if (lowlandTotal > elevatedTotal) {
    return {
      recommendedMode: 'ELEVATED',
      badgeLabel: 'LOWER REPORTED HAZARD EXPOSURE',
      badgeClass: 'badge-lime',
      rationaleTitle: 'ELEVATED DETOUR HAS FEWER REPORTED HAZARDS',
      rationaleText: `Elevated corridor passes near ${elevatedTotal} reported incident(s) compared to ${lowlandTotal} on direct lowland route.`,
      isTerrainAssumption: false
    };
  }

  // Case 4: Elevated has more hazards than lowland
  if (elevatedTotal > lowlandTotal && elevatedClosures === 0) {
    return {
      recommendedMode: 'LOWLAND',
      badgeLabel: 'LOWER REPORTED HAZARD EXPOSURE',
      badgeClass: 'badge-amber',
      rationaleTitle: 'DIRECT ROUTE HAS FEWER REPORTED HAZARDS',
      rationaleText: `Direct lowland corridor currently has fewer nearby reported incidents (${lowlandTotal} vs ${elevatedTotal} on detour).`,
      isTerrainAssumption: false
    };
  }

  // Case 5: 0 incidents reported on both routes
  if (lowlandTotal === 0 && elevatedTotal === 0) {
    return {
      recommendedMode: 'ELEVATED',
      badgeLabel: 'HAZARD-AWARE ROUTE ESTIMATE',
      badgeClass: 'badge-lime',
      rationaleTitle: 'TERRAIN ELEVATION PROFILE DETOUR',
      rationaleText: `Recommendation is based on terrain elevation profile (${routeData.safeElevationGain || '+18m flyover link'}) to preemptively bypass low-lying drainage catchments. 0 active incidents currently reported within 1.5 km of either route. Unmonitored road segments have unknown conditions.`,
      isTerrainAssumption: true
    };
  }

  // Case 6: Both have equal hazards
  return {
    recommendedMode: 'ELEVATED',
    badgeLabel: 'HAZARD-AWARE ROUTE ESTIMATE',
    badgeClass: 'badge-amber',
    rationaleTitle: 'SIMILAR REPORTED HAZARD EXPOSURE',
    rationaleText: `Both corridors have comparable reported incidents (${lowlandTotal} lowland, ${elevatedTotal} elevated). Elevated flyover provides higher terrain clearance (${routeData.safeElevationGain || '+18m'}). Proceed with caution.`,
    isTerrainAssumption: true
  };
}
