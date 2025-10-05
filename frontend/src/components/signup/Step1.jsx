import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Building2, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';

/**
 * Step 1: Account Creation
 * Clean, professional design matching login page
 * Handles college email and password creation with validation
 */
const Step1 = ({ nextStep, handleChange, values, loading }) => {
  // State for password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic client-side validation
    if (!values.collegeEmail) {
      return;
    }
    
    if (!values.password || values.password.length < 6) {
      return;
    }
    
    if (values.password !== values.confirmPassword) {
      return;
    }

    // Call parent's next step handler
    nextStep();
  };

  // Password strength validation helpers
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, feedback: [] };
    
    const checks = {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    const score = Object.values(checks).filter(Boolean).length;
    const feedback = [
      { text: 'At least 6 characters', passed: checks.length },
      { text: 'One uppercase letter', passed: checks.uppercase },
      { text: 'One lowercase letter', passed: checks.lowercase },
      { text: 'One number', passed: checks.number }
    ];
    
    return { score, feedback };
  };

  const passwordStrength = getPasswordStrength(values.password);
  const passwordsMatch = values.confirmPassword && values.password === values.confirmPassword;

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <User className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Account</h2>
          <p className="text-gray-600">Join ScholarBridge to discover scholarship opportunities</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* College Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              College Email Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                name="collegeEmail"
                value={values.collegeEmail}
                onChange={handleChange('collegeEmail')}
                required
                placeholder="Enter your college email"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-green-500 focus:border-transparent 
                         transition-colors duration-200 text-gray-900"
              />
            </div>
            <p className="text-xs text-gray-500">
              Use your official college email address for verification
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={values.password}
                onChange={handleChange('password')}
                required
                placeholder="Create a strong password"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-green-500 focus:border-transparent 
                         transition-colors duration-200 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
            {/* Password Strength Indicators */}
            {values.password && (
              <div className="space-y-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                        passwordStrength.score >= level
                          ? passwordStrength.score <= 2
                            ? 'bg-red-400'
                            : passwordStrength.score === 3
                            ? 'bg-yellow-400'
                            : 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {passwordStrength.feedback.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      {item.passed ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-gray-300" />
                      )}
                      <span className={`text-xs ${item.passed ? 'text-green-600' : 'text-gray-500'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Confirm Password *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={values.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                placeholder="Confirm your password"
                className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-green-500 focus:border-transparent 
                         transition-colors duration-200 text-gray-900"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            
            {/* Password Match Indicator */}
            {values.confirmPassword && (
              <div className="flex items-center space-x-2 mt-2">
                {passwordsMatch ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !passwordsMatch || passwordStrength.score < 3}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg 
                       shadow-sm text-sm font-medium text-white bg-green-600 
                       hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 
                       focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed 
                       transition-colors duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Continue to Verification'
              )}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <span className="text-sm text-gray-600">Already have an account? </span>
            <Link
              to="/login"
              className="text-sm font-medium text-green-600 hover:text-green-500 transition-colors"
            >
              Sign in here
            </Link>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Are you a Trust/NGO? </span>
              <Link
                to="/trust-registration"
                className="text-sm font-medium text-green-600 hover:text-green-500 transition-colors"
              >
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1;