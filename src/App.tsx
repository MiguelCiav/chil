import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { NewBatchWizard, QuickRecognition, BatchDetail, BatchList, SuccessPage } from './features/batches';
import { RecognitionCatalog, CertificateDesigner } from './features/recognitions';
import { SummaryView } from './features/summary';
import { StatisticsDashboard } from './features/statistics';
import {
  AuthProvider,
  LoginPage,
  RegisterPage,
  ProtectedRoute
} from './features/auth';

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <MainLayout>
          <Routes>
            {/* Public Auth Routes */}
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

            {/* Root & Catch-all Redirects */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/lotes" replace />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/lotes" replace />} />
          </Routes>
        </MainLayout>
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
