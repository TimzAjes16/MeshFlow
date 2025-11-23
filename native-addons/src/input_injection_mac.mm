#ifdef __APPLE__
#include "input_injection.h"
#include <ApplicationServices/ApplicationServices.h>
#include <Carbon/Carbon.h>
#include <string>
#include <cstring>

// Define the enum values to match the header
namespace InputInjection {
  enum MouseEventType {
    MOUSE_MOVE = 0,
    MOUSE_DOWN = 1,
    MOUSE_UP = 2,
    MOUSE_CLICK = 3
  };
  
  enum MouseButton {
    MOUSE_LEFT = 0,
    MOUSE_RIGHT = 1,
    MOUSE_MIDDLE = 2
  };
  
  enum KeyboardEventType {
    KEY_DOWN = 0,
    KEY_UP = 1,
    KEY_PRESS = 2
  };
  
  // Convert key string to CGKeyCode
  CGKeyCode GetKeyCode(const char* key) {
    std::string keyStr(key);
    
    // Special keys
    if (keyStr == "Enter" || keyStr == "Return") return 36;
    if (keyStr == "Tab") return 48;
    if (keyStr == "Space") return 49;
    if (keyStr == "Backspace" || keyStr == "Delete") return 51;
    if (keyStr == "Escape") return 53;
    if (keyStr == "ArrowUp") return 126;
    if (keyStr == "ArrowDown") return 125;
    if (keyStr == "ArrowLeft") return 123;
    if (keyStr == "ArrowRight") return 124;
    
    // Letters
    if (keyStr.length() == 1) {
      char ch = keyStr[0];
      if (ch >= 'a' && ch <= 'z') {
        return (CGKeyCode)(ch - 'a');
      }
      if (ch >= 'A' && ch <= 'Z') {
        return (CGKeyCode)(ch - 'A');
      }
      // Numbers (0-9)
      if (ch >= '0' && ch <= '9') {
        return (CGKeyCode)(ch - '0' + 29);
      }
    }
    
    return 0;
  }
  
  bool InjectMouseEventNative(int type, int x, int y, int button, int buttons, bool shift, bool ctrl, bool alt, bool meta) {
    CGEventRef event = NULL;
    CGEventType eventType = kCGEventNull;
    CGMouseButton mouseButton = kCGMouseButtonLeft;
    
    // Convert button
    if (button == 1) mouseButton = kCGMouseButtonRight;
    else if (button == 2) mouseButton = kCGMouseButtonCenter;
    
    // Build modifier flags
    CGEventFlags flags = 0;
    if (shift) flags |= kCGEventFlagMaskShift;
    if (ctrl) flags |= kCGEventFlagMaskControl;
    if (alt) flags |= kCGEventFlagMaskAlternate;
    if (meta) flags |= kCGEventFlagMaskCommand;
    
    switch (type) {
      case MOUSE_MOVE: {
        event = CGEventCreateMouseEvent(NULL, kCGEventMouseMoved, CGPointMake(x, y), mouseButton);
        CGEventSetFlags(event, flags);
        CGEventPost(kCGHIDEventTap, event);
        CFRelease(event);
        return true;
      }
      
      case MOUSE_DOWN: {
        if (button == 0) eventType = kCGEventLeftMouseDown;
        else if (button == 1) eventType = kCGEventRightMouseDown;
        else if (button == 2) eventType = kCGEventOtherMouseDown;
        else return false;
        
        event = CGEventCreateMouseEvent(NULL, eventType, CGPointMake(x, y), mouseButton);
        CGEventSetFlags(event, flags);
        CGEventPost(kCGHIDEventTap, event);
        CFRelease(event);
        return true;
      }
      
      case MOUSE_UP: {
        if (button == 0) eventType = kCGEventLeftMouseUp;
        else if (button == 1) eventType = kCGEventRightMouseUp;
        else if (button == 2) eventType = kCGEventOtherMouseUp;
        else return false;
        
        event = CGEventCreateMouseEvent(NULL, eventType, CGPointMake(x, y), mouseButton);
        CGEventSetFlags(event, flags);
        CGEventPost(kCGHIDEventTap, event);
        CFRelease(event);
        return true;
      }
      
      case MOUSE_CLICK: {
        // Send down and up
        if (button == 0) {
          event = CGEventCreateMouseEvent(NULL, kCGEventLeftMouseDown, CGPointMake(x, y), mouseButton);
          CGEventSetFlags(event, flags);
          CGEventPost(kCGHIDEventTap, event);
          CFRelease(event);
          
          event = CGEventCreateMouseEvent(NULL, kCGEventLeftMouseUp, CGPointMake(x, y), mouseButton);
          CGEventSetFlags(event, flags);
          CGEventPost(kCGHIDEventTap, event);
          CFRelease(event);
          return true;
        } else if (button == 1) {
          event = CGEventCreateMouseEvent(NULL, kCGEventRightMouseDown, CGPointMake(x, y), mouseButton);
          CGEventSetFlags(event, flags);
          CGEventPost(kCGHIDEventTap, event);
          CFRelease(event);
          
          event = CGEventCreateMouseEvent(NULL, kCGEventRightMouseUp, CGPointMake(x, y), mouseButton);
          CGEventSetFlags(event, flags);
          CGEventPost(kCGHIDEventTap, event);
          CFRelease(event);
          return true;
        }
        return false;
      }
    }
    
    return false;
  }
  
  bool InjectKeyboardEventNative(int type, const char* key, const char* code, bool shift, bool ctrl, bool alt, bool meta) {
    CGKeyCode keyCode = GetKeyCode(key);
    if (keyCode == 0 && strlen(key) > 0) {
      // Try to get from code if key failed
      keyCode = GetKeyCode(code);
    }
    
    if (keyCode == 0) {
      return false;
    }
    
    // Build modifier flags
    CGEventFlags flags = 0;
    if (shift) flags |= kCGEventFlagMaskShift;
    if (ctrl) flags |= kCGEventFlagMaskControl;
    if (alt) flags |= kCGEventFlagMaskAlternate;
    if (meta) flags |= kCGEventFlagMaskCommand;
    
    CGEventRef event = NULL;
    
    if (type == KEY_DOWN || type == KEY_PRESS) {
      event = CGEventCreateKeyboardEvent(NULL, keyCode, true);
      CGEventSetFlags(event, flags);
      CGEventPost(kCGHIDEventTap, event);
      CFRelease(event);
    }
    
    if (type == KEY_UP || type == KEY_PRESS) {
      event = CGEventCreateKeyboardEvent(NULL, keyCode, false);
      CGEventSetFlags(event, flags);
      CGEventPost(kCGHIDEventTap, event);
      CFRelease(event);
    }
    
    return true;
  }
}

#endif // __APPLE__

