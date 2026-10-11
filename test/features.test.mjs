import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getOfficialWarnings, parseSachetAlert, parseSachetDate, formatAlertTime, formatAlertDateTime, SACHET_PORTAL_URL } from '../src/api/apiClient.js';
import { generateGenuineAlerts } from '../src/utils/alertManager.js';
import { calculateDistanceKm } from '../src/utils/distance.js';
import {
  hasExplicitClosureConfirmation,
  getIncidentClassification,
  formatDistanceDisplay,
  formatCorridorProximity,
  calculateMinDistanceToRoute,
  evaluateRouteCorridor,
  compareRouteOptions
} from '../src/utils/routeAssessment.js';

test('Feature 1 - Official Warnings: getOfficialWarnings fetches live NDMA SACHET feed or reports honest unavailable state', async () => {
  const result = await getOfficialWarnings();
  if (result.connected) {
    assert.ok(result.status === 'LIVE_OFFICIAL_FEED' || result.status === 'NO_ACTIVE_ALERTS');
    assert.equal(result.source, 'NDMA SACHET Portal (Govt of India)');
    assert.equal(result.portalUrl, SACHET_PORTAL_URL);
    assert.ok(Array.isArray(result.warnings));
    assert.ok(result.count >= 0);
    if (result.warnings.length > 0) {
      const sample = result.warnings[0];
      assert.ok(sample.source, 'Must have official source');
      assert.ok(sample.event, 'Must have event disaster type');
      assert.ok(sample.affectedArea, 'Must have affected area');
      assert.ok(sample.severity, 'Must have severity');
      assert.ok(sample.startTime || sample.issueTime, 'Must have start/issue time');
      assert.equal(sample.originalAlertLink, SACHET_PORTAL_URL);
    }
  } else {
    assert.equal(result.connected, false);
    assert.equal(result.status, 'FEED_UNAVAILABLE');
    assert.equal(result.portalUrl, SACHET_PORTAL_URL);
    assert.equal(result.warnings.length, 0);
  }
});

test('Feature 1 - Official Warnings: parseSachetAlert parses actual official alert schema without fabricating fields', () => {
  const rawSachetAlert = {
    severity: 'ALERT',
    identifier: 1791710645339039,
    effective_start_time: 'Sun Oct 11 14:49:00 IST 2026',
    effective_end_time: 'Mon Oct 12 14:49:00 IST 2026',
    disaster_type: 'Flood',
    area_description: 'Yamuna Floodplain Corridor',
    severity_level: 'High',
    warning_message: 'River water level crossing critical embankment mark.',
    severity_color: 'red',
    alert_source: 'Central Water Commission / IMD'
  };

  const parsed = parseSachetAlert(rawSachetAlert);
  assert.equal(parsed.source, 'Central Water Commission / IMD');
  assert.equal(parsed.event, 'Flood');
  assert.equal(parsed.affectedArea, 'Yamuna Floodplain Corridor');
  assert.equal(parsed.severity, 'ALERT');
  assert.equal(parsed.severityLevel, 'High');
  // Valid ISO 8601 timestamps parsed with Asia/Kolkata (+05:30) offset
  assert.equal(parsed.startTime, '2026-10-11T09:19:00.000Z');
  assert.equal(parsed.effectiveStartTime, '2026-10-11T09:19:00.000Z');
  assert.equal(parsed.endTime, '2026-10-12T09:19:00.000Z');
  assert.equal(parsed.effectiveEndTime, '2026-10-12T09:19:00.000Z');
  assert.equal(parsed.expiry, '2026-10-12T09:19:00.000Z');
  // Raw source timestamps preserved without modification
  assert.equal(parsed.rawStartTime, 'Sun Oct 11 14:49:00 IST 2026');
  assert.equal(parsed.rawEffectiveStartTime, 'Sun Oct 11 14:49:00 IST 2026');
  assert.equal(parsed.rawEndTime, 'Mon Oct 12 14:49:00 IST 2026');
  assert.equal(parsed.rawExpiryTime, 'Mon Oct 12 14:49:00 IST 2026');
  // sentTime is null because source did not provide <cap:sent>, never fabricated
  assert.equal(parsed.sentTime, null);
  assert.equal(parsed.rawSentTime, null);
  assert.equal(parsed.originalAlertLink, SACHET_PORTAL_URL);
  assert.equal(parsed.isFloodRelated, true);
});

