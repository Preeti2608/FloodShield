import React, { useState } from 'react';
import { Bot, Sparkles, AlertTriangle, ShieldAlert, Cpu, RefreshCw, Send, CheckCircle2, ChevronRight, Hospital, Navigation, Info } from 'lucide-react';
import { COPILOT_SUGGESTIONS } from '../data/mockData';
import { assessWithCopilot } from '../api/apiClient';

export default function CopilotView() {
  const [selectedPrompt, setSelectedPrompt] = useState(COPILOT_SUGGESTIONS[0]);
  const [customInput, setCustomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [activeLocation, setActiveLocation] = useState('LOC-1');

  // Trigger Assessment
  const handleRunAssessment = async (queryText) => {
    const q = queryText || customInput || selectedPrompt;
    if (!q.trim()) return;

    setIsLoading(true);
    try {
      const result = await assessWithCopilot(q, activeLocation);
      setAssessmentResult(result);
    } catch (e) {
      console.error('[CopilotView] Assessment error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="copilot-view-container animate-fade-in">
      {/* Header */}
      <div className="copilot-header">
        <div>
          <span className="mono label-uppercase">SECTION 03</span>
          <h2 className="section-title">RESPONSE COPILOT</h2>
          <span className="mono desc-sub">AI ENVIRONMENTAL INTELLIGENCE & DISASTER DECISION SUPPORT CONSOLE</span>
        </div>

        <div className="copilot-badge-pill mono">
          <Cpu size={14} color="var(--color-lime)" />
          <span>
            {assessmentResult?.provider ? assessmentResult.provider.toUpperCase() : 'AWS LAMBDA & BEDROCK AGENT READY'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="copilot-main-grid">
        {/* Left Side: Interactive Triage Prompts & Quick Controls */}
        <div className="suggestions-panel editorial-card">
          <div className="panel-header-strip">
            <Sparkles size={14} color="var(--color-orange)" />
            <span className="mono header-title">OPERATIONAL TRIAGE PROMPTS</span>
          </div>

          <div className="suggestions-list">
            {COPILOT_SUGGESTIONS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedPrompt(prompt);
                  handleRunAssessment(prompt);
                }}
                className={`suggestion-chip mono ${selectedPrompt === prompt ? 'active' : ''}`}
              >
                <span>{prompt}</span>
                <ChevronRight size={12} color="var(--color-orange)" />
              </button>
            ))}
          </div>

          <div className="copilot-info-box mono">
            <ShieldAlert size={16} color="var(--color-lime)" />
            <div>
              <strong>FACTUAL GROUNDING:</strong> Copilot advice is strictly anchored to live DynamoDB incident reports, Open-Meteo precipitation feeds, and verified elevation baselines.
            </div>
          </div>
        </div>

        {/* Right Side: Interactive AI Decision Console */}
        <div className="chat-console-panel editorial-card">
          <div className="panel-header-strip">
            <Bot size={14} color="var(--color-lime)" />
            <span className="mono header-title">TACTICAL ASSESSMENT CONSOLE</span>
            {assessmentResult && (
              <span className="badge badge-lime mono">
                {assessmentResult.provider?.includes('Bedrock') ? 'AMAZON BEDROCK AI' : 'EVIDENCE ENGINE'}
              </span>
            )}
          </div>

          <div className="copilot-console-content">
            {/* Custom Input Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleRunAssessment(customInput);
              }} 
              className="copilot-input-form"
            >
              <input
                type="text"
                placeholder="Ask Response Copilot for tactical flood assessment or emergency recommendations..."
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="copilot-text-input mono"
              />
              <button 
                type="submit" 
                disabled={isLoading || (!customInput.trim() && !selectedPrompt)}
                className="copilot-submit-btn"
              >
                {isLoading ? <RefreshCw size={16} className="spin-icon" /> : <Send size={16} />}
                <span>{isLoading ? 'ANALYZING...' : 'RUN TRIAGE'}</span>
              </button>
            </form>

            {/* Assessment Results Area */}
            {isLoading ? (
              <div className="loading-state-box mono">
                <RefreshCw size={36} color="var(--color-orange)" className="spin-icon" />
                <p>Synthesizing evidence across active incidents, terrain data, and weather feeds...</p>
              </div>
            ) : assessmentResult ? (
              <div className="assessment-results-scroll">
                {/* Tactical Synthesis Card */}
                <div className="advice-card editorial-card">
                  <div className="advice-header mono">
                    <Sparkles size={14} color="var(--color-lime)" />
                    <span>SYNTHESIZED TACTICAL ADVICE</span>
                    <span className="advice-time mono">{new Date(assessmentResult.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="advice-body">
                    {assessmentResult.advice.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>
                </div>

                {/* Grounded Evidence Breakdown */}
                {assessmentResult.evidence && (
                  <div className="evidence-grid">
                    {/* Facilities Status */}
                    <div className="evidence-card">
                      <div className="evidence-title mono">
                        <Hospital size={14} color="var(--color-orange)" />
                        <span>AFFECTED CRITICAL FACILITIES</span>
                      </div>
                      <div className="facilities-list mono">
                        {(assessmentResult.evidence.facilities || []).map((fac, fIdx) => (
                          <div key={fIdx} className="facility-item">
                            <span className="facility-name">{fac.name}</span>
                            <span className={`facility-status ${fac.criticalLevel === 'CRITICAL' ? 'status-critical' : 'status-ok'}`}>
                              {fac.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Road Corridors */}
                    <div className="evidence-card">
                      <div className="evidence-title mono">
                        <Navigation size={14} color="var(--color-lime)" />
                        <span>TRANSIT & ROAD PASSABILITY</span>
                      </div>
                      <div className="roads-list mono">
                        {(assessmentResult.evidence.roadCorridors || []).map((road, rIdx) => (
                          <div key={rIdx} className="road-item">
                            <span className="road-segment">{road.segment}</span>
                            <span className={`road-status ${road.status?.includes('IMPASSABLE') ? 'status-critical' : 'status-ok'}`}>
                              {road.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations Columns */}
                {assessmentResult.recommendations && (
                  <div className="recommendations-row">
                    <div className="rec-column citizen-recs">
                      <div className="rec-header mono">
                        <CheckCircle2 size={14} color="var(--color-lime)" />
                        <span>CITIZEN PRECAUTIONS</span>
                      </div>
                      <ul className="rec-list mono">
                        {assessmentResult.recommendations.citizenPrecautions.map((item, cIdx) => (
                          <li key={cIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rec-column responder-recs">
                      <div className="rec-header mono">
                        <AlertTriangle size={14} color="var(--color-orange)" />
                        <span>RESPONDER PRIORITIES</span>
                      </div>
                      <ul className="rec-list mono">
                        {assessmentResult.recommendations.responderPriorities.map((item, rIdx) => (
                          <li key={rIdx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Explicit Disclaimer */}
                <div className="disclaimer-strip mono">
                  <Info size={14} color="var(--color-grey)" />
                  <span>{assessmentResult.disclaimer}</span>
                </div>
              </div>
            ) : (
              /* Initial State */
              <div className="initial-copilot-state mono">
                <Bot size={48} color="var(--color-lime)" />
                <h3>OPERATIONAL TRIAGE READY</h3>
                <p>
                  Click any suggested prompt on the left or type your query above to assess current waterlogging risk, verify critical facilities, and receive evidence-grounded action plans.
                </p>
                <button 
                  onClick={() => handleRunAssessment(COPILOT_SUGGESTIONS[0])}
                  className="start-assessment-btn"
                >
                  <Sparkles size={14} />
                  <span>RUN DEFAULT ASSESSMENT</span>
                </button>
              </div>
            )}
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
          color: var(--color-lime);
        }

        .copilot-main-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 600px;
        }

        .suggestions-panel {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0;
          overflow: hidden;
        }

        .suggestions-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow-y: auto;
          flex: 1;
        }

        .suggestion-chip {
          padding: 12px 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.74rem;
          color: var(--color-ivory);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          text-align: left;
          transition: all 0.2s ease;
        }

        .suggestion-chip:hover, .suggestion-chip.active {
          border-color: var(--color-orange);
          background: rgba(255, 100, 56, 0.08);
          color: var(--color-orange);
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

        .copilot-console-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 16px;
          overflow: hidden;
        }

        .copilot-input-form {
          display: flex;
          gap: 10px;
        }

        .copilot-text-input {
          flex: 1;
          background: #111312;
          border: 1px solid var(--border-subtle);
          padding: 12px 16px;
          color: var(--color-ivory);
          font-size: 0.8rem;
          border-radius: 4px;
        }

        .copilot-text-input:focus {
          border-color: var(--color-lime);
          outline: none;
        }

        .copilot-submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-lime);
          color: #090A0A;
          border: none;
          padding: 0 20px;
          font-weight: 700;
          font-size: 0.75rem;
          font-family: var(--font-mono);
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .copilot-submit-btn:hover:not(:disabled) {
          background: #d4fa84;
        }

        .copilot-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .assessment-results-scroll {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-right: 6px;
        }

        .advice-card {
          background: rgba(22, 24, 23, 0.6);
          border: 1px solid var(--color-lime);
          padding: 18px;
          border-radius: 4px;
        }

        .advice-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-lime);
          font-size: 0.74rem;
          font-weight: 700;
          margin-bottom: 12px;
        }

        .advice-time {
          margin-left: auto;
          color: var(--color-grey);
          font-size: 0.68rem;
        }

        .advice-body {
          font-size: 0.84rem;
          line-height: 1.6;
          color: var(--color-ivory);
          white-space: pre-line;
        }

        .evidence-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .evidence-card {
          background: rgba(9, 10, 10, 0.7);
          border: 1px solid var(--border-subtle);
          padding: 14px;
          border-radius: 4px;
        }

        .evidence-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-ivory);
          margin-bottom: 10px;
        }

        .facilities-list, .roads-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .facility-item, .road-item {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          gap: 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 4px;
        }

        .status-critical {
          color: var(--color-orange);
          font-weight: 600;
        }

        .status-ok {
          color: var(--color-lime);
        }

        .recommendations-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .rec-column {
          background: rgba(9, 10, 10, 0.7);
          border: 1px solid var(--border-subtle);
          padding: 14px;
          border-radius: 4px;
        }

        .rec-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--color-ivory);
          margin-bottom: 10px;
        }

        .rec-list {
          padding-left: 18px;
          font-size: 0.72rem;
          line-height: 1.5;
          color: var(--color-grey);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .disclaimer-strip {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.68rem;
          color: var(--color-grey);
          padding: 10px 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
        }

        .initial-copilot-state, .loading-state-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 14px;
          padding: 40px;
        }

        .initial-copilot-state h3 {
          font-family: var(--font-display);
          color: var(--color-ivory);
          font-size: 1.4rem;
        }

        .initial-copilot-state p {
          max-width: 500px;
          color: var(--color-grey);
          font-size: 0.8rem;
          line-height: 1.5;
        }

        .start-assessment-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: var(--color-lime);
          color: #090A0A;
          border: none;
          font-weight: 700;
          font-family: var(--font-mono);
          font-size: 0.74rem;
          border-radius: 4px;
          cursor: pointer;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .copilot-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .evidence-grid, .recommendations-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
