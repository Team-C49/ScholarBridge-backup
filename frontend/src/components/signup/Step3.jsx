import React, { useState } from 'react';
import { api } from '../../utils/api';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CreditCard, 
  FileText, 
  Upload,
  ArrowLeft, 
  Check, 
  AlertCircle,
  Camera,
  Building
} from 'lucide-react';

// --- HELPER COMPONENTS MOVED OUTSIDE ---

// Simple input field
// By defining this component outside of Step3, it is not recreated on every render,
// which prevents it from losing focus when the parent state changes.
function InputField({ label, name, type, placeholder, icon, required, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(icon, { className: "h-5 w-5 text-gray-400" })}
          </div>
        )}
        <input
          type={type || 'text'}
          name={name}
          value={value}
          onChange={onChange(name)}
          placeholder={placeholder}
          required={required}
          className={`block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-3 border border-gray-300 
                     rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 
                     text-gray-900`}
        />
      </div>
    </div>
  );
}

// Simple select field
// This component is also moved outside to prevent re-creation on render.
function SelectField({ label, name, options, icon, required, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {React.createElement(icon, { className: "h-5 w-5 text-gray-400" })}
          </div>
        )}
        <select
          name={name}
          value={value}
          onChange={onChange(name)}
          required={required}
          className={`block w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-3 border border-gray-300 
                     rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 
                     bg-white text-gray-900 appearance-none`}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"></path>
            </svg>
        </div>
      </div>
    </div>
  );
}

// Simple file upload field
// Moved outside for the same reason as the other helper components.
function FileUploadField({ label, name, accept, icon, required, onFileSelect, isUploaded, isUploading, currentFile }) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 transition-colors hover:border-green-500">
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                <p className="text-sm text-gray-600">Uploading...</p>
              </div>
            ) : isUploaded ? (
              <div className="flex flex-col items-center space-y-2">
                <Check className="w-8 h-8 text-green-500" />
                <p className="text-sm font-medium text-green-600">File uploaded successfully</p>
                <p className="text-xs text-gray-500">{currentFile?.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                {React.createElement(icon, { className: "w-8 h-8 text-gray-400" })}
                <p className="text-sm font-medium text-gray-600">
                  Click to upload file
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF up to 5MB
                </p>
              </div>
            )}
            
            <input
              type="file"
              accept={accept}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) onFileSelect(file, name);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
          </div>
        </div>
      </div>
    );
  }
// --- MAIN COMPONENT ---

