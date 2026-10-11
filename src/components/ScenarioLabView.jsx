import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, RefreshCw, Activity, ShieldAlert, Info, HelpCircle, RotateCcw } from 'lucide-react';
import { PRESET_SCENARIOS } from '../data/mockData';
import { simulateScenarioBackend } from '../api/apiClient';

// Standard Baseline Scenario Definition
const BASELINE_SCENARIO = {
  rainfallRate: 65,      // mm/hr
  surgeHeight: 1.5,      // meters
  drainEfficiency: 50,   // %
  durationHours: 4       // hours
};

// Baseline Calculated Outputs
const BASELINE_OUTPUTS = {
  peakDepthCm: Math.round((65 * 0.7) + (1.5 * 18) + ((100 - 50) * 0.45)), // 95 cm
  timeToInundationMin: Math.max(10, Math.round(120 - (65 * 0.6) - (1.5 * 12))), // 63 min
  riskLevel: 'HIGH'
};

export default function ScenarioLabView() {
  const [rainfallRate, setRainfallRate] = useState(BASELINE_SCENARIO.rainfallRate);
  const [surgeHeight, setSurgeHeight] = useState(BASELINE_SCENARIO.surgeHeight);
  const [drainEfficiency, setDrainEfficiency] = useState(BASELINE_SCENARIO.drainEfficiency);
  const [duration, setDuration] = useState(BASELINE_SCENARIO.durationHours);
  const [isSimulating, setIsSimulating] = useState(false);
  const [backendSimulationInfo, setBackendSimulationInfo] = useState(null);
  
  const canvasRef = useRef(null);

  const applyPreset = (preset) => {
    setRainfallRate(preset.rainfallRate);
    setSurgeHeight(preset.surgeHeight);
    setDrainEfficiency(preset.drainEfficiency);
    setDuration(preset.durationHours);
  };

  const resetToBaseline = () => {
    setRainfallRate(BASELINE_SCENARIO.rainfallRate);
    setSurgeHeight(BASELINE_SCENARIO.surgeHeight);
    setDrainEfficiency(BASELINE_SCENARIO.drainEfficiency);
    setDuration(BASELINE_SCENARIO.durationHours);
  };

  // Real-time deterministic hydrodynamic model formula
  const calculatedPeakDepthCm = Math.round(
    (rainfallRate * 0.7) + (surgeHeight * 18) + ((100 - drainEfficiency) * 0.45)
  );

  const calculatedTimeToInundationMin = Math.max(10, Math.round(
    120 - (rainfallRate * 0.6) - (surgeHeight * 12)
  ));

  const calculatedRiskLevel = calculatedPeakDepthCm >= 60 ? 'HIGH' : calculatedPeakDepthCm >= 30 ? 'MODERATE' : 'LOW';

  // Baseline Comparison Deltas
  const depthDelta = calculatedPeakDepthCm - BASELINE_OUTPUTS.peakDepthCm;
  const timeDelta = calculatedTimeToInundationMin - BASELINE_OUTPUTS.timeToInundationMin;
  const isAtBaseline = rainfallRate === BASELINE_SCENARIO.rainfallRate &&
                       surgeHeight === BASELINE_SCENARIO.surgeHeight &&
                       drainEfficiency === BASELINE_SCENARIO.drainEfficiency &&
                       duration === BASELINE_SCENARIO.durationHours;

  // Render 2D water level simulation canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let waveOffset = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(240, 237, 228, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Terrain Profile (Lowland city basin cross-section)
      ctx.beginPath();
      ctx.moveTo(0, height - 60);
      ctx.lineTo(width * 0.25, height - 120);
      ctx.lineTo(width * 0.55, height - 40);
      ctx.lineTo(width * 0.8, height - 90);
      ctx.lineTo(width, height - 50);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();

      ctx.fillStyle = '#161817';
      ctx.fill();
      ctx.strokeStyle = '#858783';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Animated Water Layer based on calculated depth
      const waterLevelY = Math.max(height - 190, height - 40 - (calculatedPeakDepthCm * 1.4));

      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, waterLevelY);

      for (let x = 0; x <= width; x += 10) {
        const y = waterLevelY + Math.sin((x + waveOffset) * 0.02) * 5;
        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      const waterGrad = ctx.createLinearGradient(0, waterLevelY, 0, height);
      waterGrad.addColorStop(0, 'rgba(255, 100, 56, 0.45)');
      waterGrad.addColorStop(1, 'rgba(255, 100, 56, 0.85)');

      ctx.fillStyle = waterGrad;
      ctx.fill();

      ctx.strokeStyle = '#FF6438';
      ctx.lineWidth = 2;
      ctx.stroke();

      waveOffset += 1.5;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [calculatedPeakDepthCm]);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await simulateScenarioBackend({
        rainfallRate,
        surgeHeight,
        drainEfficiency,
        durationHours: duration
      });
      setBackendSimulationInfo(res);
    } catch (e) {
      console.warn('Simulation backend call error:', e);
    } finally {
      setTimeout(() => {
        setIsSimulating(false);
      }, 400);
    }
  };

  return (
    <div className="scenario-view-container animate-fade-in">
      {/* Header */}
      <div className="scenario-header">
        <div>
          <div className="header-badge-row">
            <span className="mono label-uppercase">SECTION 04</span>
            <span className="badge badge-amber mono">SIMULATION — NOT A LIVE FORECAST</span>
          </div>
          <h2 className="section-title">SCENARIO LAB</h2>
          <span className="mono desc-sub">PARAMETRIC HYDRODYNAMIC SIMULATION EXPERIMENT</span>
        </div>

        {/* Preset Selector */}
        <div className="preset-buttons-group">
          {PRESET_SCENARIOS.map(preset => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset)}
              className="preset-btn mono"
            >
              {preset.name}
            </button>
          ))}
          <button
            onClick={resetToBaseline}
            className={`preset-btn mono ${isAtBaseline ? 'active' : ''}`}
            title="Reset all parameters to baseline monsoon storm"
          >
            <RotateCcw size={11} style={{ display: 'inline', marginRight: '4px' }} />
            BASELINE MONSOON
          </button>
        </div>
      </div>

      {/* Prominent Mandatory Simulation Label Banner */}
      <div className="sim-notice-banner mono">
        <ShieldAlert size={18} color="var(--color-amber)" />
        <div className="notice-body">
          <strong>SIMULATION — NOT A LIVE FORECAST:</strong> This experiment executes a parametric hydrodynamic model based on configured inputs. It is designed for civil contingency exploration and civil defense planning. It does NOT represent real-time sensor gauge readings or active weather forecasts.
        </div>
      </div>

      {/* Main Grid: Controls + Visual Output & Explanations */}
      <div className="scenario-main-grid">
        {/* Left Side: Simulation Slider Controls */}
        <div className="controls-panel editorial-card">
          <div className="panel-header-strip">
            <SlidersHorizontal size={14} color="var(--color-orange)" />
            <span className="mono header-title">SIMULATED HYDROLOGY PARAMETERS</span>
          </div>

          <div className="controls-form">
            {/* Slider 1: Rainfall Rate */}
            <div className="control-group">
              <div className="slider-label-row">
                <span className="label-uppercase">SIMULATED RAINFALL INTENSITY</span>
                <span className="mono slider-val">{rainfallRate} mm/hr</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                value={rainfallRate}
                onChange={(e) => setRainfallRate(Number(e.target.value))}
                className="hydro-slider"
              />
              <div className="slider-ticks mono">
                <span>10 (Light)</span>
                <span>65 (Baseline)</span>
                <span>150 (Cloudburst)</span>
              </div>
            </div>

            {/* Slider 2: Storm Surge */}
            <div className="control-group">
              <div className="slider-label-row">
                <span className="label-uppercase">SIMULATED STORM SURGE</span>
                <span className="mono slider-val">{surgeHeight} m</span>
              </div>
              <input
                type="range"
                min="0"
                max="3.5"
                step="0.1"
                value={surgeHeight}
                onChange={(e) => setSurgeHeight(Number(e.target.value))}
                className="hydro-slider"
              />
              <div className="slider-ticks mono">
                <span>0.0m</span>
                <span>1.5m (Baseline)</span>
                <span>3.5m (Extreme)</span>
              </div>
            </div>

            {/* Slider 3: Drain Efficiency */}
            <div className="control-group">
              <div className="slider-label-row">
                <span className="label-uppercase">DRAINAGE NETWORK EFFICIENCY</span>
                <span className="mono slider-val">{drainEfficiency}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={drainEfficiency}
                onChange={(e) => setDrainEfficiency(Number(e.target.value))}
                className="hydro-slider"
              />
              <div className="slider-ticks mono">
                <span>10% (Clogged)</span>
                <span>50% (Baseline)</span>
                <span>100% (Clean)</span>
              </div>
            </div>

            {/* Slider 4: Event Duration */}
            <div className="control-group">
              <div className="slider-label-row">
                <span className="label-uppercase">SIMULATION DURATION</span>
                <span className="mono slider-val">{duration} hours</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="hydro-slider"
              />
              <div className="slider-ticks mono">
                <span>1h</span>
                <span>4h (Baseline)</span>
                <span>12h</span>
              </div>
            </div>

            {/* Selected Inputs Summary Card */}
            <div className="selected-inputs-card mono">
              <span className="label-uppercase" style={{ fontSize: '0.65rem' }}>ACTIVE INPUT PARAMETERS</span>
              <div className="input-summary-row">
                <span>Rainfall: <strong>{rainfallRate} mm/h</strong></span>
                <span>Surge: <strong>{surgeHeight} m</strong></span>
              </div>
              <div className="input-summary-row">
                <span>Drain Efficiency: <strong>{drainEfficiency}%</strong></span>
                <span>Duration: <strong>{duration} h</strong></span>
              </div>
            </div>

            {/* Run Button */}
            <button 
              onClick={handleRunSimulation} 
              className={`run-sim-btn ${isSimulating ? 'simulating' : ''}`}
            >
              <RefreshCw size={16} className={isSimulating ? 'spin-icon' : ''} />
              <span className="mono">{isSimulating ? "COMPUTING MODEL..." : "RE-RUN SCENARIO MODEL"}</span>
            </button>
            {backendSimulationInfo && (
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--color-lime)', textAlign: 'center' }}>
                ✓ MODEL COMPUTED ({new Date(backendSimulationInfo.timestamp).toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Simulation Output Canvas, Comparison & Formulation */}
        <div className="output-panel editorial-card">
          <div className="panel-header-strip">
            <Activity size={14} color="var(--color-amber)" />
            <span className="mono header-title">[SIMULATION LAB] 2D TERRAIN INUNDATION CROSS-SECTION</span>
          </div>

          {/* Canvas Cross-Section */}
          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              width={700} 
              height={220} 
              className="hydro-canvas"
            />
            <div className="canvas-overlay-tag mono">
              <span>SIMULATED LOWLAND BASIN (CROSS-SECTION ACCUMULATION)</span>
            </div>
            <div className="canvas-depth-tag mono">
              <span>ESTIMATED PEAK DEPTH: ~{calculatedPeakDepthCm} cm</span>
            </div>
          </div>

          {/* Calculated Output Metrics Grid */}
          <div className="metrics-summary-grid">
            <div className="summary-card">
              <span className="label-uppercase">SIMULATED PEAK WATER DEPTH</span>
              <div className="mono summary-value accent-orange">~{calculatedPeakDepthCm} cm</div>
              <span className="mono summary-sub">[ESTIMATED MODEL OUTPUT]</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">SIMULATED INUNDATION TIME</span>
              <div className="mono summary-value accent-lime">~{calculatedTimeToInundationMin} min</div>
              <span className="mono summary-sub">[TIME UNTIL STANDING WATER]</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">INUNDATED ROAD KM</span>
              <div className="mono summary-value text-grey">UNAVAILABLE</div>
              <span className="mono summary-sub">Requires road sensor telemetry</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">POPULATION AT RISK</span>
              <div className="mono summary-value text-grey">UNAVAILABLE</div>
              <span className="mono summary-sub">Requires ward census GIS telemetry</span>
            </div>
          </div>

          {/* Scenario Comparison Card (Baseline vs Current Changed Scenario) */}
          <div className="scenario-comparison-card mono">
            <div className="comp-header">
              <div className="comp-title-row">
                <Info size={15} color="var(--color-lime)" />
                <strong>SCENARIO COMPARISON: CURRENT EXPERIMENT VS BASELINE</strong>
              </div>
              {!isAtBaseline && (
                <button onClick={resetToBaseline} className="comp-reset-btn">
                  RESET TO BASELINE
                </button>
              )}
            </div>

            <div className="comp-table">
              <div className="comp-row comp-head-row">
                <span>METRIC</span>
                <span>BASELINE (65mm/h)</span>
                <span>CURRENT EXPERIMENT</span>
                <span>DELTA (VARIANCE)</span>
              </div>
              <div className="comp-row">
                <span>Peak Water Depth:</span>
                <span>{BASELINE_OUTPUTS.peakDepthCm} cm</span>
                <span className="text-orange">{calculatedPeakDepthCm} cm</span>
                <span className={depthDelta > 0 ? 'text-red' : depthDelta < 0 ? 'text-lime' : 'text-grey'}>
                  {depthDelta === 0 ? '0 cm (Identical)' : `${depthDelta > 0 ? '+' : ''}${depthDelta} cm`}
                </span>
              </div>
              <div className="comp-row">
                <span>Inundation Time:</span>
                <span>{BASELINE_OUTPUTS.timeToInundationMin} min</span>
                <span className="text-lime">{calculatedTimeToInundationMin} min</span>
                <span className={timeDelta < 0 ? 'text-red' : timeDelta > 0 ? 'text-lime' : 'text-grey'}>
                  {timeDelta === 0 ? '0 min (Identical)' : `${timeDelta > 0 ? '+' : ''}${timeDelta} min`}
                </span>
              </div>
              <div className="comp-row">
                <span>Scenario Risk Level:</span>
                <span>HIGH</span>
                <span className={calculatedRiskLevel === 'HIGH' ? 'text-red' : 'text-orange'}>
                  {calculatedRiskLevel}
                </span>
                <span className="text-grey">
                  {calculatedRiskLevel === 'HIGH' ? 'Unchanged (High)' : 'Reduced Risk'}
                </span>
              </div>
            </div>
          </div>

          {/* Mathematical Model Formulation & Estimation Mechanics */}
          <div className="model-formulation-card mono">
            <div className="formula-header">
              <HelpCircle size={15} color="var(--color-orange)" />
              <strong>HOW THE SIMULATION ESTIMATES OUTPUT (MATHEMATICAL MODEL)</strong>
            </div>
            
            <div className="formula-box">
              <code>Peak Depth (cm) = (Rainfall × 0.7) + (Surge × 18) + ((100 - Drainage) × 0.45)</code>
              <code>Time to Inundation (min) = max(10, 120 - (Rainfall × 0.6) - (Surge × 12))</code>
            </div>

            <div className="formula-factors-grid">
              <div className="factor-item">
                <strong>1. Rainfall Accumulation Factor (0.7x):</strong> Each 1 mm/hr of precipitation contributes approximately 0.7 cm to urban lowland basin accumulation over the event duration.
              </div>
              <div className="factor-item">
                <strong>2. Marine Tidal Surge Factor (18x):</strong> Each 1.0m of marine storm surge creates ~18 cm of hydraulic backflow head, hindering stormwater outfalls.
              </div>
              <div className="factor-item">
                <strong>3. Drainage Deficit Factor (0.45x):</strong> Siltation and culvert blockages retain water; each 1% drop in drainage network efficiency adds ~0.45 cm of ponding.
              </div>
            </div>
          </div>

          {/* Model Assumptions Card */}
          <div className="model-assumptions-card mono">
            <span className="label-uppercase" style={{ fontSize: '0.65rem' }}>HYDRODYNAMIC MODEL ASSUMPTIONS</span>
            <ul className="assumptions-list">
              <li><strong>Catchment Basin:</strong> Assumes low-lying coastal urban basin with 6m average elevation above mean sea level.</li>
              <li><strong>Precipitation Uniformity:</strong> Assumes constant spatial and temporal rainfall distribution over the simulation duration.</li>
              <li><strong>Drainage Dynamics:</strong> Assumes gravity-fed stormwater culverts without secondary mechanical pumping station failure.</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        .scenario-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .scenario-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-badge-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .preset-buttons-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .preset-btn {
          padding: 8px 12px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-ivory-muted);
          transition: all var(--transition-fast);
          cursor: pointer;
        }

        .preset-btn:hover, .preset-btn.active {
          border-color: var(--color-orange);
          color: var(--color-orange);
          background: rgba(255, 100, 56, 0.08);
        }

        .sim-notice-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          background: rgba(229, 169, 60, 0.08);
          border: 1px solid rgba(229, 169, 60, 0.3);
          border-left: 4px solid var(--color-amber);
          border-radius: 4px;
          font-size: 0.74rem;
        }

        .notice-body {
          color: var(--color-ivory);
          line-height: 1.4;
        }

        .scenario-main-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 16px;
        }

        .controls-panel {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .controls-form {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slider-val {
          font-size: 0.88rem;
          font-weight: 700;
          color: var(--color-orange);
        }

        .hydro-slider {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: #202322;
          outline: none;
        }

        .hydro-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-orange);
          cursor: pointer;
          box-shadow: 0 0 10px var(--color-orange);
        }

        .slider-ticks {
          display: flex;
          justify-content: space-between;
          font-size: 0.65rem;
          color: var(--color-grey);
        }

        .selected-inputs-card {
          padding: 12px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.72rem;
        }

        .input-summary-row {
          display: flex;
          justify-content: space-between;
          color: var(--color-grey);
        }

        .input-summary-row strong {
          color: var(--color-ivory);
        }

        .run-sim-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .run-sim-btn:hover { background: #FF7B54; }

        .output-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 20px;
        }

        .canvas-wrapper {
          position: relative;
          width: 100%;
          height: 220px;
          background: rgba(9, 10, 10, 0.8);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hydro-canvas {
          width: 100%;
          height: 100%;
        }

        .canvas-overlay-tag {
          position: absolute;
          top: 10px;
          left: 14px;
          font-size: 0.65rem;
          color: var(--color-grey);
          background: rgba(9, 10, 10, 0.75);
          padding: 4px 8px;
          border-radius: 2px;
        }

        .canvas-depth-tag {
          position: absolute;
          top: 10px;
          right: 14px;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--color-orange);
          background: rgba(9, 10, 10, 0.75);
          padding: 4px 8px;
          border-radius: 2px;
        }

        .metrics-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 0 16px;
        }

        .summary-card {
          background: rgba(9, 10, 10, 0.6);
          padding: 14px;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .summary-value {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--color-ivory);
        }

        .summary-value.accent-orange { color: var(--color-orange); }
        .summary-value.accent-lime { color: var(--color-lime); }
        .summary-value.text-grey { color: var(--color-grey); font-size: 0.95rem; }

        .summary-sub {
          font-size: 0.62rem;
          color: var(--color-grey);
        }

        .scenario-comparison-card {
          margin: 0 16px;
          padding: 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--color-lime);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.72rem;
        }

        .comp-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .comp-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-lime);
        }

        .comp-reset-btn {
          padding: 4px 10px;
          background: rgba(240, 237, 228, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          font-size: 0.65rem;
          color: var(--color-ivory);
          cursor: pointer;
        }

        .comp-table {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .comp-row {
          display: grid;
          grid-template-columns: 180px 140px 140px 1fr;
          padding: 6px 8px;
          background: rgba(9, 10, 10, 0.4);
          border-radius: 2px;
          align-items: center;
        }

        .comp-head-row {
          background: transparent;
          color: var(--color-grey);
          font-size: 0.65rem;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 6px;
        }

        .text-orange { color: var(--color-orange); font-weight: 700; }
        .text-red { color: #FF5252; font-weight: 700; }
        .text-lime { color: var(--color-lime); font-weight: 700; }
        .text-grey { color: var(--color-grey); }

        .model-formulation-card {
          margin: 0 16px;
          padding: 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.72rem;
        }

        .formula-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-orange);
        }

        .formula-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 10px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
        }

        .formula-box code {
          color: var(--color-lime);
          font-size: 0.75rem;
        }

        .formula-factors-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .factor-item {
          color: var(--color-grey);
          font-size: 0.68rem;
          line-height: 1.35;
        }

        .factor-item strong {
          color: var(--color-ivory);
          display: block;
          margin-bottom: 2px;
        }

        .model-assumptions-card {
          margin: 0 16px;
          padding: 12px 14px;
          background: rgba(9, 10, 10, 0.4);
          border: 1px dashed var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.68rem;
          color: var(--color-grey);
        }

        .assumptions-list {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .assumptions-list strong {
          color: var(--color-ivory);
        }

        @media (max-width: 1000px) {
          .scenario-main-grid {
            grid-template-columns: 1fr;
          }
          .metrics-summary-grid {
            grid-template-columns: 1fr 1fr;
          }
          .formula-factors-grid {
            grid-template-columns: 1fr;
          }
          .comp-row {
            grid-template-columns: 1fr 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}
