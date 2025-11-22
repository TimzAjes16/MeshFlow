'use client';

import { MousePointer2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MinimalEmptyHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
    >
      <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm">
        <Sparkles className="w-4 h-4 text-black" />
        <span className="text-sm text-black">
          Double-click to create your first node
        </span>
      </div>
    </motion.div>
  );
}

