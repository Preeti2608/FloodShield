import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, RefreshCw, Activity } from 'lucide-react';
import { PRESET_SCENARIOS } from '../data/mockData';

export default function ScenarioLabView() {
  const [rainfallRate, setRainfallRate] = useState(65); // mm/hr
  const [surgeHeight, setSurgeHeight] = useState(1.5); // m
  const [drainEfficiency, setDrainEfficiency] = useState(50); // %
  const [duration, setDuration] = useState(4); // hours
  const [isSimulating, setIsSimulating] = useState(false);
  
  const canvasRef = useRef(null);

  const applyPreset = (preset) => {
    setRainfallRate(preset.rainfallRate);
    setSurgeHeight(preset.surgeHeight);
    setDrainEfficiency(preset.drainEfficiency);
    setDuration(preset.durationHours);
  };

  // Simulated hydrodynamic formula calculation
  const calculatedPeakDepthCm = Math.round(
    (rainfallRate * 0.7) + (surgeHeight * 18) + ((100 - drainEfficiency) * 0.45)
  );

  const calculatedTimeToInundationMin = Math.max(10, Math.round(
    120 - (rainfallRate * 0.6) - (surgeHeight * 12)
  ));

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

      // Draw Terrain Profile (City cross-section)
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
      const waterLevelY = Math.max(height - 180, height - 40 - (calculatedPeakDepthCm * 1.5));

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
      waterGrad.addColorStop(0, 'rgba(255, 100, 56, 0.4)');
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

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="scenario-view-container animate-fade-in">
      {/* Header */}
      <div className="scenario-header">
        <div>
          <span className="mono label-uppercase">SECTION 04</span>
          <h2 className="section-title">SCENARIO LAB</h2>
          <span className="mono desc-sub">HYDRODYNAMIC RAINFALL SIMULATION EXPERIMENT</span>
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
        </div>
      </div>

      {/* Main Grid: Controls + Visual Output Canvas */}
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
                <span>75 (Heavy)</span>
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
                <span>3.5m</span>
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
                <span>12h</span>
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
          </div>
        </div>

        {/* Right Side: Simulation Output Canvas & Metrics */}
        <div className="output-panel editorial-card">
          <div className="panel-header-strip">
            <Activity size={14} color="var(--color-amber)" />
            <span className="mono header-title">[SIMULATED SCENARIO] 2D TERRAIN PROFILE</span>
          </div>

          <div className="canvas-wrapper">
            <canvas 
              ref={canvasRef} 
              width={700} 
              height={260} 
              className="hydro-canvas"
            />
            <div className="canvas-overlay-tag mono">
              <span>SIMULATED LOWLAND BASIN CROSS-SECTION</span>
            </div>
          </div>

          {/* Calculated Output Cards */}
          <div className="metrics-summary-grid">
            <div className="summary-card">
              <span className="label-uppercase">SIMULATED PEAK WATER DEPTH</span>
              <div className="mono summary-value accent-orange">~{calculatedPeakDepthCm} cm</div>
              <span className="mono summary-sub">[SIMULATED SCENARIO MODEL OUTPUT]</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">SIMULATED INUNDATION TIME</span>
              <div className="mono summary-value accent-lime">~{calculatedTimeToInundationMin} min</div>
              <span className="mono summary-sub">[SIMULATED ESTIMATE]</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">INUNDATED ROAD KM</span>
              <div className="mono summary-value text-grey">UNAVAILABLE</div>
              <span className="mono summary-sub">Requires road sensor network</span>
            </div>

            <div className="summary-card">
              <span className="label-uppercase">POPULATION AT RISK</span>
              <div className="mono summary-value text-grey">UNAVAILABLE</div>
              <span className="mono summary-sub">Requires ward census telemetry</span>
            </div>
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
          gap: 20px;
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
        }

        .preset-btn:hover {
          border-color: var(--color-orange);
          color: var(--color-orange);
          background: rgba(255, 100, 56, 0.08);
        }

        .scenario-main-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 580px;
        }

        .controls-panel {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .controls-form {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .slider-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slider-val {
          font-size: 0.9rem;
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

        .run-sim-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.82rem;
          margin-top: 10px;
          transition: all var(--transition-fast);
        }

        .run-sim-btn:hover { background: #FF7B54; }

        .output-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .canvas-wrapper {
          position: relative;
          width: 100%;
          height: 280px;
          background: rgba(9, 10, 10, 0.8);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hydro-canvas {
          width: 100%;
          height: 100%;
        }

        .canvas-overlay-tag {
          position: absolute;
          top: 12px;
          left: 16px;
          font-size: 0.68rem;
          color: var(--color-grey);
          background: rgba(9, 10, 10, 0.7);
          padding: 4px 8px;
          border-radius: 2px;
        }

        .metrics-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 20px;
        }

        .summary-card {
          background: rgba(9, 10, 10, 0.6);
          padding: 16px;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .summary-value {
          font-size: 1.4rem;
          font-weight: 800;
          color: var(--color-ivory);
        }

        .summary-value.accent-orange { color: var(--color-orange); }
        .summary-value.accent-lime { color: var(--color-lime); }
        .summary-value.text-grey { color: var(--color-grey); font-size: 1.1rem; }

        .summary-sub {
          font-size: 0.65rem;
          color: var(--color-grey);
        }

        @media (max-width: 900px) {
          .scenario-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .metrics-summary-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
