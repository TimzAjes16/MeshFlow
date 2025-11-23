const { app, BrowserWindow, Menu, systemPreferences, ipcMain, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let overlayWindow = null;
let captureWidget = null;
let cropAreaOverlay = null;
let nextServer = null;
const PORT = 3000;
const HOST = 'localhost';

function startNextServer() {
  return new Promise((resolve, reject) => {
    // In development, wait for dev server to be ready
    if (isDev) {
      const http = require('http');
      const checkServer = setInterval(() => {
        const req = http.get(`http://${HOST}:${PORT}`, (res) => {
          clearInterval(checkServer);
          resolve();
        });
        req.on('error', () => {
          // Server not ready yet, keep checking
        });
        req.setTimeout(1000, () => req.destroy());
        req.end();
      }, 500);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkServer);
        reject(new Error('Next.js dev server did not start in time'));
      }, 30000);
    } else {
      // Start production Next.js server using the built standalone server
      const fs = require('fs');
      const http = require('http');
      const serverDir = path.join(__dirname, '../.next/standalone');
      const serverPath = path.join(serverDir, 'server.js');
      
      if (fs.existsSync(serverPath)) {
        // Use standalone server - it already has all dependencies bundled
        nextServer = spawn('node', ['server.js'], {
          cwd: serverDir, // Important: run from standalone directory
          env: {
            ...process.env,
            PORT: PORT.toString(),
            NODE_ENV: 'production',
            HOSTNAME: HOST,
            NEXTAUTH_URL: `http://${HOST}:${PORT}`,
            NEXT_PUBLIC_APP_URL: `http://${HOST}:${PORT}`,
          },
          stdio: ['ignore', 'inherit', 'inherit'],
        });
      } else {
        // Fallback to regular next start
        const nextPath = path.join(__dirname, '../node_modules/.bin/next');
        nextServer = spawn('node', [nextPath, 'start', '-p', PORT.toString(), '-H', HOST], {
          cwd: path.join(__dirname, '..'),
          env: {
            ...process.env,
            PORT: PORT.toString(),
            NODE_ENV: 'production',
            HOSTNAME: HOST,
            NEXTAUTH_URL: `http://${HOST}:${PORT}`,
            NEXT_PUBLIC_APP_URL: `http://${HOST}:${PORT}`,
          },
          stdio: ['ignore', 'inherit', 'inherit'],
        });
      }

      nextServer.on('error', (error) => {
        console.error('Error starting Next.js server:', error);
        reject(error);
      });

      // Wait for server to be ready (http already declared above)
      const checkServer = setInterval(() => {
        const req = http.get(`http://${HOST}:${PORT}`, (res) => {
          clearInterval(checkServer);
          resolve();
        });
        req.on('error', () => {
          // Server not ready yet, keep checking
        });
        req.setTimeout(1000, () => req.destroy());
        req.end();
      }, 500);

      // Timeout after 60 seconds for production
      setTimeout(() => {
        clearInterval(checkServer);
        if (nextServer && !nextServer.killed) {
          reject(new Error('Next.js server did not start in time'));
        }
      }, 60000);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../build/icon.icns'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    backgroundColor: '#ffffff',
  });

  // Load the app from localhost server
  const startUrl = `http://${HOST}:${PORT}`;

  // Start Next.js server first, then load the app
  startNextServer()
    .then(() => {
      console.log(`✅ Next.js server started on ${startUrl}`);
      mainWindow.loadURL(startUrl).catch((err) => {
        console.error('Failed to load URL:', err);
      });

      // Show window when ready
      mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Open DevTools in development
        if (isDev) {
          mainWindow.webContents.openDevTools();
        }
      });
    })
    .catch((error) => {
      console.error('Failed to start Next.js server:', error);
      // Still show window with error message
      mainWindow.show();
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>MeshFlow - Startup Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>⚠️ Failed to start server</h1>
          <p>${error.message}</p>
          <p style="color: #666; margin-top: 20px;">Please check the console for more details.</p>
        </body>
        </html>
      `;
      mainWindow.loadURL(`data:text/html,${encodeURIComponent(errorHtml)}`);
    });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workspace',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu-action', 'new-workspace');
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
      ],
    },
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handler to request screen recording permission
ipcMain.handle('request-screen-permission', async () => {
  try {
    if (process.platform === 'darwin') {
      // On macOS, askForMediaAccess will automatically use Touch ID/Face ID if available
      // This will trigger the system permission dialog with biometric authentication
      const status = await systemPreferences.askForMediaAccess('screen');
      return {
        granted: status,
        platform: 'darwin',
        message: status 
          ? 'Screen recording permission granted'
          : 'Screen recording permission denied. Please enable it in System Preferences > Security & Privacy > Screen Recording.',
      };
    } else if (process.platform === 'win32') {
      // On Windows 10/11, the system will prompt automatically when getDisplayMedia is called
      // We can't request it ahead of time, but we can return success to proceed
      return {
        granted: true,
        platform: 'win32',
        message: 'Screen recording permission will be requested when capturing starts.',
      };
    } else {
      // Linux - permissions vary by distribution
      // Most use PipeWire or X11, which prompt when getDisplayMedia is called
      return {
        granted: true,
        platform: 'linux',
        message: 'Screen recording permission will be requested when capturing starts.',
      };
    }
  } catch (error) {
    console.error('Error requesting screen permission:', error);
    return {
      granted: false,
      error: error.message,
      message: `Failed to request screen recording permission: ${error.message}`,
    };
  }
});

// IPC handler to check screen recording permission status
ipcMain.handle('check-screen-permission', async () => {
  try {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen');
      return {
        granted: status === 'granted',
        status: status, // 'granted', 'denied', 'not-determined', or 'restricted'
        platform: 'darwin',
        message: status === 'granted' 
          ? 'Screen recording permission is granted'
          : status === 'denied'
          ? 'Screen recording permission is denied. Please enable it in System Preferences > Security & Privacy > Screen Recording.'
          : 'Screen recording permission has not been requested yet.',
      };
    } else {
      // On Windows/Linux, we can't check ahead of time
      // The permission will be requested when getDisplayMedia is called
      return {
        granted: null, // Unknown - will be determined when getDisplayMedia is called
        platform: process.platform,
        message: 'Permission status will be determined when screen capture starts.',
      };
    }
  } catch (error) {
    console.error('Error checking screen permission:', error);
    return {
      granted: false,
      error: error.message,
      message: `Error checking screen recording permission: ${error.message}`,
    };
  }
});

// IPC handler to request microphone/audio permission
ipcMain.handle('request-microphone-permission', async () => {
  try {
    if (process.platform === 'darwin') {
      // On macOS, askForMediaAccess will automatically use Touch ID/Face ID if available
      const status = await systemPreferences.askForMediaAccess('microphone');
      return {
        granted: status,
        platform: 'darwin',
        message: status
          ? 'Microphone permission granted'
          : 'Microphone permission denied. Please enable it in System Preferences > Security & Privacy > Microphone.',
      };
    } else if (process.platform === 'win32') {
      // On Windows, permissions are requested when getDisplayMedia is called with audio: true
      return {
        granted: true,
        platform: 'win32',
        message: 'Microphone permission will be requested when capturing with audio.',
      };
    } else {
      // Linux
      return {
        granted: true,
        platform: 'linux',
        message: 'Microphone permission will be requested when capturing with audio.',
      };
    }
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return {
      granted: false,
      error: error.message,
      message: `Failed to request microphone permission: ${error.message}`,
    };
  }
});

// IPC handler to check microphone permission status
ipcMain.handle('check-microphone-permission', async () => {
  try {
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      return {
        granted: status === 'granted',
        status: status,
        platform: 'darwin',
        message: status === 'granted'
          ? 'Microphone permission is granted'
          : status === 'denied'
          ? 'Microphone permission is denied. Please enable it in System Preferences > Security & Privacy > Microphone.'
          : 'Microphone permission has not been requested yet.',
      };
    } else {
      return {
        granted: null,
        platform: process.platform,
        message: 'Permission status will be determined when audio capture starts.',
      };
    }
  } catch (error) {
    console.error('Error checking microphone permission:', error);
    return {
      granted: false,
      error: error.message,
      message: `Error checking microphone permission: ${error.message}`,
    };
  }
});

// IPC handler to get desktop sources (for desktopCapturer fallback)
ipcMain.handle('get-desktop-sources', async (event, options) => {
  try {
    const { desktopCapturer } = require('electron');
    if (!desktopCapturer || typeof desktopCapturer.getSources !== 'function') {
      throw new Error('desktopCapturer.getSources is not available');
    }
    const sources = await desktopCapturer.getSources(options);
    return sources;
  } catch (error) {
    console.error('Error getting desktop sources:', error);
    throw error;
  }
});

// IPC handler to open capture widget (small draggable widget)
ipcMain.handle('open-capture-widget', async () => {
  if (captureWidget) {
    captureWidget.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.bounds;
  
  // Position widget on the right side, middle of screen
  const widgetWidth = 40;
  const widgetHeight = 40;
  const widgetX = x + width - widgetWidth - 24;
  const widgetY = y + (height / 2) - (widgetHeight / 2);

  captureWidget = new BrowserWindow({
    width: widgetWidth,
    height: widgetHeight,
    x: widgetX,
    y: widgetY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const widgetHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Capture Widget</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100%;
          height: 100%;
          background: transparent;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #widget {
          width: 40px;
          height: 40px;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgb(229, 231, 235);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          transition: all 0.15s;
          cursor: pointer;
          position: relative;
          padding: 8px;
        }
        @media (prefers-color-scheme: dark) {
          #widget {
            background: rgba(31, 41, 55, 0.9);
            border-color: rgb(55, 65, 81);
          }
        }
        #widget:hover {
          background: rgba(243, 244, 246, 0.6);
        }
        @media (prefers-color-scheme: dark) {
          #widget:hover {
            background: rgba(55, 65, 81, 0.6);
          }
        }
        #widget svg {
          width: 20px;
          height: 20px;
          stroke: rgb(75, 85, 99);
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          transition: stroke 0.15s;
        }
        @media (prefers-color-scheme: dark) {
          #widget svg {
            stroke: rgb(156, 163, 175);
          }
        }
        #widget:hover svg {
          stroke: rgb(75, 85, 99);
        }
        @media (prefers-color-scheme: dark) {
          #widget:hover svg {
            stroke: rgb(156, 163, 175);
          }
        }
      </style>
    </head>
    <body>
      <div id="widget" title="Click to capture screen">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10M7 7h13a2 2 0 0 1 2 2v4M7 7v10M7 7l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <script>
        const widget = document.getElementById('widget');
        let isDragging = false;
        let dragStartPos = { x: 0, y: 0 };
        let windowStartPos = { x: 0, y: 0 };
        let hasDragged = false;

        // Get initial window position
        window.electronAPI?.getWidgetPosition().then((pos) => {
          if (pos) {
            windowStartPos = pos;
          }
        });

        // Handle dragging from widget
        widget.addEventListener('mousedown', (e) => {
          isDragging = true;
          hasDragged = false;
          dragStartPos = { x: e.screenX, y: e.screenY };
          
          // Get current window position
          window.electronAPI?.getWidgetPosition().then((pos) => {
            if (pos) {
              windowStartPos = pos;
            }
          });
          
          widget.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
          if (isDragging) {
            hasDragged = true;
            const deltaX = e.screenX - dragStartPos.x;
            const deltaY = e.screenY - dragStartPos.y;
            const newX = windowStartPos.x + deltaX;
            const newY = windowStartPos.y + deltaY;
            window.electronAPI?.moveWidget(newX, newY);
          }
        });

        document.addEventListener('mouseup', () => {
          if (isDragging) {
            isDragging = false;
            widget.style.cursor = 'pointer';
            // Update window position after drag
            window.electronAPI?.getWidgetPosition().then((pos) => {
              if (pos) {
                windowStartPos = pos;
              }
            });
          }
          hasDragged = false;
        });

        // Handle clicking widget (not dragging)
        widget.addEventListener('click', (e) => {
          if (!hasDragged) {
            window.electronAPI?.openCaptureOverlay();
          }
        });
      </script>
    </body>
    </html>
  `;

  captureWidget.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(widgetHTML)}`);

  captureWidget.on('closed', () => {
    captureWidget = null;
  });

  // Make widget draggable
  captureWidget.setIgnoreMouseEvents(false);
});

// IPC handler to move widget
ipcMain.handle('move-widget', (event, x, y) => {
  if (captureWidget) {
    const bounds = captureWidget.getBounds();
    const newX = Math.round(x - bounds.width / 2);
    const newY = Math.round(y - bounds.height / 2);
    captureWidget.setPosition(newX, newY);
  }
});

// IPC handler to get widget position
ipcMain.handle('get-widget-position', () => {
  if (captureWidget) {
    const bounds = captureWidget.getBounds();
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  }
  return null;
});

// IPC handler to open fullscreen capture overlay
ipcMain.handle('open-capture-overlay', async () => {
  if (overlayWindow) {
    overlayWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.bounds;

  // First, capture a screenshot of the screen
  const { desktopCapturer, nativeImage } = require('electron');
  let screenshotDataUrl = '';
  
  console.log('Capturing screenshot for overlay...');
  console.log('Display size:', primaryDisplay.size.width, 'x', primaryDisplay.size.height);
  
  try {
    // Request screen recording permission first
    if (process.platform === 'darwin') {
      const status = systemPreferences.getMediaAccessStatus('screen');
      if (status !== 'granted') {
        console.log('Requesting screen recording permission...');
        await systemPreferences.askForMediaAccess('screen');
      }
    }
    
    // Try to get a high-quality screenshot
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { 
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height
      }
    });
    
    console.log('Found sources:', sources.length);
    
    if (sources && sources.length > 0) {
      const screenSource = sources.find(s => 
        s.name === 'Entire Screen' || 
        s.name.includes('Screen') || 
        s.id.startsWith('screen:')
      ) || sources[0];
      
      console.log('Using source:', screenSource.name, screenSource.id);
      
      const thumbnail = screenSource.thumbnail;
      if (thumbnail) {
        // Convert to data URL
        screenshotDataUrl = thumbnail.toDataURL();
        console.log('Screenshot data URL length:', screenshotDataUrl ? screenshotDataUrl.length : 0);
        
        // If data URL is empty or too short, try resizing
        if (!screenshotDataUrl || screenshotDataUrl.length < 100) {
          console.log('Screenshot too small, trying resize...');
          try {
            const resized = thumbnail.resize({ 
              width: primaryDisplay.size.width, 
              height: primaryDisplay.size.height 
            });
            screenshotDataUrl = resized.toDataURL();
            console.log('Resized screenshot data URL length:', screenshotDataUrl ? screenshotDataUrl.length : 0);
          } catch (resizeError) {
            console.error('Error resizing screenshot:', resizeError);
          }
        }
      } else {
        console.error('Thumbnail is null or undefined');
      }
    } else {
      console.error('No screen sources found');
    }
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    console.error('Error stack:', error.stack);
  }
  
  // Ensure we have a valid screenshot
  if (!screenshotDataUrl || screenshotDataUrl.length < 100) {
    console.warn('Screenshot capture failed, using fallback');
    // Create a simple fallback - a gray background
    screenshotDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  } else {
    console.log('Screenshot captured successfully, length:', screenshotDataUrl.length);
  }

  overlayWindow = new BrowserWindow({
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Create the overlay HTML with screenshot background
  const overlayHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Screen Capture Overlay</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100vw;
          height: 100vh;
          background: transparent;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #screenshot {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          object-fit: cover;
          object-position: top left;
          opacity: 1;
          filter: brightness(0.5);
          z-index: 0;
          display: block;
        }
        #overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          cursor: crosshair;
          z-index: 1;
        }
        #selection-box {
          position: absolute;
          border: 2px solid #3b82f6;
          background: transparent;
          pointer-events: none;
          display: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
          z-index: 2;
        }
        #selection-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: url('${screenshotDataUrl.replace(/'/g, "\\'")}');
          background-size: ${primaryDisplay.size.width}px ${primaryDisplay.size.height}px;
          background-position: 0 0;
          background-repeat: no-repeat;
          pointer-events: none;
          filter: brightness(1);
        }
        .resize-handle {
          position: absolute;
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          pointer-events: auto;
          z-index: 10;
        }
        .resize-handle.nw { top: -4px; left: -4px; cursor: nwse-resize; }
        .resize-handle.ne { top: -4px; right: -4px; cursor: nesw-resize; }
        .resize-handle.sw { bottom: -4px; left: -4px; cursor: nesw-resize; }
        .resize-handle.se { bottom: -4px; right: -4px; cursor: nwse-resize; }
        .resize-handle.n { top: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .resize-handle.s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .resize-handle.w { left: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
        .resize-handle.e { right: -4px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
        #info {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          z-index: 1000;
          pointer-events: none;
        }
        #dimensions {
          position: absolute;
          top: -24px;
          left: 0;
          background: #3b82f6;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <img id="screenshot" src="" alt="Screenshot" />
      <div id="info">Drag to select an area. Press ESC to cancel, Enter to confirm.</div>
      <button id="fullscreen-btn">Full Screen</button>
      <div id="overlay"></div>
      <div id="selection-box">
        <div id="selection-content"></div>
        <div id="dimensions"></div>
        <div class="resize-handle nw"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle sw"></div>
        <div class="resize-handle se"></div>
        <div class="resize-handle n"></div>
        <div class="resize-handle s"></div>
        <div class="resize-handle w"></div>
        <div class="resize-handle e"></div>
      </div>
      <script>
        const overlay = document.getElementById('overlay');
        const selectionBox = document.getElementById('selection-box');
        const selectionContent = document.getElementById('selection-content');
        const dimensions = document.getElementById('dimensions');
        const info = document.getElementById('info');
        const screenshot = document.getElementById('screenshot');
        const fullscreenBtn = document.getElementById('fullscreen-btn');

        let isSelecting = false;
        let isDragging = false;
        let isResizing = false;
        let resizeHandle = null;
        let startX = 0;
        let startY = 0;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let currentSelection = null;
        const minSize = 50;
        let screenshotReady = false;

        // Wait for screenshot to load
        screenshot.addEventListener('load', () => {
          console.log('Screenshot image loaded in overlay');
          screenshotReady = true;
          screenshot.style.display = 'block';
          if (currentSelection) {
            updateSelectionBox(currentSelection.x, currentSelection.y, currentSelection.width, currentSelection.height);
          }
        });
        
        screenshot.addEventListener('error', (e) => {
          console.error('Screenshot failed to load:', screenshot.src.substring(0, 100));
          console.error('Error event:', e);
        });

        // Check if screenshot is already loaded
        if (screenshot.complete && screenshot.naturalWidth > 0) {
          screenshotReady = true;
          screenshot.style.display = 'block';
          console.log('Screenshot already loaded');
        }

        function updateSelectionBox(left, top, width, height) {
          const maxWidth = window.innerWidth;
          const maxHeight = window.innerHeight;
          
          left = Math.max(0, Math.min(left, maxWidth - width));
          top = Math.max(0, Math.min(top, maxHeight - height));
          width = Math.max(minSize, Math.min(width, maxWidth - left));
          height = Math.max(minSize, Math.min(height, maxHeight - top));
          
          selectionBox.style.left = left + 'px';
          selectionBox.style.top = top + 'px';
          selectionBox.style.width = width + 'px';
          selectionBox.style.height = height + 'px';
          
          // Update selection content background to show actual screen content
          if (screenshotReady && screenshot.src) {
            try {
              selectionContent.style.backgroundImage = \`url('\${screenshot.src.replace(/'/g, "\\\\'")}')\`;
              selectionContent.style.backgroundSize = \`\${window.innerWidth}px \${window.innerHeight}px\`;
              selectionContent.style.backgroundPosition = \`-\${left}px -\${top}px\`;
              selectionContent.style.backgroundRepeat = 'no-repeat';
              selectionContent.style.filter = 'brightness(1)';
            } catch (e) {
              console.error('Error setting background image:', e);
            }
          }
          
          // Update dimensions label
          dimensions.textContent = \`\${Math.round(width)} × \${Math.round(height)}px\`;
          
          currentSelection = { x: left, y: top, width, height };
        }

        function getResizeHandle(e) {
          const rect = selectionBox.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const handleSize = 12;
          
          if (x < handleSize && y < handleSize) return 'nw';
          if (x > rect.width - handleSize && y < handleSize) return 'ne';
          if (x < handleSize && y > rect.height - handleSize) return 'sw';
          if (x > rect.width - handleSize && y > rect.height - handleSize) return 'se';
          if (y < handleSize) return 'n';
          if (y > rect.height - handleSize) return 's';
          if (x < handleSize) return 'w';
          if (x > rect.width - handleSize) return 'e';
          return null;
        }

        overlay.addEventListener('mousedown', (e) => {
          if (currentSelection) {
            const handle = getResizeHandle(e);
            if (handle) {
              isResizing = true;
              resizeHandle = handle;
              startX = e.clientX;
              startY = e.clientY;
              return;
            }
            
            const rect = selectionBox.getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom) {
              isDragging = true;
              dragOffsetX = e.clientX - rect.left;
              dragOffsetY = e.clientY - rect.top;
              overlay.style.cursor = 'move';
              return;
            }
          }
          
          isSelecting = true;
          startX = e.clientX;
          startY = e.clientY;
          selectionBox.style.display = 'block';
          updateSelectionBox(startX, startY, 0, 0);
        });

        document.addEventListener('mousemove', (e) => {
          if (isResizing && resizeHandle && currentSelection) {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            let { x, y, width, height } = currentSelection;
            
            switch (resizeHandle) {
              case 'nw':
                x += deltaX;
                y += deltaY;
                width -= deltaX;
                height -= deltaY;
                break;
              case 'ne':
                y += deltaY;
                width += deltaX;
                height -= deltaY;
                break;
              case 'sw':
                x += deltaX;
                width -= deltaX;
                height += deltaY;
                break;
              case 'se':
                width += deltaX;
                height += deltaY;
                break;
              case 'n':
                y += deltaY;
                height -= deltaY;
                break;
              case 's':
                height += deltaY;
                break;
              case 'w':
                x += deltaX;
                width -= deltaX;
                break;
              case 'e':
                width += deltaX;
                break;
            }
            
            updateSelectionBox(x, y, width, height);
            startX = e.clientX;
            startY = e.clientY;
          } else if (isDragging && currentSelection) {
            const newX = e.clientX - dragOffsetX;
            const newY = e.clientY - dragOffsetY;
            updateSelectionBox(newX, newY, currentSelection.width, currentSelection.height);
          } else if (isSelecting) {
            const currentX = e.clientX;
            const currentY = e.clientY;
            const left = Math.min(startX, currentX);
            const top = Math.min(startY, currentY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);
            updateSelectionBox(left, top, width, height);
          } else if (currentSelection) {
            const handle = getResizeHandle(e);
            if (handle) {
              overlay.style.cursor = getComputedStyle(document.querySelector(\`.resize-handle.\${handle}\`)).cursor;
            } else {
              const rect = selectionBox.getBoundingClientRect();
              if (e.clientX >= rect.left && e.clientX <= rect.right &&
                  e.clientY >= rect.top && e.clientY <= rect.bottom) {
                overlay.style.cursor = 'move';
              } else {
                overlay.style.cursor = 'crosshair';
              }
            }
          }
        });

        document.addEventListener('mouseup', () => {
          isSelecting = false;
          isDragging = false;
          isResizing = false;
          resizeHandle = null;
          if (!isSelecting && !isDragging && !isResizing) {
            overlay.style.cursor = currentSelection ? 'default' : 'crosshair';
          }
        });

        fullscreenBtn.addEventListener('click', () => {
          const fullscreenSelection = {
            x: 0,
            y: 0,
            width: window.innerWidth,
            height: window.innerHeight
          };
          window.electronAPI?.getScreenBounds().then((screenBounds) => {
            if (screenBounds) {
              const screenSelection = {
                x: screenBounds.x,
                y: screenBounds.y,
                width: screenBounds.width,
                height: screenBounds.height
              };
              window.electronAPI?.confirmCapture(screenSelection);
            } else {
              window.electronAPI?.confirmCapture(fullscreenSelection);
            }
          });
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            window.electronAPI?.closeCaptureOverlay();
          } else if (e.key === 'Enter' && currentSelection && currentSelection.width >= minSize && currentSelection.height >= minSize) {
            // Get screen bounds to convert window coordinates to screen coordinates
            window.electronAPI?.getScreenBounds().then((screenBounds) => {
              if (screenBounds) {
                const screenSelection = {
                  x: currentSelection.x + screenBounds.x,
                  y: currentSelection.y + screenBounds.y,
                  width: currentSelection.width,
                  height: currentSelection.height
                };
                window.electronAPI?.confirmCapture(screenSelection);
              } else {
                window.electronAPI?.confirmCapture(currentSelection);
              }
            });
          }
        });
        
        // Double-click to confirm
        selectionBox.addEventListener('dblclick', async () => {
          if (currentSelection && currentSelection.width >= minSize && currentSelection.height >= minSize) {
            const screenBounds = await window.electronAPI?.getScreenBounds();
            if (screenBounds) {
              const screenSelection = {
                x: currentSelection.x + screenBounds.x,
                y: currentSelection.y + screenBounds.y,
                width: currentSelection.width,
                height: currentSelection.height
              };
              window.electronAPI?.confirmCapture(screenSelection);
            } else {
              window.electronAPI?.confirmCapture(currentSelection);
            }
          }
        });
      </script>
    </body>
    </html>
  `;

  overlayWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(overlayHTML)}`);

  // Send screenshot data to overlay window once it's ready
  overlayWindow.webContents.once('did-finish-load', () => {
    console.log('Overlay window loaded, sending screenshot data...');
    console.log('Screenshot data URL length:', screenshotDataUrl ? screenshotDataUrl.length : 0);
    
    // Wait a bit for the window to fully render
    setTimeout(() => {
      overlayWindow.webContents.executeJavaScript(`
        (function() {
          const screenshot = document.getElementById('screenshot');
          const screenshotData = ${JSON.stringify(screenshotDataUrl)};
          
          console.log('Attempting to set screenshot, data length:', screenshotData ? screenshotData.length : 0);
          
          if (screenshotData && screenshotData.length > 100) {
            screenshot.src = screenshotData;
            screenshot.style.display = 'block';
            screenshot.style.opacity = '1';
            
            screenshot.onload = function() {
              console.log('Screenshot loaded successfully');
              window.screenshotReady = true;
            };
            
            screenshot.onerror = function(e) {
              console.error('Screenshot failed to load');
              console.error('Error:', e);
              console.error('Data URL preview:', screenshotData.substring(0, 200));
            };
          } else {
            console.error('Invalid screenshot data - too short or empty');
            console.error('Length:', screenshotData ? screenshotData.length : 'null');
          }
        })();
      `).catch(err => {
        console.error('Error executing JavaScript in overlay:', err);
      });
    }, 100);
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    // Show widget again after overlay closes
    if (captureWidget) {
      captureWidget.show();
    }
  });

  // Hide widget when overlay opens
  if (captureWidget) {
    captureWidget.hide();
  }

  // Make sure overlay can receive mouse events
  overlayWindow.setIgnoreMouseEvents(false);
  
  // Focus the overlay window
  overlayWindow.focus();
});

// IPC handler to close capture overlay
ipcMain.handle('close-capture-overlay', () => {
  if (overlayWindow) {
    overlayWindow.close();
    overlayWindow = null;
  }
  // Show widget again
  if (captureWidget) {
    captureWidget.show();
  }
});

// IPC handler to close capture widget
ipcMain.handle('close-capture-widget', () => {
  if (captureWidget) {
    captureWidget.close();
    captureWidget = null;
  }
});

// IPC handler to get screen bounds
ipcMain.handle('get-screen-bounds', () => {
  if (overlayWindow) {
    return overlayWindow.getBounds();
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.bounds;
});

// IPC handler to confirm capture and send selection back
ipcMain.handle('confirm-capture', async (event, selection) => {
  if (mainWindow && overlayWindow) {
    // Capture the selected area from screen
    try {
      const { desktopCapturer } = require('electron');
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      });
      
      if (sources && sources.length > 0) {
        const screenSource = sources[0];
        mainWindow.webContents.send('capture-selection', {
          ...selection,
          sourceId: screenSource.id
        });
      } else {
        mainWindow.webContents.send('capture-selection', selection);
      }
    } catch (error) {
      console.error('Error getting screen source:', error);
      mainWindow.webContents.send('capture-selection', selection);
    }
    
    overlayWindow.close();
    overlayWindow = null;
  }
});

// IPC handler to open crop area overlay (system-wide)
ipcMain.handle('open-crop-area-overlay', async (event, options = {}) => {
  if (cropAreaOverlay) {
    cropAreaOverlay.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height, x, y } = primaryDisplay.bounds;
  const defaultWidth = options.defaultWidth || 779;
  const defaultHeight = options.defaultHeight || 513;

  // Create overlay window that spans the entire screen
  cropAreaOverlay = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreen: false,
    focusable: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      enableRemoteModule: false,
    },
  });

  // Create HTML for crop area overlay
  const cropAreaHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Crop Area Overlay</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          width: 100vw;
          height: 100vh;
          background: transparent;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          cursor: default;
        }
        #crop-area {
          position: absolute;
          border: 2px solid #3b82f6;
          background: rgba(59, 130, 246, 0.1);
          backdrop-filter: blur(4px);
          border-radius: 8px;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        #crop-area.dragging {
          cursor: grabbing;
        }
        #header {
          position: absolute;
          top: -40px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 8px;
          pointer-events: none;
        }
        #dimensions {
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
        #controls {
          display: flex;
          gap: 4px;
        }
        .control-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.15s;
          pointer-events: auto;
        }
        #confirm-btn {
          background: #10b981;
          color: white;
        }
        #confirm-btn:hover {
          background: #059669;
        }
        #cancel-btn {
          background: #ef4444;
          color: white;
        }
        #cancel-btn:hover {
          background: #dc2626;
        }
        .resize-handle {
          position: absolute;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border: 2px solid white;
          border-radius: 50%;
          pointer-events: auto;
          z-index: 10;
        }
        .resize-handle.nw { top: -6px; left: -6px; cursor: nwse-resize; }
        .resize-handle.ne { top: -6px; right: -6px; cursor: nesw-resize; }
        .resize-handle.sw { bottom: -6px; left: -6px; cursor: nesw-resize; }
        .resize-handle.se { bottom: -6px; right: -6px; cursor: nwse-resize; }
        .resize-handle.n { top: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .resize-handle.s { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
        .resize-handle.w { left: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
        .resize-handle.e { right: -6px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
      </style>
    </head>
    <body>
      <div id="crop-area">
        <div id="header">
          <div id="dimensions">${defaultWidth} × ${defaultHeight}px</div>
          <div id="controls">
            <button id="confirm-btn" class="control-btn" title="Confirm selection">✓</button>
            <button id="cancel-btn" class="control-btn" title="Cancel">×</button>
          </div>
        </div>
        <div class="resize-handle nw"></div>
        <div class="resize-handle ne"></div>
        <div class="resize-handle sw"></div>
        <div class="resize-handle se"></div>
        <div class="resize-handle n"></div>
        <div class="resize-handle s"></div>
        <div class="resize-handle w"></div>
        <div class="resize-handle e"></div>
      </div>
      <script>
        const cropArea = document.getElementById('crop-area');
        const dimensionsEl = document.getElementById('dimensions');
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        let position = {
          x: ${(width / 2) - (defaultWidth / 2)},
          y: ${(height / 2) - (defaultHeight / 2)}
        };
        let size = { width: ${defaultWidth}, height: ${defaultHeight} };
        let isDragging = false;
        let isResizing = false;
        let resizeHandle = null;
        let dragOffset = { x: 0, y: 0 };
        
        function updatePosition() {
          cropArea.style.left = position.x + 'px';
          cropArea.style.top = position.y + 'px';
          cropArea.style.width = size.width + 'px';
          cropArea.style.height = size.height + 'px';
          dimensionsEl.textContent = Math.round(size.width) + ' × ' + Math.round(size.height) + 'px';
        }
        
        // Drag handlers
        cropArea.addEventListener('mousedown', (e) => {
          if (e.target.classList.contains('resize-handle')) return;
          if (e.target.closest('.control-btn')) return;
          e.preventDefault();
          isDragging = true;
          dragOffset.x = e.screenX - position.x;
          dragOffset.y = e.screenY - position.y;
          cropArea.classList.add('dragging');
        });
        
        // Resize handlers
        document.querySelectorAll('.resize-handle').forEach(handle => {
          handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeHandle = handle.className.split(' ')[1];
            const handleX = resizeHandle.includes('w') ? position.x : resizeHandle.includes('e') ? position.x + size.width : position.x + size.width / 2;
            const handleY = resizeHandle.includes('n') ? position.y : resizeHandle.includes('s') ? position.y + size.height : position.y + size.height / 2;
            dragOffset.x = e.screenX - handleX;
            dragOffset.y = e.screenY - handleY;
          });
        });
        
        // Mouse move
        document.addEventListener('mousemove', (e) => {
          if (isDragging) {
            position.x = e.screenX - dragOffset.x;
            position.y = e.screenY - dragOffset.y;
            updatePosition();
          } else if (isResizing && resizeHandle) {
            let handleScreenX, handleScreenY;
            if (resizeHandle.includes('w')) {
              handleScreenX = position.x;
            } else if (resizeHandle.includes('e')) {
              handleScreenX = position.x + size.width;
            } else {
              handleScreenX = position.x + size.width / 2;
            }
            if (resizeHandle.includes('n')) {
              handleScreenY = position.y;
            } else if (resizeHandle.includes('s')) {
              handleScreenY = position.y + size.height;
            } else {
              handleScreenY = position.y + size.height / 2;
            }
            const currentHandleX = e.screenX - dragOffset.x;
            const currentHandleY = e.screenY - dragOffset.y;
            const deltaX = currentHandleX - handleScreenX;
            const deltaY = currentHandleY - handleScreenY;
            
            if (resizeHandle.includes('n')) {
              const heightChange = -deltaY;
              size.height = Math.max(100, size.height + heightChange);
              position.y = position.y - (size.height - (size.height - heightChange));
            }
            if (resizeHandle.includes('s')) {
              size.height = Math.max(100, size.height + deltaY);
            }
            if (resizeHandle.includes('w')) {
              const widthChange = -deltaX;
              size.width = Math.max(100, size.width + widthChange);
              position.x = position.x - (size.width - (size.width - widthChange));
            }
            if (resizeHandle.includes('e')) {
              size.width = Math.max(100, size.width + deltaX);
            }
            updatePosition();
          }
        });
        
        // Mouse up
        document.addEventListener('mouseup', () => {
          isDragging = false;
          isResizing = false;
          resizeHandle = null;
          cropArea.classList.remove('dragging');
        });
        
        // ESC key
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            window.electronAPI?.cancelCropArea?.();
          }
        });
        
        // Buttons
        confirmBtn.addEventListener('click', () => {
          if (window.electronAPI?.confirmCropArea) {
            window.electronAPI.confirmCropArea({
              x: position.x,
              y: position.y,
              width: size.width,
              height: size.height
            });
          }
        });
        
        cancelBtn.addEventListener('click', () => {
          if (window.electronAPI?.cancelCropArea) {
            window.electronAPI.cancelCropArea();
          }
        });
        
        updatePosition();
        
        // Prevent context menu
        document.addEventListener('contextmenu', (e) => e.preventDefault());
      </script>
    </body>
    </html>
  `;

  cropAreaOverlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(cropAreaHTML)}`);
  
  cropAreaOverlay.setIgnoreMouseEvents(false);
  cropAreaOverlay.focus();
  
  cropAreaOverlay.on('closed', () => {
    cropAreaOverlay = null;
  });
});

// IPC handler to close crop area overlay
ipcMain.handle('close-crop-area-overlay', () => {
  if (cropAreaOverlay) {
    cropAreaOverlay.close();
    cropAreaOverlay = null;
  }
});

// IPC handler to confirm crop area selection
ipcMain.handle('confirm-crop-area', async (event, area) => {
  if (mainWindow && cropAreaOverlay) {
    mainWindow.webContents.send('crop-area-selected', area);
    cropAreaOverlay.close();
    cropAreaOverlay = null;
  }
});

// IPC handler to cancel crop area
ipcMain.handle('cancel-crop-area', () => {
  if (mainWindow && cropAreaOverlay) {
    mainWindow.webContents.send('crop-area-cancelled');
    cropAreaOverlay.close();
    cropAreaOverlay = null;
  }
});

app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Stop Next.js server before quitting
  if (nextServer && !nextServer.killed) {
    nextServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  if (nextServer && !nextServer.killed) {
    nextServer.kill();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      
      // Only allow localhost navigation
      if (parsedUrl.hostname !== HOST && parsedUrl.hostname !== 'localhost' && parsedUrl.hostname !== '127.0.0.1') {
        event.preventDefault();
        console.log(`Blocked navigation to external URL: ${navigationUrl}`);
      }
    } catch (e) {
      // Invalid URL, allow it (might be a data URL or similar)
    }
  });
});
