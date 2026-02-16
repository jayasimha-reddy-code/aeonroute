import { useEffect, lazy, Suspense } from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useActiveTab, useTheme, useSetRoadNetwork, useLoading, useAddToast } from './store/store';
import api from './services/api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import PageLoader from './components/ui/PageLoader';
import PageTransition from './components/ui/PageTransition';
import { cn } from './lib/utils';

// Lazy-load page components for code-splitting
const DashboardView = lazy(() => import('./pages/Dashboard'));
const RoutePlannerView = lazy(() => import('./pages/RoutePlanner'));
const TrainingView = lazy(() => import('./pages/Training'));
const AnalyticsView = lazy(() => import('./pages/Analytics'));

function App() {
  const activeTab = useActiveTab();
  const { isDarkMode, themeMode, setThemeMode } = useTheme();
  const setRoadNetwork = useSetRoadNetwork();
  const { setIsLoading } = useLoading();
  const addToast = useAddToast();

  // Apply dark mode class to HTML root
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // System preference listener for themeMode === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (themeMode === 'system') {
        // When in system mode, sync isDarkMode with OS preference
        setThemeMode('system');
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode, setThemeMode]);

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
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="flex flex-col h-screen bg-surface-50 dark:bg-surface-950 text-surface-900 dark:text-surface-50 transition-colors duration-300">
        {/* Skip to main content link */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main
            id="main-content"
            className={cn(
              'flex-1 overflow-y-auto transition-all duration-300',
              // Subtle inset shadow on the main content area
              'bg-surface-50 dark:bg-surface-950',
            )}
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
    </div>
  );
}

export default App;
