import { useEffect, lazy, Suspense } from 'react';
import { useActiveTab, useSetRoadNetwork, useLoading, useAddToast } from './store/store';
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

const pages: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  dashboard: DashboardView,
  routing: RoutePlannerView,
  training: TrainingView,
  analytics: AnalyticsView,
};

function App() {
  const activeTab = useActiveTab();
  const setRoadNetwork = useSetRoadNetwork();
  const { setIsLoading } = useLoading();
  const addToast = useAddToast();

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

  const Page = pages[activeTab] || DashboardView;

  return (
    <>
      {/* Skip link */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-3 focus:bg-emerald focus:text-midnight focus:rounded-lg">
        Skip to content
      </a>

      <div className="flex h-screen bg-midnight overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main id="main" className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6">
            <Suspense fallback={<PageLoader />}>
              <Page />
            </Suspense>
          </main>
        </div>
      </div>

      <ToastContainer />
    </>
  );
}

export default App;
