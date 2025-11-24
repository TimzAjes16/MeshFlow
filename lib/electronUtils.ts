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
        thumbnail: any; // Electron.NativeImage - type not available in this context
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
 * Get screen capture stream for a specific window by process name and window title
 * Works in Electron only - uses desktopCapturer to find and capture the specific window
 */
export async function getWindowCaptureStream(options: {
  processName: string;
  windowTitle?: string;
  requestPermissions?: boolean;
  includeAudio?: boolean;
}): Promise<MediaStream> {
  const { processName, windowTitle, requestPermissions = true, includeAudio = false } = options;
  
  if (!isElectron() || !window.electronAPI?.getDesktopSources) {
    throw new Error('Window-specific capture requires Electron with desktopCapturer');
  }
  
  // Request permissions if needed
  if (requestPermissions) {
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
    } catch (permissionError: any) {
      console.error('[electronUtils] Error requesting permissions:', permissionError);
    }
  }
  
  // Get all desktop sources
  let sources;
  try {
    sources = await window.electronAPI.getDesktopSources({
      types: ['window'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
  } catch (error: any) {
    console.error('Error getting desktop sources:', error);
    throw new Error(`Failed to get screen sources: ${error.message || 'Unknown error'}`);
  }
  
  if (!sources || sources.length === 0) {
    throw new Error('No window sources available');
  }
  
  // Log all available sources for debugging
  console.log('[electronUtils] Available windows:', sources.map(s => ({ id: s.id, name: s.name })));
  console.log('[electronUtils] Searching for:', { processName, windowTitle });
  
  // IMPROVED MATCHING - Like OBS Studio with multiple fallback strategies
  // DesktopCapturer window names are typically in format: "Window Title - Process Name" or "Process Name: Window Title"
  // We need to handle various formats
  
  // Strategy 1: Exact match - process name and title both present (in any order)
  let matchingSource = sources.find(source => {
    const name = (source.name || '').toLowerCase();
    const processLower = processName.toLowerCase().trim();
    const titleLower = (windowTitle || '').toLowerCase().trim();
    
    if (windowTitle && titleLower.length > 0) {
      // Check if both process and title appear in the window name
      const hasProcess = name.includes(processLower);
      const hasTitle = name.includes(titleLower);
      if (hasProcess && hasTitle) {
        console.log('[electronUtils] Strategy 1 match:', source.name);
        return true;
      }
    }
    
    return false;
  });
  
  // Strategy 2: Process name + partial title match (flexible word matching)
  if (!matchingSource && windowTitle && windowTitle.length > 3) {
    matchingSource = sources.find(source => {
      const name = (source.name || '').toLowerCase();
      const processLower = processName.toLowerCase().trim();
      const titleLower = windowTitle.toLowerCase().trim();
      
      // Check for process name (including common variations and partial matches)
      const hasProcess = name.includes(processLower) || 
                        processLower.includes('safari') && (name.includes('safari') || name.includes('webkit')) ||
                        processLower.includes('chrome') && (name.includes('chrome') || name.includes('chromium')) ||
                        processLower.includes('firefox') && name.includes('firefox') ||
                        processLower.includes('notion') && name.includes('notion') ||
                        // Also try reverse - check if process name contains parts of window name
                        name.split(/[\s\-–—:]+/).some(part => part.length >= 3 && processLower.includes(part));
      
      if (!hasProcess) return false;
      
      // Extract meaningful words from title (minimum 3 chars)
      const titleWords = titleLower.split(/[\s\-–—:]+/).filter(w => w.length >= 3);
      
      // Try full title match first
      if (name.includes(titleLower)) {
        console.log('[electronUtils] Strategy 2a match (full title):', source.name);
        return true;
      }
      
      // Try significant words (longer words are more reliable)
      const significantWords = titleWords.filter(word => word.length >= 5);
      if (significantWords.length > 0) {
        const matchingSignificant = significantWords.filter(word => name.includes(word));
        if (matchingSignificant.length > 0) {
          console.log('[electronUtils] Strategy 2b match (significant words):', source.name);
          return true;
        }
      }
      
      // Try any word match (more lenient)
      const matchingWords = titleWords.filter(word => name.includes(word));
      if (matchingWords.length >= Math.min(2, titleWords.length)) {
        console.log('[electronUtils] Strategy 2c match (word match):', source.name);
        return true;
      }
      
      return false;
    });
  }
  
  // Strategy 3: Process name only (fallback - no title matching)
  if (!matchingSource) {
    matchingSource = sources.find(source => {
      const name = (source.name || '').toLowerCase();
      const processLower = processName.toLowerCase().trim();
      
      // Direct process name match
      if (name.includes(processLower)) {
        console.log('[electronUtils] Strategy 3a match (direct process):', source.name);
        return true;
      }
      
      // Try matching process name parts (window names often have format "Title - Process" or "Process: Title")
      const nameParts = name.split(/[\s\-–—:]+/);
      const processParts = processLower.split(/[\s\-–—]+/);
      
      // Check if any significant part of process name appears in window name
      const significantProcessParts = processParts.filter(p => p.length >= 3);
      if (significantProcessParts.some(part => nameParts.some(np => np.includes(part) || part.includes(np)))) {
        console.log('[electronUtils] Strategy 3b match (process parts):', source.name);
        return true;
      }
      
      // Handle common process name variations
      if (processLower.includes('safari')) {
        if (name.includes('safari') || name.includes('webkit')) {
          console.log('[electronUtils] Strategy 3c match (Safari variation):', source.name);
          return true;
        }
      }
      if (processLower.includes('chrome')) {
        if (name.includes('chrome') || name.includes('chromium')) {
          console.log('[electronUtils] Strategy 3d match (Chrome variation):', source.name);
          return true;
        }
      }
      if (processLower.includes('firefox')) {
        if (name.includes('firefox')) {
          console.log('[electronUtils] Strategy 3e match (Firefox):', source.name);
          return true;
        }
      }
      if (processLower.includes('notion')) {
        if (name.includes('notion')) {
          console.log('[electronUtils] Strategy 3f match (Notion):', source.name);
          return true;
        }
      }
      
      return false;
    });
  }
  
  // Strategy 4: Title-only matching (for apps with dynamic process names)
  if (!matchingSource && windowTitle && windowTitle.length > 5) {
    const titleLower = windowTitle.toLowerCase().trim();
    matchingSource = sources.find(source => {
      const name = (source.name || '').toLowerCase();
      
      // Try full title match first
      if (name.includes(titleLower)) {
        console.log('[electronUtils] Strategy 4a match (full title):', source.name);
        return true;
      }
      
      // Check if any significant words from title appear
      const titleWords = titleLower.split(/[\s\-–—:]+/).filter(w => w.length >= 3);
      const matchingWords = titleWords.filter(word => name.includes(word));
      
      if (matchingWords.length >= Math.min(2, titleWords.length)) {
        console.log('[electronUtils] Strategy 4b match (title words):', source.name);
        return true;
      }
      
      return false;
    });
  }
  
  // Strategy 5: Fuzzy matching - try partial process name match
  if (!matchingSource) {
    const processLower = processName.toLowerCase().trim();
    const processWords = processLower.split(/[\s\-–—]+/).filter(w => w.length >= 3);
    
    matchingSource = sources.find(source => {
      const name = (source.name || '').toLowerCase();
      // Check if any significant word from process name appears
      const hasMatch = processWords.some(word => name.includes(word));
      if (hasMatch) {
        console.log('[electronUtils] Strategy 5 match (fuzzy process):', source.name);
      }
      return hasMatch;
    });
  }
  
  if (!matchingSource) {
    const availableWindows = sources.slice(0, 20).map(s => s.name).join(', ');
    console.error('[electronUtils] Window not found after all strategies');
    console.error('[electronUtils] Searched for:', { 
      processName, 
      windowTitle,
      processNameLower: processName.toLowerCase(),
      windowTitleLower: windowTitle?.toLowerCase()
    });
    console.error('[electronUtils] Total available windows:', sources.length);
    console.error('[electronUtils] First 20 available windows:', availableWindows);
    
    // Try to find the closest match for better error message
    const processLower = processName.toLowerCase().trim();
    const titleLower = (windowTitle || '').toLowerCase().trim();
    const closeMatches = sources.filter(source => {
      const name = (source.name || '').toLowerCase();
      return name.includes(processLower.substring(0, Math.min(5, processLower.length))) ||
             (titleLower && name.includes(titleLower.substring(0, Math.min(5, titleLower.length))));
    }).slice(0, 5);
    
    if (closeMatches.length > 0) {
      console.warn('[electronUtils] Close matches found:', closeMatches.map(s => s.name));
    }
    
    throw new Error(
      `Window not found: ${processName}${windowTitle ? ` - ${windowTitle}` : ''}\n` +
      `Available windows (showing first 20): ${availableWindows}${closeMatches.length > 0 ? `\nClose matches: ${closeMatches.map(s => s.name).join(', ')}` : ''}`
    );
  }
  
  console.log('[electronUtils] ✅ Found matching window:', matchingSource.name);
  return captureSource(matchingSource.id, includeAudio);
}

/**
 * Capture a specific source by ID
 */
async function captureSource(sourceId: string, includeAudio: boolean): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      // @ts-ignore - Electron-specific constraints
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: sourceId,
        minWidth: 1280,
        maxWidth: 1920,
        minHeight: 720,
        maxHeight: 1080,
      },
    } as any,
  });
  
  return stream;
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

