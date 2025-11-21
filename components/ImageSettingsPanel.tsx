'use client';

import { useState, useEffect, useRef } from 'react';
import type { Node } from '@/types/Node';

type ImageSize = 'small' | 'medium' | 'large' | 'full';
type ImageAlignment = 'left' | 'center' | 'right';

interface ImageConfig {
  url?: string;
  size?: ImageSize;
  alignment?: ImageAlignment;
  borderRadius?: number;
}

interface ImageSettingsPanelProps {
  node: Node;
  onUpdate: (config: ImageConfig) => void;
}

const sizeOptions: { value: ImageSize; label: string; dimensions: string }[] = [
  { value: 'small', label: 'Small', dimensions: '200px' },
  { value: 'medium', label: 'Medium', dimensions: '400px' },
  { value: 'large', label: 'Large', dimensions: '600px' },
  { value: 'full', label: 'Full Width', dimensions: '100%' },
];

const alignmentOptions: { value: ImageAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

export default function ImageSettingsPanel({ node, onUpdate }: ImageSettingsPanelProps) {
  const getImageConfig = (): ImageConfig => {
    if (node.content && typeof node.content === 'object' && 'image' in node.content) {
      return (node.content as any).image;
    }
    return { size: 'medium', alignment: 'center', borderRadius: 8 };
  };

  const imageConfig = getImageConfig();

  const [size, setSize] = useState<ImageSize>(imageConfig.size || 'medium');
  const [alignment, setAlignment] = useState<ImageAlignment>(imageConfig.alignment || 'center');
  const [borderRadius, setBorderRadius] = useState<number>(imageConfig.borderRadius || 8);

  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when node changes
  useEffect(() => {
    const newConfig = getImageConfig();
    
    const configChanged = 
      newConfig.size !== size ||
      newConfig.alignment !== alignment ||
      newConfig.borderRadius !== borderRadius;

    if (configChanged) {
      skipNextUpdate.current = true;
      setSize(newConfig.size || 'medium');
      setAlignment(newConfig.alignment || 'center');
      setBorderRadius(newConfig.borderRadius || 8);
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

    // Always include the current image URL and all settings
    const config: ImageConfig = {
      url: imageConfig.url, // Preserve existing URL
      size,
      alignment,
      borderRadius,
    };
    
    // Call onUpdate immediately when any setting changes
    onUpdateRef.current(config);
  }, [size, alignment, borderRadius, imageConfig.url]);

  const imageUrl = imageConfig.url || '';

  return (
    <div className="space-y-6">
      {/* Image Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
        <div 
          className="w-full bg-gray-100 rounded-lg p-4 flex items-center justify-center"
          style={{ minHeight: '200px' }}
        >
          {imageUrl ? (
            <div 
              className={`rounded-lg overflow-hidden ${
                alignment === 'left' ? 'mr-auto' :
                alignment === 'right' ? 'ml-auto' :
                'mx-auto'
              }`}
              style={{
                maxWidth: size === 'small' ? '200px' :
                         size === 'medium' ? '400px' :
                         size === 'large' ? '600px' :
                         '100%',
                borderRadius: `${borderRadius}px`,
              }}
            >
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-auto"
                style={{ borderRadius: `${borderRadius}px` }}
              />
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8">
              Preview will appear here based on your settings
            </div>
          )}
        </div>
      </div>

      {/* Image Size */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Image Size</h3>
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

      {/* Alignment */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Alignment</h3>
        <div className="space-y-2">
          {alignmentOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlignment(option.value)}
              className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                alignment === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Border Radius</h3>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="24"
            value={borderRadius}
            onChange={(e) => setBorderRadius(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0px</span>
            <span className="font-medium">{borderRadius}px</span>
            <span>24px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

