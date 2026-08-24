import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { NewBatchWizard, BatchDetail, BatchList, SuccessPage } from './features/batches';
import { RecognitionCatalog, CertificateDesigner } from './features/recognitions';

function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/lotes/nuevo" replace />} />
          <Route path="/lotes/nuevo" element={<NewBatchWizard />} />
          <Route path="/lotes" element={<BatchList />} />
          <Route path="/lotes/:id" element={<BatchDetail />} />
          <Route path="/lotes/exito" element={<SuccessPage />} />
          <Route path="/reconocimientos" element={<RecognitionCatalog />} />
          <Route path="/reconocimientos/:id/plantilla" element={<CertificateDesigner />} />
          <Route path="*" element={<Navigate to="/lotes/nuevo" replace />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
}

export default App;
