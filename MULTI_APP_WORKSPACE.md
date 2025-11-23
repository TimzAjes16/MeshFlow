# Multi-App Workspace Architecture

## Overview

MeshFlow's Live Capture Tool enables a modular, multi-app workspace similar to professional trading platforms like ARES+ Interactive. This document outlines the technical architecture and implementation strategy.

## Current Implementation

### 1. Live Capture Tool

The Live Capture Tool allows users to:
- Select any area of their screen using a draggable/resizable crop overlay
- Capture live video feeds from any application (Safari, Discord, TradingView, etc.)
- Embed these live feeds as interactive widgets on the canvas
- Enable interactive mode to forward clicks/keyboard events to the source application

**Technology Stack:**
- **Screen Capture**: `getDisplayMedia` API (Electron's `desktopCapturer` as fallback)
- **Video Streaming**: MediaStream API with HTML5 `<video>` and `<canvas>` elements
- **Coordinate Mapping**: Screen-space to video-space coordinate conversion for accurate cropping
- **Input Injection**: Electron IPC for forwarding mouse/keyboard events (interactive mode)

### 2. Workspace Navigation via Pinch-to-Zoom

**Feature**: Pinwheel (pinch-to-zoom) gesture on zoom out reveals a workspace switcher overlay.

**Implementation:**
- When zoom level drops below 0.3x (zoomed out significantly), the workspace switcher appears
- Users can browse and switch between all their workspaces
- Closing the switcher automatically zooms back in to 0.5x

**Files:**
- `components/WorkspaceSwitcher.tsx` - Modal overlay for workspace selection
- `components/CanvasContainer.tsx` - Zoom detection and switcher integration

## Technical Architecture

### Screen Capture & Embedding

```
User Action → Crop Area Selection → Screen Capture Picker → MediaStream
                                                              ↓
                                                    LiveCaptureNode (Widget)
                                                              ↓
                                                    Canvas (Multi-App Workspace)
```

### Interactive Mode

When interactive mode is enabled:
1. User clicks on the live capture widget
2. Coordinates are captured relative to the widget
3. Coordinates are converted from widget-space to screen-space
4. Electron IPC forwards the event to the source application
5. Source application receives the click as if it was direct interaction

**Key Files:**
- `components/nodes/LiveCaptureNode.tsx` - Widget rendering and event handling
- `lib/electronUtils.ts` - Screen capture utilities
- `electron/main.js` - IPC handlers for input injection

## Future Enhancements

### 1. Native Window Embedding

For true multi-app workspace (embedding full applications like Discord):

**Required:**
- Native Node.js C++ Addons
- Platform-specific APIs:
  - **Windows**: `SetParent()` API to embed external windows
  - **macOS**: Core Graphics window management APIs
  - **Linux**: X11 window embedding

**Implementation Path:**
1. Create C++ addon using `node-addon-api`
2. Expose functions to find window handles by process name
3. Use OS APIs to make external window a child of Electron window
4. Handle window lifecycle (minimize, close, resize)

### 2. Enhanced Web Embedding

For embedding restricted websites (bypassing CORS/frame-busting):

**Current**: Standard `<iframe>` or Electron `<webview>` tag

**Enhanced**:
- Use Chromium Embedded Framework (CEF) or WebView2
- Inject custom headers/scripts to bypass restrictions
- Full control over security policies
- Custom communication channels via IPC

### 3. Advanced Input Injection

**Current**: Basic mouse/keyboard event forwarding via Electron IPC

**Enhanced**:
- Multi-touch gesture support
- Keyboard shortcuts forwarding
- Drag-and-drop between embedded apps
- Clipboard synchronization

## API Endpoints

### Workspaces API

**GET `/api/workspaces`**
- Returns list of user's workspaces
- Used by WorkspaceSwitcher component

**Response Format:**
```json
{
  "workspaces": [
    {
      "id": "string",
      "name": "string",
      "nodeCount": number,
      "edgeCount": number,
      "updatedAt": "ISO string"
    }
  ]
}
```

## Usage

### Creating a Multi-App Workspace

1. **Add Live Capture Widgets:**
   - Click the camera icon in the vertical toolbar
   - Click "Area Highlight" in the horizontal editor bar
   - Select the area you want to capture
   - Choose the source application in the screen capture picker
   - The live feed appears as a widget on your canvas

2. **Enable Interactive Mode:**
   - Click on a live capture widget
   - Toggle "Interactive" in the horizontal editor bar
   - Now clicks on the widget are forwarded to the source app

3. **Switch Workspaces:**
   - Pinch-to-zoom out (or scroll wheel zoom out) until zoom < 0.3x
   - Workspace switcher overlay appears
   - Click on any workspace to switch
   - Or create a new workspace

## Performance Considerations

- **Video Streaming**: Each live capture widget maintains its own MediaStream
- **Memory**: Multiple streams can be memory-intensive; consider limiting concurrent captures
- **CPU**: Canvas rendering and coordinate transformations are optimized with throttling
- **Network**: Live captures are local (screen capture), no network overhead

## Security & Permissions

### Required Permissions

**macOS:**
- Screen Recording permission (System Preferences > Security & Privacy)
- Accessibility permission (for input injection in interactive mode)

**Windows:**
- Screen capture permission (Windows Settings > Privacy)
- Input injection requires elevated privileges

### Security Model

- Live captures are isolated in their own widget containers
- Interactive mode requires explicit user activation
- Input injection is scoped to the captured area only
- No cross-origin data access (all captures are local)

## Limitations

1. **Browser-based**: Current implementation uses web APIs, limited by browser security
2. **No Native Embedding**: Cannot embed full desktop applications yet (requires C++ addons)
3. **Performance**: Multiple high-resolution streams may impact performance
4. **Platform-specific**: Input injection requires platform-specific native code

## Roadmap

- [ ] Native window embedding (C++ addons)
- [ ] Enhanced web embedding (CEF/WebView2)
- [ ] Multi-touch gesture support
- [ ] Workspace templates
- [ ] Cross-workspace linking
- [ ] Performance optimizations for multiple streams

