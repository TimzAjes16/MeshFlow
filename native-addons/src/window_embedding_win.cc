#ifdef _WIN32
#include "window_embedding.h"
#include <windows.h>
#include <psapi.h>
#include <string>
#include <vector>
#include <set>

namespace WindowEmbedding {
  
  // Callback for EnumWindows - used by both FindWindowNative and GetWindowListNative
  struct EnumWindowsData {
    std::vector<WindowInfo>* windows;
    const char* searchProcessName;
    const char* searchWindowTitle;
    bool isSearch;
  };
  
  BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    EnumWindowsData* data = reinterpret_cast<EnumWindowsData*>(lParam);
    
    // Skip invisible windows
    if (!IsWindowVisible(hwnd)) {
      return TRUE;
    }
    
    // Skip windows with no title (usually system windows)
    char title[256];
    GetWindowTextA(hwnd, title, sizeof(title));
    if (strlen(title) == 0) {
      return TRUE;
    }
    
    // Get process name
    DWORD processId;
    GetWindowThreadProcessId(hwnd, &processId);
    
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, FALSE, processId);
    if (!hProcess) {
      return TRUE;
    }
    
    char processName[MAX_PATH];
    if (!GetModuleFileNameExA(hProcess, NULL, processName, MAX_PATH)) {
      CloseHandle(hProcess);
      return TRUE;
    }
    CloseHandle(hProcess);
    
    // Extract just the filename
    std::string fullPath(processName);
    size_t lastSlash = fullPath.find_last_of("\\/");
    std::string filename = (lastSlash != std::string::npos) 
      ? fullPath.substr(lastSlash + 1) 
      : fullPath;
    
    // If this is a search, check if it matches
    if (data->isSearch) {
      bool matchProcess = (!data->searchProcessName || strlen(data->searchProcessName) == 0 || 
                          filename.find(data->searchProcessName) != std::string::npos);
      bool matchTitle = (!data->searchWindowTitle || strlen(data->searchWindowTitle) == 0 ||
                        std::string(title).find(data->searchWindowTitle) != std::string::npos);
      
      if (!matchProcess || !matchTitle) {
        return TRUE;
      }
    }
    
    WindowInfo info;
    info.handle = reinterpret_cast<void*>(hwnd);
    info.windowTitle = title;
    info.processName = filename;
    data->windows->push_back(info);
    
    return TRUE;
  }
  
  void* FindWindowNative(const char* processName, const char* windowTitle) {
    std::vector<WindowInfo> windows;
    EnumWindowsData data;
    data.windows = &windows;
    data.searchProcessName = processName;
    data.searchWindowTitle = windowTitle;
    data.isSearch = true;
    
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&data));
    
    if (!windows.empty()) {
      return windows[0].handle;
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
  
  std::vector<WindowInfo> GetWindowListNative() {
    std::vector<WindowInfo> windows;
    EnumWindowsData data;
    data.windows = &windows;
    data.searchProcessName = nullptr;
    data.searchWindowTitle = nullptr;
    data.isSearch = false;
    
    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&data));
    
    // Remove duplicates (same process name and window title)
    std::set<std::pair<std::string, std::string>> seen;
    std::vector<WindowInfo> uniqueWindows;
    
    for (const auto& info : windows) {
      auto key = std::make_pair(info.processName, info.windowTitle);
      if (seen.find(key) == seen.end()) {
        seen.insert(key);
        uniqueWindows.push_back(info);
      }
    }
    
    return uniqueWindows;
  }
}

#endif // _WIN32

