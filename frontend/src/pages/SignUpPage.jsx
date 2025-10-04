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

  // Handle text field changes
  const handleChange = (input) => (e) => {
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
      setFormData({ ...formData, [input]: e.target.value });
    }
  };

  // Handle OTP change specifically
  const handleOtpChange = (otpValue) => {
    setFormData({ ...formData, otp: otpValue });
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

  // Handle step 3 submission
  const handleStep3Submit = async () => {
    // Client-side validation
    if (!formData.fullName) {
      toast.error('Full name is required!');
      return;
    }

    if (!formData.contactNumber) {
      toast.error('Contact number is required!');
      return;
    }

    // Phone number validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.contactNumber)) {
      toast.error('Please enter a valid 10-digit phone number!');
      return;
    }

    if (!formData.dob) {
      toast.error('Date of birth is required!');
      return;
    }

    // Age validation (must be at least 16)
    const today = new Date();
    const birthDate = new Date(formData.dob);
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 16) {
      toast.error('You must be at least 16 years old to register!');
      return;
    }

    if (!formData.gender || formData.gender === 'Select') {
      toast.error('Please select your gender!');
      return;
    }

    if (!formData.address.street) {
      toast.error('Street address is required!');
      return;
    }

    if (!formData.address.city) {
      toast.error('City is required!');
      return;
    }

    if (!formData.address.state) {
      toast.error('State is required!');
      return;
    }

    if (!formData.address.zip) {
      toast.error('ZIP/Postal code is required!');
      return;
    }

    if (!formData.kyc_doc_type || formData.kyc_doc_type === 'Select') {
      toast.error('Please select KYC document type!');
      return;
    }

    // Bank details validation
    if (!formData.bank_details.account_number) {
      toast.error('Bank account number is required!');
      return;
    }

    if (formData.bank_details.account_number.length < 9) {
      toast.error('Please enter a valid bank account number!');
      return;
    }

    if (!formData.bank_details.bank_name) {
      toast.error('Bank name is required!');
      return;
    }

    if (!formData.bank_details.ifsc) {
      toast.error('IFSC code is required!');
      return;
    }

    // IFSC code validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(formData.bank_details.ifsc)) {
      toast.error('Please enter a valid IFSC code!');
      return;
    }

    if (!formData.bank_details.branch) {
      toast.error('Bank branch is required!');
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        full_name: formData.fullName,
        phone_number: formData.contactNumber,
        date_of_birth: formData.dob,
        gender: formData.gender,
        address: formData.address,
        kyc_doc_type: formData.kyc_doc_type,
        kyc_document: formData.kyc_document,
        profile_picture: formData.profile_picture,
        bank_details: formData.bank_details
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
        // Navigate to login page after a short delay to show the success message
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
            navigate={navigate}
            onBackToStep1={backToStep1}
          />
        );
      default:
        return <div>Sign up complete!</div>;
    }
  };

  return (
    <div className="bg-[#FAF9F6] min-h-screen font-sans">
      <Header />
      <main className="flex flex-col items-center justify-start py-12 px-4">
        <h1 className="text-3xl font-bold mb-8 text-gray-700 tracking-wide">SIGN UP</h1>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
        
      </main>
    </div>
  );
};

export default SignUpPage;