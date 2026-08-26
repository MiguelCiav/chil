import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { NewBatchWizard, QuickRecognition, BatchDetail, BatchList, SuccessPage } from './features/batches';
import { RecognitionCatalog, CertificateDesigner } from './features/recognitions';
import { SummaryView } from './features/summary';
import { StatisticsDashboard } from './features/statistics';
import { LandingPage } from './features/landing';
import {
  AuthProvider,
  LoginPage,
  RegisterPage,
  ProtectedRoute,
  useAuth
} from './features/auth';

const RootRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <output className="min-h-[50vh] flex flex-col items-center justify-center space-y-3" aria-live="polite" aria-label="Cargando sesión">
        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs font-semibold text-neutral/60">Verificando sesión...</span>
      </output>
    );
  }

  if (user) {
    return <Navigate to="/lotes" replace />;
  }

  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
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
              path="/lotes/rapido"
              element={
                <ProtectedRoute>
                  <QuickRecognition />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emision-rapida"
              element={
                <ProtectedRoute>
                  <QuickRecognition />
                </ProtectedRoute>
              }
            />
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
              path="/lotes/exito"
              element={
                <ProtectedRoute>
                  <SuccessPage />
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
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
