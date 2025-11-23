const { contextBridge, ipcRenderer, desktopCapturer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_, action) => callback(action));
  },
  // Expose desktopCapturer for screen capture
  // desktopCapturer is available in the renderer process in Electron
  getDesktopSources: async (options) => {
    try {
      if (!desktopCapturer || typeof desktopCapturer.getSources !== 'function') {
        throw new Error('desktopCapturer.getSources is not available');
      }
      return await desktopCapturer.getSources(options);
    } catch (error) {
      console.error('Error in getDesktopSources:', error);
      throw error;
    }
  },
  // Request screen recording permission (will use Touch ID on macOS if available)
  requestScreenPermission: async () => {
    return await ipcRenderer.invoke('request-screen-permission');
  },
  // Check screen recording permission status
  checkScreenPermission: async () => {
    return await ipcRenderer.invoke('check-screen-permission');
  },
});


