import React from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-[#DDEB9D] shadow-md w-full">
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/login" className="flex items-center">
            <GraduationCap className="w-10 h-10 text-green-600 mr-3" />
            <div className="text-3xl font-bold text-gray-700">ScholarBridge</div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-10 items-center text-gray-600 font-medium">
            <Link to="/login" className="hover:text-green-600 transition-colors">Home</Link>
            <Link to="/about" className="hover:text-green-600 transition-colors">About Us</Link>
            <Link to="/contributors" className="hover:text-green-600 transition-colors">Contributors</Link>
            <Link to="/contact" className="hover:text-green-600 transition-colors">Contact Us</Link>
            <Link to="/faq" className="hover:text-green-600 transition-colors">FAQs</Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex space-x-6">
            <Link 
              to="/login" 
              className="bg-white text-gray-800 px-8 py-3 rounded-lg font-semibold shadow-sm hover:bg-gray-100 transition-colors border border-gray-300"
            >
              LOGIN
            </Link>
            <Link 
              to="/signup" 
              className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold shadow-sm hover:bg-green-700 transition-colors"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;