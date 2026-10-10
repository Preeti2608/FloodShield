import React, { useState } from 'react';
import { Bot, Sparkles, AlertTriangle, ShieldAlert, Cpu, RefreshCw, Info, Terminal } from 'lucide-react';
import { COPILOT_SUGGESTIONS } from '../data/mockData';

export default function CopilotView() {
  return (
    <div className="copilot-view-container animate-fade-in">
      {/* Header */}
      <div className="copilot-header">
        <div>
          <span className="mono label-uppercase">SECTION 03</span>
          <h2 className="section-title">RESPONSE COPILOT</h2>
          <span className="mono desc-sub">ENVIRONMENTAL INTELLIGENCE & DECISION SUPPORT CONSOLE</span>
        </div>

        <div className="copilot-badge-pill mono">
          <Cpu size={14} color="var(--color-grey)" />
          <span>BACKEND AGENT: AWAITING AWS DEPLOYMENT</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="copilot-main-grid">
        {/* Left Side: Prompt Reference */}
        <div className="suggestions-panel editorial-card">
          <div className="panel-header-strip">
            <Sparkles size={14} color="var(--color-orange)" />
            <span className="mono header-title">INTENDED TRIAGE PROMPTS</span>
          </div>

          <div className="suggestions-list">
            {COPILOT_SUGGESTIONS.map((prompt, idx) => (
              <div key={idx} className="suggestion-chip-disabled mono">
                <span>{prompt}</span>
              </div>
            ))}
          </div>

          <div className="copilot-info-box mono">
            <ShieldAlert size={16} color="var(--color-grey)" />
            <div>
              <strong>STRICT DATA INTEGRITY:</strong> Response Copilot tool execution is currently paused until AWS Bedrock / Lambda agent gateway is deployed by the backend teammate.
            </div>
          </div>
        </div>

        {/* Right Side: Honest Unavailable Console */}
        <div className="chat-console-panel editorial-card">
          <div className="panel-header-strip">
            <Bot size={14} color="var(--color-grey)" />
            <span className="mono header-title">COPILOT SERVICE STATUS</span>
          </div>

          <div className="copilot-unavailable-body mono">
            <div className="status-ring-grey">
              <Bot size={44} color="var(--color-grey)" />
            </div>

            <h3 className="unavail-title">BACKEND AGENT SERVICE UNAVAILABLE</h3>

            <p className="unavail-desc">
              The Response Copilot agent interface requires Amazon Bedrock / Lambda tool orchestration endpoints (`POST /assess`).
            </p>

            <div className="integrity-breakdown-card">
              <div className="breakdown-title">
                <Info size={14} color="var(--color-lime)" />
                <span>CONNECTIVITY & TELEMETRY STATUS</span>
              </div>
              <ul className="breakdown-list">
                <li><span className="dot dot-lime" /> <strong>Open-Meteo Weather Data:</strong> CONNECTED (Live precipitation rates available in Flood Atlas)</li>
                <li><span className="dot dot-orange" /> <strong>User Incident Reports:</strong> CONNECTED (Stored in browser local storage)</li>
                <li><span className="dot dot-grey" /> <strong>Stream Gauge Telemetry:</strong> UNAVAILABLE (Awaiting hardware probe deployment)</li>
                <li><span className="dot dot-grey" /> <strong>Copilot Tool Suite:</strong> UNAVAILABLE (Awaiting AWS Lambda endpoint `POST /assess`)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .copilot-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .copilot-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .copilot-badge-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          font-size: 0.72rem;
          color: var(--color-grey);
        }

        .copilot-main-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 580px;
        }

        .suggestions-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0;
        }

        .suggestions-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .suggestion-chip-disabled {
          padding: 12px 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.75rem;
          color: var(--color-grey);
        }

        .copilot-info-box {
          margin: 16px;
          padding: 14px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.7rem;
          color: var(--color-grey);
          display: flex;
          gap: 10px;
          line-height: 1.4;
        }

        .chat-console-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .copilot-unavailable-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
          gap: 16px;
        }

        .status-ring-grey {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(22, 24, 23, 0.6);
          border: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .unavail-title {
          font-family: var(--font-display);
          font-size: 1.6rem;
          color: var(--color-ivory);
        }

        .unavail-desc {
          font-size: 0.82rem;
          color: var(--color-grey);
          max-width: 520px;
          line-height: 1.5;
        }

        .integrity-breakdown-card {
          background: rgba(9, 10, 10, 0.7);
          border: 1px solid var(--border-subtle);
          padding: 18px;
          border-radius: 4px;
          text-align: left;
          max-width: 560px;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .breakdown-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-lime);
          font-size: 0.72rem;
          font-weight: 600;
        }

        .breakdown-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.75rem;
          color: var(--color-grey);
        }

        .breakdown-list li {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot-lime { background: var(--color-lime); }
        .dot-orange { background: var(--color-orange); }
        .dot-grey { background: var(--color-grey); }

        @media (max-width: 900px) {
          .copilot-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
