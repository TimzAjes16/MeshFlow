'use client';

import { useState, useEffect } from 'react';
import { X, Download, Monitor, Apple, Package, CheckCircle, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DownloadDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadDesktopModal({ isOpen, onClose }: DownloadDesktopModalProps) {
  const [platform, setPlatform] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Detect user's platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) {
      setPlatform('windows');
    } else if (userAgent.includes('mac')) {
      setPlatform('mac');
    } else if (userAgent.includes('linux')) {
      setPlatform('linux');
    } else {
      setPlatform('unknown');
    }
  }, []);

  if (!isOpen) return null;

  const handleDownload = () => {
    router.push('/downloads');
    onClose();
  };

  const getPlatformInfo = () => {
    switch (platform) {
      case 'windows':
        return {
          icon: <Monitor className="w-8 h-8 text-blue-600" />,
          label: 'Windows (64-bit)',
          file: 'MeshFlow-Setup-0.1.0.exe',
          size: '~160 MB',
        };
      case 'mac':
        return {
          icon: <Apple className="w-8 h-8 text-black" />,
          label: 'macOS',
          file: 'MeshFlow-0.1.0.dmg',
          size: '~150 MB',
        };
      case 'linux':
        return {
          icon: <Monitor className="w-8 h-8 text-orange-600" />,
          label: 'Linux',
          file: 'MeshFlow-0.1.0.AppImage',
          size: '~140 MB',
        };
      default:
        return {
          icon: <Package className="w-8 h-8 text-black" />,
          label: 'All Platforms',
          file: '',
          size: '',
        };
    }
  };

  const platformInfo = getPlatformInfo();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-black flex items-center gap-3">
            <Download className="w-6 h-6 text-blue-600" />
            Download Desktop App
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-black mb-6">
            Get the full MeshFlow experience as a desktop app with offline access, native integrations, and improved performance.
          </p>

          {/* Recommended Download */}
          {platform !== 'unknown' && (
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Recommended for Your Device</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg">
                  {platformInfo.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-black">{platformInfo.label}</h4>
                  <p className="text-sm text-black">{platformInfo.size}</p>
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mb-6 space-y-3">
            <h3 className="font-semibold text-black">Desktop App Features:</h3>
            <ul className="text-sm text-black space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Works offline with local data storage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Faster performance with native rendering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>Native keyboard shortcuts and menu integration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">✓</span>
                <span>System notifications and background sync</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-black hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Later
          </button>
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            View Downloads
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

