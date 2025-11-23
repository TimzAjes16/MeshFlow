#ifdef __APPLE__
#include "window_embedding.h"
#include <Cocoa/Cocoa.h>
#include <AppKit/AppKit.h>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  struct WindowInfo {
    NSWindow* window;
    std::string title;
    std::string processName;
  };
  
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
}

#endif // __APPLE__

