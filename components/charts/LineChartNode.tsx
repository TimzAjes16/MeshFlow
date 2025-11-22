'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface LineChartNodeProps {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  strokeWidth?: number;
}

export default function LineChartNode({
  data = [],
  xKey = 'name',
  yKey = 'value',
  color = '#3b82f6',
  showGrid = true,
  showLegend = false,
  strokeWidth = 2,
}: LineChartNodeProps) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-black text-sm">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis 
          dataKey={xKey} 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          stroke="#9ca3af"
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#6b7280' }}
          stroke="#9ca3af"
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '12px'
          }}
        />
        {showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey={yKey} 
          stroke={color} 
          strokeWidth={strokeWidth}
          dot={{ fill: color, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}


