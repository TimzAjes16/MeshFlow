#include "window_embedding.h"
#include <napi.h>
#include <map>
#include <string>
#include <vector>

namespace WindowEmbedding {
  
  // Store window handles (as void* pointers)
  static std::map<std::string, void*> embeddedWindows;
  
  Napi::Value EmbedWindow(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
      Napi::TypeError::New(env, "Expected an object with window properties")
        .ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Object options = info[0].As<Napi::Object>();
    
    std::string containerId = options.Has("containerId") 
      ? options.Get("containerId").As<Napi::String>().Utf8Value() 
      : "";
    std::string processName = options.Has("processName")
      ? options.Get("processName").As<Napi::String>().Utf8Value()
      : "";
    std::string windowTitle = options.Has("windowTitle")
      ? options.Get("windowTitle").As<Napi::String>().Utf8Value()
      : "";
    
    // For now, we'll need the parent window handle from Electron
    // This will be passed from the Electron main process
    void* parentWindow = nullptr;
    if (options.Has("parentWindowHandle")) {
      // In Electron, we'd get this from BrowserWindow.getNativeWindowHandle()
      // For now, we'll need to pass it as a number (pointer value)
      uintptr_t handle = options.Get("parentWindowHandle").As<Napi::Number>().Uint32Value();
      parentWindow = reinterpret_cast<void*>(handle);
    }
    
    // Find the child window
    void* childWindow = FindWindowNative(processName.c_str(), windowTitle.c_str());
    
    if (!childWindow) {
      Napi::Object result = Napi::Object::New(env);
      result.Set("success", Napi::Boolean::New(env, false));
      result.Set("error", Napi::String::New(env, "Window not found"));
      return result;
    }
    
    if (!parentWindow) {
      Napi::Object result = Napi::Object::New(env);
      result.Set("success", Napi::Boolean::New(env, false));
      result.Set("error", Napi::String::New(env, "Parent window handle required"));
      return result;
    }
    
    // On macOS, window embedding across applications is not supported
    // due to security restrictions. The childWindow handle is a CGWindowID,
    // not an NSWindow pointer, so we cannot embed it directly.
    // Return an error indicating that screen capture should be used instead.
    #ifdef __APPLE__
    Napi::Object macResult = Napi::Object::New(env);
    macResult.Set("success", Napi::Boolean::New(env, false));
    macResult.Set("error", Napi::String::New(env, "Window embedding across applications is not supported on macOS. Please use the Live Capture widget instead to capture and interact with the window."));
    return macResult;
    #endif
    
    // Embed the window (Windows only)
    bool success = EmbedWindowNative(childWindow, parentWindow);
    
    if (success && !containerId.empty()) {
      embeddedWindows[containerId] = childWindow;
    }
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, success));
    if (!success) {
      result.Set("error", Napi::String::New(env, "Failed to embed window"));
    }
    return result;
  }
  
  Napi::Value UnembedWindow(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
      Napi::TypeError::New(env, "Expected an object with containerId")
        .ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Object options = info[0].As<Napi::Object>();
    std::string containerId = options.Has("containerId")
      ? options.Get("containerId").As<Napi::String>().Utf8Value()
      : "";
    
    if (containerId.empty() || embeddedWindows.find(containerId) == embeddedWindows.end()) {
      Napi::Object result = Napi::Object::New(env);
      result.Set("success", Napi::Boolean::New(env, false));
      result.Set("error", Napi::String::New(env, "Window not found in embedded list"));
      return result;
    }
    
    void* window = embeddedWindows[containerId];
    bool success = UnembedWindowNative(window);
    
    if (success) {
      embeddedWindows.erase(containerId);
    }
    
    Napi::Object result = Napi::Object::New(env);
    result.Set("success", Napi::Boolean::New(env, success));
    return result;
  }
  
  Napi::Value FindWindow(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    std::string processName = "";
    std::string windowTitle = "";
    
    if (info.Length() >= 1 && info[0].IsObject()) {
      Napi::Object options = info[0].As<Napi::Object>();
      if (options.Has("processName")) {
        processName = options.Get("processName").As<Napi::String>().Utf8Value();
      }
      if (options.Has("windowTitle")) {
        windowTitle = options.Get("windowTitle").As<Napi::String>().Utf8Value();
      }
    }
    
    void* window = FindWindowNative(processName.c_str(), windowTitle.c_str());
    
    if (window) {
      Napi::Object result = Napi::Object::New(env);
      result.Set("found", Napi::Boolean::New(env, true));
      result.Set("handle", Napi::Number::New(env, reinterpret_cast<uintptr_t>(window)));
      return result;
    } else {
      Napi::Object result = Napi::Object::New(env);
      result.Set("found", Napi::Boolean::New(env, false));
      return result;
    }
  }
  
  Napi::Value GetWindowList(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    try {
      std::vector<WindowInfo> windows = GetWindowListNative();
      
      Napi::Array result = Napi::Array::New(env, windows.size());
      
      for (size_t i = 0; i < windows.size(); i++) {
        Napi::Object windowObj = Napi::Object::New(env);
        windowObj.Set("processName", Napi::String::New(env, windows[i].processName));
        windowObj.Set("windowTitle", Napi::String::New(env, windows[i].windowTitle));
        windowObj.Set("windowHandle", Napi::Number::New(env, reinterpret_cast<uintptr_t>(windows[i].handle)));
        result.Set(i, windowObj);
      }
      
      return result;
    } catch (const std::exception& e) {
      Napi::Error::New(env, std::string("Error getting window list: ") + e.what())
        .ThrowAsJavaScriptException();
      return Napi::Array::New(env);
    }
  }
  
  void Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
      Napi::String::New(env, "embedWindow"),
      Napi::Function::New(env, EmbedWindow)
    );
    
    exports.Set(
      Napi::String::New(env, "unembedWindow"),
      Napi::Function::New(env, UnembedWindow)
    );
    
    exports.Set(
      Napi::String::New(env, "findWindow"),
      Napi::Function::New(env, FindWindow)
    );
    
    exports.Set(
      Napi::String::New(env, "getWindowList"),
      Napi::Function::New(env, GetWindowList)
    );
  }
}

