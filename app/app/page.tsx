"use client";

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from './video-simulation/auth/authContext';

function AppHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, logout } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [formData, setFormData] = useState({
    feature_type: 'video_generation',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      const code = searchParams.get('code');
      if (!code) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/auth/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('refresh_token', data.refresh_token);
        }

        // Remove code from URL and reload to show dashboard
        window.location.href = '/app';
      } catch (err) {
        console.error('Authentication error:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/';
      }
    };

    handleAuthCallback();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: user._id,
          email: user.email,
          name: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email
        })
      });
      if (response.ok) {
        setSubmitted(true);
        setFormData({ feature_type: 'video_generation', description: '' });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (searchParams.get('code')) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <div className="text-sm text-gray-500">Completing login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto py-6 px-6 flex justify-between items-center">
          <Link href="/" className="text-xl font-semibold text-black hover:opacity-70 transition-opacity">
            dble.io
          </Link>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  {user && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                    </div>
                  )}
                  <div className="py-1">
                    <Link href="/app" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowMenu(false)}>
                      Dashboard
                    </Link>
                    <Link href="/app/video-simulation" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowMenu(false)}>
                      Video Simulation
                    </Link>
                    <button
                      onClick={() => setShowRequestForm(true)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Request New App
                    </button>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <Link href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowMenu(false)}>
                      Home
                    </Link>
                    <Link href="/#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setShowMenu(false)}>
                      Pricing
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => { logout(); setShowMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto py-16 px-6">
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Simulation */}
          <Link href="/app/video-simulation" className="block group">
            <div className="border border-gray-200 rounded-lg p-6 hover:border-black transition-colors">
              <h2 className="text-lg font-medium text-black mb-2">
                Video Simulation
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Test video campaigns with AI persona simulations
              </p>
              <span className="text-sm text-gray-400 group-hover:text-black transition-colors">
                Open →
              </span>
            </div>
          </Link>

          {/* Request New App */}
          <button onClick={() => setShowRequestForm(true)} className="block group text-left w-full">
            <div className="border border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                Request New App
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Have an idea? Submit a request
              </p>
              <span className="text-sm text-gray-400 group-hover:text-gray-600 transition-colors">
                Request →
              </span>
            </div>
          </button>
        </div>
      </main>

      {/* Request Form Modal */}
      {showRequestForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRequestForm(false)}>
          <div className="bg-white rounded-lg max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold">Request a System</h2>
              <button onClick={() => setShowRequestForm(false)} className="text-gray-400 hover:text-black text-xl">&times;</button>
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <p className="text-lg font-medium mb-2">Request Submitted</p>
                <p className="text-gray-600 text-sm mb-4">We'll be in touch within 24 hours.</p>
                <button onClick={() => { setSubmitted(false); setShowRequestForm(false); }} className="text-sm text-gray-500 hover:text-black">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">What do you want to automate?</label>
                  <select
                    value={formData.feature_type}
                    onChange={e => setFormData({...formData, feature_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    <option value="video_generation">AI Video Ad Generation</option>
                    <option value="image_generation">AI Image Ad Generation</option>
                    <option value="creative_testing">Pre-Launch Creative Testing</option>
                    <option value="campaign_optimization">Live Campaign Optimization</option>
                    <option value="full_stack">Full Stack (All of the above)</option>
                    <option value="custom">Custom / Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Tell us more (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    }>
      <AppHome />
    </Suspense>
  );
}
