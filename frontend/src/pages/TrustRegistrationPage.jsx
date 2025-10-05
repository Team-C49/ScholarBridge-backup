import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Upload, Mail, Phone, Globe, Calendar, MapPin, FileText, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { trustApi } from '../utils/api';

const TrustRegistrationPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Information
    orgName: '',
    registrationEmail: '',
    contactPhone: '',
    contactEmail: '',
    website: '',
    yearEstablished: '',
    
    // Address Information
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    },
    
    // Registration Details
    registrationNumber: '',
    description: '',
    
    // Documents
    registrationCertificate: null,
    trustDeed: null,
    
    // Terms and Conditions
    termsAccepted: false,
    dataProcessingConsent: false
  });

  const handleInputChange = (field) => (e) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: e.target.value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value
      }));
    }
  };

  const handleCheckboxChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.checked
    }));
  };

  const handleFileChange = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        [field]: file
      }));
      toast.success(`${file.name} uploaded successfully`);
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!formData.orgName.trim()) {
      toast.error('Organization name is required');
      return false;
    }
    
    if (!formData.registrationEmail.trim()) {
      toast.error('Registration email is required');
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.registrationEmail)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (!formData.contactPhone.trim()) {
      toast.error('Contact phone is required');
      return false;
    }
    
    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.contactPhone.replace(/\D/g, '').slice(-10))) {
      toast.error('Please enter a valid 10-digit phone number');
      return false;
    }
    
    if (!formData.registrationNumber.trim()) {
      toast.error('Registration number is required');
      return false;
    }
    
    if (!formData.yearEstablished || formData.yearEstablished < 1800 || formData.yearEstablished > new Date().getFullYear()) {
      toast.error('Please enter a valid year of establishment');
      return false;
    }
    
    // Address validation
    if (!formData.address.street.trim() || !formData.address.city.trim() || !formData.address.state.trim()) {
      toast.error('Complete address is required');
      return false;
    }
    
    if (!formData.address.zipCode.trim()) {
      toast.error('ZIP Code is required');
      return false;
    }
    
    if (!formData.address.country || formData.address.country.trim() === '') {
      toast.error('Country is required');
      return false;
    }
    
    // Document validation - Documents are now optional
    // No validation needed for documents as they are optional
    
    // Terms validation
    if (!formData.termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return false;
    }
    
    if (!formData.dataProcessingConsent) {
      toast.error('Please consent to data processing');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare registration data (excluding files) - backend expects camelCase
      const registrationData = {
        orgName: formData.orgName,
        registrationEmail: formData.registrationEmail,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        website: formData.website,
        yearEstablished: parseInt(formData.yearEstablished),
        address: formData.address,
        registrationNumber: formData.registrationNumber,
        description: formData.description
      };

      // Submit registration request
      const response = await trustApi.registerTrust(registrationData);
      
      if (response.request) {
        const requestId = response.request.id;
        toast.success('Trust registration submitted successfully!');
        
        // Upload documents if provided
        if (formData.registrationCertificate || formData.trustDeed) {
          try {
            console.log('🔍 Starting document upload process...');
            console.log('  - Request ID:', requestId);
            console.log('  - Registration Certificate:', formData.registrationCertificate?.name || 'Not provided');
            console.log('  - Trust Deed:', formData.trustDeed?.name || 'Not provided');
            
            toast.loading('Uploading documents to CloudFlare R2...', { id: 'doc-upload' });
            
            const documents = {
              registrationCertificate: formData.registrationCertificate,
              trustDeed: formData.trustDeed
            };
            
            console.log('📤 Calling trustApi.uploadTrustDocuments...');
            const uploadResponse = await trustApi.uploadTrustDocuments(requestId, documents);
            
            console.log('✅ Document upload response:', uploadResponse);
            
            if (uploadResponse.success) {
              toast.dismiss('doc-upload');
              toast.success(`Documents uploaded successfully to R2! (${uploadResponse.documentCount} files)`);
              console.log('🎉 Documents uploaded successfully to trust-documents folders');
            } else {
              toast.dismiss('doc-upload');
              toast.error('Document upload completed but with warnings');
              console.warn('Upload response missing success flag:', uploadResponse);
            }
          } catch (docError) {
            toast.dismiss('doc-upload');
            console.error('❌ Document upload failed with error:', docError);
            console.error('Error details:', {
              message: docError.message,
              response: docError.response?.data,
              status: docError.response?.status,
              url: docError.config?.url
            });
            
            if (docError.response?.status === 404) {
              toast.error('Document upload endpoint not found. Please contact support.');
            } else if (docError.response?.status === 400) {
              toast.error(`Document upload failed: ${docError.response?.data?.error || 'Invalid request'}`);
            } else {
              toast.error('Registration submitted but document upload failed. You can upload documents later through your dashboard.');
            }
          }
        } else {
          console.log('ℹ️ No documents provided for upload');
        }
        
        // Store request ID for status checking
        localStorage.setItem('trustRegistrationRequestId', requestId);
        
        // Navigate to confirmation page or login
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Trust registration submitted successfully! Check your email for updates.',
              registrationId: requestId
            }
          });
        }, 3000);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.error === 'Registration email already used') {
        toast.error('This email is already registered. Please use a different email.');
      } else if (error.details) {
        toast.error(error.details);
      } else {
        toast.error(error.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trust/NGO Registration</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Register your Trust or NGO to provide scholarships and support to students in need.
          </p>
        </motion.div>

        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Homepage
          </Link>
        </div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Building2 className="w-6 h-6 mr-2 text-green-600" />
                Basic Information
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={formData.orgName}
                    onChange={handleInputChange('orgName')}
                    required
                    placeholder="Enter your organization name"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Registration Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.registrationEmail}
                      onChange={handleInputChange('registrationEmail')}
                      required
                      placeholder="organization@example.com"
                      className="w-full bg-gray-50 p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Contact Phone *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={handleInputChange('contactPhone')}
                      required
                      placeholder="1234567890"
                      className="w-full bg-gray-50 p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Contact Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.contactEmail}
                      onChange={handleInputChange('contactEmail')}
                      placeholder="contact@example.com"
                      className="w-full bg-gray-50 p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange('website')}
                      placeholder="https://www.example.com"
                      className="w-full bg-gray-50 p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Year Established *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      value={formData.yearEstablished}
                      onChange={handleInputChange('yearEstablished')}
                      required
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="2020"
                      className="w-full bg-gray-50 p-3 pl-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <MapPin className="w-6 h-6 mr-2 text-green-600" />
                Address Information
              </h2>
              
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> All address fields including ZIP Code and Country are required for verification purposes.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={handleInputChange('address.street')}
                    required
                    placeholder="Enter complete street address"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={handleInputChange('address.city')}
                    required
                    placeholder="City"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={handleInputChange('address.state')}
                    required
                    placeholder="State"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    value={formData.address.zipCode}
                    onChange={handleInputChange('address.zipCode')}
                    required
                    placeholder="123456"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Country *
                  </label>
                  <select
                    value={formData.address.country}
                    onChange={handleInputChange('address.country')}
                    required
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select Country</option>
                    <option value="India">India</option>
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Registration Details Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-green-600" />
                Registration Details
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={handleInputChange('registrationNumber')}
                    required
                    placeholder="Enter your registration number"
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Organization Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={handleInputChange('description')}
                    rows="4"
                    placeholder="Describe your organization's mission, activities, and goals..."
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Document Upload Section */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Upload className="w-6 h-6 mr-2 text-green-600" />
                Document Upload
              </h2>
              
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Document uploads are optional but recommended. You can upload these documents now or later through your dashboard after registration approval.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Registration Certificate <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange('registrationCertificate')}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                  {formData.registrationCertificate && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {formData.registrationCertificate.name}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-2">
                    Trust Deed/MOA <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileChange('trustDeed')}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                  {formData.trustDeed && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {formData.trustDeed.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <Shield className="w-6 h-6 mr-2 text-green-600" />
                Terms and Conditions
              </h2>
              
              <div className="space-y-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={handleCheckboxChange('termsAccepted')}
                    required
                    className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the <Link to="#" className="text-green-600 hover:underline">Terms and Conditions</Link> and confirm that all information provided is accurate and truthful.
                  </span>
                </label>
                
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.dataProcessingConsent}
                    onChange={handleCheckboxChange('dataProcessingConsent')}
                    required
                    className="mt-1 w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to the processing of my personal data in accordance with the <Link to="#" className="text-green-600 hover:underline">Privacy Policy</Link>.
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link
                to="/signup"
                className="px-6 py-3 text-gray-600 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default TrustRegistrationPage;