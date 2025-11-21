'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import type { Node } from '@/types/Node';

interface ChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface ChartConfig {
  data: ChartData[];
  xKey?: string;
  yKey?: string;
  color?: string;
  showGrid?: boolean;
  showLegend?: boolean;
}

interface ChartEditorPanelProps {
  node: Node;
  onUpdate: (config: ChartConfig) => void;
}

export default function ChartEditorPanel({ node, onUpdate }: ChartEditorPanelProps) {
  const chartConfig: ChartConfig = node.content && typeof node.content === 'object' && 'chart' in node.content
    ? (node.content as any).chart
    : { data: [], xKey: 'name', yKey: 'value', color: '#3b82f6', showGrid: true, showLegend: false };

  const [data, setData] = useState<ChartData[]>(chartConfig.data || []);
  const [xKey, setXKey] = useState(chartConfig.xKey || 'name');
  const [yKey, setYKey] = useState(chartConfig.yKey || 'value');
  const [color, setColor] = useState(chartConfig.color || '#3b82f6');
  const [showGrid, setShowGrid] = useState(chartConfig.showGrid !== false);
  const [showLegend, setShowLegend] = useState(chartConfig.showLegend || false);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newRow, setNewRow] = useState({ name: '', value: '' });

  useEffect(() => {
    const config: ChartConfig = {
      data,
      xKey,
      yKey,
      color,
      showGrid,
      showLegend,
    };
    onUpdate(config);
  }, [data, xKey, yKey, color, showGrid, showLegend, onUpdate]);

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

  return (
    <div className="space-y-4">
      <div className="border-b border-gray-200 pb-3">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Chart Settings</h3>
        
        <div className="space-y-3">
          {/* Color picker */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
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
      </div>

      {/* Data Editor */}
      <div>
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
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
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
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
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
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

