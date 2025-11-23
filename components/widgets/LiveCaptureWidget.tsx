/**
 * Live Capture Widget Component
 * Enhanced version of LiveCaptureNode with improved input injection
 * Captures screen areas and allows interactive control via input injection
 */

'use client';

import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import BaseWidget, { WidgetProps } from './BaseWidget';
import { Camera, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';
import type { Node as NodeType } from '@/types/Node';

interface LiveCaptureWidgetProps extends WidgetProps {
  // Live capture specific props
}

interface CaptureData {
  imageUrl: string;
  cropArea: { x: number; y: number; width: number; height: number };
  sourceUrl?: string;
  timestamp?: string;
  captureHistory?: Array<{ imageUrl: string; timestamp: string }>;
  autoRefresh?: boolean;
  autoRefreshInterval?: number;
  isLiveStream?: boolean;
  streamId?: string;
  captureMode?: 'fullscreen' | 'custom';
  interactive?: boolean;
  screenBounds?: { x: number; y: number; width: number; height: number };
}

function LiveCaptureWidget(props: LiveCaptureWidgetProps) {
  const { data } = props;
  const { node } = data;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [isMuted, setIsMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const cropIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Extract capture config from content
  const captureData: CaptureData = typeof node.content === 'object' && node.content?.type === 'live-capture'
    ? {
        imageUrl: node.content.imageUrl || '',
        cropArea: node.content.cropArea || { x: 0, y: 0, width: 0, height: 0 },
        sourceUrl: node.content.sourceUrl || '',
        timestamp: node.content.timestamp || new Date().toISOString(),
        captureHistory: node.content.captureHistory || [],
        autoRefresh: node.content.autoRefresh ?? true,
        autoRefreshInterval: node.content.autoRefreshInterval ?? 5,
        isLiveStream: node.content.isLiveStream ?? true,
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
        isLiveStream: true,
        captureMode: 'custom',
        interactive: false,
        screenBounds: { x: 0, y: 0, width: 0, height: 0 },
      };
  
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

  // Enhanced input injection for interactive mode
  const handleInteractiveClick = useCallback((e: React.MouseEvent) => {
    if (!captureData.interactive || !containerRef.current || !screenBounds || !cropArea) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    
    // Convert widget coordinates to screen coordinates
    const scaleX = cropArea.width / rect.width;
    const scaleY = cropArea.height / rect.height;
    
    const screenX = cropArea.x + (relativeX * scaleX);
    const screenY = cropArea.y + (relativeY * scaleY);
    
    // Send click event to Electron main process for input injection
    if (typeof window !== 'undefined' && (window as any).electronAPI?.sendMouseEvent) {
      (window as any).electronAPI.sendMouseEvent({
        x: screenX,
        y: screenY,
        button: e.button === 0 ? 'left' : e.button === 2 ? 'right' : 'middle',
        type: 'click',
      });
    }
  }, [captureData.interactive, cropArea, screenBounds]);

  const handleInteractiveMouseMove = useCallback((e: React.MouseEvent) => {
    if (!captureData.interactive || !containerRef.current || !screenBounds || !cropArea) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;
    
    const scaleX = cropArea.width / rect.width;
    const scaleY = cropArea.height / rect.height;
    
    const screenX = cropArea.x + (relativeX * scaleX);
    const screenY = cropArea.y + (relativeY * scaleY);
    
    if (typeof window !== 'undefined' && (window as any).electronAPI?.sendMouseEvent) {
      (window as any).electronAPI.sendMouseEvent({
        x: screenX,
        y: screenY,
        type: 'move',
      });
    }
  }, [captureData.interactive, cropArea, screenBounds]);

  // Find and setup live stream
  useEffect(() => {
    if (!captureData.isLiveStream) return;
    
    // Check global stream registry
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
    
    // Poll for stream availability (fallback)
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

  // Setup video element and canvas for cropping
  useEffect(() => {
    if (!liveStream || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup video element
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
        
        // Ensure crop coordinates are within video bounds
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

  return (
    <BaseWidget
      {...props}
      title={node.title || 'Live Capture'}
      icon={<Camera className="w-4 h-4" />}
      className="live-capture-widget"
    >
      <div
        ref={containerRef}
        className="relative w-full h-full bg-black rounded-b-lg overflow-hidden"
        style={{
          pointerEvents: captureData.interactive ? 'auto' : 'none',
        }}
        onClick={handleInteractiveClick}
        onMouseMove={handleInteractiveMouseMove}
      >
        {/* Hidden video element for stream */}
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
        
        {/* Controls overlay */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-1">
          <button
            onClick={handleTogglePause}
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
            onClick={handleToggleMute}
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
    </BaseWidget>
  );
}

export default memo(LiveCaptureWidget);

