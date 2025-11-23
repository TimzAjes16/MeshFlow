/**
 * Live Capture Node Component
 * Displays captured areas from screenshots/applications for tracking changes over time
 * Inspired by Aries Infinite functionality
 */

import { memo, useEffect, useRef, useState } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Camera, RefreshCw, History, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface LiveCaptureNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

interface CaptureData {
  imageUrl: string;
  cropArea: { x: number; y: number; width: number; height: number };
  sourceUrl?: string;
  timestamp?: string;
  captureHistory?: Array<{ imageUrl: string; timestamp: string }>;
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // in seconds
  isLiveStream?: boolean; // If true, show live video feed (should always be true now)
  streamId?: string; // Stream ID for lookup
  captureMode?: 'fullscreen' | 'custom';
  interactive?: boolean; // If true, allow interactions to pass through to underlying app
  screenBounds?: { x: number; y: number; width: number; height: number }; // Actual screen bounds of captured area
}

function LiveCaptureNode({ data, selected, id }: LiveCaptureNodeProps) {
  const { node } = data;
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCaptureHashRef = useRef<string | null>(null);
  const cropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Extract capture config from content
  const captureData: CaptureData = typeof node.content === 'object' && node.content?.type === 'live-capture'
    ? {
        imageUrl: node.content.imageUrl || '',
        cropArea: node.content.cropArea || { x: 0, y: 0, width: 0, height: 0 },
        sourceUrl: node.content.sourceUrl || '',
        timestamp: node.content.timestamp || new Date().toISOString(),
        captureHistory: node.content.captureHistory || [],
        autoRefresh: node.content.autoRefresh ?? true,
        autoRefreshInterval: node.content.autoRefreshInterval ?? 5, // default 5 seconds
        isLiveStream: node.content.isLiveStream ?? true, // Always use live stream (default to true)
        streamId: node.content.streamId,
        captureMode: node.content.captureMode || 'custom',
        interactive: node.content.interactive ?? false,
        screenBounds: node.content.screenBounds || node.content.cropArea || { x: 0, y: 0, width: 0, height: 0 },
      }
    : {
        imageUrl: '',
        cropArea: { x: 0, y: 0, width: 0, height: 0 },
        captureHistory: [],
        autoRefresh: true,
        autoRefreshInterval: 5,
        isLiveStream: true, // Always use live stream
        captureMode: 'custom',
        interactive: false,
        screenBounds: { x: 0, y: 0, width: 0, height: 0 },
      };
  
  const isInteractive = captureData.interactive ?? false;
  
  // Get live stream from global registry - always try to get stream for live capture
  useEffect(() => {
    // Try to get stream from registry first
    const streamRegistry = (window as any).liveCaptureStreams;
    if (streamRegistry && streamRegistry.has(id)) {
      const streamData = streamRegistry.get(id);
      if (streamData && streamData.stream) {
        setLiveStream(streamData.stream);
        return;
      }
    }
    
    // Fallback: try to get current screen stream (for new captures)
    if ((window as any).currentScreenStream) {
      const currentStream = (window as any).currentScreenStream;
      setLiveStream(currentStream);
      
      // Store it in the registry for this node if not already there
      if (streamRegistry && !streamRegistry.has(id)) {
        streamRegistry.set(id, {
          stream: currentStream,
          cropArea: captureData.cropArea,
          screenBounds: captureData.screenBounds,
        });
      }
    }
    
    return () => {
      // Cleanup on unmount
      if (cropIntervalRef.current) {
        clearInterval(cropIntervalRef.current);
      }
    };
  }, [id, captureData.cropArea, captureData.screenBounds]);
  
  // Set up video element for live stream - always use canvas for consistent cropping
  useEffect(() => {
    if (liveStream && videoRef.current) {
      videoRef.current.srcObject = liveStream;
      videoRef.current.autoplay = true;
      videoRef.current.playsInline = true;
      videoRef.current.muted = isMuted;
      
      // Always use canvas for cropping, even in interactive mode
      if (canvasRef.current && captureData.cropArea && captureData.cropArea.width > 0 && captureData.cropArea.height > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        canvas.width = captureData.cropArea.width;
        canvas.height = captureData.cropArea.height;
        
        // Continuously crop and draw the video feed
        const drawFrame = () => {
          if (videoRef.current && canvas && ctx && !isPaused) {
            try {
              ctx.drawImage(
                videoRef.current,
                captureData.cropArea.x,
                captureData.cropArea.y,
                captureData.cropArea.width,
                captureData.cropArea.height,
                0,
                0,
                canvas.width,
                canvas.height
              );
            } catch (error) {
              console.error('Error drawing video frame:', error);
            }
          }
        };
        
        // Draw at video frame rate (60fps)
        cropIntervalRef.current = setInterval(drawFrame, 16);
        
        return () => {
          if (cropIntervalRef.current) {
            clearInterval(cropIntervalRef.current);
          }
        };
      }
    }
  }, [liveStream, captureData.cropArea, isMuted, isPaused]);
  
  // Update node dimensions for live stream - always use crop area dimensions
  useEffect(() => {
    if (captureData.cropArea && captureData.cropArea.width > 0 && captureData.cropArea.height > 0) {
      const newWidth = captureData.cropArea.width + 32;
      const newHeight = captureData.cropArea.height + 80; // Extra space for controls
      
      // Only update if dimensions changed significantly AND we didn't just set these values
      const lastDims = lastDimensionsRef.current;
      if (
        (!lastDims || Math.abs(lastDims.width - newWidth) > 5 || Math.abs(lastDims.height - newHeight) > 5) &&
        (Math.abs((node.width || 300) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5)
      ) {
        lastDimensionsRef.current = { width: newWidth, height: newHeight };
        updateNode(id, {
          width: newWidth,
          height: newHeight,
        });
      }
    }
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when crop area changes
  }, [captureData.cropArea, id, updateNode]);

  // Update dimensions when image loads
  useEffect(() => {
    if (imageRef.current && captureData.imageUrl) {
      const img = imageRef.current;
      const handleLoad = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        setImageDimensions({ width, height });
        
        const newWidth = width + 32; // Add padding
        const newHeight = height + 56; // Add padding + header
        
        // Only update if dimensions changed significantly AND we didn't just set these values
        const lastDims = lastDimensionsRef.current;
        if (
          (!lastDims || Math.abs(lastDims.width - newWidth) > 5 || Math.abs(lastDims.height - newHeight) > 5) &&
          (Math.abs((node.width || 300) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5)
        ) {
          lastDimensionsRef.current = { width: newWidth, height: newHeight };
          updateNode(id, {
            width: newWidth,
            height: newHeight,
          });
        }
      };

      if (img.complete) {
        handleLoad();
      } else {
        img.addEventListener('load', handleLoad);
        return () => img.removeEventListener('load', handleLoad);
      }
    }
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when image URL changes (which should trigger a resize)
  }, [captureData.imageUrl, id, updateNode]);

  // Measure container for empty state
  useEffect(() => {
    if (containerRef.current && !captureData.imageUrl) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // Only update if dimensions changed significantly AND we didn't just set these values
          const lastDims = lastDimensionsRef.current;
          if (
            (!lastDims || Math.abs(lastDims.width - width) > 5 || Math.abs(lastDims.height - height) > 5) &&
            (Math.abs((node.width || 300) - width) > 5 || Math.abs((node.height || 200) - height) > 5)
          ) {
            lastDimensionsRef.current = { width, height };
            updateNode(id, {
              width: width,
              height: height,
            });
          }
        }
      });

      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when image URL changes (which determines if we show empty state)
  }, [captureData.imageUrl, id, updateNode]);

  const handleUpdateCapture = () => {
    // Trigger capture modal to update this node
    window.dispatchEvent(new CustomEvent('update-capture-node', { detail: { nodeId: id } }));
  };

  // Calculate image hash for change detection (perceptual hash)
  const calculateImageHash = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve('');
            return;
          }
          
          // Downscale for faster comparison (8x8 = 64 pixels)
          canvas.width = 8;
          canvas.height = 8;
          ctx.drawImage(img, 0, 0, 8, 8);
          
          const imageData = ctx.getImageData(0, 0, 8, 8);
          const pixels = imageData.data;
          
          // Calculate average brightness
          let totalBrightness = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            totalBrightness += (r + g + b) / 3;
          }
          const avgBrightness = totalBrightness / (pixels.length / 4);
          
          // Generate hash: compare each pixel to average
          let hash = '';
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const brightness = (r + g + b) / 3;
            hash += brightness > avgBrightness ? '1' : '0';
          }
          resolve(hash);
        } catch (error) {
          console.error('Error calculating image hash:', error);
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = imageUrl;
    });
  };

  // Calculate similarity between two hashes (Hamming distance)
  const calculateSimilarity = (hash1: string, hash2: string): number => {
    if (hash1.length !== hash2.length || hash1.length === 0) return 0;
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return matches / hash1.length;
  };

  // Check current displayed image for changes
  const checkForChanges = async () => {
    if (!captureData.imageUrl || !captureData.autoRefresh || !imageRef.current) return;
    
    try {
      const currentImageUrl = latestCapture?.imageUrl || captureData.imageUrl;
      const currentHash = await calculateImageHash(currentImageUrl);
      
      if (currentHash === '') return;
      
      // If we have a previous hash, compare
      if (lastCaptureHashRef.current !== null) {
        const similarity = calculateSimilarity(lastCaptureHashRef.current, currentHash);
        // If similarity is less than 95%, consider it a change
        if (similarity < 0.95) {
          // Change detected - trigger auto-capture
          console.log('Change detected in Live Capture node, triggering auto-capture...');
          handleUpdateCapture();
        }
      } else {
        // Initialize hash
        lastCaptureHashRef.current = currentHash;
      }
    } catch (error) {
      console.error('Error checking for changes:', error);
    }
  };

  // Set up automatic change detection polling
  useEffect(() => {
    if (!captureData.imageUrl || !captureData.autoRefresh) {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
      return;
    }

    // Initialize hash with current image
    calculateImageHash(captureData.imageUrl).then((hash) => {
      if (hash) {
        lastCaptureHashRef.current = hash;
      }
    });

    // Set up polling interval
    const interval = (captureData.autoRefreshInterval || 5) * 1000; // Convert seconds to milliseconds
    autoRefreshIntervalRef.current = setInterval(() => {
      checkForChanges();
    }, interval);

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    };
  }, [captureData.imageUrl, captureData.autoRefresh, captureData.autoRefreshInterval]);

  // Handle mute toggle
  const handleToggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle pause/play toggle
  const handleTogglePause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  // Map coordinates from node display to actual screen coordinates for interactive mode
  const mapToScreenCoordinates = (clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current || !captureData.screenBounds || !captureData.cropArea) return null;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const videoArea = containerRef.current.querySelector('.video-area') as HTMLElement;
    if (!videoArea) return null;
    
    const videoRect = videoArea.getBoundingClientRect();
    
    // Calculate relative position within the video area
    const relX = clientX - videoRect.left;
    const relY = clientY - videoRect.top;
    
    // Calculate scale factors
    const scaleX = captureData.cropArea.width / videoRect.width;
    const scaleY = captureData.cropArea.height / videoRect.height;
    
    // Map to crop area coordinates
    const cropX = relX * scaleX;
    const cropY = relY * scaleY;
    
    // Map to screen coordinates
    const screenX = captureData.screenBounds.x + cropX;
    const screenY = captureData.screenBounds.y + cropY;
    
    return { x: Math.round(screenX), y: Math.round(screenY) };
  };

  // Forward mouse events to underlying application when interactive mode is enabled
  const handleInteractiveMouseEvent = (e: React.MouseEvent, eventType: 'click' | 'mousedown' | 'mouseup' | 'mousemove') => {
    if (!isInteractive || !captureData.screenBounds) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const screenCoords = mapToScreenCoordinates(e.clientX, e.clientY);
    if (!screenCoords) return;
    
    // Forward event to underlying application via Electron IPC or global event
    if ((window as any).electronAPI?.sendMouseEvent) {
      (window as any).electronAPI.sendMouseEvent({
        type: eventType,
        x: screenCoords.x,
        y: screenCoords.y,
        button: e.button,
        buttons: e.buttons,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
    } else {
      // Fallback: dispatch global event for other implementations
      window.dispatchEvent(new CustomEvent('live-capture-interaction', {
        detail: {
          nodeId: id,
          type: eventType,
          screenX: screenCoords.x,
          screenY: screenCoords.y,
          button: e.button,
          buttons: e.buttons,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        },
      }));
    }
  };

  // Forward keyboard events when interactive mode is enabled
  const handleInteractiveKeyEvent = (e: React.KeyboardEvent, eventType: 'keydown' | 'keyup' | 'keypress') => {
    if (!isInteractive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Forward event to underlying application
    if ((window as any).electronAPI?.sendKeyboardEvent) {
      (window as any).electronAPI.sendKeyboardEvent({
        type: eventType,
        key: e.key,
        code: e.code,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
      });
    } else {
      // Fallback: dispatch global event
      window.dispatchEvent(new CustomEvent('live-capture-keyboard', {
        detail: {
          nodeId: id,
          type: eventType,
          key: e.key,
          code: e.code,
          shiftKey: e.shiftKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          metaKey: e.metaKey,
        },
      }));
    }
  };

  // Empty state - no stream or crop area yet
  if (!liveStream && !captureData.cropArea) {
    return (
      <BaseNode node={node} selected={selected} nodeId={id}>
        <div 
          ref={containerRef}
          className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center min-w-[300px] min-h-[200px]"
          style={{
            width: node.width ? `${node.width}px` : 'auto',
            height: node.height ? `${node.height}px` : 'auto',
          }}
        >
          <Camera className="w-12 h-12 text-blue-400 mb-3" />
          <p className="text-sm font-medium text-black mb-1">Live Capture Node</p>
          <p className="text-xs text-black text-center">Click to capture an area</p>
        </div>
      </BaseNode>
    );
  }

  const captureHistory = captureData.captureHistory || [];
  const latestCapture = captureHistory.length > 0 
    ? captureHistory[captureHistory.length - 1]
    : null;

  // Determine display dimensions - always use crop area for live capture
  const displayWidth = captureData.cropArea.width > 0
    ? captureData.cropArea.width
    : 300;
  const displayHeight = captureData.cropArea.height > 0
    ? captureData.cropArea.height
    : 200;

  return (
    <BaseNode node={node} selected={selected} nodeId={id}>
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col"
        style={{ 
          width: node.width ? `${node.width}px` : `${displayWidth + 32}px`,
          height: node.height ? `${node.height}px` : 'auto',
          minWidth: '300px',
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-white" />
            <span className="text-xs font-medium text-white">
              Live Feed {isInteractive && '(Interactive)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {liveStream && (
              <>
                <button
                  onClick={handleTogglePause}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title={isPaused ? 'Play' : 'Pause'}
                >
                  {isPaused ? (
                    <Play className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
                <button
                  onClick={handleToggleMute}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-white" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Live Video Feed - Always use video for live capture */}
        <div 
          className="relative bg-black flex items-center justify-center video-area"
          style={{ 
            width: `${displayWidth}px`, 
            height: `${displayHeight}px`,
            pointerEvents: isInteractive ? 'auto' : 'none',
            cursor: isInteractive ? 'pointer' : 'default',
          }}
        >
          {liveStream ? (
            <>
              {/* Hidden video element for source */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isMuted}
                className="hidden"
              />
              {/* Canvas showing cropped live feed - always use canvas for consistent cropping */}
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  pointerEvents: isInteractive ? 'auto' : 'none',
                  cursor: isInteractive ? 'pointer' : 'default',
                }}
                onClick={isInteractive ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInteractiveMouseEvent(e, 'click');
                } : undefined}
                onMouseDown={isInteractive ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInteractiveMouseEvent(e, 'mousedown');
                } : undefined}
                onMouseUp={isInteractive ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInteractiveMouseEvent(e, 'mouseup');
                } : undefined}
                onMouseMove={isInteractive ? (e) => {
                  handleInteractiveMouseEvent(e, 'mousemove');
                } : undefined}
                onKeyDown={isInteractive ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInteractiveKeyEvent(e, 'keydown');
                } : undefined}
                onKeyUp={isInteractive ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInteractiveKeyEvent(e, 'keyup');
                } : undefined}
                tabIndex={isInteractive ? 0 : -1}
              />
            </>
          ) : (
            <div className="flex items-center justify-center text-black">
              <Camera className="w-8 h-8" />
              <span className="ml-2 text-sm text-white">Waiting for stream...</span>
            </div>
          )}
        </div>

        {/* History Panel */}
        {showHistory && captureHistory.length > 0 && (
          <div className="border-t border-gray-200 p-3 bg-gray-50 max-h-48 overflow-y-auto">
            <div className="text-xs font-semibold text-black mb-2">Capture History</div>
            <div className="space-y-2">
              {[...captureHistory].reverse().map((capture, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Switch to this capture
                    const newHistory = [...captureHistory];
                    const currentIndex = captureHistory.length - 1 - index;
                    updateNode(id, {
                      content: {
                        ...node.content,
                        type: 'live-capture',
                        imageUrl: capture.imageUrl,
                        timestamp: capture.timestamp,
                      },
                    });
                  }}
                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-left text-xs"
                >
                  <img
                    src={capture.imageUrl}
                    alt={`Capture ${captureHistory.length - index}`}
                    className="w-12 h-12 object-cover rounded border border-gray-300"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-black">
                      Capture {captureHistory.length - index}
                    </div>
                    <div className="text-black truncate">
                      {new Date(capture.timestamp).toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
}

export default memo(LiveCaptureNode);

