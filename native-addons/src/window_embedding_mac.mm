#ifdef __APPLE__
#include "window_embedding.h"
#include <Cocoa/Cocoa.h>
#include <AppKit/AppKit.h>
#include <CoreGraphics/CoreGraphics.h>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  void* FindWindowNative(const char* processName, const char* windowTitle) {
    NSArray* windows = [NSApplication sharedApplication].windows;
    std::string processNameStr = processName ? processName : "";
    std::string windowTitleStr = windowTitle ? windowTitle : "";
    
    for (NSWindow* window in windows) {
      if (!window.visible) continue;
      
      NSString* title = window.title ? window.title : @"";
      std::string titleStr = [title UTF8String];
      
      // Get process name
      NSRunningApplication* app = [window valueForKey:@"_runningApplication"];
      NSString* appName = app ? app.localizedName : @"";
      std::string appNameStr = [appName UTF8String];
      
      bool matchProcess = processNameStr.empty() || 
                         appNameStr.find(processNameStr) != std::string::npos;
      bool matchTitle = windowTitleStr.empty() ||
                       titleStr.find(windowTitleStr) != std::string::npos;
      
      if (matchProcess && matchTitle) {
        // Retain the window object for the caller
        CFRetain((__bridge CFTypeRef)window);
        return (__bridge void*)window;
      }
    }
    
    return nullptr;
  }
  
  bool EmbedWindowNative(void* childWindow, void* parentWindow) {
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

