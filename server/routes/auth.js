const express = require('express');
const { 
  addUser, 
  findUserByEmail, 
  findUserById, 
  updateUser, 
  storeOTP, 
  getOTP, 
  deleteOTP 
} = require('../config/database');
const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateOTP, 
  isValidEmail, 
  isValidPassword, 
  sanitizeInput 
} = require('../utils/auth');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Signup - Step 1: Create account
router.post('/signup', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number'
      });
    }

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user (incomplete - will be completed after OTP verification)
    const userData = {
      email: sanitizeInput(email),
      password: hashedPassword,
      isVerified: false,
      role: 'user'
    };

    const user = addUser(userData);

    // Generate and send OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    storeOTP(email, otp, expiresAt);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp);
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      // In production, you might want to handle this differently
    }

    res.json({
      success: true,
      message: 'Account created. Please check your email for OTP verification.',
      userId: user.id
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify OTP - Step 2
router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
    }

    const storedOTP = getOTP(email);
    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }

    if (new Date() > storedOTP.expiresAt) {
      deleteOTP(email);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // OTP is valid, mark user as verified
    const user = findUserByEmail(email);
    if (user) {
      updateUser(user.id, { isVerified: true });
    }

    // Delete OTP after successful verification
    deleteOTP(email);

    res.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complete signup - Step 3
router.post('/complete-signup', authLimiter, async (req, res) => {
  try {
    const { 
      email, 
      fullName, 
      contactNumber, 
      dateOfBirth, 
      gender, 
      address, 
      city, 
      state, 
      zipCode, 
      country 
    } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your email first'
      });
    }

    // Update user with complete information
    const updatedUser = updateUser(user.id, {
      fullName: sanitizeInput(fullName),
      contactNumber: sanitizeInput(contactNumber),
      dateOfBirth: sanitizeInput(dateOfBirth),
      gender: sanitizeInput(gender),
      address: sanitizeInput(address),
      city: sanitizeInput(city),
      state: sanitizeInput(state),
      zipCode: sanitizeInput(zipCode),
      country: sanitizeInput(country),
      signupCompleted: true
    });

    // Generate JWT token
    const token = generateToken({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    });

    // Send welcome email
    const emailResult = await sendWelcomeEmail(email, fullName);
    if (!emailResult.success) {
      console.error('Failed to send welcome email:', emailResult.error);
    }

    res.json({
      success: true,
      message: 'Registration completed successfully',
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.fullName,
        role: updatedUser.role
      }
    });

  } catch (error) {
    console.error('Complete signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token
router.get('/verify', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role
    }
  });
});

// Resend OTP
router.post('/resend-otp', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    storeOTP(email, otp, expiresAt);

    // Send OTP email
    const emailResult = await sendOTPEmail(email, otp);
    if (!emailResult.success) {
      console.error('Failed to send OTP email:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
