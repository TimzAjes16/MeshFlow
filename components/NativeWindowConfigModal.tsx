/**
 * Native Window Configuration Modal
 * Allows users to select which desktop application to embed
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Monitor, RefreshCw, AlertCircle } from 'lucide-react';

interface WindowInfo {
  processName: string;
  windowTitle: string;
  windowHandle?: number;
}

interface NativeWindowConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { processName: string; windowTitle: string }) => void;
}

export default function NativeWindowConfigModal({
  isOpen,
  onClose,
  onConfirm,
}: NativeWindowConfigModalProps) {
  const [processName, setProcessName] = useState('');
  const [windowTitle, setWindowTitle] = useState('');
  const [availableWindows, setAvailableWindows] = useState<WindowInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load available windows
  const loadWindows = useCallback(async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      // Check if we're in Electron
      if (typeof window !== 'undefined' && (window as any).electronAPI?.getWindowList) {
        const windows = await (window as any).electronAPI.getWindowList();
        setAvailableWindows(windows || []);
      } else {
        // Mock data for development
        setAvailableWindows([
          { processName: 'Discord', windowTitle: 'Discord' },
          { processName: 'Safari', windowTitle: 'Safari' },
          { processName: 'TradingView', windowTitle: 'TradingView' },
          { processName: 'Chrome', windowTitle: 'Google Chrome' },
          { processName: 'Code', windowTitle: 'Visual Studio Code' },
        ]);
      }
    } catch (error) {
      console.error('Error loading windows:', error);
      setAvailableWindows([]);
    } finally {
      setIsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadWindows();
    }
  }, [isOpen, loadWindows]);

  const filteredWindows = availableWindows.filter((window) => {
    const query = searchQuery.toLowerCase();
    return (
      window.processName.toLowerCase().includes(query) ||
      window.windowTitle.toLowerCase().includes(query)
    );
  });

  const handleSelectWindow = (window: WindowInfo) => {
    setProcessName(window.processName);
    setWindowTitle(window.windowTitle);
  };

  const handleConfirm = () => {
    if (processName || windowTitle) {
      onConfirm({ processName, windowTitle });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configure Native App Widget
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search for application..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
            />
          </div>

          {/* Available Windows List */}
          <div className="flex-1 overflow-y-auto mb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredWindows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No applications found
                </p>
                <button
                  onClick={loadWindows}
                  className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredWindows.map((window, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectWindow(window)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      processName === window.processName && windowTitle === window.windowTitle
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {window.windowTitle || window.processName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {window.processName}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual Input */}
          <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Process Name (optional)
              </label>
              <input
                type="text"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                placeholder="e.g., Discord, Safari, TradingView"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Window Title (optional)
              </label>
              <input
                type="text"
                value={windowTitle}
                onChange={(e) => setWindowTitle(e.target.value)}
                placeholder="e.g., Discord, Safari, TradingView"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!processName && !windowTitle}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

