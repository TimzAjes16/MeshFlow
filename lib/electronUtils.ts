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
      requestScreenPermission?: () => Promise<{ granted: boolean; platform?: string; error?: string; message?: string }>;
      checkScreenPermission?: () => Promise<{ granted: boolean | null; status?: string; platform?: string; error?: string; message?: string }>;
      requestMicrophonePermission?: () => Promise<{ granted: boolean; platform?: string; error?: string; message?: string }>;
      checkMicrophonePermission?: () => Promise<{ granted: boolean | null; status?: string; platform?: string; error?: string; message?: string }>;
      openCaptureWidget?: () => Promise<void>;
      moveWidget?: (x: number, y: number) => Promise<void>;
      getWidgetPosition?: () => Promise<{ x: number; y: number } | null>;
      openCaptureOverlay?: () => Promise<void>;
      closeCaptureOverlay?: () => Promise<void>;
      closeCaptureWidget?: () => Promise<void>;
      getScreenBounds?: () => Promise<{ x: number; y: number; width: number; height: number }>;
      confirmCapture?: (selection: { x: number; y: number; width: number; height: number }) => Promise<void>;
      onCaptureSelection?: (callback: (selection: { x: number; y: number; width: number; height: number; sourceId?: string }) => void) => void;
      openCropAreaOverlay?: (options?: { defaultWidth?: number; defaultHeight?: number }) => Promise<void>;
      closeCropAreaOverlay?: () => Promise<void>;
      confirmCropArea?: (area: { x: number; y: number; width: number; height: number }) => Promise<void>;
      cancelCropArea?: () => Promise<void>;
      onCropAreaSelected?: (callback: (area: { x: number; y: number; width: number; height: number }) => void) => void;
      onCropAreaCancelled?: (callback: () => void) => void;
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
 * Request screen recording permission
 */
export async function requestScreenRecordingPermission(): Promise<{ granted: boolean; message?: string; error?: string }> {
  if (isElectron() && window.electronAPI?.requestScreenPermission) {
    try {
      const result = await window.electronAPI.requestScreenPermission();
      return {
        granted: result.granted === true,
        message: result.message,
        error: result.error,
      };
    } catch (error: any) {
      return {
        granted: false,
        error: error.message || 'Failed to request permission',
      };
    }
  }
  
  // In browser, permissions are handled by getDisplayMedia
  return { granted: true, message: 'Permission will be requested when capturing starts.' };
}

/**
 * Check screen recording permission status
 */
export async function checkScreenRecordingPermission(): Promise<{ granted: boolean | null; message?: string }> {
  if (isElectron() && window.electronAPI?.checkScreenPermission) {
    try {
      const result = await window.electronAPI.checkScreenPermission();
      return {
        granted: result.granted,
        message: result.message,
      };
    } catch (error: any) {
      return {
        granted: null,
        message: `Error checking permission: ${error.message}`,
      };
    }
  }
  
  return { granted: null, message: 'Permission status unknown.' };
}

/**
 * Request microphone permission (for audio capture)
 */
export async function requestMicrophonePermission(): Promise<{ granted: boolean; message?: string; error?: string }> {
  if (isElectron() && window.electronAPI?.requestMicrophonePermission) {
    try {
      const result = await window.electronAPI.requestMicrophonePermission();
      return {
        granted: result.granted === true,
        message: result.message,
        error: result.error,
      };
    } catch (error: any) {
      return {
        granted: false,
        error: error.message || 'Failed to request microphone permission',
      };
    }
  }
  
  // In browser, permissions are handled by getDisplayMedia with audio: true
  return { granted: true, message: 'Permission will be requested when capturing with audio.' };
}

/**
 * Check microphone permission status
 */
export async function checkMicrophonePermission(): Promise<{ granted: boolean | null; message?: string }> {
  if (isElectron() && window.electronAPI?.checkMicrophonePermission) {
    try {
      const result = await window.electronAPI.checkMicrophonePermission();
      return {
        granted: result.granted,
        message: result.message,
      };
    } catch (error: any) {
      return {
        granted: null,
        message: `Error checking microphone permission: ${error.message}`,
      };
    }
  }
  
  return { granted: null, message: 'Permission status unknown.' };
}

/**
 * Get screen capture stream - works in both Electron and browser
 * Automatically requests permissions if needed
 */
