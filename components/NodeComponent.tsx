'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import type { Node as NodeType } from '@/types/Node';
import { getNodeColor, getColorGradient, getGlowShadow } from '@/lib/nodeColors';

interface NodeData {
  label: string;
  node: NodeType;
}

export default memo(function NodeComponent({ data, selected }: NodeProps<NodeData>) {
  const { label, node } = data;
  const color = getNodeColor(node);
  const gradient = getColorGradient(color);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative"
    >
      {/* Glowing orb effect - the node itself */}
      <motion.div
        className={`relative w-20 h-20 rounded-full ${
          selected
            ? `ring-4 ring-${color.name}/50`
            : ''
        } cursor-pointer transition-all duration-300`}
        animate={{
          boxShadow: [
            getGlowShadow(color, 0.6, selected),
            getGlowShadow(color, 0.7, selected),
            getGlowShadow(color, 0.6, selected),
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          background: gradient,
          filter: 'blur(0.5px)',
        }}
      >
        {/* Inner core glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.9), ${color.primary}60)`,
            mixBlendMode: 'screen',
          }}
        />
        
        {/* Subtle pulse effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `${color.primary}30`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Label - minimalistic, positioned below */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-xs whitespace-nowrap pointer-events-none"
        style={{
          color: color.primary,
          textShadow: `0 0 10px ${color.primary}80`,
        }}
      >
        {label || 'Untitled'}
      </motion.div>

      {/* Connection handles - invisible but functional */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-transparent border-2 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        style={{
          borderColor: `${color.primary}50`,
          boxShadow: `0 0 10px ${color.primary}60`,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-transparent border-2 rounded-full opacity-0 hover:opacity-100 transition-opacity"
        style={{
          borderColor: `${color.primary}50`,
          boxShadow: `0 0 10px ${color.primary}60`,
        }}
      />
    </motion.div>
  );
});
