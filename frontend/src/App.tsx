import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSetActiveTab, useSetRoadNetwork, useLoading, useAddToast, type AppTab } from './store/store';
import api from './services/api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import PageLoader from './components/ui/PageLoader';

// Lazy-load page components for code-splitting
const DashboardView = lazy(() => import('./pages/Dashboard'));
const RoutePlannerView = lazy(() => import('./pages/RoutePlanner'));
const TrainingView = lazy(() => import('./pages/Training'));
const AnalyticsView = lazy(() => import('./pages/Analytics'));
const StationsView = lazy(() => import('./pages/Stations'));
const SettingsView = lazy(() => import('./pages/Settings'));

function App() {
  const location = useLocation();
  const setActiveTab = useSetActiveTab();
  const setRoadNetwork = useSetRoadNetwork();
  const { setIsLoading } = useLoading();
  const addToast = useAddToast();

  // Keep Zustand activeTab in sync with URL for backward compat
  useEffect(() => {
    const segment = location.pathname.split('/')[1] || 'dashboard';
    const validTabs: AppTab[] = ['dashboard', 'routing', 'training', 'analytics', 'stations', 'settings'];
    if (validTabs.includes(segment as AppTab)) {
      setActiveTab(segment as AppTab);
    }
  }, [location.pathname, setActiveTab]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const network = await api.getRoadNetwork(10);
        setRoadNetwork(network);
      } catch (error: any) {
        addToast({
          type: 'error',
          title: 'Connection Failed',
          message: error?.message || 'Could not load road network. Ensure the backend is running.',
          duration: 6000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [setIsLoading, setRoadNetwork, addToast]);

  return (
    <>
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-emerald focus:text-midnight focus:rounded-lg">
        Skip to content
      </a>

      <div className="flex h-screen bg-[#060910] bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(16,185,129,0.12),rgba(6,9,16,1))] overflow-hidden relative">
        {/* Glass refraction light sources — MASSIVE radial gradients for backdrop-blur refraction */}
        <div className="pointer-events-none fixed inset-0 z-0">
          {/* Primary emerald wash — top-right */}
          <div className="absolute -top-[30%] -right-[20%] w-[90%] h-[90%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.18)_0%,rgba(16,185,129,0.06)_40%,transparent_70%)]" />
          {/* Secondary cyan wash — bottom-left */}
          <div className="absolute -bottom-[25%] -left-[15%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(20,168,192,0.14)_0%,rgba(20,168,192,0.05)_40%,transparent_70%)]" />
          {/* Accent amber wash — center */}
          <div className="absolute top-[30%] left-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08)_0%,rgba(245,158,11,0.03)_40%,transparent_70%)]" />
          {/* Deep blue undertone — full screen */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.06)_0%,transparent_60%)]" />
          {/* Rose accent — bottom-right corner */}
          <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.05)_0%,transparent_60%)]" />
        </div>
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Header />
          <main id="main" className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Suspense fallback={<PageLoader />}><DashboardView /></Suspense>} />
              <Route path="/routing" element={<Suspense fallback={<PageLoader />}><RoutePlannerView /></Suspense>} />
              <Route path="/training" element={<Suspense fallback={<PageLoader />}><TrainingView /></Suspense>} />
              <Route path="/analytics" element={<Suspense fallback={<PageLoader />}><AnalyticsView /></Suspense>} />
              <Route path="/stations" element={<Suspense fallback={<PageLoader />}><StationsView /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageLoader />}><SettingsView /></Suspense>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}

export default App;