export async function getScreenCaptureStream(options?: { requestPermissions?: boolean; includeAudio?: boolean }): Promise<MediaStream> {
  const { requestPermissions = true, includeAudio = false } = options || {};
  
  // Request permissions if needed (especially on macOS)
  if (requestPermissions && isElectron()) {
    try {
      const permissionStatus = await checkScreenRecordingPermission();
      if (permissionStatus.granted === false || permissionStatus.granted === null) {
        console.log('[electronUtils] Requesting screen recording permission...');
        const permissionResult = await requestScreenRecordingPermission();
        if (!permissionResult.granted) {
          throw new Error(permissionResult.message || 'Screen recording permission denied');
        }
        console.log('[electronUtils] Screen recording permission granted');
      }
      
      // If audio is requested, check microphone permission too
      if (includeAudio) {
        const micPermissionStatus = await checkMicrophonePermission();
        if (micPermissionStatus.granted === false || micPermissionStatus.granted === null) {
          console.log('[electronUtils] Requesting microphone permission...');
          const micPermissionResult = await requestMicrophonePermission();
          if (!micPermissionResult.granted) {
            console.warn('[electronUtils] Microphone permission denied, continuing without audio');
          } else {
            console.log('[electronUtils] Microphone permission granted');
          }
        }
      }
    } catch (permissionError: any) {
      console.error('[electronUtils] Error requesting permissions:', permissionError);
      // Continue anyway - the actual capture call might still work
    }
  }
  
  if (isElectron()) {
    // Use Electron's desktopCapturer
    return getElectronScreenCapture(includeAudio);
  } else {
    // Use browser's getDisplayMedia
    return getBrowserScreenCapture(includeAudio);
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
async function getElectronScreenCapture(includeAudio: boolean = false): Promise<MediaStream> {
  try {
    // Permissions are now handled in getScreenCaptureStream before this function is called

    // First, try getDisplayMedia (works in Electron 5+)
    // Using MDN-recommended options structure per https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        // Don't restrict displaySurface - let user choose screen/window/application
        // Removing displaySurface constraint allows full flexibility to select any screen or application
        // Note: The picker will show all available windows/apps, user should select the one containing their highlighted area
        const displayMediaOptions = {
          video: true, // Let user select any screen, window, or application
          audio: includeAudio, // Request audio if needed
        } as MediaStreamConstraints;
        
        console.log('[electronUtils] Requesting screen capture with options:', displayMediaOptions);
        console.log('[electronUtils] IMPORTANT: When the picker appears, select the specific window/application that contains your highlighted area');
        console.log('[electronUtils] For example, if you highlighted an area in Safari, select "Safari" from the picker, NOT "Entire Screen" or "Cursor"');
        
        const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        
        // Ensure video tracks are active
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
          console.log('getDisplayMedia stream obtained with video tracks:', videoTracks.length);
          // Monitor track state
          videoTracks[0].addEventListener('ended', () => {
            console.log('Screen capture track ended');
          });
        }
        
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
 * Using MDN-recommended approach per https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture
 */
async function getBrowserScreenCapture(includeAudio: boolean = false): Promise<MediaStream> {
  if (!isScreenCaptureSupported()) {
    throw new Error('Screen capture is not supported in this browser. Please use Chrome, Firefox, Edge, or Safari 13+.');
  }

  try {
    // Use MDN-recommended options structure
    // Using MediaStreamConstraints as per TypeScript definitions
        // Don't restrict displaySurface - let user choose screen/window/application
        // Removing displaySurface constraint allows full flexibility
        // Note: The picker will show all available windows/apps, user should select the one containing their highlighted area
        const displayMediaOptions: MediaStreamConstraints = {
          video: true, // Let user select any screen, window, or application
          audio: includeAudio, // Request audio if needed
        };
    
    console.log('[electronUtils] Requesting screen capture with options:', displayMediaOptions);
    console.log('[electronUtils] IMPORTANT: When the picker appears, select the specific window/application that contains your highlighted area');
    console.log('[electronUtils] For example, if you highlighted an area in Safari, select "Safari" from the picker, NOT "Entire Screen" or "Cursor"');
    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    
    // Verify stream has video tracks
    const videoTracks = stream.getVideoTracks();
    if (videoTracks.length === 0) {
      throw new Error('Screen capture stream has no video tracks.');
    }
    
    console.log('Screen capture stream obtained:', {
      id: stream.id,
      active: stream.active,
      videoTracks: videoTracks.length,
      trackSettings: videoTracks[0].getSettings(),
    });
    
    // Monitor track state for debugging
    videoTracks[0].addEventListener('ended', () => {
      console.log('Screen capture track ended');
    });
    
    // Handle track state changes
    videoTracks[0].addEventListener('mute', () => {
      console.log('Screen capture track muted');
    });
    
    videoTracks[0].addEventListener('unmute', () => {
      console.log('Screen capture track unmuted');
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