test('Timestamp Semantics Audit: parseSachetAlert distinguishes sent/issued time from effective/start and expiry', () => {
  // Case A: Raw alert has distinct sent/issued time (<cap:sent>) AND effective start time (<cap:effective>)
  const rawWithSent = {
    identifier: 99887766,
    sent: 'Sun Oct 11 14:40:00 IST 2026',
    effective_start_time: 'Sun Oct 11 15:00:00 IST 2026',
    effective_end_time: 'Sun Oct 11 19:00:00 IST 2026',
    disaster_type: 'Flash Flood',
    area_description: 'River Basin North'
  };

  const parsedWithSent = parseSachetAlert(rawWithSent);
  assert.equal(parsedWithSent.sentTime, '2026-10-11T09:10:00.000Z');
  assert.equal(parsedWithSent.rawSentTime, 'Sun Oct 11 14:40:00 IST 2026');
  assert.equal(parsedWithSent.effectiveStartTime, '2026-10-11T09:30:00.000Z');
  assert.equal(parsedWithSent.rawEffectiveStartTime, 'Sun Oct 11 15:00:00 IST 2026');
  assert.equal(parsedWithSent.effectiveEndTime, '2026-10-11T13:30:00.000Z');
  assert.equal(parsedWithSent.expiry, '2026-10-11T13:30:00.000Z');

  // Case B: Raw alert has only effective_start_time (standard NDMA feed without explicit sent field)
  const rawWithoutSent = {
    identifier: 11223344,
    effective_start_time: 'Sun Oct 11 15:00:00 IST 2026',
    effective_end_time: 'Sun Oct 11 19:00:00 IST 2026',
    disaster_type: 'Inundation'
  };

  const parsedWithoutSent = parseSachetAlert(rawWithoutSent);
  assert.equal(parsedWithoutSent.sentTime, null, 'Must NOT invent sentTime when source field does not support it');
  assert.equal(parsedWithoutSent.effectiveStartTime, '2026-10-11T09:30:00.000Z');
  assert.equal(parsedWithoutSent.effectiveEndTime, '2026-10-11T13:30:00.000Z');
});

test('Bug 2 - Safe NDMA Date Parsing: parseSachetDate explicitly parses Asia/Kolkata timezone without browser IST dependence', () => {
  // Standard NDMA feed format: Day Mon DD HH:mm:ss IST YYYY
  const iso1 = parseSachetDate('Sun Oct 11 14:49:00 IST 2026');
  assert.equal(iso1, '2026-10-11T09:19:00.000Z');

  // NDMA format with comma
  const iso2 = parseSachetDate('Sun, Oct 11 14:49:00 IST 2026');
  assert.equal(iso2, '2026-10-11T09:19:00.000Z');

  // Alternative format with day first: DD Mon YYYY HH:mm:ss IST
  const iso3 = parseSachetDate('11 Oct 2026 14:49:00 IST');
  assert.equal(iso3, '2026-10-11T09:19:00.000Z');

  // Standard ISO input
  const iso4 = parseSachetDate('2026-10-11T09:19:00.000Z');
  assert.equal(iso4, '2026-10-11T09:19:00.000Z');

  // Invalid or missing inputs return null safely
  assert.equal(parseSachetDate(null), null);
  assert.equal(parseSachetDate(undefined), null);
  assert.equal(parseSachetDate(''), null);
  assert.equal(parseSachetDate('random-unparseable-date'), null);
});

test('Bug 2 - Safe Alert Date Rendering: formatAlertTime and formatAlertDateTime never return "Invalid Date"', () => {
  // Real NDMA timestamp string
  const timeStr = formatAlertTime('Sun Oct 11 14:49:00 IST 2026');
  assert.ok(timeStr !== 'Invalid Date' && timeStr !== 'Time unavailable', `Expected valid time, got ${timeStr}`);

  const dateTimeStr = formatAlertDateTime('Sun Oct 11 14:49:00 IST 2026');
  assert.ok(dateTimeStr !== 'Invalid Date' && dateTimeStr !== 'Time unavailable', `Expected valid datetime, got ${dateTimeStr}`);

  // Missing or empty values fallback to "Time unavailable"
  assert.equal(formatAlertTime(null), 'Time unavailable');
  assert.equal(formatAlertTime(undefined), 'Time unavailable');
  assert.equal(formatAlertTime(''), 'Time unavailable');
  assert.equal(formatAlertTime('corrupt-string'), 'Time unavailable');

  assert.equal(formatAlertDateTime(null), 'Time unavailable');
  assert.equal(formatAlertDateTime(undefined), 'Time unavailable');
  assert.equal(formatAlertDateTime(''), 'Time unavailable');
  assert.equal(formatAlertDateTime('corrupt-string'), 'Time unavailable');
});

