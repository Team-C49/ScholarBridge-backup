import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, User, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../../utils/api';

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const Step3 = ({ handleChange, values, onSubmit, loading, navigate, onBackToStep1 }) => {
  console.log('Step3 rendering with:', { loading, hasOnSubmit: !!onSubmit, hasNavigate: !!navigate });
  
  const [uploadStatus, setUploadStatus] = useState({
    kyc_document: { uploading: false, uploaded: false, error: null, document: null },
    profile_picture: { uploading: false, uploaded: false, error: null, document: null }
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

  const uploadDocument = async (file, docType, ownerId = 'temp', ownerType = 'student') => {
    try {
      setUploadStatus(prev => ({
        ...prev,
        [docType]: { ...prev[docType], uploading: true, error: null }
      }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('docType', docType);
      formData.append('ownerId', ownerId);
      formData.append('ownerType', ownerType);

      const response = await api.post('/uploads/document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const documentData = {
          id: response.data.document.id,
          url: response.data.document.url,
          originalName: response.data.document.originalName,
          docType: response.data.document.docType,
          description: response.data.document.description,
          createdAt: response.data.document.createdAt
        };

        // Update form data with document information
        handleChange({
          target: {
            name: docType,
            value: documentData
          }
        });

        setUploadStatus(prev => ({
          ...prev,
          [docType]: { 
            uploading: false, 
            uploaded: true, 
            error: null, 
            document: documentData
          }
        }));

        return documentData;
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Upload failed';
      
      setUploadStatus(prev => ({
        ...prev,
        [docType]: { 
          uploading: false, 
          uploaded: false, 
          error: errorMessage, 
          document: null
        }
      }));
      
      throw error;
    }
  };

  const handleFileChange = async (docType, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        setUploadStatus(prev => ({
          ...prev,
          [docType]: { 
            ...prev[docType], 
            error: 'File size must be less than 20MB',
            uploaded: false,
            document: null
          }
        }));
        return;
      }

      // Validate file type
      const allowedTypes = {
        profile_picture: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        kyc_document: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      };

      if (!allowedTypes[docType]?.includes(file.type)) {
        setUploadStatus(prev => ({
          ...prev,
          [docType]: { 
            ...prev[docType], 
            error: `Invalid file type. Allowed: ${allowedTypes[docType]?.map(t => t.split('/')[1]).join(', ')}`,
            uploaded: false,
            document: null
          }
        }));
        return;
      }

      try {
        await uploadDocument(file, docType);
      } catch (error) {
        console.error('File upload failed:', error);
      }
    }
  };

  const removeDocument = (docType) => {
    setUploadStatus(prev => ({
      ...prev,
      [docType]: { 
        uploading: false, 
        uploaded: false, 
        error: null, 
        document: null
      }
    }));

    handleChange({
      target: {
        name: docType,
        value: null
      }
    });
  };

  const handleBackToSignup = () => {
    console.log('Back button clicked - going back to Step 1');
    if (onBackToStep1) {
      onBackToStep1();
    } else {
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
          <InputField label="Full Name" name="fullName" value={values.fullName} onChange={handleChange} required />
          <InputField label="Contact Number" name="contactNumber" type="tel" value={values.contactNumber} onChange={handleChange} required />
          <InputField label="Email Address" name="emailAddress" type="email" value={values.emailAddress} onChange={handleChange} required />
          <InputField label="Date of Birth" name="dob" type="date" value={values.dob} onChange={handleChange} required />
          <SelectField label="Gender" name="gender" value={values.gender} onChange={handleChange} options={['Select', 'Male', 'Female', 'Other']} required />
        </div>

        <div className="space-y-5 mb-6">
          <InputField label="Street Address" name="address.street" value={values.address?.street || ''} onChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
            <InputField label="City" name="address.city" value={values.address?.city || ''} onChange={handleChange} />
            <InputField label="State" name="address.state" value={values.address?.state || ''} onChange={handleChange} />
            <InputField label="ZIP/Postal Code" name="address.zip" value={values.address?.zip || ''} onChange={handleChange} />
            <SelectField label="Country" name="address.country" value={values.address?.country || ''} onChange={handleChange} options={['Select', 'India', 'USA', 'Canada', 'UK']} />
          </div>
        </div>

        <h2 className="text-xl font-semibold mb-4 text-gray-800">KYC & Bank Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <SelectField 
            label="KYC Document Type" 
            name="kyc_doc_type" 
            value={values.kyc_doc_type} 
            onChange={handleChange} 
            options={['Select', 'aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']} 
            required 
          />
          <div></div>
        </div>

        {/* Document Upload Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Document Upload</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Profile Picture Upload */}
            <DocumentUploadField
              label="Profile Picture"
              docType="profile_picture"
              uploadStatus={uploadStatus.profile_picture}
              onFileChange={handleFileChange}
              onRemove={removeDocument}
              acceptTypes=".jpg,.jpeg,.png,.webp"
              description="Upload your profile picture (JPG, PNG, WebP - Max 5MB)"
              optional={true}
            />

            {/* KYC Document Upload */}
            <DocumentUploadField
              label={`${values.kyc_doc_type === 'aadhaar' ? 'Aadhaar' : values.kyc_doc_type === 'pan' ? 'PAN' : 'KYC'} Document`}
              docType="kyc_document"
              uploadStatus={uploadStatus.kyc_document}
              onFileChange={handleFileChange}
              onRemove={removeDocument}
              acceptTypes=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              description={`Upload your ${values.kyc_doc_type === 'aadhaar' ? 'Aadhaar' : values.kyc_doc_type === 'pan' ? 'PAN' : 'KYC'} document (PDF, Images, Word - Max 10MB)`}
              required={true}
            />
          </div>
        </div>

        {/* Bank Details */}
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Bank Details (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-8">
          <InputField label="Bank Name" name="bank_details.bank_name" value={values.bank_details?.bank_name || ''} onChange={handleChange} />
          <InputField label="Account Number" name="bank_details.account_number" value={values.bank_details?.account_number || ''} onChange={handleChange} />
          <InputField label="IFSC Code" name="bank_details.ifsc" value={values.bank_details?.ifsc || ''} onChange={handleChange} />
          <InputField label="Account Holder Name" name="bank_details.account_holder_name" value={values.bank_details?.account_holder_name || ''} onChange={handleChange} />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 md:justify-between">
          <button
            type="button"
            onClick={handleBackToSignup}
            className="w-full md:w-auto px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Login
          </button>
          
          <button
            type="submit"
            disabled={loading || uploadStatus.kyc_document.uploading || uploadStatus.profile_picture.uploading}
            className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              'Complete Registration'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Document Upload Field Component
const DocumentUploadField = ({ 
  label, 
  docType, 
  uploadStatus, 
  onFileChange, 
  onRemove, 
  acceptTypes,
  description,
  required = false,
  optional = false
}) => {
  return (
    <div>
      <label className="block text-gray-700 text-sm mb-2">
        {label} {required && <span className="text-red-500">*</span>} {optional && <span className="text-gray-500">(Optional)</span>}
      </label>
      
      <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
        uploadStatus.uploaded 
          ? 'border-green-500 bg-green-50' 
          : uploadStatus.error 
          ? 'border-red-500 bg-red-50' 
          : 'border-gray-300 hover:border-green-500'
      }`}>
        {uploadStatus.uploading ? (
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        ) : uploadStatus.uploaded ? (
          <div className="relative">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <button
              type="button"
              onClick={() => onRemove(docType)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              title="Remove document"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : uploadStatus.error ? (
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
        ) : (
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        )}
        
        <div className="text-sm text-gray-600 mb-3">
          {uploadStatus.uploading ? (
            'Uploading document...'
          ) : uploadStatus.uploaded ? (
            <div>
              <p className="text-green-600 font-medium">Upload successful!</p>
              <p className="text-xs text-gray-500 mt-1">{uploadStatus.document?.originalName}</p>
            </div>
          ) : uploadStatus.error ? (
            <p className="text-red-600">{uploadStatus.error}</p>
          ) : (
            <p>{description}</p>
          )}
        </div>
        
        {!uploadStatus.uploaded && (
          <>
            <input
              type="file"
              accept={acceptTypes}
              onChange={(e) => onFileChange(docType, e)}
              className="hidden"
              id={`${docType}-upload`}
              disabled={uploadStatus.uploading}
            />
            <label
              htmlFor={`${docType}-upload`}
              className={`inline-flex items-center px-4 py-2 rounded-md transition-colors cursor-pointer ${
                uploadStatus.uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadStatus.uploading ? 'Uploading...' : 'Choose File'}
            </label>
          </>
        )}
      </div>
    </div>
  );
};

// Input Field Component
const InputField = ({ label, name, type = 'text', value, onChange, required = false, ...props }) => (
  <div>
    <label className="block text-gray-700 text-sm mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
      {...props}
    />
  </div>
);

// Select Field Component
const SelectField = ({ label, name, value, onChange, options, required = false, ...props }) => (
  <div>
    <label className="block text-gray-700 text-sm mb-2">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      name={name}
      value={value || ''}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
      {...props}
    >
      {options.map(option => (
        <option key={option} value={option === 'Select' ? '' : option.toLowerCase()}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

export default Step3;