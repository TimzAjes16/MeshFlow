'use client';

import Link from 'next/link';
import { CheckCircle, ArrowRight, Zap, Users, Building2 } from 'lucide-react';
import MeshFlowLogo from '@/components/MeshFlowLogo';
import Footer from '@/components/Footer';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for personal use and getting started',
      icon: Zap,
      features: [
        'Up to 3 workspaces',
        'Unlimited nodes per workspace',
        'Basic AI auto-linking',
        'Standard layouts',
        'Export to JSON',
        'Community support',
      ],
      cta: 'Get Started',
      ctaLink: '/auth/signup',
      popular: false,
    },
    {
      name: 'Pro',
      price: '$12',
      period: 'per month',
      description: 'For power users and small teams',
      icon: Users,
      features: [
        'Unlimited workspaces',
        'Unlimited nodes',
        'Advanced AI auto-linking',
        'All layout modes',
        'Export to JSON, Markdown, PDF',
        'Priority support',
        'Custom themes',
        'Advanced search',
        'Version history',
      ],
      cta: 'Start Free Trial',
      ctaLink: '/auth/signup',
      popular: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large teams and organizations',
      icon: Building2,
      features: [
        'Everything in Pro',
        'Team collaboration',
        'Role-based permissions',
        'SSO integration',
        'Advanced analytics',
        'Dedicated support',
        'Custom integrations',
        'On-premise deployment',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      ctaLink: '/auth/signup',
      popular: false,
    },
  ];

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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core features, with more power as you scale.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.name}
                className={`relative bg-slate-900/50 border-2 rounded-xl p-8 ${
                  plan.popular
                    ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'border-slate-800'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-lg ${
                    plan.popular ? 'bg-blue-500/10' : 'bg-slate-800'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.popular ? 'text-blue-400' : 'text-slate-400'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-slate-400 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-slate-400 ml-2">/{plan.period}</span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.ctaLink}
                  className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="inline-block ml-2 w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Can I change plans later?
              </h3>
              <p className="text-slate-300">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we&apos;ll prorate any charges.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-300">
                We accept all major credit cards, PayPal, and for Enterprise plans, we can arrange invoicing.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-300">
                Yes! All paid plans come with a 14-day free trial. No credit card required to start.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-2">
                What happens to my data if I cancel?
              </h3>
              <p className="text-slate-300">
                Your data remains accessible for 30 days after cancellation. You can export all your workspaces and nodes at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

