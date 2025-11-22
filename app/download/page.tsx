'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Apple, Monitor, Globe, CheckCircle, ArrowRight } from 'lucide-react';
import MeshFlowLogo from '@/components/MeshFlowLogo';
import Footer from '@/components/Footer';

export default function DownloadPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'mac' | 'windows' | 'web'>('web');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navbar */}
      <nav className="py-6 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <MeshFlowLogo variant="light" size="md" href="/" />
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            Download MeshFlow
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Access your knowledge maps on any device. Available for macOS, Windows, and web browsers.
          </p>
        </div>

        {/* Platform Selection */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Web */}
            <button
              onClick={() => setSelectedPlatform('web')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedPlatform === 'web'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <Globe className={`w-12 h-12 mx-auto mb-4 ${
                selectedPlatform === 'web' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <h3 className="text-xl font-semibold text-white mb-2">Web App</h3>
              <p className="text-sm text-slate-400">Use in your browser</p>
            </button>

            {/* macOS */}
            <button
              onClick={() => setSelectedPlatform('mac')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedPlatform === 'mac'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <Apple className={`w-12 h-12 mx-auto mb-4 ${
                selectedPlatform === 'mac' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <h3 className="text-xl font-semibold text-white mb-2">macOS</h3>
              <p className="text-sm text-slate-400">Native desktop app</p>
            </button>

            {/* Windows */}
            <button
              onClick={() => setSelectedPlatform('windows')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedPlatform === 'windows'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <Monitor className={`w-12 h-12 mx-auto mb-4 ${
                selectedPlatform === 'windows' ? 'text-blue-400' : 'text-slate-400'
              }`} />
              <h3 className="text-xl font-semibold text-white mb-2">Windows</h3>
              <p className="text-sm text-slate-400">Native desktop app</p>
            </button>
          </div>

          {/* Download Section */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            {selectedPlatform === 'web' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Web Application</h2>
                <p className="text-slate-300 mb-6">
                  Access MeshFlow directly in your browser. No installation required. Works on all modern browsers.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Works on Chrome, Firefox, Safari, and Edge</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>No installation required</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Always up-to-date</span>
                  </div>
                </div>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  Launch Web App
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            )}

            {selectedPlatform === 'mac' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">macOS Desktop App</h2>
                <p className="text-slate-300 mb-6">
                  Download the native macOS application for the best performance and offline access.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>macOS 11.0 (Big Sur) or later</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Native performance</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Offline access</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>System notifications</span>
                  </div>
                </div>
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-400 rounded-lg font-semibold cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Coming Soon
                </button>
                <p className="text-sm text-slate-500 mt-3">
                  Desktop apps are coming soon. Use the web app in the meantime.
                </p>
              </div>
            )}

            {selectedPlatform === 'windows' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Windows Desktop App</h2>
                <p className="text-slate-300 mb-6">
                  Download the native Windows application for the best performance and offline access.
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Windows 10 or later</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Native performance</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>Offline access</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CheckCircle className="w-5 h-5 text-blue-400" />
                    <span>System notifications</span>
                  </div>
                </div>
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-slate-400 rounded-lg font-semibold cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Coming Soon
                </button>
                <p className="text-sm text-slate-500 mt-3">
                  Desktop apps are coming soon. Use the web app in the meantime.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

