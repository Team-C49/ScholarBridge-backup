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

export { api };
