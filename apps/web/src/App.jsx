import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { InstitutionLayout } from './pages/institution/InstitutionLayout.jsx';
import { IssuePage } from './pages/institution/IssuePage.jsx';
import { RegistryPage } from './pages/institution/RegistryPage.jsx';
import { CertificateDetailPage } from './pages/institution/CertificateDetailPage.jsx';
import { GalleryPage } from './pages/student/GalleryPage.jsx';
import { SharePanelPage } from './pages/student/SharePanelPage.jsx';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app" element={<InstitutionLayout />}>
          <Route index element={<Navigate to="registry" replace />} />
          <Route path="registry" element={<RegistryPage />} />
          <Route path="issue" element={<IssuePage />} />
          <Route path="certificate/:id" element={<CertificateDetailPage />} />
        </Route>
        <Route path="/me" element={<GalleryPage />} />
        <Route path="/me/credential/:id" element={<SharePanelPage />} />
      </Routes>
    </BrowserRouter>
  );
}
