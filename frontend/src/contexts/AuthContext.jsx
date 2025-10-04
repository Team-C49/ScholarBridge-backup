import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          // Verify token with backend
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Token verification failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, role } = response.data;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      
      // Set user data
      setUser({ email, role });
      
      return { success: true, role };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const registerStep1 = async (email, password) => {
    try {
      const response = await api.post('/auth/register/step1', { 
        email, 
        password
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('Registration step 1 failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await api.post('/auth/register/verify-otp', { email, otp });
      const { token: newToken } = response.data;
      
      setToken(newToken);
      localStorage.setItem('token', newToken);
      setUser({ email, role: 'student' });
      
      return { success: true, token: newToken };
    } catch (error) {
      console.error('OTP verification failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'OTP verification failed' 
      };
    }
  };

  const completeProfile = async (profileData) => {
    try {
      const response = await api.post('/auth/register/step3', profileData);
      return { success: true, profile: response.data.profile };
    } catch (error) {
      console.error('Profile completion failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Profile completion failed' 
      };
    }
  };

  const registerTrust = async (trustData) => {
    try {
      const response = await api.post('/trusts/register-request', trustData);
      return { success: true, request: response.data.request };
    } catch (error) {
      console.error('Trust registration failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Trust registration failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const hasRole = (requiredRole) => {
    return user?.role === requiredRole;
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const value = {
    user,
    token,
    loading,
    login,
    registerStep1,
    verifyOTP,
    completeProfile,
    registerTrust,
    logout,
    hasRole,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
