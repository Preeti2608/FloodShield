// FloodShield Presets and Static Reference Definitions (No Fabricated Incidents or Fake Telemetry)

export const INITIAL_INCIDENTS = []; // Zero fabricated incident records. Incidents come ONLY from actual user submissions.

export const TARGET_LOCATIONS = [
  { id: 'LOC-1', name: 'Mumbai Downtown Coastal Ward', lat: 19.0760, lng: 72.8777, elevationM: 4 },
  { id: 'LOC-2', name: 'Harbor Expressway Junction', lat: 19.0522, lng: 72.9004, elevationM: 6 },
  { id: 'LOC-3', name: 'Central Suburb Transit Gate', lat: 19.1176, lng: 72.8460, elevationM: 12 },
  { id: 'LOC-4', name: 'North Tech Park Basin', lat: 19.1500, lng: 72.8300, elevationM: 5 }
];

export const PRESET_SCENARIOS = [
  {
    id: "cloudburst",
    name: "100-Year Cloudburst Scenario",
    rainfallRate: 110, // mm/hr
    surgeHeight: 1.8, // meters
    drainEfficiency: 35, // %
    durationHours: 3,
    description: "Simulated catastrophic cloudburst scenario with high tide."
  },
  {
    id: "monsoon_peak",
    name: "Monsoon Peak + Spring Tide",
    rainfallRate: 65,
    surgeHeight: 2.4,
    drainEfficiency: 60,
    durationHours: 6,
    description: "Simulated monsoon rain matching high tidal surge."
  },
  {
    id: "clogged_drain",
    name: "Drainage Blockage Simulation",
    rainfallRate: 45,
    surgeHeight: 0.5,
    drainEfficiency: 20,
    durationHours: 4,
    description: "Simulated rain event where arterial culverts are severely clogged."
  }
];

export const PRESET_ROUTES = [
  {
    id: "route-1",
    name: "Downtown Terminal → General Hospital Emergency",
    origin: { name: "Downtown Terminal (BKC)", lat: 19.0760, lng: 72.8777 },
    destination: { name: "General Hospital Emergency Gate", lat: 19.0178, lng: 72.8478 },
    safeDistanceKm: 6.2,
    safeTimeMin: 16,
    safeElevationGain: "+18m via Flyover Link",
    safeSheltersNearby: ["Riverside Shelter B", "City Central Trauma Hub"],
    facilities: [
      { name: "Riverside Shelter B", lat: 19.0520, lng: 72.8620, type: "shelter" },
      { name: "City Central Trauma Hub", lat: 19.0185, lng: 72.8482, type: "hospital" }
    ],
    // Lowland corridor: passes through low-lying basin underpasses
    lowlandWaypoints: [
      [19.0760, 72.8777],
      [19.0550, 72.8680],
      [19.0400, 72.8550],
      [19.0280, 72.8500],
      [19.0178, 72.8478]
    ],
    // Elevated alternate corridor: diverts onto elevated flyovers
    elevatedWaypoints: [
      [19.0760, 72.8777],
      [19.0680, 72.8600],
      [19.0480, 72.8450],
      [19.0300, 72.8420],
      [19.0178, 72.8478]
    ]
  },
  {
    id: "route-2",
    name: "Harbor Freight Hub → Fire Rescue Command 4",
    origin: { name: "Harbor Freight Hub", lat: 19.0522, lng: 72.9004 },
    destination: { name: "Fire Rescue Command 4", lat: 19.1176, lng: 72.8460 },
    safeDistanceKm: 10.4,
    safeTimeMin: 22,
    safeElevationGain: "+24m via Ridge Bypass",
    safeSheltersNearby: ["North District Staging Area", "Eastside Fire Depot"],
    facilities: [
      { name: "North District Staging Area", lat: 19.0880, lng: 72.8720, type: "shelter" },
      { name: "Eastside Fire Depot", lat: 19.1160, lng: 72.8470, type: "depot" }
    ],
    lowlandWaypoints: [
      [19.0522, 72.9004],
      [19.0700, 72.8850],
      [19.0900, 72.8650],
      [19.1050, 72.8550],
      [19.1176, 72.8460]
    ],
    elevatedWaypoints: [
      [19.0522, 72.9004],
      [19.0650, 72.9100],
      [19.0950, 72.8800],
      [19.1120, 72.8600],
      [19.1176, 72.8460]
    ]
  }
];

export const COPILOT_SUGGESTIONS = [
  "Check Open-Meteo precipitation rate for Mumbai Downtown",
  "How are risk scores calculated in FloodShield?",
  "List missing telemetry inputs for civil responders",
  "Explain data provenance and verification levels"
];
