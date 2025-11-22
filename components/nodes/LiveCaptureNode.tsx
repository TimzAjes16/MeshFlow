/**
 * Live Capture Node Component
 * Displays captured areas from screenshots/applications for tracking changes over time
 * Inspired by Aries Infinite functionality
 */

import { memo, useEffect, useRef, useState } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Camera, RefreshCw, History } from 'lucide-react';
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
}

function LiveCaptureNode({ data, selected, id }: LiveCaptureNodeProps) {
  const { node } = data;
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Extract capture config from content
  const captureData: CaptureData = typeof node.content === 'object' && node.content?.type === 'live-capture'
    ? {
        imageUrl: node.content.imageUrl || '',
        cropArea: node.content.cropArea || { x: 0, y: 0, width: 0, height: 0 },
        sourceUrl: node.content.sourceUrl || '',
        timestamp: node.content.timestamp || new Date().toISOString(),
        captureHistory: node.content.captureHistory || [],
      }
    : {
        imageUrl: '',
        cropArea: { x: 0, y: 0, width: 0, height: 0 },
        captureHistory: [],
      };

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
        
        if (Math.abs((node.width || 300) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5) {
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
  }, [captureData.imageUrl, id, node.width, node.height, updateNode]);

  // Measure container for empty state
  useEffect(() => {
    if (containerRef.current && !captureData.imageUrl) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (Math.abs((node.width || 300) - width) > 5 || Math.abs((node.height || 200) - height) > 5) {
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
  }, [captureData.imageUrl, id, node.width, node.height, updateNode]);

  const handleUpdateCapture = () => {
    // Trigger capture modal to update this node
    window.dispatchEvent(new CustomEvent('update-capture-node', { detail: { nodeId: id } }));
  };

  if (!captureData.imageUrl) {
    return (
      <BaseNode node={node} selected={selected}>
        <div 
          ref={containerRef}
          className="p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-blue-300 flex flex-col items-center justify-center min-w-[300px] min-h-[200px]"
        >
          <Camera className="w-12 h-12 text-blue-400 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">Live Capture Node</p>
          <p className="text-xs text-gray-500 text-center">Click to capture an area</p>
        </div>
      </BaseNode>
    );
  }

  const captureHistory = captureData.captureHistory || [];
  const latestCapture = captureHistory.length > 0 
    ? captureHistory[captureHistory.length - 1]
    : null;

  return (
    <BaseNode node={node} selected={selected}>
      <div 
        ref={containerRef}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        style={{ 
          width: imageDimensions ? `${imageDimensions.width + 32}px` : 'auto',
          minWidth: '300px',
        }}
      >
        {/* Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-white" />
            <span className="text-xs font-medium text-white">Live Capture</span>
            {captureHistory.length > 0 && (
              <span className="text-xs text-white/80">
                ({captureHistory.length} {captureHistory.length === 1 ? 'capture' : 'captures'})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {captureHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="View history"
              >
                <History className="w-3.5 h-3.5 text-white" />
              </button>
            )}
            <button
              onClick={handleUpdateCapture}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Update capture"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="relative">
          <img
            ref={imageRef}
            src={latestCapture?.imageUrl || captureData.imageUrl}
            alt="Captured area"
            className="w-full h-auto block"
            style={{ 
              maxWidth: '100%',
              width: imageDimensions ? `${imageDimensions.width}px` : 'auto',
              height: imageDimensions ? `${imageDimensions.height}px` : 'auto',
            }}
          />
          
          {/* Timestamp overlay */}
          {latestCapture?.timestamp && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {new Date(latestCapture.timestamp).toLocaleString()}
            </div>
          )}
        </div>

        {/* History Panel */}
        {showHistory && captureHistory.length > 0 && (
          <div className="border-t border-gray-200 p-3 bg-gray-50 max-h-48 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-700 mb-2">Capture History</div>
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
                    <div className="font-medium text-gray-900">
                      Capture {captureHistory.length - index}
                    </div>
                    <div className="text-gray-500 truncate">
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

