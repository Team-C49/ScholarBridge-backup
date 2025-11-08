import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Settings, Info, Plus, X } from 'lucide-react';
import { api } from '../utils/api';

const TrustPreferencesPage = () => {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    preferred_gender: 'Any',
    preferred_courses: [],
    preferred_cities: [],
    max_family_income_lpa: '',
    min_academic_percentage: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newCity, setNewCity] = useState('');

  // Common course and city options
  const commonCourses = [
    'Computer Science Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Civil Engineering',
    'Electronics and Communication Engineering',
    'Information Technology',
    'Biotechnology',
    'Chemical Engineering',
    'Medical (MBBS)',
    'Nursing',
    'Pharmacy',
    'Physiotherapy',
    'Business Administration (MBA)',
    'Commerce',
    'Arts',
    'Science',
    'Law',
    'Architecture',
    'Design'
  ];

  const commonCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
    'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur',
    'Nagpur', 'Visakhapatnam', 'Indore', 'Thane', 'Bhopal', 'Patna',
    'Vadodara', 'Ghaziabad', 'Ludhiana', 'Coimbatore', 'Agra', 'Madurai'
  ];

  // Fetch current preferences on load
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        setLoading(true);
        const response = await api.get('/trusts/me/preferences');
        
        console.log('✅ Preferences loaded:', response.data);
        
        // Ensure arrays are properly handled
        setPreferences({
          preferred_gender: response.data.preferred_gender || 'Any',
          preferred_courses: response.data.preferred_courses || [],
          preferred_cities: response.data.preferred_cities || [],
          max_family_income_lpa: response.data.max_family_income_lpa || '',
          min_academic_percentage: response.data.min_academic_percentage || ''
        });
        
      } catch (error) {
        console.error('❌ Failed to fetch preferences:', error);
        setError('Failed to load preferences. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      // Prepare payload, removing empty values
      const payload = { ...preferences };
      if (!payload.max_family_income_lpa) delete payload.max_family_income_lpa;
      if (!payload.min_academic_percentage) delete payload.min_academic_percentage;

      console.log('💾 Saving preferences:', payload);

      await api.put('/trusts/me/preferences', payload);
      
      setSuccessMessage('Preferences saved successfully! Your dashboard will now show applications matching these criteria.');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      
    } catch (error) {
      console.error('❌ Failed to save preferences:', error);
      setError(error?.response?.data?.error || 'Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCourse = () => {
    if (newCourse.trim() && !preferences.preferred_courses.includes(newCourse.trim())) {
      setPreferences(prev => ({
        ...prev,
        preferred_courses: [...prev.preferred_courses, newCourse.trim()]
      }));
      setNewCourse('');
    }
  };

  const handleRemoveCourse = (courseToRemove) => {
    setPreferences(prev => ({
      ...prev,
      preferred_courses: prev.preferred_courses.filter(course => course !== courseToRemove)
    }));
  };

  const handleAddCity = () => {
    if (newCity.trim() && !preferences.preferred_cities.includes(newCity.trim())) {
      setPreferences(prev => ({
        ...prev,
        preferred_cities: [...prev.preferred_cities, newCity.trim()]
      }));
      setNewCity('');
    }
  };

  const handleRemoveCity = (cityToRemove) => {
    setPreferences(prev => ({
      ...prev,
      preferred_cities: prev.preferred_cities.filter(city => city !== cityToRemove)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/trust/dashboard')}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Dashboard</span>
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <Settings className="w-6 h-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">Funding Preferences</h1>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">About Smart Filtering</h3>
              <p className="text-blue-800 text-sm">
                Set your criteria here to see the most relevant applications first on your dashboard. 
                Leave fields blank to consider all applicants for that category. 
                The algorithm will calculate match scores and prioritize applications based on your preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Preferences Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 space-y-8">

            {/* Gender Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Preferred Gender <span className="text-gray-500">(35 points)</span>
              </label>
              <select
                value={preferences.preferred_gender}
                onChange={(e) => setPreferences(prev => ({ ...prev, preferred_gender: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Any">Any Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Select "Any" to consider all genders equally
              </p>
            </div>

            {/* Course Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Preferred Courses <span className="text-gray-500">(30 points)</span>
              </label>
              
              {/* Selected Courses */}
              {preferences.preferred_courses.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {preferences.preferred_courses.map((course) => (
                    <span
                      key={course}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {course}
                      <button
                        onClick={() => handleRemoveCourse(course)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Course */}
              <div className="flex space-x-2">
                <select
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a course to add...</option>
                  {commonCourses
                    .filter(course => !preferences.preferred_courses.includes(course))
                    .map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))
                  }
                </select>
                <button
                  onClick={handleAddCourse}
                  disabled={!newCourse}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to consider all courses equally
              </p>
            </div>

            {/* City Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Preferred Cities <span className="text-gray-500">(15 points)</span>
              </label>
              
              {/* Selected Cities */}
              {preferences.preferred_cities.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {preferences.preferred_cities.map((city) => (
                    <span
                      key={city}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      {city}
                      <button
                        onClick={() => handleRemoveCity(city)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add City */}
              <div className="flex space-x-2">
                <select
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a city to add...</option>
                  {commonCities
                    .filter(city => !preferences.preferred_cities.includes(city))
                    .map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))
                  }
                </select>
                <button
                  onClick={handleAddCity}
                  disabled={!newCity}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to consider all locations equally
              </p>
            </div>

            {/* Income Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Maximum Family Income (Lakhs per Annum) <span className="text-gray-500">(15 points)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={preferences.max_family_income_lpa}
                onChange={(e) => setPreferences(prev => ({ ...prev, max_family_income_lpa: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 5.0 for ₹5 lakhs per annum"
              />
              <p className="mt-1 text-sm text-gray-500">
                Only show applications from families with income below this threshold. Leave empty for no income filter.
              </p>
            </div>

            {/* Academic Merit */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Minimum Academic Percentage <span className="text-gray-500">(5 points)</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={preferences.min_academic_percentage}
                onChange={(e) => setPreferences(prev => ({ ...prev, min_academic_percentage: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 75.0 for 75%"
              />
              <p className="mt-1 text-sm text-gray-500">
                Minimum academic performance required. Leave empty for no academic filter.
              </p>
            </div>

          </div>
        </div>

        {/* Algorithm Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
          <h3 className="font-medium text-gray-900 mb-3">How the Matching Algorithm Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Scoring Breakdown:</h4>
              <ul className="space-y-1">
                <li>• Gender Match: 35 points (highest priority)</li>
                <li>• Course Match: 30 points (major gatekeeper)</li>
                <li>• Location Match: 15 points (regional focus)</li>
                <li>• Financial Need: 15 points (income threshold)</li>
                <li>• Academic Merit: 5 points (tie-breaker)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Sorting Priority:</h4>
              <ul className="space-y-1">
                <li>1. Match Score (highest first)</li>
                <li>2. Family Income (lowest first - greater need)</li>
                <li>3. Application Date (earliest first)</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrustPreferencesPage;