/**
 * Chart Node Component
 * Renders charts (bar, line, pie, area) - like data visualization blocks
 */

import { memo } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { getNodeType } from '@/lib/nodeTypes';
import { BarChartNode, LineChartNode, PieChartNode, AreaChartNode } from '../charts';

interface ChartNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

function ChartNode({ data, selected }: ChartNodeProps) {
  const { node } = data;
  const chartType = getNodeType(node);
  
  // Extract chart config from content
  const chartConfig = typeof node.content === 'object' && node.content?.type === chartType
    ? node.content
    : {
        data: [],
        xKey: 'name',
        yKey: 'value',
        color: '#3b82f6',
        showGrid: true,
        showLegend: false,
      };

  const { data: chartData = [], xKey = 'name', yKey = 'value', color = '#3b82f6', showGrid = true, showLegend = false } = chartConfig;

  const width = node.width || 400;
  const height = node.height || 300;

  const renderChart = () => {
    const commonProps = { data: chartData, color, showLegend };

    switch (chartType) {
      case 'bar-chart':
        return (
          <BarChartNode
            {...commonProps}
            xKey={xKey}
            yKey={yKey}
            showGrid={showGrid}
          />
        );
      case 'line-chart':
        return (
          <LineChartNode
            {...commonProps}
            xKey={xKey}
            yKey={yKey}
            showGrid={showGrid}
          />
        );
      case 'pie-chart':
        return <PieChartNode {...commonProps} />;
      case 'area-chart':
        return (
          <AreaChartNode
            {...commonProps}
            xKey={xKey}
            yKey={yKey}
            showGrid={showGrid}
          />
        );
      default:
        return <div className="text-gray-400">Unknown chart type</div>;
    }
  };

  return (
    <BaseNode node={node} selected={selected}>
      <div 
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {renderChart()}
      </div>
    </BaseNode>
  );
}

export default memo(ChartNode);

