"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './app/video-simulation/auth/authContext';

export default function LandingPage() {
  const { user, login, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    feature_type: 'video_generation',
    description: '',
    plan: 'platform'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/feature-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', company: '', feature_type: 'video_generation', description: '', plan: 'platform' });
      }
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto py-4 px-6 flex justify-between items-center">
          <span className="text-lg font-semibold">dble.io</span>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-gray-600 hover:text-black">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-black">Pricing</a>
            <button onClick={() => setShowRequestForm(true)} className="text-gray-600 hover:text-black">Request</button>
          </nav>
          <div className="flex items-center gap-3">
            {mounted && isAuthenticated ? (
              <Link href="/app" className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800">
                Dashboard
              </Link>
            ) : mounted ? (
              <>
                <button onClick={login} className="text-sm text-gray-600 hover:text-black">Log In</button>
                <button onClick={login} className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800">
                  Get Started
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto py-24 px-6">
        <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-6">
          AI marketing automation that actually runs.
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-3xl leading-relaxed">
          Most marketing platforms give you software and expect you to figure it out yourself.
          We build production systems that run continuously for your business, then maintain and optimize them over time.
        </p>
        {mounted && (
          <div className="flex gap-4">
            <button onClick={() => setShowRequestForm(true)} className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800">
              Request a System
            </button>
            <a href="#pricing" className="px-6 py-3 border border-gray-300 rounded-lg hover:border-black">
              View Pricing
            </a>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-gray-200 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <p className="text-gray-600 mb-8">Think of dble as your AI marketing engineering team.</p>
          <div className="space-y-4 text-gray-700">
            <div className="flex gap-4">
              <span className="text-gray-400">1.</span>
              <p>You tell us what to automate (video production, creative testing, campaign optimization)</p>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-400">2.</span>
              <p>We build the system specifically for your products and brand</p>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-400">3.</span>
              <p>We deploy it to production and integrate with your existing tools</p>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-400">4.</span>
              <p>It runs 24/7 generating ads, testing creative, optimizing spend</p>
            </div>
            <div className="flex gap-4">
              <span className="text-gray-400">5.</span>
              <p>We continuously improve it based on performance data</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-gray-200 py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold mb-2">What every customer gets</h2>
          <p className="text-gray-600 mb-12">No locked features. The only difference is how many systems run at once.</p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-medium mb-2">AI Video Ad Generation</h3>
              <p className="text-sm text-gray-600">Automatically turns your product catalog into video ads. Brand-consistent styling, messaging, and voiceover.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">AI Image Ad Generation</h3>
              <p className="text-sm text-gray-600">Creates static ads from your product images. Dynamic text overlays with your brand fonts and colors.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Pre-Launch Creative Testing</h3>
              <p className="text-sm text-gray-600">AI predicts which ads will perform before you spend a dollar. Ranks all your ads by predicted CTR, conversion rate, and ROAS.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Live Campaign Optimization</h3>
              <p className="text-sm text-gray-600">Monitors all your campaigns 24/7. Automatically shifts budget from losers to winners.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Reinforcement Learning Engine</h3>
              <p className="text-sm text-gray-600">Gets smarter over time by learning from your results. Builds a performance history unique to your business.</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">Full Integration Suite</h3>
              <p className="text-sm text-gray-600">Shopify, Meta, TikTok, Google, Amazon, and analytics platforms.</p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <h3 className="font-medium mb-4">Everything We Handle</h3>
            <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
              <p>Custom system development for your business</p>
              <p>Technical integration with all your platforms</p>
              <p>Deployment to production infrastructure</p>
              <p>24/7 monitoring and maintenance</p>
              <p>Continuous optimization based on performance</p>
              <p>Support (slack channels, chats, and calls)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-gray-200 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-semibold mb-2">Pricing</h2>
          <p className="text-gray-600 mb-12">All customers use the same platform. You pay based on capacity.</p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Platform */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium mb-1">Platform</h3>
              <p className="text-3xl font-semibold mb-4">$3,000<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-600 mb-6">Platform access only. No builds included.</p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex gap-2"><span className="text-gray-400">-</span> Full platform access</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> No active builds</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> Monthly commitment</li>
              </ul>
              <button onClick={() => { setFormData({...formData, plan: 'platform'}); setShowRequestForm(true); }} className="w-full py-2 border border-gray-300 rounded-lg text-sm hover:border-black">
                Get Started
              </button>
            </div>

            {/* Starter */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium mb-1">Starter</h3>
              <p className="text-3xl font-semibold mb-4">$6,000<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-600 mb-6">$250K–$1M annual ad spend. 1-3 person team.</p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex gap-2"><span className="text-gray-400">-</span> Full platform access</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> 1 active build request</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> Monthly commitment</li>
              </ul>
              <button onClick={() => { setFormData({...formData, plan: 'platform'}); setShowRequestForm(true); }} className="w-full py-2 border border-gray-300 rounded-lg text-sm hover:border-black">
                Get Started
              </button>
            </div>

            {/* Team */}
            <div className="border border-black rounded-lg p-6">
              <h3 className="font-medium mb-1">Team</h3>
              <p className="text-3xl font-semibold mb-4">$10,000<span className="text-sm font-normal text-gray-500">/mo</span></p>
              <p className="text-sm text-gray-600 mb-6">$1M+ annual ad spend. 3-8 person team.</p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex gap-2"><span className="text-gray-400">-</span> Full platform access</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> 2 active build requests</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> Parallel builds</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> 3 month commitment</li>
              </ul>
              <button onClick={() => { setFormData({...formData, plan: 'team'}); setShowRequestForm(true); }} className="w-full py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800">
                Get Started
              </button>
            </div>

            {/* Enterprise */}
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-medium mb-1">Enterprise</h3>
              <p className="text-3xl font-semibold mb-4">Custom</p>
              <p className="text-sm text-gray-600 mb-6">Multi-brand. Custom builds.</p>
              <ul className="text-sm space-y-2 mb-6">
                <li className="flex gap-2"><span className="text-gray-400">-</span> Full platform access</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> 3+ active build requests</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> Parallel builds</li>
                <li className="flex gap-2"><span className="text-gray-400">-</span> Custom commitment</li>
              </ul>
              <button onClick={() => { setFormData({...formData, plan: 'enterprise'}); setShowRequestForm(true); }} className="w-full py-2 border border-gray-300 rounded-lg text-sm hover:border-black">
                Contact Us
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-8 text-center">
            $1,000/mo credits included (LLM + cloud). Additional usage billed monthly.
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section className="border-t border-gray-200 py-12 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h3 className="font-medium mb-6">Add-ons (Team & Enterprise)</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Dedicated Account Manager (FDM)</span>
              <span className="text-gray-600">+$4,000/mo</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span>Additional Build Request (FDE)</span>
              <span className="text-gray-600">+$4,000/mo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="border-t border-gray-200 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 text-sm">
            <div>
              <h3 className="font-medium mb-3">Compliance</h3>
              <p className="text-gray-600">SOC 2 Type II, GDPR + DPA, CCPA, HIPAA (available), Custom certifications</p>
            </div>
            <div>
              <h3 className="font-medium mb-3">Security</h3>
              <p className="text-gray-600">AES-256 encryption, SSO/SAML + RBAC, Dedicated infrastructure, Full audit trail</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <span className="text-sm text-gray-500">© 2025 dble.io</span>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-black">Privacy</a>
            <a href="#" className="hover:text-black">Terms</a>
          </div>
        </div>
      </footer>

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
                  <label className="block text-sm mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                  />
                </div>
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
                  <label className="block text-sm mb-1">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData({...formData, plan: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-black"
                  >
                    <option value="platform">Platform ($3,000/mo)</option>
                    <option value="starter">Starter ($6,000/mo)</option>
                    <option value="team">Team ($10,000/mo)</option>
                    <option value="enterprise">Enterprise (Custom)</option>
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
