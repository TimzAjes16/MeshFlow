/**
 * Live Capture Widget Component - Rebuilt from scratch
 * Captures screen areas and displays live video feed
 */

'use client';

import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Camera, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useWidgetHandlers } from './useWidgetHandlers';

interface CaptureData {
  cropArea: { x: number; y: number; width: number; height: number };
  screenBounds?: { x: number; y: number; width: number; height: number };
  isLiveStream?: boolean;
  streamId?: string;
  interactive?: boolean;
}

function LiveCaptureWidget(props: WidgetProps) {
  const { data } = props;
  const node = data.node;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { handleClose, handleTitleChange } = useWidgetHandlers(node.id);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const cropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract capture config
  const captureData: CaptureData = useMemo(() => {
    if (typeof node.content === 'object' && node.content?.type === 'live-capture-widget') {
      return {
        cropArea: node.content.cropArea || { x: 0, y: 0, width: 0, height: 0 },
        screenBounds: node.content.screenBounds || node.content.cropArea,
        isLiveStream: node.content.isLiveStream ?? true,
        streamId: node.content.streamId,
        interactive: node.content.interactive ?? false,
      };
    }
    return {
      cropArea: { x: 0, y: 0, width: 0, height: 0 },
      isLiveStream: true,
      interactive: false,
    };
  }, [node.content?.type === 'live-capture-widget' ? JSON.stringify(node.content) : '']);

  const cropArea = useMemo(() => captureData.cropArea, [
    captureData.cropArea?.x,
    captureData.cropArea?.y,
    captureData.cropArea?.width,
    captureData.cropArea?.height,
  ]);
  
  const screenBounds = useMemo(() => captureData.screenBounds, [
    captureData.screenBounds?.x,
    captureData.screenBounds?.y,
    captureData.screenBounds?.width,
    captureData.screenBounds?.height,
  ]);

  // Find live stream from global registry
  useEffect(() => {
    if (!captureData.isLiveStream) return;
    
    const streamRegistry = (window as any).liveCaptureStreams;
    if (streamRegistry && streamRegistry instanceof Map) {
      const streamData = streamRegistry.get(node.id);
      if (streamData?.stream) {
        setLiveStream(streamData.stream);
        return;
      }
    }
    
    // Listen for stream ready event
    const handleStreamReady = (event: CustomEvent) => {
      if (event.detail.nodeId === node.id) {
        const streamData = streamRegistry?.get(node.id);
        if (streamData?.stream) {
          setLiveStream(streamData.stream);
        }
      }
    };
    
    window.addEventListener('live-capture-stream-ready', handleStreamReady as EventListener);
    
    // Poll for stream
    const pollInterval = setInterval(() => {
      const streamData = streamRegistry?.get(node.id);
      if (streamData?.stream) {
        setLiveStream(streamData.stream);
        clearInterval(pollInterval);
      }
    }, 500);
    
    return () => {
      window.removeEventListener('live-capture-stream-ready', handleStreamReady as EventListener);
      clearInterval(pollInterval);
    };
  }, [node.id, captureData.isLiveStream]);

  // Setup video and canvas for cropping
  useEffect(() => {
    if (!liveStream || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup video
    video.srcObject = liveStream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = isMuted || true;
    video.controls = false;

    // Set canvas size to crop area
    if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
    }

    // Draw cropped frames
    const drawFrame = () => {
      if (!video || !canvas || !ctx || isPaused) return;
      
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        // Convert screen-space cropArea to video-space coordinates
        let videoCropX = cropArea.x;
        let videoCropY = cropArea.y;
        let videoCropWidth = cropArea.width;
        let videoCropHeight = cropArea.height;
        
        if (screenBounds && screenBounds.width > 0 && screenBounds.height > 0) {
          const scaleX = videoWidth / screenBounds.width;
          const scaleY = videoHeight / screenBounds.height;
          
          videoCropX = (cropArea.x - screenBounds.x) * scaleX;
          videoCropY = (cropArea.y - screenBounds.y) * scaleY;
          videoCropWidth = cropArea.width * scaleX;
          videoCropHeight = cropArea.height * scaleY;
        }
        
        // Clamp to video bounds
        videoCropX = Math.max(0, Math.min(videoCropX, videoWidth));
        videoCropY = Math.max(0, Math.min(videoCropY, videoHeight));
        videoCropWidth = Math.min(videoCropWidth, videoWidth - videoCropX);
        videoCropHeight = Math.min(videoCropHeight, videoHeight - videoCropY);
        
        // Draw cropped region
        ctx.drawImage(
          video,
          videoCropX, videoCropY, videoCropWidth, videoCropHeight,
          0, 0, canvas.width, canvas.height
        );
      }
    };

    // Start drawing loop
    const startDrawing = () => {
      if (cropIntervalRef.current) {
        clearInterval(cropIntervalRef.current);
      }
      cropIntervalRef.current = setInterval(drawFrame, 16); // ~60fps
    };

    video.addEventListener('loadeddata', startDrawing);
    startDrawing();

    return () => {
      if (cropIntervalRef.current) {
        clearInterval(cropIntervalRef.current);
      }
      video.removeEventListener('loadeddata', startDrawing);
    };
  }, [liveStream, cropArea, screenBounds, isMuted, isPaused]);

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  }, [isMuted]);

  const handleTogglePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPaused]);

  const isConfigured = liveStream || (cropArea && cropArea.width > 0 && cropArea.height > 0);

  return (
    <BaseWidget
      {...props}
      title={node.title || 'Live Capture'}
      icon={<Camera className="w-4 h-4" />}
      className="live-capture-widget"
      onClose={handleClose}
      onTitleChange={handleTitleChange}
    >
      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center bg-gray-100 dark:bg-gray-900">
          <Camera className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            No capture area configured
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
            Select this widget and use "Area Highlight" to configure
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent('open-live-capture-modal', {
                detail: { nodeId: node.id }
              }));
            }}
            className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
          >
            Configure Capture Area
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative w-full h-full bg-black rounded-b-lg overflow-hidden"
        >
          {/* Hidden video element */}
          <video
            ref={videoRef}
            className="hidden"
            playsInline
            muted={isMuted}
          />
          
          {/* Canvas for cropped display */}
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain"
          />
          
          {/* Loading indicator */}
          {!liveStream && captureData.isLiveStream && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="text-xs text-white">Loading stream...</p>
              </div>
            </div>
          )}
          
          {/* Controls */}
          <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePause();
              }}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? (
                <Play className="w-4 h-4 text-white" />
              ) : (
                <Pause className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMute();
              }}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          
          {/* Interactive mode indicator */}
          {captureData.interactive && (
            <div className="absolute top-2 left-2 bg-blue-500/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
              Interactive Mode
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}

export default memo(LiveCaptureWidget);
