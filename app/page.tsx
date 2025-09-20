import Navbar from './components/Navbar'

export default function Home() {
  return (
    <div>
      <Navbar />
      <div className="form-container">
        <div className="form-card">
          <h1 className="form-title">Welcome to Auth Boilerplate</h1>
          <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
            A complete authentication system with login, signup, and OTP verification.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="/login" className="btn btn-primary">Login</a>
            <a href="/signup" className="btn btn-secondary">Sign Up</a>
          </div>
        </div>
      </div>
    </div>
  )
}
