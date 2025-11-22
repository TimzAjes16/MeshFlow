const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
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
