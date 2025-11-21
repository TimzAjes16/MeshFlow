'use client';

import { useState, useEffect, useRef } from 'react';
import { Maximize2, RotateCw, Minus, Plus } from 'lucide-react';
import type { Node } from '@/types/Node';

interface NodeTransformPanelProps {
  node: Node;
  onUpdate: (updates: Partial<Node>) => void;
}

export default function NodeTransformPanel({ node, onUpdate }: NodeTransformPanelProps) {
  const getNodeMetadata = () => {
    if (node.content && typeof node.content === 'object' && 'nodeMetadata' in node.content) {
      return (node.content as any).nodeMetadata || {};
    }
    return {};
  };

  const nodeMetadata = getNodeMetadata();
  const [width, setWidth] = useState<number>(nodeMetadata.width || 200);
  const [height, setHeight] = useState<number>(nodeMetadata.height || 100);
  const [rotation, setRotation] = useState<number>(nodeMetadata.rotation || 0);

  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when node changes
  useEffect(() => {
    const newMetadata = getNodeMetadata();
    const newWidth = newMetadata.width || 200;
    const newHeight = newMetadata.height || 100;
    const newRotation = newMetadata.rotation || 0;

    if (newWidth !== width || newHeight !== height || newRotation !== rotation) {
      skipNextUpdate.current = true;
      setWidth(newWidth);
      setHeight(newHeight);
      setRotation(newRotation);
    }
  }, [node.id, node.content]);

  // Trigger update when values change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipNextUpdate.current) {
      skipNextUpdate.current = false;
      return;
    }

    const currentContent = node.content || {};
    const currentMetadata = getNodeMetadata();
    const newContent = {
      ...currentContent,
      nodeMetadata: {
        ...currentMetadata,
        width: Math.round(width),
        height: Math.round(height),
        rotation: Math.round(rotation),
      },
    };

    onUpdateRef.current({
      content: newContent,
    });
  }, [width, height, rotation, node.content]);

  const handleWidthChange = (delta: number) => {
    setWidth((prev) => Math.max(50, Math.min(2000, prev + delta)));
  };

  const handleHeightChange = (delta: number) => {
    setHeight((prev) => Math.max(50, Math.min(2000, prev + delta)));
  };

  const handleRotationChange = (delta: number) => {
    setRotation((prev) => {
      const newRotation = prev + delta;
      return ((newRotation % 360) + 360) % 360; // Keep between 0-360
    });
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Transform</h3>

      {/* Width Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Width</label>
          <span className="text-xs text-gray-500">{Math.round(width)}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleWidthChange(-10)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Decrease width"
          >
            <Minus className="w-3 h-3 text-gray-600" />
          </button>
          <input
            type="range"
            min="50"
            max="2000"
            step="10"
            value={width}
            onChange={(e) => setWidth(parseInt(e.target.value))}
            className="flex-1"
          />
          <button
            onClick={() => handleWidthChange(10)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Increase width"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Height Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Height</label>
          <span className="text-xs text-gray-500">{Math.round(height)}px</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleHeightChange(-10)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Decrease height"
          >
            <Minus className="w-3 h-3 text-gray-600" />
          </button>
          <input
            type="range"
            min="50"
            max="2000"
            step="10"
            value={height}
            onChange={(e) => setHeight(parseInt(e.target.value))}
            className="flex-1"
          />
          <button
            onClick={() => handleHeightChange(10)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Increase height"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Rotation Control */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
            <RotateCw className="w-3 h-3" />
            Rotation
          </label>
          <span className="text-xs text-gray-500">{Math.round(rotation)}°</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRotationChange(-15)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Rotate -15°"
          >
            <RotateCw className="w-3 h-3 text-gray-600 rotate-180" />
          </button>
          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="flex-1"
          />
          <button
            onClick={() => handleRotationChange(15)}
            className="p-1.5 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            title="Rotate +15°"
          >
            <RotateCw className="w-3 h-3 text-gray-600" />
          </button>
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 90, 180, 270].map((angle) => (
            <button
              key={angle}
              onClick={() => setRotation(angle)}
              className={`flex-1 px-2 py-1 text-xs border rounded transition-colors ${
                rotation === angle
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {angle}°
            </button>
          ))}
        </div>
      </div>

      {/* Quick Size Presets */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">Size Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Small', w: 200, h: 100 },
            { label: 'Medium', w: 300, h: 150 },
            { label: 'Large', w: 400, h: 200 },
            { label: 'XLarge', w: 500, h: 300 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setWidth(preset.w);
                setHeight(preset.h);
              }}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded hover:bg-gray-50 transition-colors text-gray-700"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

