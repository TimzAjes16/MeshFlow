/**
 * Base Widget Component
 * All widgets inherit from this base component for consistent behavior
 * Provides: drag, resize, dock, minimize, close functionality
 */

'use client';

import React, { memo, useRef, useState, useCallback, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { useResize } from './useResize';

// Global tracking of nodes being resized (more reliable than DOM attributes)
const resizingNodes = new Set<string>();

// Expose to window for CanvasContainer to access
if (typeof window !== 'undefined') {
  (window as any).__resizingNodes = resizingNodes;
}

// Export function to check if a node is being resized
export function isNodeResizing(nodeId: string): boolean {
  return resizingNodes.has(nodeId);
}

export interface WidgetProps extends NodeProps {
  data: {
    node: NodeType;
  };
  onResize?: (width: number, height: number) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  onTitleChange?: (title: string) => void;
  isDocked?: boolean;
  canResize?: boolean;
  canMinimize?: boolean;
  canClose?: boolean;
  width?: number;
  height?: number;
}

interface BaseWidgetProps extends WidgetProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Base Widget - Provides common widget functionality
 * All widget types should wrap their content with this component
 */
function BaseWidget({
  data,
  selected,
  children,
  title,
  icon,
  className = '',
  onResize,
  onMinimize,
  onClose,
  onTitleChange,
  isDocked = false,
  canResize = true,
  canMinimize = true,
  canClose = true,
  width,
  height,
}: BaseWidgetProps) {
  const { node } = data;
  const [isMinimized, setIsMinimized] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  
  // Use the custom resize hook
  const { isResizing, handleResizeStart, resizeHandleRef } = useResize({
    minWidth: 200,
    minHeight: 150,
    onResize,
    enabled: canResize,
  });
  
  // Track resizing state globally for React Flow
  useEffect(() => {
    if (isResizing) {
      resizingNodes.add(node.id);
    } else {
      resizingNodes.delete(node.id);
    }
    return () => {
      resizingNodes.delete(node.id);
    };
  }, [isResizing, node.id]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  }, [isMinimized, onMinimize]);


  const displayTitle = title || node.title || 'New Widget';
  const displayIcon = icon;

  // Handle title editing
  const handleTitleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isResizing) {
      setIsEditingTitle(true);
      setEditingTitle(displayTitle);
    }
  }, [displayTitle, isResizing]);

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
      ref={resizeRef}
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
      onMouseDown={(e) => {
        // Prevent React Flow from handling drag when clicking on widget content
        // Only allow dragging from header (which has data-widget-header attribute)
        // OR if we're resizing
        const target = e.target as HTMLElement;
        if (!target.closest('[data-widget-header]') && 
            !target.closest('[data-resize-handle]') &&
            !target.closest('[data-no-drag]') &&
            !isResizing) {
          e.stopPropagation();
        }
        
        // If resizing, prevent all drag events
        if (isResizing) {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
        }
      }}
    >
      {/* Widget Header */}
      <div
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
              onClick={handleMinimize}
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

      {/* Resize Handle */}
      {canResize && !isMinimized && (
        <div
          ref={resizeHandleRef}
          data-resize-handle
          data-no-drag
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize z-50"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.5) 40%, rgba(59, 130, 246, 0.5) 100%)',
            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
            pointerEvents: 'auto',
          }}
          onMouseDown={(e) => {
            // CRITICAL: Stop all propagation immediately
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            handleResizeStart(e);
          }}
          onMouseEnter={(e) => {
            if (!isResizing) {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.8) 40%, rgba(59, 130, 246, 0.8) 100%)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(59, 130, 246, 0.5) 40%, rgba(59, 130, 246, 0.5) 100%)';
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }}
          onMouseMove={(e) => {
            if (isResizing) {
              e.preventDefault();
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
        />
      )}
    </div>
  );
}

export default memo(BaseWidget);

