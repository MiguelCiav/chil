import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { BatchList, NewBatchWizard, BatchDetail, SuccessPage } from './features/batches';

function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/lotes" replace />} />
          <Route path="/lotes" element={<BatchList />} />
          <Route path="/lotes/nuevo" element={<NewBatchWizard />} />
          <Route path="/lotes/:id" element={<BatchDetail />} />
          <Route path="/lotes/exito" element={<SuccessPage />} />
          <Route path="*" element={<Navigate to="/lotes" replace />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
}

export default App;
