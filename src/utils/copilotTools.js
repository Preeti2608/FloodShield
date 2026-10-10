import { INITIAL_SENSORS, INITIAL_INCIDENTS } from '../data/mockData';
import { calculateLocationRisk, interpretCitizenReportText } from './riskEngine';

/**
 * FloodShield Copilot Executable Tool Suite
 */

export const COPILOT_TOOLS = {
  // Tool 1: Assess Flood Risk
  assess_flood_risk: (locationId) => {
    const sensor = INITIAL_SENSORS.find(s => s.id === locationId) || INITIAL_SENSORS[0];
    const risk = calculateLocationRisk({
      rainfallRate: sensor.rainfallRate,
      elevationM: sensor.id === 'SN-4029' ? 4 : 8,
      drainEfficiency: sensor.id === 'SN-8192' ? 35 : 65,
      incidentCount: 2,
      maxIncidentSeverity: sensor.riskLevel,
      isSimulated: !sensor.isGenuineData
    });

    return {
      tool: 'assess_flood_risk',
      arguments: { locationId },
      result: {
        location: sensor.name,
        sensorId: sensor.id,
        currentDepthCm: sensor.depthCm,
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
    const reports = INITIAL_INCIDENTS.map(inc => ({
      id: inc.id,
      title: inc.title,
      location: inc.location,
      severity: inc.severity,
      waterDepthCm: inc.waterDepthCm,
      status: inc.status,
      aiTrustScore: inc.aiTrustScore
    }));

    return {
      tool: 'get_recent_reports',
      arguments: { locationId: locationId || 'ALL_WARDS' },
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
      { name: "Sector 4 Primary School", distance: "850m", status: "SHELTER READY", criticalLevel: "MEDIUM" },
      { name: "Electrical Transformer Substation #9", distance: "300m", status: "PUMP DEPLOYED", criticalLevel: "CRITICAL" }
    ];

    return {
      tool: 'find_affected_facilities',
      arguments: { locationId: locationId || 'SN-4029' },
      result: {
        location: locationId || 'SN-4029',
        facilitiesCount: facilities.length,
        facilities
      }
    };
  },

  // Tool 4: Check Road Accessibility
  check_road_accessibility: (areaId) => {
    return {
      tool: 'check_road_accessibility',
      arguments: { areaId: areaId || 'Sector 4 Metro Corridor' },
      result: {
        area: areaId || 'Sector 4 Metro Corridor',
        overallAccessibility: 'RESTRICTED',
        affectedRoads: [
          { segment: 'Metro Underpass L4', status: 'IMPASSABLE (55cm water)', vehicleRestriction: 'No Light Sedans' },
          { segment: 'Harbor Flyover Ramp', status: 'PASSABLE WITH CAUTION (18cm water)', vehicleRestriction: 'Open' },
          { segment: 'Elevated Ridge Link', status: '100% CLEAR', vehicleRestriction: 'Open All Vehicles' }
        ]
      }
    };
  },

  // Tool 5: Generate Recommended Actions
  generate_recommended_actions: (evidence) => {
    return {
      tool: 'generate_recommended_actions',
      arguments: { evidence: evidence || 'High Waterlogging & Drain Clog' },
      result: {
        citizenPrecautions: [
          'Avoid Metro Underpass L4; use Elevated Ridge Link detour.',
          'Do not drive light sedans through standing water exceeding 25cm.',
          'Stay updated via FloodShield SMS alert feed.'
        ],
        responderPriorities: [
          'Deploy Mobile Pump Unit #3 to Metro Basin Gate 3.',
          'Position traffic diversion barriers at Eastbound Flyover exit.',
          'Verify citizen report INC-9041 basement pump status.'
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
