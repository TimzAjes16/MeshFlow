const { contextBridge, ipcRenderer } = require('electron');

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
  // Expose desktopCapturer for screen capture via IPC (since contextIsolation is enabled)
  getDesktopSources: async (options) => {
    try {
      return await ipcRenderer.invoke('get-desktop-sources', options);
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
  // Open capture widget (small draggable widget)
  openCaptureWidget: async () => {
    return await ipcRenderer.invoke('open-capture-widget');
  },
  // Move widget
  moveWidget: async (x, y) => {
    return await ipcRenderer.invoke('move-widget', x, y);
  },
  // Get widget position
  getWidgetPosition: async () => {
    return await ipcRenderer.invoke('get-widget-position');
  },
  // Open fullscreen capture overlay
  openCaptureOverlay: async () => {
    return await ipcRenderer.invoke('open-capture-overlay');
  },
  // Close capture widget
  closeCaptureWidget: async () => {
    return await ipcRenderer.invoke('close-capture-widget');
  },
  // Close capture overlay
  closeCaptureOverlay: async () => {
    return await ipcRenderer.invoke('close-capture-overlay');
  },
  // Get screen bounds
  getScreenBounds: async () => {
    return await ipcRenderer.invoke('get-screen-bounds');
  },
  // Confirm capture selection
  confirmCapture: async (selection) => {
    return await ipcRenderer.invoke('confirm-capture', selection);
  },
  // Listen for capture selection from overlay
  onCaptureSelection: (callback) => {
    ipcRenderer.on('capture-selection', (_, selection) => callback(selection));
  },
});


