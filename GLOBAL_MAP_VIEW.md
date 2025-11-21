# Zoomed-Out Global Map View

This document describes the implementation of the zoomed-out global map view with color-coded clusters and minimal interface.

## Features Implemented

### 1. **Color-Coded Clusters**
- Nodes are automatically assigned colors based on their tags or titles
- 8 distinct color palettes representing different topics/clusters:
  - Purple/Pink gradients
  - Blue/Cyan gradients
  - Pink/Orange gradients
  - Yellow/Amber (default)
  - Green/Emerald
  - Indigo/Violet
  - Red/Rose
  - Teal/Cyan

### 2. **Glowing Nodes**
- Each node is rendered as a glowing orb with:
  - Radial gradient based on cluster color
  - Animated pulsing glow effect
  - Soft shadows that breathe
  - Inner core glow for depth
  - Color-matched labels below nodes

### 3. **Soft Glow Edges**
- Edges connect nodes with:
  - Multiple layered glow effects (outer blur, middle glow, sharp core)
  - Color matching source node's cluster
  - Animated opacity pulsing
  - Subtle flow particles traveling along edges
  - Dynamic intensity based on edge length

### 4. **Zoomed-Out Perspective**
- Default viewport set to `zoom: 0.25` for global overview
- Minimum zoom level: `0.05` (very zoomed out)
- Maximum zoom level: `2.0`
- Auto-fit view on initialization with minimal padding
- Infinite canvas background with subtle dot grid

### 5. **Minimal Interface**
- Dark theme: `#0a0a0a` background
- Subtle background dots (opacity: 0.08)
- Minimal controls with low opacity
- Compact minimap (120x120px)
- Auto-Organize button with understated styling
- No distracting UI elements

## File Changes

### New Files
- `lib/nodeColors.ts` - Color palette and color assignment logic

### Modified Files
- `components/NodeComponent.tsx` - Color-coded glowing orbs
- `components/EdgeComponent.tsx` - Soft glowing edges with color matching
- `components/CanvasContainer.tsx` - Global view settings and edge color data

## Usage

The global map view is automatically enabled when viewing the canvas. The view features:

1. **Auto-Organization**: Click "Auto-Organize" button or wait for automatic organization on load
2. **Color Clustering**: Nodes with similar tags/topics will have similar colors
3. **Infinite Canvas**: Pan and zoom freely across the knowledge graph
4. **Minimal UI**: Focus on the content with minimal interface distractions

## Color Assignment Logic

```typescript
// Nodes get colors based on:
1. First tag (if available) - hash-based selection
2. Title (if no tags) - hash-based selection
3. Default yellow (if neither available)

// Edges get colors from:
- Source node's color
- Blended with target node's color (if different cluster)
```

## Customization

To adjust the global view:

1. **Zoom Level**: Modify `defaultViewport.zoom` in `CanvasContainer.tsx`
2. **Background**: Adjust `Background` component opacity and gap
3. **Colors**: Add/modify colors in `CLUSTER_COLORS` array in `nodeColors.ts`
4. **Glow Intensity**: Adjust `getGlowShadow()` intensity parameter

## Visual Description

The global map view presents:
- **Wide Perspective**: Entire knowledge graph visible at once
- **Color Clusters**: Related topics grouped visually by color
- **Soft Glows**: Gentle lighting effects create depth and hierarchy
- **Minimal Interface**: Clean, unobtrusive UI elements
- **Infinite Canvas**: Seamless panning and zooming experience
