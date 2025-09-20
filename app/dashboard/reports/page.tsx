'use client'

import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <div>
        <Navbar />
        <div className="dashboard-header">
          <div className="container">
            <h1>Report</h1>
          </div>
        </div>

        <div className="container">
          <div className="form-card">
            <h2 className="form-title">Reports Dashboard</h2>
            <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
              Generate and view various reports for your organization.
            </p>
            
            <div className="dashboard-content">
              <div className="dashboard-card">
                <h3>Financial Reports</h3>
                <p>View financial summaries and transactions</p>
              </div>
              
              <div className="dashboard-card">
                <h3>Application Reports</h3>
                <p>Generate application status reports</p>
              </div>
              
              <div className="dashboard-card">
                <h3>User Reports</h3>
                <p>View user activity and statistics</p>
              </div>
              
              <div className="dashboard-card">
                <h3>Export Data</h3>
                <p>Export data in various formats</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
