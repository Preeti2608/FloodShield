import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, Send, Eye, CheckCircle2, Clock, Inbox, PlusCircle } from 'lucide-react';
import { getReports } from '../api/apiClient';

export default function IncidentsView({ incidents = [], onUpdateIncident, navigateTo }) {
  const [incidentList, setIncidentList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [dataMode, setDataMode] = useState('UNAVAILABLE');

  useEffect(() => {
    getReports().then((res) => {
      const list = res.reports && res.reports.length > 0 ? res.reports : incidents;
      setIncidentList(list);
      setDataMode(res.dataMode || (list.length > 0 ? 'USER-REPORTED' : 'UNAVAILABLE'));
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
    });
  }, [incidents]);

  const filteredIncidents = incidentList.filter(inc => {
    if (statusFilter === 'ALL') return true;
    return inc.status === statusFilter;
  });

  const selectedIncident = incidentList.find(inc => inc.id === selectedId) || filteredIncidents[0];

  const handleAction = (incidentId, newStatus, actionText) => {
    const updated = incidentList.map(item => {
      if (item.id === incidentId) {
        return {
          ...item,
          status: newStatus,
          actionHistory: [actionText, ...(item.actionHistory || [])]
        };
      }
      return item;
    });
    setIncidentList(updated);
    if (onUpdateIncident) onUpdateIncident(updated);
  };

  return (
    <div className="incidents-view-container animate-fade-in">
      {/* View Header */}
      <div className="incidents-header">
        <div>
          <span className="mono label-uppercase">SECTION 02</span>
          <h2 className="section-title">INCIDENT RADAR</h2>
          <span className="mono desc-sub">CITIZEN DISPATCH QUEUE & VERIFIABLE TRIAGE CONSOLE</span>
        </div>

        {/* Filter Pills */}
        <div className="status-pill-group">
          {['ALL', 'UNVERIFIED', 'VERIFIED', 'DISPATCHED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`status-filter-btn ${statusFilter === st ? 'active' : ''}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="incidents-main-grid">
        {/* Left Side: Incident Feed List */}
        <div className="incident-feed-panel editorial-card">
          <div className="feed-header-strip">
            <AlertTriangle size={14} color="var(--color-orange)" />
            <span className="mono header-title">ACTIVE INCIDENTS ({filteredIncidents.length})</span>
            <span className="badge badge-grey mono">{dataMode}</span>
          </div>

          <div className="incident-feed-scroll">
            {filteredIncidents.length === 0 ? (
              /* Honest Empty State */
              <div className="empty-incidents-box mono">
                <Inbox size={32} color="var(--color-grey)" />
                <div className="empty-title">NO USER INCIDENTS LOGGED</div>
                <p className="empty-desc">
                  No citizen incidents are currently recorded. Submit a report via the Citizen Portal to populate this operations feed.
                </p>
                {navigateTo && (
                  <button onClick={() => navigateTo('/report')} className="report-trigger-btn">
                    <PlusCircle size={14} />
                    <span>REPORT AN INCIDENT</span>
                  </button>
                )}
              </div>
            ) : (
              filteredIncidents.map(inc => {
                const isSelected = inc.id === selectedId;
                let severityBadge = 'badge-orange';
                if (inc.severity === 'CRITICAL') severityBadge = 'badge-red';
                if (inc.severity === 'HIGH') severityBadge = 'badge-orange';
                if (inc.severity === 'MEDIUM') severityBadge = 'badge-amber';
                if (inc.severity === 'LOW') severityBadge = 'badge-lime';

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedId(inc.id)}
                    className={`incident-feed-card ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="feed-card-top">
                      <span className="mono inc-id">{inc.id}</span>
                      <span className={`badge ${severityBadge}`}>{inc.severity}</span>
                    </div>

                    <div className="inc-title">{inc.title}</div>
                    <div className="inc-loc mono">{inc.location} • {inc.timestamp}</div>

                    <div className="feed-card-footer">
                      <div className="mono depth-pill">
                        Depth: {inc.waterDepthCm}cm
                      </div>
                      <div className="mono status-badge">
                        STATUS: {inc.status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Triage Console */}
        {selectedIncident ? (
          <div className="triage-console-panel editorial-card">
            <div className="console-header-strip">
              <span className="mono header-title">RESPONDER TRIAGE CONSOLE</span>
              <span className="mono inc-id">{selectedIncident.id}</span>
            </div>

            <div className="console-body">
              {/* Incident Title & Meta */}
              <div className="inc-hero-block">
                <div className="inc-hero-tags">
                  <span className={`badge ${selectedIncident.severity === 'CRITICAL' ? 'badge-red' : 'badge-orange'}`}>
                    {selectedIncident.severity} PRIORITY
                  </span>
                  <span className="badge badge-grey">MODE: {selectedIncident.dataMode || 'USER-REPORTED'}</span>
                </div>
                <h3 className="console-title">{selectedIncident.title}</h3>
                <p className="console-loc mono">{selectedIncident.location} • Reported by {selectedIncident.reporter}</p>
              </div>

              {/* Description & Evidence */}
              <div className="evidence-section">
                <span className="label-uppercase">USER REPORT DESCRIPTION & EVIDENCE</span>
                <p className="evidence-desc">{selectedIncident.description}</p>

                {selectedIncident.photoUrl && (
                  <div className="photo-evidence-wrap">
                    <img src={selectedIncident.photoUrl} alt="Evidence photo" className="evidence-photo" />
                    <div className="photo-overlay-tag mono">
                      <Eye size={12} /> USER ATTACHED PHOTO EVIDENCE
                    </div>
                  </div>
                )}
              </div>

              {/* Action Console Buttons for Responders */}
              <div className="action-buttons-section">
                <span className="label-uppercase">RESPONDER TRIAGE ACTIONS</span>
                <div className="action-btn-grid">
                  <button 
                    onClick={() => handleAction(selectedIncident.id, 'VERIFIED', 'Status updated to VERIFIED by Responder Console')}
                    className="triage-action-btn btn-verify"
                  >
                    <CheckCircle2 size={16} />
                    <span>VERIFY REPORT</span>
                  </button>

                  <button 
                    onClick={() => handleAction(selectedIncident.id, 'DISPATCHED', 'Emergency Unit Dispatched')}
                    className="triage-action-btn btn-dispatch"
                  >
                    <Send size={16} />
                    <span>DISPATCH UNIT</span>
                  </button>

                  <button 
                    onClick={() => handleAction(selectedIncident.id, 'RESOLVED', 'Marked as Resolved')}
                    className="triage-action-btn btn-resolve"
                  >
                    <CheckCircle size={16} />
                    <span>MARK RESOLVED</span>
                  </button>
                </div>
              </div>

              {/* Audit Trail Log */}
              <div className="audit-trail-section">
                <span className="label-uppercase">AUDIT LOG</span>
                <div className="audit-log-list mono">
                  {selectedIncident.actionHistory?.map((log, i) => (
                    <div key={i} className="audit-log-item">
                      <Clock size={12} color="var(--color-grey)" />
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="triage-console-panel editorial-card empty-console mono">
            <Inbox size={40} color="var(--color-grey)" />
            <span>Select an incident from the left queue to inspect details</span>
          </div>
        )}
      </div>

      <style>{`
        .incidents-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .incidents-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .status-pill-group {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-card);
          padding: 4px;
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
        }

        .status-filter-btn {
          padding: 6px 12px;
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--color-grey);
          border-radius: 2px;
          transition: all var(--transition-fast);
        }

        .status-filter-btn:hover { color: var(--color-ivory); }
        .status-filter-btn.active {
          background: var(--color-orange);
          color: var(--bg-obsidian);
          font-weight: 600;
        }

        .incidents-main-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 580px;
        }

        .incident-feed-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .feed-header-strip, .console-header-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(22, 24, 23, 0.8);
        }

        .incident-feed-scroll {
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          height: 100%;
        }

        .empty-incidents-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 12px;
          padding: 40px 20px;
          height: 100%;
        }

        .empty-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-ivory);
        }

        .empty-desc {
          font-size: 0.75rem;
          color: var(--color-grey);
          max-width: 280px;
          line-height: 1.4;
        }

        .report-trigger-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.72rem;
          margin-top: 8px;
        }

        .incident-feed-card {
          padding: 14px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .incident-feed-card:hover {
          border-color: var(--border-strong);
          background: var(--bg-card-elevated);
        }

        .incident-feed-card.selected {
          border-color: var(--color-orange);
          background: rgba(255, 100, 56, 0.08);
        }

        .feed-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .inc-id {
          font-size: 0.72rem;
          color: var(--color-grey);
        }

        .inc-title {
          font-family: var(--font-display);
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--color-ivory);
          margin-bottom: 4px;
        }

        .inc-loc {
          font-size: 0.72rem;
          color: var(--color-grey);
          margin-bottom: 10px;
        }

        .feed-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px dashed var(--border-subtle);
        }

        .depth-pill {
          font-size: 0.7rem;
          color: var(--color-orange);
          font-weight: 600;
        }

        .status-badge {
          font-size: 0.65rem;
          color: var(--color-ivory-muted);
        }

        .triage-console-panel {
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        .empty-console {
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: var(--color-grey);
          font-size: 0.8rem;
          gap: 12px;
        }

        .console-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .inc-hero-block {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .inc-hero-tags {
          display: flex;
          gap: 8px;
        }

        .console-title {
          font-size: 1.8rem;
          color: var(--color-ivory);
        }

        .console-loc {
          font-size: 0.8rem;
          color: var(--color-grey);
        }

        .evidence-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .evidence-desc {
          font-size: 0.9rem;
          color: var(--color-ivory-muted);
          line-height: 1.5;
        }

        .photo-evidence-wrap {
          position: relative;
          width: 100%;
          max-height: 240px;
          border-radius: 4px;
          overflow: hidden;
          border: 1px solid var(--border-subtle);
          margin-top: 8px;
        }

        .evidence-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-overlay-tag {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: rgba(9, 10, 10, 0.85);
          padding: 4px 10px;
          border-radius: 2px;
          font-size: 0.65rem;
          color: var(--color-ivory);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .action-buttons-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .action-btn-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .triage-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .btn-verify {
          background: rgba(199, 243, 107, 0.1);
          border: 1px solid rgba(199, 243, 107, 0.3);
          color: var(--color-lime);
        }
        .btn-verify:hover {
          background: var(--color-lime);
          color: var(--bg-obsidian);
        }

        .btn-dispatch {
          background: rgba(255, 100, 56, 0.1);
          border: 1px solid rgba(255, 100, 56, 0.3);
          color: var(--color-orange);
        }
        .btn-dispatch:hover {
          background: var(--color-orange);
          color: var(--bg-obsidian);
        }

        .btn-resolve {
          background: rgba(240, 237, 228, 0.08);
          border: 1px solid var(--border-strong);
          color: var(--color-ivory);
        }
        .btn-resolve:hover {
          background: var(--color-ivory);
          color: var(--bg-obsidian);
        }

        .audit-trail-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .audit-log-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .audit-log-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          color: var(--color-grey);
          background: rgba(9, 10, 10, 0.5);
          padding: 6px 10px;
          border-radius: 2px;
        }

        @media (max-width: 900px) {
          .incidents-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
          .action-btn-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
