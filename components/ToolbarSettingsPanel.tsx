'use client';

import { useState } from 'react';
import { Type, FileText, Link2, Image as ImageIcon, Square, Circle, Palette, Type as FontIcon } from 'lucide-react';

interface ToolbarSettingsPanelProps {
  selectedNodeType: string | null;
  onClose: () => void;
}

interface NodeTypeConfig {
  id: string;
  label: string;
  icon: any;
  settings: {
    fontSize?: { label: string; options: string[] };
    fontWeight?: { label: string; options: string[] };
    color?: { label: string; options: string[] };
    style?: { label: string; options: string[] };
  };
}

const nodeTypeConfigs: Record<string, NodeTypeConfig> = {
  text: {
    id: 'text',
    label: 'Text Block',
    icon: Type,
    settings: {
      fontSize: {
        label: 'Font Size',
        options: ['12px', '14px', '16px', '18px', '20px', '24px'],
      },
      fontWeight: {
        label: 'Font Weight',
        options: ['Normal', 'Medium', 'Semibold', 'Bold'],
      },
      color: {
        label: 'Text Color',
        options: ['slate', 'gray', 'blue', 'purple', 'green', 'red'],
      },
    },
  },
  note: {
    id: 'note',
    label: 'Note',
    icon: FileText,
    settings: {
      fontSize: {
        label: 'Font Size',
        options: ['12px', '14px', '16px'],
      },
      fontWeight: {
        label: 'Font Weight',
        options: ['Normal', 'Medium', 'Semibold'],
      },
    },
  },
  link: {
    id: 'link',
    label: 'Link',
    icon: Link2,
    settings: {
      color: {
        label: 'Link Color',
        options: ['blue', 'purple', 'green', 'red'],
      },
      style: {
        label: 'Style',
        options: ['Underline', 'Button', 'Icon'],
      },
    },
  },
  image: {
    id: 'image',
    label: 'Image',
    icon: ImageIcon,
    settings: {
      style: {
        label: 'Size',
        options: ['Small', 'Medium', 'Large', 'Full Width'],
      },
    },
  },
  box: {
    id: 'box',
    label: 'Box',
    icon: Square,
    settings: {
      color: {
        label: 'Background Color',
        options: ['white', 'blue', 'purple', 'green', 'yellow', 'red'],
      },
      style: {
        label: 'Border Style',
        options: ['None', 'Solid', 'Dashed', 'Dotted'],
      },
    },
  },
  circle: {
    id: 'circle',
    label: 'Circle',
    icon: Circle,
    settings: {
      color: {
        label: 'Fill Color',
        options: ['blue', 'purple', 'green', 'yellow', 'red', 'gray'],
      },
      style: {
        label: 'Size',
        options: ['Small', 'Medium', 'Large'],
      },
    },
  },
  'bar-chart': {
    id: 'bar-chart',
    label: 'Bar Chart',
    icon: Type,
    settings: {
      style: {
        label: 'Chart Size',
        options: ['Small (300x200)', 'Medium (400x300)', 'Large (500x400)'],
      },
      color: {
        label: 'Color Scheme',
        options: ['Blue', 'Purple', 'Green', 'Rainbow'],
      },
    },
  },
  'line-chart': {
    id: 'line-chart',
    label: 'Line Chart',
    icon: Type,
    settings: {
      style: {
        label: 'Chart Size',
        options: ['Small (300x200)', 'Medium (400x300)', 'Large (500x400)'],
      },
      color: {
        label: 'Line Color',
        options: ['Blue', 'Purple', 'Green', 'Red'],
      },
    },
  },
  'pie-chart': {
    id: 'pie-chart',
    label: 'Pie Chart',
    icon: Type,
    settings: {
      style: {
        label: 'Chart Size',
        options: ['Small (300x200)', 'Medium (400x300)', 'Large (500x400)'],
      },
      color: {
        label: 'Color Scheme',
        options: ['Pastel', 'Vibrant', 'Monochrome'],
      },
    },
  },
  'area-chart': {
    id: 'area-chart',
    label: 'Area Chart',
    icon: Type,
    settings: {
      style: {
        label: 'Chart Size',
        options: ['Small (300x200)', 'Medium (400x300)', 'Large (500x400)'],
      },
      color: {
        label: 'Fill Color',
        options: ['Blue', 'Purple', 'Green', 'Gradient'],
      },
    },
  },
};

export default function ToolbarSettingsPanel({ selectedNodeType, onClose }: ToolbarSettingsPanelProps) {
  const [settings, setSettings] = useState<Record<string, string>>({});

  if (!selectedNodeType) {
    return (
      <div className="flex h-full flex-col bg-white">
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FontIcon className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-lg font-semibold text-black mb-2">
              Nothing selected
            </h3>
            <p className="text-sm text-black mb-4">
              Select a node type from the toolbar to edit its settings
            </p>
            <div className="text-xs text-black space-y-1 pt-4 border-t border-gray-200">
              <p>💡 Tip: Double-click the canvas to see node type options</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const config = nodeTypeConfigs[selectedNodeType];
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="flex h-full flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-black" />
          <h2 className="text-sm font-semibold text-black">{config.label} Settings</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded text-black hover:text-black"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(config.settings).map(([key, setting]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-black mb-2">
              {setting.label}
            </label>
            <div className="space-y-2">
              {setting.options.map((option) => {
                const isSelected = settings[key] === option || (!settings[key] && option === setting.options[0]);
                return (
                  <button
                    key={option}
                    onClick={() => handleSettingChange(key, option)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-black'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Preview Section */}
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-xs font-medium text-black mb-2">
            Preview
          </label>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-black">
              Preview will appear here based on your settings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

