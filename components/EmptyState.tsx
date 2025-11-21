'use client';

import { MousePointer2, ZoomIn, Move, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmptyStateProps {
  onDismiss?: () => void;
  visible: boolean;
}

export default function EmptyState({ onDismiss, visible }: EmptyStateProps) {
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[2px]"
          style={{ pointerEvents: 'auto', zIndex: 30 }}
          onClick={(e) => {
            // Allow clicking on the backdrop to dismiss
            if (e.target === e.currentTarget) {
              handleDismiss();
            }
          }}
        >
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl p-8 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Welcome to your mesh
        </h2>

        {/* Subtitle */}
        <p className="text-gray-600 text-center mb-6">
          Double-click anywhere to create your first node
        </p>

        {/* Hints */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <MousePointer2 className="w-4 h-4 text-blue-600" />
            </div>
            <span><strong className="text-gray-900">Double-click</strong> – create new node</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <ZoomIn className="w-4 h-4 text-blue-600" />
            </div>
            <span><strong className="text-gray-900">Scroll</strong> – zoom in/out</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Move className="w-4 h-4 text-blue-600" />
            </div>
            <span><strong className="text-gray-900">Drag</strong> – pan around</span>
          </div>
        </div>

            {/* Close button - type="button" to prevent form submission */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDismiss();
              }}
              className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-gray-900 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

