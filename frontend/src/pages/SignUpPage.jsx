import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Import all the necessary components
import Header from '../components/common/Header';
import Step1 from '../components/signup/Step1';
import Step2 from '../components/signup/Step2';
import Step3 from '../components/signup/Step3';

const SignUpPage = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    collegeEmail: '',
    password: '',
    confirmPassword: '',
    otp: '',
    fullName: '',
    contactNumber: '',
    emailAddress: '',
    dob: '',
    gender: '',
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: 'India'
    },
    kyc_doc_type: 'aadhaar',
    kyc_document: null,
    profile_picture: null,
    bank_details: {
      account_number: '',
      bank_name: '',
      ifsc: '',
      branch: ''
    }
  });

  const { registerStep1, verifyOTP, completeProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset to step 1 when component mounts
  useEffect(() => {
    setStep(1);
  }, []);

  // Proceed to the next step
  const nextStep = () => setStep((prev) => prev + 1);

  // Go back to the previous step
  const prevStep = () => setStep((prev) => prev - 1);

  // Go back to step 1 (for Back button in Step 3)
  const backToStep1 = () => setStep(1);

  // Keep your existing handleChange signature (used by Step1 / Step2)
  const handleChange = (input) => (e) => {
    if (!input) return;
    if (input.startsWith('address.')) {
      const addressField = input.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: e.target.value
        }
      }));
    } else if (input.startsWith('bank_details.')) {
      const bankField = input.split('.')[1];
      setFormData(prev => ({
        ...prev,
        bank_details: {
          ...prev.bank_details,
          [bankField]: e.target.value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [input]: e.target.value }));
    }
  };

  // Handle OTP change specifically
  const handleOtpChange = (otpValue) => {
    setFormData(prev => ({ ...prev, otp: otpValue }));
  };

  // Handle step 1 submission
  const handleStep1Submit = async () => {
    // Client-side validation
    if (!formData.collegeEmail) {
      toast.error('College email is required!');
      return;
    }

    if (!formData.password) {
      toast.error('Password is required!');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long!');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.collegeEmail)) {
      toast.error('Please enter a valid email address!');
      return;
    }

    // Check if it's a student email (optional validation)
    if (!formData.collegeEmail.includes('.edu') && !formData.collegeEmail.includes('.ac.')) {
      toast.error('Please use your college email address!');
      return;
    }

    setLoading(true);
    try {
      const result = await registerStep1(formData.collegeEmail, formData.password);
      if (result.success) {
        toast.success('Registration started! Please check your email for OTP.');
        nextStep();
      } else {
        toast.error(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle step 2 submission
  const handleStep2Submit = async () => {
    // Client-side validation
    if (!formData.otp) {
      toast.error('Please enter the OTP!');
      return;
    }

    if (formData.otp.length !== 6) {
      toast.error('OTP must be 6 digits!');
      return;
    }

    // Check if OTP contains only numbers
    const otpRegex = /^[0-9]{6}$/;
    if (!otpRegex.test(formData.otp)) {
      toast.error('OTP must contain only numbers!');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOTP(formData.collegeEmail, formData.otp);
      if (result.success) {
        toast.success('Email verified! Please complete your profile.');
        nextStep();
      } else {
        toast.error(result.error || 'OTP verification failed. Please try again.');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error('OTP verification failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // NOTE: This now accepts data from the child step (Step3). If called without argument,
  // it falls back to using parent formData (so it's backward-compatible).
  const handleStep3Submit = async (childValues) => {
    const v = childValues || formData;

    // Client-side validation (same as before but using v)
    if (!v.fullName) {
      toast.error('Full name is required!');
      return;
    }

    if (!v.contactNumber) {
      toast.error('Contact number is required!');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(v.contactNumber)) {
      toast.error('Please enter a valid 10-digit phone number!');
      return;
    }

    if (!v.dob) {
      toast.error('Date of birth is required!');
      return;
    }

    const today = new Date();
    const birthDate = new Date(v.dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 16) {
      toast.error('You must be at least 16 years old to register!');
      return;
    }

    if (!v.gender || v.gender === 'Select') {
      toast.error('Please select your gender!');
      return;
    }

    if (!v.address || !v.address.street) {
      toast.error('Street address is required!');
      return;
    }

    if (!v.address.city) {
      toast.error('City is required!');
      return;
    }

    if (!v.address.state) {
      toast.error('State is required!');
      return;
    }

    if (!v.address.zip) {
      toast.error('ZIP/Postal code is required!');
      return;
    }

    if (!v.kyc_doc_type || v.kyc_doc_type === 'Select') {
      toast.error('Please select KYC document type!');
      return;
    }

    // Bank details validation
    if (!v.bank_details.account_number) {
      toast.error('Bank account number is required!');
      return;
    }

    if (v.bank_details.account_number.length < 9) {
      toast.error('Please enter a valid bank account number!');
      return;
    }

    if (!v.bank_details.bank_name) {
      toast.error('Bank name is required!');
      return;
    }

    if (!v.bank_details.ifsc) {
      toast.error('IFSC code is required!');
      return;
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(v.bank_details.ifsc)) {
      toast.error('Please enter a valid IFSC code!');
      return;
    }

    if (!v.bank_details.branch) {
      toast.error('Bank branch is required!');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        full_name: v.fullName,
        phone_number: v.contactNumber,
        date_of_birth: v.dob,
        gender: v.gender,
        address: v.address,
        kyc_doc_type: v.kyc_doc_type,
        kyc_document: v.kyc_document,
        profile_picture: v.profile_picture,
        bank_details: v.bank_details
      };

      const result = await completeProfile(profileData);
      if (result.success) {
        toast.success('Registration completed successfully! Please login to continue.', {
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
            fontSize: '16px',
            padding: '16px',
          },
        });
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(result.error || 'Profile completion failed. Please try again.');
      }
    } catch (error) {
      console.error('Profile completion error:', error);
      toast.error('Profile completion failed. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1
            key="step1"
            nextStep={handleStep1Submit}
            handleChange={handleChange}
            values={formData}
            loading={loading}
          />
        );
      case 2:
        return (
          <Step2
            key="step2"
            nextStep={handleStep2Submit}
            prevStep={prevStep}
            handleOtpChange={handleOtpChange}
            loading={loading}
            email={formData.collegeEmail}
          />
        );
      case 3:
        return (
          <Step3
            key="step3"
            prevStep={prevStep}
            handleChange={handleChange}
            values={formData}
            onSubmit={handleStep3Submit}
            loading={loading}
          />
        );
      default:
        return <div>Sign up complete!</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className={`w-full ${step === 3 ? 'max-w-5xl' : 'max-w-md'}`}>
        {/* Home Link */}
        <div className="text-center mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-green-600 hover:text-green-700 text-sm font-medium"
          >
            ← Back to ScholarBridge Home
          </Link>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepNum ? 'bg-green-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600 mt-2 px-2">
            <span>Account</span>
            <span>Verify</span>
            <span>Profile</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignUpPage;