// Step 3: Complete Profile Form
const Step3 = ({ 
  handleChange,     // Function to update form data in parent component
  values,           // Current form data from parent component
  onSubmit,         // Function to submit the form
  loading,          // Whether form is being submitted
  prevStep          // Function to go back to previous step
}) => {
  // State to track file upload status for UI feedback
  const [kycUploaded, setKycUploaded] = useState(!!values.kyc_document?.uploaded);
  const [profileUploaded, setProfileUploaded] = useState(!!values.profile_picture?.uploaded);
  const [kycUploading, setKycUploading] = useState(false);
  const [profileUploading, setProfileUploading] = useState(false);

  // When user clicks submit button
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent page refresh
    onSubmit(); // Call parent's submit function
  };

  // When user uploads a file - now with real R2 upload
  const handleFileUpload = async (file, fileType) => {
    if (!file) return; // Do nothing if no file selected

    // Set uploading state
    if (fileType === 'kyc_document') {
      setKycUploading(true);
    } else if (fileType === 'profile_picture') {
      setProfileUploading(true);
    }

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Choose the right upload endpoint
      const endpoint = fileType === 'kyc_document' ? '/uploads/kyc-document' : '/uploads/profile-picture';
      
      // Upload file to R2 via backend
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Create file data with R2 information
        const fileData = {
          name: file.name,
          size: file.size,
          type: file.type,
          url: response.data.file.url,      // R2 URL
          key: response.data.file.key,      // R2 key for deletion
          documentId: response.data.file.id, // Database ID
          uploaded: true
        };

        // Send file data to parent component
        handleChange(fileType)({
          target: { value: fileData }
        });

        // Update local state to show success
        if (fileType === 'kyc_document') {
          setKycUploaded(true);
          setKycUploading(false);
        } else if (fileType === 'profile_picture') {
          setProfileUploaded(true);
          setProfileUploading(false);
        }
      }
    } catch (error) {
      console.error('File upload failed:', error);
      
      // Reset uploading state
      if (fileType === 'kyc_document') {
        setKycUploading(false);
      } else if (fileType === 'profile_picture') {
        setProfileUploading(false);
      }
      
      // Show error to user (you might want to add toast notification)
      alert('File upload failed. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
            <User className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
          <p className="text-gray-600">Fill in your details to finish registration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Personal Information Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <User className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Full Name"
                name="fullName"
                placeholder="Enter your full name"
                icon={User}
                required
                value={values.fullName || ''}
                onChange={handleChange}
              />
              <InputField
                label="Contact Number"
                name="contactNumber"
                type="tel"
                placeholder="Enter your phone number"
                icon={Phone}
                required
                value={values.contactNumber || ''}
                onChange={handleChange}
              />
              <InputField
                label="Email Address"
                name="emailAddress"
                type="email"
                placeholder="Enter your email"
                icon={Mail}
                required
                value={values.emailAddress || ''}
                onChange={handleChange}
              />
              <InputField
                label="Date of Birth"
                name="dob"
                type="date"
                icon={Calendar}
                required
                value={values.dob || ''}
                onChange={handleChange}
              />
              <SelectField
                label="Gender"
                name="gender"
                icon={User}
                required
                options={['Select Gender', 'Male', 'Female', 'Other']}
                value={values.gender || 'Select Gender'}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <MapPin className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Address Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <InputField
                  label="Street Address"
                  name="address.street"
                  placeholder="Enter your street address"
                  icon={MapPin}
                  required
                  value={values.address?.street || ''}
                  onChange={handleChange}
                />
              </div>
              <InputField
                label="City"
                name="address.city"
                placeholder="Enter your city"
                required
                value={values.address?.city || ''}
                onChange={handleChange}
              />
              <InputField
                label="State"
                name="address.state"
                placeholder="Enter your state"
                required
                value={values.address?.state || ''}
                onChange={handleChange}
              />
              <InputField
                label="ZIP Code"
                name="address.zip"
                placeholder="Enter ZIP code"
                required
                value={values.address?.zip || ''}
                onChange={handleChange}
              />
              <SelectField
                label="Country"
                name="address.country"
                options={['India', 'USA', 'UK', 'Canada', 'Australia']}
                required
                value={values.address?.country || 'India'}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* KYC Documents Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <FileText className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Identity Verification</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <SelectField
                label="KYC Document Type"
                name="kyc_doc_type"
                options={['Aadhaar Card', 'PAN Card', 'Passport', 'Driving License']}
                icon={FileText}
                required
                value={values.kyc_doc_type || 'Aadhaar Card'}
                onChange={handleChange}
              />
              <FileUploadField
                label="Upload KYC Document"
                name="kyc_document"
                accept=".pdf,.jpg,.jpeg,.png"
                icon={Upload}
                required
                onFileSelect={handleFileUpload}
                isUploaded={kycUploaded}
                isUploading={kycUploading}
                currentFile={values.kyc_document}
              />
              <div className="md:col-span-2">
                <FileUploadField
                  label="Profile Picture"
                  name="profile_picture"
                  accept=".jpg,.jpeg,.png"
                  icon={Camera}
                  onFileSelect={handleFileUpload}
                  isUploaded={profileUploaded}
                  isUploading={profileUploading}
                  currentFile={values.profile_picture}
                />
              </div>
            </div>
          </div>

          {/* Bank Details Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
              <CreditCard className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Account Number"
                name="bank_details.account_number"
                placeholder="Enter account number"
                icon={CreditCard}
                required
                value={values.bank_details?.account_number || ''}
                onChange={handleChange}
              />
              <InputField
                label="Bank Name"
                name="bank_details.bank_name"
                placeholder="Enter bank name"
                icon={Building}
                required
                value={values.bank_details?.bank_name || ''}
                onChange={handleChange}
              />
              <InputField
                label="IFSC Code"
                name="bank_details.ifsc"
                placeholder="Enter IFSC code"
                required
                value={values.bank_details?.ifsc || ''}
                onChange={handleChange}
              />
              <InputField
                label="Branch Name"
                name="bank_details.branch"
                placeholder="Enter branch name"
                required
                value={values.bank_details?.branch || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 
                         rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                         transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent 
                         rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Profile...
                </div>
              ) : (
                'Complete Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Step3;