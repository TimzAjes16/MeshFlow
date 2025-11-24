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
  // Handle both formats: { type: 'image', url: ... } and { image: { url: ... } }
  let imageConfig: { url: string; size?: string; alignment?: string } = { url: '', size: 'medium', alignment: 'center' };
  
  if (typeof node.content === 'object' && node.content !== null) {
    if (node.content.type === 'image') {
      // New format: { type: 'image', url: ..., size: ..., alignment: ... }
      imageConfig = node.content as any;
    } else if ('image' in node.content) {
      // Old format: { image: { url: ..., size: ..., alignment: ... } }
      imageConfig = (node.content as any).image;
    }
  }

  const { url, size = 'medium', alignment = 'center' } = imageConfig;
  
  const sizeMap = {
    small: 200,
    medium: 400,
    large: 600,
    full: 800,
  };

  const maxWidth = sizeMap[size as keyof typeof sizeMap] || sizeMap.medium;

  // Track last dimensions we set to prevent infinite loops
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

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
        
        // Only update if dimensions changed significantly AND we didn't just set these values
        const lastDims = lastDimensionsRef.current;
        if (
          (!lastDims || Math.abs(lastDims.width - newWidth) > 5 || Math.abs(lastDims.height - newHeight) > 5) &&
          (Math.abs((node.width || maxWidth) - newWidth) > 5 || Math.abs((node.height || 200) - newHeight) > 5)
        ) {
          lastDimensionsRef.current = { width: newWidth, height: newHeight };
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
    // Remove node.width and node.height from dependencies to prevent infinite loops
    // Only re-run when URL or maxWidth changes (which should trigger a resize)
  }, [url, maxWidth, id, updateNode]);

  // Measure container for empty state
  useEffect(() => {
    if (containerRef.current && !url) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          // Only update if dimensions changed significantly AND we didn't just set these values
          const lastDims = lastDimensionsRef.current;
          if (
            (!lastDims || Math.abs(lastDims.width - width) > 5 || Math.abs(lastDims.height - height) > 5) &&
            (Math.abs((node.width || maxWidth) - width) > 5 || Math.abs((node.height || 200) - height) > 5)
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
    // Only re-run when URL changes (which determines if we show empty state)
  }, [url, id, maxWidth, updateNode]);

  if (!url) {
    return (
      <BaseNode node={node} selected={selected} nodeId={id} >
        <div 
          ref={containerRef}
          className="p-8 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
          style={{ 
            width: node.width ? `${node.width}px` : `${maxWidth}px`, 
            height: node.height ? `${node.height}px` : '200px',
            minHeight: '200px',
          }}
        >
          <div className="text-center">
            <ImageIcon className="w-12 h-12 text-black mx-auto mb-2" />
            <p className="text-sm text-black">No image</p>
          </div>
        </div>
      </BaseNode>
    );
  }

  return (
    <BaseNode node={node} selected={selected} nodeId={id} >
      <div 
        className="rounded-lg overflow-hidden shadow-sm border border-gray-200"
        style={{ 
          width: node.width ? `${node.width}px` : (imageDimensions ? `${imageDimensions.width}px` : `${maxWidth}px`),
          height: node.height ? `${node.height}px` : (imageDimensions ? `${imageDimensions.height}px` : 'auto'),
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
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    </BaseNode>
  );
}

export default memo(ImageNode);

