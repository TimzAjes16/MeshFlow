/**
 * Capture Modal Component
 * Inspired by Aries Infinite - allows users to capture and crop areas of screenshots
 * for live tracking on canvas
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Camera, Upload, Crop, Check, RotateCcw } from 'lucide-react';

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageUrl: string, cropArea: { x: number; y: number; width: number; height: number }) => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CaptureModal({ isOpen, onClose, onCapture }: CaptureModalProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setImageUrl('');
      setIsCropping(false);
      setCropArea(null);
      setIsDrawing(false);
      setStartPos(null);
      setCurrentPos(null);
    }
  }, [isOpen]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImageUrl(base64);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType('image/png') || await item.getType('image/jpeg');
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            setImageUrl(base64);
            setIsCropping(true);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert('No image found in clipboard');
    } catch (error) {
      console.error('Error pasting from clipboard:', error);
      alert('Failed to paste image from clipboard');
    }
  }, []);

  // Calculate crop area from mouse coordinates (in image coordinates)
  const calculateCropArea = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!imageRef.current) return null;

    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to image coordinates
    const x1 = start.x - imageRect.left;
    const y1 = start.y - imageRect.top;
    const x2 = end.x - imageRect.left;
    const y2 = end.y - imageRect.top;
    
    // Ensure coordinates are within image bounds
    const clampedX1 = Math.max(0, Math.min(imageRect.width, x1));
    const clampedY1 = Math.max(0, Math.min(imageRect.height, y1));
    const clampedX2 = Math.max(0, Math.min(imageRect.width, x2));
    const clampedY2 = Math.max(0, Math.min(imageRect.height, y2));

    const x = Math.min(clampedX1, clampedX2);
    const y = Math.min(clampedY1, clampedY2);
    const width = Math.abs(clampedX2 - clampedX1);
    const height = Math.abs(clampedY2 - clampedY1);

    return { x, y, width, height };
  }, []);

  // Handle mouse down - start drawing crop area
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isCropping || !imageRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = imageRef.current.getBoundingClientRect();
    setStartPos({ x: e.clientX, y: e.clientY });
    setCurrentPos({ x: e.clientX, y: e.clientY });
    setIsDrawing(true);
  }, [isCropping]);

  // Handle mouse move - update crop area
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;
    
    setCurrentPos({ x: e.clientX, y: e.clientY });
    
    if (startPos && currentPos) {
      const area = calculateCropArea(startPos, { x: e.clientX, y: e.clientY });
      if (area) setCropArea(area);
    }
  }, [isDrawing, startPos, currentPos, calculateCropArea]);

  // Handle mouse up - finish drawing crop area
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !startPos || !currentPos) return;
    
    setIsDrawing(false);
    
    // Calculate crop area in image coordinates
    const area = calculateCropArea(startPos, currentPos);
    if (area && area.width > 10 && area.height > 10) {
      setCropArea(area);
    }
    
    setStartPos(null);
    setCurrentPos(null);
  }, [isDrawing, startPos, currentPos, calculateCropArea]);

  // Handle confirm - crop image and create node
  const handleConfirm = useCallback(() => {
    if (!imageUrl || !cropArea || !imageRef.current) return;

    // Create canvas to crop the image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = cropArea.width;
      canvas.height = cropArea.height;
      
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      const croppedImageUrl = canvas.toDataURL('image/png');
      onCapture(croppedImageUrl, cropArea);
      onClose();
    };
    img.src = imageUrl;
  }, [imageUrl, cropArea, onCapture, onClose]);

  // Get current crop area for display
  const displayCropArea = cropArea && startPos && currentPos
    ? calculateCropArea(startPos, currentPos)
    : cropArea;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Live Capture</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!imageUrl ? (
            // Upload section
            <div className="space-y-4">
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Capture an Area to Track
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Upload a screenshot or paste from clipboard, then select the area you want to track
                </p>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Screenshot
                  </button>
                  
                  <button
                    onClick={handlePaste}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium"
                  >
                    Paste from Clipboard
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            // Crop section
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Draw a box to select the area you want to track
                </p>
                <button
                  onClick={() => {
                    setImageUrl('');
                    setIsCropping(false);
                    setCropArea(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Choose Different Image
                </button>
              </div>
              
              <div
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-100"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isCropping ? 'crosshair' : 'default' }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Screenshot to crop"
                  className="max-w-full h-auto block"
                  draggable={false}
                />
                
                {/* Crop area overlay */}
                {displayCropArea && imageRef.current && (
                  (() => {
                    const imageRect = imageRef.current!.getBoundingClientRect();
                    const containerRect = containerRef.current!.getBoundingClientRect();
                    const offsetX = imageRect.left - containerRect.left;
                    const offsetY = imageRect.top - containerRect.top;
                    
                    return (
                      <div
                        className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-10"
                        style={{
                          left: `${offsetX + displayCropArea.x}px`,
                          top: `${offsetY + displayCropArea.y}px`,
                          width: `${displayCropArea.width}px`,
                          height: `${displayCropArea.height}px`,
                        }}
                      >
                        <div className="absolute -top-6 left-0 text-xs font-medium text-blue-600 bg-white px-2 py-1 rounded shadow-sm whitespace-nowrap">
                          {Math.round(displayCropArea.width)} × {Math.round(displayCropArea.height)}px
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {imageUrl && cropArea && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Check className="w-5 h-5" />
              Create Capture Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

