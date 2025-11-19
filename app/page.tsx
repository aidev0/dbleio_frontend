"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './app/auth/authContext';

export default function LandingPage() {
  const { user, login, isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering auth-dependent UI after mount
  useEffect(() => {
    // Use a timeout to avoid the setState warning
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 px-6 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">db</span>
            <span className="text-lg text-gray-300">dble.io</span>
          </div>
          <div className="flex items-center gap-4">
            {mounted && isAuthenticated ? (
              <Link
                href="/app"
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold"
              >
                Go to Dashboard
              </Link>
            ) : mounted ? (
              <>
                <button
                  onClick={login}
                  className="px-6 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all border border-white/20 font-semibold"
                >
                  Log In
                </button>
                <button
                  onClick={login}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold"
                >
                  Sign Up
                </button>
              </>
            ) : null}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto py-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-12 leading-relaxed pb-8">
              Boost Your Video Marketing CTR
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent pb-2">
                with AI Simulations & Insights.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed mt-4">
              Discover which videos your target audience prefers before you launch.
              Our AI analyzes customer personas to help you create highly relevant campaigns that drive conversions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {mounted && isAuthenticated ? (
                <Link
                  href="/app"
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                >
                  Go to Dashboard
                </Link>
              ) : mounted ? (
                <>
                  <button
                    onClick={login}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
                  >
                    Start Optimizing
                  </button>
                  <button
                    onClick={login}
                    className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white text-lg font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/20"
                  >
                    See How It Works
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-2xl border border-purple-500/20">
              <div className="text-5xl mb-4">🎥</div>
              <h3 className="text-2xl font-bold text-white mb-4">1. Upload Video Variations</h3>
              <p className="text-gray-300">
                Test multiple video concepts, messaging approaches, and creative directions side by side.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-indigo-900/50 to-indigo-800/30 rounded-2xl border border-indigo-500/20">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-white mb-4">2. AI Persona Analysis</h3>
              <p className="text-gray-300">
                Our AI evaluates how different customer personas respond to each video, revealing which resonates best with your target audience.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-2xl border border-purple-500/20">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-white mb-4">3. Launch Winning Campaigns</h3>
              <p className="text-gray-300">
                Deploy the videos that connect with your audience. Maximize relevancy, engagement, and conversions from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Drive Better Campaign Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="flex gap-4">
              <div className="text-3xl">📈</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Increase CTR & Conversions</h3>
                <p className="text-gray-300">Launch campaigns with videos proven to resonate with your target audience, driving higher click-through and conversion rates.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Maximum Relevancy</h3>
                <p className="text-gray-300">Match the right video creative to the right audience segment. Deliver content that truly connects with your customers.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">✨</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Validate Before Launch</h3>
                <p className="text-gray-300">Know what works before spending your ad budget. Eliminate guesswork and optimize for performance from the start.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-3xl">🔍</div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Deep Persona Insights</h3>
                <p className="text-gray-300">Understand how different customer segments respond to your messaging, enabling smarter creative and targeting decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Boost Your Campaign Performance?
          </h2>
          <p className="text-xl text-gray-300 mb-10">
            Stop guessing which videos will work. Start launching campaigns that convert.
          </p>
          {mounted && isAuthenticated ? (
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
            >
              Go to Dashboard
              <span>→</span>
            </Link>
          ) : mounted ? (
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-lg font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-105"
            >
              Get Started Now
              <span>→</span>
            </button>
          ) : null}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p className="mb-4">
            <span className="text-white font-semibold">dble.io</span>
          </p>
          <p className="text-sm">
            AI-Powered Video Marketing Simulation Platform
          </p>
          <p className="text-sm mt-4">
            © 2025 dble.io. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
