'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Sparkles,
  Network,
  Zap,
  Lock,
  ArrowRight,
  Github,
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only redirect if we're definitely authenticated (not loading)
    if (mounted && status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [mounted, session, status, router]);

  // Landing page for unauthenticated users
  // Show immediately - don't block on session check
  // Redirect will happen in useEffect if authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navbar */}
      <nav className="py-6 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-yellow-400" />
            <span className="text-2xl font-bold text-white">MeshFlow</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth/login" className="text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-2 bg-yellow-400 text-slate-950 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              Visual Knowledge Mapping
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                Powered by AI
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Connect ideas, discover relationships, and organize knowledge like never before.
              Auto-linking and intelligent clustering make knowledge mapping effortless.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-yellow-400 text-slate-950 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
              >
                Start Mapping
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-slate-700 text-white rounded-lg font-semibold text-lg hover:border-slate-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Hero Image/Visualization Placeholder */}
          <div className="mt-16 relative">
            <div className="max-w-5xl mx-auto">
              <div className="relative aspect-video bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
                {/* Placeholder for hero image - replace with actual image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Network className="w-32 h-32 text-yellow-400/20 mx-auto mb-4" />
                    <p className="text-slate-500 text-sm">
                      Visual knowledge graph visualization
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Why MeshFlow?
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Built for thinkers, researchers, and knowledge workers who want to see connections.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-8 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                AI Auto-Linking
              </h3>
              <p className="text-slate-400">
                Automatically connect related ideas using semantic similarity. No manual linking needed.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-8 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Network className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Dynamic Layouts
              </h3>
              <p className="text-slate-400">
                Choose from force-directed, radial, hierarchical, or semantic clustering layouts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-8 hover:border-yellow-400/50 transition-colors">
              <div className="w-12 h-12 bg-yellow-400/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Collaborative Workspaces
              </h3>
              <p className="text-slate-400">
                Share knowledge maps with your team. Real-time collaboration with role-based permissions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">
                Organize Your Knowledge Visually
              </h2>
              <p className="text-xl text-slate-400 mb-8">
                MeshFlow combines the best of Notion, Miro, and Obsidian into one powerful knowledge mapping tool.
              </p>
              <ul className="space-y-4">
                {[
                  'Infinite canvas for your ideas',
                  'Automatic semantic connections',
                  'Rich text editing with TipTap',
                  'Export to JSON, Markdown, and more',
                  'Full-text search across all nodes',
                  'Real-time collaboration',
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
                {/* Placeholder for feature image */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Network className="w-48 h-48 text-yellow-400/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to map your knowledge?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join thousands of users organizing their ideas with MeshFlow.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-yellow-400 text-slate-950 rounded-lg font-semibold text-lg hover:bg-yellow-300 transition-colors"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <span className="text-lg font-bold text-white">MeshFlow</span>
            </div>
            <div className="flex items-center gap-6 text-slate-400">
              <Link href="/dashboard" className="hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="https://github.com/TimzAjes16/MeshFlow" className="hover:text-white transition-colors flex items-center gap-2">
                <Github className="w-4 h-4" />
                GitHub
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-slate-500 text-sm">
            © {new Date().getFullYear()} MeshFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
