# MeshFlow Native Addons

Native Node.js addons for input injection and window embedding functionality.

## Features

- **Input Injection**: Inject mouse and keyboard events into the system
  - Windows: Uses `SendInput` API
  - macOS: Uses Core Graphics Event APIs (CGEvent)
  
- **Window Embedding**: Embed native desktop applications into Electron windows
  - Windows: Uses `SetParent` API
  - macOS: Uses NSWindow embedding

## Building

### Prerequisites

- Node.js (v16+)
- Python 3.x (for node-gyp)
- Build tools:
  - **Windows**: Visual Studio Build Tools or Visual Studio with C++ support
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)

### Build Commands

```bash
# Install dependencies and build
npm run native:build

# Clean build artifacts
npm run native:clean

# Rebuild from scratch
npm run native:rebuild
```

Or manually:

```bash
cd native-addons
npm install
npm run build
```

## Usage

The native addon is automatically loaded by Electron's main process. If the addon is not built, the system will fall back to mock implementations (which log warnings but don't fail).

### Input Injection

```javascript
// In Electron main process
const nativeAddon = require('./native-addons');

// Inject mouse click
nativeAddon.injectMouseEvent({
  type: 'click',
  x: 100,
  y: 200,
  button: 0, // 0=left, 1=right, 2=middle
});

// Inject keyboard event
nativeAddon.injectKeyboardEvent({
  type: 'keydown',
  key: 'Enter',
  code: 'Enter',
});
```

### Window Embedding

```javascript
// Find a window
const result = nativeAddon.findWindow({
  processName: 'Discord',
  windowTitle: 'Discord',
});

if (result.found) {
  // Embed the window
  nativeAddon.embedWindow({
    containerId: 'widget-1',
    processName: 'Discord',
    windowTitle: 'Discord',
    parentWindowHandle: parentWindowHandle, // From Electron BrowserWindow
  });
}
```

## Architecture

### File Structure

```
native-addons/
├── binding.gyp              # Build configuration
├── index.js                 # Node.js wrapper
├── package.json             # Addon package.json
├── src/
│   ├── meshflow_native.cc   # Main module entry
│   ├── input_injection.h    # Input injection header
│   ├── input_injection.cc   # Input injection implementation
│   ├── input_injection_win.cc   # Windows input injection
│   ├── input_injection_mac.mm   # macOS input injection
│   ├── window_embedding.h   # Window embedding header
│   ├── window_embedding.cc  # Window embedding implementation
│   ├── window_embedding_win.cc  # Windows window embedding
│   └── window_embedding_mac.mm  # macOS window embedding
└── build/                   # Build output (generated)
```

### Platform-Specific Code

- **Windows**: Uses Win32 APIs (`SendInput`, `SetParent`, `EnumWindows`)
- **macOS**: Uses Cocoa/AppKit and Core Graphics APIs

## Permissions

### macOS

The app requires Accessibility permissions for input injection:
1. System Preferences > Security & Privacy > Privacy > Accessibility
2. Add MeshFlow to the list

### Windows

No special permissions required (but may need admin for some applications).

## Troubleshooting

### Build Fails

1. **Missing build tools**: Install Visual Studio (Windows) or Xcode Command Line Tools (macOS)
2. **Python not found**: Install Python 3.x and ensure it's in PATH
3. **node-gyp issues**: Try `npm cache clean --force` and rebuild

### Addon Not Loading

1. Check that the build succeeded: `ls native-addons/build/Release/meshflow_native.node`
2. Check Electron version matches Node.js version used to build
3. Rebuild for Electron: `npm run native:rebuild`

### Input Injection Not Working

1. **macOS**: Check Accessibility permissions
2. **Windows**: Try running as administrator
3. Check console logs for error messages

### Window Embedding Not Working

1. Ensure the target application is running
2. Check window title/process name is correct
3. Some applications may prevent embedding (security feature)

## Development

### Testing

The addon includes mock implementations that log warnings when the native module is not available. This allows development to continue even without building the addon.

### Debugging

Enable verbose logging:
```javascript
// In electron/main.js
process.env.DEBUG = 'native-addon:*';
```

## License

Same as MeshFlow project.

