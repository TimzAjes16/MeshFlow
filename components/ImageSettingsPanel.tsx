'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X } from 'lucide-react';
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
  onUpdate: (config: ImageConfig | { type: 'image'; url: string; size?: string; alignment?: string; borderRadius?: number }) => void;
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
    if (node.content && typeof node.content === 'object' && node.content !== null) {
      // Handle new format: { type: 'image', url: ..., size: ..., alignment: ... }
      if ((node.content as any).type === 'image') {
        return {
          url: (node.content as any).url || '',
          size: (node.content as any).size || 'medium',
          alignment: (node.content as any).alignment || 'center',
          borderRadius: (node.content as any).borderRadius || 8,
        };
      }
      // Handle old format: { image: { url: ..., size: ..., alignment: ... } }
      if ('image' in node.content) {
        return (node.content as any).image;
      }
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

  // Handle onUpdate callback - convert to correct format
  const handleUpdate = useCallback((config: ImageConfig | { type: 'image'; url: string; size?: string; alignment?: string; borderRadius?: number }) => {
    // If config already has type, use it directly, otherwise convert
    if ('type' in config && config.type === 'image') {
      onUpdate(config);
    } else {
      // Store in new format: { type: 'image', url: ..., size: ..., alignment: ... }
      onUpdate({
        type: 'image',
        url: config.url || '',
        size: config.size || 'medium',
        alignment: config.alignment || 'center',
        borderRadius: config.borderRadius || 8,
      } as any);
    }
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
    const config = {
      type: 'image' as const,
      url: imageConfig.url || '', // Preserve existing URL
      size,
      alignment,
      borderRadius,
    };
    
    // Call onUpdate immediately when any setting changes
    handleUpdate(config);
  }, [size, alignment, borderRadius, imageConfig.url, handleUpdate]);

  const imageUrl = imageConfig.url || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Remove duplicate handleUpdate definition
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleUpdate({
        ...imageConfig,
        url: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType('image/png') || await item.getType('image/jpeg');
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            handleUpdate({
              ...imageConfig,
              url: base64,
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('No image found in clipboard');
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      alert('Failed to paste image from clipboard');
    }
  };

  const handleUrlInput = (url: string) => {
    handleUpdate({
      ...imageConfig,
      url: url.trim(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Image Upload Section */}
      <div>
        <h3 className="text-sm font-semibold text-black mb-3">Image Source</h3>
        <div className="space-y-3">
          {/* File Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4 text-black" />
              <span className="text-sm font-medium text-black">Upload Image</span>
            </button>
          </div>

          {/* Paste from Clipboard */}
          <button
            onClick={handlePasteFromClipboard}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm text-black"
          >
            Paste from Clipboard
          </button>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-medium text-black mb-1.5">Or enter image URL</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => handleUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Remove Image */}
          {imageUrl && (
            <button
              onClick={() => handleUpdate({ ...imageConfig, url: '' })}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Remove Image
            </button>
          )}
        </div>
      </div>
      {/* Image Preview */}
      <div>
        <h3 className="text-sm font-semibold text-black mb-3">Preview</h3>
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
            <div className="text-center text-black text-sm py-8">
              Preview will appear here based on your settings
            </div>
          )}
        </div>
      </div>

      {/* Image Size */}
      <div>
        <h3 className="text-sm font-semibold text-black mb-3">Image Size</h3>
        <div className="space-y-2">
          {sizeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSize(option.value)}
              className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                size === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-black hover:border-gray-300'
              }`}
            >
              {option.label} ({option.dimensions})
            </button>
          ))}
        </div>
      </div>

      {/* Alignment */}
      <div>
        <h3 className="text-sm font-semibold text-black mb-3">Alignment</h3>
        <div className="space-y-2">
          {alignmentOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setAlignment(option.value)}
              className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                alignment === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-black hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-sm font-semibold text-black mb-3">Border Radius</h3>
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="24"
            value={borderRadius}
            onChange={(e) => setBorderRadius(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-black">
            <span>0px</span>
            <span className="font-medium">{borderRadius}px</span>
            <span>24px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

