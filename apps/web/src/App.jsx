import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InstitutionLayout } from './pages/institution/InstitutionLayout.jsx';
import { IssuePage } from './pages/institution/IssuePage.jsx';
import { RegistryPage } from './pages/institution/RegistryPage.jsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app" element={<InstitutionLayout />}>
          <Route index element={<Navigate to="registry" replace />} />
          <Route path="registry" element={<RegistryPage />} />
          <Route path="issue" element={<IssuePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