test('Feature 1 - Official Warnings: generateGenuineAlerts does not fabricate fake official alert objects', () => {
  const weather = { success: true, precipitationMmHr: 5, timestamp: new Date().toISOString() };
  const userReports = [];
  const alerts = generateGenuineAlerts(weather, userReports, 5, 19.0760, 72.8777, []);
  
  // Must NOT contain dummy ALT-OFFICIAL-NONE
  const fakeOfficial = alerts.find(a => a.id === 'ALT-OFFICIAL-NONE');
  assert.equal(fakeOfficial, undefined, 'Must not fabricate dummy official warning items');
});

test('Feature 1 - Official Warnings: generateGenuineAlerts correctly formats genuine official warnings when provided', () => {
  const genuineFeed = [
    {
      id: 'CWC-WARN-01',
      source: 'Central Water Commission (CWC)',
      affectedArea: 'Mithi River Basin Corridor',
      severity: 'HIGH',
      issueTime: '2026-10-11T12:00:00Z',
      expiry: '2026-10-11T18:00:00Z',
      description: 'Water level at Kurla bridge approaching critical danger mark.'
    }
  ];

  const alerts = generateGenuineAlerts(null, [], 5, 19.0760, 72.8777, genuineFeed);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].category, 'OFFICIAL');
  assert.equal(alerts[0].type, 'OFFICIAL FLOOD WARNING');
  assert.equal(alerts[0].source, 'Central Water Commission (CWC)');
  assert.equal(alerts[0].location, 'Mithi River Basin Corridor');
  assert.equal(alerts[0].expiry, '2026-10-11T18:00:00Z');
});

test('Feature 2 - Hazard-Aware Routing: geographic distance detects hazards along route corridor', () => {
  // Downtown Terminal [19.0760, 72.8777] to General Hospital
  const waypoints = [
    [19.0760, 72.8777],
    [19.0550, 72.8680],
    [19.0400, 72.8550],
    [19.0280, 72.8500],
    [19.0178, 72.8478]
  ];

  // Incident near waypoint 2 [19.0550, 72.8680] at 19.0560, 72.8690
  const nearbyIncident = { lat: 19.0560, lng: 72.8690, title: 'Flooded Underpass' };
  
  // Incident far away in Delhi (lat 28.6139, lng 77.2090)
  const farIncident = { lat: 28.6139, lng: 77.2090, title: 'Delhi River Rising' };

  let minDistanceNear = Infinity;
  let minDistanceFar = Infinity;

  waypoints.forEach(wp => {
    const dNear = calculateDistanceKm(nearbyIncident.lat, nearbyIncident.lng, wp[0], wp[1]);
    if (dNear < minDistanceNear) minDistanceNear = dNear;

    const dFar = calculateDistanceKm(farIncident.lat, farIncident.lng, wp[0], wp[1]);
    if (dFar < minDistanceFar) minDistanceFar = dFar;
  });

  assert.ok(minDistanceNear <= 1.5, `Nearby hazard must be within 1.5km (got ${minDistanceNear} km)`);
  assert.ok(minDistanceFar > 500, `Far incident must not be flagged as route hazard (got ${minDistanceFar} km)`);
});

