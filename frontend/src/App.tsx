import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';
import ArchitecturePage from './pages/ArchitecturePage';
import FinalReportPage from './pages/FinalReportPage';
import ExplainPage from './pages/ExplainPage';
import PerformancePage from './pages/PerformancePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/report" element={<Navigate to="/final-report" replace />} />
          <Route path="/final-report" element={<FinalReportPage />} />
          <Route path="/explain" element={<ExplainPage />} />
          <Route path="/performance" element={<PerformancePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
