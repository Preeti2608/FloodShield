import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroGallery from './components/HeroGallery';
import AtlasView from './components/AtlasView';
import IncidentsView from './components/IncidentsView';
import CopilotView from './components/CopilotView';
import ScenarioLabView from './components/ScenarioLabView';
import SafePassageView from './components/SafePassageView';
import ReportView from './components/ReportView';
import Footer from './components/Footer';
import WaterBackgroundCanvas from './components/WaterBackgroundCanvas';

import { getStoredReports } from './utils/reportStorage';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname || '/');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [userReports, setUserReports] = useState(getStoredReports());
  const [weatherOk, setWeatherOk] = useState(true);

  const refreshReports = () => {
    setUserReports(getStoredReports());
  };

  useEffect(() => {
    refreshReports();
  }, [currentRoute]);

  // Router navigation helper
  const navigateTo = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentRoute(path);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  // Browser Back/Forward buttons handler
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/');
      refreshReports();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Reduced motion toggle
  const toggleReducedMotion = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    if (nextVal) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  };

  return (
    <div className="floodshield-app">
      {/* Real Dark Water & Rain Background Canvas */}
      <WaterBackgroundCanvas reducedMotion={reducedMotion} />

      {/* Top Header Navigation */}
      <Header 
        currentRoute={currentRoute}
        navigateTo={navigateTo}
        reducedMotion={reducedMotion}
        toggleReducedMotion={toggleReducedMotion}
        reportsCount={userReports.length}
        weatherOk={weatherOk}
      />

      {/* Main View Router */}
      <main className="main-view-container">
        {currentRoute === '/' && (
          <HeroGallery 
            navigateTo={navigateTo}
            reducedMotion={reducedMotion}
          />
        )}

        {currentRoute === '/atlas' && (
          <AtlasView />
        )}

        {currentRoute === '/incidents' && (
          <IncidentsView 
            incidents={userReports}
            onUpdateIncident={refreshReports}
            navigateTo={navigateTo}
          />
        )}

        {currentRoute === '/copilot' && (
          <CopilotView />
        )}

        {currentRoute === '/scenario-lab' && (
          <ScenarioLabView />
        )}

        {currentRoute === '/safe-passage' && (
          <SafePassageView />
        )}

        {currentRoute === '/report' && (
          <ReportView 
            onReportAdded={refreshReports}
            navigateTo={navigateTo}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

      <style>{`
        .floodshield-app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-obsidian);
          color: var(--color-ivory);
          position: relative;
        }

        .main-view-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 2;
        }
      `}</style>
    </div>
  );
}
