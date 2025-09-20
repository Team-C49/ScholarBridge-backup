'use client'

import { useState, useEffect } from 'react'
import Navbar from '../../components/Navbar'
import ProtectedRoute from '../../components/ProtectedRoute'

interface Application {
  id: string
  date: string
  name: string
  mobile: string
  financialAssistance: string
  sanctionedAmount: number
  amountReceived: boolean
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setApplications([
        {
          id: '1',
          date: '2024-01-15',
          name: 'John Doe',
          mobile: '+1234567890',
          financialAssistance: 'Yes',
          sanctionedAmount: 5000,
          amountReceived: true
        },
        {
          id: '2',
          date: '2024-01-16',
          name: 'Jane Smith',
          mobile: '+1234567891',
          financialAssistance: 'No',
          sanctionedAmount: 0,
          amountReceived: false
        },
        {
          id: '3',
          date: '2024-01-17',
          name: 'Bob Johnson',
          mobile: '+1234567892',
          financialAssistance: 'Yes',
          sanctionedAmount: 3000,
          amountReceived: false
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  const handleView = (id: string) => {
    console.log('View application:', id)
  }

  const handleEdit = (id: string) => {
    console.log('Edit application:', id)
  }

  const handleDelete = (id: string) => {
    console.log('Delete application:', id)
  }

  return (
    <ProtectedRoute>
      <div>
        <Navbar />
        <div className="dashboard-header">
          <div className="container">
            <h1>All Applications</h1>
            <p>Dashboard/Student Application List</p>
          </div>
        </div>

        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <span className="spinner"></span>
              <span>Loading applications...</span>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sr no.</th>
                    <th>Date</th>
                    <th>Name</th>
                    <th>Mobile No.</th>
                    <th>Financial Assistance</th>
                    <th>Sanctioned Amount</th>
                    <th>View</th>
                    <th>Amount Received</th>
                    <th>Edit</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, index) => (
                    <tr key={app.id}>
                      <td>{index + 1}</td>
                      <td>{app.date}</td>
                      <td>{app.name}</td>
                      <td>{app.mobile}</td>
                      <td>{app.financialAssistance}</td>
                      <td>${app.sanctionedAmount}</td>
                      <td>
                        <button 
                          onClick={() => handleView(app.id)}
                          className="btn btn-primary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          View
                        </button>
                      </td>
                      <td>
                        <span style={{ 
                          color: app.amountReceived ? '#4CAF50' : '#f44336',
                          fontWeight: 'bold'
                        }}>
                          {app.amountReceived ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleEdit(app.id)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                        >
                          Edit
                        </button>
                      </td>
                      <td>
                        <button 
                          onClick={() => handleDelete(app.id)}
                          className="btn"
                          style={{ 
                            padding: '0.25rem 0.5rem', 
                            fontSize: '0.8rem',
                            background: '#f44336',
                            color: 'white',
                            border: 'none'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
