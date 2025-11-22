'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import DownloadDesktopModal from './DownloadDesktopModal';

export default function DownloadDesktopButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Top Right Download Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed top-20 right-6 z-40 p-3 bg-white border-2 border-gray-300 text-black rounded-lg shadow-md hover:border-blue-600 hover:text-blue-600 transition-colors group"
        title="Download Desktop App"
      >
        <Download className="w-5 h-5" />
      </button>

      <DownloadDesktopModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

