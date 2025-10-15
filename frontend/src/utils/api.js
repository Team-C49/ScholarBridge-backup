import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Forgot Password API functions
api.forgotPassword = {
  // Send OTP to email for password reset
  sendOTP: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to send OTP' };
    }
  },

  // Verify OTP for password reset
  verifyOTP: async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-reset-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Invalid OTP' };
    }
  },

  // Reset password with OTP
  resetPassword: async (email, otp, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { 
        email, 
        otp, 
        new_password: newPassword 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to reset password' };
    }
  }
};

// Trust registration API functions
export const trustApi = {
  // Submit trust registration request
  registerTrust: async (formData) => {
    try {
      const response = await api.post('/trusts/register-request', formData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to register trust' };
    }
  },

  // Upload documents for trust registration
  uploadTrustDocuments: async (requestId, documents) => {
    try {
      console.log('🔍 trustApi.uploadTrustDocuments called:');
      console.log('  - Request ID:', requestId);
      console.log('  - Documents provided:', {
        registrationCertificate: documents.registrationCertificate ? documents.registrationCertificate.name : null,
        trustDeed: documents.trustDeed ? documents.trustDeed.name : null
      });

      const formData = new FormData();
      let fileCount = 0;
      
      if (documents.registrationCertificate) {
        formData.append('registrationCertificate', documents.registrationCertificate);
        fileCount++;
        console.log('  ✅ Added registration certificate to FormData');
      }
      if (documents.trustDeed) {
        formData.append('trustDeed', documents.trustDeed);
        fileCount++;
        console.log('  ✅ Added trust deed to FormData');
      }

      if (fileCount === 0) {
        throw new Error('No files provided for upload');
      }

      const uploadUrl = `/trusts/register-request/${requestId}/documents`;
      console.log('📤 Sending POST request to:', uploadUrl);
      console.log('  - File count:', fileCount);

      const response = await api.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ Upload API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ trustApi.uploadTrustDocuments error:', error);
      throw error.response?.data || { error: 'Failed to upload documents' };
    }
  },

  // Check registration status
  checkRegistrationStatus: async (requestId) => {
    try {
      const response = await api.get(`/trusts/register-request/${requestId}/status`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to check registration status' };
    }
  },

  // Resend confirmation email
  resendConfirmation: async (requestId) => {
    try {
      const response = await api.post(`/trusts/register-request/${requestId}/resend-confirmation`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to resend confirmation' };
    }
  }
};

// Admin API functions
export const adminApi = {
  // Get all trust requests
  getTrustRequests: async () => {
    try {
      const response = await api.get('/admin/trust-requests');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch trust requests' };
    }
  },

  // Get single trust request details
  getTrustRequest: async (requestId) => {
    try {
      const response = await api.get(`/admin/trust-requests/${requestId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch trust request details' };
    }
  },

  // Approve trust request
  approveTrustRequest: async (requestId) => {
    try {
      const response = await api.post(`/admin/trust-requests/${requestId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to approve trust request' };
    }
  },

  // Reject trust request
  rejectTrustRequest: async (requestId, reason) => {
    try {
      const response = await api.post(`/admin/trust-requests/${requestId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to reject trust request' };
    }
  },

  // Get all students
  getStudents: async () => {
    try {
      const response = await api.get('/admin/students');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch students' };
    }
  },

  // Get all approved trusts
  getTrusts: async () => {
    try {
      const response = await api.get('/admin/trusts');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch trusts' };
    }
  },

  // Get issues
  getIssues: async () => {
    try {
      const response = await api.get('/admin/issues');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch issues' };
    }
  },

  // Blacklist user
  blacklistUser: async (userId, reason) => {
    try {
      const response = await api.post(`/admin/users/${userId}/blacklist`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to blacklist user' };
    }
  },

  // Unblacklist user
  unblacklistUser: async (userId, reason) => {
    try {
      const response = await api.post(`/admin/users/${userId}/unblacklist`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to unblacklist user' };
    }
  },

  // Toggle trust status (activate/deactivate)
  toggleTrustStatus: async (userId, reason) => {
    try {
      const response = await api.post(`/admin/trusts/${userId}/toggle-status`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to toggle trust status' };
    }
  },

  // Get single student details
  getStudent: async (studentId) => {
    try {
      const response = await api.get(`/admin/students/${studentId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch student details' };
    }
  },

  // Analytics methods
  getAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics/overview');
      return response;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch analytics' };
    }
  },

  getTrustCoverage: async () => {
    try {
      const response = await api.get('/admin/analytics/trust-coverage');
      return response;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch trust coverage' };
    }
  },

  getApplicationAnalytics: async () => {
    try {
      const response = await api.get('/admin/analytics/applications');
      return response;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch application analytics' };
    }
  }
};

// Student API functions
export const studentApi = {
  // Get student applications
  getApplications: async () => {
    try {
      const response = await api.get('/student/applications');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch applications' };
    }
  },

  // Get student profile
  getProfile: async () => {
    try {
      const response = await api.get('/student/profile');
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch profile' };
    }
  },

  // Create new application
  createApplication: async (applicationData) => {
    try {
      const response = await api.post('/student/applications', applicationData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to create application' };
    }
  },

  // Upload application document
  uploadApplicationDocument: async (applicationId, docType, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicationId', applicationId);
      formData.append('docType', docType);

      const response = await api.post('/uploads/application-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to upload document' };
    }
  },

  // Get application details
  getApplicationDetails: async (applicationId) => {
    try {
      const response = await api.get(`/student/applications/${applicationId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to fetch application details' };
    }
  },

  // Download application as PDF
  downloadApplicationPDF: async (applicationId) => {
    try {
      const response = await api.get(`/student/applications/${applicationId}/pdf`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `application-${applicationId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      throw error.response?.data || { error: 'Failed to download PDF' };
    }
  },

  // Download application documents as ZIP
  downloadApplicationZip: async (applicationId) => {
    try {
      const response = await api.get(`/student/applications/${applicationId}/documents/zip`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `application-${applicationId}-documents.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      throw error.response?.data || { error: 'Failed to download documents' };
    }
  },

  // View document
  viewDocument: async (documentId) => {
    try {
      // Create the document view URL with auth token
      const token = localStorage.getItem('token');
      
      // Debug logging
      console.log('🔍 viewDocument Debug:');
      console.log('  - Document ID:', documentId);
      console.log('  - Token from localStorage:', token ? `${token.substring(0, 50)}...` : 'null');
      
      if (!token) {
        alert('Authentication token not found. Please log in again.');
        return;
      }
      
      const documentUrl = `${API_BASE_URL}/student/documents/${documentId}/view?token=${encodeURIComponent(token)}`;
      console.log('  - Document URL:', documentUrl);
      
      // Open document in new tab
      const newTab = window.open(documentUrl, '_blank');
      
      if (!newTab) {
        // If popup blocked, show message to user
        alert('Popup blocked. Please allow popups for this site to view documents, or try again.');
        throw new Error('Popup blocked');
      }
      
    } catch (error) {
      console.error('Error viewing document:', error);
      throw error.response?.data || { error: 'Failed to view document' };
    }
  },

  // Confirm trust payment
  confirmTrustPayment: async (paymentId, confirmed) => {
    try {
      const response = await api.put(`/student/trust-payments/${paymentId}/confirm`, {
        confirmed: confirmed
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Failed to update confirmation' };
    }
  },

  // Download complete application package (PDF + Documents)
  downloadCompletePackage: async (applicationId) => {
    try {
      const response = await api.get(`/student/applications/${applicationId}/download-complete`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `complete-application-${applicationId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      throw error.response?.data || { error: 'Failed to download complete package' };
    }
  }
};

export { api };
