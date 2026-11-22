import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ScraperSettingsModal } from './domain/components/navigation';
import { ScraperSettingsProvider } from './context/ScraperSettingsContext';
import { NewBatchWizard, BatchDetail, BatchList } from './features/batches';
import { RecognitionCatalog, CertificateDesigner } from './features/recognitions';
import { SummaryView } from './features/summary';
import { StatisticsDashboard } from './features/statistics';
import { LandingPage } from './features/landing';
import {
  AuthProvider,
  LoginPage,
  RegisterPage,
  ProtectedRoute,
  SessionLoadingState,
  useAuth
} from './features/auth';

const RootRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SessionLoadingState />;
  }

  if (user) {
    return <Navigate to="/lotes" replace />;
  }

  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <ScraperSettingsProvider>
        <HashRouter>
          <MainLayout>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/inicio" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/lotes/nuevo"
              element={
                <ProtectedRoute>
                  <NewBatchWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lotes"
              element={
                <ProtectedRoute>
                  <BatchList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lotes/:id"
              element={
                <ProtectedRoute>
                  <BatchDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reconocimientos"
              element={
                <ProtectedRoute>
                  <RecognitionCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reconocimientos/:id/plantilla"
              element={
                <ProtectedRoute>
                  <CertificateDesigner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resumen"
              element={
                <ProtectedRoute>
                  <SummaryView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/estadisticas"
              element={
                <ProtectedRoute>
                  <StatisticsDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/lotes" replace />} />
            </Routes>
          </MainLayout>
          <ScraperSettingsModal />
        </HashRouter>
      </ScraperSettingsProvider>
    </AuthProvider>
  );
}

export default App;
