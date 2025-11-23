/**
 * Screen Capture Monitor Component
 * Continuously monitors a screen area or URL for changes
 * Automatically captures when content changes (e.g., website JS updates, video playback)
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ScreenCaptureMonitorProps {
  enabled: boolean;
  stream?: MediaStream | null; // Optional stream to monitor (if not provided, will create own)
  sourceUrl?: string; // URL to monitor (if monitoring a webpage)
  captureArea?: { x: number; y: number; width: number; height: number } | null; // Screen area to capture
  interval?: number; // Capture interval in milliseconds
  onCapture: (imageUrl: string) => void;
  onError?: (error: Error) => void;
}

export default function ScreenCaptureMonitor({
  enabled,
  stream: externalStream,
  sourceUrl,
  captureArea,
  interval = 2000, // Default 2 seconds
  onCapture,
  onError,
}: ScreenCaptureMonitorProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCaptureHashRef = useRef<string | null>(null);
  const isCapturingRef = useRef(false);

  // Calculate perceptual hash for change detection
  const calculateImageHash = useCallback(async (imageUrl: string): Promise<string> => {
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
          
          canvas.width = 8;
          canvas.height = 8;
          ctx.drawImage(img, 0, 0, 8, 8);
          
          const imageData = ctx.getImageData(0, 0, 8, 8);
          const pixels = imageData.data;
          
          let totalBrightness = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            totalBrightness += (r + g + b) / 3;
          }
          const avgBrightness = totalBrightness / (pixels.length / 4);
          
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
  }, []);

  // Calculate similarity between two hashes
  const calculateSimilarity = useCallback((hash1: string, hash2: string): number => {
    if (hash1.length !== hash2.length || hash1.length === 0) return 0;
    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    return matches / hash1.length;
  }, []);

  // Capture frame from video stream
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isCapturingRef.current) return;
    
    isCapturingRef.current = true;
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        isCapturingRef.current = false;
        return;
      }

      // Set canvas size to match capture area or video size
      if (captureArea) {
        canvas.width = captureArea.width;
        canvas.height = captureArea.height;
        ctx.drawImage(
          video,
          captureArea.x, captureArea.y, captureArea.width, captureArea.height,
          0, 0, captureArea.width, captureArea.height
        );
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
      }

      const imageUrl = canvas.toDataURL('image/png');
      
      // Calculate hash and compare
      const currentHash = await calculateImageHash(imageUrl);
      
      if (currentHash === '') {
        isCapturingRef.current = false;
        return;
      }

      // Check if this is different from last capture
      if (lastCaptureHashRef.current === null) {
        // First capture
        lastCaptureHashRef.current = currentHash;
        onCapture(imageUrl);
      } else {
        const similarity = calculateSimilarity(lastCaptureHashRef.current, currentHash);
        
        // If similarity is less than 95%, consider it a change
        if (similarity < 0.95) {
          console.log('Change detected in screen capture (similarity:', (similarity * 100).toFixed(1) + '%)');
          lastCaptureHashRef.current = currentHash;
          onCapture(imageUrl);
        }
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      isCapturingRef.current = false;
    }
  }, [captureArea, calculateImageHash, calculateSimilarity, onCapture, onError]);

  // Start screen capture
  useEffect(() => {
    if (!enabled) {
      // Cleanup
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (videoRef.current && videoRef.current.parentNode) {
        document.body.removeChild(videoRef.current);
        videoRef.current = null;
      }
      return;
    }

    // Request screen capture permission (only if no external stream provided)
    const startCapture = async () => {
      try {
        let stream = externalStream || streamRef.current;
        
        if (!stream) {
          // Use screen capture utility that works in both Electron and browser
          const { getScreenCaptureStream } = await import('@/lib/electronUtils');
          stream = await getScreenCaptureStream();
          streamRef.current = stream;
        }

        // Create hidden video element to capture stream in background
        // This allows monitoring to continue even when user switches windows/apps
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true; // Mute to avoid any audio issues
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-1';
        video.setAttribute('aria-hidden', 'true');
        video.srcObject = stream;
        videoRef.current = video;
        document.body.appendChild(video);

        // Create canvas for capturing frames
        const canvas = document.createElement('canvas');
        canvasRef.current = canvas;

        // Wait for video to be ready
        video.addEventListener('loadedmetadata', () => {
          video.play().then(() => {
            // Initialize hash with first frame after a short delay
            setTimeout(() => {
              captureFrame();
            }, 1000);
            
            // Start periodic capture
            captureIntervalRef.current = setInterval(() => {
              captureFrame();
            }, interval);
          });
        });

        // Handle stream end (user stops sharing) - works for both external and created streams
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          if (captureIntervalRef.current) {
            clearInterval(captureIntervalRef.current);
            captureIntervalRef.current = null;
          }
          if (videoRef.current && videoRef.current.parentNode) {
            document.body.removeChild(videoRef.current);
            videoRef.current = null;
          }
          // Only clear streamRef if we created it
          if (!externalStream) {
            streamRef.current = null;
          }
          lastCaptureHashRef.current = null;
          // Notify parent component
          if (onError) {
            onError(new Error('Screen sharing ended by user'));
          }
        });

      } catch (error) {
        console.error('Error starting screen capture:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
      }
    };

    startCapture();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
        captureIntervalRef.current = null;
      }
      if (videoRef.current && videoRef.current.parentNode) {
        document.body.removeChild(videoRef.current);
        videoRef.current = null;
      }
      lastCaptureHashRef.current = null;
    };
  }, [enabled, captureArea, interval, captureFrame, onError, externalStream]);

  // Note: Screen share is now handled by parent component (CanvasPageClient)
  // This component only monitors the stream after area is selected

  return null; // This component doesn't render anything visible
}

