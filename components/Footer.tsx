'use client';

import Link from 'next/link';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import MeshFlowLogo from '@/components/MeshFlowLogo';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/50 bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div>
            <MeshFlowLogo variant="light" size="sm" />
            <p className="text-slate-400 text-sm mt-4">
              Visual knowledge mapping powered by AI. Organize your thoughts, connect ideas, and discover relationships.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <Link
                href="https://github.com/TimzAjes16/MeshFlow"
                className="text-slate-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="text-slate-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="text-slate-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Get Started Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">Get started</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="/download" className="hover:text-white transition-colors">
                  Download
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white transition-colors">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* MeshFlow Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">MeshFlow</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-white transition-colors">
                  Web App
                </Link>
              </li>
              <li>
                <Link href="/download" className="hover:text-white transition-colors">
                  Mobile
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Features
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Column */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-slate-400 text-sm">
              <li>
                <Link href="https://github.com/TimzAjes16/MeshFlow" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                  GitHub
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Help
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} MeshFlow. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-slate-400 text-sm">
              <Link href="/" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/" className="hover:text-white transition-colors">
                Security
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

