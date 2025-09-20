'use client'

import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="nav-content">
        <div className="logo">LOGO</div>
        
        <ul className="nav-links">
          <li><Link href="/">Home</Link></li>
          <li><Link href="/about">About Us</Link></li>
          <li><Link href="/contributors">Contributors</Link></li>
          <li><Link href="/contact">Contact Us</Link></li>
          <li><Link href="/faqs">FAQs</Link></li>
        </ul>

        <div className="nav-buttons">
          {user ? (
            <>
              <span>Welcome {user.name}</span>
              <button onClick={logout} className="btn btn-primary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-primary">LOGIN</Link>
              <Link href="/signup" className="btn btn-primary">SIGN UP</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
