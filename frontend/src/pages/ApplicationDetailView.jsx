import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, FileText, User, Mail, Calendar, Phone, 
  MapPin, GraduationCap, Users, DollarSign, CreditCard, 
  Building2, Eye, CheckCircle, Clock, XCircle
} from 'lucide-react';
import { studentApi } from '../utils/api';

const ApplicationDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [profile, setProfile] = useState(null);
  const [educationHistory, setEducationHistory] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentExpenses, setCurrentExpenses] = useState([]);
  const [trustPayments, setTrustPayments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    loadApplicationDetails();
  }, [id]);

  const loadApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getApplicationDetails(id);
      
      setApplication(response.application);
      setProfile(response.profile);
      setEducationHistory(response.educationHistory || []);
      setFamilyMembers(response.familyMembers || []);
      setCurrentExpenses(response.currentExpenses || []);
      setTrustPayments(response.trustPayments || []);
      setDocuments(response.documents || []);
      
    } catch (error) {
      console.error('Failed to load application details:', error);
      setError('Failed to load application details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      await studentApi.downloadApplicationPDF(id);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      await studentApi.downloadApplicationZip(id);
    } catch (error) {
      console.error('Failed to download ZIP:', error);
      alert('Failed to download documents. Please try again.');
    } finally {
      setDownloadingZip(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Application</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/student/applications')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate('/student/applications')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Applications</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingPDF ? 'Downloading...' : 'Download PDF'}</span>
                </button>
                
                <button
                  onClick={handleDownloadZip}
                  disabled={downloadingZip}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingZip ? 'Downloading...' : 'Download Documents'}</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Scholarship Application - Academic Year {application?.academic_year}
                </h1>
                <p className="text-gray-600 mt-1">Submitted on {formatDate(application?.created_at)}</p>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(application?.status || 'submitted')}
                <span className="text-lg font-medium text-gray-900">
                  {application?.status === 'submitted' && 'Under Review'}
                  {application?.status === 'approved' && 'Approved'}
                  {application?.status === 'rejected' && 'Rejected'}
                  {!application?.status && 'Submitted'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Application Content - This is the printable section */}
        <div id="application-content" className="bg-white rounded-lg shadow-sm border border-gray-200">
          
          {/* Personal Information */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <User className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile?.profile_picture_url && (
                <div className="md:col-span-2 flex justify-center mb-4">
                  <img
                    src={profile.profile_picture_url}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-sm text-gray-900">{profile?.full_name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{profile?.email || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900">
                  {profile?.date_of_birth ? formatDate(profile.date_of_birth) : 'N/A'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <p className="mt-1 text-sm text-gray-900">{profile?.gender || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <p className="mt-1 text-sm text-gray-900">{profile?.phone_number || 'N/A'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-sm text-gray-900">
                  {profile?.address ? (
                    typeof profile.address === 'string' 
                      ? profile.address 
                      : `${profile.address.street || ''}, ${profile.address.city || ''}, ${profile.address.state || ''}, ${profile.address.zipCode || ''}`
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Education */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <GraduationCap className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Current Education</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">College/School Name</label>
                <p className="mt-1 text-sm text-gray-900">{application?.school_college_name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Course</label>
                <p className="mt-1 text-sm text-gray-900">{application?.current_course_name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Academic Year</label>
                <p className="mt-1 text-sm text-gray-900">{application?.academic_year || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Education History */}
          {educationHistory.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Education History</h2>
              </div>
              
              <div className="space-y-4">
                {educationHistory.map((edu, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Education #{index + 1}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Institution</label>
                        <p className="text-gray-900">{edu.institution_name}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Qualification</label>
                        <p className="text-gray-900">{edu.qualification}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Year</label>
                        <p className="text-gray-900">{edu.year_of_passing}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Grade</label>
                        <p className="text-gray-900">{edu.grade}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Family Members */}
          {familyMembers.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
              </div>
              
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Family Member #{index + 1}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Name</label>
                        <p className="text-gray-900">{member.name}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Relation</label>
                        <p className="text-gray-900">{member.relation}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Age</label>
                        <p className="text-gray-900">{member.age}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Occupation</label>
                        <p className="text-gray-900">{member.occupation}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Monthly Income</label>
                        <p className="text-gray-900">{formatCurrency(member.monthly_income)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total Family Income */}
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-900">Total Family Monthly Income:</span>
                  <span className="text-lg font-bold text-green-900">
                    {formatCurrency(
                      familyMembers.reduce((sum, member) => sum + (parseFloat(member.monthly_income) || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Current Expenses */}
          {currentExpenses.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Current Expenses</h2>
              </div>
              
              <div className="space-y-4">
                {currentExpenses.map((expense, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Expense #{index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Expense Type</label>
                        <p className="text-gray-900">{expense.expense_name?.replace(/_/g, ' ').toUpperCase()}</p>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Amount</label>
                        <p className="text-gray-900">{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Total Expenses */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-900">Total Amount Requested:</span>
                  <span className="text-lg font-bold text-blue-900">
                    {formatCurrency(application?.total_amount_requested)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bank Details */}
          {profile?.bank_details_masked && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.bank_details_masked.bank_name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Account Number</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.bank_details_masked.account_masked}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                  <p className="mt-1 text-sm text-gray-900">{profile.bank_details_masked.ifsc}</p>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Uploaded Documents</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">{doc.description}</span>
                    </div>
                    <button
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">View</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trust Payments */}
          {trustPayments.length > 0 && (
            <div className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Trust Payments</h2>
              </div>
              
              <div className="space-y-3">
                {trustPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{payment.trust_name}</p>
                      <p className="text-sm text-gray-600">Paid on {formatDate(payment.payment_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Total Received:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(
                      trustPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailView;