import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Shell } from './components/Shell';
import { OverviewPage } from './pages/OverviewPage';
import { CorridorPage } from './pages/CorridorPage';
import { JourneyPage } from './pages/JourneyPage';
import { HotspotsPage } from './pages/HotspotsPage';
import { InterventionsPage } from './pages/InterventionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="corridor" element={<CorridorPage />} />
          <Route path="journey" element={<JourneyPage />} />
          <Route path="hotspots" element={<HotspotsPage />} />
          <Route path="interventions" element={<InterventionsPage />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
