'use client';

import { useState, useEffect, useRef } from 'react';
import type { Node } from '@/types/Node';

// Load Google Fonts dynamically
const loadGoogleFont = (fontName: string) => {
  if (typeof window === 'undefined') return;
  
  // Check if font is already loaded
  const linkId = `google-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;
  
  // Create link element
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | string; // string for custom pixel values
type FontFamily = 'sans' | 'serif' | 'mono' | string; // string for Google Fonts
type FontStyle = 'normal' | 'italic' | 'oblique';
type TextAlignment = 'left' | 'center' | 'right' | 'justify';

interface TextConfig {
  fontSize?: FontSize;
  fontFamily?: FontFamily;
  fontStyle?: FontStyle;
  alignment?: TextAlignment;
  lineHeight?: number;
  letterSpacing?: number;
  googleFont?: string; // Google Font name
  customFontSize?: string; // Custom pixel value (e.g., "18px", "24px")
}

interface TextSettingsPanelProps {
  node: Node;
  onUpdate: (config: TextConfig) => void;
}

const fontSizeOptions: { value: FontSize; label: string; size: string }[] = [
  { value: 'xs', label: 'Extra Small', size: '12px' },
  { value: 'sm', label: 'Small', size: '14px' },
  { value: 'base', label: 'Base', size: '16px' },
  { value: 'lg', label: 'Large', size: '18px' },
  { value: 'xl', label: 'Extra Large', size: '20px' },
  { value: '2xl', label: '2XL', size: '24px' },
  { value: '3xl', label: '3XL', size: '30px' },
  { value: '4xl', label: '4XL', size: '36px' },
  { value: '5xl', label: '5XL', size: '48px' },
];

const fontStyleOptions: { value: FontStyle; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'italic', label: 'Italic' },
  { value: 'oblique', label: 'Oblique' },
];

const fontFamilyOptions: { value: FontFamily; label: string; font: string; category: 'system' | 'google' }[] = [
  { value: 'sans', label: 'Sans Serif', font: 'Inter, system-ui, sans-serif', category: 'system' },
  { value: 'serif', label: 'Serif', font: 'Georgia, serif', category: 'system' },
  { value: 'mono', label: 'Monospace', font: 'Monaco, monospace', category: 'system' },
];

// Popular Google Fonts
const googleFontsOptions: { value: string; label: string; font: string; category: 'google' }[] = [
  { value: 'Roboto', label: 'Roboto', font: "'Roboto', sans-serif", category: 'google' },
  { value: 'Open Sans', label: 'Open Sans', font: "'Open Sans', sans-serif", category: 'google' },
  { value: 'Lato', label: 'Lato', font: "'Lato', sans-serif", category: 'google' },
  { value: 'Montserrat', label: 'Montserrat', font: "'Montserrat', sans-serif", category: 'google' },
  { value: 'Poppins', label: 'Poppins', font: "'Poppins', sans-serif", category: 'google' },
  { value: 'Raleway', label: 'Raleway', font: "'Raleway', sans-serif", category: 'google' },
  { value: 'Ubuntu', label: 'Ubuntu', font: "'Ubuntu', sans-serif", category: 'google' },
  { value: 'Playfair Display', label: 'Playfair Display', font: "'Playfair Display', serif", category: 'google' },
  { value: 'Merriweather', label: 'Merriweather', font: "'Merriweather', serif", category: 'google' },
  { value: 'Lora', label: 'Lora', font: "'Lora', serif", category: 'google' },
  { value: 'PT Serif', label: 'PT Serif', font: "'PT Serif', serif", category: 'google' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro', font: "'Source Sans Pro', sans-serif", category: 'google' },
  { value: 'Oswald', label: 'Oswald', font: "'Oswald', sans-serif", category: 'google' },
  { value: 'Nunito', label: 'Nunito', font: "'Nunito', sans-serif", category: 'google' },
  { value: 'Crimson Text', label: 'Crimson Text', font: "'Crimson Text', serif", category: 'google' },
  { value: 'Work Sans', label: 'Work Sans', font: "'Work Sans', sans-serif", category: 'google' },
  { value: 'Inter', label: 'Inter', font: "'Inter', sans-serif", category: 'google' },
  { value: 'Quicksand', label: 'Quicksand', font: "'Quicksand', sans-serif", category: 'google' },
  { value: 'Dancing Script', label: 'Dancing Script', font: "'Dancing Script', cursive", category: 'google' },
  { value: 'Pacifico', label: 'Pacifico', font: "'Pacifico', cursive", category: 'google' },
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
      const settings = (node.content as any).textSettings;
      return {
        ...settings,
        customFontSize: settings.customFontSize || '',
      };
    }
    return { 
      fontSize: 'base', 
      fontFamily: 'sans',
      fontStyle: 'normal',
      alignment: 'left',
      lineHeight: 1.6,
      letterSpacing: 0,
      googleFont: '',
      customFontSize: '',
    };
  };

  const textConfig = getTextConfig();
  const googleFont = textConfig.googleFont || '';

  // Determine initial fontSize: use 'custom' if customFontSize exists, otherwise use preset
  const initialFontSize = textConfig.customFontSize ? 'custom' : (textConfig.fontSize || 'base');
  
  const [fontSize, setFontSize] = useState<FontSize>(initialFontSize);
  const [customFontSize, setCustomFontSize] = useState<string>(textConfig.customFontSize || '');
  const [fontFamily, setFontFamily] = useState<FontFamily>(textConfig.fontFamily || 'sans');
  const [fontStyle, setFontStyle] = useState<FontStyle>(textConfig.fontStyle || 'normal');
  const [selectedGoogleFont, setSelectedGoogleFont] = useState<string>(googleFont || '');
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
    
    const newGoogleFont = newConfig.googleFont || '';
    
    const newCustomFontSize = newConfig.customFontSize || '';
    
    const configChanged = 
      newConfig.fontSize !== fontSize ||
      newConfig.customFontSize !== customFontSize ||
      newConfig.fontFamily !== fontFamily ||
      newConfig.fontStyle !== fontStyle ||
      newGoogleFont !== selectedGoogleFont ||
      newConfig.alignment !== alignment ||
      newConfig.lineHeight !== lineHeight ||
      newConfig.letterSpacing !== letterSpacing;

    if (configChanged) {
      skipNextUpdate.current = true;
      // If customFontSize exists, set fontSize to 'custom', otherwise use preset
      const newFontSize = newCustomFontSize ? 'custom' : (newConfig.fontSize || 'base');
      setFontSize(newFontSize);
      setCustomFontSize(newCustomFontSize);
      setFontFamily(newConfig.fontFamily || 'sans');
      setFontStyle(newConfig.fontStyle || 'normal');
      setSelectedGoogleFont(newGoogleFont);
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

    // Load Google Font if selected
    if (selectedGoogleFont) {
      loadGoogleFont(selectedGoogleFont);
    }

    // Ensure we always pass a complete config with all properties
    const config: TextConfig = {
      fontSize: fontSize || 'base',
      customFontSize: customFontSize || undefined,
      fontFamily: selectedGoogleFont ? selectedGoogleFont : (fontFamily || 'sans'),
      fontStyle: fontStyle || 'normal',
      alignment: alignment || 'left',
      lineHeight: lineHeight || 1.6,
      letterSpacing: letterSpacing || 0,
      googleFont: selectedGoogleFont || undefined,
    };
    
    // Call onUpdate immediately when any setting changes
    onUpdateRef.current(config);
  }, [fontSize, customFontSize, fontFamily, fontStyle, selectedGoogleFont, alignment, lineHeight, letterSpacing]);

  const fontSizeMap = {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
  };

  // Get the actual font size to use (custom takes precedence if set)
  const getFontSizeString = (): string => {
    if (customFontSize) {
      // Ensure custom size has 'px' suffix if it's a number
      const size = customFontSize.trim();
      return size.match(/^\d+$/) ? `${size}px` : size;
    }
    return fontSizeMap[fontSize as keyof typeof fontSizeMap] || fontSizeMap.base;
  };

  const fontFamilyMap = {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'Georgia, serif',
    mono: 'Monaco, monospace',
  };

  const fontStyleMap = {
    normal: 'normal',
    italic: 'italic',
    oblique: 'oblique',
  };

  // Get the actual font family string to use
  const getFontFamilyString = (): string => {
    if (selectedGoogleFont) {
      const googleFontOption = googleFontsOptions.find(f => f.value === selectedGoogleFont);
      return googleFontOption ? googleFontOption.font : fontFamilyMap[fontFamily as keyof typeof fontFamilyMap] || fontFamilyMap.sans;
    }
    return fontFamilyMap[fontFamily as keyof typeof fontFamilyMap] || fontFamilyMap.sans;
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
              fontSize: getFontSizeString(),
              fontFamily: getFontFamilyString(),
              fontStyle: fontStyleMap[fontStyle],
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
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Font Size</h3>
        <div className="space-y-2">
          <select
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value as FontSize);
              if (e.target.value !== 'custom') {
                setCustomFontSize(''); // Clear custom size when selecting preset
              }
            }}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            {fontSizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.size})
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          {(fontSize === 'custom' || customFontSize) && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customFontSize}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow numbers and 'px', 'em', 'rem' units
                  if (value === '' || /^\d+(\.\d+)?(px|em|rem)?$/.test(value)) {
                    setCustomFontSize(value);
                    setFontSize('custom');
                  }
                }}
                placeholder="e.g., 18px, 1.5em, 2rem"
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">
                {customFontSize && getFontSizeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Font Style */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Font Style</h3>
        <select
          value={fontStyle}
          onChange={(e) => setFontStyle(e.target.value as FontStyle)}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          {fontStyleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* System Font Family */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">System Fonts</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {fontFamilyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setFontFamily(option.value);
                setSelectedGoogleFont(''); // Clear Google Font when system font is selected
              }}
              className={`px-3 py-2 text-sm border-2 rounded-lg transition-all ${
                fontFamily === option.value && !selectedGoogleFont
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

      {/* Google Fonts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Google Fonts</h3>
        <select
          value={selectedGoogleFont}
          onChange={(e) => {
            const fontName = e.target.value;
            setSelectedGoogleFont(fontName);
            if (fontName) {
              setFontFamily('sans'); // Reset to sans when Google Font is selected
              loadGoogleFont(fontName);
            }
          }}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
        >
          <option value="">Select a Google Font...</option>
          {googleFontsOptions.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.font }}>
              {font.label}
            </option>
          ))}
        </select>
        {selectedGoogleFont && (
          <p className="mt-2 text-xs text-gray-500">
            Using: <span style={{ fontFamily: getFontFamilyString() }}>{selectedGoogleFont}</span>
          </p>
        )}
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

