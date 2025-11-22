/**
 * Screen Capture Preview Component
 * Similar to Apple's screenshot tool - shows preview and allows cropping before capture
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Maximize2, Minimize2, Move, RotateCw } from 'lucide-react';

interface ScreenCapturePreviewProps {
  isOpen: boolean;
  stream: MediaStream | null;
  onCapture: (area: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ScreenCapturePreview({ isOpen, stream, onCapture, onCancel }: ScreenCapturePreviewProps) {
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Set up video stream
  useEffect(() => {
    if (isOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);

      const handleLoadedMetadata = () => {
        if (videoRef.current) {
          const width = videoRef.current.videoWidth;
          const height = videoRef.current.videoHeight;
          setVideoDimensions({ width, height });
          
          // Initialize crop area to center 60% of screen
          const initialWidth = width * 0.6;
          const initialHeight = height * 0.6;
          setCropArea({
            x: (width - initialWidth) / 2,
            y: (height - initialHeight) / 2,
            width: initialWidth,
            height: initialHeight,
          });
        }
      };

      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, [isOpen, stream]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCropArea(null);
      setIsDragging(false);
      setIsResizing(false);
      setDragStart(null);
      setResizeHandle(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [isOpen]);

  // Handle mouse down - start drag or resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cropArea || !overlayRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on resize handle
    const handleSize = 8;
    const { x: areaX, y: areaY, width, height } = cropArea;

    // Check corners and edges
    if (Math.abs(x - areaX) < handleSize && Math.abs(y - areaY) < handleSize) {
      // Top-left
      setIsResizing(true);
      setResizeHandle('nw');
    } else if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - areaY) < handleSize) {
      // Top-right
      setIsResizing(true);
      setResizeHandle('ne');
    } else if (Math.abs(x - areaX) < handleSize && Math.abs(y - (areaY + height)) < handleSize) {
      // Bottom-left
      setIsResizing(true);
      setResizeHandle('sw');
    } else if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - (areaY + height)) < handleSize) {
      // Bottom-right
      setIsResizing(true);
      setResizeHandle('se');
    } else if (Math.abs(x - (areaX + width / 2)) < handleSize && Math.abs(y - areaY) < handleSize) {
      // Top
      setIsResizing(true);
      setResizeHandle('n');
    } else if (Math.abs(x - (areaX + width / 2)) < handleSize && Math.abs(y - (areaY + height)) < handleSize) {
      // Bottom
      setIsResizing(true);
      setResizeHandle('s');
    } else if (Math.abs(x - areaX) < handleSize && Math.abs(y - (areaY + height / 2)) < handleSize) {
      // Left
      setIsResizing(true);
      setResizeHandle('w');
    } else if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - (areaY + height / 2)) < handleSize) {
      // Right
      setIsResizing(true);
      setResizeHandle('e');
    } else if (x >= areaX && x <= areaX + width && y >= areaY && y <= areaY + height) {
      // Inside crop area - drag
      setIsDragging(true);
      setDragStart({ x: x - areaX, y: y - areaY });
    } else {
      // Outside - create new crop area
      setCropArea({
        x: Math.max(0, Math.min(x, videoDimensions.width - 50)),
        y: Math.max(0, Math.min(y, videoDimensions.height - 50)),
        width: Math.min(200, videoDimensions.width - Math.max(0, Math.min(x, videoDimensions.width - 50))),
        height: Math.min(200, videoDimensions.height - Math.max(0, Math.min(y, videoDimensions.height - 50))),
      });
    }
  }, [cropArea, videoDimensions]);

  // Handle mouse move - update drag or resize
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cropArea || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragStart) {
      // Drag crop area
      const newX = Math.max(0, Math.min(x - dragStart.x, videoDimensions.width - cropArea.width));
      const newY = Math.max(0, Math.min(y - dragStart.y, videoDimensions.height - cropArea.height));
      setCropArea({
        ...cropArea,
        x: newX,
        y: newY,
      });
    } else if (isResizing && resizeHandle) {
      // Resize crop area
      let newArea = { ...cropArea };
      
      if (resizeHandle.includes('n')) {
        const newY = Math.max(0, Math.min(y, cropArea.y + cropArea.height - 50));
        newArea.height = cropArea.y + cropArea.height - newY;
        newArea.y = newY;
      }
      if (resizeHandle.includes('s')) {
        newArea.height = Math.max(50, Math.min(y - cropArea.y, videoDimensions.height - cropArea.y));
      }
      if (resizeHandle.includes('w')) {
        const newX = Math.max(0, Math.min(x, cropArea.x + cropArea.width - 50));
        newArea.width = cropArea.x + cropArea.width - newX;
        newArea.x = newX;
      }
      if (resizeHandle.includes('e')) {
        newArea.width = Math.max(50, Math.min(x - cropArea.x, videoDimensions.width - cropArea.x));
      }
      
      setCropArea(newArea);
    }
  }, [cropArea, isDragging, isResizing, dragStart, resizeHandle, videoDimensions]);

  // Handle mouse up - end drag or resize
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
    setResizeHandle(null);
  }, []);

  // Full screen button
  const handleFullScreen = useCallback(() => {
    if (!cropArea || videoDimensions.width === 0 || videoDimensions.height === 0) return;
    setCropArea({
      x: 0,
      y: 0,
      width: videoDimensions.width,
      height: videoDimensions.height,
    });
  }, [cropArea, videoDimensions]);

  // Get cursor style
  const getCursorStyle = (e: React.MouseEvent): string => {
    if (!cropArea || !overlayRef.current) return 'crosshair';
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { x: areaX, y: areaY, width, height } = cropArea;
    const handleSize = 12;

    // Check if over resize handle
    if (Math.abs(x - areaX) < handleSize && Math.abs(y - areaY) < handleSize) return 'nwse-resize';
    if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - areaY) < handleSize) return 'nesw-resize';
    if (Math.abs(x - areaX) < handleSize && Math.abs(y - (areaY + height)) < handleSize) return 'nesw-resize';
    if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - (areaY + height)) < handleSize) return 'nwse-resize';
    if (Math.abs(x - (areaX + width / 2)) < handleSize && Math.abs(y - areaY) < handleSize) return 'ns-resize';
    if (Math.abs(x - (areaX + width / 2)) < handleSize && Math.abs(y - (areaY + height)) < handleSize) return 'ns-resize';
    if (Math.abs(x - areaX) < handleSize && Math.abs(y - (areaY + height / 2)) < handleSize) return 'ew-resize';
    if (Math.abs(x - (areaX + width)) < handleSize && Math.abs(y - (areaY + height / 2)) < handleSize) return 'ew-resize';
    
    // Check if over crop area
    if (x >= areaX && x <= areaX + width && y >= areaY && y <= areaY + height) {
      return isDragging ? 'grabbing' : 'move';
    }
    
    return 'crosshair';
  };

  if (!isOpen || !stream) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* Preview Container */}
        <div
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
        >
          {/* Video Preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="block max-w-full max-h-[90vh] w-auto h-auto"
            style={{ display: 'block' }}
          />

          {/* Overlay for crop area */}
          {videoDimensions.width > 0 && (
            <div
              ref={overlayRef}
              className="absolute inset-0"
              onMouseDown={handleMouseDown}
              onMouseMove={(e) => {
                handleMouseMove(e);
                // Update cursor dynamically
                if (overlayRef.current) {
                  overlayRef.current.style.cursor = getCursorStyle(e);
                }
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ cursor: 'crosshair' }}
            >
              {/* Dark overlay with transparent crop area */}
              <div
                className="absolute inset-0 bg-black/60"
                style={{
                  clipPath: cropArea
                    ? `polygon(0% 0%, 0% 100%, ${(cropArea.x / videoDimensions.width) * 100}% 100%, ${(cropArea.x / videoDimensions.width) * 100}% ${(cropArea.y / videoDimensions.height) * 100}%, ${((cropArea.x + cropArea.width) / videoDimensions.width) * 100}% ${(cropArea.y / videoDimensions.height) * 100}%, ${((cropArea.x + cropArea.width) / videoDimensions.width) * 100}% ${((cropArea.y + cropArea.height) / videoDimensions.height) * 100}%, ${(cropArea.x / videoDimensions.width) * 100}% ${((cropArea.y + cropArea.height) / videoDimensions.height) * 100}%, ${(cropArea.x / videoDimensions.width) * 100}% 100%, 0% 100%)`
                    : 'none',
                }}
              />

              {/* Crop area border and handles */}
              {cropArea && (
                <>
                  {/* Border */}
                  <div
                    className="absolute border-2 border-blue-500 pointer-events-none"
                    style={{
                      left: `${(cropArea.x / videoDimensions.width) * 100}%`,
                      top: `${(cropArea.y / videoDimensions.height) * 100}%`,
                      width: `${(cropArea.width / videoDimensions.width) * 100}%`,
                      height: `${(cropArea.height / videoDimensions.height) * 100}%`,
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                  >
                    {/* Dimensions label */}
                    <div className="absolute -top-7 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-auto">
                      {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px
                    </div>

                    {/* Resize handles */}
                    {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map((handle) => (
                      <div
                        key={handle}
                        className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full"
                        style={{
                          left: handle.includes('w') ? '-6px' : handle.includes('e') ? '100%' : '50%',
                          top: handle.includes('n') ? '-6px' : handle.includes('s') ? '100%' : '50%',
                          transform: 'translate(-50%, -50%)',
                          cursor:
                            handle === 'nw' || handle === 'se' ? 'nwse-resize' :
                            handle === 'ne' || handle === 'sw' ? 'nesw-resize' :
                            handle === 'n' || handle === 's' ? 'ns-resize' :
                            'ew-resize',
                        }}
                      />
                    ))}

                    {/* Center indicator (when dragging) */}
                    {isDragging && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-12 h-12 border-2 border-white/50 rounded-full flex items-center justify-center">
                          <Move className="w-6 h-6 text-white/50" />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleFullScreen}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Full screen"
              >
                <Maximize2 className="w-4 h-4" />
                Full Screen
              </button>
              
              {cropArea && (
                <div className="text-sm text-white/80">
                  {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onCancel}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (cropArea && cropArea.width > 50 && cropArea.height > 50) {
                    onCapture(cropArea);
                  }
                }}
                disabled={!cropArea || cropArea.width < 50 || cropArea.height < 50}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Start Monitoring
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

