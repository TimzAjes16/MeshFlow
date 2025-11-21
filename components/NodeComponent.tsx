'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import type { Node as NodeType } from '@/types/Node';
import { getNodeColor, getColorGradient, getGlowShadow } from '@/lib/nodeColors';
import { BarChartNode, LineChartNode, PieChartNode, AreaChartNode } from './charts';

interface NodeData {
  label: string;
  node: NodeType;
}

function isChartNode(node: NodeType): boolean {
  if (!node.tags || node.tags.length === 0) return false;
  const chartTypes = ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'];
  return chartTypes.some(type => node.tags?.includes(type));
}

function getChartType(node: NodeType): string | null {
  if (!node.tags || node.tags.length === 0) return null;
  const chartTypes = ['bar-chart', 'line-chart', 'pie-chart', 'area-chart'];
  return chartTypes.find(type => node.tags?.includes(type)) || null;
}

export default memo(function NodeComponent({ data, selected }: NodeProps<NodeData>) {
  const { label, node } = data;
  const color = getNodeColor(node);
  const gradient = getColorGradient(color);
  const chartType = getChartType(node);
  const isChart = isChartNode(node);
  
  // Get chart config from node content
  const chartConfig = node.content && typeof node.content === 'object' && 'chart' in node.content
    ? (node.content as any).chart
    : null;

  // Render chart node
  if (isChart && chartType) {
    const chartData = chartConfig?.data || [];
    const chartProps = {
      data: chartData,
      xKey: chartConfig?.xKey || 'name',
      yKey: chartConfig?.yKey || 'value',
      color: chartConfig?.color || color.primary,
      showGrid: chartConfig?.showGrid !== false,
      showLegend: chartConfig?.showLegend || false,
    };

    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          className={`relative bg-white border-2 rounded-lg shadow-lg cursor-pointer transition-all duration-300 ${
            selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
          style={{
            width: '400px',
            height: '300px',
          }}
        >
          {/* Chart Title */}
          <div className="absolute top-2 left-3 right-3 z-10">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {label || 'Untitled Chart'}
            </div>
          </div>

          {/* Chart Content */}
          <div className="absolute inset-0 pt-8 pb-2 px-2">
            {chartType === 'bar-chart' && <BarChartNode {...chartProps} />}
            {chartType === 'line-chart' && <LineChartNode {...chartProps} />}
            {chartType === 'pie-chart' && <PieChartNode data={chartData} showLegend={chartProps.showLegend} />}
            {chartType === 'area-chart' && <AreaChartNode {...chartProps} />}
          </div>

          {/* Connection handles */}
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 bg-transparent border-2 border-blue-400 rounded-full opacity-0 hover:opacity-100 transition-opacity"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-transparent border-2 border-blue-400 rounded-full opacity-0 hover:opacity-100 transition-opacity"
          />
        </motion.div>
      </motion.div>
    );
  }

  // Render regular node (existing code)
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
