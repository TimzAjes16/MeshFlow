/**
 * Electron utilities for detecting Electron environment and handling screen capture
 */

// Type definitions for Electron API
declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      getDesktopSources?: (options: { types: string[]; thumbnailSize?: { width: number; height: number } }) => Promise<Array<{
        id: string;
        name: string;
        thumbnail: Electron.NativeImage;
      }>>;
      requestScreenPermission?: () => Promise<{ granted: boolean; platform?: string; error?: string }>;
      checkScreenPermission?: () => Promise<{ granted: boolean | null; status?: string; platform?: string; error?: string }>;
    };
  }
}

/**
 * Check if we're running in Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.electronAPI !== 'undefined' &&
         window.electronAPI.versions?.electron !== undefined;
}

/**
 * Get screen capture stream - works in both Electron and browser
 */
export async function getScreenCaptureStream(): Promise<MediaStream> {
  if (isElectron()) {
    // Use Electron's desktopCapturer
    return getElectronScreenCapture();
  } else {
    // Use browser's getDisplayMedia
    return getBrowserScreenCapture();
  }
}

/**
 * Check if screen capture is supported
 */
export function isScreenCaptureSupported(): boolean {
  if (isElectron()) {
    // Electron always supports screen capture via desktopCapturer
    return true;
  }
  
  // Check browser support
  return typeof navigator !== 'undefined' && 
         navigator.mediaDevices && 
         typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

/**
 * Get screen capture stream using Electron's desktopCapturer or getDisplayMedia
 * In Electron, we prefer desktopCapturer but fall back to getDisplayMedia
 */
async function getElectronScreenCapture(): Promise<MediaStream> {
  try {
    // First, check and request screen recording permission (will use Touch ID on macOS)
    if (window.electronAPI?.checkScreenPermission && window.electronAPI?.requestScreenPermission) {
      try {
        // Check current permission status
        const permissionStatus = await window.electronAPI.checkScreenPermission();
        
        // If permission is not granted, request it (will trigger Touch ID on macOS)
        if (permissionStatus.granted === false || permissionStatus.granted === null) {
          console.log('Requesting screen recording permission...');
          const permissionResult = await window.electronAPI.requestScreenPermission();
          
          if (!permissionResult.granted) {
            throw new Error('Screen recording permission was denied. Please enable it in System Preferences > Security & Privacy > Screen Recording.');
          }
          
          console.log('Screen recording permission granted');
        }
      } catch (permissionError: any) {
        console.error('Error requesting screen permission:', permissionError);
        // Continue anyway - the actual capture call might still work
      }
    }

    // First, try getDisplayMedia (works in Electron 5+)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          } as any,
          audio: false,
        });
        return stream;
      } catch (getDisplayMediaError: any) {
        console.log('getDisplayMedia failed in Electron, trying desktopCapturer:', getDisplayMediaError);
        // Fall through to desktopCapturer
      }
    }

    // Fallback to desktopCapturer if getDisplayMedia is not available or failed
    if (!window.electronAPI?.getDesktopSources) {
      // If desktopCapturer is not available, throw a helpful error
      const platform = window.electronAPI?.platform || 'unknown';
      let permissionInstructions = '';
      
      if (platform === 'darwin') {
        permissionInstructions = '\n\nTo enable screen recording on macOS:\n1. Open System Preferences (or System Settings on macOS 13+)\n2. Go to Security & Privacy > Privacy\n3. Select "Screen Recording" from the left sidebar\n4. Check the box next to MeshFlow\n5. Restart the app if needed';
      } else if (platform === 'win32') {
        permissionInstructions = '\n\nTo enable screen recording on Windows:\n1. Open Windows Settings\n2. Go to Privacy > Screen Recording\n3. Enable "Allow apps to access your screen"';
      } else {
        permissionInstructions = '\n\nPlease ensure screen recording permissions are enabled in your system settings.';
      }
      
      throw new Error(`Screen capture is not available.${permissionInstructions}`);
    }

    // Get available sources (screens and windows) using desktopCapturer
    let sources;
    try {
      sources = await window.electronAPI.getDesktopSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
    } catch (error: any) {
      console.error('Error getting desktop sources:', error);
      throw new Error(`Failed to get screen sources: ${error.message || 'Unknown error'}`);
    }
    
    if (!sources || sources.length === 0) {
      throw new Error('No screen sources available');
    }

    // Find the first screen source (prefer "Entire Screen" or screens over windows)
    const screenSource = sources.find(s => 
      s.name === 'Entire Screen' || 
      s.name.includes('Screen') || 
      s.name === 'Screen 1' ||
      s.id.startsWith('screen:')
    ) || sources.find(s => s.id.startsWith('screen:')) || sources[0];

    // Use getUserMedia with the desktopCapturer source
    // In Electron, we use getUserMedia with chromeMediaSource
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        // @ts-ignore - Electron-specific constraints
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: screenSource.id,
          minWidth: 1280,
          maxWidth: 1920,
          minHeight: 720,
          maxHeight: 1080,
        },
      } as any,
    });

    return stream;
  } catch (error: any) {
    console.error('Error getting Electron screen capture:', error);
    
    // Provide helpful error messages
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      const platform = window.electronAPI?.platform || 'unknown';
      let permissionInstructions = '';
      
      if (platform === 'darwin') {
        permissionInstructions = '\n\nTo enable screen recording on macOS:\n1. Open System Preferences (or System Settings on macOS 13+)\n2. Go to Security & Privacy > Privacy\n3. Select "Screen Recording" from the left sidebar\n4. Check the box next to MeshFlow\n5. Restart the app if needed';
      } else if (platform === 'win32') {
        permissionInstructions = '\n\nTo enable screen recording on Windows:\n1. Open Windows Settings\n2. Go to Privacy > Screen Recording\n3. Enable "Allow apps to access your screen"';
      } else {
        permissionInstructions = '\n\nPlease ensure screen recording permissions are enabled in your system settings.';
      }
      
      throw new Error(`Screen sharing permission denied. Please allow screen sharing when prompted.${permissionInstructions}`);
    } else if (error.name === 'NotFoundError') {
      throw new Error('No screen source found.');
    } else if (error.message && error.message.includes('getDisplayMedia is not available')) {
      throw new Error('Screen capture is not available. Please ensure you are using Electron 5 or later.');
    } else {
      throw new Error(`Failed to capture screen: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Get screen capture stream using browser's getDisplayMedia
 */
async function getBrowserScreenCapture(): Promise<MediaStream> {
  if (!isScreenCaptureSupported()) {
    throw new Error('Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.');
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      } as any,
      audio: false,
    });

    return stream;
  } catch (error: any) {
    console.error('Error getting browser screen capture:', error);
    
    // Provide user-friendly error messages
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Screen sharing permission denied. Please allow screen sharing when prompted.');
    } else if (error.name === 'NotFoundError') {
      throw new Error('No screen source found.');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.');
    } else {
      throw new Error(error.message || 'Failed to start screen capture. Please try again.');
    }
  }
}

