import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, User, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const Step3 = ({ handleChange, values, onSubmit, loading, navigate, onBackToStep1 }) => {
  console.log('Step3 rendering with:', { loading, hasOnSubmit: !!onSubmit, hasNavigate: !!navigate });
  
  const [uploadStatus, setUploadStatus] = useState({
    kyc_document: { uploading: false, uploaded: false, error: null, url: null },
    profile_picture: { uploading: false, uploaded: false, error: null, url: null }
  });

  const submitForm = (e) => {
    e.preventDefault();
    console.log('Submit button clicked!', { loading, hasOnSubmit: !!onSubmit, values });
    if (onSubmit) {
      onSubmit();
    } else {
      console.error('onSubmit function is not provided!');
    }
  };

  const uploadFile = async (file, fileType) => {
    try {
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: { ...prev[fileType], uploading: true, error: null }
      }));

      const formData = new FormData();
      formData.append('file', file);

      const endpoint = fileType === 'profile_picture' ? '/uploads/profile-picture' : '/uploads/kyc-document';
      
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          url: response.data.file.url,
          key: response.data.file.key,
          uploaded: true
        };

        // Update form data with file information including URL
        handleChange({
          target: {
            name: fileType,
            value: fileData
          }
        });

        setUploadStatus(prev => ({
          ...prev,
          [fileType]: { 
            uploading: false, 
            uploaded: true, 
            error: null, 
            url: response.data.file.url 
          }
        }));

        return response.data.file;
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed';
      
      setUploadStatus(prev => ({
        ...prev,
        [fileType]: { 
          uploading: false, 
          uploaded: false, 
          error: errorMessage, 
          url: null 
        }
      }));
      
      throw error;
    }
  };

  const handleFileChange = async (field, e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        await uploadFile(file, field);
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }
  };

  const handleBackToSignup = () => {
    console.log('Back button clicked - going back to Step 1');
    if (onBackToStep1) {
      onBackToStep1();
    } else {
      // Fallback to browser back
      window.history.back();
    }
  };

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.4, type: 'tween' }}
      className="bg-white p-8 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl"
    >
      <form onSubmit={submitForm}>
        <h2 className="text-xl font-semibold mb-6 text-gray-800">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <InputField label="Full Name" name="fullName" value={values.fullName} onChange={handleChange} />
          <InputField label="Contact Number" name="contactNumber" type="tel" value={values.contactNumber} onChange={handleChange} />
          <InputField label="Email Address" name="emailAddress" type="email" value={values.emailAddress} onChange={handleChange} />
          <InputField label="Date of Birth" name="dob" type="date" value={values.dob} onChange={handleChange} />
          <SelectField label="Gender" name="gender" value={values.gender} onChange={handleChange} options={['Select', 'Male', 'Female', 'Other']} />
        </div>

        <div className="space-y-5 mb-6">
          <InputField label="Street Address" name="address.street" value={values.address.street} onChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
            <InputField label="City" name="address.city" value={values.address.city} onChange={handleChange} />
            <InputField label="State" name="address.state" value={values.address.state} onChange={handleChange} />
            <InputField label="ZIP/Postal Code" name="address.zip" value={values.address.zip} onChange={handleChange} />
            <SelectField label="Country" name="address.country" value={values.address.country} onChange={handleChange} options={['Select', 'India', 'USA', 'Canada', 'UK']} />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">KYC & Bank Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <SelectField label="KYC Document Type" name="kyc_doc_type" value={values.kyc_doc_type} onChange={handleChange} options={['Select', 'aadhaar', 'pan']} />
          <div></div>
        </div>

        {/* File Upload Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Document Upload</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KYC Document Upload */}
            <div>
              <label className="block text-gray-700 text-sm mb-2">
                Upload Document *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadStatus.kyc_document.uploaded 
                  ? 'border-green-500 bg-green-50' 
                  : uploadStatus.kyc_document.error 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300 hover:border-green-500'
              }`}>
                {uploadStatus.kyc_document.uploading ? (
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                ) : uploadStatus.kyc_document.uploaded ? (
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                ) : uploadStatus.kyc_document.error ? (
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                ) : (
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                )}
                
                <p className="text-sm text-gray-600 mb-3">
                  {uploadStatus.kyc_document.uploading 
                    ? 'Uploading...' 
                    : uploadStatus.kyc_document.uploaded
                    ? 'Document uploaded successfully'
                    : `Upload your ${values.kyc_doc_type === 'aadhaar' ? 'Aadhaar' : values.kyc_doc_type === 'pan' ? 'PAN' : 'KYC'} document`
                  }
                </p>
                
                {!uploadStatus.kyc_document.uploaded && (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('kyc_document', e)}
                      className="hidden"
                      id="kyc-upload"
                      disabled={uploadStatus.kyc_document.uploading}
                    />
                    <label
                      htmlFor="kyc-upload"
                      className={`inline-flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${
                        uploadStatus.kyc_document.uploading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadStatus.kyc_document.uploading ? 'Uploading...' : 'Select File'}
                    </label>
                  </>
                )}
                
                {uploadStatus.kyc_document.error && (
                  <p className="text-xs text-red-600 mt-2">
                    Error: {uploadStatus.kyc_document.error}
                  </p>
                )}
                
                {values.kyc_document && (
                  <p className="text-xs text-green-600 mt-2">
                    Selected: {values.kyc_document.name}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Picture Upload */}
            <div>
              <label className="block text-gray-700 text-sm mb-2">
                Profile Picture *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                uploadStatus.profile_picture.uploaded 
                  ? 'border-green-500 bg-green-50' 
                  : uploadStatus.profile_picture.error 
                  ? 'border-red-500 bg-red-50' 
                  : 'border-gray-300 hover:border-green-500'
              }`}>
                {uploadStatus.profile_picture.uploading ? (
                  <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                ) : uploadStatus.profile_picture.uploaded ? (
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                ) : uploadStatus.profile_picture.error ? (
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                ) : (
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                )}
                
                <p className="text-sm text-gray-600 mb-3">
                  {uploadStatus.profile_picture.uploading 
                    ? 'Uploading...' 
                    : uploadStatus.profile_picture.uploaded
                    ? 'Profile picture uploaded successfully'
                    : 'Upload your profile picture'
                  }
                </p>
                
                {!uploadStatus.profile_picture.uploaded && (
                  <>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('profile_picture', e)}
                      className="hidden"
                      id="profile-upload"
                      disabled={uploadStatus.profile_picture.uploading}
                    />
                    <label
                      htmlFor="profile-upload"
                      className={`inline-flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${
                        uploadStatus.profile_picture.uploading
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadStatus.profile_picture.uploading ? 'Uploading...' : 'Select File'}
                    </label>
                  </>
                )}
                
                {uploadStatus.profile_picture.error && (
                  <p className="text-xs text-red-600 mt-2">
                    Error: {uploadStatus.profile_picture.error}
                  </p>
                )}
                
                {values.profile_picture && (
                  <p className="text-xs text-green-600 mt-2">
                    Selected: {values.profile_picture.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 text-gray-700">Bank Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <InputField label="Account Number" name="bank_details.account_number" value={values.bank_details.account_number} onChange={handleChange} />
          <InputField label="Bank Name" name="bank_details.bank_name" value={values.bank_details.bank_name} onChange={handleChange} />
          <InputField label="IFSC Code" name="bank_details.ifsc" value={values.bank_details.ifsc} onChange={handleChange} />
          <InputField label="Branch" name="bank_details.branch" value={values.bank_details.branch} onChange={handleChange} />
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 bg-gray-50 p-4 rounded-lg">
          <button 
            type="button"
            onClick={handleBackToSignup}
            className="bg-gray-500 text-white font-bold py-3 px-8 rounded-md hover:bg-gray-600 transition-colors shadow-md min-w-[120px]"
          >
            Back
          </button>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-green-600 text-white font-bold py-3 px-12 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors shadow-md min-w-[140px]"
          >
            {loading ? 'Submitting...' : 'Sign Up'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Helper components to keep the form clean
const InputField = ({ label, name, type = 'text', value, onChange }) => (
  <div>
    <label className="block text-gray-700 text-sm mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange(name)}
      required
      className="w-full bg-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green"
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, options }) => (
  <div>
    <label className="block text-gray-700 text-sm mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange(name)}
      required
      className="w-full bg-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green appearance-none"
    >
      {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export default Step3;