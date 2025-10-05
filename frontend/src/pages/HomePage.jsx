import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Building2, 
  Shield, 
  Users, 
  TrendingUp, 
  Award, 
  ArrowRight, 
  CheckCircle, 
  Globe, 
  Heart, 
  Target,
  BookOpen,
  DollarSign,
  Zap
} from 'lucide-react';

const HomePage = () => {
  const features = [
    {
      icon: GraduationCap,
      title: "For Students",
      description: "Access thousands of scholarship opportunities tailored to your profile and academic achievements.",
      color: "bg-blue-500"
    },
    {
      icon: Building2,
      title: "For Trusts & NGOs",
      description: "Connect with deserving students and manage your scholarship programs efficiently.",
      color: "bg-green-500"
    },
    {
      icon: Shield,
      title: "Secure & Verified",
      description: "All users are verified with KYC documents ensuring authentic and trustworthy connections.",
      color: "bg-purple-500"
    },
    {
      icon: TrendingUp,
      title: "Smart Matching",
      description: "AI-powered algorithms match students with relevant opportunities based on their profiles.",
      color: "bg-orange-500"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Students Registered", icon: Users },
    { number: "500+", label: "Trust Partners", icon: Building2 },
    { number: "₹2Cr+", label: "Scholarships Distributed", icon: DollarSign },
    { number: "95%", label: "Success Rate", icon: Award }
  ];

  const testimonials = [
    {
      name: "Priya Sharma",
      role: "Engineering Student",
      content: "ScholarBridge helped me find the perfect scholarship for my engineering studies. The process was smooth and transparent.",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b0daaa8e?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Ramesh Foundation",
      role: "Educational Trust",
      content: "We've been able to reach genuine students who truly need financial support. The platform makes scholarship management effortless.",
      avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face"
    },
    {
      name: "Amit Kumar",
      role: "Medical Student",
      content: "Thanks to ScholarBridge, I'm pursuing my dream of becoming a doctor. The financial support came at the perfect time.",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="w-8 h-8 text-green-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ScholarBridge</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#home" className="text-gray-900 hover:text-green-600 px-3 py-2 text-sm font-medium">Home</a>
                <a href="#features" className="text-gray-600 hover:text-green-600 px-3 py-2 text-sm font-medium">Features</a>
                <a href="#about" className="text-gray-600 hover:text-green-600 px-3 py-2 text-sm font-medium">About</a>
                <a href="#contact" className="text-gray-600 hover:text-green-600 px-3 py-2 text-sm font-medium">Contact</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-green-600 px-3 py-2 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              Bridge the Gap Between
              <span className="text-green-600"> Dreams & Education</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
            >
              Connect students with scholarship opportunities and help trusts find deserving candidates. 
              Building a transparent, efficient ecosystem for educational funding.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col lg:flex-row gap-6 justify-center items-center"
            >
              <div className="text-center">
                <Link
                  to="/signup"
                  className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center mb-2"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <p className="text-sm text-gray-600">For Students seeking scholarships</p>
              </div>
              <div className="text-center">
                <Link
                  to="/trust-registration"
                  className="bg-white text-green-600 border-2 border-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-50 transition-colors flex items-center justify-center mb-2"
                >
                  Partner With Us
                  <Building2 className="ml-2 w-5 h-5" />
                </Link>
                <p className="text-sm text-gray-600">For Trusts & NGOs providing scholarships</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                  <stat.icon className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Empowering Education Through Technology
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our platform brings together students, trusts, and educational institutions 
              to create a seamless scholarship ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 ${feature.color} rounded-lg mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                About ScholarBridge
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Founded with a vision to democratize access to quality education, ScholarBridge serves as a 
                bridge between deserving students and generous trusts. We believe that financial constraints 
                should never be a barrier to academic excellence.
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Transparency First</h3>
                    <p className="text-gray-600">Every transaction and process is transparent, ensuring trust between all parties.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Verified Community</h3>
                    <p className="text-gray-600">All users undergo thorough verification to maintain platform integrity.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Impact Driven</h3>
                    <p className="text-gray-600">Every scholarship distributed creates a lasting impact on a student's future.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl p-8 text-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <Globe className="w-12 h-12 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold mb-1">Pan-India</h3>
                    <p className="text-green-100">Coverage</p>
                  </div>
                  <div className="text-center">
                    <Heart className="w-12 h-12 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold mb-1">Social</h3>
                    <p className="text-green-100">Impact</p>
                  </div>
                  <div className="text-center">
                    <Target className="w-12 h-12 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold mb-1">Precise</h3>
                    <p className="text-green-100">Matching</p>
                  </div>
                  <div className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-3" />
                    <h3 className="text-2xl font-bold mb-1">Fast</h3>
                    <p className="text-green-100">Processing</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Stories of Success
            </h2>
            <p className="text-xl text-gray-600">
              Hear from students and trusts who have found success through our platform
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-lg"
              >
                <p className="text-gray-600 mb-6 italic">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Education?
          </h2>
          <p className="text-xl text-green-100 mb-8 max-w-3xl mx-auto">
            Join thousands of students and trusted organizations already making a difference
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="bg-white text-green-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <BookOpen className="mr-2 w-5 h-5" />
              Join as Student
            </Link>
            <Link
              to="/trust-registration"
              className="bg-green-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-800 transition-colors flex items-center justify-center"
            >
              <Building2 className="mr-2 w-5 h-5" />
              Partner as Trust
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <GraduationCap className="w-8 h-8 text-green-400" />
                <span className="ml-2 text-xl font-bold">ScholarBridge</span>
              </div>
              <p className="text-gray-400">
                Bridging the gap between dreams and education through technology and trust.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/signup" className="hover:text-white">For Students</Link></li>
                <li><Link to="/trust-registration" className="hover:text-white">For Trusts</Link></li>
                <li><Link to="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">LinkedIn</a></li>
                <li><a href="#" className="hover:text-white">Facebook</a></li>
                <li><a href="#" className="hover:text-white">Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ScholarBridge. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;