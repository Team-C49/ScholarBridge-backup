import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentDashboard from '../../pages/StudentDashboard';

const StudentLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default StudentLayout;