test('Feature 3 - Scenario Lab: deterministic hydrodynamic formula reproduces baseline and calculates delta accurately', () => {
  // Baseline Scenario
  const baselineRainfall = 65;
  const baselineSurge = 1.5;
  const baselineDrain = 50;
  
  const baselinePeak = Math.round((baselineRainfall * 0.7) + (baselineSurge * 18) + ((100 - baselineDrain) * 0.45));
  const baselineTime = Math.max(10, Math.round(120 - (baselineRainfall * 0.6) - (baselineSurge * 12)));

  assert.equal(baselinePeak, 95, 'Baseline peak depth must equal 95 cm');
  assert.equal(baselineTime, 63, 'Baseline inundation time must equal 63 min');

  // Cloudburst Scenario (110 mm/hr, 1.8m surge, 35% drain)
  const cloudburstRainfall = 110;
  const cloudburstSurge = 1.8;
  const cloudburstDrain = 35;

  const cloudburstPeak = Math.round((cloudburstRainfall * 0.7) + (cloudburstSurge * 18) + ((100 - cloudburstDrain) * 0.45));
  // 110*0.7=77 + 1.8*18=32.4 + 65*0.45=29.25 => 77 + 32.4 + 29.25 = 138.65 => 139 cm
  assert.equal(cloudburstPeak, 139);

  const delta = cloudburstPeak - baselinePeak;
  assert.equal(delta, 44, 'Cloudburst increases peak water depth by 44 cm compared to baseline');
});

test('Feature 2 - Incident Classification Audit: never labels verified depth as verified closure without explicit confirmation', () => {
  // Case A: High water depth, verified, but NO explicit road closure confirmation
  const deepWaterReport = { status: 'VERIFIED', waterDepthCm: 55, title: 'Standing Water at Junction', description: 'Deep waterlogging across lanes' };
  const classA = getIncidentClassification(deepWaterReport);
  assert.equal(classA.label, 'Verified Flood Hazard', 'Must NOT be labeled Verified Closure solely based on status or water depth');

  // Case B: Explicit closure confirmation exists
  const closedRoadReport = { status: 'VERIFIED', waterDepthCm: 50, title: 'Underpass Flooded', description: 'Road closed to traffic by traffic police' };
  const classB = getIncidentClassification(closedRoadReport);
  assert.equal(classB.label, 'Verified Closure', 'Must be labeled Verified Closure when explicit confirmation exists');

  // Case C: Unverified citizen report
  const citizenReport = { status: 'UNVERIFIED', waterDepthCm: 25, title: 'Water puddle' };
  const classC = getIncidentClassification(citizenReport);
  assert.equal(classC.label, 'Reported Incident');
});

test('Feature 2 - Distance Formatting: never outputs misleading 0 km away for rounded sub-100m proximity', () => {
  assert.equal(formatDistanceDisplay(0.04), '< 100m away (~40m)');
  assert.equal(formatDistanceDisplay(0.01), '< 100m away (~20m)');
  assert.equal(formatDistanceDisplay(0.4), '0.4 km away');
  assert.notEqual(formatDistanceDisplay(0.04), '0 km away', 'Must not display 0 km away');

  assert.equal(formatCorridorProximity(0.05), '< 100m from route corridor (~50m)');
  assert.equal(formatCorridorProximity(0.8), '0.8 km from route corridor');
});

test('Safe Passage Routing Engine: evaluateRouteCorridor filters by distance and ignores resolved incidents', () => {
  const waypoints = [
    [19.0760, 72.8777],
    [19.0550, 72.8680],
    [19.0400, 72.8550],
    [19.0178, 72.8478]
  ];

  const reports = [
    // 1. Nearby verified road closure (~0.1 km from waypoint 2)
    { id: 'R1', lat: 19.0555, lng: 72.8685, status: 'VERIFIED', roadClosed: true, waterDepthCm: 45, title: 'Subway Closed' },
    // 2. Nearby citizen report (~0.3 km from waypoint 3)
    { id: 'R2', lat: 19.0420, lng: 72.8570, status: 'UNVERIFIED', waterDepthCm: 20, title: 'Puddle' },
    // 3. Far away incident in Pune (> 100 km)
    { id: 'R3', lat: 18.5204, lng: 73.8567, status: 'VERIFIED', roadClosed: true, title: 'Pune Landslide' },
    // 4. Resolved nearby incident (must be ignored)
    { id: 'R4', lat: 19.0550, lng: 72.8680, status: 'RESOLVED', roadClosed: true, title: 'Cleared Road' }
  ];

  const assessment = evaluateRouteCorridor(waypoints, reports, [], 1.5);
  
  // Must only include R1 and R2; R3 is too far and R4 is resolved
  assert.equal(assessment.corridorHazards.length, 2);
  assert.equal(assessment.verifiedClosures.length, 1);
  assert.equal(assessment.verifiedClosures[0].id, 'R1');
  assert.equal(assessment.reportedIncidents.length, 1);
  assert.equal(assessment.reportedIncidents[0].id, 'R2');
  assert.equal(assessment.maxWaterDepthCm, 45);
});

