import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from '../../pages/StudentDashboard';
import ApplicationForm from '../../pages/ApplicationForm';
import StudentApplicationsDashboard from '../../pages/StudentApplicationsDashboard';
import ApplicationDetailView from '../../pages/ApplicationDetailView';

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/applications" element={<StudentApplicationsDashboard />} />
        <Route path="/applications/:id" element={<ApplicationDetailView />} />
        <Route path="/application/new" element={<ApplicationForm />} />
        <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default StudentLayout;
