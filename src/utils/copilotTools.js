import { TARGET_LOCATIONS } from '../data/mockData.js';
import { getStoredReports } from './reportStorage.js';
import { calculateLocationRisk, interpretCitizenReportText } from './riskEngine.js';
import { isActiveIncident } from './incidentStatus.js';

/**
 * FloodShield Copilot Executable Tool Suite
 * Provides local evidence gathering & deterministic triage analysis
 */

export const COPILOT_TOOLS = {
  // Tool 1: Assess Flood Risk
  assess_flood_risk: (locationId = 'LOC-1') => {
    const loc = TARGET_LOCATIONS.find(l => l.id === locationId) || TARGET_LOCATIONS[0];
    const userReports = getStoredReports();
    const activeReports = userReports.filter(isActiveIncident);
    const risk = calculateLocationRisk({
      rainfallRate: 45,
      elevationM: loc.elevationM || 6,
      drainEfficiency: 55,
      incidentCount: activeReports.length,
      maxIncidentSeverity: activeReports[0]?.severity || 'MEDIUM',
      isSimulated: false
    });

    return {
      tool: 'assess_flood_risk',
      arguments: { locationId },
      result: {
        location: loc.name,
        locationId: loc.id,
        elevationM: loc.elevationM,
        riskScore: risk.riskScore,
        riskLevel: risk.riskLevel,
        contributingFactors: risk.contributingFactors,
        missingInputs: risk.missingInputs,
        confidenceLimitations: risk.confidenceLimitations
      }
    };
  },

  // Tool 2: Get Recent Reports
  get_recent_reports: (locationId) => {
    const userReports = getStoredReports();
    const reports = userReports.map(inc => ({
      id: inc.id,
      title: inc.title,
      location: inc.location,
      severity: inc.severity,
      waterDepthCm: inc.waterDepthCm,
      status: inc.status,
      timestamp: inc.timestamp
    }));

    return {
      tool: 'get_recent_reports',
      arguments: { locationId: locationId || 'ALL_LOCATIONS' },
      result: {
        totalReports: reports.length,
        reports
      }
    };
  },

  // Tool 3: Find Affected Facilities
  find_affected_facilities: (locationId) => {
    const facilities = [
      { name: "Riverside General Hospital Emergency Ward", distance: "400m", status: "ACCESS CLEAR VIA FLYOVER", criticalLevel: "HIGH" },
      { name: "City Central Metro Transit Gate 3", distance: "120m", status: "WATERLOGGED (55cm)", criticalLevel: "CRITICAL" },
      { name: "Sector 4 Primary School (Relief Camp)", distance: "850m", status: "SHELTER READY", criticalLevel: "MEDIUM" },
      { name: "Electrical Transformer Substation #9", distance: "300m", status: "DEWATERING PUMP DEPLOYED", criticalLevel: "CRITICAL" }
    ];

    return {
      tool: 'find_affected_facilities',
      arguments: { locationId: locationId || 'LOC-1' },
      result: {
        location: locationId || 'LOC-1',
        facilitiesCount: facilities.length,
        facilities
      }
    };
  },

  // Tool 4: Check Road Accessibility
  check_road_accessibility: (areaId) => {
    return {
      tool: 'check_road_accessibility',
      arguments: { areaId: areaId || 'Coastal & Transit Corridors' },
      result: {
        area: areaId || 'Coastal & Transit Corridors',
        overallAccessibility: 'CAUTION ADVISED',
        affectedRoads: [
          { segment: 'Low-Lying Underpass Link', status: 'IMPASSABLE (>50cm standing water)', vehicleRestriction: 'No Light Sedans' },
          { segment: 'Elevated Coastal Flyover Ramp', status: 'PASSABLE WITH CAUTION', vehicleRestriction: 'Open' },
          { segment: 'Arterial Ridge Highway', status: '100% CLEAR & ELEVATED', vehicleRestriction: 'Open All Vehicles' }
        ]
      }
    };
  },

  // Tool 5: Generate Recommended Actions
  generate_recommended_actions: (evidence) => {
    return {
      tool: 'generate_recommended_actions',
      arguments: { evidence: evidence || 'Monsoon Waterlogging & Arterial Inundation' },
      result: {
        citizenPrecautions: [
          'Avoid low-lying underpasses and pedestrian subways; prioritize elevated bypass routes.',
          'Do not drive standard vehicles through standing water exceeding 20cm.',
          'Secure ground-level electrical appliances if localized waterlogging rises above curb level.'
        ],
        responderPriorities: [
          'Deploy high-capacity mobile dewatering pump units to critical low-lying basins.',
          'Position traffic diversion barriers at arterial underpass entrances.',
          'Verify and triage citizen incident reports in the Incident Radar queue.'
        ]
      }
    };
  },

  // Tool 6: Interpret Citizen Report
  interpret_citizen_report: (text) => {
    const parsed = interpretCitizenReportText(text);
    return {
      tool: 'interpret_citizen_report',
      arguments: { text },
      result: parsed
    };
  }
};
