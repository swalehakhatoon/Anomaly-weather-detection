import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import StationDetail from './pages/StationDetail';
import AlertsPage from './pages/AlertsPage';
import SimulatorPage from './pages/SimulatorPage';
import ApiExplorer from './pages/ApiExplorer';
import ExplainabilityDrawer from './components/ExplainabilityDrawer';
import { fetchStations, fetchAnomalies, fetchAlerts, fetchMetrics } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStationId, setSelectedStationId] = useState('IMD-RJ-04');
  const [stations, setStations] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [activeXaiAnomaly, setActiveXaiAnomaly] = useState(null);

  const refreshGlobalState = async () => {
    try {
      const [sts, anoms, alrts, mets] = await Promise.all([
        fetchStations(),
        fetchAnomalies(),
        fetchAlerts(),
        fetchMetrics()
      ]);
      setStations(sts);
      setAnomalies(anoms);
      setAlerts(alrts);
      setMetrics(mets);
    } catch (e) {
      console.error('Error refreshing telemetry stream:', e);
    }
  };

  useEffect(() => {
    refreshGlobalState();
    const interval = setInterval(refreshGlobalState, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleSelectStation = (id) => {
    setSelectedStationId(id);
    setActiveTab('station');
  };

  const handleOpenExplainability = (anomaly) => {
    setActiveXaiAnomaly(anomaly);
  };

  const handleCloseExplainability = () => {
    setActiveXaiAnomaly(null);
  };

  const criticalAlertsCount = alerts.filter((a) => a.severity === 'CRITICAL').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        istTime={metrics?.simulated_ist_time}
        criticalAlertsCount={criticalAlertsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            stations={stations}
            anomalies={anomalies}
            onSelectStation={handleSelectStation}
            onOpenExplainability={handleOpenExplainability}
            onOpenSimulator={() => setActiveTab('simulator')}
          />
        )}

        {activeTab === 'station' && (
          <StationDetail
            stationId={selectedStationId}
            onBack={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPage
            onOpenExplainability={handleOpenExplainability}
            onSelectStation={handleSelectStation}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorPage
            stations={stations}
            onOpenDashboard={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'api' && (
          <ApiExplorer stations={stations} />
        )}
      </main>

      {/* Slide-over Explainable AI Diagnostic Drawer */}
      {activeXaiAnomaly && (
        <ExplainabilityDrawer
          anomaly={activeXaiAnomaly}
          onClose={handleCloseExplainability}
          onFeedbackSubmitted={refreshGlobalState}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        SkyGuard AI  (वायु-दृष्टि) • Ministry of Earth Sciences (MoES) / IMD AWS Quality Control • Smart India Hackathon 2026
      </footer>
    </div>
  );
}
