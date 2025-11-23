#ifdef _WIN32
#include "window_embedding.h"
#include <windows.h>
#include <psapi.h>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  struct WindowInfo {
    HWND hwnd;
    std::string title;
    std::string processName;
  };
  
  // Callback for EnumWindows
  BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    std::vector<WindowInfo>* windows = reinterpret_cast<std::vector<WindowInfo>*>(lParam);
    
    // Skip invisible windows
    if (!IsWindowVisible(hwnd)) {
      return TRUE;
    }
    
    // Get window title
    char title[256];
    GetWindowTextA(hwnd, title, sizeof(title));
    
    // Get process name
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, processId);
    if (hProcess) {
      char processName[MAX_PATH];
      if (GetModuleFileNameExA(hProcess, NULL, processName, MAX_PATH)) {
        // Extract just the filename
        std::string fullPath(processName);
        size_t lastSlash = fullPath.find_last_of("\\/");
        std::string filename = (lastSlash != std::string::npos) 
          ? fullPath.substr(lastSlash + 1) 
          : fullPath;
        
        WindowInfo info;
        info.hwnd = hwnd;
        info.title = title;
        info.processName = filename;
        windows->push_back(info);
      }
      CloseHandle(hProcess);
    }
    
    return TRUE;
  }
  
  void* FindWindowNative(const char* processName, const char* windowTitle) {
    std::vector<WindowInfo> windows;
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&windows));
    
    for (const auto& info : windows) {
      bool matchProcess = (!processName || strlen(processName) == 0 || 
                          info.processName.find(processName) != std::string::npos);
      bool matchTitle = (!windowTitle || strlen(windowTitle) == 0 ||
                        info.title.find(windowTitle) != std::string::npos);
      
      if (matchProcess && matchTitle) {
        return reinterpret_cast<void*>(info.hwnd);
      }
    }
    
    return nullptr;
  }
  
  bool EmbedWindowNative(void* childWindow, void* parentWindow) {
    HWND hwndChild = reinterpret_cast<HWND>(childWindow);
    HWND hwndParent = reinterpret_cast<HWND>(parentWindow);
    
    if (!IsWindow(hwndChild) || !IsWindow(hwndParent)) {
      return false;
    }
    
    // Use SetParent to embed the window
    HWND result = SetParent(hwndChild, hwndParent);
    
    if (result == NULL) {
      DWORD error = GetLastError();
      return false;
    }
    
    // Update window style to be a child window
    LONG_PTR style = GetWindowLongPtr(hwndChild, GWL_STYLE);
    style &= ~(WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU);
    style |= WS_CHILD;
    SetWindowLongPtr(hwndChild, GWL_STYLE, style);
    
    // Update extended style
    LONG_PTR exStyle = GetWindowLongPtr(hwndChild, GWL_EXSTYLE);
    exStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_WINDOWEDGE | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    SetWindowLongPtr(hwndChild, GWL_EXSTYLE, exStyle);
    
    // Force window to redraw
    SetWindowPos(hwndChild, NULL, 0, 0, 0, 0,
                 SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    
    return true;
  }
  
  bool UnembedWindowNative(void* window) {
    HWND hwnd = reinterpret_cast<HWND>(window);
    
    if (!IsWindow(hwnd)) {
      return false;
    }
    
    // Set parent to desktop
    HWND result = SetParent(hwnd, NULL);
    
    if (result == NULL) {
      return false;
    }
    
    // Restore window style
    LONG_PTR style = GetWindowLongPtr(hwnd, GWL_STYLE);
    style &= ~WS_CHILD;
    style |= WS_POPUP | WS_CAPTION | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX | WS_SYSMENU;
    SetWindowLongPtr(hwnd, GWL_STYLE, style);
    
    // Force window to redraw
    SetWindowPos(hwnd, NULL, 0, 0, 0, 0,
                 SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED);
    
    return true;
  }
}

#endif // _WIN32

