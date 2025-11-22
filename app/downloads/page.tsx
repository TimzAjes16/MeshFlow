'use client';

import { useState, useEffect } from 'react';
import { Download, Monitor, Apple, Package, CheckCircle } from 'lucide-react';

interface DownloadOption {
  platform: string;
  label: string;
  icon: React.ReactNode;
  file: string;
  size: string;
  recommended?: boolean;
}

export default function DownloadsPage() {
  const [platform, setPlatform] = useState<string>('');
  const [downloads, setDownloads] = useState<DownloadOption[]>([]);

  useEffect(() => {
    // Detect user's platform
    const userAgent = navigator.userAgent.toLowerCase();
    let detectedPlatform = 'unknown';
    
    if (userAgent.includes('win')) {
      detectedPlatform = 'windows';
    } else if (userAgent.includes('mac')) {
      detectedPlatform = 'mac';
    } else if (userAgent.includes('linux')) {
      detectedPlatform = 'linux';
    }

    setPlatform(detectedPlatform);

    // Define download options
    const allDownloads: DownloadOption[] = [
      {
        platform: 'mac',
        label: 'macOS (Intel)',
        icon: <Apple className="w-6 h-6" />,
        file: 'MeshFlow-0.1.0-x64.dmg',
        size: '~150 MB',
        recommended: detectedPlatform === 'mac',
      },
      {
        platform: 'mac',
        label: 'macOS (Apple Silicon)',
        icon: <Apple className="w-6 h-6" />,
        file: 'MeshFlow-0.1.0-arm64.dmg',
        size: '~150 MB',
        recommended: detectedPlatform === 'mac',
      },
      {
        platform: 'windows',
        label: 'Windows (64-bit)',
        icon: <Monitor className="w-6 h-6" />,
        file: 'MeshFlow-Setup-0.1.0.exe',
        size: '~160 MB',
        recommended: detectedPlatform === 'windows',
      },
      {
        platform: 'windows',
        label: 'Windows Portable',
        icon: <Package className="w-6 h-6" />,
        file: 'MeshFlow-0.1.0-win-x64-portable.exe',
        size: '~160 MB',
        recommended: false,
      },
      {
        platform: 'linux',
        label: 'Linux AppImage',
        icon: <Monitor className="w-6 h-6" />,
        file: 'MeshFlow-0.1.0.AppImage',
        size: '~140 MB',
        recommended: detectedPlatform === 'linux',
      },
    ];

    setDownloads(allDownloads);
  }, []);

  const handleDownload = (file: string) => {
    // In production, this would point to your actual file storage/CDN
    const downloadUrl = `/api/downloads/file?name=${encodeURIComponent(file)}`;
    window.open(downloadUrl, '_blank');
  };

  const recommendedDownload = downloads.find(d => d.recommended && d.platform === platform);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Download className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-black mb-3">
            Download MeshFlow Desktop
          </h1>
          <p className="text-lg text-black max-w-2xl mx-auto">
            Get the full desktop experience with offline capabilities, better performance, and native integrations.
          </p>
        </div>

        {/* Recommended Download */}
        {recommendedDownload && (
          <div className="mb-8 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-blue-900">
                Recommended for Your Device
              </h2>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg">
                  {recommendedDownload.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">
                    {recommendedDownload.label}
                  </h3>
                  <p className="text-sm text-black">
                    {recommendedDownload.size}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownload(recommendedDownload.file)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download Now
              </button>
            </div>
          </div>
        )}

        {/* All Downloads */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-black">
              All Downloads
            </h2>
            <p className="text-sm text-black mt-1">
              Choose the version that matches your operating system
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {downloads.map((download, index) => (
              <div
                key={index}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      {download.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-black">
                          {download.label}
                        </h3>
                        {download.recommended && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-black mt-1">
                        {download.file} • {download.size}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(download.file)}
                    className="px-4 py-2 border-2 border-gray-300 text-black rounded-lg hover:border-blue-600 hover:text-blue-600 transition-colors font-medium flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Requirements */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-black mb-4">
            System Requirements
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-black mb-2">Windows</h3>
              <ul className="text-sm text-black space-y-1">
                <li>• Windows 10 or later</li>
                <li>• 64-bit processor</li>
                <li>• 4 GB RAM minimum</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">macOS</h3>
              <ul className="text-sm text-black space-y-1">
                <li>• macOS 11 Big Sur or later</li>
                <li>• Intel or Apple Silicon</li>
                <li>• 4 GB RAM minimum</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-2">Linux</h3>
              <ul className="text-sm text-black space-y-1">
                <li>• Ubuntu 18.04+ or similar</li>
                <li>• 64-bit processor</li>
                <li>• 4 GB RAM minimum</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

