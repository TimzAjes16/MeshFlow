#ifdef __APPLE__
#include "window_embedding.h"
#include <Cocoa/Cocoa.h>
#include <AppKit/AppKit.h>
#include <CoreGraphics/CoreGraphics.h>
#include <ApplicationServices/ApplicationServices.h>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  void* FindWindowNative(const char* processName, const char* windowTitle) {
    std::string processNameStr = processName ? processName : "";
    std::string windowTitleStr = windowTitle ? windowTitle : "";
    
    // Use CGWindowListCopyWindowInfo to get all windows
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
      
      // Found a matching window - get the window ID
      NSNumber* windowID = windowInfo[(id)kCGWindowNumber];
      CGWindowID cgWindowID = windowID ? windowID.unsignedIntValue : 0;
      
      if (cgWindowID > 0) {
        // Return the window ID wrapped with a flag to indicate it's a CGWindowID
        // Use a high bit to indicate it's a window ID, not a pointer
        CFRelease(windowList);
        return reinterpret_cast<void*>((uintptr_t)cgWindowID | 0x8000000000000000ULL);
      }
    }
    
    CFRelease(windowList);
    return nullptr;
  }
  
  bool EmbedWindowNative(void* childWindow, void* parentWindow) {
    // On macOS, true window embedding across applications is not possible
    // due to security restrictions. However, we can use screen capture + input injection
    // to create a seamless experience that feels like true embedding.
    // 
    // This function returns true to indicate the window was "found" and can be captured,
    // but the actual embedding is handled by screen capture in the widget component.
    
    // Check if childWindow is a window ID (has high bit set)
    uintptr_t windowHandle = reinterpret_cast<uintptr_t>(childWindow);
    bool isWindowID = (windowHandle & 0x8000000000000000ULL) != 0;
    
    if (!isWindowID) {
      // Not a valid window ID
      return false;
    }
    
    // Extract the CGWindowID
    CGWindowID windowID = (CGWindowID)(windowHandle & 0x7FFFFFFFFFFFFFFFULL);
    
    // Verify the window still exists
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
      kCGWindowListOptionIncludingWindow,
      windowID
    );
    
    bool windowExists = false;
    if (windowList && CFArrayGetCount(windowList) > 0) {
      windowExists = true;
      CFRelease(windowList);
    }
    
    // Return true if window exists - the widget will handle screen capture
    return windowExists;
  }
  
  bool UnembedWindowNative(void* window) {
    // On macOS, there's nothing to unembed since we use screen capture
    // Just return true to indicate success
    return true;
  }
  
  std::vector<WindowInfo> GetWindowListNative() {
    std::vector<WindowInfo> windows;
    
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
      kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements,
      kCGNullWindowID
    );
    
    if (windowList) {
      NSArray* windowsArray = (__bridge NSArray*)windowList;
      
      for (NSDictionary* windowInfo in windowsArray) {
        // Get window owner PID
        NSNumber* ownerPID = windowInfo[(id)kCGWindowOwnerPID];
        if (!ownerPID) continue;
        
        NSRunningApplication* app = [NSRunningApplication runningApplicationWithProcessIdentifier:ownerPID.integerValue];
        if (!app) continue;

        // Skip hidden apps and background apps
        if (app.hidden || app.activationPolicy == NSApplicationActivationPolicyProhibited) {
          continue;
        }
        
        // Get window name
        NSString* windowName = windowInfo[(id)kCGWindowName];
        if (!windowName || windowName.length == 0) {
          // Skip windows without names (usually system windows or uninteresting ones)
          continue;
        }
        
        // Get window layer - skip if it's a desktop element or overlay
        NSNumber* layer = windowInfo[(id)kCGWindowLayer];
        if (layer && layer.integerValue < 0) {
          continue; // Skip desktop elements
        }
        
        WindowInfo info;
        info.processName = [app.localizedName UTF8String] ?: "";
        info.windowTitle = [windowName UTF8String] ?: "";
        // Store the window ID as the handle (with flag bit set)
        NSNumber* windowID = windowInfo[(id)kCGWindowNumber];
        CGWindowID cgWindowID = windowID ? windowID.unsignedIntValue : 0;
        info.handle = reinterpret_cast<void*>((uintptr_t)cgWindowID | 0x8000000000000000ULL);
        
        windows.push_back(info);
      }
      
      CFRelease(windowList);
    }
    
    return windows;
  }
}

#endif // __APPLE__
