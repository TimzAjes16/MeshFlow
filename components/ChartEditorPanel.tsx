'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import type { Node } from '@/types/Node';
import { 
  AreaChart, Area, 
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

type ChartSize = 'small' | 'medium' | 'large';
type ColorPreset = 'blue' | 'purple' | 'green' | 'red';

interface ChartConfig {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  size?: ChartSize;
  colorPreset?: ColorPreset;
}

interface ChartEditorPanelProps {
  node: Node;
  onUpdate: (config: ChartConfig) => void;
}

const sizeOptions: { value: ChartSize; label: string; dimensions: string }[] = [
  { value: 'small', label: 'Small', dimensions: '300x200' },
  { value: 'medium', label: 'Medium', dimensions: '400x300' },
  { value: 'large', label: 'Large', dimensions: '500x400' },
];

const colorPresets: { value: ColorPreset; label: string; hex: string }[] = [
  { value: 'blue', label: 'Blue', hex: '#3b82f6' },
  { value: 'purple', label: 'Purple', hex: '#a855f7' },
  { value: 'green', label: 'Green', hex: '#10b981' },
  { value: 'red', label: 'Red', hex: '#ef4444' },
];

export default function ChartEditorPanel({ node, onUpdate }: ChartEditorPanelProps) {
  // Extract chart config from node content
  const getChartConfig = (): ChartConfig => {
    if (node.content && typeof node.content === 'object' && 'chart' in node.content) {
      return (node.content as any).chart;
    }
    return { 
      data: [], 
      xKey: 'name', 
      yKey: 'value', 
      color: '#3b82f6', 
      showGrid: true, 
      showLegend: false,
      size: 'small',
      colorPreset: 'blue',
    };
  };

  const chartConfig = getChartConfig();

  const [data, setData] = useState<ChartData[]>(chartConfig.data || []);
  const [xKey, setXKey] = useState(chartConfig.xKey || 'name');
  const [yKey, setYKey] = useState(chartConfig.yKey || 'value');
  const [color, setColor] = useState(chartConfig.color || '#3b82f6');
  const [showGrid, setShowGrid] = useState(chartConfig.showGrid !== false);
  const [showLegend, setShowLegend] = useState(chartConfig.showLegend || false);
  const [size, setSize] = useState<ChartSize>(chartConfig.size || 'small');
  const [colorPreset, setColorPreset] = useState<ColorPreset>(chartConfig.colorPreset || 'blue');

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newRow, setNewRow] = useState({ name: '', value: '' });

  // Track if we're initializing to prevent unnecessary updates
  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  // Keep onUpdate ref in sync
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when node changes (e.g., when switching between nodes)
  useEffect(() => {
    const newConfig = getChartConfig();
    
    // Only update state if the config actually changed
    const configChanged = 
      JSON.stringify(newConfig.data) !== JSON.stringify(data) ||
      newConfig.xKey !== xKey ||
      newConfig.yKey !== yKey ||
      newConfig.color !== color ||
      newConfig.showGrid !== showGrid ||
      newConfig.showLegend !== showLegend ||
      newConfig.size !== size ||
      newConfig.colorPreset !== colorPreset;

    if (configChanged) {
      skipNextUpdate.current = true; // Skip the update trigger since we're syncing from node
      setData(newConfig.data || []);
      setXKey(newConfig.xKey || 'name');
      setYKey(newConfig.yKey || 'value');
      setColor(newConfig.color || '#3b82f6');
      setShowGrid(newConfig.showGrid !== false);
      setShowLegend(newConfig.showLegend || false);
      setSize(newConfig.size || 'small');
      setColorPreset(newConfig.colorPreset || 'blue');
    }
  }, [node.id, node.content]);

  // Update color when colorPreset changes
  useEffect(() => {
    const preset = colorPresets.find(p => p.value === colorPreset);
    if (preset) {
      setColor(preset.hex);
    }
  }, [colorPreset]);

  // Trigger update when chart config changes (but not on initial mount or when syncing from node)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    // Ensure we always pass a complete config with all properties
    const config: ChartConfig = {
      data: data || [],
      xKey: xKey || 'name',
      yKey: yKey || 'value',
      color: color || '#3b82f6',
      showGrid: showGrid !== false,
      showLegend: showLegend || false,
      size: size || 'small',
      colorPreset: colorPreset || 'blue',
    };
    
    // Call onUpdate immediately when any setting changes
    onUpdateRef.current(config);
  }, [data, xKey, yKey, color, showGrid, showLegend, size, colorPreset]);

  const handleAddRow = () => {
    if (newRow.name && newRow.value) {
      setData([...data, { name: newRow.name, value: parseFloat(newRow.value) || 0 }]);
      setNewRow({ name: '', value: '' });
    }
  };

  const handleDeleteRow = (index: number) => {
    setData(data.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, field: string, value: string | number) => {
    const updated = [...data];
    updated[index] = { ...updated[index], [field]: value };
    setData(updated);
    setEditingIndex(null);
  };

  const chartType = node.tags?.find(tag => tag.includes('chart')) || 'bar-chart';
  const isLineOrAreaChart = chartType === 'line-chart' || chartType === 'area-chart';

  // Get preview dimensions
  const getPreviewDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 300, height: 200 };
      case 'medium':
        return { width: 400, height: 300 };
      case 'large':
        return { width: 500, height: 400 };
      default:
        return { width: 300, height: 200 };
    }
  };

  const previewDims = getPreviewDimensions();
  const previewData = data.length > 0 ? data : [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 500 },
  ];

  return (
    <div className="space-y-6">
      {/* Chart Settings Section */}
    <div className="space-y-4">
        {/* Chart Size */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Chart Size</h3>
          <div className="space-y-2">
            {sizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSize(option.value)}
                className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                  size === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {option.label} ({option.dimensions})
              </button>
            ))}
          </div>
        </div>

        {/* Color Preset (for all charts) */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {isLineOrAreaChart ? 'Line Color' : chartType === 'bar-chart' ? 'Bar Color' : 'Chart Color'}
          </h3>
          <div className="space-y-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => setColorPreset(preset.value)}
                className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                  colorPreset === preset.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
          <div 
            className="w-full bg-gray-100 rounded-lg p-4 flex items-center justify-center"
            style={{ minHeight: '200px' }}
          >
            {data.length > 0 ? (
              <div style={{ width: `${previewDims.width}px`, height: `${previewDims.height}px` }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area-chart' ? (
                    <AreaChart data={previewData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                      <XAxis 
                        dataKey={xKey} 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey={yKey}
                        stroke={color}
                        fill={color}
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  ) : chartType === 'line-chart' ? (
                    <LineChart data={previewData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                      <XAxis 
                        dataKey={xKey} 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={yKey}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ fill: color, r: 4 }}
                      />
                    </LineChart>
                  ) : chartType === 'bar-chart' ? (
                    <BarChart data={previewData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                      {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
                      <XAxis 
                        dataKey={xKey} 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        axisLine={{ stroke: '#d1d5db' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey={yKey} fill={color} />
                    </BarChart>
                  ) : chartType === 'pie-chart' ? (
                    <PieChart>
                      <Pie
                        data={previewData}
                        dataKey={yKey}
                        nameKey={xKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill={color}
                        label
                      >
                        {previewData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorPresets[index % colorPresets.length].hex} />
                        ))}
                      </Pie>
                      <Tooltip />
                      {showLegend && <Legend />}
                    </PieChart>
                  ) : null}
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">
                Preview will appear here based on your settings
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {/* Color picker (custom color) */}
          <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Custom Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
              onChange={(e) => {
                setColor(e.target.value);
                // Clear preset when using custom color
                setColorPreset('blue');
              }}
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={color}
              onChange={(e) => {
                setColor(e.target.value);
                setColorPreset('blue');
              }}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#3b82f6"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show Grid
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Show Legend
            </label>
          </div>

          {/* X/Y Key settings (for bar/line/area charts) */}
          {chartType !== 'pie-chart' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">X-Axis Key</label>
                <input
                  type="text"
                  value={xKey}
                  onChange={(e) => setXKey(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Y-Axis Key</label>
                <input
                  type="text"
                  value={yKey}
                  onChange={(e) => setYKey(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="value"
                />
              </div>
            </div>
          )}
      </div>

      {/* Data Editor */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Data</h3>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.map((row, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
            >
              {editingIndex === index ? (
                <>
                  <input
                    type="text"
                    defaultValue={row.name}
                    onBlur={(e) => handleUpdateRow(index, 'name', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateRow(index, 'name', (e.target as HTMLInputElement).value);
                      }
                    }}
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <input
                    type="number"
                    defaultValue={row.value}
                    onBlur={(e) => handleUpdateRow(index, 'value', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUpdateRow(index, 'value', parseFloat((e.target as HTMLInputElement).value) || 0);
                      }
                    }}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <Save className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm text-gray-700">{row.name}</div>
                  <div className="w-20 text-sm text-gray-700 text-right">{row.value}</div>
                  <button
                    onClick={() => setEditingIndex(index)}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRow(index)}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new row */}
        <div className="flex items-center gap-2 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
          <input
            type="text"
            value={newRow.name}
            onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
            placeholder="Name"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRow();
              }
            }}
          />
          <input
            type="number"
            value={newRow.value}
            onChange={(e) => setNewRow({ ...newRow, value: e.target.value })}
            placeholder="Value"
            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddRow();
              }
            }}
          />
          <button
            onClick={handleAddRow}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
