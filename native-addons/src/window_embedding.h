#ifndef WINDOW_EMBEDDING_H
#define WINDOW_EMBEDDING_H

#include <napi.h>

namespace WindowEmbedding {
  void Init(Napi::Env env, Napi::Object exports);
  
  // Embed a native window
  Napi::Value EmbedWindow(const Napi::CallbackInfo& info);
  
  // Unembed a native window
  Napi::Value UnembedWindow(const Napi::CallbackInfo& info);
  
  // Find window by process name or title
  Napi::Value FindWindow(const Napi::CallbackInfo& info);
  
  // Get window list
  Napi::Value GetWindowList(const Napi::CallbackInfo& info);
  
  // Platform-specific implementations
  void* FindWindowNative(const char* processName, const char* windowTitle);
  bool EmbedWindowNative(void* childWindow, void* parentWindow);
  bool UnembedWindowNative(void* window);
  
  // Platform-specific window list structure
  struct WindowInfo {
    void* handle;
    std::string processName;
    std::string windowTitle;
  };
  
  // Get list of all visible windows (platform-specific)
  std::vector<WindowInfo> GetWindowListNative();
}

#endif // WINDOW_EMBEDDING_H

