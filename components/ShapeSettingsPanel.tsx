'use client';

import { useState, useEffect, useRef } from 'react';
import type { Node } from '@/types/Node';

interface ShapeConfig {
  fill?: boolean;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

interface ShapeSettingsPanelProps {
  node: Node;
  onUpdate: (config: ShapeConfig) => void;
}

export default function ShapeSettingsPanel({ node, onUpdate }: ShapeSettingsPanelProps) {
  const getShapeConfig = (): ShapeConfig => {
    if (node.content && typeof node.content === 'object' && 'shapeSettings' in node.content) {
      return (node.content as any).shapeSettings;
    }
    return { 
      fill: true, 
      fillColor: '#ffffff', 
      borderColor: '#1f2937', 
      borderWidth: 4 
    };
  };

  const shapeConfig = getShapeConfig();

  const [fill, setFill] = useState<boolean>(shapeConfig.fill !== false);
  const [fillColor, setFillColor] = useState<string>(shapeConfig.fillColor || '#ffffff');
  const [borderColor, setBorderColor] = useState<string>(shapeConfig.borderColor || '#1f2937');
  const [borderWidth, setBorderWidth] = useState<number>(shapeConfig.borderWidth || 4);

  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when node changes
  useEffect(() => {
    const newConfig = getShapeConfig();
    
    const configChanged = 
      newConfig.fill !== fill ||
      newConfig.fillColor !== fillColor ||
      newConfig.borderColor !== borderColor ||
      newConfig.borderWidth !== borderWidth;

    if (configChanged) {
      skipNextUpdate.current = true;
      setFill(newConfig.fill !== false);
      setFillColor(newConfig.fillColor || '#ffffff');
      setBorderColor(newConfig.borderColor || '#1f2937');
      setBorderWidth(newConfig.borderWidth || 4);
    }
  }, [node.id, node.content]);

  // Trigger update when config changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    const config: ShapeConfig = {
      fill,
      fillColor,
      borderColor,
      borderWidth,
    };
    
    onUpdateRef.current(config);
  }, [fill, fillColor, borderColor, borderWidth]);

  const isBox = node.tags?.includes('box');
  const isCircle = node.tags?.includes('circle');

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
        <div 
          className="w-full bg-gray-100 rounded-lg p-8 flex items-center justify-center"
          style={{ minHeight: '200px' }}
        >
          <div
            style={{
              width: isCircle ? '120px' : '150px',
              height: isCircle ? '120px' : '100px',
              borderRadius: isCircle ? '50%' : '0',
              backgroundColor: fill ? fillColor : 'transparent',
              border: `${borderWidth}px solid ${borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="text-xs text-gray-500 text-center px-2">Preview</span>
          </div>
        </div>
      </div>

      {/* Fill Toggle */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Fill</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={fill}
            onChange={(e) => setFill(e.target.checked)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            {fill ? 'Filled' : 'No Fill (Transparent)'}
          </span>
        </label>
      </div>

      {/* Fill Color */}
      {fill && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Fill Color</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                title="Fill Color"
              />
              <input
                type="text"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#ffffff"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
              />
            </div>
            {/* Preset Colors */}
            <div className="grid grid-cols-8 gap-2">
              {[
                '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db',
                '#9ca3af', '#6b7280', '#374151', '#1f2937',
                '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
                '#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6',
                '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8',
                '#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6',
                '#fecdd3', '#fda4af', '#fb7185', '#f43f5e',
                '#bbf7d0', '#86efac', '#4ade80', '#22c55e',
                '#cffafe', '#a5f3fc', '#67e8f9', '#06b6d4',
              ].map((color) => (
                <button
                  key={color}
                  onClick={() => setFillColor(color)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    fillColor === color
                      ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Border Color */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Border Color</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
              title="Border Color"
            />
            <input
              type="text"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#1f2937"
              pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
            />
          </div>
          {/* Preset Colors */}
          <div className="grid grid-cols-8 gap-2">
            {[
              '#000000', '#1f2937', '#374151', '#4b5563',
              '#6b7280', '#9ca3af', '#d1d5db', '#ffffff',
              '#dc2626', '#ea580c', '#d97706', '#ca8a04',
              '#65a30d', '#16a34a', '#059669', '#0891b2',
              '#0284c7', '#2563eb', '#7c3aed', '#9333ea',
              '#c026d3', '#db2777', '#e11d48', '#f43f5e',
            ].map((color) => (
              <button
                key={color}
                onClick={() => setBorderColor(color)}
                className={`w-8 h-8 rounded border-2 transition-all ${
                  borderColor === color
                    ? 'border-blue-500 ring-2 ring-blue-200 scale-110'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Border Width */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Border Width</h3>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="12"
            value={borderWidth}
            onChange={(e) => setBorderWidth(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0px</span>
            <span className="font-medium">{borderWidth}px</span>
            <span>12px</span>
          </div>
        </div>
      </div>
    </div>
  );
}


