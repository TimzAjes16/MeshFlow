/**
 * Capture Modal Component
 * Inspired by Aries Infinite - allows users to capture and crop areas of screenshots
 * for live tracking on canvas
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Crop, Check } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => void;
  isLiveCapture?: boolean; // If true, show screen capture preview instead of upload/paste
  onScreenCapture?: (area: { x: number; y: number; width: number; height: number }, stream: MediaStream) => void; // Callback for screen area selection with stream
  captureMode?: 'fullscreen' | 'custom'; // Capture mode: fullscreen or custom area
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CaptureModal({ isOpen, onClose, onCapture, isLiveCapture = false, onScreenCapture, captureMode = 'custom' }: CaptureModalProps) {
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check browser support for screen capture
  const isScreenCaptureSupported = useCallback(() => {
    return typeof navigator !== 'undefined' && 
           navigator.mediaDevices && 
           typeof navigator.mediaDevices.getDisplayMedia === 'function';
  }, []);

  // Handle starting screen capture for live monitoring
  const handleStartScreenCapture = useCallback(async () => {
    try {
      console.log('Starting screen capture...');
      
      // Check if getDisplayMedia is available
      if (!isScreenCaptureSupported()) {
        const error = new Error('Screen capture is not supported in this browser.');
        (error as any).name = 'NotSupportedError';
        throw error;
      }

      // Try with more permissive constraints that work across browsers
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // Remove displaySurface constraint as it's not supported in all browsers
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        } as any,
        audio: false,
      });

      console.log('Screen capture stream obtained:', stream);
      setScreenStream(stream);
      (window as any).currentScreenStream = stream;

      // Use video element for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;

        const handleLoadedMetadata = () => {
          if (videoRef.current) {
            const width = videoRef.current.videoWidth;
            const height = videoRef.current.videoHeight;
            console.log('Video dimensions:', width, height);
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
            setIsCropping(true);
          }
        };

        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoRef.current.play().catch((err) => {
          console.error('Error playing video:', err);
        });
      }
      
      // Handle stream end
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen capture stream ended');
        setScreenStream(null);
        setIsCropping(false);
        delete (window as any).currentScreenStream;
        onClose();
      });
    } catch (error: any) {
      console.error('Error starting screen capture:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to start screen capture. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow screen sharing when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No screen source found.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      // Show error and close modal
      setError(errorMessage);
      setScreenStream(null);
      delete (window as any).currentScreenStream;
      
      // Close modal after showing error
      setTimeout(() => {
        alert(errorMessage);
        onClose();
      }, 100);
    }
  }, [onClose, isScreenCaptureSupported]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsCropping(false);
      setCropArea(null);
      setIsDrawing(false);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setStartPos(null);
      setCurrentPos(null);
      setDragOffset(null);
      setError(null);
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      delete (window as any).currentScreenStream;
    } else if (isLiveCapture && isOpen && !screenStream) {
      // If this is for live capture, check support first
      if (!isScreenCaptureSupported()) {
        setError('Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.');
        setTimeout(() => {
          alert('Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.');
          onClose();
        }, 100);
        return;
      }
      // Immediately start screen capture if supported
      handleStartScreenCapture();
    }
  }, [isOpen, isLiveCapture, screenStream, handleStartScreenCapture, isScreenCaptureSupported, onClose]);

  // Check if point is within crop area
  const isPointInCropArea = useCallback((x: number, y: number, area: CropArea, scaleX: number, scaleY: number, offsetX: number, offsetY: number) => {
    const left = offsetX + (area.x * scaleX);
    const top = offsetY + (area.y * scaleY);
    const right = left + (area.width * scaleX);
    const bottom = top + (area.height * scaleY);
    return x >= left && x <= right && y >= top && y <= bottom;
  }, []);

  // Check if point is on resize handle
  const getResizeHandle = useCallback((x: number, y: number, area: CropArea, scaleX: number, scaleY: number, offsetX: number, offsetY: number): 'nw' | 'ne' | 'sw' | 'se' | null => {
    const handleSize = 10;
    const left = offsetX + (area.x * scaleX);
    const top = offsetY + (area.y * scaleY);
    const right = left + (area.width * scaleX);
    const bottom = top + (area.height * scaleY);
    
    // Check corners
    if (Math.abs(x - left) < handleSize && Math.abs(y - top) < handleSize) return 'nw';
    if (Math.abs(x - right) < handleSize && Math.abs(y - top) < handleSize) return 'ne';
    if (Math.abs(x - left) < handleSize && Math.abs(y - bottom) < handleSize) return 'sw';
    if (Math.abs(x - right) < handleSize && Math.abs(y - bottom) < handleSize) return 'se';
    
    return null;
  }, []);

  // Calculate crop area from mouse coordinates (in image/video coordinates)
  const calculateCropArea = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!videoRef.current) return null;

    const elementRect = videoRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to element coordinates
    const x1 = start.x - elementRect.left;
    const y1 = start.y - elementRect.top;
    const x2 = end.x - elementRect.left;
    const y2 = end.y - elementRect.top;
    
    // Get actual video dimensions
    const elementWidth = videoRef.current.videoWidth;
    const elementHeight = videoRef.current.videoHeight;
    
    // Scale coordinates based on display vs actual dimensions
    const scaleX = elementWidth / elementRect.width;
    const scaleY = elementHeight / elementRect.height;
    
    // Convert to actual element coordinates
    const actualX1 = x1 * scaleX;
    const actualY1 = y1 * scaleY;
    const actualX2 = x2 * scaleX;
    const actualY2 = y2 * scaleY;
    
    // Ensure coordinates are within element bounds
    const clampedX1 = Math.max(0, Math.min(elementWidth, actualX1));
    const clampedY1 = Math.max(0, Math.min(elementHeight, actualY1));
    const clampedX2 = Math.max(0, Math.min(elementWidth, actualX2));
    const clampedY2 = Math.max(0, Math.min(elementHeight, actualY2));

    const x = Math.min(clampedX1, clampedX2);
    const y = Math.min(clampedY1, clampedY2);
    const width = Math.abs(clampedX2 - clampedX1);
    const height = Math.abs(clampedY2 - clampedY1);

    return { x, y, width, height };
  }, []);

  // Handle mouse down - start drawing, dragging, or resizing crop area
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!videoRef.current || !containerRef.current || !cropArea) {
      // If no crop area exists, start drawing a new one
      if (isCropping && videoRef.current) {
        setStartPos({ x: e.clientX, y: e.clientY });
        setCurrentPos({ x: e.clientX, y: e.clientY });
        setIsDrawing(true);
      }
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const elementRect = videoRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = elementRect.left - containerRect.left;
    const offsetY = elementRect.top - containerRect.top;
    const scaleX = elementRect.width / videoRef.current.videoWidth;
    const scaleY = elementRect.height / videoRef.current.videoHeight;
    
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Check if clicking on resize handle
    const handle = getResizeHandle(mouseX, mouseY, cropArea, scaleX, scaleY, offsetX, offsetY);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setStartPos({ x: e.clientX, y: e.clientY });
      setCurrentPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Check if clicking inside crop area (for dragging)
    if (isPointInCropArea(mouseX, mouseY, cropArea, scaleX, scaleY, offsetX, offsetY)) {
      setIsDragging(true);
      const cropLeft = offsetX + (cropArea.x * scaleX);
      const cropTop = offsetY + (cropArea.y * scaleY);
      setDragOffset({
        x: mouseX - cropLeft,
        y: mouseY - cropTop,
      });
      setStartPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Otherwise, start drawing a new crop area
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDrawing(true);
  }, [isCropping, cropArea, getResizeHandle, isPointInCropArea]);

  // Document-level mouse move handler for dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing && !isDrawing) return;

    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!videoRef.current || !containerRef.current) return;
      
      const elementRect = videoRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const offsetX = elementRect.left - containerRect.left;
      const offsetY = elementRect.top - containerRect.top;
      const scaleX = elementRect.width / videoRef.current.videoWidth;
      const scaleY = elementRect.height / videoRef.current.videoHeight;
      
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      // Handle resizing
      if (isResizing && cropArea && resizeHandle && startPos) {
        const deltaX = (e.clientX - startPos.x) / scaleX;
        const deltaY = (e.clientY - startPos.y) / scaleY;
        
        let newArea = { ...cropArea };
        
        switch (resizeHandle) {
          case 'nw':
            newArea.x = Math.max(0, cropArea.x + deltaX);
            newArea.y = Math.max(0, cropArea.y + deltaY);
            newArea.width = Math.max(50, cropArea.width - deltaX);
            newArea.height = Math.max(50, cropArea.height - deltaY);
            break;
          case 'ne':
            newArea.y = Math.max(0, cropArea.y + deltaY);
            newArea.width = Math.max(50, cropArea.width + deltaX);
            newArea.height = Math.max(50, cropArea.height - deltaY);
            break;
          case 'sw':
            newArea.x = Math.max(0, cropArea.x + deltaX);
            newArea.width = Math.max(50, cropArea.width - deltaX);
            newArea.height = Math.max(50, cropArea.height + deltaY);
            break;
          case 'se':
            newArea.width = Math.max(50, cropArea.width + deltaX);
            newArea.height = Math.max(50, cropArea.height + deltaY);
            break;
        }
        
        // Ensure within bounds
        const maxX = videoRef.current.videoWidth - newArea.width;
        const maxY = videoRef.current.videoHeight - newArea.height;
        newArea.x = Math.max(0, Math.min(maxX, newArea.x));
        newArea.y = Math.max(0, Math.min(maxY, newArea.y));
        
        setCropArea(newArea);
        setStartPos({ x: e.clientX, y: e.clientY });
        return;
      }
      
      // Handle dragging
      if (isDragging && cropArea && dragOffset) {
        const newX = (mouseX - dragOffset.x - offsetX) / scaleX;
        const newY = (mouseY - dragOffset.y - offsetY) / scaleY;
        
        // Ensure within bounds
        const maxX = videoRef.current.videoWidth - cropArea.width;
        const maxY = videoRef.current.videoHeight - cropArea.height;
        
        const clampedX = Math.max(0, Math.min(maxX, newX));
        const clampedY = Math.max(0, Math.min(maxY, newY));
        
        setCropArea({
          ...cropArea,
          x: clampedX,
          y: clampedY,
        });
        return;
      }
      
      // Handle drawing new crop area
      if (isDrawing && startPos) {
        const area = calculateCropArea(startPos, { x: e.clientX, y: e.clientY });
        if (area) setCropArea(area);
      }
    };

    const handleDocumentMouseUp = () => {
      if (isDrawing && startPos && currentPos) {
        const area = calculateCropArea(startPos, currentPos);
        if (area && area.width > 10 && area.height > 10) {
          setCropArea(area);
        }
      }
      
      setIsDrawing(false);
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      setStartPos(null);
      setCurrentPos(null);
      setDragOffset(null);
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
      document.removeEventListener('mouseup', handleDocumentMouseUp);
    };
  }, [isDrawing, isDragging, isResizing, startPos, currentPos, cropArea, resizeHandle, dragOffset, calculateCropArea]);

  // Handle mouse move - update crop area (drawing, dragging, or resizing)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!videoRef.current || !containerRef.current) return;
    
    const elementRect = videoRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = elementRect.left - containerRect.left;
    const offsetY = elementRect.top - containerRect.top;
    const scaleX = elementRect.width / videoRef.current.videoWidth;
    const scaleY = elementRect.height / videoRef.current.videoHeight;
    
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Handle resizing
    if (isResizing && cropArea && resizeHandle && startPos) {
      const deltaX = (e.clientX - startPos.x) / scaleX;
      const deltaY = (e.clientY - startPos.y) / scaleY;
      
      let newArea = { ...cropArea };
      
      switch (resizeHandle) {
        case 'nw':
          newArea.x = Math.max(0, cropArea.x + deltaX);
          newArea.y = Math.max(0, cropArea.y + deltaY);
          newArea.width = Math.max(50, cropArea.width - deltaX);
          newArea.height = Math.max(50, cropArea.height - deltaY);
          break;
        case 'ne':
          newArea.y = Math.max(0, cropArea.y + deltaY);
          newArea.width = Math.max(50, cropArea.width + deltaX);
          newArea.height = Math.max(50, cropArea.height - deltaY);
          break;
        case 'sw':
          newArea.x = Math.max(0, cropArea.x + deltaX);
          newArea.width = Math.max(50, cropArea.width - deltaX);
          newArea.height = Math.max(50, cropArea.height + deltaY);
          break;
        case 'se':
          newArea.width = Math.max(50, cropArea.width + deltaX);
          newArea.height = Math.max(50, cropArea.height + deltaY);
          break;
      }
      
      // Ensure within bounds
      const maxX = videoRef.current.videoWidth - newArea.width;
      const maxY = videoRef.current.videoHeight - newArea.height;
      newArea.x = Math.max(0, Math.min(maxX, newArea.x));
      newArea.y = Math.max(0, Math.min(maxY, newArea.y));
      
      setCropArea(newArea);
      setStartPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Handle dragging
    if (isDragging && cropArea && dragOffset) {
      const newX = (mouseX - dragOffset.x - offsetX) / scaleX;
      const newY = (mouseY - dragOffset.y - offsetY) / scaleY;
      
      // Ensure within bounds
      const maxX = videoRef.current.videoWidth - cropArea.width;
      const maxY = videoRef.current.videoHeight - cropArea.height;
      
      const clampedX = Math.max(0, Math.min(maxX, newX));
      const clampedY = Math.max(0, Math.min(maxY, newY));
      
      setCropArea({
        ...cropArea,
        x: clampedX,
        y: clampedY,
      });
      return;
    }
    
    // Handle drawing new crop area
    if (isDrawing && startPos) {
      setCurrentPos({ x: e.clientX, y: e.clientY });
      const area = calculateCropArea(startPos, { x: e.clientX, y: e.clientY });
      if (area) setCropArea(area);
    }
  }, [isDrawing, isDragging, isResizing, startPos, cropArea, resizeHandle, dragOffset, calculateCropArea]);

  // Handle mouse up - finish drawing, dragging, or resizing crop area
  const handleMouseUp = useCallback(() => {
    if (isDrawing && startPos && currentPos) {
      // Calculate crop area in video coordinates
      const area = calculateCropArea(startPos, currentPos);
      if (area && area.width > 10 && area.height > 10) {
        setCropArea(area);
      }
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setStartPos(null);
    setCurrentPos(null);
    setDragOffset(null);
  }, [isDrawing, isDragging, isResizing, startPos, currentPos, calculateCropArea]);

  // Handle confirm - crop image and create node
  const handleConfirm = useCallback(async () => {
    if (!cropArea) return;

    // If this is live capture with screen stream, capture from video
    if (isLiveCapture && screenStream && videoRef.current) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        
        // Wait for video to be ready
        if (video.readyState < 2) {
          await new Promise((resolve) => {
            video.addEventListener('loadeddata', resolve, { once: true });
            // Timeout after 2 seconds
            setTimeout(resolve, 2000);
          });
        }
        
        ctx.drawImage(
          video,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );
        
        const croppedImageUrl = canvas.toDataURL('image/png');
        
        // If onScreenCapture is provided, use it (for starting monitoring)
        if (onScreenCapture) {
          onScreenCapture(cropArea);
          // Store the image URL in window for parent to access
          (window as any).lastCapturedImageUrl = croppedImageUrl;
        } else {
          // Otherwise, just call onCapture with the image
          onCapture(croppedImageUrl, cropArea);
          onClose();
        }
      } catch (error) {
        console.error('Error capturing from video stream:', error);
        alert('Failed to capture from screen. Please try again.');
      }
      return;
    }

  }, [cropArea, onCapture, onClose, isLiveCapture, onScreenCapture, screenStream]);


  // Get current crop area for display
  const displayCropArea = cropArea;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">Live Capture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error ? (
            <div className="text-center py-12">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          ) : !screenStream ? (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 text-black mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-semibold text-black mb-2">
                Requesting Screen Capture Permission
              </h3>
              <p className="text-sm text-black">
                Please allow screen sharing in your browser to continue.
              </p>
            </div>
          ) : (
            // Crop section - show video with draggable/resizable selection
            <div className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-black">
                  Drag the selection box to move it, or drag the corners to resize. Click outside to create a new selection.
                </p>
              </div>
              
              <div
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-100"
                onMouseDown={handleMouseDown}
                style={{ cursor: isDrawing ? 'crosshair' : isDragging ? 'move' : isResizing ? 'nwse-resize' : 'default' }}
              >
                {/* Show video for live capture */}
                {videoRef.current && screenStream && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-w-full h-auto block"
                    style={{ display: 'block', maxHeight: '70vh' }}
                  />
                )}
                
                {/* Crop area overlay with resize handles */}
                {displayCropArea && videoRef.current && containerRef.current && (
                  (() => {
                    const elementRect = videoRef.current.getBoundingClientRect();
                    const containerRect = containerRef.current.getBoundingClientRect();
                    const offsetX = elementRect.left - containerRect.left;
                    const offsetY = elementRect.top - containerRect.top;
                    
                    const scaleX = elementRect.width / videoRef.current.videoWidth;
                    const scaleY = elementRect.height / videoRef.current.videoHeight;
                    
                    const left = offsetX + (displayCropArea.x * scaleX);
                    const top = offsetY + (displayCropArea.y * scaleY);
                    const width = displayCropArea.width * scaleX;
                    const height = displayCropArea.height * scaleY;
                    
                    return (
                      <div
                        className="absolute border-2 border-blue-500 bg-blue-500/20 z-10"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                          cursor: isDragging ? 'move' : 'default',
                        }}
                      >
                        {/* Size label */}
                        <div className="absolute -top-6 left-0 text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
                          {Math.round(displayCropArea.width)} × {Math.round(displayCropArea.height)}px
                        </div>
                        
                        {/* Resize handles */}
                        <div
                          className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize"
                          style={{ cursor: 'nwse-resize' }}
                        />
                        <div
                          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize"
                          style={{ cursor: 'nesw-resize' }}
                        />
                        <div
                          className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize"
                          style={{ cursor: 'nesw-resize' }}
                        />
                        <div
                          className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize"
                          style={{ cursor: 'nwse-resize' }}
                        />
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {screenStream && cropArea && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200">
            {cropArea && (
              <div className="text-sm text-black font-mono">
                {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px
                {captureMode === 'fullscreen' && (
                  <span className="ml-2 text-xs text-black">(Full Screen)</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-black hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!cropArea || (cropArea.width < 50 || cropArea.height < 50)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                <Check className="w-5 h-5" />
                Start Live Feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

