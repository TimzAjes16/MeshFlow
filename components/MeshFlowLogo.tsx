'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

interface MeshFlowLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
}

export default function MeshFlowLogo({ 
  variant = 'light', 
  size = 'md',
  showText = true,
  href,
  className = ''
}: MeshFlowLogoProps) {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-xl' },
    md: { icon: 'w-8 h-8', text: 'text-2xl' },
    lg: { icon: 'w-12 h-12', text: 'text-4xl' },
  };

  const textColor = variant === 'light' 
    ? { mesh: 'text-white', flow: 'text-blue-400' }
    : { mesh: 'text-slate-900', flow: 'text-blue-600' };

  const LogoContent = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Network/Mesh Graphic */}
      <div className={`${sizeClasses[size].icon} relative`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Nodes and connections - creating an organic mesh pattern with gradient */}
          {/* Define gradients for smooth color transitions */}
          <defs>
            <linearGradient id="nodeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="nodeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="nodeGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.5" />
            </linearGradient>
            <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
            </linearGradient>
          </defs>
          
          {/* Top nodes (darker purple) */}
          <circle cx="30" cy="25" r="6" fill="url(#nodeGradient1)" />
          <circle cx="60" cy="20" r="5" fill="#8B5CF6" opacity="0.9" />
          <circle cx="75" cy="35" r="5.5" fill="#7C3AED" opacity="0.95" />
          
          {/* Middle nodes (transitioning blues) */}
          <circle cx="20" cy="50" r="5" fill="url(#nodeGradient2)" />
          <circle cx="45" cy="55" r="6" fill="#2563EB" opacity="0.9" />
          <circle cx="70" cy="60" r="5" fill="#3B82F6" opacity="0.85" />
          <circle cx="50" cy="45" r="4.5" fill="#6366F1" opacity="0.8" />
          
          {/* Bottom nodes (lighter blues) */}
          <circle cx="35" cy="75" r="5" fill="url(#nodeGradient3)" />
          <circle cx="65" cy="80" r="5.5" fill="#3B82F6" opacity="0.85" />
          <circle cx="25" cy="70" r="4" fill="#60A5FA" opacity="0.75" />
          
          {/* Connections - creating mesh pattern with gradients */}
          {/* Top connections */}
          <line x1="30" y1="25" x2="60" y2="20" stroke="url(#lineGradient1)" strokeWidth="1.8" />
          <line x1="60" y1="20" x2="75" y2="35" stroke="#7C3AED" strokeWidth="1.8" opacity="0.65" />
          <line x1="30" y1="25" x2="50" y2="45" stroke="url(#lineGradient1)" strokeWidth="1.6" />
          
          {/* Middle connections */}
          <line x1="20" y1="50" x2="45" y2="55" stroke="url(#lineGradient2)" strokeWidth="1.6" />
          <line x1="45" y1="55" x2="70" y2="60" stroke="#2563EB" strokeWidth="1.6" opacity="0.55" />
          <line x1="50" y1="45" x2="45" y2="55" stroke="#3B82F6" strokeWidth="1.6" opacity="0.55" />
          <line x1="30" y1="25" x2="20" y2="50" stroke="url(#lineGradient1)" strokeWidth="1.5" />
          <line x1="60" y1="20" x2="50" y2="45" stroke="url(#lineGradient1)" strokeWidth="1.5" />
          <line x1="75" y1="35" x2="70" y2="60" stroke="url(#lineGradient2)" strokeWidth="1.5" />
          
          {/* Bottom connections */}
          <line x1="20" y1="50" x2="35" y2="75" stroke="url(#lineGradient2)" strokeWidth="1.5" />
          <line x1="45" y1="55" x2="35" y2="75" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
          <line x1="45" y1="55" x2="65" y2="80" stroke="#3B82F6" strokeWidth="1.5" opacity="0.5" />
          <line x1="70" y1="60" x2="65" y2="80" stroke="#60A5FA" strokeWidth="1.5" opacity="0.5" />
          <line x1="20" y1="50" x2="25" y2="70" stroke="#60A5FA" strokeWidth="1.5" opacity="0.5" />
          <line x1="25" y1="70" x2="35" y2="75" stroke="#60A5FA" strokeWidth="1.5" opacity="0.5" />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`font-bold ${sizeClasses[size].text} ${textColor.mesh}`}
        >
          <span className={textColor.mesh}>Mesh</span>
          <span className={textColor.flow}>Flow</span>
        </motion.span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  return <LogoContent />;
}

