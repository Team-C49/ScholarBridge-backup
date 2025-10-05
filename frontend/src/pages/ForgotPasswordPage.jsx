import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

// Simple input field component to keep code consistent with signup pages
function InputField({ label, type, name, value, onChange, placeholder, required, error, icon: Icon }) {
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
          className={`block w-full ${Icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border ${
            error ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
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

// OTP input field component
function OTPInput({ value, onChange, error, loading }) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center space-x-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            type="text"
            maxLength="1"
            value={value[index] || ''}
            onChange={(e) => {
              const newValue = value.split('');
              newValue[index] = e.target.value;
              const newOTP = newValue.join('');
              onChange(newOTP);
              
              // Auto-focus next input
              if (e.target.value && index < 5) {
                const nextInput = document.querySelector(`input[name="otp-${index + 1}"]`);
                if (nextInput) nextInput.focus();
              }
            }}
            onKeyDown={(e) => {
              // Auto-focus previous input on backspace
              if (e.key === 'Backspace' && !e.target.value && index > 0) {
                const prevInput = document.querySelector(`input[name="otp-${index - 1}"]`);
                if (prevInput) prevInput.focus();
              }
            }}
            name={`otp-${index}`}
            disabled={loading}
            className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
              error ? 'border-red-300' : 'border-gray-300'
            } ${loading ? 'bg-gray-100' : 'bg-white'}`}
          />
        ))}
      </div>
      {error && (
        <div className="flex items-center justify-center space-x-1">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  
  // State management for multi-step flow
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOTP] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Error states
  const [emailError, setEmailError] = useState('');
  const [otpError, setOTPError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Clear all errors
  const clearErrors = () => {
    setEmailError('');
    setOTPError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setGeneralError('');
  };

  // Step 1: Send OTP to email
  const handleSendOTP = async (e) => {
    e.preventDefault();
    clearErrors();
    
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    setLoading(true);
    try {
      const response = await api.forgotPassword.sendOTP(email);
      if (response.message) {
        setStep(2); // Move to OTP verification step
      }
    } catch (error) {
      setGeneralError(error.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    clearErrors();
    
    if (!otp || otp.length !== 6) {
      setOTPError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await api.forgotPassword.verifyOTP(email, otp);
      if (response.valid) {
        setStep(3); // Move to password reset step
      }
    } catch (error) {
      setOTPError(error.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    clearErrors();
    
    // Validation
    let hasError = false;
    
    if (!newPassword) {
      setPasswordError('New password is required');
      hasError = true;
    } else if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      hasError = true;
    }
    
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }
    
    if (hasError) return;

    setLoading(true);
    try {
      const response = await api.forgotPassword.resetPassword(email, otp, newPassword);
      
      if (response.message) {
        // Success! Redirect to login page
        alert('Password reset successful! Please login with your new password.');
        navigate('/login');
      }
    } catch (error) {
      setGeneralError(error.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP function
  const handleResendOTP = async () => {
    setLoading(true);
    clearErrors();
    try {
      await api.forgotPassword.sendOTP(email);
      alert('OTP sent again to your email');
      setOTP(''); // Clear current OTP
    } catch (error) {
      setGeneralError('Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 1 && 'Forgot Password'}
              {step === 2 && 'Verify OTP'}
              {step === 3 && 'Create New Password'}
            </h2>
            <p className="text-gray-600">
              {step === 1 && 'Enter your email to receive a reset code'}
              {step === 2 && 'Enter the 6-digit code sent to your email'}
              {step === 3 && 'Create your new secure password'}
            </p>
          </div>

          {/* General Error Display */}
          {generalError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-600">{generalError}</p>
              </div>
            </div>
          )}

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <InputField
                label="Email Address"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                required
                error={emailError}
                icon={Mail}
              />
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending OTP...' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  We've sent a 6-digit code to <strong>{email}</strong>
                </p>
                
                <OTPInput 
                  value={otp}
                  onChange={setOTP}
                  error={otpError}
                  loading={loading}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  Didn't receive the code? Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute inset-y-0 left-0 ml-3 w-5 h-5 text-gray-400 flex items-center pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className={`block w-full pl-10 pr-10 py-2 border ${
                        passwordError ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-red-600">{passwordError}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute inset-y-0 left-0 ml-3 w-5 h-5 text-gray-400 flex items-center pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className={`block w-full pl-10 pr-10 py-2 border ${
                        confirmPasswordError ? 'border-red-300' : 'border-gray-300'
                      } rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {confirmPasswordError && (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-red-600">{confirmPasswordError}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          {/* Back to Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center w-full text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;