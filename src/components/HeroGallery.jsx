import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpRight, Play, Pause, Compass, Map, AlertTriangle, Bot, SlidersHorizontal, PlusCircle } from 'lucide-react';
import { playRadarPing } from '../utils/audioAmbiance';

export default function HeroGallery({ navigateTo, reducedMotion }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const autoplayTimerRef = useRef(null);

  const panels = [
    {
      id: "atlas",
      num: "01",
      title: "FLOOD ATLAS",
      subtitle: "Interactive flood-risk map & location-level risk intelligence.",
      route: "/atlas",
      image: "/images/panel_atlas.jpg",
      tag: "GEOSPATIAL INTELLIGENCE",
      status: "LIVE RADAR SENSORS",
      riskBadge: "48 SENSORS ONLINE",
      riskColor: "lime",
      icon: Map
    },
    {
      id: "incidents",
      num: "02",
      title: "INCIDENT RADAR",
      subtitle: "Citizen reports, incident verification, and prioritisation.",
      route: "/incidents",
      image: "/images/panel_incidents.jpg",
      tag: "CITIZEN & SENSOR TRIAGE",
      status: "3 PENDING VERIFICATION",
      riskBadge: "ALERT LEVEL HIGH",
      riskColor: "orange",
      icon: AlertTriangle
    },
    {
      id: "copilot",
      num: "03",
      title: "RESPONSE COPILOT",
      subtitle: "AI-assisted incident triage and evidence-backed recommendations.",
      route: "/copilot",
      image: "/images/panel_copilot.jpg",
      tag: "DECISION SUPPORT ENGINE",
      status: "MODEL ACCURACY 94.2%",
      riskBadge: "AI COPILOT READY",
      riskColor: "lime",
      icon: Bot
    },
    {
      id: "scenario-lab",
      num: "04",
      title: "SCENARIO LAB",
      subtitle: "Interactive rainfall and flood-risk simulation.",
      route: "/scenario-lab",
      image: "/images/panel_atlas.jpg",
      tag: "HYDRODYNAMIC SIMULATOR",
      status: "CLOUDBURST SIM READY",
      riskBadge: "SIMULATION ENGINE",
      riskColor: "amber",
      icon: SlidersHorizontal
    },
    {
      id: "safe-passage",
      num: "05",
      title: "SAFE PASSAGE",
      subtitle: "Road accessibility, critical facilities, and alternative routes.",
      route: "/safe-passage",
      image: "/images/panel_incidents.jpg",
      tag: "HAZARD-AWARE ROUTING",
      status: "ELEVATED BYPASS OPEN",
      riskBadge: "2 HAZARDS DIVERTED",
      riskColor: "lime",
      icon: Compass
    },
    {
      id: "report",
      num: "06",
      title: "REPORT AN INCIDENT",
      subtitle: "Citizen incident submission with location, severity, and photo AI check.",
      route: "/report",
      image: "/images/panel_copilot.jpg",
      tag: "CITIZEN INPUT HUB",
      status: "GPS AUTO-LOCATE",
      riskBadge: "SUBMIT TICKET",
      riskColor: "orange",
      icon: PlusCircle
    }
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'Enter') {
        navigateTo(panels[activeIndex].route);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex]);

  // Autoplay timer
  useEffect(() => {
    if (isAutoplay && !reducedMotion && !isDragging) {
      autoplayTimerRef.current = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % panels.length);
      }, 5000);
    }
    return () => {
      if (autoplayTimerRef.current) clearInterval(autoplayTimerRef.current);
    };
  }, [isAutoplay, reducedMotion, isDragging, panels.length]);

  const nextSlide = () => {
    playRadarPing();
    setActiveIndex((prev) => (prev + 1) % panels.length);
  };

  const prevSlide = () => {
    playRadarPing();
    setActiveIndex((prev) => (prev - 1 + panels.length) % panels.length);
  };

  // Wheel scroll horizontal
  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) > 30 || Math.abs(e.deltaY) > 40) {
      if (e.deltaX > 30 || e.deltaY > 40) {
        nextSlide();
      } else if (e.deltaX < -30 || e.deltaY < -40) {
        prevSlide();
      }
    }
  };

  // Touch & Mouse Drag handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.clientX || (e.touches && e.touches[0].clientX) || 0);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const diff = currentX - startX;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset < -60) {
      nextSlide();
    } else if (dragOffset > 60) {
      prevSlide();
    }
    setDragOffset(0);
  };

  return (
    <div 
      className="hero-gallery-wrapper"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      onMouseEnter={() => setIsAutoplay(false)}
    >
      {/* Background Particles Canvas / Grid */}
      <div className="dark-atmosphere-grid" />

      {/* Hero Headline Section */}
      <div className="hero-typography-container animate-fade-in">
        <div className="hero-editorial-label">
          <span className="label-uppercase">PREDICT / VERIFY / ACT</span>
          <span className="divider-line" />
          <span className="label-uppercase mono">HEAT & WATER HACKATHON BUILD</span>
        </div>

        <h1 className="hero-main-headline">
          WHEN WATER RISES,<br />
          <span className="accent-text">KNOW WHAT'S NEXT.</span>
        </h1>

        <p className="hero-substatement">
          Hyperlocal flood intelligence for safer cities — combining real-time stream sensors, citizen triage, AI copilot triage, and hydrodynamic risk modeling.
        </p>
      </div>

      {/* 3D Cinematic Gallery Carousel Container */}
      <div className="carousel-stage">
        <div className="carousel-track">
          {panels.map((panel, idx) => {
            const offset = idx - activeIndex;
            const isCenter = idx === activeIndex;

            // Calculate 3D perspective transform parameters
            let transformStyle = '';
            let opacity = 0.35;
            let zIndex = 1;

            if (isCenter) {
              transformStyle = `translateX(0px) scale(1) rotateY(0deg)`;
              opacity = 1;
              zIndex = 10;
            } else if (offset === 1 || (activeIndex === panels.length - 1 && idx === 0)) {
              // Right adjacent
              transformStyle = `translateX(60%) scale(0.84) rotateY(-18deg)`;
              opacity = 0.65;
              zIndex = 5;
            } else if (offset === -1 || (activeIndex === 0 && idx === panels.length - 1)) {
              // Left adjacent
              transformStyle = `translateX(-60%) scale(0.84) rotateY(18deg)`;
              opacity = 0.65;
              zIndex = 5;
            } else if (offset > 1) {
              transformStyle = `translateX(110%) scale(0.7) rotateY(-25deg)`;
              opacity = 0.2;
              zIndex = 2;
            } else {
              transformStyle = `translateX(-110%) scale(0.7) rotateY(25deg)`;
              opacity = 0.2;
              zIndex = 2;
            }

            const Icon = panel.icon;

            return (
              <div
                key={panel.id}
                className={`gallery-panel-card ${isCenter ? 'is-center' : ''}`}
                style={{
                  transform: transformStyle,
                  opacity: opacity,
                  zIndex: zIndex
                }}
                onClick={() => {
                  if (isCenter) {
                    navigateTo(panel.route);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
              >
                {/* Image Container with Vignette Overlay */}
                <div className="panel-image-wrap">
                  <img src={panel.image} alt={panel.title} className="panel-img" />
                  <div className="panel-vignette" />
                  
                  {/* Top Badge Overlay */}
                  <div className="panel-top-bar">
                    <span className="mono panel-num">{panel.num}</span>
                    <span className={`badge badge-${panel.riskColor}`}>
                      {panel.riskBadge}
                    </span>
                  </div>

                  {/* Icon Indicator */}
                  <div className="panel-icon-float">
                    <Icon size={20} color="var(--color-ivory)" />
                  </div>
                </div>

                {/* Content Footer Area */}
                <div className="panel-content-body">
                  <div className="panel-meta-tag mono">{panel.tag}</div>
                  <h3 className="panel-title">{panel.title}</h3>
                  <p className="panel-desc">{panel.subtitle}</p>

                  <div className="panel-action-trigger">
                    <span className="mono trigger-text">EXPLORE SECTION</span>
                    <ArrowUpRight size={16} className="trigger-arrow" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gallery Bottom Navigation & Status */}
      <div className="gallery-bottom-bar">
        {/* Navigation Arrows */}
        <div className="nav-arrow-group">
          <button onClick={prevSlide} className="gallery-arrow-btn" title="Previous Panel (Left Arrow)">
            <ChevronLeft size={18} />
          </button>
          <button onClick={nextSlide} className="gallery-arrow-btn" title="Next Panel (Right Arrow)">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Numbered Indicators */}
        <div className="numbered-indicators-group">
          {panels.map((p, i) => (
            <button
              key={p.id}
              onClick={() => {
                playRadarPing();
                setActiveIndex(i);
              }}
              className={`num-indicator-btn ${i === activeIndex ? 'active' : ''}`}
            >
              <span className="mono num-text">{p.num}</span>
              <span className="indicator-bar" />
            </button>
          ))}
        </div>

        {/* Autoplay Pause / Play Toggle */}
        <button
          onClick={() => setIsAutoplay(!isAutoplay)}
          className="autoplay-toggle-btn"
          title={isAutoplay ? "Pause Autoplay" : "Enable Autoplay"}
        >
          {isAutoplay ? <Pause size={14} /> : <Play size={14} />}
          <span className="mono">{isAutoplay ? "PAUSE" : "AUTOPLAY"}</span>
        </button>
      </div>

      <style>{`
        .hero-gallery-wrapper {
          position: relative;
          width: 100%;
          min-height: 100vh;
          padding-top: 84px;
          padding-bottom: 40px;
          background: var(--bg-obsidian);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          user-select: none;
        }

        .dark-atmosphere-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(240, 237, 228, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(240, 237, 228, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .hero-typography-container {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 900px;
          padding: 0 20px;
          margin-top: 10px;
          margin-bottom: 30px;
        }

        .hero-editorial-label {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .divider-line {
          width: 24px;
          height: 1px;
          background: var(--border-strong);
        }

        .hero-main-headline {
          font-size: clamp(2.4rem, 5vw, 4.2rem);
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }

        .hero-main-headline .accent-text {
          color: var(--color-orange);
        }

        .hero-substatement {
          font-size: 1.05rem;
          color: var(--color-ivory-muted);
          max-width: 680px;
          margin: 0 auto;
          line-height: 1.45;
          font-weight: 400;
        }

        /* 3D Carousel Stage */
        .carousel-stage {
          position: relative;
          width: 100%;
          max-width: 1400px;
          height: 480px;
          perspective: 1400px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          margin: 10px 0;
        }

        .carousel-track {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-panel-card {
          position: absolute;
          width: 540px;
          height: 440px;
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          transition: transform var(--transition-normal), opacity var(--transition-normal), border-color var(--transition-fast);
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 60px rgba(0,0,0,0.7);
        }

        .gallery-panel-card:hover {
          border-color: var(--color-orange);
        }

        .gallery-panel-card.is-center {
          border-color: rgba(255, 100, 56, 0.4);
          box-shadow: 0 40px 80px rgba(0,0,0,0.9), 0 0 40px rgba(255, 100, 56, 0.08);
        }

        .panel-image-wrap {
          position: relative;
          width: 100%;
          height: 270px;
          overflow: hidden;
          background: #000;
        }

        .panel-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s var(--ease-cinematic);
        }

        .gallery-panel-card:hover .panel-img {
          transform: scale(1.05);
        }

        .panel-vignette {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(9,10,10,0.4) 0%, transparent 40%, rgba(22,24,23,1) 100%);
        }

        .panel-top-bar {
          position: absolute;
          top: 14px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
        }

        .panel-num {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-ivory);
          background: rgba(9, 10, 10, 0.7);
          padding: 4px 10px;
          border-radius: 2px;
          border: 1px solid var(--border-subtle);
        }

        .panel-icon-float {
          position: absolute;
          bottom: 14px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(9, 10, 10, 0.8);
          border: 1px solid var(--border-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        .panel-content-body {
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
          background: var(--bg-card);
        }

        .panel-meta-tag {
          font-size: 0.65rem;
          color: var(--color-grey);
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }

        .panel-title {
          font-size: 1.35rem;
          color: var(--color-ivory);
          margin-bottom: 6px;
        }

        .panel-desc {
          font-size: 0.85rem;
          color: var(--color-ivory-muted);
          line-height: 1.35;
          margin-bottom: 12px;
        }

        .panel-action-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle);
          color: var(--color-orange);
        }

        .trigger-text {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.08em;
        }

        .trigger-arrow {
          transition: transform var(--transition-fast);
        }

        .gallery-panel-card:hover .trigger-arrow {
          transform: translate(3px, -3px);
        }

        /* Bottom Bar */
        .gallery-bottom-bar {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 32px;
          padding: 10px 24px;
          background: rgba(22, 24, 23, 0.8);
          border: 1px solid var(--border-subtle);
          border-radius: 40px;
          backdrop-filter: blur(10px);
        }

        .nav-arrow-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .gallery-arrow-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(240, 237, 228, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--color-ivory);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gallery-arrow-btn:hover {
          background: var(--color-orange);
          border-color: var(--color-orange);
          color: var(--bg-obsidian);
        }

        .numbered-indicators-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .num-indicator-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          opacity: 0.4;
          transition: all var(--transition-fast);
        }

        .num-indicator-btn:hover, .num-indicator-btn.active {
          opacity: 1;
        }

        .num-text {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-ivory);
        }

        .indicator-bar {
          width: 24px;
          height: 2px;
          background: var(--border-strong);
          border-radius: 1px;
          transition: background-color var(--transition-fast), width var(--transition-fast);
        }

        .num-indicator-btn.active .indicator-bar {
          background: var(--color-orange);
          width: 32px;
        }

        .autoplay-toggle-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--color-grey);
          padding: 4px 8px;
          border-radius: 2px;
        }

        .autoplay-toggle-btn:hover {
          color: var(--color-ivory);
        }

        @media (max-width: 768px) {
          .gallery-panel-card {
            width: 88vw;
            height: 400px;
          }
          .carousel-stage {
            height: 420px;
          }
          .gallery-bottom-bar {
            gap: 12px;
            padding: 8px 16px;
          }
        }
      `}</style>
    </div>
  );
}
