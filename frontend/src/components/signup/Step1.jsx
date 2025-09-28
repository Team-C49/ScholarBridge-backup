import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

const Step1 = ({ nextStep, handleChange, values, loading }) => {
  const continueStep = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.4, type: "tween" }}
      className="w-full max-w-2xl p-8 rounded-2xl bg-[#FFFFFF]"
    >
      <form onSubmit={continueStep} className="flex flex-col space-y-8">
        <div>
          <label className="block text-custom-dark-green-700 text-sm mb-2">
            College Email *
          </label>
          <input
            type="email"
            value={values.collegeEmail}
            onChange={handleChange("collegeEmail")}
            required
            placeholder="Enter your college email (e.g., student@college.edu)"
            className="w-full bg-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green border-2 border-transparent hover:border-gray-300 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Use your official college email address</p>
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-2">
            Create Password *
          </label>
          <input
            type="password"
            value={values.password}
            onChange={handleChange("password")}
            required
            minLength="6"
            placeholder="Enter a strong password (min 6 characters)"
            className="w-full bg-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green border-2 border-transparent hover:border-gray-300 transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
        </div>
        <div>
          <label className="block text-gray-700 text-sm mb-2">
            Confirm Password *
          </label>
          <input
            type="password"
            value={values.confirmPassword}
            onChange={handleChange("confirmPassword")}
            required
            placeholder="Confirm your password"
            className="w-full bg-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-custom-dark-green border-2 border-transparent hover:border-gray-300 transition-colors"
          />
          {values.password && values.confirmPassword && values.password !== values.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <div className="flex justify-between items-center pt-4">
          <Link
            to=""
            className="text-sm text-blue-600 hover:underline border-b border-dotted border-blue-600"
          >
            Are you a Trust/NGO?
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-[#3E7C00] text-white font-semibold py-2 px-4 rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Next'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

export default Step1;
