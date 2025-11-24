/**
 * Base Widget Component - Rebuilt from scratch
 * Uses React Flow's built-in NodeResizer for proper resizing
 * All widgets inherit from this base component
 */

'use client';

import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { NodeResizer } from '@reactflow/node-resizer';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import '@reactflow/node-resizer/dist/style.css';

export interface WidgetProps extends NodeProps {
  data: {
    node: NodeType;
  };
  onMinimize?: () => void;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  isDocked?: boolean;
  canResize?: boolean;
  canMinimize?: boolean;
  canClose?: boolean;
}

interface BaseWidgetProps extends Partial<NodeProps> {
  data: {
    node: NodeType;
  };
  selected?: boolean;
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  onMinimize?: () => void;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  isDocked?: boolean;
  canResize?: boolean;
  canMinimize?: boolean;
  canClose?: boolean;
}

function BaseWidget({
  data,
  selected,
  children,
  title,
  icon,
  className = '',
  onMinimize,
  onClose,
  onTitleChange,
  isDocked = false,
  canResize = true,
  canMinimize = true,
  canClose = true,
}: BaseWidgetProps) {
  const { node } = data;
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  }, [isMinimized, onMinimize]);

  const displayTitle = title || node.title || 'New Widget';
  const displayIcon = icon;

  // Handle title editing
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setEditingTitle(displayTitle);
  }, [displayTitle]);

  const handleTitleSave = useCallback(() => {
    if (editingTitle.trim() && editingTitle !== displayTitle) {
      onTitleChange?.(editingTitle.trim());
    }
    setIsEditingTitle(false);
  }, [editingTitle, displayTitle, onTitleChange]);

  const handleTitleCancel = useCallback(() => {
    setIsEditingTitle(false);
    setEditingTitle('');
  }, []);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Save on blur
  const handleTitleBlur = useCallback(() => {
    handleTitleSave();
  }, [handleTitleSave]);

  return (
    <div
      className={`
        relative bg-white dark:bg-gray-800 rounded-lg border-2 shadow-lg
        ${selected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}
        ${isDocked ? 'rounded-t-lg rounded-b-none border-b-0' : ''}
        ${className}
      `}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 200,
        minHeight: 150,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* React Flow NodeResizer - handles all resizing */}
      {canResize && !isMinimized && selected && (
        <NodeResizer
          minWidth={200}
          minHeight={150}
          color="#3b82f6"
          isVisible={selected}
          onResizeEnd={() => {
            // Dispatch event for persistence
            window.dispatchEvent(new CustomEvent('widget-resize-end', { 
              detail: { nodeId: node.id } 
            }));
          }}
        />
      )}

      {/* Widget Header */}
      <div
        data-widget-header
        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-move"
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {displayIcon && <div className="flex-shrink-0">{displayIcon}</div>}
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editingTitle}
              onChange={(e) => {
                e.stopPropagation();
                setEditingTitle(e.target.value);
              }}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-white bg-transparent border-b border-blue-500 outline-none px-1"
              style={{ minWidth: '100px' }}
            />
          ) : (
            <span
              className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-text hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={handleTitleClick}
              title="Click to edit title"
            >
              {displayTitle}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {canMinimize && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleMinimize();
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
          {canClose && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose?.();
              }}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors z-10"
              title="Close"
            >
              <X className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      )}
    </div>
  );
}

export default memo(BaseWidget);
