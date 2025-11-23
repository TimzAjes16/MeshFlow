#ifdef __APPLE__
#include "window_embedding.h"
#include <Cocoa/Cocoa.h>
#include <AppKit/AppKit.h>
#include <CoreGraphics/CoreGraphics.h>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  void* FindWindowNative(const char* processName, const char* windowTitle) {
    std::string processNameStr = processName ? processName : "";
    std::string windowTitleStr = windowTitle ? windowTitle : "";
    
    // Use CGWindowListCopyWindowInfo to get all windows (same approach as GetWindowListNative)
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
      kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
      kCGNullWindowID
    );
    
    if (!windowList) {
      return nullptr;
    }
    
    NSArray* windowsArray = (__bridge NSArray*)windowList;
    NSRunningApplication* targetApp = nil;
    
    // If process name is provided, find the running application first
    if (!processNameStr.empty()) {
      NSArray* runningApps = [[NSWorkspace sharedWorkspace] runningApplications];
      for (NSRunningApplication* app in runningApps) {
        NSString* appName = app.localizedName ? app.localizedName : @"";
        std::string appNameStr = [appName UTF8String];
        if (appNameStr.find(processNameStr) != std::string::npos) {
          targetApp = app;
          break;
        }
      }
    }
    
    // Search through windows
    for (NSDictionary* windowInfo in windowsArray) {
      // Get window owner PID
      NSNumber* ownerPID = windowInfo[(id)kCGWindowOwnerPID];
      if (!ownerPID) continue;
      
      // If we have a target app, check if this window belongs to it
      if (targetApp && ownerPID.integerValue != targetApp.processIdentifier) {
        continue;
      }
      
      // Get window name
      NSString* windowName = windowInfo[(id)kCGWindowName];
      if (!windowName || windowName.length == 0) {
        continue;
      }
      
      std::string titleStr = [windowName UTF8String];
      
      // Check if window title matches
      bool matchTitle = windowTitleStr.empty() ||
                       titleStr.find(windowTitleStr) != std::string::npos;
      
      if (!matchTitle) {
        continue;
      }
      
      // If we don't have a target app but process name was provided, check the process name
      if (!targetApp && !processNameStr.empty()) {
        NSRunningApplication* app = [NSRunningApplication runningApplicationWithProcessIdentifier:ownerPID.integerValue];
        if (app) {
          NSString* appName = app.localizedName ? app.localizedName : @"";
          std::string appNameStr = [appName UTF8String];
          if (appNameStr.find(processNameStr) == std::string::npos) {
            continue;
          }
        } else {
          continue;
        }
      }
      
      // Found a matching window - return the window ID (we'll need to find the actual NSWindow later if needed)
      NSNumber* windowID = windowInfo[(id)kCGWindowNumber];
      CFRelease(windowList);
      return reinterpret_cast<void*>(windowID ? windowID.unsignedLongValue : 0);
    }
    
    CFRelease(windowList);
    return nullptr;
  }
  
  bool EmbedWindowNative(void* childWindow, void* parentWindow) {
    // On macOS, we cannot directly embed windows from other applications
    // due to security restrictions. The childWindow handle is actually a CGWindowID,
    // not an NSWindow pointer.
    // 
    // For true window embedding on macOS, we would need to:
    // 1. Use screen capture/streaming to display the window content
    // 2. Use input injection to forward events to the original window
    // 
    // For now, return false to indicate embedding is not supported
    // The application should use screen capture instead
    
    // Check if childWindow is actually a window ID (small number) vs NSWindow pointer
    uintptr_t windowId = reinterpret_cast<uintptr_t>(childWindow);
    
    // If it's a small number (< 1 million), it's likely a CGWindowID, not a pointer
    // NSWindow pointers are typically much larger memory addresses
    if (windowId < 1000000) {
      // This is a CGWindowID, not an NSWindow pointer
      // macOS doesn't support embedding windows from other applications
      return false;
    }
    
    // Try to treat it as an NSWindow pointer (for same-application embedding)
    NSWindow* child = (__bridge NSWindow*)childWindow;
    NSView* parentView = (__bridge NSView*)parentWindow;
    
    if (!child || !parentView) {
      return false;
    }
    
    // Get the child window's content view
    NSView* childView = child.contentView;
    if (!childView) {
      return false;
    }
    
    // Remove from current parent if any
    [childView removeFromSuperview];
    
    // Add to parent view
    [parentView addSubview:childView];
    
    // Set frame to fill parent
    childView.frame = parentView.bounds;
    childView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    
    // Hide the original window
    [child orderOut:nil];
    
    return true;
  }
  
  bool UnembedWindowNative(void* window) {
    NSWindow* child = (__bridge NSWindow*)window;
    
    if (!child) {
      return false;
    }
    
    NSView* childView = child.contentView;
    if (childView && childView.superview) {
      // Remove from parent
      [childView removeFromSuperview];
      
      // Show the window again
      [child makeKeyAndOrderFront:nil];
    }
    
    return true;
  }
  
  std::vector<WindowInfo> GetWindowListNative() {
    std::vector<WindowInfo> windows;
    
    // Get all running applications
    NSArray* runningApps = [[NSWorkspace sharedWorkspace] runningApplications];
    
    for (NSRunningApplication* app in runningApps) {
      // Skip hidden apps and background apps
      if (app.hidden || app.activationPolicy == NSApplicationActivationPolicyProhibited) {
        continue;
      }
      
      // Get the app's windows
      // Note: We need to use CGWindowListCopyWindowInfo for a more complete list
      // as NSApplication.sharedApplication.windows only returns windows from the current app
      CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID
      );
      
      if (windowList) {
        NSArray* windowsArray = (__bridge NSArray*)windowList;
        
        for (NSDictionary* windowInfo in windowsArray) {
          // Get window owner PID
          NSNumber* ownerPID = windowInfo[(id)kCGWindowOwnerPID];
          if (!ownerPID || ownerPID.integerValue != app.processIdentifier) {
            continue;
          }
          
          // Get window name
          NSString* windowName = windowInfo[(id)kCGWindowName];
          if (!windowName || windowName.length == 0) {
            // Skip windows without names (usually system windows)
            continue;
          }
          
          // Get window bounds to check if it's visible
          NSDictionary* bounds = windowInfo[(id)kCGWindowBounds];
          if (!bounds) {
            continue;
          }
          
          // Get window layer - skip if it's a desktop element
          NSNumber* layer = windowInfo[(id)kCGWindowLayer];
          if (layer && layer.integerValue < 0) {
            continue; // Skip desktop elements
          }
          
          WindowInfo info;
          info.processName = [app.localizedName UTF8String] ?: "";
          info.windowTitle = [windowName UTF8String] ?: "";
          // Store the window ID as the handle (we'll need to find the actual NSWindow later if needed)
          NSNumber* windowID = windowInfo[(id)kCGWindowNumber];
          info.handle = reinterpret_cast<void*>(windowID ? windowID.unsignedLongValue : 0);
          
          windows.push_back(info);
        }
        
        CFRelease(windowList);
      }
    }
    
    return windows;
  }
}

#endif // __APPLE__

