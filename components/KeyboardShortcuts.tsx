'use client';

import { useState, useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const shortcuts: Array<{ keys: string[]; description: string }> = [];

  return (
    <>
      {/* Hint button - bottom right */}
      {showHint && !isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-30 w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors group"
          title="Keyboard shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-5 h-5 text-black group-hover:text-black" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full opacity-75"></span>
        </motion.button>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-xl font-bold text-black">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-black" />
                </button>
              </div>

              {/* Shortcuts list */}
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-black">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-black bg-gray-100 border border-gray-200 rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-black">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowHint(false);
                    setIsOpen(false);
                  }}
                  className="text-xs text-black hover:text-black transition-colors"
                >
                  Don&apos;t show hint again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

