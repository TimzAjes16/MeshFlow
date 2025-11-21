import { X, Filter } from 'lucide-react';
import { useMeshStore } from '../store/useMeshStore';
import { useState } from 'react';

interface FilterPanelProps {
  onClose: () => void;
}

const FilterPanel = ({ onClose }: FilterPanelProps) => {
  const { filterOptions, setFilterOptions } = useMeshStore();
  const [localOptions, setLocalOptions] = useState(filterOptions);

  const handleApply = () => {
    setFilterOptions(localOptions);
    onClose();
  };

  const handleReset = () => {
    const defaultOptions = {
      hideOld: false,
      hideUnrelated: false,
      hideLowImportance: false,
      minImportance: 0.1,
      daysOld: 30,
    };
    setLocalOptions(defaultOptions);
    setFilterOptions(defaultOptions);
  };

  return (
    <div className="absolute top-16 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-40">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filter Nodes</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Hide Old Nodes */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localOptions.hideOld}
              onChange={(e) =>
                setLocalOptions({ ...localOptions, hideOld: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Hide old nodes</span>
          </label>
          {localOptions.hideOld && (
            <div className="mt-2 ml-6">
              <label className="text-xs text-gray-600">
                Older than{' '}
                <input
                  type="number"
                  value={localOptions.daysOld}
                  onChange={(e) =>
                    setLocalOptions({
                      ...localOptions,
                      daysOld: parseInt(e.target.value) || 30,
                    })
                  }
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                  min="1"
                />{' '}
                days
              </label>
            </div>
          )}
        </div>

        {/* Hide Low Importance */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localOptions.hideLowImportance}
              onChange={(e) =>
                setLocalOptions({
                  ...localOptions,
                  hideLowImportance: e.target.checked,
                })
              }
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Hide low importance nodes</span>
          </label>
          {localOptions.hideLowImportance && (
            <div className="mt-2 ml-6">
              <label className="text-xs text-gray-600">
                Minimum importance:{' '}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={localOptions.minImportance}
                  onChange={(e) =>
                    setLocalOptions({
                      ...localOptions,
                      minImportance: parseFloat(e.target.value),
                    })
                  }
                  className="w-24"
                />
                <span className="ml-2">{(localOptions.minImportance * 100).toFixed(0)}%</span>
              </label>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;

