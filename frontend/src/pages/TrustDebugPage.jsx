import React, { useState, useEffect } from 'react';
import { authenticatedTrustApi } from '../utils/api';

const TrustDebugPage = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthenticationState();
  }, []);

  const checkAuthenticationState = async () => {
    const debug = {};
    
    try {
      // Check localStorage token
      const token = localStorage.getItem('token');
      debug.hasToken = !!token;
      debug.tokenPreview = token ? `${token.substring(0, 50)}...` : 'null';
      
      // Try to decode JWT to check user info
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          debug.tokenPayload = payload;
          debug.userRole = payload.role;
          debug.userId = payload.id;
          debug.userEmail = payload.email;
          debug.tokenExpiry = new Date(payload.exp * 1000).toLocaleString();
          debug.isExpired = Date.now() >= (payload.exp * 1000);
        } catch (e) {
          debug.tokenDecodeError = e.message;
        }
      }
      
      // Test API call to get preferences (should work if authenticated)
      try {
        console.log('🔍 Testing getPreferences API call...');
        const preferences = await authenticatedTrustApi.getPreferences();
        debug.preferencesApiWorking = true;
        debug.preferences = preferences;
      } catch (error) {
        debug.preferencesApiWorking = false;
        debug.preferencesApiError = error.message;
      }
      
      // Test API call to get dashboard applications
      try {
        console.log('🔍 Testing getDashboardApplications API call...');
        const applications = await authenticatedTrustApi.getDashboardApplications();
        debug.dashboardApiWorking = true;
        debug.applicationsCount = applications?.length || 0;
        debug.applications = applications;
      } catch (error) {
        debug.dashboardApiWorking = false;
        debug.dashboardApiError = error.message;
        debug.dashboardApiResponse = error.response?.data;
        debug.dashboardApiStatus = error.response?.status;
      }
      
    } catch (error) {
      debug.generalError = error.message;
    }
    
    setDebugInfo(debug);
    setLoading(false);
  };

  const forceLogin = () => {
    // Clear existing token and redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const retestAPIs = () => {
    setLoading(true);
    checkAuthenticationState();
  };

  if (loading) {
    return <div className="p-6">Loading debug information...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🐛 Trust Authentication Debug</h1>
      
      <div className="space-y-6">
        {/* Token Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">🔐 Token Information</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>Has Token: <span className={debugInfo.hasToken ? 'text-green-600' : 'text-red-600'}>{debugInfo.hasToken ? '✅ Yes' : '❌ No'}</span></div>
            {debugInfo.hasToken && (
              <>
                <div>Token Preview: {debugInfo.tokenPreview}</div>
                <div>User Role: <span className={debugInfo.userRole === 'trust' ? 'text-green-600' : 'text-red-600'}>{debugInfo.userRole}</span></div>
                <div>User ID: {debugInfo.userId}</div>
                <div>User Email: {debugInfo.userEmail}</div>
                <div>Token Expiry: {debugInfo.tokenExpiry}</div>
                <div>Is Expired: <span className={debugInfo.isExpired ? 'text-red-600' : 'text-green-600'}>{debugInfo.isExpired ? '❌ Yes' : '✅ No'}</span></div>
              </>
            )}
          </div>
        </div>

        {/* API Test Results */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">🔄 API Test Results</h2>
          
          <div className="space-y-3">
            <div>
              <strong>Preferences API:</strong> 
              <span className={debugInfo.preferencesApiWorking ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                {debugInfo.preferencesApiWorking ? '✅ Working' : '❌ Failed'}
              </span>
              {!debugInfo.preferencesApiWorking && (
                <div className="text-sm text-red-600 mt-1">Error: {debugInfo.preferencesApiError}</div>
              )}
            </div>
            
            <div>
              <strong>Dashboard API:</strong>
              <span className={debugInfo.dashboardApiWorking ? 'text-green-600 ml-2' : 'text-red-600 ml-2'}>
                {debugInfo.dashboardApiWorking ? '✅ Working' : '❌ Failed'}
              </span>
              {debugInfo.dashboardApiWorking && (
                <div className="text-sm text-green-600 mt-1">Applications found: {debugInfo.applicationsCount}</div>
              )}
              {!debugInfo.dashboardApiWorking && (
                <div className="text-sm text-red-600 mt-1">
                  <div>Status: {debugInfo.dashboardApiStatus}</div>
                  <div>Error: {debugInfo.dashboardApiError}</div>
                  {debugInfo.dashboardApiResponse && (
                    <div>Response: {JSON.stringify(debugInfo.dashboardApiResponse)}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Raw Debug Data */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">📄 Raw Debug Data</h2>
          <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-96">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button 
            onClick={retestAPIs}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            🔄 Retest APIs
          </button>
          <button 
            onClick={forceLogin}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            🚪 Force Logout & Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrustDebugPage;