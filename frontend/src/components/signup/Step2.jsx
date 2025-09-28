import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const Step2 = ({ nextStep, handleOtpChange, loading }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputsRef = useRef([]);

  const handleChange = (e, index) => {
    const { value } = e.target;
    // Allow only single digits
    if (/^[0-9]$/.test(value) || value === '') {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);
      handleOtpChange(newOtp.join(''));

      // Move focus to the next input if a digit is entered
      if (value && index < 5) {
        inputsRef.current[index + 1].focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    // Move focus to the previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const continueStep = (e) => {
    e.preventDefault();
    // Add OTP validation here if needed
    nextStep();
  };

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.4, type: 'tween' }}
      className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-lg text-center"
    >
      <p className="text-gray-600 mb-2">Enter OTP sent on your college email</p>
      <p className="text-sm text-gray-500 mb-6">We've sent a 6-digit code to your email address</p>
      <form onSubmit={continueStep}>
        <div className="flex justify-center gap-3 md:gap-4 mb-8">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputsRef.current[index] = el)}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className="w-12 h-12 md:w-14 md:h-14 text-center text-xl border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green"
              required
            />
          ))}
        </div>
        <button
            type="submit"
            disabled={loading}
            className="bg-[#3E7C00] text-white font-semibold py-2 px-4 rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Next'}
          </button>
      </form>
    </motion.div>
  );
};

export default Step2;