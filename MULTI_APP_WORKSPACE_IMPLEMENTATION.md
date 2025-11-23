# Multi-App Workspace Implementation

## Overview

This document describes the implementation of the modular, multi-app workspace system based on the ARES+ Interactive architecture. The system enables embedding live video feeds, web applications, and native desktop applications into a single, cohesive workspace canvas.

## Architecture

### Widget Framework

All content on the canvas is treated as a **widget** - an independent, dockable, resizable component. The widget system provides:

- **BaseWidget**: Common functionality (drag, resize, minimize, close)
- **Widget Types**: Specialized widgets for different content types
- **Widget Registry**: Central registry for all widget types

### Widget Types

#### 1. IframeWidget (`iframe-widget`)
- **Purpose**: Embed web applications using HTML `<iframe>`
- **Use Cases**: Discord, YouTube, Twitch, and other embeddable web services
- **Technology**: Standard HTML iframe with sandbox attributes
- **Interactivity**: Full interactivity within iframe (typing, clicking, etc.)
- **Security**: Isolated via iframe sandbox

#### 2. WebViewWidget (`webview-widget`)
- **Purpose**: Embed restricted websites bypassing CORS/Frame-Busting
- **Use Cases**: Proprietary trading portals, secure bank login pages
- **Technology**: Electron's `<webview>` tag
- **Interactivity**: Full interactivity with custom script injection
- **Security**: Bypasses browser security restrictions (Electron-only)

#### 3. LiveCaptureWidget (`live-capture-widget`)
- **Purpose**: Capture and display live screen areas with interactive control
- **Use Cases**: Monitoring applications, interactive screen sharing
- **Technology**: 
  - **Capture**: Electron's `desktopCapturer` API + `getUserMedia`
  - **Display**: HTML5 `<video>` + `<canvas>` for cropping
  - **Interactivity**: Input injection via native Node.js addon (placeholder)
- **Features**:
  - Live video feed of selected screen area
  - Coordinate mapping for input injection
  - Interactive mode (forward clicks/keyboard to source app)

#### 4. NativeWindowWidget (`native-window-widget`)
- **Purpose**: Embed full native desktop applications
- **Use Cases**: Trading terminals, Discord desktop app, any local application
- **Technology**: 
  - **Windows**: `SetParent` API (requires C++ addon)
  - **macOS**: NSWindow embedding APIs (requires C++ addon)
- **Interactivity**: 100% native interactivity (true app embedding)
- **Status**: Placeholder - requires native Node.js C++ addon

## Implementation Status

### ✅ Completed

1. **Widget Framework**
   - BaseWidget component with drag, resize, minimize, close
   - Widget registry system
   - Integration with React Flow node system

2. **IframeWidget**
   - Full implementation
   - Sandbox configuration
   - Error handling

3. **WebViewWidget**
   - Full implementation
   - Electron webview tag support
   - Fallback to iframe in non-Electron environments

4. **LiveCaptureWidget**
   - Enhanced from LiveCaptureNode
   - Live video feed display
   - Canvas-based cropping
   - Coordinate mapping for input injection
   - Interactive mode UI

5. **VerticalToolbar Integration**
   - Widget creation menu
   - All widget types available

6. **Node Type Registry**
   - Widget types added to node type system
   - Default properties configured

### 🚧 Placeholder (Requires Native Addons)

1. **Native Window Embedding**
   - IPC handlers added (`embed-native-window`, `unembed-native-window`)
   - Placeholder implementation in `electron/main.js`
   - **Required**: C++ Node.js addon for:
     - Windows: `SetParent` API
     - macOS: NSWindow embedding

2. **Input Injection**
   - IPC handlers added (`send-mouse-event`, `send-keyboard-event`)
   - Placeholder implementation in `electron/main.js`
   - **Required**: C++ Node.js addon for:
     - Windows: `SendInput` API
     - macOS: Core Graphics Event APIs

## File Structure

```
components/
  widgets/
    BaseWidget.tsx          # Base widget component
    IframeWidget.tsx        # Web app embedding (iframe)
    WebViewWidget.tsx       # Web app embedding (webview)
    LiveCaptureWidget.tsx   # Live screen capture
    NativeWindowWidget.tsx  # Native app embedding
    index.ts                # Widget registry

components/
  nodes/
    index.ts                # Updated to include widgets

lib/
  nodeTypes.ts              # Updated with widget types

electron/
  main.js                   # IPC handlers for native features
  preload.js                # Exposed APIs for renderer

components/
  VerticalToolbar.tsx       # Widget creation menu
  CanvasPageClient.tsx      # Widget creation handler
```

## Usage

### Creating Widgets

1. Click the **"+"** button in the VerticalToolbar
2. Select widget type from dropdown:
   - **Web App (iframe)**: For embeddable web services
   - **Web App (webview)**: For restricted websites (Electron only)
   - **Live Capture**: For screen area capture
   - **Native App**: For desktop app embedding (requires addon)

### Widget Configuration

Each widget type has specific configuration options:

- **IframeWidget**: URL, sandbox permissions
- **WebViewWidget**: URL, preload script
- **LiveCaptureWidget**: Crop area, interactive mode
- **NativeWindowWidget**: Process name, window title/handle

## Next Steps

### Required for Full Functionality

1. **Build Native Node.js Addons**
   - Create C++ addon for Windows (`SetParent`, `SendInput`)
   - Create C++ addon for macOS (NSWindow, CGEvent)
   - Compile and link with Electron

2. **Input Injection Implementation**
   - Complete coordinate mapping
   - Implement mouse event injection
   - Implement keyboard event injection
   - Test with various applications

3. **Native Window Embedding**
   - Implement window handle discovery
   - Implement SetParent/NSWindow embedding
   - Handle window lifecycle (minimize, close, etc.)

### Optional Enhancements

1. **Widget Docking System**
   - Dock widgets to edges
   - Tabbed widget groups
   - Widget layouts/presets

2. **Widget Communication**
   - Inter-widget messaging
   - Shared state management
   - Event broadcasting

3. **Performance Optimization**
   - Lazy loading for widgets
   - Stream optimization for live capture
   - Memory management for embedded windows

## Technical Notes

### Electron Webview

The `<webview>` tag is only available in Electron environments. The `WebViewWidget` component automatically falls back to an `<iframe>` if not in Electron.

### Screen Capture Permissions

Live capture requires screen recording permissions:
- **macOS**: System Preferences > Security & Privacy > Screen Recording
- **Windows**: No explicit permission (but may require admin for some apps)

### Input Injection Security

Input injection requires elevated permissions and is platform-specific. The implementation uses IPC to communicate between renderer and main process, where the actual injection occurs (via native addon).

## References

- [Electron Webview Documentation](https://www.electronjs.org/docs/latest/api/webview-tag)
- [Electron desktopCapturer API](https://www.electronjs.org/docs/latest/api/desktop-capturer)
- [Windows SetParent API](https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setparent)
- [macOS NSWindow Embedding](https://developer.apple.com/documentation/appkit/nswindow)
- [Node.js Native Addons](https://nodejs.org/api/addons.html)

