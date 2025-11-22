'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowRight,
  Lock,
  Sparkles,
  Download,
  Link2,
  Network,
  Layout,
  Zap,
  CheckCircle,
} from 'lucide-react';
import MeshFlowLogo from '@/components/MeshFlowLogo';
import Footer from '@/components/Footer';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && status === 'authenticated' && session) {
      router.push('/dashboard');
    }
  }, [mounted, session, status, router]);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navbar */}
      <nav className="py-6 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <MeshFlowLogo variant="light" size="md" href="/" />
          <div className="flex items-center gap-4">
            <Link href="/download" className="text-slate-300 hover:text-white transition-colors">
              Download
            </Link>
            <Link href="/pricing" className="text-slate-300 hover:text-white transition-colors">
              Pricing
            </Link>
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
      <section className="relative overflow-hidden bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6">
              Organize your thinking.
            </h1>
            <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
              The visual workspace that organizes itself. Connect ideas, discover relationships, and build knowledge maps that grow with you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors"
              >
                Get MeshFlow for Web
              </Link>
              <Link
                href="/download"
                className="inline-flex items-center justify-center px-8 py-4 text-blue-400 hover:text-blue-300 transition-colors font-semibold text-lg"
              >
                More platforms
              </Link>
            </div>
          </div>

          {/* Hero Screenshot Placeholder */}
          <div className="mt-16 relative">
            <div className="max-w-6xl mx-auto">
              <div className="relative aspect-video bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
                {/* Placeholder - replace with actual workspace screenshot */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-blue-600/5">
                  <div className="text-center">
                    <MeshFlowLogo variant="light" size="lg" showText={false} />
                    <p className="text-slate-400 text-sm mt-4">
                      Workspace screenshot placeholder
                    </p>
                    <p className="text-slate-500 text-xs mt-2">
                      Replace with actual screenshot of workspace with nodes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Your thoughts are yours.
                </h2>
                <p className="text-slate-300 text-lg">
                  MeshFlow stores your knowledge maps securely in the cloud, so you can access them quickly from any device. Your data is encrypted and private.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Your mind is unique.
                </h2>
                <p className="text-slate-300 text-lg">
                  With AI-powered auto-linking, dynamic layouts, and customizable node types, you can shape MeshFlow to fit your way of thinking.
                </p>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Your knowledge should last.
                </h2>
                <p className="text-slate-300 text-lg">
                  MeshFlow uses open formats and exports, so you&apos;re never locked in. You own your data for the long term.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MeshFlowLogo variant="light" size="lg" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <p className="text-slate-400 mb-4">Free without limits.</p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center text-blue-400 hover:text-blue-300 font-semibold text-lg"
            >
              Download now
            </Link>
          </div>
        </div>
      </section>

      {/* Spark Ideas Section */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Spark ideas.
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              From personal notes to research projects, knowledge bases, and team collaboration, MeshFlow gives you the tools to come up with ideas and organize them visually.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Links Feature */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <h3 className="text-3xl font-bold text-white mb-4">Links</h3>
              <p className="text-slate-300 text-lg mb-6">
                Create connections between your nodes. Link anything and everything — ideas, people, places, concepts, and beyond. Build your own knowledge graph.
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-[200px]">
                {/* Placeholder for link preview */}
                <div className="text-slate-400 text-sm">
                  <p className="mb-2">In <strong>Knowledge Management</strong>, the concept of <span className="text-blue-400 underline">[[semantic linking]]</span> enables...</p>
                  <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Suggestions:</p>
                    <p className="text-sm text-white">• Semantic linking</p>
                    <p className="text-sm text-slate-400">• Auto-linking</p>
                    <p className="text-sm text-slate-400">• Knowledge graphs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Graph Feature */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
              <h3 className="text-3xl font-bold text-white mb-4">Graph</h3>
              <p className="text-slate-300 text-lg mb-6">
                Visualize the relationships between your nodes. Find hidden patterns in your thinking through a visually engaging and interactive graph view.
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 min-h-[200px] relative overflow-hidden">
                {/* Placeholder for graph visualization */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40"
                      />
                    ))}
                  </div>
                </div>
                <div className="relative z-10 text-xs text-slate-500">
                  <span className="bg-slate-900 px-2 py-1 rounded">Research</span>
                  <span className="bg-slate-900 px-2 py-1 rounded ml-2">Ideas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Canvas Feature */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 mb-8">
            <h3 className="text-3xl font-bold text-white mb-4">Canvas</h3>
            <p className="text-slate-300 text-lg mb-6">
              An infinite space to research, brainstorm, diagram, and lay out your ideas. Canvas is a limitless playground for your mind.{' '}
              <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
                Learn more
              </Link>
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 min-h-[400px] relative overflow-hidden">
              {/* Placeholder for canvas screenshot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Layout className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 text-sm">
                    Canvas screenshot placeholder
                  </p>
                  <p className="text-slate-600 text-xs mt-2">
                    Replace with actual canvas screenshot showing nodes and connections
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Features */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8">
            <h3 className="text-3xl font-bold text-white mb-4">AI-Powered Organization</h3>
            <p className="text-slate-300 text-lg mb-6">
              Build your ideal knowledge workspace. With AI auto-linking, semantic clustering, and intelligent suggestions, it&apos;s easy to tailor MeshFlow to fit your personal workflow.{' '}
              <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
                Learn more
              </Link>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Auto-Linking', desc: 'AI suggests connections between related ideas' },
                { name: 'Smart Clustering', desc: 'Automatically group related nodes by topic' },
                { name: 'Semantic Search', desc: 'Find nodes by meaning, not just keywords' },
              ].map((feature) => (
                <div key={feature.name} className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                  <Zap className="w-6 h-6 text-blue-400 mb-2" />
                  <h4 className="text-white font-semibold mb-1">{feature.name}</h4>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sync Securely Section */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">
                Sync securely.
              </h2>
              <p className="text-xl text-slate-300 mb-8">
                Access your knowledge maps on any device, secured with end-to-end encryption.{' '}
                <Link href="/download" className="text-blue-400 hover:text-blue-300 underline">
                  Learn more
                </Link>
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Fine-grained control.</h3>
                    <p className="text-slate-300">
                      Decide which workspaces you want to sync to which devices.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Version history.</h3>
                    <p className="text-slate-300">
                      Easily track changes between revisions, with version history for every node.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Network className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Collaboration.</h3>
                    <p className="text-slate-300">
                      Work with your team on shared workspaces without compromising your private data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                {/* Placeholder for sync settings screenshot */}
                <div className="aspect-video bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Sync settings screenshot</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publish Section */}
      <section className="py-24 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Publish instantly.
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
              Turn your knowledge maps into shareable visualizations, documentation, or interactive presentations.{' '}
              <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 underline">
                Learn more
              </Link>
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Seamless sharing.</h3>
              <p className="text-slate-300">
                Share your knowledge maps instantly from MeshFlow, and make it easy for others to explore your web of ideas.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Customization.</h3>
              <p className="text-slate-300">
                Control the look and feel with themes, custom domains, password protection, and more.
              </p>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Optimized for performance.</h3>
              <p className="text-slate-300">
                Published maps are fast, mobile-friendly, and optimized for SEO, no configuration required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            It&apos;s your time to shine.
          </h2>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-500 text-white rounded-lg font-semibold text-lg hover:bg-blue-600 transition-colors"
          >
            Get MeshFlow
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
