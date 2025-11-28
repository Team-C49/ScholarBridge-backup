
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticatedTrustApi } from '../utils/api';

function BackButton({ to, children }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-semibold mb-6 mt-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
      {children}
    </button>
  );
}

const TrustProfile = () => {
  const [trust, setTrust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await authenticatedTrustApi.getProfile();
        setTrust(data);
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    try {
      await authenticatedTrustApi.changePassword({ oldPassword, newPassword });
      setPasswordSuccess('Password changed successfully.');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password.');
    }
  };

  if (loading) return <div className="p-8">Loading profile...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!trust) return null;

  // Format address for display
  let addressString = '—';
  if (trust.address) {
    let addr = trust.address;
    if (typeof addr === 'string') {
      try { addr = JSON.parse(addr); } catch { /* fallback to string */ }
    }
    if (typeof addr === 'object' && addr !== null) {
      addressString = [
        addr.street,
        addr.city,
        addr.state,
        addr.country,
        addr.zipCode
      ].filter(Boolean).join(', ');
    } else if (typeof addr === 'string') {
      addressString = addr;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6fcfa] to-[#f0f6ff] py-10 px-2 flex flex-col items-center">
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold text-lg flex items-center gap-2 animate-fade-in">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Password changed successfully!
          </div>
        </div>
      )}
      <div className="w-full max-w-2xl">
        <BackButton to="/trust/dashboard">Back to Dashboard</BackButton>
        <div className="bg-white rounded-2xl shadow-2xl p-10 border border-blue-100">
          <h2 className="text-4xl font-extrabold text-center text-blue-800 mb-8 tracking-tight" style={{fontFamily:'inherit'}}>My Profile</h2>
          <div className="mb-10 space-y-5 text-lg">
            <div><span className="font-semibold text-gray-700">Trust Name:</span> <span className="text-gray-900">{trust.org_name || trust.name || '—'}</span></div>
            <div><span className="font-semibold text-gray-700">Email:</span> <span className="text-gray-900">{trust.contact_email || trust.email || '—'}</span></div>
            <div><span className="font-semibold text-gray-700">Contact:</span> <span className="text-gray-900">{trust.contact_phone || trust.contact_number || '—'}</span></div>
            <div><span className="font-semibold text-gray-700">Website:</span> <span className="text-blue-700 underline">{trust.website ? <a href={trust.website.startsWith('http') ? trust.website : `https://${trust.website}`} target="_blank" rel="noopener noreferrer">{trust.website}</a> : '—'}</span></div>
            <div><span className="font-semibold text-gray-700">Registration No.:</span> <span className="text-gray-900">{trust.registration_number || '—'}</span></div>
            <div><span className="font-semibold text-gray-700">Address:</span> <span className="text-gray-900">{addressString}</span></div>
            <div><span className="font-semibold text-gray-700">Registered On:</span> <span className="text-gray-900">{trust.created_at && new Date(trust.created_at).toLocaleDateString()}</span></div>
          </div>
          <div className="flex flex-col items-center">
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition mb-4 font-semibold"
              onClick={() => setShowChangePassword((v) => !v)}
            >
              {showChangePassword ? 'Cancel' : 'Change Password'}
            </button>
            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="w-full max-w-md bg-gray-50 p-6 rounded-lg border border-gray-200 shadow">
                <div className="mb-3">
                  <label className="block font-medium mb-1">Old Password</label>
                  <input type="password" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="block font-medium mb-1">New Password</label>
                  <input type="password" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="block font-medium mb-1">Confirm New Password</label>
                  <input type="password" className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                {passwordError && <div className="text-red-600 mb-2">{passwordError}</div>}
                {passwordSuccess && <div className="text-green-600 mb-2">{passwordSuccess}</div>}
                <button type="submit" className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">Update Password</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustProfile;
