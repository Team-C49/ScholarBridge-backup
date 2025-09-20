'use client'

import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'
import ProtectedRoute from '../components/ProtectedRoute'

export default function DashboardPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div>
        <Navbar />
        <div className="dashboard-header">
          <div className="container">
            <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>Admin Panel</h1>
          </div>
        </div>

        <div className="container">
          <div className="dashboard-content">
            <div 
              className="dashboard-card"
              onClick={() => router.push('/dashboard/applications')}
            >
              <h3>ALL APPLICATIONS</h3>
              <p>View and manage all student applications</p>
            </div>

            <div 
              className="dashboard-card"
              onClick={() => router.push('/dashboard/reports')}
            >
              <h3>REPORT</h3>
              <p>Generate and view reports</p>
            </div>

            <div 
              className="dashboard-card"
              onClick={() => router.push('/dashboard/trusts')}
            >
              <h3>TRUSTS</h3>
              <p>Manage trust and NGO information</p>
            </div>

            <div 
              className="dashboard-card"
              onClick={() => router.push('/dashboard/analytics')}
            >
              <h3>ANALYTICS</h3>
              <p>View analytics and insights</p>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
