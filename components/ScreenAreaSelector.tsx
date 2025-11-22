/**
 * Screen Area Selector Component
 * Allows users to select a specific area on the screen to monitor
 * Similar to screenshot tools where you draw a box to select an area
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X } from 'lucide-react';

interface ScreenAreaSelectorProps {
  isOpen: boolean;
  onSelect: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

export default function ScreenAreaSelector({ isOpen, onSelect, onCancel }: ScreenAreaSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsSelecting(false);
      setStartPos(null);
      setCurrentPos(null);
    }
  }, [isOpen]);

  // Handle mouse down - start selecting area
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelecting(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Handle mouse move - update selection area
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !startPos) return;
    setCurrentPos({ x: e.clientX, y: e.clientY });
  }, [isSelecting, startPos]);

  // Handle mouse up - finish selecting area
  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !startPos || !currentPos) return;
    
    setIsSelecting(false);
    
    // Calculate selection area
    const x = Math.min(startPos.x, currentPos.x);
    const y = Math.min(startPos.y, currentPos.y);
    const width = Math.abs(currentPos.x - startPos.x);
    const height = Math.abs(currentPos.y - startPos.y);
    
    // Only confirm if area is large enough
    if (width > 50 && height > 50) {
      onSelect({ x, y, width, height });
    }
    
    setStartPos(null);
    setCurrentPos(null);
  }, [isSelecting, startPos, currentPos, onSelect]);

  // Calculate selection area for display
  const selectionArea = startPos && currentPos
    ? {
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        width: Math.abs(currentPos.x - startPos.x),
        height: Math.abs(currentPos.y - startPos.y),
      }
    : null;

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] bg-black/30 cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ userSelect: 'none' }}
    >
      {/* Instructions */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-50">
        <p className="text-sm font-medium text-black mb-1">Select area to monitor</p>
        <p className="text-xs text-black">Click and drag to draw a box around the area you want to track</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-black" />
        </button>
      </div>

      {/* Selection overlay */}
      {selectionArea && (
        <>
          {/* Dark overlay with hole */}
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none"
            style={{
              left: `${selectionArea.x}px`,
              top: `${selectionArea.y}px`,
              width: `${selectionArea.width}px`,
              height: `${selectionArea.height}px`,
            }}
          >
            <div className="absolute -top-6 left-0 text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
              {Math.round(selectionArea.width)} × {Math.round(selectionArea.height)}px
            </div>
          </div>

          {/* Confirm button */}
          {!isSelecting && selectionArea.width > 50 && selectionArea.height > 50 && (
            <div
              className="absolute bg-white rounded-lg shadow-lg p-2 flex items-center gap-2 z-50"
              style={{
                left: `${selectionArea.x + selectionArea.width / 2}px`,
                top: `${selectionArea.y + selectionArea.height + 10}px`,
                transform: 'translateX(-50%)',
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selectionArea);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                Monitor This Area
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setStartPos(null);
                  setCurrentPos(null);
                }}
                className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

