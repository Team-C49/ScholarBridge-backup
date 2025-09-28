import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, ArrowLeft, Info } from 'lucide-react';

const TrustRegistrationPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Building2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trust/NGO Registration</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Trust and NGO registration is currently under development.
          </p>
        </motion.div>

        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/signup"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign Up
          </Link>
        </div>

        {/* Dummy Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl p-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Info className="w-10 h-10 text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Coming Soon
          </h2>
          
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Trust and NGO registration functionality is currently being developed. 
            Please check back later or contact our support team for assistance.
          </p>

          <div className="space-y-4">
            <Link
              to="/signup"
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Back to Student Registration
            </Link>
            
            <div className="text-sm text-gray-500">
              <p>For immediate assistance, please contact:</p>
              <p className="font-medium">support@scholarbridge.com</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrustRegistrationPage;