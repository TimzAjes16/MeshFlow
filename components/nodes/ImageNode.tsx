/**
 * Image Node Component
 * Renders images (like Notion image block)
 */

import { memo, useEffect, useRef, useState } from 'react';
import BaseNode from './BaseNode';
import type { Node as NodeType } from '@/types/Node';
import { NodeProps } from 'reactflow';
import { Image as ImageIcon } from 'lucide-react';
import { useWorkspaceStore } from '@/state/workspaceStore';

interface ImageNodeProps extends NodeProps {
  data: {
    node: NodeType;
  };
}

function ImageNode({ data, selected, id }: ImageNodeProps) {
  const { node } = data;
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Extract image config from content
  const imageConfig = typeof node.content === 'object' && node.content?.type === 'image'
    ? node.content
    : { url: '', size: 'medium', alignment: 'center' };

  const { url, size = 'medium', alignment = 'center' } = imageConfig;
  
  const sizeMap = {
    small: 200,
    medium: 400,
    large: 600,
    full: 800,
  };

  const maxWidth = sizeMap[size as keyof typeof sizeMap] || sizeMap.medium;

  // Update dimensions when image loads
  useEffect(() => {
    if (imageRef.current && url) {
      const img = imageRef.current;
      const handleLoad = () => {
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const width = Math.min(maxWidth, img.naturalWidth);
        const height = width * aspectRatio;
        setImageDimensions({ width, height });
        
        const newWidth = width + 16; // Add padding
        const newHeight = height + 16;
        
        // Only update if dimensions changed significantly
        if (Math.abs((node.width || maxWidth) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5) {
          // Update workspace store - this will sync to React Flow via CanvasContainer
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
  }, [url, maxWidth, id, node.width, node.height, updateNode]);

  // Measure container for empty state
  useEffect(() => {
    if (containerRef.current && !url) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // Only update if dimensions changed significantly
          if (Math.abs((node.width || maxWidth) - width) > 5 || Math.abs((node.height || 200) - height) > 5) {
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
  }, [url, id, node.width, node.height, maxWidth, updateNode]);

  if (!url) {
    return (
      <BaseNode node={node} selected={selected}>
        <div 
          ref={containerRef}
          className="p-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={{ width: `${maxWidth}px`, minHeight: '200px' }}
        >
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No image</p>
          </div>
        </div>
      </BaseNode>
    );
  }

  return (
    <BaseNode node={node} selected={selected}>
      <div 
        className="rounded-lg overflow-hidden shadow-sm border border-gray-200"
        style={{ 
          width: imageDimensions ? `${imageDimensions.width}px` : `${maxWidth}px`,
          textAlign: alignment as any,
        }}
      >
        <img
          ref={imageRef}
          src={url}
          alt={node.title || 'Image'}
          className="w-full h-auto"
          style={{ 
            maxWidth: '100%',
            width: imageDimensions ? `${imageDimensions.width}px` : 'auto',
            height: imageDimensions ? `${imageDimensions.height}px` : 'auto',
          }}
        />
      </div>
    </BaseNode>
  );
}

export default memo(ImageNode);

