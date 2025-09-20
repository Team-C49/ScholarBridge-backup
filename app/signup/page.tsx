'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    otp: '',
    fullName: '',
    contactNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signup, verifyOTP, completeSignup } = useAuth()
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return
    
    const newOTP = formData.otp.split('')
    newOTP[index] = value
    setFormData(prev => ({
      ...prev,
      otp: newOTP.join('')
    }))

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      const success = await signup(formData.email, formData.password)
      if (success) {
        setStep(2)
      } else {
        setError('Failed to create account. Please try again.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (formData.otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      setLoading(false)
      return
    }

    try {
      const success = await verifyOTP(formData.email, formData.otp)
      if (success) {
        setStep(3)
      } else {
        setError('Invalid OTP. Please try again.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userData = {
        email: formData.email,
        fullName: formData.fullName,
        contactNumber: formData.contactNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country
      }

      const success = await completeSignup(userData)
      if (success) {
        router.push('/dashboard')
      } else {
        setError('Failed to complete registration. Please try again.')
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="form-container">
        <div className="form-card">
          <h2 className="form-title">SIGN UP</h2>
          
          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {/* Step 1: Basic Account Creation */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  College Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Create Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <a href="#" className="form-link">
                  Are you a Trust/NGO?
                </a>
              </div>

              <button
                type="submit"
                className="form-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  'NEXT'
                )}
              </button>
            </form>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <form onSubmit={handleStep2}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p>Enter OTP sent on your college email</p>
              </div>

              <div className="otp-container">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={formData.otp[index] || ''}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    className="otp-input"
                    required
                  />
                ))}
              </div>

              <button
                type="submit"
                className="form-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : (
                  'NEXT'
                )}
              </button>
            </form>
          )}

          {/* Step 3: Personal Information */}
          {step === 3 && (
            <form onSubmit={handleStep3}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Personal Information</h3>
                
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contactNumber" className="form-label">Contact Number</label>
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    className="form-input"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dateOfBirth" className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender" className="form-label">Gender</label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">SELECT</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>Permanent Residential Address</h3>
                
                <div className="form-group">
                  <label htmlFor="address" className="form-label">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    rows={3}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city" className="form-label">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state" className="form-label">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode" className="form-label">ZIP/Postal Code</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country" className="form-label">Country</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="">SELECT</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="IN">India</option>
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#4CAF50', marginBottom: '1rem' }}>KYC</h3>
                <p style={{ color: '#666', fontSize: '0.9rem' }}>
                  KYC verification will be completed after registration.
                </p>
              </div>

              <button
                type="submit"
                className="form-button"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Completing Registration...
                  </>
                ) : (
                  'COMPLETE REGISTRATION'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
