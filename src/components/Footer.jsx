import React from 'react';

export default function Footer() {
  return (
    <footer className="footer-bar mono">
      <div className="footer-left">
        <span>FLOODSHIELD v2.4</span>
        <span className="bullet">•</span>
        <span>HEAT & WATER HACKATHON TRACK</span>
      </div>

      <div className="footer-right">
        <span>ESTIMATING RISK → VERIFYING DATA → DIRECTING ACTION</span>
      </div>

      <style>{`
        .footer-bar {
          width: 100%;
          padding: 16px 28px;
          background: #090A0A;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          color: var(--color-grey);
          flex-wrap: wrap;
          gap: 12px;
        }

        .bullet {
          color: var(--color-orange);
        }

        .footer-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>
    </footer>
  );
}
