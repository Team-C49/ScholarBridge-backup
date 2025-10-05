import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { adminApi } from '../utils/api';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  BarChart3, 
  Users, 
  Building2, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  TrendingUp, 
  Activity,
  Shield,
  Search,
  Filter,
  Download,
  Mail,
  UserX,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [trustRequests, setTrustRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [trusts, setTrusts] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBlacklistModal, setShowBlacklistModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [showTrustToggleModal, setShowTrustToggleModal] = useState(false);
  const [selectedTrust, setSelectedTrust] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  
  // Analytics state
  const [analytics, setAnalytics] = useState({
    overview: {
      totalStudents: 0,
      totalTrusts: 0,
      activeTrusts: 0,
      pendingRequests: 0,
      totalApplications: 0,
      totalAmountDistributed: 0
    },
    trends: {
      monthlyStudents: [],
      monthlyTrusts: [],
      yearlyComparison: []
    }
  });
  const [trustCoverage, setTrustCoverage] = useState({
    coverageByTrust: [],
    monthlyDistribution: [],
    topTrusts: []
  });
  const [applicationAnalytics, setApplicationAnalytics] = useState({
    statusDistribution: [],
    recentTrends: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [trustRequestsData, studentsData, trustsData] = await Promise.all([
        adminApi.getTrustRequests(),
        adminApi.getStudents(),
        adminApi.getTrusts()
      ]);
      
      setTrustRequests(trustRequestsData.requests || []);
      setStudents(studentsData.students || []);
      setTrusts(trustsData.trusts || []);
      
      // Fetch analytics data
      await fetchAnalytics();
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [overviewRes, coverageRes, appRes] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getTrustCoverage(),
        adminApi.getApplicationAnalytics()
      ]);
      
      setAnalytics(overviewRes.data);
      setTrustCoverage(coverageRes.data);
      setApplicationAnalytics(appRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    }
  };  const handleViewDetails = async (requestId) => {
    try {
      const response = await adminApi.getTrustRequest(requestId);
      setSelectedRequest(response.request);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching request details:', error);
      toast.error('Failed to load request details');
    }
  };

  const handleViewStudentDetails = async (studentId) => {
    try {
      const response = await adminApi.getStudent(studentId);
      setSelectedStudent(response.student);
      setShowStudentDetailsModal(true);
    } catch (error) {
      console.error('Error fetching student details:', error);
      toast.error('Failed to load student details');
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      await adminApi.approveTrustRequest(requestId);
      toast.success('Trust request approved successfully!');
      setShowDetailsModal(false);
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error(error.error || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId, reason) => {
    try {
      setActionLoading(true);
      await adminApi.rejectTrustRequest(requestId, reason);
      toast.success('Trust request rejected and notification sent');
      setShowDetailsModal(false);
      setShowRejectionModal(false);
      setRejectionReason('');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error(error.error || 'Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlacklistAction = async (userId, reason, isBlacklist) => {
    try {
      setActionLoading(true);
      if (isBlacklist) {
        await adminApi.blacklistUser(userId, reason);
        toast.success('User blacklisted successfully');
      } else {
        await adminApi.unblacklistUser(userId, reason);
        toast.success('User unblacklisted successfully');
      }
      setShowBlacklistModal(false);
      setSelectedUser(null);
      setActionReason('');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating blacklist status:', error);
      toast.error(error.error || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTrustToggle = async (userId, reason) => {
    try {
      setActionLoading(true);
      const result = await adminApi.toggleTrustStatus(userId, reason);
      toast.success(result.message || 'Trust status updated successfully');
      setShowTrustToggleModal(false);
      setSelectedTrust(null);
      setActionReason('');
      await fetchData(); // Refresh data
    } catch (error) {
      console.error('Error toggling trust status:', error);
      toast.error(error.error || 'Failed to update trust status');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = trustRequests.filter(req => req.status === 'pending');
  const approvedRequests = trustRequests.filter(req => req.status === 'approved');
  const rejectedRequests = trustRequests.filter(req => req.status === 'rejected');

  // Chart helper functions
  const getMonthlyTrendsChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const studentData = new Array(12).fill(0);
    const trustData = new Array(12).fill(0);

    analytics.trends.monthlyStudents.forEach(item => {
      studentData[parseInt(item.month) - 1] = parseInt(item.count);
    });

    analytics.trends.monthlyTrusts.forEach(item => {
      trustData[parseInt(item.month) - 1] = parseInt(item.count);
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Students',
          data: studentData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: 'Trusts',
          data: trustData,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const getApplicationStatusChartData = () => {
    const statusColors = {
      'draft': '#6B7280',
      'submitted': '#F59E0B',
      'under_review': '#3B82F6',
      'approved': '#10B981',
      'rejected': '#EF4444'
    };

    return {
      labels: applicationAnalytics.statusDistribution.map(item => 
        item.status.replace('_', ' ').toUpperCase()
      ),
      datasets: [
        {
          data: applicationAnalytics.statusDistribution.map(item => parseInt(item.count)),
          backgroundColor: applicationAnalytics.statusDistribution.map(item => 
            statusColors[item.status] || '#6B7280'
          ),
          borderWidth: 2,
        },
      ],
    };
  };

  const getTrustCoverageChartData = () => {
    const topTrusts = trustCoverage.topTrusts.slice(0, 10);
    
    return {
      labels: topTrusts.map(trust => trust.org_name && trust.org_name.length > 20 ? 
        trust.org_name.substring(0, 20) + '...' : trust.org_name || 'Unknown'
      ),
      datasets: [
        {
          label: 'Amount Distributed (₹)',
          data: topTrusts.map(trust => parseFloat(trust.total_distributed || 0)),
          backgroundColor: 'rgba(139, 69, 19, 0.6)',
          borderColor: 'rgba(139, 69, 19, 1)',
          borderWidth: 1,
        },
      ],
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-purple-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">ScholarBridge - Admin Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, {user?.email}
              </div>
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-500 to-blue-600 rounded-2xl p-8 text-white mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">Admin Dashboard</h2>
          <p className="text-purple-100">
            Manage trust registrations, students, and oversee the platform
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border"
          >
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-sm border"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Trusts</p>
                <p className="text-2xl font-bold text-gray-900">{trusts.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-6 shadow-sm border"
          >
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{students.length}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl p-6 shadow-sm border"
          >
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{trustRequests.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'trustRequests', label: 'Trust Requests', icon: FileText },
                { key: 'students', label: 'Students', icon: Users },
                { key: 'trusts', label: 'Approved Trusts', icon: Building2 }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <Users className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Total Students</p>
                        <p className="text-2xl font-bold">{analytics.overview.totalStudents.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <Building2 className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Total Trusts</p>
                        <p className="text-2xl font-bold">{analytics.overview.totalTrusts.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Active Trusts</p>
                        <p className="text-2xl font-bold">{analytics.overview.activeTrusts.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Pending Requests</p>
                        <p className="text-2xl font-bold">{analytics.overview.pendingRequests.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Total Applications</p>
                        <p className="text-2xl font-bold">{analytics.overview.totalApplications.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-6 rounded-lg text-white">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8" />
                      <div className="ml-4">
                        <p className="text-sm opacity-90">Amount Distributed</p>
                        <p className="text-2xl font-bold">₹{analytics.overview.totalAmountDistributed.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Monthly Registration Trends */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Registration Trends</h3>
                    <div className="h-64">
                      <Bar
                        data={getMonthlyTrendsChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        }}
                      />
                    </div>
                  </div>

                  {/* Application Status Distribution */}
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Status Distribution</h3>
                    <div className="h-64">
                      <Doughnut
                        data={getApplicationStatusChartData()}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Trust Coverage Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Trusts by Amount Distributed</h3>
                  <div className="h-64">
                    <Bar
                      data={getTrustCoverageChartData()}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {
                          legend: {
                            display: false,
                          },
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return '₹' + value.toLocaleString();
                              }
                            }
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Real-time Updates Indicator */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-800">
                      Dashboard updates automatically every 30 seconds • Last updated: {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'trustRequests' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Trust Registration Requests</h3>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-gray-600">Pending: {pendingRequests.length}</span>
                    <span className="text-gray-600">Approved: {approvedRequests.length}</span>
                    <span className="text-gray-600">Rejected: {rejectedRequests.length}</span>
                  </div>
                </div>

                {trustRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No trust requests found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trustRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <h4 className="font-medium text-gray-900">{request.org_name}</h4>
                              {getStatusBadge(request.status)}
                            </div>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Email: {request.registration_email}</p>
                              <p>Phone: {request.contact_phone || 'Not provided'}</p>
                              <p>Registration #: {request.registration_number || 'Not provided'}</p>
                              <p>Submitted: {formatDate(request.submitted_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(request.id)}
                              className="flex items-center space-x-1 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </button>
                            {request.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(request.id)}
                                  disabled={actionLoading}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setShowRejectionModal(true);
                                  }}
                                  disabled={actionLoading}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'students' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Registered Students</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search students..."
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="blacklisted">Blacklisted</option>
                    </select>
                  </div>
                </div>
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No students found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {students.map((student) => (
                      <div key={student.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{student.full_name || 'Name not provided'}</h4>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Email: {student.email}</p>
                              <p>Phone: {student.phone_number || 'Not provided'}</p>
                              <p>Date of Birth: {student.date_of_birth ? formatDate(student.date_of_birth) : 'Not provided'}</p>
                              <p>Registered: {formatDate(student.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {student.email_verified ? (
                                <CheckCircle className="w-5 h-5 text-green-500" title="Email verified" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" title="Email not verified" />
                              )}
                              {student.is_blacklisted ? (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Blacklisted</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewStudentDetails(student.id)}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View Details</span>
                              </button>
                              {!student.is_blacklisted ? (
                                <button
                                  onClick={() => {
                                    setSelectedUser(student);
                                    setShowBlacklistModal(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>Blacklist</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedUser(student);
                                    setShowBlacklistModal(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>Unblacklist</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'trusts' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Approved Trusts</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search trusts..."
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="blacklisted">Blacklisted</option>
                    </select>
                  </div>
                </div>
                {trusts.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No approved trusts found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {trusts.map((trust) => (
                      <div key={trust.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{trust.org_name}</h4>
                            <div className="mt-2 text-sm text-gray-600">
                              <p>Email: {trust.email}</p>
                              <p>Contact: {trust.contact_phone || 'Not provided'}</p>
                              <p>Website: {trust.website || 'Not provided'}</p>
                              <p>Established: {trust.year_established || 'Not provided'}</p>
                              <p>Registration #: {trust.registration_number || 'Not provided'}</p>
                              <p>Joined: {formatDate(trust.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {trust.is_active ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Inactive</span>
                              )}
                              {trust.verified && <CheckCircle className="w-5 h-5 text-green-500" title="Verified" />}
                              {trust.is_blacklisted && (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Blacklisted</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedTrust(trust);
                                  setShowDetailsModal(true);
                                }}
                                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedTrust(trust);
                                  setShowTrustToggleModal(true);
                                }}
                                className={`flex items-center space-x-1 px-3 py-2 text-sm rounded-lg ${
                                  trust.is_active 
                                    ? 'text-orange-600 hover:bg-orange-50' 
                                    : 'text-green-600 hover:bg-green-50'
                                }`}
                              >
                                {trust.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                                <span>{trust.is_active ? 'Deactivate' : 'Activate'}</span>
                              </button>
                              {!trust.is_blacklisted ? (
                                <button
                                  onClick={() => {
                                    setSelectedUser(trust);
                                    setShowBlacklistModal(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <UserX className="w-4 h-4" />
                                  <span>Blacklist</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedUser(trust);
                                    setShowBlacklistModal(true);
                                  }}
                                  className="flex items-center space-x-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>Unblacklist</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trust Request Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Trust Request Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedRequest.org_name}</h4>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.registration_email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.contact_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.contact_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Year Established</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.year_established || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Registration Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.registration_number || 'Not provided'}</p>
                  </div>
                </div>

                {selectedRequest.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {typeof selectedRequest.address === 'object' 
                        ? Object.values(selectedRequest.address).filter(Boolean).join(', ')
                        : selectedRequest.address || 'Not provided'
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Submitted At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.submitted_at)}</p>
                </div>

                {selectedRequest.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.admin_notes}</p>
                  </div>
                )}

                {/* Documents Section */}
                {selectedRequest.documents && selectedRequest.documents.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Uploaded Documents</label>
                    <div className="space-y-2">
                      {selectedRequest.documents.map((doc, index) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {doc.doc_type === 'registration_certificate' ? 'Registration Certificate' : 
                                 doc.doc_type === 'trust_deed' ? 'Trust Deed' : 
                                 doc.doc_type.charAt(0).toUpperCase() + doc.doc_type.slice(1).replace('_', ' ')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.original_name} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'} • {formatDate(doc.created_at)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </a>
                            <a
                              href={doc.file_url}
                              download={doc.original_name}
                              className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.documents && selectedRequest.documents.length === 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded Documents</label>
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm text-yellow-800">No documents have been uploaded yet</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="flex space-x-4 mt-6 pt-6 border-t">
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{actionLoading ? 'Processing...' : 'Approve Trust'}</span>
                  </button>
                  <button
                    onClick={() => setShowRejectionModal(true)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span>Reject Trust</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Reject Trust Request</h3>
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting the trust request from <strong>{selectedRequest.org_name}</strong>. 
                This will be sent to them via email.
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest.id, rejectionReason)}
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Reject Trust'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist Modal */}
      {showBlacklistModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser.is_blacklisted ? 'Unblacklist User' : 'Blacklist User'}
                </h3>
                <button
                  onClick={() => {
                    setShowBlacklistModal(false);
                    setSelectedUser(null);
                    setActionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to {selectedUser.is_blacklisted ? 'unblacklist' : 'blacklist'} this user?
                </p>
                <p className="font-medium">{selectedUser.full_name || selectedUser.org_name || selectedUser.email}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (required)
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Please provide a reason for this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowBlacklistModal(false);
                    setSelectedUser(null);
                    setActionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBlacklistAction(selectedUser.id, actionReason, !selectedUser.is_blacklisted)}
                  disabled={!actionReason.trim() || actionLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    selectedUser.is_blacklisted
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : (selectedUser.is_blacklisted ? 'Unblacklist' : 'Blacklist')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trust Toggle Modal */}
      {showTrustToggleModal && selectedTrust && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedTrust.is_active ? 'Deactivate Trust' : 'Activate Trust'}
                </h3>
                <button
                  onClick={() => {
                    setShowTrustToggleModal(false);
                    setSelectedTrust(null);
                    setActionReason('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to {selectedTrust.is_active ? 'deactivate' : 'activate'} this trust?
                </p>
                <p className="font-medium">{selectedTrust.org_name}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (required)
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Please provide a reason for this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowTrustToggleModal(false);
                    setSelectedTrust(null);
                    setActionReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleTrustToggle(selectedTrust.id, actionReason)}
                  disabled={!actionReason.trim() || actionLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    selectedTrust.is_active
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionLoading ? 'Processing...' : (selectedTrust.is_active ? 'Deactivate' : 'Activate')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {showStudentDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                <button
                  onClick={() => setShowStudentDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{selectedStudent.full_name || 'Name not provided'}</h4>
                  {selectedStudent.is_blacklisted ? (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Blacklisted</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Active</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.date_of_birth ? formatDate(selectedStudent.date_of_birth) : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.gender || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">KYC Document Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.kyc_doc_type || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Status</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedStudent.is_blacklisted ? 'Blacklisted' : 'Active'}</p>
                  </div>
                </div>

                {selectedStudent.address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {typeof selectedStudent.address === 'object' 
                        ? Object.values(selectedStudent.address).filter(Boolean).join(', ')
                        : selectedStudent.address || 'Not provided'
                      }
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Registered At</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedStudent.created_at)}</p>
                </div>

                {/* Uploaded Documents Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Uploaded Documents</label>
                  {selectedStudent.documents && selectedStudent.documents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedStudent.documents.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="w-5 h-5 text-blue-500" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {doc.doc_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {doc.original_name} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'Unknown size'} • {formatDate(doc.created_at)}
                                </p>
                                {doc.description && (
                                  <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => window.open(doc.file_url, '_blank')}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = doc.file_url;
                                  link.download = doc.original_name || 'document';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md"
                              >
                                <Download className="w-4 h-4" />
                                <span>Download</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No documents uploaded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
