# MeshFlow Desktop App

This guide explains how to build and package MeshFlow as a desktop application using Electron.

## Prerequisites

- Node.js 18+ and npm
- For macOS builds: macOS with Xcode Command Line Tools
- For Windows builds: Windows or use a CI/CD pipeline (GitHub Actions, etc.)

## Development

To run MeshFlow in Electron development mode:

```bash
npm run electron:dev
```

This will:
1. Start the Next.js dev server on `http://localhost:3000`
2. Launch Electron when the server is ready
3. Hot reload when you make changes

## Building

### Build for Current Platform

```bash
npm run electron:package
```

This will:
1. Build the Next.js app as a static export
2. Package it as an Electron app for your current platform

### Build for Specific Platform

```bash
# macOS only
npm run electron:package:mac

# Windows only
npm run electron:package:win

# Both platforms
npm run electron:package:all
```

## Output

Build artifacts will be in the `dist/` directory:

- **macOS**: `MeshFlow-0.1.0-x64.dmg` or `MeshFlow-0.1.0-arm64.dmg`
- **Windows**: `MeshFlow-Setup-0.1.0.exe` (installer) and `MeshFlow-0.1.0-win-x64-portable.exe` (portable)
- **Linux**: `MeshFlow-0.1.0.AppImage`

## Configuration

Electron configuration is in `package.json` under the `build` section. You can customize:

- App ID: `com.meshflow.app`
- Product name: `MeshFlow`
- Icons: Place icons in `build/` directory:
  - `build/icon.icns` for macOS
  - `build/icon.ico` for Windows
  - `build/icon.png` for Linux (512x512 recommended)

## Distribution

### Hosting Downloads

1. **Option 1: Static File Hosting**
   - Upload the build artifacts to your CDN or static file host
   - Update `/app/api/downloads/file/route.ts` to point to your file URLs

2. **Option 2: GitHub Releases**
   - Create a release on GitHub
   - Upload the build artifacts as release assets
   - Update the download API to point to GitHub release URLs

3. **Option 3: S3/Cloud Storage**
   - Upload to AWS S3, Google Cloud Storage, or Azure Blob Storage
   - Make files publicly accessible
   - Update the download API to generate signed URLs

### Auto-Updates (Future Enhancement)

To add auto-update functionality, you can use:

- **electron-updater**: Built into electron-builder
- **update.electronjs.org**: Free auto-update service for Electron apps

## Architecture

The Electron app runs Next.js as a **local server** on `localhost:3000`, which means:
- ✅ **Full server-side features work**: API routes, Server Components, Database access
- ✅ **No static export limitations**: All Next.js features are available
- ✅ **Real-time capabilities**: WebSocket and real-time features work
- ✅ **Database access**: Prisma and PostgreSQL work normally

The Electron main process:
1. Starts the Next.js production server on `localhost:3000`
2. Opens a BrowserWindow that loads from the local server
3. Prevents navigation to external URLs for security
4. Handles cleanup when the app closes

## Notes

### Screen Recording Permissions

Screen capture features require appropriate permissions:

**macOS:**
1. Open System Preferences (or System Settings on macOS 13+)
2. Go to Security & Privacy > Privacy
3. Select "Screen Recording" from the left sidebar
4. Check the box next to MeshFlow
5. Restart the app if needed

**Windows:**
1. Open Windows Settings
2. Go to Privacy > Screen Recording
3. Enable "Allow apps to access your screen"

**Linux:**
- Screen recording permissions vary by distribution
- You may need to grant permissions through your desktop environment's settings

### Other Notes

- The app includes all Node.js modules, so it will be larger than a static export, but all features work
- Database connections work normally since the Next.js server runs inside the Electron process

