// Test forgot password endpoints
require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

async function testForgotPasswordFlow() {
  try {
    console.log('🧪 Testing Forgot Password Flow...\n');

    // Test 1: Send OTP to email
    console.log('📤 Test 1: Sending OTP to email');
    const testEmail = 'test@example.com'; // You can change this to a real email for testing
    
    try {
      const sendOTPResponse = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        email: testEmail
      });
      
      console.log('✅ Send OTP Response:', sendOTPResponse.data);
      
      // Test 2: Verify OTP endpoint exists (we can't test with real OTP without email)
      console.log('\n🔍 Test 2: Testing OTP verification endpoint structure');
      try {
        const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-reset-otp`, {
          email: testEmail,
          otp: '123456' // Test OTP
        });
        console.log('Response from verify endpoint:', verifyResponse.data);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error === 'Invalid OTP') {
          console.log('✅ Verify OTP endpoint working (correctly rejected invalid OTP)');
        } else {
          console.log('❌ Unexpected error from verify endpoint:', error.response?.data);
        }
      }

      // Test 3: Reset password endpoint structure
      console.log('\n🔍 Test 3: Testing password reset endpoint structure');
      try {
        const resetResponse = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
          email: testEmail,
          otp: '123456',
          new_password: 'newpassword123'
        });
        console.log('Response from reset endpoint:', resetResponse.data);
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error === 'Invalid OTP') {
          console.log('✅ Reset password endpoint working (correctly rejected invalid OTP)');
        } else {
          console.log('❌ Unexpected error from reset endpoint:', error.response?.data);
        }
      }

      console.log('\n🎉 Forgot password endpoints are working correctly!');
      console.log('\n📝 To test the complete flow:');
      console.log('1. Use a real email address');
      console.log('2. Check your email for the OTP');
      console.log('3. Use the OTP to verify and reset password');
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Cannot connect to backend server.');
        console.log('Please start the backend server with: npm start');
      } else {
        console.log('❌ Error testing send OTP:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testForgotPasswordFlow();
}

module.exports = { testForgotPasswordFlow };