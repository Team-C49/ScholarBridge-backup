import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Calendar, MapPin, Phone, FileText, Plus, Trash2, 
  Upload, CheckCircle, AlertCircle, Building2, GraduationCap,
  Users, DollarSign, CreditCard, Eye, EyeOff 
} from 'lucide-react';
import { api, studentApi } from '../utils/api';

// Simple input field component 
function InputField({ label, type, name, value, onChange, placeholder, required, error, icon: Icon, disabled }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        />
      </div>
      {error && (
        <div className="flex items-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// Select field component
function SelectField({ label, name, value, onChange, options, required, error, icon: Icon, disabled }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        >
          <option value="">Select {label}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <div className="flex items-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

// File upload field component for application documents
function ApplicationFileUpload({ label, onFileSelect, isUploaded, isUploading, currentFile, required, error }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50 transition-colors hover:border-green-500">
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : isUploaded ? (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <p className="text-sm font-medium text-green-600">File uploaded successfully</p>
              <p className="text-xs text-gray-500">{currentFile?.name}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <Upload className="w-6 h-6 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">Click to upload file</p>
              <p className="text-xs text-gray-500">PDF, JPG, PNG up to 10MB</p>
            </div>
          )}
          
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) onFileSelect(file);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
        </div>
      </div>
      {error && (
        <div className="flex items-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

const ApplicationForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [errors, setErrors] = useState({});

  // Form data state
  const [formData, setFormData] = useState({
    // Current education details
    collegeName: '',
    currentCourseName: '',
    academicYear: new Date().getFullYear()
  });

  // Dynamic sections state
  const [educationHistory, setEducationHistory] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [currentExpenses, setCurrentExpenses] = useState([]);

  // Document upload states
  const [documentStates, setDocumentStates] = useState({});

  // Load student profile data on component mount
  useEffect(() => {
    loadStudentProfile();
  }, []);

  const loadStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/student/profile');
      if (response.data.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setErrors({ general: 'Failed to load profile data. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Education History Management
  const addEducationHistory = () => {
    setEducationHistory(prev => [...prev, {
      id: Date.now(),
      collegeName: '',
      qualification: '',
      yearOfPassing: '',
      grade: '',
      marksheetFile: null,
      marksheetUploaded: false,
      marksheetUploading: false
    }]);
  };

  const updateEducationHistory = (id, field, value) => {
    setEducationHistory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeEducationHistory = (id) => {
    setEducationHistory(prev => prev.filter(item => item.id !== id));
  };

  // Family Members Management
  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, {
      id: Date.now(),
      name: '',
      relation: '',
      age: '',
      occupation: '',
      monthlyIncome: '',
      incomeProofFile: null,
      incomeProofUploaded: false,
      incomeProofUploading: false
    }]);
  };

  const updateFamilyMember = (id, field, value) => {
    setFamilyMembers(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeFamilyMember = (id) => {
    setFamilyMembers(prev => prev.filter(item => item.id !== id));
  };

  // Current Expenses Management
  const addExpense = () => {
    setCurrentExpenses(prev => [...prev, {
      id: Date.now(),
      expenseName: '',
      amount: '',
      proofFile: null,
      proofUploaded: false,
      proofUploading: false
    }]);
  };

  const updateExpense = (id, field, value) => {
    setCurrentExpenses(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeExpense = (id) => {
    setCurrentExpenses(prev => prev.filter(item => item.id !== id));
  };

  // Document upload handling - stores files locally for later upload
  const handleDocumentUpload = async (file, section, itemId, docType) => {
    try {
      // Update uploading state
      if (section === 'education') {
        updateEducationHistory(itemId, 'marksheetUploading', true);
      } else if (section === 'family') {
        updateFamilyMember(itemId, 'incomeProofUploading', true);
      } else if (section === 'expenses') {
        updateExpense(itemId, 'proofUploading', true);
      }

      // Basic file validation
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 10MB.');
      }

      const allowedTypes = [
        'application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload PDF, Word document, or image files.');
      }
      
      // Simulate a brief delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store file for later upload (after application is created)
      if (section === 'education') {
        updateEducationHistory(itemId, 'marksheetFile', file);
        updateEducationHistory(itemId, 'marksheetUploaded', true);
        updateEducationHistory(itemId, 'marksheetUploading', false);
      } else if (section === 'family') {
        updateFamilyMember(itemId, 'incomeProofFile', file);
        updateFamilyMember(itemId, 'incomeProofUploaded', true);
        updateFamilyMember(itemId, 'incomeProofUploading', false);
      } else if (section === 'expenses') {
        updateExpense(itemId, 'proofFile', file);
        updateExpense(itemId, 'proofUploaded', true);
        updateExpense(itemId, 'proofUploading', false);
      }
      
    } catch (error) {
      console.error('File validation failed:', error);
      
      // Reset uploading state on error
      if (section === 'education') {
        updateEducationHistory(itemId, 'marksheetUploading', false);
      } else if (section === 'family') {
        updateFamilyMember(itemId, 'incomeProofUploading', false);
      } else if (section === 'expenses') {
        updateExpense(itemId, 'proofUploading', false);
      }
      
      alert(`File validation failed: ${error.message}`);
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!formData.collegeName) newErrors.collegeName = 'College name is required';
    if (!formData.currentCourseName) newErrors.currentCourseName = 'Current course name is required';
    if (!formData.academicYear) newErrors.academicYear = 'Academic year is required';
    
    // Require at least one education history entry
    if (educationHistory.length === 0) {
      newErrors.educationHistory = 'At least one education history entry is required';
    }
    
    // Validate each education history entry
    educationHistory.forEach(item => {
      if (!item.collegeName) newErrors[`education_${item.id}_collegeName`] = 'College name is required';
      if (!item.qualification) newErrors[`education_${item.id}_qualification`] = 'Qualification is required';
      if (!item.yearOfPassing) newErrors[`education_${item.id}_yearOfPassing`] = 'Year of passing is required';
      if (!item.grade) newErrors[`education_${item.id}_grade`] = 'Grade is required';
      if (!item.marksheetUploaded) newErrors[`education_${item.id}_marksheet`] = 'Marksheet is required';
    });
    
    // Require at least one family member
    if (familyMembers.length === 0) {
      newErrors.familyMembers = 'At least one family member entry is required';
    }
    
    // Validate each family member entry
    familyMembers.forEach(item => {
      if (!item.name) newErrors[`family_${item.id}_name`] = 'Name is required';
      if (!item.relation) newErrors[`family_${item.id}_relation`] = 'Relation is required';
      if (!item.age) {
        newErrors[`family_${item.id}_age`] = 'Age is required';
      } else if (parseInt(item.age) <= 0 || parseInt(item.age) > 120) {
        newErrors[`family_${item.id}_age`] = 'Age must be between 1 and 120';
      }
      if (!item.occupation) newErrors[`family_${item.id}_occupation`] = 'Occupation is required';
      if (!item.monthlyIncome) {
        newErrors[`family_${item.id}_monthlyIncome`] = 'Monthly income is required';
      } else if (parseFloat(item.monthlyIncome) < 0) {
        newErrors[`family_${item.id}_monthlyIncome`] = 'Monthly income cannot be negative';
      }
      if (!item.incomeProofUploaded) newErrors[`family_${item.id}_incomeProof`] = 'Income proof is required';
    });
    
    // Require at least one expense
    if (currentExpenses.length === 0) {
      newErrors.currentExpenses = 'At least one expense entry is required';
    }
    
    // Validate each expense entry
    currentExpenses.forEach(item => {
      if (!item.expenseName) newErrors[`expense_${item.id}_expenseName`] = 'Expense type is required';
      if (!item.amount) {
        newErrors[`expense_${item.id}_amount`] = 'Amount is required';
      } else if (parseFloat(item.amount) <= 0) {
        newErrors[`expense_${item.id}_amount`] = 'Amount must be greater than 0';
      }
      if (!item.proofUploaded) newErrors[`expense_${item.id}_proof`] = 'Expense proof is required';
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Calculate total amount requested (sum of all expenses)
      const totalAmount = currentExpenses.reduce((sum, expense) => {
        return sum + (parseFloat(expense.amount) || 0);
      }, 0);
      
      // Prepare application data (without document IDs initially)
      const applicationData = {
        academic_year: formData.academicYear,
        current_course_name: formData.currentCourseName,
        school_college_name: formData.collegeName,
        total_amount_requested: totalAmount,
        
        education_history: educationHistory.map(item => ({
          institution_name: item.collegeName,
          qualification: item.qualification,
          year_of_passing: parseInt(item.yearOfPassing),
          grade: item.grade,
          marksheet_doc_id: null // Will be populated after document upload
        })),
        
        family_members: familyMembers.map(item => ({
          name: item.name,
          relation: item.relation,
          age: item.age ? parseInt(item.age) : null,
          occupation: item.occupation,
          monthly_income: item.monthlyIncome ? parseFloat(item.monthlyIncome) : null,
          income_proof_doc_id: null // Will be populated after document upload
        })),
        
        current_expenses: currentExpenses.map(item => ({
          expense_name: item.expenseName,
          amount: parseFloat(item.amount),
          proof_doc_id: null // Will be populated after document upload
        }))
      };
      
      // Step 1: Create application first
      const response = await studentApi.createApplication(applicationData);
      const applicationId = response.application.id;
      
      console.log('Application created with ID:', applicationId);
      
      // Step 2: Upload all documents
      const documentUploads = [];
      
      // Upload education documents
      educationHistory.forEach((item, index) => {
        if (item.marksheetFile) {
          documentUploads.push({
            file: item.marksheetFile,
            docType: 'application_marksheet',
            section: 'education',
            index: index,
            itemId: item.id
          });
        }
      });
      
      // Upload family income proof documents
      familyMembers.forEach((item, index) => {
        if (item.incomeProofFile) {
          documentUploads.push({
            file: item.incomeProofFile,
            docType: 'application_income_proof',
            section: 'family',
            index: index,
            itemId: item.id
          });
        }
      });
      
      // Upload expense proof documents
      currentExpenses.forEach((item, index) => {
        if (item.proofFile) {
          documentUploads.push({
            file: item.proofFile,
            docType: 'application_expense_proof',
            section: 'expenses',
            index: index,
            itemId: item.id
          });
        }
      });
      
      // Upload all documents
      for (const upload of documentUploads) {
        try {
          console.log(`Uploading ${upload.docType} document...`);
          const documentResult = await studentApi.uploadApplicationDocument(
            applicationId,
            upload.docType,
            upload.file
          );
          
          console.log('Document uploaded:', documentResult.document);
          
          // Note: In a more sophisticated system, you would update the application
          // record with the document IDs, but for now we'll just track the uploads
          
        } catch (uploadError) {
          console.error(`Failed to upload ${upload.docType}:`, uploadError);
          // Continue with other uploads even if one fails
        }
      }
      
      alert(`Application submitted successfully! ${documentUploads.length} documents uploaded.`);
      navigate('/student/dashboard');
      
    } catch (error) {
      console.error('Application submission failed:', error);
      setErrors({ 
        general: error.response?.data?.error || error.error || 'Failed to submit application. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading application form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-blue-600 px-8 py-6">
            <h1 className="text-2xl font-bold text-white">Student Scholarship Application</h1>
            <p className="text-green-100 mt-2">Academic Year {formData.academicYear}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* General Error */}
            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-600">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Personal Information Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <User className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <span className="text-sm text-gray-500">(Auto-filled from profile)</span>
              </div>
              
              {/* Profile Picture Section */}
              {profile?.profile_picture_url && (
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile Picture"
                      className="w-24 h-24 rounded-full object-cover border-4 border-green-200"
                    />
                    <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1">
                      <User className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField
                  label="Full Name"
                  type="text"
                  name="fullName"
                  value={profile?.full_name || ''}
                  disabled={true}
                  icon={User}
                />
                
                <InputField
                  label="Email"
                  type="email"
                  name="email"
                  value={profile?.email || ''}
                  disabled={true}
                  icon={Mail}
                />
                
                <InputField
                  label="Date of Birth"
                  type="date"
                  name="dateOfBirth"
                  value={profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ''}
                  disabled={true}
                  icon={Calendar}
                />
                
                <InputField
                  label="Gender"
                  type="text"
                  name="gender"
                  value={profile?.gender || ''}
                  disabled={true}
                />
                
                <InputField
                  label="Mobile Number"
                  type="tel"
                  name="phoneNumber"
                  value={profile?.phone_number || ''}
                  disabled={true}
                  icon={Phone}
                />
                
                <div className="md:col-span-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={profile?.address ? (
                        typeof profile.address === 'string' ? profile.address : 
                        `${profile.address.street || ''}, ${profile.address.city || ''}, ${profile.address.state || ''}, ${profile.address.zipCode || ''}`
                      ) : ''}
                      disabled={true}
                      className="block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Education Details Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <GraduationCap className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Current Education Details</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <InputField
                  label="College Name"
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleInputChange}
                  placeholder="Enter college name"
                  required
                  error={errors.collegeName}
                  icon={Building2}
                />
                
                <InputField
                  label="Current Course Name"
                  type="text"
                  name="currentCourseName"
                  value={formData.currentCourseName}
                  onChange={handleInputChange}
                  placeholder="e.g., B.Tech Computer Science"
                  required
                  error={errors.currentCourseName}
                  icon={GraduationCap}
                />
                
                <InputField
                  label="Academic Year"
                  type="number"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={handleInputChange}
                  placeholder="2024"
                  required
                  error={errors.academicYear}
                  icon={Calendar}
                />
              </div>
            </div>

            {/* Education History Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Education History</h2>
                  <span className="text-sm text-gray-500">(Last 4 years minimum)</span>
                </div>
                <button
                  type="button"
                  onClick={addEducationHistory}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Education</span>
                </button>
              </div>
              
              {errors.educationHistory && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.educationHistory}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {educationHistory.map((item, index) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">Education #{index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeEducationHistory(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <InputField
                        label="College Name"
                        type="text"
                        name="collegeName"
                        value={item.collegeName}
                        onChange={(e) => updateEducationHistory(item.id, 'collegeName', e.target.value)}
                        placeholder="Enter college name"
                        required
                        error={errors[`education_${item.id}_collegeName`]}
                      />
                      
                      <InputField
                        label="Qualification"
                        type="text"
                        name="qualification"
                        value={item.qualification}
                        onChange={(e) => updateEducationHistory(item.id, 'qualification', e.target.value)}
                        placeholder="e.g., 12th Science"
                        required
                        error={errors[`education_${item.id}_qualification`]}
                      />
                      
                      <InputField
                        label="Year of Passing"
                        type="number"
                        name="yearOfPassing"
                        value={item.yearOfPassing}
                        onChange={(e) => updateEducationHistory(item.id, 'yearOfPassing', e.target.value)}
                        placeholder="2023"
                        required
                        error={errors[`education_${item.id}_yearOfPassing`]}
                      />
                      
                      <InputField
                        label="Grade/Percentage"
                        type="text"
                        name="grade"
                        value={item.grade}
                        onChange={(e) => updateEducationHistory(item.id, 'grade', e.target.value)}
                        placeholder="85% or A+ Grade"
                        required
                        error={errors[`education_${item.id}_grade`]}
                      />
                    </div>
                    
                    <ApplicationFileUpload
                      label="Upload Marksheet"
                      onFileSelect={(file) => handleDocumentUpload(file, 'education', item.id, 'marksheet')}
                      isUploaded={item.marksheetUploaded}
                      isUploading={item.marksheetUploading}
                      currentFile={item.marksheetFile}
                      required
                      error={errors[`education_${item.id}_marksheet`]}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Family Members Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
                </div>
                <button
                  type="button"
                  onClick={addFamilyMember}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Member</span>
                </button>
              </div>
              
              {errors.familyMembers && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.familyMembers}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {familyMembers.map((item, index) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">Family Member #{index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeFamilyMember(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <InputField
                        label="Name"
                        type="text"
                        name="name"
                        value={item.name}
                        onChange={(e) => updateFamilyMember(item.id, 'name', e.target.value)}
                        placeholder="Enter full name"
                        required
                        error={errors[`family_${item.id}_name`]}
                      />
                      
                      <SelectField
                        label="Relation"
                        name="relation"
                        value={item.relation}
                        onChange={(e) => updateFamilyMember(item.id, 'relation', e.target.value)}
                        options={[
                          { value: 'father', label: 'Father' },
                          { value: 'mother', label: 'Mother' },
                          { value: 'brother', label: 'Brother' },
                          { value: 'sister', label: 'Sister' },
                          { value: 'guardian', label: 'Guardian' },
                          { value: 'other', label: 'Other' }
                        ]}
                        required
                        error={errors[`family_${item.id}_relation`]}
                      />
                      
                      <InputField
                        label="Age"
                        type="number"
                        name="age"
                        value={item.age}
                        onChange={(e) => updateFamilyMember(item.id, 'age', e.target.value)}
                        placeholder="Age"
                        required
                        error={errors[`family_${item.id}_age`]}
                      />
                      
                      <InputField
                        label="Occupation"
                        type="text"
                        name="occupation"
                        value={item.occupation}
                        onChange={(e) => updateFamilyMember(item.id, 'occupation', e.target.value)}
                        placeholder="Job/Business"
                        required
                        error={errors[`family_${item.id}_occupation`]}
                      />
                      
                      <InputField
                        label="Monthly Income"
                        type="number"
                        name="monthlyIncome"
                        value={item.monthlyIncome}
                        onChange={(e) => updateFamilyMember(item.id, 'monthlyIncome', e.target.value)}
                        placeholder="Enter amount"
                        required
                        icon={DollarSign}
                        error={errors[`family_${item.id}_monthlyIncome`]}
                      />
                    </div>
                    
                    <ApplicationFileUpload
                      label="Upload Income Proof"
                      onFileSelect={(file) => handleDocumentUpload(file, 'family', item.id, 'income_proof')}
                      isUploaded={item.incomeProofUploaded}
                      isUploading={item.incomeProofUploading}
                      currentFile={item.incomeProofFile}
                      required
                      error={errors[`family_${item.id}_incomeProof`]}
                    />
                  </div>
                ))}
              </div>
              
              {/* Total Family Monthly Income Summary */}
              {familyMembers.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-green-900">Total Family Monthly Income:</span>
                    <span className="text-xl font-bold text-green-900">
                      ₹{familyMembers.reduce((sum, member) => {
                        return sum + (parseFloat(member.monthlyIncome) || 0);
                      }, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Combined monthly income of all family members listed above.
                  </p>
                </div>
              )}
            </div>

            {/* Current Expenses Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Current Expenses</h2>
                </div>
                <button
                  type="button"
                  onClick={addExpense}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Expense</span>
                </button>
              </div>
              
              {errors.currentExpenses && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-600">{errors.currentExpenses}</p>
                </div>
              )}
              
              <div className="space-y-4">
                {currentExpenses.map((item, index) => (
                  <div key={item.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-md font-medium text-gray-900">Expense #{index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeExpense(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <SelectField
                        label="Expense Type"
                        name="expenseName"
                        value={item.expenseName}
                        onChange={(e) => updateExpense(item.id, 'expenseName', e.target.value)}
                        options={[
                          { value: 'college_tuition_fee', label: 'College Tuition Fee' },
                          { value: 'hostel_fee', label: 'Hostel Fee' },
                          { value: 'books_fee', label: 'Books Fee' },
                          { value: 'transport_fee', label: 'Transport Fee' },
                          { value: 'other', label: 'Other' }
                        ]}
                        required
                        error={errors[`expense_${item.id}_expenseName`]}
                      />
                      
                      <InputField
                        label="Amount"
                        type="number"
                        name="amount"
                        value={item.amount}
                        onChange={(e) => updateExpense(item.id, 'amount', e.target.value)}
                        placeholder="Enter amount"
                        required
                        icon={DollarSign}
                        error={errors[`expense_${item.id}_amount`]}
                      />
                    </div>
                    
                    <ApplicationFileUpload
                      label="Upload Expense Proof"
                      onFileSelect={(file) => handleDocumentUpload(file, 'expenses', item.id, 'expense_proof')}
                      isUploaded={item.proofUploaded}
                      isUploading={item.proofUploading}
                      currentFile={item.proofFile}
                      required
                      error={errors[`expense_${item.id}_proof`]}
                    />
                  </div>
                ))}
              </div>
              
              {/* Total Amount Summary */}
              {currentExpenses.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium text-blue-900">Total Amount Requested:</span>
                    <span className="text-xl font-bold text-blue-900">
                      ₹{currentExpenses.reduce((sum, expense) => {
                        return sum + (parseFloat(expense.amount) || 0);
                      }, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    This is the total scholarship amount you are requesting based on your expenses.
                  </p>
                </div>
              )}
            </div>

            {/* Bank Details Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                <CreditCard className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Bank Details</h2>
                <span className="text-sm text-gray-500">(Auto-filled from profile)</span>
              </div>
              
              {profile?.bank_details_masked ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    label="Bank Name"
                    type="text"
                    name="bankName"
                    value={profile.bank_details_masked.bank_name || ''}
                    disabled={true}
                    icon={Building2}
                  />
                  
                  <InputField
                    label="Account Number"
                    type="text"
                    name="accountNumber"
                    value={profile.bank_details_masked.account_masked || ''}
                    disabled={true}
                    icon={CreditCard}
                  />
                  
                  <InputField
                    label="IFSC Code"
                    type="text"
                    name="ifscCode"
                    value={profile.bank_details_masked.ifsc || ''}
                    disabled={true}
                  />
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <p className="text-yellow-800">
                      Bank details not available. Please complete your profile setup first.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/student/dashboard')}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationForm;