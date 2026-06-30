import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { NewBatchWizard, BatchDetail, SuccessPage } from './features/batches';
import { HolaAri } from './components/HolaAri';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/hola-ari" element={<HolaAri />} />
        <Route 
          path="*" 
          element={
            <MainLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/lotes/nuevo" replace />} />
                <Route path="/lotes/nuevo" element={<NewBatchWizard />} />
                <Route path="/lotes/:id" element={<BatchDetail />} />
                <Route path="/lotes/exito" element={<SuccessPage />} />
                <Route path="*" element={<Navigate to="/lotes/nuevo" replace />} />
              </Routes>
            </MainLayout>
          } 
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
