/**
 * Native Window Widget Component
 * Embeds native desktop applications using OS-level window embedding
 * On macOS: Uses screen capture + input injection for seamless embedding
 * On Windows: Uses SetParent API for true window embedding
 */

'use client';

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Monitor, AlertCircle, RefreshCw } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';
import { getScreenCaptureStream } from '@/lib/electronUtils';

interface NativeWindowWidgetProps extends WidgetProps {
  // Native window specific props
  processName?: string;
  windowTitle?: string;
  windowHandle?: number; // OS window handle
}

function NativeWindowWidget(props: NativeWindowWidgetProps) {
  const { data } = props;
  const node = data.node;
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { handleClose, handleResize, handleTitleChange } = useWidgetHandlers(node.id);
  
  // Extract native window config from node content
  const windowConfig = typeof node.content === 'object' && node.content?.type === 'native-window-widget'
    ? {
        processName: node.content.processName || '',
        windowTitle: node.content.windowTitle || '',
        windowHandle: node.content.windowHandle,
        windowID: node.content.windowID, // CGWindowID on macOS
        windowBounds: node.content.windowBounds, // Window bounds for coordinate mapping
      }
    : {
        processName: '',
        windowTitle: '',
        windowHandle: undefined,
        windowID: undefined,
        windowBounds: undefined,
      };

  const [isEmbedded, setIsEmbedded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [isInteractive, setIsInteractive] = useState(true);
  const [windowBounds, setWindowBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Check if native window embedding is available
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  const hasNativeEmbedding = isElectron && (window as any).electronAPI?.embedNativeWindow;

  // Handle screen capture for macOS
  const setupScreenCapture = useCallback(async (windowID: number, processName: string, windowTitle: string) => {
    try {
      console.log('[NativeWindowWidget] Setting up screen capture for window:', { windowID, processName, windowTitle });
      
      // Request screen capture stream
      // The user will need to select the window in the picker
      const stream = await getScreenCaptureStream({ requestPermissions: true, includeAudio: false });
      
      if (!stream) {
        throw new Error('Failed to get screen capture stream');
      }
      
      console.log('[NativeWindowWidget] Screen capture stream obtained:', {
        streamId: stream.id,
        active: stream.active,
        videoTracks: stream.getVideoTracks().length,
      });
      
      setLiveStream(stream);
      
      // Get window bounds for coordinate mapping
      // We'll need to get this from the native addon or use the window dimensions
      // For now, we'll use the video stream dimensions
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.play().catch(err => console.error('[NativeWindowWidget] Error playing video:', err));
        
        video.addEventListener('loadedmetadata', () => {
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setWindowBounds({
              x: 0,
              y: 0,
              width: video.videoWidth,
              height: video.videoHeight,
            });
          }
        });
      }
      
      return stream;
    } catch (err: any) {
      console.error('[NativeWindowWidget] Error setting up screen capture:', err);
      throw err;
    }
  }, []);

  // Handle input injection for interactive mode
  const handleMouseEvent = useCallback((e: React.MouseEvent, eventType: 'mousedown' | 'mousemove' | 'mouseup') => {
    if (!isInteractive || !containerRef.current || !windowBounds) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map widget coordinates to window coordinates
    const windowX = Math.round((x / rect.width) * windowBounds.width);
    const windowY = Math.round((y / rect.height) * windowBounds.height);
    
    // Send mouse event to the original window
    if ((window as any).electronAPI?.sendMouseEvent) {
      (window as any).electronAPI.sendMouseEvent({
        x: windowX,
        y: windowY,
        button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
        type: eventType,
        processName: windowConfig.processName,
        windowTitle: windowConfig.windowTitle,
      });
    }
  }, [isInteractive, windowBounds, windowConfig]);

  const handleKeyboardEvent = useCallback((e: React.KeyboardEvent, eventType: 'keydown' | 'keyup') => {
    if (!isInteractive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Send keyboard event to the original window
    if ((window as any).electronAPI?.sendKeyboardEvent) {
      (window as any).electronAPI.sendKeyboardEvent({
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
  }, [isInteractive, windowConfig]);

  // Embed the native window
  useEffect(() => {
    if (!hasNativeEmbedding) {
      setError('Native window embedding requires Electron with native addons');
      return;
    }

    if (!windowConfig.processName && !windowConfig.windowHandle) {
      setError('Process name or window handle required');
      return;
    }

    // Attempt to embed the native window
    const embedWindow = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (containerRef.current) {
          const containerId = `native-window-${node.id}`;
          containerRef.current.setAttribute('data-container-id', containerId);
          
          const result = await (window as any).electronAPI.embedNativeWindow({
            containerId,
            processName: windowConfig.processName,
            windowTitle: windowConfig.windowTitle,
            windowHandle: windowConfig.windowHandle,
          });
          
          if (result.success) {
            setIsEmbedded(true);
            
            // On macOS, use screen capture
            if (result.method === 'screen-capture' && result.windowID) {
              console.log('[NativeWindowWidget] Using screen capture method, windowID:', result.windowID);
              await setupScreenCapture(result.windowID, result.processName || windowConfig.processName, result.windowTitle || windowConfig.windowTitle);
            } else {
              // On Windows, true embedding is used
              console.log('[NativeWindowWidget] Using true window embedding (Windows)');
            }
          } else {
            setError(result.error || 'Failed to embed window');
          }
        }
      } catch (err: any) {
        console.error('[NativeWindowWidget] Error embedding window:', err);
        setError(err.message || 'Failed to embed native window');
      } finally {
        setIsLoading(false);
      }
    };

    embedWindow();

    // Cleanup on unmount
    return () => {
      // Stop screen capture stream
      if (liveStream) {
        liveStream.getTracks().forEach(track => track.stop());
        setLiveStream(null);
      }
      
      // Unembed window
      if (isEmbedded && containerRef.current) {
        const containerId = containerRef.current.getAttribute('data-container-id');
        if (containerId && (window as any).electronAPI?.unembedNativeWindow) {
          (window as any).electronAPI.unembedNativeWindow({ containerId });
        }
      }
    };
  }, [hasNativeEmbedding, windowConfig, node.id]);

  const handleRefresh = useCallback(() => {
    setIsEmbedded(false);
    setError(null);
    setLiveStream(null);
    setWindowBounds(null);
    
    // Stop existing stream
    if (liveStream) {
      liveStream.getTracks().forEach(track => track.stop());
    }
    
    // Trigger re-embed
    const event = new CustomEvent('refresh-native-window', { detail: { nodeId: node.id } });
    window.dispatchEvent(event);
  }, [node.id, liveStream]);

  return (
    <BaseWidget
      {...props}
      title={node.title || windowConfig.windowTitle || 'Native App'}
      icon={<Monitor className="w-4 h-4" />}
      className="native-window-widget"
      onClose={handleClose}
      onResize={handleResize}
      onTitleChange={handleTitleChange}
    >
      {error ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {error}
          </p>
          {hasNativeEmbedding && (
            <button
              onClick={handleRefresh}
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
            Embedding window...
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full bg-gray-100 dark:bg-gray-900 relative overflow-hidden"
          style={{
            position: 'relative',
            overflow: 'hidden',
            cursor: isInteractive ? 'default' : 'default',
          }}
          onMouseDown={(e) => handleMouseEvent(e, 'mousedown')}
          onMouseMove={(e) => handleMouseEvent(e, 'mousemove')}
          onMouseUp={(e) => handleMouseEvent(e, 'mouseup')}
          onKeyDown={(e) => handleKeyboardEvent(e, 'keydown')}
          onKeyUp={(e) => handleKeyboardEvent(e, 'keyup')}
          tabIndex={isInteractive ? 0 : -1}
        >
          {/* Screen capture video (macOS) */}
          {liveStream && (
            <>
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
                }}
              />
              {/* Interactive overlay indicator */}
              {isInteractive && (
                <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  Interactive
                </div>
              )}
            </>
          )}
          
          {/* True embedding placeholder (Windows) */}
          {isEmbedded && !liveStream && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
              Native window embedded
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(NativeWindowWidget);
