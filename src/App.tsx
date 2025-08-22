import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import ARManagement from './pages/ARManagement';
import DenialManagement from './pages/DenialManagement';
import ChargeCapture from './pages/ChargeCapture';
import PatientAccess from './pages/PatientAccess';
import CodingQuality from './pages/CodingQuality';
import PayerPerformance from './pages/PayerPerformance';
import RevenueIntegrity from './pages/RevenueIntegrity';
import OperationalMetrics from './pages/OperationalMetrics';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ar-management" element={<ARManagement />} />
        <Route path="denial-management" element={<DenialManagement />} />
        <Route path="charge-capture" element={<ChargeCapture />} />
        <Route path="patient-access" element={<PatientAccess />} />
        <Route path="coding-quality" element={<CodingQuality />} />
        <Route path="payer-performance" element={<PayerPerformance />} />
        <Route path="revenue-integrity" element={<RevenueIntegrity />} />
        <Route path="operational-metrics" element={<OperationalMetrics />} />
      </Route>
    </Routes>
  );
}

export default App;