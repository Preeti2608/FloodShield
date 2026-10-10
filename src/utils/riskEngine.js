// FloodShield Deterministic Risk Engine & Evidence Calculator

/**
 * Calculates deterministic flood risk score (0 - 100) and provides explainable factor breakdown.
 * 
 * Formula factors:
 * 1. Rainfall Intensity (mm/hr): Weight 35%
 * 2. Terrain Elevation (m): Weight 25% (lower elevation = higher risk)
 * 3. Drainage Efficiency (%): Weight 25% (lower efficiency = higher risk)
 * 4. Local Incident Density & Severity: Weight 15%
 */
export function calculateLocationRisk(locationData) {
  const {
    rainfallRate = 30, // mm/hr
    elevationM = 5,    // meters above sea level
    drainEfficiency = 60, // %
    incidentCount = 1,
    maxIncidentSeverity = 'HIGH',
    isSimulated = false
  } = locationData;

  // 1. Rainfall component (0-100 scale: 120mm/h max)
  const rainfallScore = Math.min(100, (rainfallRate / 120) * 100);

  // 2. Elevation component (0-100 scale: <=2m is highest risk 100, >=30m is 0)
  const elevationScore = Math.max(0, Math.min(100, ((30 - elevationM) / 28) * 100));

  // 3. Drainage component (inverse efficiency)
  const drainScore = Math.max(0, 100 - drainEfficiency);

  // 4. Incident severity component
  let incidentScore = Math.min(100, incidentCount * 20);
  if (maxIncidentSeverity === 'CRITICAL') incidentScore = Math.max(incidentScore, 90);
  if (maxIncidentSeverity === 'HIGH') incidentScore = Math.max(incidentScore, 70);

  // Weighted sum
  const rawScore = Math.round(
    (rainfallScore * 0.35) +
    (elevationScore * 0.25) +
    (drainScore * 0.25) +
    (incidentScore * 0.15)
  );

  const finalScore = Math.max(0, Math.min(100, rawScore));

  let riskLevel = 'LOW';
  if (finalScore >= 35) riskLevel = 'MODERATE';
  if (finalScore >= 55) riskLevel = 'HIGH';
  if (finalScore >= 78) riskLevel = 'CRITICAL';

  // Contributing Factors Breakdown
  const contributingFactors = [
    {
      factor: 'Rainfall Rate',
      weight: '35%',
      value: `${rainfallRate} mm/hr`,
      contribution: Math.round(rainfallScore * 0.35),
      status: rainfallRate > 50 ? 'HIGH IMPACT' : 'NORMAL'
    },
    {
      factor: 'Drainage Capacity',
      weight: '25%',
      value: `${drainEfficiency}% Efficiency`,
      contribution: Math.round(drainScore * 0.25),
      status: drainEfficiency < 50 ? 'CLOGGED HAZARD' : 'FUNCTIONAL'
    },
    {
      factor: 'Terrain Elevation',
      weight: '25%',
      value: `${elevationM}m MSL`,
      contribution: Math.round(elevationScore * 0.25),
      status: elevationM < 6 ? 'LOWLAND BASIN' : 'ELEVATED'
    },
    {
      factor: 'Reported Incidents',
      weight: '15%',
      value: `${incidentCount} Active (${maxIncidentSeverity})`,
      contribution: Math.round(incidentScore * 0.15),
      status: incidentCount > 0 ? 'FIELD VERIFIED' : 'NONE'
    }
  ];

  // Missing Inputs & Limitations
  const missingInputs = [
    'Sub-surface Groundwater Saturation Telemetry',
    'Real-time Sea Tidal Gauge Level (Using Static Tide Table Baseline)'
  ];

  const confidenceLimitations = isSimulated
    ? 'Simulated hydrological model run. Results represent scenario projection, not current physical stream measurements.'
    : 'Calculated via deterministic multi-factor formula. Sensor telemetry confidence bounded by physical stream gauge polling interval (2 min).';

  return {
    riskScore: finalScore,
    riskLevel,
    contributingFactors,
    missingInputs,
    confidenceLimitations,
    isSimulated,
    calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}

/**
 * Free-text Incident AI Parser (Deterministic Parser Engine)
 */
export function interpretCitizenReportText(text) {
  const t = text.toLowerCase();
  
  let category = 'Waterlogging';
  if (t.includes('drain') || t.includes('clog') || t.includes('garbage')) category = 'Drainage Blockage';
  if (t.includes('car') || t.includes('vehicle') || t.includes('bus') || t.includes('stuck')) category = 'Stranded Vehicle Hazard';
  if (t.includes('basement') || t.includes('parking') || t.includes('building') || t.includes('transformer')) category = 'Structure Inundation';

  let severity = 'MEDIUM';
  let severityClues = [];
  if (t.includes('knee') || t.includes('30cm') || t.includes('40cm')) {
    severity = 'HIGH';
    severityClues.push('Water depth knee-high (~30-40cm)');
  }
  if (t.includes('waist') || t.includes('submerged') || t.includes('stuck') || t.includes('critical') || t.includes('rescue')) {
    severity = 'CRITICAL';
    severityClues.push('Water depth waist-high or vehicle submerged');
  }

  let roadAccessibility = 'Passable for light vehicles';
  if (severity === 'HIGH') roadAccessibility = 'Passable for heavy trucks only; light sedans restricted';
  if (severity === 'CRITICAL') roadAccessibility = 'IMPASSABLE - Road Closure Recommended';

  let verificationNeeded = [
    'Cross-check stream gauge SN-4029 depth readout',
    'Verify if drain blockage is partial or complete',
    'Confirm if vehicles are occupied'
  ];

  return {
    category,
    severity,
    severityClues: severityClues.length ? severityClues : ['General water accumulation reported'],
    roadAccessibility,
    shortSummary: text.length > 90 ? text.substring(0, 90) + '...' : text,
    verificationNeeded,
    parsedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
