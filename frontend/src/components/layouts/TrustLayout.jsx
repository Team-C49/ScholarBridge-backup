import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TrustDashboard from '../../pages/TrustDashboard';
import TrustPreferencesPage from '../../pages/TrustPreferencesPage';
import TrustApplicationDetail from '../../pages/TrustApplicationDetail';

const TrustLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/dashboard" element={<TrustDashboard />} />
        <Route path="/preferences" element={<TrustPreferencesPage />} />
        <Route path="/application/:applicationId" element={<TrustApplicationDetail />} />
        <Route path="/" element={<Navigate to="/trust/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/trust/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default TrustLayout;
