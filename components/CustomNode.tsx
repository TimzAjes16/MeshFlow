import { memo } from 'react';
import { Handle, Position } from 'reactflow';

interface CustomNodeProps {
  data: {
    label: string;
    content?: string;
    highlighted?: boolean;
  };
  selected?: boolean;
}

function CustomNode({ data, selected }: CustomNodeProps) {
  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[150px] max-w-[250px] ${
        data.highlighted
          ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400'
          : selected
          ? 'bg-white border-blue-400 dark:bg-gray-800 dark:border-blue-500'
          : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
      }`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div>
        <div className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
          {data.label}
        </div>
        {data.content && (
          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {data.content}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(CustomNode);

