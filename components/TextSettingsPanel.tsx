'use client';

import { useState, useEffect, useRef } from 'react';
import type { Node } from '@/types/Node';

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
type FontFamily = 'sans' | 'serif' | 'mono';
type TextAlignment = 'left' | 'center' | 'right' | 'justify';

interface TextConfig {
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  alignment?: TextAlignment;
  lineHeight?: number;
  letterSpacing?: number;
}

interface TextSettingsPanelProps {
  node: Node;
  onUpdate: (config: TextConfig) => void;
}

const fontSizeOptions: { value: FontSize; label: string; size: string }[] = [
  { value: 'small', label: 'Small', size: '14px' },
  { value: 'medium', label: 'Medium', size: '16px' },
  { value: 'large', label: 'Large', size: '18px' },
  { value: 'xlarge', label: 'Extra Large', size: '20px' },
];

const fontFamilyOptions: { value: FontFamily; label: string; font: string }[] = [
  { value: 'sans', label: 'Sans Serif', font: 'Inter, system-ui, sans-serif' },
  { value: 'serif', label: 'Serif', font: 'Georgia, serif' },
  { value: 'mono', label: 'Monospace', font: 'Monaco, monospace' },
];

const alignmentOptions: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
  { value: 'justify', label: 'Justify' },
];

export default function TextSettingsPanel({ node, onUpdate }: TextSettingsPanelProps) {
  const getTextConfig = (): TextConfig => {
    if (node.content && typeof node.content === 'object' && 'textSettings' in node.content) {
      return (node.content as any).textSettings;
    }
    return { 
      fontSize: 'medium', 
      fontFamily: 'sans', 
      alignment: 'left',
      lineHeight: 1.6,
      letterSpacing: 0,
    };
  };

  const textConfig = getTextConfig();

  const [fontSize, setFontSize] = useState<FontSize>(textConfig.fontSize || 'medium');
  const [fontFamily, setFontFamily] = useState<FontFamily>(textConfig.fontFamily || 'sans');
  const [alignment, setAlignment] = useState<TextAlignment>(textConfig.alignment || 'left');
  const [lineHeight, setLineHeight] = useState<number>(textConfig.lineHeight || 1.6);
  const [letterSpacing, setLetterSpacing] = useState<number>(textConfig.letterSpacing || 0);

  const isInitialMount = useRef(true);
  const skipNextUpdate = useRef(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Sync state when node changes
  useEffect(() => {
    const newConfig = getTextConfig();
    
    const configChanged = 
      newConfig.fontSize !== fontSize ||
      newConfig.fontFamily !== fontFamily ||
      newConfig.alignment !== alignment ||
      newConfig.lineHeight !== lineHeight ||
      newConfig.letterSpacing !== letterSpacing;

    if (configChanged) {
      skipNextUpdate.current = true;
      setFontSize(newConfig.fontSize || 'medium');
      setFontFamily(newConfig.fontFamily || 'sans');
      setAlignment(newConfig.alignment || 'left');
      setLineHeight(newConfig.lineHeight || 1.6);
      setLetterSpacing(newConfig.letterSpacing || 0);
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

    // Ensure we always pass a complete config with all properties
    const config: TextConfig = {
      fontSize: fontSize || 'medium',
      fontFamily: fontFamily || 'sans',
      alignment: alignment || 'left',
      lineHeight: lineHeight || 1.6,
      letterSpacing: letterSpacing || 0,
    };
    
    // Call onUpdate immediately when any setting changes
    onUpdateRef.current(config);
  }, [fontSize, fontFamily, alignment, lineHeight, letterSpacing]);

  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
    xlarge: '20px',
  };

  const fontFamilyMap = {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Monaco, monospace',
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
        <div 
          className="w-full bg-gray-100 rounded-lg p-4"
          style={{ minHeight: '150px' }}
        >
          <div
            style={{
              fontSize: fontSizeMap[fontSize],
              fontFamily: fontFamilyMap[fontFamily],
              textAlign: alignment,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
              color: '#374151',
            }}
            className="text-gray-700"
          >
            The quick brown fox jumps over the lazy dog. This is a preview of how your text will appear with the current settings.
          </div>
        </div>
      </div>

      {/* Font Size */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Font Size</h3>
        <div className="space-y-2">
          {fontSizeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontSize(option.value)}
              className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                fontSize === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              {option.label} ({option.size})
            </button>
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Font Family</h3>
        <div className="space-y-2">
          {fontFamilyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFontFamily(option.value)}
              className={`w-full px-4 py-2.5 text-left border-2 rounded-lg transition-all ${
                fontFamily === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
              style={{ fontFamily: option.font }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Text Alignment */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Text Alignment</h3>
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

      {/* Line Height */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Line Height</h3>
        <div className="space-y-2">
          <input
            type="range"
            min="1"
            max="3"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>1.0</span>
            <span className="font-medium">{lineHeight.toFixed(1)}</span>
            <span>3.0</span>
          </div>
        </div>
      </div>

      {/* Letter Spacing */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Letter Spacing</h3>
        <div className="space-y-2">
          <input
            type="range"
            min="-2"
            max="4"
            step="0.5"
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>-2px</span>
            <span className="font-medium">{letterSpacing}px</span>
            <span>4px</span>
          </div>
        </div>
      </div>
    </div>
  );
}

