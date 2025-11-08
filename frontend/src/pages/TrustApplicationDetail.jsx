import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Eye, Download, CheckCircle, XCircle, 
  User, GraduationCap, MapPin, DollarSign, FileText,
  Star, AlertCircle
} from 'lucide-react';
import { api, authenticatedTrustApi } from '../utils/api';

const TrustApplicationDetail = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [remarks, setRemarks] = useState('');

  // Check if there are URL actions
  const urlAction = searchParams.get('action');
  const urlAmount = searchParams.get('amount');

  useEffect(() => {
    loadApplicationDetails();
    
    // Pre-fill approval amount if provided via URL
    if (urlAmount && !approvalAmount) {
      setApprovalAmount(urlAmount);
    }
  }, [applicationId, urlAmount]);

  const loadApplicationDetails = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get(`/trusts/application/${applicationId}`);
      console.log('✅ Application details loaded:', response.data);
      
      setApplication(response.data);
      
      // Set default approval amount to requested amount
      if (response.data.application && !approvalAmount) {
        setApprovalAmount(response.data.application.total_amount_requested || '');
      }
      
    } catch (error) {
      console.error('❌ Failed to load application details:', error);
      setError('Failed to load application details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalAmount || Number(approvalAmount) <= 0) {
      alert('Please enter a valid approval amount');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to approve this application with amount ${formatCurrency(approvalAmount)}?${remarks ? `\n\nRemarks: ${remarks}` : ''}`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError('');
      
      await authenticatedTrustApi.updateApplicationStatus(
        applicationId,
        'approved',
        Number(approvalAmount),
        remarks || 'Application approved'
      );
      
      console.log('✅ Application approved successfully');
      alert('Application approved successfully!');
      
      // Reload to show updated status
      await loadApplicationDetails();
      
      // Clear the URL params
      navigate(`/trust/application/${applicationId}`, { replace: true });
      
    } catch (error) {
      console.error('❌ Failed to approve application:', error);
      setError(error?.error || 'Failed to approve application');
      alert('Failed to approve application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reject this application?\n\nReason: ${remarks}`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError('');
      
      await authenticatedTrustApi.updateApplicationStatus(
        applicationId,
        'rejected',
        0,
        remarks
      );
      
      console.log('✅ Application rejected successfully');
      alert('Application rejected successfully!');
      
      // Reload to show updated status
      await loadApplicationDetails();
      
      // Clear the URL params
      navigate(`/trust/application/${applicationId}`, { replace: true });
      
    } catch (error) {
      console.error('❌ Failed to reject application:', error);
      setError(error?.error || 'Failed to reject application');
      alert('Failed to reject application. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownloadCompletePackage = async () => {
    try {
      setProcessing(true);
      await authenticatedTrustApi.downloadCompletePackage(applicationId);
      console.log('✅ Complete package downloaded successfully');
    } catch (error) {
      console.error('❌ Failed to download complete package:', error);
      alert('Failed to download complete package. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'closed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <AlertCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'closed': return <Star className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Application</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/trust/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Application Not Found</h3>
          <button
            onClick={() => navigate('/trust/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { application: app, education_history = [], family_members = [], current_expenses = [], documents = [] } = application;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/trust/dashboard')}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Application Review</h1>
                  <p className="text-gray-600">Application ID: {app.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                  {getStatusIcon(app.status)}
                  <span className="ml-1 capitalize">{app.status}</span>
                </span>
                <button
                  onClick={handleDownloadCompletePackage}
                  disabled={processing}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  <span>{processing ? 'Downloading...' : 'Download Complete Package'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Student Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <User className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Student Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-900">{app.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{app.student_email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{app.phone_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Gender</label>
                    <p className="text-gray-900">{app.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Birth</label>
                    <p className="text-gray-900">{new Date(app.date_of_birth).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-gray-900">{app.address?.city}, {app.address?.state}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <GraduationCap className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Academic Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Course</label>
                    <p className="text-gray-900">{app.current_course_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">School/College</label>
                    <p className="text-gray-900">{app.school_college_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Academic Year</label>
                    <p className="text-gray-900">{app.academic_year}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Course Duration</label>
                    <p className="text-gray-900">{app.course_duration_years} years</p>
                  </div>
                </div>

                {education_history.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Education History</h3>
                    <div className="space-y-3">
                      {education_history.map((edu, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{edu.institution_name}</p>
                            <p className="text-sm text-gray-600">{edu.course_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{edu.grade}%</p>
                            <p className="text-sm text-gray-600">{edu.year_of_passing}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Financial Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Amount Requested</label>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(app.total_amount_requested)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Family Income</label>
                    <p className="text-lg font-medium text-gray-900">{formatCurrency(app.total_family_income * 12)}/year</p>
                  </div>
                </div>

                {family_members.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Family Members</h3>
                    <div className="space-y-3">
                      {family_members.map((member, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.relationship} • {member.occupation}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(member.monthly_income)}/month</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {current_expenses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Current Expenses</h3>
                    <div className="space-y-2">
                      {current_expenses.map((expense, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-gray-700">{expense.category}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(expense.monthly_amount)}/month</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents */}
            {documents.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <FileText className="w-6 h-6 text-orange-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Documents</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.original_name}</p>
                            <p className="text-sm text-gray-600 capitalize">{doc.doc_type.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await authenticatedTrustApi.viewDocument(doc.id);
                            } catch (error) {
                              console.error('Failed to view document:', error);
                              alert('Failed to view document. Please try again.');
                            }
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Submitted Date:</span>
                    <span className="font-medium">{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Requested:</span>
                    <span className="font-medium">{formatCurrency(app.total_amount_requested)}</span>
                  </div>
                  {app.total_amount_approved > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Approved:</span>
                      <span className="font-medium text-green-600">{formatCurrency(app.total_amount_approved)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Panel */}
            {app.status === 'submitted' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Actions</h3>
                  
                  {/* Approval Amount */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Amount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={approvalAmount}
                      onChange={(e) => setApprovalAmount(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                    />
                  </div>

                  {/* Remarks */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      rows={3}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Add review comments..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>{processing ? 'Approving...' : 'Approve Application'}</span>
                    </button>
                    
                    <button
                      onClick={handleReject}
                      disabled={processing}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>{processing ? 'Rejecting...' : 'Reject Application'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustApplicationDetail;