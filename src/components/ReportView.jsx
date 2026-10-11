import React, { useState } from 'react';
import { PlusCircle, MapPin, UploadCloud, CheckCircle2, AlertTriangle, Camera, ShieldAlert, ArrowRight, Trash2, Navigation } from 'lucide-react';
import { submitReport } from '../api/apiClient';
import { clearStoredReports } from '../utils/reportStorage';
import { searchGeocodeLocation } from '../api/geocodingApi';
import { getIncidentProvenanceLabel, getProvenanceBadgeClass } from '../utils/provenance';

export default function ReportView({ onReportAdded, navigateTo }) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Lower Parel Flyover Area');
  const [category, setCategory] = useState('Waterlogging');
  const [depthCm, setDepthCm] = useState(30);
  const [severity, setSeverity] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  
  // Explicit coordinate state
  const [reportCoords, setReportCoords] = useState(null); // { lat, lng } or null
  const [gpsStatus, setGpsStatus] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle GPS Auto-Detect for Citizen Report
  const handleAutoDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Browser geolocation unavailable');
      return;
    }

    setGpsStatus('Detecting GPS...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setReportCoords({ lat, lng });
        setLocation(`GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);
        setGpsStatus('GPS Coordinates Attached');
      },
      (err) => {
        setGpsStatus(`GPS error: ${err.message}. Using manual location.`);
      },
      { timeout: 8000 }
    );
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    let finalLat = reportCoords?.lat || null;
    let finalLng = reportCoords?.lng || null;

    // If coordinates are missing, attempt optional geocoding for the location string
    if (finalLat == null && location.trim()) {
      try {
        const geoRes = await searchGeocodeLocation(location);
        if (geoRes.success && geoRes.results.length > 0) {
          finalLat = geoRes.results[0].lat;
          finalLng = geoRes.results[0].lng;
        }
      } catch (e) {
        // If geocoding fails, keep coordinates as null
      }
    }

    const payload = {
      title,
      location,
      category,
      lat: finalLat,
      lng: finalLng,
      waterDepthCm: depthCm,
      severity,
      description,
      photoUrl: imagePreview
    };

    const result = await submitReport(payload);

    setIsSubmitting(false);

    if (result.success) {
      setSubmittedTicket({
        ...result.ticket,
        persistedToCloud: result.persistedToCloud,
        cloudFailed: result.cloudFailed,
        cloudError: result.cloudError
      });
      if (onReportAdded) onReportAdded();
    } else {
      setErrorMessage(result.error || 'Failed to persist incident report.');
    }
  };

  const handleClearReportsTest = () => {
    clearStoredReports();
    if (onReportAdded) onReportAdded();
    alert('All browser-local reports cleared for testing procedure.');
  };

  return (
    <div className="report-view-container animate-fade-in">
      {/* Header */}
      <div className="report-header">
        <div>
          <span className="mono label-uppercase">SECTION 06</span>
          <h2 className="section-title">REPORT AN INCIDENT</h2>
          <span className="mono desc-sub">CITIZEN INCIDENT SUBMISSION & COORDINATE INTEGRITY</span>
        </div>

        {/* Development & Test Clear Procedure */}
        <button 
          type="button" 
          onClick={handleClearReportsTest}
          className="clear-test-btn mono"
          title="Clear all saved reports from localStorage for testing"
        >
          <Trash2 size={13} color="var(--color-grey)" />
          <span>CLEAR LOCAL REPORTS (TEST MODE)</span>
        </button>
      </div>

      {submittedTicket ? (
        /* Success Receipt Card */
        <div className="success-receipt-card editorial-card animate-fade-in">
          <div className="success-icon-ring">
            <CheckCircle2 size={40} color="var(--color-lime)" />
          </div>
          <h3 className="success-title">
            {submittedTicket.persistedToCloud
              ? "INCIDENT REPORT SYNCHRONIZED TO AWS"
              : submittedTicket.cloudFailed
                ? "REPORT SAVED LOCALLY (CLOUD SYNC FAILED)"
                : "INCIDENT REPORT SAVED LOCALLY"}
          </h3>
          <p className="success-desc mono">
            {submittedTicket.persistedToCloud ? (
              <>Ticket ID <strong>{submittedTicket.id}</strong> has been saved and synchronized to AWS DynamoDB.</>
            ) : submittedTicket.cloudFailed ? (
              <>Ticket ID <strong>{submittedTicket.id}</strong> saved to browser storage. <span style={{ color: 'var(--color-amber)', display: 'block', marginTop: '4px' }}>Notice: {submittedTicket.cloudError}</span></>
            ) : (
              <>Ticket ID <strong>{submittedTicket.id}</strong> has been saved to your browser storage.</>
            )}
          </p>

          <div className="ticket-summary-box mono">
            <div>
              <strong>Data Mode:</strong>{' '}
              <span className={`badge ${getProvenanceBadgeClass(getIncidentProvenanceLabel(submittedTicket))}`}>
                {getIncidentProvenanceLabel(submittedTicket)}
              </span>
            </div>
            <div><strong>Ticket ID:</strong> {submittedTicket.id}</div>
            <div><strong>Title:</strong> {submittedTicket.title}</div>
            <div><strong>Location:</strong> {submittedTicket.location}</div>
            <div><strong>Coordinates:</strong> {submittedTicket.lat != null ? `${submittedTicket.lat.toFixed(4)}°N, ${submittedTicket.lng.toFixed(4)}°E` : 'Unavailable (List only, excluded from map markers)'}</div>
            <div><strong>Category:</strong> {submittedTicket.category} ({submittedTicket.severity} Severity)</div>
            <div><strong>Estimated Depth:</strong> {submittedTicket.waterDepthCm} cm</div>
            <div><strong>Timestamp:</strong> {new Date(submittedTicket.timestamp).toLocaleString()}</div>
          </div>

          <div className="success-actions">
            <button 
              onClick={() => navigateTo('/incidents')}
              className="goto-radar-btn"
            >
              <span>VIEW IN INCIDENT RADAR</span>
              <ArrowRight size={16} />
            </button>

            <button 
              onClick={() => { setSubmittedTicket(null); setTitle(''); setDescription(''); setImagePreview(null); setReportCoords(null); setGpsStatus(''); }}
              className="report-another-btn mono"
            >
              SUBMIT ANOTHER REPORT
            </button>
          </div>
        </div>
      ) : (
        /* Main Report Form */
        <div className="report-main-grid">
          {/* Left Form Column */}
          <form onSubmit={handleSubmit} className="report-form-panel editorial-card">
            <div className="panel-header-strip">
              <PlusCircle size={14} color="var(--color-orange)" />
              <span className="mono header-title">CITIZEN INCIDENT FORM</span>
            </div>

            <div className="form-fields-scroll">
              {errorMessage && (
                <div className="error-alert-box mono">
                  <AlertTriangle size={16} color="var(--color-red)" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Category */}
              <div className="field-group">
                <span className="label-uppercase">INCIDENT CATEGORY</span>
                <div className="category-pill-row">
                  {['Waterlogging', 'Drainage Blockage', 'Structure Inundation', 'Stranded Vehicle Hazard', 'Hazard'].map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`cat-pill-btn mono ${category === cat ? 'active' : ''}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="field-group">
                <span className="label-uppercase">INCIDENT TITLE</span>
                <input
                  type="text"
                  placeholder="e.g., Waterlogging blocking left lane underpass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="report-input"
                  required
                />
              </div>

              {/* Location & GPS Attachment */}
              <div className="field-group">
                <div className="loc-label-row">
                  <span className="label-uppercase">LOCATION NAME / NEIGHBOURHOOD</span>
                  {gpsStatus && <span className="mono gps-status-hint">{gpsStatus}</span>}
                </div>
                <div className="input-with-action">
                  <MapPin size={16} color="var(--color-grey)" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="report-input"
                    required
                  />
                  <button type="button" onClick={handleAutoDetectGps} className="gps-btn mono">
                    <Navigation size={12} />
                    <span>GPS AUTO</span>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="field-group">
                <span className="label-uppercase">FREE-TEXT INCIDENT DESCRIPTION</span>
                <textarea
                  rows={3}
                  placeholder="Provide detailed description of water conditions, stranded vehicles, or debris..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="report-textarea"
                  required
                />
              </div>

              {/* Water Depth Slider */}
              <div className="field-group">
                <div className="depth-label-row">
                  <span className="label-uppercase">ESTIMATED WATER DEPTH</span>
                  <span className="mono depth-val">{depthCm} cm</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  value={depthCm}
                  onChange={(e) => setDepthCm(Number(e.target.value))}
                  className="hydro-slider"
                />
                <div className="slider-ticks mono">
                  <span>10cm (Ankle)</span>
                  <span>30cm (Knee)</span>
                  <span>75cm (Waist)</span>
                  <span>120cm+ (Submerged)</span>
                </div>
              </div>

              {/* Urgency & Severity */}
              <div className="field-group">
                <span className="label-uppercase">URGENCY & SEVERITY</span>
                <div className="severity-row">
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(sev => (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`sev-btn mono ${severity === sev ? 'active' : ''}`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="submit-report-btn"
              >
                <PlusCircle size={16} />
                <span className="mono">{isSubmitting ? "TRANSMITTING INCIDENT REPORT..." : "SUBMIT INCIDENT REPORT"}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Image Attachment */}
          <div className="image-triage-panel editorial-card">
            <div className="panel-header-strip">
              <Camera size={14} color="var(--color-lime)" />
              <span className="mono header-title">OPTIONAL PHOTO EVIDENCE</span>
            </div>

            <div className="triage-body">
              {/* Image Upload Box */}
              <div className="upload-box-wrapper">
                {imagePreview ? (
                  <div className="uploaded-preview-container">
                    <img src={imagePreview} alt="Incident evidence preview" className="preview-img" />
                    <button 
                      type="button" 
                      onClick={() => setImagePreview(null)}
                      className="clear-photo-btn mono"
                    >
                      REMOVE PHOTO
                    </button>
                  </div>
                ) : (
                  <label className="upload-dropzone">
                    <UploadCloud size={32} color="var(--color-orange)" />
                    <div className="dropzone-text mono">
                      <strong>ATTACH EVIDENCE PHOTO</strong>
                      <span>SELECT AN IMAGE FILE FROM YOUR DEVICE</span>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                )}
              </div>

              {/* Honest Image Analysis Disclaimer */}
              <div className="honest-vision-card mono">
                <div className="vision-top">
                  <ShieldAlert size={16} color="var(--color-grey)" />
                  <span>IMAGE ANALYSIS UNAVAILABLE</span>
                </div>
                <p className="vision-desc">
                  Computer vision automated flood depth detection requires an active AWS backend service. Uploaded photo will be attached to your local report without automated verification score.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .report-view-container {
          padding: 84px 28px 40px;
          min-height: 100vh;
          background: var(--bg-obsidian);
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 2;
        }

        .report-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }

        .clear-test-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 2px;
          font-size: 0.68rem;
          color: var(--color-grey);
          transition: all var(--transition-fast);
        }

        .clear-test-btn:hover {
          border-color: var(--color-orange);
          color: var(--color-orange);
        }

        .report-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 20px;
          height: calc(100vh - 200px);
          min-height: 580px;
        }

        .report-form-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .form-fields-scroll {
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .error-alert-box {
          padding: 10px 14px;
          background: rgba(229, 57, 53, 0.15);
          border: 1px solid rgba(229, 57, 53, 0.4);
          border-radius: 4px;
          color: #FF5252;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .loc-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .gps-status-hint {
          font-size: 0.65rem;
          color: var(--color-lime);
        }

        .category-pill-row, .severity-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .cat-pill-btn, .sev-btn {
          padding: 8px 12px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-grey);
          transition: all var(--transition-fast);
        }

        .cat-pill-btn:hover, .sev-btn:hover { color: var(--color-ivory); }

        .cat-pill-btn.active, .sev-btn.active {
          background: rgba(255, 100, 56, 0.12);
          border-color: var(--color-orange);
          color: var(--color-orange);
          font-weight: 600;
        }

        .report-input, .report-textarea {
          font-size: 0.88rem;
          color: var(--color-ivory);
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 10px 14px;
          border-radius: 4px;
          width: 100%;
        }

        .input-with-action {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          padding: 6px 14px;
          border-radius: 4px;
        }

        .input-with-action .report-input {
          border: none;
          padding: 4px 0;
        }

        .gps-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(240, 237, 228, 0.08);
          border: 1px solid var(--border-strong);
          border-radius: 2px;
          font-size: 0.68rem;
          color: var(--color-ivory);
        }

        .depth-label-row {
          display: flex;
          justify-content: space-between;
        }

        .depth-val {
          font-size: 0.9rem;
          color: var(--color-orange);
          font-weight: 700;
        }

        .submit-report-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.82rem;
          margin-top: 8px;
        }

        .submit-report-btn:hover { background: #FF7B54; }

        .image-triage-panel {
          display: flex;
          flex-direction: column;
        }

        .triage-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .upload-box-wrapper {
          width: 100%;
          height: 220px;
          border: 1px dashed var(--border-strong);
          border-radius: 4px;
          background: rgba(9, 10, 10, 0.6);
          overflow: hidden;
        }

        .upload-dropzone {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          padding: 20px;
          text-align: center;
        }

        .dropzone-text {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 0.72rem;
          color: var(--color-grey);
        }

        .uploaded-preview-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .clear-photo-btn {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: rgba(9, 10, 10, 0.85);
          border: 1px solid var(--border-strong);
          padding: 4px 10px;
          border-radius: 2px;
          font-size: 0.65rem;
          color: var(--color-ivory);
        }

        .honest-vision-card {
          padding: 14px;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-subtle);
          border-left: 4px solid var(--color-grey);
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.72rem;
        }

        .vision-top {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--color-grey);
          font-weight: 600;
        }

        .vision-desc {
          color: var(--color-grey);
          line-height: 1.4;
        }

        .success-receipt-card {
          max-width: 600px;
          margin: 40px auto;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
        }

        .success-icon-ring {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          background: rgba(199, 243, 107, 0.1);
          border: 1px solid rgba(199, 243, 107, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-title {
          font-size: 1.8rem;
          color: var(--color-ivory);
        }

        .success-desc {
          font-size: 0.82rem;
          color: var(--color-grey);
        }

        .ticket-summary-box {
          width: 100%;
          padding: 16px;
          background: rgba(9, 10, 10, 0.6);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          text-align: left;
          font-size: 0.75rem;
          color: var(--color-ivory-muted);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .success-actions {
          display: flex;
          gap: 12px;
          width: 100%;
          margin-top: 10px;
        }

        .goto-radar-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          background: var(--color-orange);
          color: var(--bg-obsidian);
          border-radius: 4px;
          font-weight: 700;
          font-size: 0.78rem;
        }

        .report-another-btn {
          padding: 12px;
          background: rgba(240, 237, 228, 0.08);
          border: 1px solid var(--border-strong);
          border-radius: 4px;
          font-size: 0.72rem;
          color: var(--color-ivory);
        }

        @media (max-width: 900px) {
          .report-main-grid {
            grid-template-columns: 1fr;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
