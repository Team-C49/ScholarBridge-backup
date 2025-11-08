import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Eye, Settings, TrendingUp,
  CheckCircle, Clock, XCircle, AlertCircle, Filter,
  GraduationCap, DollarSign, MapPin, User
} from 'lucide-react';
import { api, authenticatedTrustApi } from '../utils/api';

// Match Score Visualization Component
const MatchScoreBar = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-6" title={`Match Score: ${score}%`}>
      <div 
        className={`${getColor()} h-6 rounded-full text-xs text-white flex items-center justify-center font-medium`} 
        style={{ width: `${Math.max(score, 10)}%` }}
      >
        {score >= 15 ? `${score}%` : ''}
      </div>
      {score < 15 && (
        <span className="text-xs text-gray-600 ml-2">{score}%</span>
      )}
    </div>
  );
};

const TrustDashboard = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showFiltered, setShowFiltered] = useState(true); // Smart filtering toggle
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    rejected: 0,
    totalRequested: 0,
    totalApproved: 0
  });

  // Modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check authentication before loading applications
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to access the Trust Dashboard.');
      setLoading(false);
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'trust') {
        setError('Access denied. This dashboard is only available to trust users.');
        setLoading(false);
        return;
      }
      
      // Token exists and user is a trust - proceed to load data
      loadDashboardData();
    } catch (error) {
      setError('Invalid authentication token. Please log in again.');
      setLoading(false);
    }
  }, [activeTab, showFiltered]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load both stats and applications in parallel
      const [statsData, applicationsData] = await Promise.all([
        authenticatedTrustApi.getDashboardStats(),
        loadApplications()
      ]);
      
      // Set stats from dedicated endpoint
      setStats({
        total: Number(statsData.total) || 0,
        approved: Number(statsData.approved) || 0,
        rejected: Number(statsData.rejected) || 0,
        totalRequested: Number(statsData.total_requested) || 0,
        totalApproved: Number(statsData.total_approved) || 0
      });
      
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      handleLoadError(error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      const queryParams = {
        status: activeTab,
        view: showFiltered ? 'filtered' : 'all'
      };
      
      console.log('🔍 Loading applications with params:', queryParams);
      
      // Use the authenticated trust API method instead of direct api call
      const response = await authenticatedTrustApi.getDashboardApplications(queryParams);
      console.log('✅ Applications loaded:', response?.length || 0);
      
      setApplications(response || []);
      return response || [];
      
    } catch (error) {
      console.error('❌ Failed to load applications:', error);
      throw error;
    }
  };

  const handleLoadError = (error) => {
    console.error('❌ Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      }
    });
    
    // Check if it's an authentication error
    if (error.response?.status === 401) {
      console.log('🔄 Authentication error, redirecting to login...');
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    
    let errorMessage = 'Failed to load applications. Please try again.';
    
    if (error.response?.status === 401) {
      errorMessage = 'Authentication required. Please log in as a trust user.';
    } else if (error.response?.status === 403) {
      errorMessage = 'Access denied. This page requires trust-level permissions.';
    } else if (error.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check if the backend is running.';
    } else {
      errorMessage = error?.response?.data?.error || error.message || errorMessage;
    }
    
    setError(errorMessage);
    setApplications([]);
    setStats({ total: 0, approved: 0, rejected: 0, totalRequested: 0, totalApproved: 0 });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
      case 'closed':
      case 'partially_approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'submitted':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'closed':
        return 'Fully Funded';
      case 'partially_approved':
        return 'Partially Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const handleViewApplication = (applicationId) => {
    navigate(`/trust/application/${applicationId}`);
  };

  const handleOpenApproveModal = (application) => {
    setSelectedApplication(application);
    setApprovalAmount(application.total_amount_requested.toString());
    setRemarks('');
    setShowApproveModal(true);
  };

  const handleOpenRejectModal = (application) => {
    setSelectedApplication(application);
    setRemarks('');
    setShowRejectModal(true);
  };

  const handleCloseModals = () => {
    setShowApproveModal(false);
    setShowRejectModal(false);
    setSelectedApplication(null);
    setApprovalAmount('');
    setRemarks('');
    setError('');
  };

  const handleApproveApplication = async () => {
    if (!approvalAmount || Number(approvalAmount) <= 0) {
      setError('Please enter a valid approval amount');
      return;
    }

    if (!selectedApplication) return;

    try {
      setProcessing(true);
      setError('');
      
      await authenticatedTrustApi.updateApplicationStatus(
        selectedApplication.application_id,
        'approved',
        Number(approvalAmount),
        remarks || 'Application approved'
      );
      
      console.log('✅ Application approved successfully');
      
      // Close modal and reload applications
      handleCloseModals();
      loadApplications();
      
      alert('Application approved successfully!');
      
    } catch (error) {
      console.error('❌ Failed to approve application:', error);
      setError(error?.error || 'Failed to approve application');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectApplication = async () => {
    if (!remarks.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    if (!selectedApplication) return;

    try {
      setProcessing(true);
      setError('');
      
      await authenticatedTrustApi.updateApplicationStatus(
        selectedApplication.application_id,
        'rejected',
        0,
        remarks
      );
      
      console.log('✅ Application rejected successfully');
      
      // Close modal and reload applications
      handleCloseModals();
      loadApplications();
      
      alert('Application rejected successfully!');
      
    } catch (error) {
      console.error('❌ Failed to reject application:', error);
      setError(error?.error || 'Failed to reject application');
    } finally {
      setProcessing(false);
    }
  };
  if (loading && applications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Trust Dashboard</h1>
                <p className="text-gray-600 mt-1">Review and manage scholarship applications</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => navigate('/trust/applications/analytics')}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <TrendingUp className="w-5 h-5" />
                  <span>Analytics</span>
                </button>
                <button
                  onClick={() => navigate('/trust/preferences')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span>Preferences</span>
                </button>
                <button
                  onClick={() => navigate('/trust/profile')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Requested</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(stats.totalRequested)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Approved</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalApproved)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            
            {/* Smart Filter Toggle */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFiltered}
                  onChange={() => setShowFiltered(!showFiltered)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Smart Filtering: Only show applications matching my preferences
                  </span>
                </div>
              </label>
              <p className="text-sm text-blue-700 mt-2 ml-7">
                {showFiltered 
                  ? "Applications are filtered based on your funding preferences and sorted by match score" 
                  : "Showing all applications regardless of preferences"
                }
              </p>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Applications
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'approved'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'rejected'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
              <p className="text-gray-500">
                {showFiltered 
                  ? "No applications match your current preferences. Try adjusting your filtering criteria or disable smart filtering."
                  : "No applications found for the selected status."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {showFiltered && activeTab === 'all' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Match Score
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Requested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'approved' ? 'My Approved Amount' : 'Amount Received'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.map((application) => (
                    <tr key={application.application_id} className="hover:bg-gray-50">
                      {showFiltered && activeTab === 'all' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-32">
                            <MatchScoreBar score={Math.round(application.match_score || 0)} />
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <GraduationCap className="w-8 h-8 text-blue-500" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {application.full_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.current_course_name}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{application.city}</span>
                              <span>•</span>
                              <span>Academic Year {application.academic_year}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(application.status)}
                          <span className="text-sm text-gray-900">
                            {getStatusText(application.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(application.total_amount_requested)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Family Income: {formatCurrency(application.total_family_income_lpa * 100000)}/year
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          {/* Show different amounts based on active tab */}
                          {activeTab === 'approved' 
                            ? formatCurrency(application.my_approved_amount || 0) // Amount THIS trust approved
                            : formatCurrency(application.total_amount_approved || 0) // Total amount student received
                          }
                        </div>
                        {activeTab === 'approved' && (
                          <div className="text-xs text-gray-500">
                            Student received: {formatCurrency(application.total_amount_approved || 0)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewApplication(application.application_id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                          
                          {/* Show approve/reject buttons only if THIS trust hasn't acted on it yet AND application isn't closed */}
                          {!application.my_approval_status && application.status !== 'closed' && (
                            <>
                              <button
                                onClick={() => handleOpenApproveModal(application)}
                                className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(application)}
                                className="text-red-600 hover:text-red-900 flex items-center space-x-1"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Approve Application</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Student: <span className="font-medium text-gray-900">{selectedApplication.full_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Requested Amount: <span className="font-medium text-gray-900">{formatCurrency(selectedApplication.total_amount_requested)}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Approved Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={approvalAmount}
                onChange={(e) => setApprovalAmount(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Enter approved amount"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Add any comments for the student..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleApproveApplication}
                disabled={processing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{processing ? 'Approving...' : 'Approve'}</span>
              </button>
              <button
                onClick={handleCloseModals}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Application</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Student: <span className="font-medium text-gray-900">{selectedApplication.full_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Requested Amount: <span className="font-medium text-gray-900">{formatCurrency(selectedApplication.total_amount_requested)}</span>
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a reason for rejecting this application..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleRejectApplication}
                disabled={processing}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-5 h-5" />
                <span>{processing ? 'Rejecting...' : 'Reject'}</span>
              </button>
              <button
                onClick={handleCloseModals}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrustDashboard;
