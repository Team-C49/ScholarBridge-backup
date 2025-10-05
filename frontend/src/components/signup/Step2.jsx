import React, { useState, useRef, useEffect } from 'react';
import { Mail, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

/**
 * Step 2: Email Verification (OTP)
 * Clean, professional OTP input with auto-focus and validation
 * Matches login page styling with proper spacing
 */
const Step2 = ({ 
  nextStep, 
  prevStep, 
  handleOtpChange, 
  loading, 
  email = "your email" 
}) => {
  // OTP state - array of 6 digits
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Refs for OTP inputs
  const inputRefs = useRef([]);

  // Timer effect for resend countdown
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle OTP input change
  const handleOtpInputChange = (index, value) => {
    // Only allow single digits
    if (!/^[0-9]?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Update parent component
    handleOtpChange(newOtp.join(''));

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    handleOtpChange(newOtp.join(''));

    // Focus last filled input or next empty one
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      return;
    }
    
    nextStep();
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return;
    
    setResendLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setResendTimer(60); // 60 second cooldown
    } catch (error) {
      console.error('Resend failed:', error);
    } finally {
      setResendLoading(false);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-lg inline-block">
            {email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* OTP Input */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 text-center">
              Enter Verification Code
            </label>
            
            <div className="flex justify-center space-x-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-xl font-semibold border-2 border-gray-300 
                           rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 
                           transition-all duration-200 outline-none"
                  placeholder="0"
                />
              ))}
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-4">
                Please check your email and enter the code above
              </p>
              
              {/* Resend OTP */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || resendLoading}
                  className="inline-flex items-center space-x-1 text-sm font-medium text-green-600 
                           hover:text-green-500 disabled:text-gray-400 disabled:cursor-not-allowed 
                           transition-colors duration-200"
                >
                  {resendLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                      <span>Sending...</span>
                    </>
                  ) : resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                  ) : (
                    <>
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-gray-300 
                       rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                       transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
            
            <button
              type="submit"
              disabled={loading || !isOtpComplete}
              className="flex-1 flex items-center justify-center px-4 py-3 border border-transparent 
                       rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Having trouble?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your spam/junk folder</li>
                  <li>Make sure you entered the correct email</li>
                  <li>Try resending the code if it expires</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step2;