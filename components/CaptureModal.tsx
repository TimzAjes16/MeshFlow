'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Check } from 'lucide-react';
import { isScreenCaptureSupported, getScreenCaptureStream } from '@/lib/electronUtils';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => void;
  isLiveCapture?: boolean;
  onScreenCapture?: (area: { x: number; y: number; width: number; height: number }, stream: MediaStream) => void;
  captureMode?: 'fullscreen' | 'custom';
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function CaptureModal({
  isOpen,
  onClose,
  onCapture,
  isLiveCapture = false,
  onScreenCapture,
  captureMode = 'custom',
}: CaptureModalProps) {
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

  const handleStartScreenCapture = useCallback(async () => {
    try {
      console.log('Starting screen capture...');
      
      if (!isScreenCaptureSupported()) {
        const error = new Error('Screen capture is not supported.');
        (error as any).name = 'NotSupportedError';
        throw error;
      }

      const stream = await getScreenCaptureStream();

      console.log('Screen capture stream obtained:', stream);
      setScreenStream(stream);
      (window as any).currentScreenStream = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        video.controls = false;
        video.srcObject = stream;
        
        const videoTracks = stream.getVideoTracks();
        console.log('Stream connected to video element:', {
          streamId: stream.id,
          streamActive: stream.active,
          videoTracks: videoTracks.length,
          trackReadyStates: videoTracks.map(t => t.readyState),
          trackSettings: videoTracks[0]?.getSettings(),
        });

        const handleLoadedMetadata = () => {
          if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            const width = video.videoWidth;
            const height = video.videoHeight;
            console.log('Video metadata loaded:', { width, height });
            setVideoDimensions({ width, height });
            
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

        const handleLoadedData = () => {
          console.log('Video data loaded, ready to play');
        };

        const handleCanPlay = () => {
          console.log('Video can start playing');
          if (video.paused) {
            video.play().catch((err) => {
              console.error('Error playing video:', err);
              setError('Failed to play video stream. Please try again.');
            });
          }
        };

        const handlePlay = () => {
          console.log('Video started playing');
        };

        const handleError = (e: Event) => {
          console.error('Video element error:', e);
          const error = (video as HTMLVideoElement).error;
          if (error) {
            console.error('Video error details:', {
              code: error.code,
              message: error.message,
            });
            setError(`Video playback error: ${error.message || 'Unknown error'}`);
          }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('play', handlePlay);
        video.addEventListener('error', handleError);

        video.play().catch((err) => {
          console.warn('Initial play() call failed, will retry on canplay:', err);
        });
      }
      
      stream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('Screen capture stream ended');
        setScreenStream(null);
        setIsCropping(false);
        delete (window as any).currentScreenStream;
        onClose();
      });
    } catch (error: any) {
      console.error('Error starting screen capture:', error);
      
      let errorMessage = error.message || 'Failed to start screen capture. ';
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Screen sharing permission denied. Please allow screen sharing when prompted.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No screen source found.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Screen capture is not supported.';
      } else if (!errorMessage.includes('Failed to start screen capture')) {
        errorMessage = `Failed to start screen capture: ${errorMessage}`;
      }
      
      setError(errorMessage);
      setScreenStream(null);
      delete (window as any).currentScreenStream;
      
      setTimeout(() => {
        alert(errorMessage);
        onClose();
      }, 100);
    }
  }, [onClose]);

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
      
      if (screenStream && !isLiveCapture) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
        delete (window as any).currentScreenStream;
      } else if (screenStream && isLiveCapture) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        delete (window as any).currentScreenStream;
      }
    } else if (isLiveCapture && isOpen && !screenStream) {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.openCaptureWidget) {
        (window as any).electronAPI.openCaptureWidget().catch((error: any) => {
          console.error('Error opening capture widget:', error);
          setError('Failed to open capture widget.');
        });
        
        if ((window as any).electronAPI?.onCaptureSelection) {
          (window as any).electronAPI.onCaptureSelection((selection: { x: number; y: number; width: number; height: number }) => {
            handleCaptureFromSelection(selection);
            onClose();
          });
        }
        
        setTimeout(() => {
          onClose();
        }, 100);
      } else {
        if (!isScreenCaptureSupported()) {
          setError('Screen capture is not supported.');
          setTimeout(() => {
            alert('Screen capture is not supported.');
            onClose();
          }, 100);
          return;
        }
        handleStartScreenCapture();
      }
    }
  }, [isOpen, isLiveCapture, screenStream, handleStartScreenCapture, onClose]);

  const handleCaptureFromSelection = useCallback(async (selection: { x: number; y: number; width: number; height: number }) => {
    try {
      const stream = await getScreenCaptureStream();
      
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      
      await new Promise((resolve) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
        setTimeout(resolve, 1000);
      });
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.width = selection.width;
      canvas.height = selection.height;
      
      if (video.readyState < 2) {
        await new Promise((resolve) => {
          video.addEventListener('loadeddata', resolve, { once: true });
          setTimeout(resolve, 2000);
        });
      }
      
      ctx.drawImage(
        video,
        selection.x, selection.y, selection.width, selection.height,
        0, 0, selection.width, selection.height
      );
      
      const imageUrl = canvas.toDataURL('image/png');
      
      stream.getTracks().forEach(track => track.stop());
      
      onCapture(imageUrl, selection);
      onClose();
    } catch (error) {
      console.error('Error capturing from selection:', error);
      setError('Failed to capture selected area.');
      alert('Failed to capture selected area. Please try again.');
    }
  }, [onCapture, onClose]);

  const isPointInCropArea = useCallback((x: number, y: number, area: CropArea, scaleX: number, scaleY: number, offsetX: number, offsetY: number) => {
    const left = offsetX + (area.x * scaleX);
    const top = offsetY + (area.y * scaleY);
    const right = left + (area.width * scaleX);
    const bottom = top + (area.height * scaleY);
    return x >= left && x <= right && y >= top && y <= bottom;
  }, []);

  const getResizeHandle = useCallback((x: number, y: number, area: CropArea, scaleX: number, scaleY: number, offsetX: number, offsetY: number): 'nw' | 'ne' | 'sw' | 'se' | null => {
    const handleSize = 10;
    const left = offsetX + (area.x * scaleX);
    const top = offsetY + (area.y * scaleY);
    const right = left + (area.width * scaleX);
    const bottom = top + (area.height * scaleY);
    
    if (Math.abs(x - left) < handleSize && Math.abs(y - top) < handleSize) return 'nw';
    if (Math.abs(x - right) < handleSize && Math.abs(y - top) < handleSize) return 'ne';
    if (Math.abs(x - left) < handleSize && Math.abs(y - bottom) < handleSize) return 'sw';
    if (Math.abs(x - right) < handleSize && Math.abs(y - bottom) < handleSize) return 'se';
    
    return null;
  }, []);

  const calculateCropArea = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!videoRef.current) return null;

    const elementRect = videoRef.current.getBoundingClientRect();
    
    const x1 = start.x - elementRect.left;
    const y1 = start.y - elementRect.top;
    const x2 = end.x - elementRect.left;
    const y2 = end.y - elementRect.top;
    
    const elementWidth = videoRef.current.videoWidth;
    const elementHeight = videoRef.current.videoHeight;
    
    const scaleX = elementWidth / elementRect.width;
    const scaleY = elementHeight / elementRect.height;
    
    const actualX1 = x1 * scaleX;
    const actualY1 = y1 * scaleY;
    const actualX2 = x2 * scaleX;
    const actualY2 = y2 * scaleY;
    
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    
    if (!videoRef.current || !containerRef.current) {
      return;
    }
    
    if (!cropArea) {
      if (isCropping) {
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
    
    const handle = getResizeHandle(mouseX, mouseY, cropArea, scaleX, scaleY, offsetX, offsetY);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setStartPos({ x: e.clientX, y: e.clientY });
      setCurrentPos({ x: e.clientX, y: e.clientY });
      setDragOffset(null);
      return;
    }
    
    if (isPointInCropArea(mouseX, mouseY, cropArea, scaleX, scaleY, offsetX, offsetY)) {
      setIsDragging(true);
      const cropLeft = offsetX + (cropArea.x * scaleX);
      const cropTop = offsetY + (cropArea.y * scaleY);
      setDragOffset({
        x: mouseX - cropLeft,
        y: mouseY - cropTop,
      });
      setStartPos({ x: e.clientX, y: e.clientY });
      setCurrentPos({ x: e.clientX, y: e.clientY });
      setResizeHandle(null);
      return;
    }
    
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDrawing(true);
    setDragOffset(null);
    setResizeHandle(null);
  }, [isCropping, cropArea, getResizeHandle, isPointInCropArea]);

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
        
        const maxX = videoRef.current.videoWidth - newArea.width;
        const maxY = videoRef.current.videoHeight - newArea.height;
        newArea.x = Math.max(0, Math.min(maxX, newArea.x));
        newArea.y = Math.max(0, Math.min(maxY, newArea.y));
        
        setCropArea(newArea);
        setStartPos({ x: e.clientX, y: e.clientY });
        return;
      }
      
      if (isDragging && cropArea && dragOffset) {
        const newX = (mouseX - dragOffset.x - offsetX) / scaleX;
        const newY = (mouseY - dragOffset.y - offsetY) / scaleY;
        
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
      
      const maxX = videoRef.current.videoWidth - newArea.width;
      const maxY = videoRef.current.videoHeight - newArea.height;
      newArea.x = Math.max(0, Math.min(maxX, newArea.x));
      newArea.y = Math.max(0, Math.min(maxY, newArea.y));
      
      setCropArea(newArea);
      setStartPos({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (isDragging && cropArea && dragOffset) {
      const newX = (mouseX - dragOffset.x - offsetX) / scaleX;
      const newY = (mouseY - dragOffset.y - offsetY) / scaleY;
      
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
    
    if (isDrawing && startPos) {
      setCurrentPos({ x: e.clientX, y: e.clientY });
      const area = calculateCropArea(startPos, { x: e.clientX, y: e.clientY });
      if (area) setCropArea(area);
    }
  }, [isDrawing, isDragging, isResizing, startPos, cropArea, resizeHandle, dragOffset, calculateCropArea]);

  const handleMouseUp = useCallback(() => {
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
  }, [isDrawing, isDragging, isResizing, startPos, currentPos, calculateCropArea]);

  const handleConfirm = useCallback(async () => {
    if (!cropArea) return;

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
        
        if (video.readyState < 2) {
          await new Promise((resolve) => {
            video.addEventListener('loadeddata', resolve, { once: true });
            setTimeout(resolve, 2000);
          });
        }
        
        ctx.drawImage(
          video,
          cropArea.x, cropArea.y, cropArea.width, cropArea.height,
          0, 0, cropArea.width, cropArea.height
        );
        
        const croppedImageUrl = canvas.toDataURL('image/png');
        
        if (onScreenCapture) {
          onScreenCapture(cropArea, screenStream);
          (window as any).lastCapturedImageUrl = croppedImageUrl;
          onClose();
        } else {
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

  const displayCropArea = cropArea;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-black dark:text-white">Live Capture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-black dark:text-white" />
          </button>
        </div>

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
            <div className="space-y-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag the selection box to move it, or drag the corners to resize. Click outside to create a new selection.
                </p>
              </div>
              
              <div
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-auto bg-gray-900 flex items-center justify-center"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                style={{ 
                  cursor: isDrawing ? 'crosshair' : isDragging ? 'move' : isResizing ? 'nwse-resize' : 'default',
                  minHeight: '500px',
                  height: 'calc(90vh - 200px)'
                }}
              >
                {screenStream && (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="block w-full h-full object-contain"
                    style={{ 
                      display: 'block'
                    }}
                  />
                )}
                
                {displayCropArea && videoRef.current && containerRef.current && videoRef.current.videoWidth > 0 && (
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
                        className="absolute border-2 border-blue-500 bg-blue-500/10 z-10 cursor-grab active:cursor-grabbing"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                          cursor: isDragging ? 'grabbing' : 'grab',
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          if (!videoRef.current || !containerRef.current) return;
                          
                          const elementRect = videoRef.current.getBoundingClientRect();
                          const containerRect = containerRef.current.getBoundingClientRect();
                          const offsetX = elementRect.left - containerRect.left;
                          const offsetY = elementRect.top - containerRect.top;
                          const scaleX = elementRect.width / videoRef.current.videoWidth;
                          const scaleY = elementRect.height / videoRef.current.videoHeight;
                          
                          const mouseX = e.clientX - containerRect.left;
                          const mouseY = e.clientY - containerRect.top;
                          
                          const handle = getResizeHandle(mouseX, mouseY, displayCropArea, scaleX, scaleY, offsetX, offsetY);
                          if (handle) {
                            setIsResizing(true);
                            setResizeHandle(handle);
                            setStartPos({ x: e.clientX, y: e.clientY });
                            setCurrentPos({ x: e.clientX, y: e.clientY });
                            setDragOffset(null);
                            return;
                          }
                          
                          setIsDragging(true);
                          const cropLeft = offsetX + (displayCropArea.x * scaleX);
                          const cropTop = offsetY + (displayCropArea.y * scaleY);
                          setDragOffset({
                            x: mouseX - cropLeft,
                            y: mouseY - cropTop,
                          });
                          setStartPos({ x: e.clientX, y: e.clientY });
                          setCurrentPos({ x: e.clientX, y: e.clientY });
                          setResizeHandle(null);
                          setIsDrawing(false);
                        }}
                      >
                        <div className="absolute -top-7 left-0 text-xs font-medium text-blue-600 bg-white dark:bg-gray-800 dark:text-blue-400 px-2 py-1 rounded shadow-sm whitespace-nowrap pointer-events-auto">
                          {Math.round(displayCropArea.width)} × {Math.round(displayCropArea.height)}px
                        </div>
                        
                        <div
                          className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize pointer-events-auto shadow-lg"
                          style={{ cursor: 'nwse-resize' }}
                        />
                        <div
                          className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize pointer-events-auto shadow-lg"
                          style={{ cursor: 'nesw-resize' }}
                        />
                        <div
                          className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize pointer-events-auto shadow-lg"
                          style={{ cursor: 'nesw-resize' }}
                        />
                        <div
                          className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize pointer-events-auto shadow-lg"
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

        {screenStream && (
          <div className="flex items-center justify-between gap-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {cropArea ? (
              <div className="text-sm text-black dark:text-white font-mono">
                {Math.round(cropArea.width)} × {Math.round(cropArea.height)}px
                {captureMode === 'fullscreen' && (
                  <span className="ml-2 text-xs text-black dark:text-white">(Full Screen)</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Select an area to capture
              </div>
            )}
            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={onClose}
                className="p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group"
                title="Cancel"
              >
                <X className="w-6 h-6 text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300" />
              </button>
              <button
                onClick={handleConfirm}
                disabled={!cropArea || (cropArea.width < 50 || cropArea.height < 50)}
                className="p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors group"
                title={cropArea ? "Confirm and add to canvas" : "Select an area first"}
              >
                <Check className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CaptureModal;
