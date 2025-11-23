/**
 * Base Widget Component
 * All widgets inherit from this base component for consistent behavior
 * Provides: drag, resize, dock, minimize, close functionality
 */

'use client';

import React, { memo, useRef, useState, useCallback } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';

export interface WidgetProps extends NodeProps {
  data: {
    node: NodeType;
  };
  onResize?: (width: number, height: number) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  isDocked?: boolean;
  canResize?: boolean;
  canMinimize?: boolean;
  canClose?: boolean;
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
  isDocked = false,
  canResize = true,
  canMinimize = true,
  canClose = true,
}: BaseWidgetProps) {
  const { node } = data;
  const [isMinimized, setIsMinimized] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
    onMinimize?.();
  }, [isMinimized, onMinimize]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!canResize || !resizeRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const rect = resizeRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
    });
  }, [canResize]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeStart) return;
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    const newWidth = Math.max(200, resizeStart.width + deltaX);
    const newHeight = Math.max(150, resizeStart.height + deltaY);
    onResize?.(newWidth, newHeight);
  }, [isResizing, resizeStart, onResize]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeStart(null);
  }, []);

  // Handle resize mouse events
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const displayTitle = title || node.title || 'Widget';
  const displayIcon = icon;

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
    >
      {/* Widget Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 cursor-move"
        style={{ userSelect: 'none' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {displayIcon && <div className="flex-shrink-0">{displayIcon}</div>}
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {displayTitle}
          </span>
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
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 transition-colors z-10"
          style={{
            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResizeStart(e);
          }}
        />
      )}
    </div>
  );
}

export default memo(BaseWidget);

