import { useEffect, lazy, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useActiveTab, useSetRoadNetwork, useLoading, useAddToast } from './store/store';
import api from './services/api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import PageLoader from './components/ui/PageLoader';
import PageTransition from './components/ui/PageTransition';
import { usePresentationModeEffect } from './hooks/usePresentationMode';

// Lazy-load page components for code-splitting
const DashboardView = lazy(() => import('./pages/Dashboard'));
const RoutePlannerView = lazy(() => import('./pages/RoutePlanner'));
const TrainingView = lazy(() => import('./pages/Training'));
const AnalyticsView = lazy(() => import('./pages/Analytics'));

function App() {
  const activeTab = useActiveTab();
  const setRoadNetwork = useSetRoadNetwork();
  const { setIsLoading } = useLoading();
  const addToast = useAddToast();

  // Register presentation mode Ctrl+Shift+P shortcut
  usePresentationModeEffect();

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

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'route-planner': return <RoutePlannerView />;
      case 'training': return <TrainingView />;
      case 'analytics': return <AnalyticsView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-midnight">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <LazyMotion features={domAnimation} strict>
            <Suspense fallback={<PageLoader />}>
              <PageTransition pageKey={activeTab}>
                {renderView()}
              </PageTransition>
            </Suspense>
          </LazyMotion>
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
