import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [activeStage, setActiveStage] = React.useState(0);

  // Auto-cycle through pipeline stages
  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 5);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  const features = [
    {
      title: "For Students",
      description: "Access thousands of scholarship opportunities tailored to your profile and academic achievements.",
    },
    {
      title: "For Trusts & NGOs",
      description: "Connect with deserving students and manage your scholarship programs efficiently.",
    },
    {
      title: "Secure & Verified",
      description: "All users are verified with KYC documents ensuring authentic and trustworthy connections.",
    },
    {
      title: "Smart Matching",
      description: "AI-powered algorithms match students with relevant opportunities based on their profiles.",
    }
  ];


  return (
    <div className="min-h-screen" style={{ backgroundColor: '#fafbf8' }}>
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold" style={{ color: '#10b981', letterSpacing: '-0.5px' }}>ScholarBridge</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#home" className="text-gray-900 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Home</a>
                <a href="#features" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Features</a>
                <a href="#about" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">About</a>
                <a href="#contact" className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors">Contact</a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-700 hover:text-green-600 px-3 py-2 text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
                style={{ backgroundColor: '#10b981' }}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="py-20" style={{ backgroundColor: '#fafbf8' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="mb-6"
                style={{
                  fontSize: 'clamp(2rem, 6vw, 3rem)',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#111827',
                  letterSpacing: '-1px'
                }}
              >
                Bridge the Gap Between
                <span style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', display: 'block', marginTop: '0.2em' }}>
                  Dreams & Education
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mb-8"
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 400,
                  color: '#374151',
                  lineHeight: 1.8,
                  letterSpacing: '0.3px'
                }}
              >
                Connect students with scholarship opportunities and help trusts find deserving candidates. Building a transparent, efficient ecosystem for educational funding.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/signup"
                  className="inline-block px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 text-center"
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Start Your Journey
                </Link>
                <Link
                  to="/trust-registration"
                  className="inline-block px-8 py-4 rounded-xl text-lg font-semibold border-2 hover:shadow-lg transition-all transform hover:scale-105 text-center"
                  style={{
                    borderColor: '#10b981',
                    color: '#10b981',
                    backgroundColor: 'white'
                  }}
                >
                  Partner With Us
                </Link>
              </motion.div>
            </div>

            {/* Right: Embedded Platform Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="rounded-2xl overflow-hidden shadow-2xl border"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Dashboard Header */}
              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(5, 150, 105, 0.2)'
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.9 }}>ScholarBridge Platform</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem' }}>Live Workflow</div>
              </div>

              {/* Dashboard Content */}
              <div style={{
                padding: '1.5rem',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                {/* Active Stage Display */}
                <div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {/* Student View */}
                    <motion.div
                      key={`student-${activeStage}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg p-3"
                      style={{
                        backgroundColor: activeStage <= 2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.5rem' }}>Student</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                        {activeStage === 0 && '✓ Profile Created'}
                        {activeStage === 1 && '→ Applying...'}
                        {activeStage === 2 && '→ Submitted'}
                        {activeStage >= 3 && '✓ In Review'}
                      </div>
                    </motion.div>

                    {/* Trust View */}
                    <motion.div
                      key={`trust-${activeStage}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-lg p-3"
                      style={{
                        backgroundColor: activeStage >= 2 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500, marginBottom: '0.5rem' }}>Trust</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                        {activeStage <= 2 && 'Waiting...'}
                        {activeStage === 3 && '→ Reviewing'}
                        {activeStage === 4 && '✓ Approved'}
                      </div>
                    </motion.div>
                  </div>

                  {/* Timeline Progress */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    {[0, 1, 2, 3, 4].map((stage) => (
                      <motion.div
                        key={stage}
                        animate={{
                          scaleY: activeStage === stage ? 1.2 : 1,
                          backgroundColor: activeStage >= stage ? '#10b981' : '#e5e7eb'
                        }}
                        transition={{ duration: 0.3 }}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '2px'
                        }}
                      />
                    ))}
                  </div>

                  {/* Current Stage Info */}
                  <motion.div
                    key={`info-${activeStage}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      borderLeft: '4px solid #10b981',
                      borderRadius: '0.5rem'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                      Stage {activeStage + 1} of 5
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#111827' }}>
                      {activeStage === 0 && 'Student Registration & KYC Verification'}
                      {activeStage === 1 && 'Application Submission & Smart Matching'}
                      {activeStage === 2 && 'Trust Smart Filter Matching'}
                      {activeStage === 3 && 'Trust Review & Approval'}
                      {activeStage === 4 && 'Funds Disbursed to Student'}
                    </div>
                  </motion.div>
                </div>

                {/* Auto-play Indicator */}
                <div style={{
                  fontSize: '0.75rem',
                  color: '#9ca3af',
                  textAlign: 'center',
                  marginTop: '1rem'
                }}>
                  Auto-cycling workflow • {Math.round(((activeStage + 1) / 5) * 100)}% complete
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24" style={{ backgroundColor: '#f0fdf4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="mb-4" style={{
              fontSize: 'clamp(1.875rem, 5vw, 2.25rem)',
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.5px'
            }}>
              Empowering Education Through Technology
            </h2>
            <p style={{
              fontSize: '1.05rem',
              color: '#4b5563',
              maxWidth: '42rem',
              margin: '0 auto',
              lineHeight: 1.7
            }}>
              Our platform brings together <em>students, trusts, and educational institutions</em> 
              to create a seamless scholarship ecosystem.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-2xl p-8 hover:shadow-lg transition-all transform hover:scale-105 border border-green-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,253,250,0.6) 100%)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <h3 className="mb-3" style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: '#10b981',
                  letterSpacing: '-0.3px'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '0.95rem',
                  color: '#4b5563',
                  lineHeight: 1.6
                }}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-24" style={{ backgroundColor: '#fafbf8' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 style={{
            fontSize: 'clamp(1.875rem, 5vw, 2.25rem)',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '2rem',
            letterSpacing: '-0.5px'
          }}>
            About ScholarBridge
          </h2>
          <p style={{
            fontSize: '1.05rem',
            color: '#4b5563',
            lineHeight: 1.8,
            marginBottom: '2rem'
          }}>
            Founded with a vision to <em>democratize access to quality education</em>, ScholarBridge serves as a 
            bridge between deserving students and generous trusts. We believe that financial constraints 
            should never be a barrier to academic excellence.
          </p>
          <div className="space-y-8">
            {[
              { title: 'Transparency First', desc: 'Every transaction and process is transparent, ensuring trust between all parties.' },
              { title: 'Verified Community', desc: 'All users undergo thorough verification to maintain platform integrity.' },
              { title: 'Impact Driven', desc: 'Every scholarship distributed creates a lasting impact on a student\'s future.' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <h3 style={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: '#10b981',
                  marginBottom: '0.5rem'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  color: '#4b5563',
                  lineHeight: 1.6
                }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-24" style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 80%, white 0%, transparent 50%)',
          pointerEvents: 'none'
        }}></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 style={{
            fontSize: 'clamp(1.875rem, 5vw, 2.5rem)',
            fontWeight: 700,
            color: 'white',
            marginBottom: '1.5rem',
            letterSpacing: '-0.5px'
          }}>
            Ready to Transform Education?
          </h2>
          <p style={{
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '40rem',
            margin: '0 auto 2.5rem',
            lineHeight: 1.7
          }}>
            Join thousands of students and trusted organizations already making a difference
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-block px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105"
              style={{
                backgroundColor: 'white',
                color: '#10b981'
              }}
            >
              Join as Student
            </Link>
            <Link
              to="/trust-registration"
              className="inline-block px-8 py-4 rounded-xl text-lg font-semibold border-2 border-white hover:shadow-lg transition-all transform hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: 'white',
                backdropFilter: 'blur(10px)'
              }}
            >
              Partner as Trust
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-white py-12" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-8">
            <div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                marginBottom: '1rem',
                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                ScholarBridge
              </h3>
              <p style={{
                color: '#9ca3af',
                lineHeight: 1.7
              }}>
                Bridging the gap between dreams and education through technology and trust. Connecting students with scholarship opportunities and helping trusts find deserving candidates.
              </p>
            </div>
            <div>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                color: '#f0fdf4'
              }}>
                Quick Links
              </h3>
              <ul className="space-y-2">
                {[
                  { label: 'For Students', path: '/signup' },
                  { label: 'For Trusts', path: '/trust-registration' },
                  { label: 'Sign In', path: '/login' },
                  { label: 'Privacy Policy', path: '#' }
                ].map((link, idx) => (
                  <li key={idx}>
                    <Link
                      to={link.path}
                      style={{
                        color: '#d1d5db',
                        transition: 'color 0.3s'
                      }}
                      onMouseEnter={(e) => e.target.style.color = '#10b981'}
                      onMouseLeave={(e) => e.target.style.color = '#d1d5db'}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #374151', paddingTop: '2rem', textAlign: 'center' }}>
            <p style={{
              color: '#9ca3af'
            }}>
              &copy; 2025 ScholarBridge. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;