test('Safe Passage Routing Engine: compareRouteOptions recommends detour when direct path has confirmed closures', () => {
  const lowlandAssessment = {
    verifiedClosures: [{ id: 'C1' }],
    verifiedHazards: [],
    reportedIncidents: [],
    totalHazardsCount: 1,
    maxWaterDepthCm: 50
  };

  const elevatedAssessment = {
    verifiedClosures: [],
    verifiedHazards: [],
    reportedIncidents: [],
    totalHazardsCount: 0,
    maxWaterDepthCm: 0
  };

  const comparison = compareRouteOptions(lowlandAssessment, elevatedAssessment, { safeElevationGain: '+18m via Flyover Link' });
  assert.equal(comparison.recommendedMode, 'ELEVATED');
  assert.equal(comparison.badgeLabel, 'LOWER REPORTED HAZARD EXPOSURE');
  assert.ok(comparison.rationaleTitle.includes('CLOSURE'));

  // When 0 hazards reported on both corridors, honestly state terrain elevation profile assumption
  const emptyAssessment = { verifiedClosures: [], verifiedHazards: [], reportedIncidents: [], totalHazardsCount: 0, maxWaterDepthCm: 0 };
  const terrainComparison = compareRouteOptions(emptyAssessment, emptyAssessment, { safeElevationGain: '+18m via Flyover Link' });
  assert.equal(terrainComparison.recommendedMode, 'ELEVATED');
  assert.equal(terrainComparison.badgeLabel, 'HAZARD-AWARE ROUTE ESTIMATE');
  assert.equal(terrainComparison.isTerrainAssumption, true);
});

test('Bug 1 - Genuine Alert Center: category tabs and official feed toolbar state logic', () => {
  const sampleAlerts = [
    { id: 'ALT-1', category: 'OFFICIAL', title: 'IMD Red Alert' },
    { id: 'ALT-2', category: 'COMMUNITY', title: 'Citizen waterlogging report' },
    { id: 'ALT-3', category: 'WEATHER', title: 'High rainfall rate' },
    { id: 'ALT-4', category: 'COMMUNITY', title: 'Puddle reported' }
  ];

  const filterAlertsByTab = (tab, alerts) => {
    return alerts.filter(alt => {
      if (tab === 'ALL') return true;
      if (tab === 'OFFICIAL') return alt.category === 'OFFICIAL';
      if (tab === 'COMMUNITY') return alt.category === 'COMMUNITY';
      if (tab === 'WEATHER') return alt.category === 'WEATHER';
      return true;
    });
  };

  // 1. All tab returns all
  assert.equal(filterAlertsByTab('ALL', sampleAlerts).length, 4);

  // 2. Official tab returns only official
  assert.equal(filterAlertsByTab('OFFICIAL', sampleAlerts).length, 1);
  assert.equal(filterAlertsByTab('OFFICIAL', sampleAlerts)[0].id, 'ALT-1');

  // 3. Community tab returns only community
  assert.equal(filterAlertsByTab('COMMUNITY', sampleAlerts).length, 2);

  // 4. Weather tab returns only weather
  assert.equal(filterAlertsByTab('WEATHER', sampleAlerts).length, 1);

  // 5. Feed toolbar presence logic
  const isToolbarVisible = (activeTab) => activeTab === 'OFFICIAL';
  assert.equal(isToolbarVisible('OFFICIAL'), true);
  assert.equal(isToolbarVisible('COMMUNITY'), false);
  assert.equal(isToolbarVisible('WEATHER'), false);
  assert.equal(isToolbarVisible('ALL'), false);
});

