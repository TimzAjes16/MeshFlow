/**
 * Native Window Widget Component - Rebuilt from scratch
 * Embeds native desktop applications using screen capture
 */

'use client';

import { memo, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Monitor, AlertCircle, RefreshCw } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';
import { getWindowCaptureStream } from '@/lib/electronUtils';

function NativeWindowWidget(props: WidgetProps) {
  const { data } = props;
  const node = data.node;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { handleClose, handleTitleChange } = useWidgetHandlers(node.id);
  
  // Extract native window config - memoize to prevent infinite loops
  const windowConfig = useMemo(() => {
    if (typeof node.content === 'object' && node.content?.type === 'native-window-widget') {
      return {
        processName: node.content.processName || '',
        windowTitle: node.content.windowTitle || '',
        windowHandle: node.content.windowHandle,
        windowID: node.content.windowID,
      };
    }
    return {
      processName: '',
      windowTitle: '',
      windowHandle: undefined,
      windowID: undefined,
    };
  }, [node.content?.type === 'native-window-widget' ? JSON.stringify(node.content) : '']);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [windowBounds, setWindowBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  // Setup screen capture
  const setupScreenCapture = useCallback(async () => {
    if (!windowConfig.processName || !isElectron) {
      setError('Process name required and Electron environment needed');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(track => track.stop());
        liveStreamRef.current = null;
      }

      console.log('[NativeWindowWidget] Setting up capture for:', {
        processName: windowConfig.processName,
        windowTitle: windowConfig.windowTitle,
      });

      // Get window bounds first (for accurate coordinate mapping)
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
      if (electronAPI?.findWindow) {
        try {
          const windowInfo = await electronAPI.findWindow({
            processName: windowConfig.processName,
            windowTitle: windowConfig.windowTitle,
          });
          
          console.log('[NativeWindowWidget] findWindow result:', windowInfo);
          
          if (windowInfo?.found && windowInfo.x !== undefined) {
            setWindowBounds({
              x: windowInfo.x,
              y: windowInfo.y,
              width: windowInfo.width,
              height: windowInfo.height,
            });
            console.log('[NativeWindowWidget] Window bounds set:', {
              x: windowInfo.x,
              y: windowInfo.y,
              width: windowInfo.width,
              height: windowInfo.height,
            });
          }
        } catch (boundsError) {
          console.warn('[NativeWindowWidget] Could not get window bounds:', boundsError);
        }
      }

      // Get capture stream for the window
      console.log('[NativeWindowWidget] Calling getWindowCaptureStream...');
      const stream = await getWindowCaptureStream({
        processName: windowConfig.processName,
        windowTitle: windowConfig.windowTitle,
        requestPermissions: true,
        includeAudio: false,
      });
      
      console.log('[NativeWindowWidget] Stream obtained:', {
        streamId: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
      });

      if (!stream) {
        throw new Error('Failed to get screen capture stream');
      }

      setLiveStream(stream);
      liveStreamRef.current = stream;
      
      // If bounds weren't available from findWindow, try to get from window list
      const currentBounds = windowBounds;
      if (!currentBounds && electronAPI?.getWindowList) {
        try {
          const windows = await electronAPI.getWindowList();
          const matchingWindow = windows.find((w: any) => 
            w.processName?.toLowerCase().includes(windowConfig.processName.toLowerCase()) &&
            (!windowConfig.windowTitle || w.windowTitle?.includes(windowConfig.windowTitle))
          );
          
          if (matchingWindow && matchingWindow.x !== undefined) {
            setWindowBounds({
              x: matchingWindow.x,
              y: matchingWindow.y,
              width: matchingWindow.width,
              height: matchingWindow.height,
            });
          }
        } catch (listError) {
          console.warn('[NativeWindowWidget] Could not get window list:', listError);
        }
      }

      // Setup video element
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Clear any existing stream
        if (video.srcObject) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach(track => track.stop());
        }
        
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        
        // Wait for metadata and play
        const handleLoadedMetadata = () => {
          video.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('[NativeWindowWidget] Error playing video:', err);
              setError('Failed to play video stream');
            }
          });
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        
        if (video.readyState >= 1) {
          handleLoadedMetadata();
        }
      }
    } catch (err: any) {
      console.error('[NativeWindowWidget] Error:', err);
      setError(err.message || 'Failed to capture window');
    } finally {
      setIsLoading(false);
    }
  }, [windowConfig.processName, windowConfig.windowTitle, isElectron]);

  // Setup capture when config is available
  useEffect(() => {
    if (windowConfig.processName && isElectron) {
      setupScreenCapture();
    } else if (!isElectron) {
      setError('Native window embedding requires Electron environment');
    } else if (!windowConfig.processName) {
      setError('Process name required');
    }

    return () => {
      // Cleanup stream on unmount
      if (liveStreamRef.current) {
        liveStreamRef.current.getTracks().forEach(track => track.stop());
        liveStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [windowConfig.processName, windowConfig.windowTitle, isElectron, setupScreenCapture]);

  const handleRefresh = useCallback(() => {
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(track => track.stop());
      liveStreamRef.current = null;
    }
    setLiveStream(null);
    setWindowBounds(null);
    setupScreenCapture();
  }, [setupScreenCapture]);

  // Handle input injection for interactive mode
  const handleMouseEvent = useCallback((e: React.MouseEvent, eventType: 'mousedown' | 'mousemove' | 'mouseup') => {
    if (!containerRef.current || !windowBounds) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const widgetX = e.clientX - rect.left;
    const widgetY = e.clientY - rect.top;
    
    // Map widget coordinates to window screen coordinates
    // Account for object-fit: contain scaling
    const widgetAspect = rect.width / rect.height;
    const windowAspect = windowBounds.width / windowBounds.height;
    
    let mappedX: number;
    let mappedY: number;
    
    if (widgetAspect > windowAspect) {
      // Widget is wider - letterboxing on top/bottom
      const scaledHeight = rect.width / windowAspect;
      const offsetY = (rect.height - scaledHeight) / 2;
      mappedX = (widgetX / rect.width) * windowBounds.width;
      mappedY = ((widgetY - offsetY) / scaledHeight) * windowBounds.height;
    } else {
      // Widget is taller - letterboxing on left/right
      const scaledWidth = rect.height * windowAspect;
      const offsetX = (rect.width - scaledWidth) / 2;
      mappedX = ((widgetX - offsetX) / scaledWidth) * windowBounds.width;
      mappedY = (widgetY / rect.height) * windowBounds.height;
    }
    
    // Clamp to window bounds
    mappedX = Math.max(0, Math.min(windowBounds.width, mappedX));
    mappedY = Math.max(0, Math.min(windowBounds.height, mappedY));
    
    // Convert to absolute screen coordinates
    const screenX = windowBounds.x + mappedX;
    const screenY = windowBounds.y + mappedY;
    
    // Send mouse event to the original window
    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (electronAPI?.sendMouseEvent) {
      electronAPI.sendMouseEvent({
        x: Math.round(screenX),
        y: Math.round(screenY),
        button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
        type: eventType,
        processName: windowConfig.processName,
        windowTitle: windowConfig.windowTitle,
      });
    }
  }, [windowBounds, windowConfig]);

  const handleKeyboardEvent = useCallback((e: React.KeyboardEvent, eventType: 'keydown' | 'keyup') => {
    if (!windowBounds) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Send keyboard event to the original window
    const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;
    if (electronAPI?.sendKeyboardEvent) {
      electronAPI.sendKeyboardEvent({
        key: e.key,
        code: e.code,
        type: eventType,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        processName: windowConfig.processName,
        windowTitle: windowConfig.windowTitle,
      });
    }
  }, [windowBounds, windowConfig]);

  return (
    <BaseWidget
      {...props}
      title={node.title || windowConfig.windowTitle || 'Native App'}
      icon={<Monitor className="w-4 h-4" />}
      className="native-window-widget"
      onClose={handleClose}
      onTitleChange={handleTitleChange}
    >
      {error ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {error}
          </p>
          {isElectron && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              className="mt-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Capturing window...
          </p>
        </div>
      ) : !windowConfig.processName ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Monitor className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            No application configured
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Select this widget and configure an application
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden"
          onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
          onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
          onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
          onKeyDown={(e) => handleKeyboardEvent(e, 'keydown')}
          onKeyUp={(e) => handleKeyboardEvent(e, 'keyup')}
          tabIndex={windowBounds ? 0 : -1}
          style={{ cursor: windowBounds ? 'default' : 'default' }}
        >
          {liveStream && (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                pointerEvents: 'none', // Let container handle events
              }}
            />
          )}
          
          {windowBounds && (
            <div className="absolute top-2 right-2 bg-blue-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded z-10">
              Interactive
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(NativeWindowWidget);
