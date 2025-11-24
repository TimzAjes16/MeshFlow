# OBS Studio Window Capture - Technical Research

## How OBS Studio Captures Application Windows

### Core Principle: Screen Capture + Input Injection (NOT Embedding)

OBS Studio **does NOT embed native windows**. Instead, it uses a two-part approach:

1. **Video Capture**: Captures the window content as a video stream using OS-level screen capture APIs
2. **Input Injection**: Forwards mouse/keyboard events to the original window to make it interactive

This is exactly what we're already implementing! The approach is correct.

### Windows Implementation

**OBS Studio uses:**

1. **Desktop Duplication API** (Windows 8+)
   - Direct GPU-accelerated screen capture
   - Low latency, high performance
   - `IDXGIOutputDuplication` interface
   - Can capture specific windows or entire displays

2. **BitBlt/GDI Capture** (Fallback)
   - Traditional Windows GDI screen capture
   - `BitBlt()` function copies pixel data
   - Higher CPU usage but works on older systems

3. **Window Enumeration**
   - Uses `EnumWindows()` to find window handles (HWND)
   - Matches windows by process name and window title
   - Flexible matching similar to our implementation

**Key Point**: OBS captures pixels/video from the window, it does NOT embed the actual window control.

### macOS Implementation

**OBS Studio uses:**

1. **CGWindowListCopyWindowInfo**
   - Enumerates all visible windows
   - Returns window properties (PID, bounds, owner name, CGWindowID)
   - This is what we're already using!

2. **CGWindowListCreateImage**
   - Creates an image from a specific window by CGWindowID
   - Used for static captures

3. **Screen Capture APIs**
   - Uses Core Graphics screen capture for video streams
   - Can target specific windows by their CGWindowID
   - Requires screen recording permissions (which we handle)

**Key Point**: Same as Windows - OBS captures video, not embeds windows.

### Input Injection (Making Windows Interactive)

**Windows:**
- Uses `SendInput()` API to inject mouse/keyboard events
- Maps widget coordinates to absolute screen coordinates
- Requires appropriate privileges (usually works for standard apps)

**macOS:**
- Uses `CGEventCreateMouseEvent()` and `CGEventPost()` to inject events
- Similar coordinate mapping
- Requires Accessibility permissions (we handle this)

**This is exactly what our native addon does!** ✅

## Why Native Window Embedding Doesn't Work

### macOS - App Sandbox Restrictions

1. **App Sandbox**
   - macOS runs each app in an isolated sandbox
   - Cross-application window embedding is blocked by security policy
   - NSWindow instances are process-specific
   - Cannot use `NSWindow.addChildWindow()` across different applications

2. **Security Model**
   - Apps cannot control other apps' windows directly
   - Prevents malicious apps from hijacking windows
   - Window hierarchy is managed per-application

3. **Technical Reality**
   - Even without sandbox, NSWindow embedding only works within same process
   - No public API for cross-process window parenting
   - This is by design for security

### Windows - UIPI and Modern Restrictions

1. **UIPI (User Interface Privilege Isolation)**
   - Windows Vista+ security feature
   - Prevents lower-privilege processes from sending messages to higher-privilege windows
   - Blocks `SetParent()` across privilege boundaries
   - Even same privilege level can be blocked

2. **Modern Application Protection**
   - Many apps protect against window hijacking
   - DRM-protected content (Netflix, etc.) blocks capture entirely
   - Games use protected overlay modes
   - Even if SetParent works, apps may refuse to be parented

3. **SetParent Limitations**
   - Technically possible in some cases, but highly unreliable
   - Security-conscious apps actively block it
   - Modern Windows versions restrict it further

**Conclusion**: True cross-application window embedding is intentionally blocked on both platforms for security reasons.

## Our Implementation vs OBS Studio

### What We're Doing (CORRECT ✅)

1. **Screen Capture**
   - ✅ Using `desktopCapturer` (Electron) - same approach as OBS
   - ✅ Window matching by process name/title - same as OBS
   - ✅ Displaying stream in `<video>` element - correct

2. **Input Injection**
   - ✅ Native addon with `SendInput` (Windows) - same as OBS
   - ✅ Native addon with `CGEvent` (macOS) - same as OBS
   - ✅ Coordinate mapping widget → screen - same as OBS

### What Needs Improvement

1. **Coordinate Mapping Accuracy**
   - Need to ensure widget coordinates correctly map to original window coordinates
   - Must account for window position, widget position, and zoom level
   - OBS does this precisely - we need to match that accuracy

2. **Window Matching**
   - Our matching is good, but could be more robust
   - OBS uses fuzzy matching + process info + window titles
   - We should improve the matching algorithm

3. **Stream Quality**
   - OBS optimizes for low latency
   - We should ensure our video streams are smooth and low-latency

4. **Error Handling**
   - Better handling when windows are minimized/closed
   - Graceful degradation when permissions are denied
   - DRM protection detection (show helpful error messages)

## Technical Recommendations

### 1. Fix Coordinate Mapping

The coordinate mapping in `NativeWindowWidget` needs to be precise:

```typescript
// Widget coordinates (relative to widget)
const widgetX = e.clientX - rect.left;
const widgetY = e.clientY - rect.top;

// Original window screen coordinates (absolute)
// Need to get the actual window position and bounds
const windowScreenX = windowBounds.x + (widgetX / rect.width) * windowBounds.width;
const windowScreenY = windowBounds.y + (widgetY / rect.height) * windowBounds.height;
```

### 2. Get Actual Window Bounds

We need to get the actual screen position of the captured window:
- On macOS: Use `CGWindowListCopyWindowInfo` to get window bounds
- On Windows: Use `GetWindowRect` with the window handle
- Store these bounds and use them for accurate coordinate mapping

### 3. Window Matching Improvements

Make matching more robust like OBS:
- Try exact match first
- Fall back to process name + partial title match
- Try process name only
- Consider window class names on Windows

## Conclusion

**Our approach is fundamentally correct!** We're using the same technique as OBS Studio:
- Screen capture (not embedding) ✅
- Input injection for interactivity ✅

The issues are likely:
1. Coordinate mapping accuracy
2. Window bounds detection
3. Stream initialization timing

Let me improve these aspects now.