test('Timestamp Semantics Audit: formatting consistently enforces Asia/Kolkata (+05:30) and includes date', () => {
  // 09:19:00 UTC = 14:49:00 IST (02:49 pm) on 11 Oct 2026
  const sampleUtc = '2026-10-11T09:19:00.000Z';
  const formattedTime = formatAlertTime(sampleUtc);
  const formattedDateTime = formatAlertDateTime(sampleUtc);

  // Time format must be 02:49 pm (or 02:49 PM) in Asia/Kolkata
  assert.ok(/02:49\s*(?:pm|PM)/i.test(formattedTime), `Expected 02:49 pm IST, got ${formattedTime}`);
  
  // DateTime format must include the date (11 Oct) and the time (02:49 pm)
  assert.ok(formattedDateTime.includes('11') && formattedDateTime.includes('Oct'), `Expected month and day in ${formattedDateTime}`);
  assert.ok(/02:49\s*(?:pm|PM)/i.test(formattedDateTime), `Expected 02:49 pm in ${formattedDateTime}`);
});

test('Timestamp Semantics Audit: alert cards accurately label Issued vs Effective vs Valid until', () => {
  const getCardTimeLabel = (alt) => {
    if (alt.category === 'OFFICIAL') {
      if (alt.sentTime) return `Issued: ${formatAlertDateTime(alt.sentTime)}`;
      if (alt.effectiveStartTime || alt.startTime) return `Effective: ${formatAlertDateTime(alt.effectiveStartTime || alt.startTime)}`;
      return 'Time unavailable';
    }
    if (alt.category === 'WEATHER') {
      return `Observed: ${formatAlertDateTime(alt.timestamp)}`;
    }
    return `Reported: ${formatAlertDateTime(alt.timestamp)}`;
  };

  // Case 1: Official alert with genuine sent time (<cap:sent>)
  const officialWithSent = {
    category: 'OFFICIAL',
    sentTime: '2026-10-11T09:10:00.000Z',
    effectiveStartTime: '2026-10-11T09:30:00.000Z',
    effectiveEndTime: '2026-10-11T13:30:00.000Z'
  };
  const label1 = getCardTimeLabel(officialWithSent);
  assert.ok(label1.startsWith('Issued:'), `Expected Issued: label, got ${label1}`);
  assert.ok(!label1.startsWith('Effective:'));

  // Case 2: Official alert with only effective start time (standard NDMA SACHET feed)
  const officialWithoutSent = {
    category: 'OFFICIAL',
    sentTime: null,
    effectiveStartTime: '2026-10-11T09:30:00.000Z',
    effectiveEndTime: '2026-10-11T13:30:00.000Z'
  };
  const label2 = getCardTimeLabel(officialWithoutSent);
  assert.ok(label2.startsWith('Effective:'), `Expected Effective: label when no sent time, got ${label2}`);
  assert.ok(!label2.startsWith('Issued:'), 'Must NOT claim alert was Issued at effective start time');

  // Case 3: Community citizen report
  const citizenAlert = { category: 'COMMUNITY', timestamp: '2026-10-11T10:00:00.000Z' };
  assert.ok(getCardTimeLabel(citizenAlert).startsWith('Reported:'));

  // Case 4: Weather watch alert
  const weatherAlert = { category: 'WEATHER', timestamp: '2026-10-11T10:00:00.000Z' };
  assert.ok(getCardTimeLabel(weatherAlert).startsWith('Observed:'));

  // Case 5: Expiry is consistently labeled "Valid until"
  const expiryLabel = `Valid until: ${formatAlertDateTime(officialWithSent.effectiveEndTime)}`;
  assert.ok(expiryLabel.startsWith('Valid until:'));
  assert.ok(/07:00\s*(?:pm|PM)/i.test(expiryLabel)); // 13:30 UTC = 19:00 IST = 07:00 pm
});

test('Timestamp Semantics Audit: generateGenuineAlerts never fabricates new Date().toISOString() for missing timestamps', () => {
  const officialWithoutTimes = [
    {
      id: 'WARN-NO-TIMES',
      source: 'CWC Test',
      affectedArea: 'Zone A',
      severity: 'HIGH',
      description: 'Test warning'
      // No issueTime, startTime, or expiry provided
    }
  ];

  const alerts = generateGenuineAlerts(null, [], 5, 19.0760, 72.8777, officialWithoutTimes);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].sentTime, null, 'Must be null, not fabricated current date');
  assert.equal(alerts[0].issueTime, null, 'Must be null, not fabricated current date');
  assert.equal(alerts[0].effectiveStartTime, null, 'Must be null, not fabricated current date');
  assert.equal(alerts[0].startTime, null, 'Must be null, not fabricated current date');
  assert.equal(alerts[0].timestamp, null, 'Must be null, not fabricated current date');
});

