# Building Native Addons for MeshFlow

This guide explains how to build the native Node.js addons required for input injection and window embedding.

## Quick Start

```bash
# Build the native addons
npm run native:build
```

## Prerequisites

### Windows

1. **Visual Studio Build Tools** or **Visual Studio** with C++ support
   - Download: https://visualstudio.microsoft.com/downloads/
   - Install "Desktop development with C++" workload

2. **Python 3.x**
   - Download: https://www.python.org/downloads/
   - Ensure Python is in your PATH

3. **Node.js** (v16+)
   - Already installed if you're running MeshFlow

### macOS

1. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

2. **Python 3.x** (usually pre-installed)
   ```bash
   python3 --version
   ```

3. **Node.js** (v16+)

## Building

### Automatic Build

The addons are automatically built when you run:
```bash
npm install
```

Or manually:
```bash
npm run native:build
```

### Manual Build

```bash
cd native-addons
npm install
npm run build
```

### Clean Build

```bash
npm run native:clean
npm run native:build
```

## Troubleshooting

### Windows: "node-gyp not found"

```bash
npm install -g node-gyp
```

### Windows: "MSBuild not found"

1. Install Visual Studio Build Tools
2. Or set the path manually:
   ```bash
   npm config set msvs_version 2022
   ```

### macOS: "xcode-select: error"

```bash
sudo xcode-select --reset
xcode-select --install
```

### "Python not found"

1. Install Python 3.x
2. Set Python path:
   ```bash
   npm config set python /path/to/python3
   ```

### Electron Version Mismatch

If you get errors about Electron version mismatch:

```bash
# Rebuild for Electron
cd native-addons
node-gyp rebuild --target=<electron-version> --arch=x64 --disturl=https://electronjs.org/headers
```

Or use electron-rebuild:
```bash
npm install -g electron-rebuild
electron-rebuild
```

## Verification

After building, verify the addon exists:

**Windows:**
```bash
dir native-addons\build\Release\meshflow_native.node
```

**macOS/Linux:**
```bash
ls native-addons/build/Release/meshflow_native.node
```

## Development

During development, the app will work without the native addon (using mock implementations). However, input injection and window embedding features will not function.

Check the Electron console for messages like:
- `[Native Addon] Successfully loaded native module` ✅
- `[Native Addon] Failed to load native module` ❌

## Production Build

When packaging with electron-builder, ensure the native addon is included:

1. The addon is automatically included if built before packaging
2. The `electron:postinstall` script builds the addon automatically
3. For distribution, you may need to rebuild for the target platform

## Platform-Specific Notes

### Windows

- Requires Administrator privileges for some input injection scenarios
- Some applications may block window embedding (security feature)

### macOS

- Requires **Accessibility permissions** for input injection:
  1. System Preferences > Security & Privacy > Privacy > Accessibility
  2. Add MeshFlow to the list
- Window embedding may require additional permissions

## Support

If you encounter build issues:

1. Check Node.js version: `node --version` (should be v16+)
2. Check Python version: `python --version` (should be 3.x)
3. Clean and rebuild: `npm run native:clean && npm run native:build`
4. Check the build logs for specific errors

