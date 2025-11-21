'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';

function EdgeComponent({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Animate opacity for dynamic pulsing effect
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    // Subtle pulse animation
    const interval = setInterval(() => {
      setOpacity((prev) => (prev === 0.2 ? 0.5 : 0.2));
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Calculate edge length for dynamic glow intensity
  const edgeLength = Math.sqrt(
    Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
  );
  const glowIntensity = Math.min(1, Math.max(0.3, edgeLength / 800));

  // Get edge color based on source/target node colors or default
  const rgbaColor = useMemo(() => {
    let colorHex = '#94a3b8'; // Default soft gray
    
    if (data?.sourceColor) {
      // Use source color, or blend with target if available
      colorHex = data.sourceColor.primary;
      if (data?.targetColor && data.sourceColor.primary !== data.targetColor.primary) {
        // Blend colors for edges between different clusters
        colorHex = data.sourceColor.primary; // Use source color for now
      }
    }
    
    // Convert hex to rgba with transparency
    if (colorHex.startsWith('#')) {
      const r = parseInt(colorHex.slice(1, 3), 16);
      const g = parseInt(colorHex.slice(3, 5), 16);
      const b = parseInt(colorHex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.3)`;
    }
    
    return 'rgba(148, 163, 184, 0.3)';
  }, [data]);

  return (
    <g>
      {/* Outer glow layer - very subtle, blurred */}
      <path
        d={edgePath}
        fill="none"
        stroke={rgbaColor}
        strokeWidth={3}
        style={{
          filter: 'blur(4px)',
          opacity: glowIntensity * 0.2,
        }}
      />
      
      {/* Middle glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={rgbaColor}
        strokeWidth={2}
        style={{
          filter: 'blur(2px)',
          opacity: glowIntensity * 0.4,
        }}
      />
      
      {/* Main edge line - sharp but subtle */}
      <path
        d={edgePath}
        fill="none"
        stroke={rgbaColor}
        strokeWidth={1}
        style={{
          filter: `drop-shadow(0 0 2px ${rgbaColor})`,
          transition: 'opacity 2.5s ease-in-out',
          opacity: opacity * glowIntensity,
        }}
        markerEnd={markerEnd}
      />
      
      {/* Subtle animated flow particle */}
      <circle r="1.5" fill={rgbaColor} style={{ filter: 'blur(0.5px)', opacity: 0.6 }}>
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          path={edgePath}
        />
        <animate
          attributeName="opacity"
          values="0;0.8;0.8;0"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}

export default memo(EdgeComponent);
