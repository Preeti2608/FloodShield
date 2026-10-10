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
    safeDistanceKm: 6.2,
    safeTimeMin: 16,
    safeElevationGain: "+18m via Flyover Link",
    safeSheltersNearby: ["Riverside Shelter B", "City Central Trauma Hub"]
  },
  {
    id: "route-2",
    name: "Harbor Freight Hub → Fire Rescue Command 4",
    safeDistanceKm: 10.4,
    safeTimeMin: 22,
    safeElevationGain: "+24m via Ridge Bypass",
    safeSheltersNearby: ["North District Staging Area", "Eastside Fire Depot"]
  }
];

export const COPILOT_SUGGESTIONS = [
  "Check Open-Meteo precipitation rate for Mumbai Downtown",
  "How are risk scores calculated in FloodShield?",
  "List missing telemetry inputs for civil responders",
  "Explain data provenance and verification levels"
];
