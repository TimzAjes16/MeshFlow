/**
 * MeshFlow Native Addons
 * Node.js wrapper for native input injection and window embedding
 */

const path = require('path');
const { app } = require('electron');

let nativeModule = null;

function loadNativeModule() {
  if (nativeModule) {
    return nativeModule;
  }

  try {
    // Try to load the native module
    // In development, it will be in native-addons/build/Release
    // In production, it will be in the app.asar or unpacked
    let modulePath;
    
    // Check if we're in Electron (production)
    if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
      // In Electron, try multiple paths
      const possiblePaths = [
        path.join(__dirname, 'build', 'Release', 'meshflow_native.node'),
        path.join(process.resourcesPath, 'native-addons', 'build', 'Release', 'meshflow_native.node'),
        path.join(__dirname, '..', 'native-addons', 'build', 'Release', 'meshflow_native.node'),
      ];
      
      for (const tryPath of possiblePaths) {
        try {
          nativeModule = require(tryPath);
          console.log('[Native Addon] Successfully loaded native module from:', tryPath);
          return nativeModule;
        } catch (e) {
          // Try next path
        }
      }
    } else {
      // Regular Node.js
      modulePath = path.join(__dirname, 'build', 'Release', 'meshflow_native.node');
      nativeModule = require(modulePath);
      console.log('[Native Addon] Successfully loaded native module');
      return nativeModule;
    }
    
    throw new Error('Module not found in any expected location');
  } catch (error) {
    console.error('[Native Addon] Failed to load native module:', error.message);
    console.error('[Native Addon] This is expected if the module has not been built yet.');
    console.error('[Native Addon] Run: npm run native:build');
    
    // Return a mock implementation for development
    return {
      injectMouseEvent: () => {
        console.warn('[Native Addon] Mock: injectMouseEvent called (native module not loaded)');
        return false;
      },
      injectKeyboardEvent: () => {
        console.warn('[Native Addon] Mock: injectKeyboardEvent called (native module not loaded)');
        return false;
      },
      embedWindow: () => {
        console.warn('[Native Addon] Mock: embedWindow called (native module not loaded)');
        return { success: false, error: 'Native module not loaded' };
      },
      unembedWindow: () => {
        console.warn('[Native Addon] Mock: unembedWindow called (native module not loaded)');
        return { success: false, error: 'Native module not loaded' };
      },
      findWindow: () => {
        console.warn('[Native Addon] Mock: findWindow called (native module not loaded)');
        return { found: false };
      },
      getWindowList: () => {
        console.warn('[Native Addon] Mock: getWindowList called (native module not loaded)');
        return [];
      },
    };
  }
}

// Export the native module functions
module.exports = {
  injectMouseEvent: (event) => {
    const module = loadNativeModule();
    return module.injectMouseEvent(event);
  },
  
  injectKeyboardEvent: (event) => {
    const module = loadNativeModule();
    return module.injectKeyboardEvent(event);
  },
  
  embedWindow: (options) => {
    const module = loadNativeModule();
    return module.embedWindow(options);
  },
  
  unembedWindow: (options) => {
    const module = loadNativeModule();
    return module.unembedWindow(options);
  },
  
  findWindow: (options) => {
    const module = loadNativeModule();
    return module.findWindow(options);
  },
  
  getWindowList: () => {
    const module = loadNativeModule();
    return module.getWindowList();
  },
};

