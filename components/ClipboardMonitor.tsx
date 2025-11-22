/**
 * Clipboard Monitor Component
 * Monitors clipboard for new screenshots/images and automatically detects changes
 * Designed for monitoring dynamic content like TradingView charts
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ClipboardMonitorProps {
  enabled: boolean;
  onNewImage: (imageUrl: string) => void;
  compareWithPrevious?: (newImageUrl: string, previousImageUrl: string) => Promise<boolean>;
}

export default function ClipboardMonitor({ 
  enabled, 
  onNewImage,
  compareWithPrevious 
}: ClipboardMonitorProps) {
  const lastClipboardHashRef = useRef<string | null>(null);
  const isMonitoringRef = useRef(false);

  // Calculate perceptual hash for image comparison
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
          
          // Downscale to 8x8 for fast perceptual hashing
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
          
          // Generate perceptual hash
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

  // Monitor clipboard for changes
  useEffect(() => {
    if (!enabled || isMonitoringRef.current) return;

    isMonitoringRef.current = true;
    let lastCheckTime = Date.now();
    const checkInterval = 500; // Check every 500ms for responsive detection

    const checkClipboard = async () => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        
        for (const item of clipboardItems) {
          if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
            const blob = await item.getType('image/png') || await item.getType('image/jpeg');
            
            // Convert blob to data URL
            const reader = new FileReader();
            reader.onloadend = async () => {
              const imageUrl = reader.result as string;
              
              // Calculate hash for this image
              const currentHash = await calculateImageHash(imageUrl);
              
              if (currentHash === '') return;
              
              // Check if this is a new/different image
              if (lastClipboardHashRef.current === null) {
                // First image detected
                lastClipboardHashRef.current = currentHash;
                onNewImage(imageUrl);
              } else {
                // Compare with previous image
                const similarity = calculateSimilarity(lastClipboardHashRef.current, currentHash);
                
                // If similarity is less than 95%, consider it a change
                if (similarity < 0.95) {
                  console.log('New clipboard image detected (similarity:', (similarity * 100).toFixed(1) + '%)');
                  lastClipboardHashRef.current = currentHash;
                  
                  // If custom comparison function provided, use it
                  if (compareWithPrevious) {
                    const shouldCapture = await compareWithPrevious(imageUrl, '');
                    if (shouldCapture) {
                      onNewImage(imageUrl);
                    }
                  } else {
                    // Default: always capture on change detection
                    onNewImage(imageUrl);
                  }
                }
              }
            };
            
            reader.readAsDataURL(blob);
            break; // Only process first image
          }
        }
      } catch (error) {
        // Clipboard access denied or not available
        // This is expected if user hasn't granted permission
        if (error instanceof Error && error.name !== 'NotAllowedError') {
          console.error('Error checking clipboard:', error);
        }
      }
    };

    const intervalId = setInterval(checkClipboard, checkInterval);

    return () => {
      clearInterval(intervalId);
      isMonitoringRef.current = false;
    };
  }, [enabled, onNewImage, calculateImageHash, calculateSimilarity, compareWithPrevious]);

  // Listen for paste events as backup
  useEffect(() => {
    if (!enabled) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onloadend = async () => {
            const imageUrl = reader.result as string;
            const currentHash = await calculateImageHash(imageUrl);
            
            if (currentHash === '') return;
            
            // Check if different from last capture
            if (lastClipboardHashRef.current === null || 
                calculateSimilarity(lastClipboardHashRef.current, currentHash) < 0.95) {
              lastClipboardHashRef.current = currentHash;
              onNewImage(imageUrl);
            }
          };
          
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [enabled, onNewImage, calculateImageHash, calculateSimilarity]);

  return null; // This component doesn't render anything
}

