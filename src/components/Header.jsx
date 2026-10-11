import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Eye, EyeOff, ArrowLeft, Map, AlertTriangle, Bot, SlidersHorizontal, Compass, PlusCircle } from 'lucide-react';
import { toggleAtmosphericAudio } from '../utils/audioAmbiance';
import { getHealth } from '../api/apiClient';

export default function Header({ currentRoute, navigateTo, reducedMotion, toggleReducedMotion, reportsCount = 0, weatherOk = true }) {
  const [audioActive, setAudioActive] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    getHealth().then(res => setBackendStatus(res));
  }, []);

  const handleAudioToggle = () => {
    const newState = toggleAtmosphericAudio(!audioActive);
    setAudioActive(newState);
  };

  const navItems = [
    { path: '/atlas', label: '01 — ATLAS', icon: Map },
    { path: '/incidents', label: '02 — INCIDENTS', icon: AlertTriangle },
    { path: '/copilot', label: '03 — COPILOT', icon: Bot },
    { path: '/scenario-lab', label: '04 — SCENARIO LAB', icon: SlidersHorizontal },
    { path: '/safe-passage', label: '05 — SAFE PASSAGE', icon: Compass },
    { path: '/report', label: '06 — REPORT', icon: PlusCircle },
  ];

  // Section-specific accurate data mode badge (Requirement 7)
  const getSectionDataStatus = () => {
    const isCloud = backendStatus?.connected;
    switch (currentRoute) {
      case '/atlas':
        return weatherOk
          ? { label: 'LIVE (Open-Meteo Weather)', dot: 'lime' }
          : { label: 'WEATHER DATA UNAVAILABLE', dot: 'grey' };
      case '/incidents':
        return isCloud
          ? { label: `LIVE (AWS DynamoDB · ${backendStatus.region})`, dot: 'lime' }
          : (reportsCount > 0
            ? { label: 'USER-REPORTED · LOCAL STORAGE', dot: 'orange' }
            : { label: 'NO USER REPORTS LOGGED', dot: 'grey' });
      case '/copilot':
        return isCloud
          ? { label: 'AI COPILOT CONNECTED (AWS)', dot: 'lime' }
          : { label: 'AI COPILOT (LOCAL TRIAGE ENGINE)', dot: 'lime' };
      case '/scenario-lab':
        return { label: 'SIMULATED SCENARIO', dot: 'amber' };
      case '/safe-passage':
        return { label: 'HAZARD-AWARE ROUTE ESTIMATE', dot: 'amber' };
      case '/report':
        return isCloud
          ? { label: 'AWS DYNAMODB & LOCAL STORAGE', dot: 'lime' }
          : { label: 'LOCAL FORM PERSISTENCE', dot: 'orange' };
      default:
        return isCloud
          ? { label: `AWS CLOUD READY (${backendStatus.region})`, dot: 'lime' }
          : { label: 'FLOODSHIELD PLATFORM', dot: 'lime' };
    }
  };

  const status = getSectionDataStatus();

  return (
    <header className="header-bar">
      <div className="header-left">
        {currentRoute !== '/' && (
          <button 
            onClick={() => navigateTo('/')}
            className="return-btn"
            title="Return to Gallery"
          >
            <ArrowLeft size={16} />
            <span>GALLERY</span>
          </button>
        )}
        <div className="brand-block" onClick={() => navigateTo('/')} style={{ cursor: 'pointer' }}>
          <div className="brand-title">FLOODSHIELD</div>
          <div className="brand-subtitle">ENVIRONMENTAL INTELLIGENCE</div>
        </div>
      </div>

      <div className="header-center">
        {/* Quick Nav Strip for internal views */}
        {currentRoute !== '/' && (
          <nav className="header-nav-strip">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className={`nav-strip-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={14} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="header-right">
        {/* Accurate Section-Specific Data Mode Status Pill */}
        <div className="system-pill" title="Section-Specific Data Integrity Status">
          <span className={`status-dot ${status.dot}`}></span>
          <span className="mono status-text">{status.label}</span>
        </div>

        {/* Audio Ambiance Synthesizer Toggle */}
        <button 
          onClick={handleAudioToggle} 
          className={`icon-util-btn ${audioActive ? 'active-audio' : ''}`}
          title={audioActive ? "Mute Atmospheric Sound" : "Enable Atmospheric Rain/Radar Audio"}
        >
          {audioActive ? <Volume2 size={16} color="var(--color-lime)" /> : <VolumeX size={16} color="var(--color-grey)" />}
        </button>

        {/* Reduced Motion Toggle */}
        <button
          onClick={toggleReducedMotion}
          className={`icon-util-btn ${reducedMotion ? 'active-motion' : ''}`}
          title={reducedMotion ? "Enable Full Motion" : "Enable Reduced Motion"}
        >
          {reducedMotion ? <EyeOff size={16} color="var(--color-orange)" /> : <Eye size={16} color="var(--color-grey)" />}
        </button>
      </div>

      <style>{`
        .header-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          padding: 0 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(9, 10, 10, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-subtle);
          z-index: 1000;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .return-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(240, 237, 228, 0.05);
          border: 1px solid var(--border-strong);
          border-radius: 2px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--color-ivory);
          transition: all var(--transition-fast);
        }

        .return-btn:hover {
          background: var(--color-orange);
          border-color: var(--color-orange);
          color: var(--bg-obsidian);
        }

        .brand-block {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          color: var(--color-ivory);
          line-height: 1;
        }

        .brand-subtitle {
          font-family: var(--font-mono);
          font-size: 0.625rem;
          letter-spacing: 0.16em;
          color: var(--color-grey);
          margin-top: 3px;
        }

        .header-nav-strip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(22, 24, 23, 0.6);
          padding: 3px;
          border-radius: 4px;
          border: 1px solid var(--border-subtle);
        }

        .nav-strip-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 2px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-grey);
          transition: all var(--transition-fast);
        }

        .nav-strip-item:hover {
          color: var(--color-ivory);
          background: rgba(240, 237, 228, 0.05);
        }

        .nav-strip-item.active {
          color: var(--color-orange);
          background: rgba(255, 100, 56, 0.12);
          border: 1px solid rgba(255, 100, 56, 0.3);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .system-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
        }

        .status-text {
          font-size: 0.68rem;
          color: var(--color-ivory-muted);
        }

        .status-dot.amber {
          background: var(--color-amber);
          box-shadow: 0 0 10px var(--color-amber);
        }
        .status-dot.grey {
          background: var(--color-grey);
          box-shadow: none;
          animation: none;
        }

        .icon-util-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 2px;
          background: rgba(22, 24, 23, 0.6);
          border: 1px solid var(--border-subtle);
          transition: all var(--transition-fast);
        }

        .icon-util-btn:hover {
          border-color: var(--border-strong);
          background: rgba(240, 237, 228, 0.08);
        }

        .icon-util-btn.active-audio {
          border-color: rgba(199, 243, 107, 0.4);
          background: rgba(199, 243, 107, 0.1);
        }

        .icon-util-btn.active-motion {
          border-color: rgba(255, 100, 56, 0.4);
          background: rgba(255, 100, 56, 0.1);
        }

        @media (max-width: 900px) {
          .header-nav-strip { display: none; }
          .status-text { display: none; }
          .header-bar { padding: 0 16px; }
        }
      `}</style>
    </header>
  );
}
