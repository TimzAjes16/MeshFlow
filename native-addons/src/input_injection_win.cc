#ifdef _WIN32
#include "input_injection.h"
#include <windows.h>
#include <cmath>
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
  
  bool InjectMouseEventNative(int type, int x, int y, int button, int buttons, bool shift, bool ctrl, bool alt, bool meta) {
    INPUT input = {0};
    input.type = INPUT_MOUSE;
    
    // Set position
    SetCursorPos(x, y);
    
    // Set button state
    DWORD mouseFlags = 0;
    
    switch (type) {
      case MOUSE_MOVE:
        // Position already set, no additional flags needed
        return true;
        
      case MOUSE_DOWN:
        if (button == 0) { // Left button
          mouseFlags = MOUSEEVENTF_LEFTDOWN;
        } else if (button == 1) { // Right button
          mouseFlags = MOUSEEVENTF_RIGHTDOWN;
        } else if (button == 2) { // Middle button
          mouseFlags = MOUSEEVENTF_MIDDLEDOWN;
        }
        break;
        
      case MOUSE_UP:
        if (button == 0) { // Left button
          mouseFlags = MOUSEEVENTF_LEFTUP;
        } else if (button == 1) { // Right button
          mouseFlags = MOUSEEVENTF_RIGHTUP;
        } else if (button == 2) { // Middle button
          mouseFlags = MOUSEEVENTF_MIDDLEUP;
        }
        break;
        
      case MOUSE_CLICK:
        // Send down and up events
        if (button == 0) {
          input.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
          SendInput(1, &input, sizeof(INPUT));
          input.mi.dwFlags = MOUSEEVENTF_LEFTUP;
          SendInput(1, &input, sizeof(INPUT));
          return true;
        } else if (button == 1) {
          input.mi.dwFlags = MOUSEEVENTF_RIGHTDOWN;
          SendInput(1, &input, sizeof(INPUT));
          input.mi.dwFlags = MOUSEEVENTF_RIGHTUP;
          SendInput(1, &input, sizeof(INPUT));
          return true;
        } else if (button == 2) {
          input.mi.dwFlags = MOUSEEVENTF_MIDDLEDOWN;
          SendInput(1, &input, sizeof(INPUT));
          input.mi.dwFlags = MOUSEEVENTF_MIDDLEUP;
          SendInput(1, &input, sizeof(INPUT));
          return true;
        }
        return false;
    }
    
    if (mouseFlags != 0) {
      input.mi.dwFlags = mouseFlags;
      UINT result = SendInput(1, &input, sizeof(INPUT));
      return result == 1;
    }
    
    return true;
  }
  
  bool InjectKeyboardEventNative(int type, const char* key, const char* code, bool shift, bool ctrl, bool alt, bool meta) {
    INPUT input = {0};
    input.type = INPUT_KEYBOARD;
    
    // Map common keys to virtual key codes
    WORD vkCode = 0;
    bool needsShift = false;
    
    // Handle special keys
    if (strcmp(key, "Enter") == 0) vkCode = VK_RETURN;
    else if (strcmp(key, "Tab") == 0) vkCode = VK_TAB;
    else if (strcmp(key, "Space") == 0) vkCode = VK_SPACE;
    else if (strcmp(key, "Backspace") == 0) vkCode = VK_BACK;
    else if (strcmp(key, "Delete") == 0) vkCode = VK_DELETE;
    else if (strcmp(key, "Escape") == 0) vkCode = VK_ESCAPE;
    else if (strcmp(key, "ArrowUp") == 0) vkCode = VK_UP;
    else if (strcmp(key, "ArrowDown") == 0) vkCode = VK_DOWN;
    else if (strcmp(key, "ArrowLeft") == 0) vkCode = VK_LEFT;
    else if (strcmp(key, "ArrowRight") == 0) vkCode = VK_RIGHT;
    else if (strlen(key) == 1) {
      // Single character
      char ch = key[0];
      if (ch >= 'A' && ch <= 'Z') {
        vkCode = ch;
        needsShift = true;
      } else if (ch >= 'a' && ch <= 'z') {
        vkCode = ch - 32; // Convert to uppercase
      } else if (ch >= '0' && ch <= '9') {
        vkCode = ch;
      } else {
        // Try VkKeyScan for other characters
        SHORT scan = VkKeyScan(ch);
        vkCode = LOBYTE(scan);
        needsShift = (HIBYTE(scan) & 1) != 0;
      }
    }
    
    if (vkCode == 0) {
      return false;
    }
    
    // Handle modifier keys
    if (shift || needsShift) {
      input.ki.wVk = VK_LSHIFT;
      input.ki.dwFlags = 0;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (ctrl) {
      input.ki.wVk = VK_LCONTROL;
      input.ki.dwFlags = 0;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (alt) {
      input.ki.wVk = VK_LMENU;
      input.ki.dwFlags = 0;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (meta) {
      input.ki.wVk = VK_LWIN;
      input.ki.dwFlags = 0;
      SendInput(1, &input, sizeof(INPUT));
    }
    
    // Send the key event
    input.ki.wVk = vkCode;
    input.ki.dwFlags = (type == KEY_UP) ? KEYEVENTF_KEYUP : 0;
    UINT result = SendInput(1, &input, sizeof(INPUT));
    
    // Release modifier keys
    if (meta) {
      input.ki.wVk = VK_LWIN;
      input.ki.dwFlags = KEYEVENTF_KEYUP;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (alt) {
      input.ki.wVk = VK_LMENU;
      input.ki.dwFlags = KEYEVENTF_KEYUP;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (ctrl) {
      input.ki.wVk = VK_LCONTROL;
      input.ki.dwFlags = KEYEVENTF_KEYUP;
      SendInput(1, &input, sizeof(INPUT));
    }
    if (shift || needsShift) {
      input.ki.wVk = VK_LSHIFT;
      input.ki.dwFlags = KEYEVENTF_KEYUP;
      SendInput(1, &input, sizeof(INPUT));
    }
    
    return result == 1;
  }
}

#endif // _WIN32

