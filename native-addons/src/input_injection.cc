#include "input_injection.h"
#include <napi.h>

namespace InputInjection {
  
  // Mouse event types
  enum MouseEventType {
    MOUSE_MOVE = 0,
    MOUSE_DOWN = 1,
    MOUSE_UP = 2,
    MOUSE_CLICK = 3
  };
  
  // Button types
  enum MouseButton {
    MOUSE_LEFT = 0,
    MOUSE_RIGHT = 1,
    MOUSE_MIDDLE = 2
  };
  
  // Keyboard event types
  enum KeyboardEventType {
    KEY_DOWN = 0,
    KEY_UP = 1,
    KEY_PRESS = 2
  };
  
  Napi::Value InjectMouseEvent(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
      Napi::TypeError::New(env, "Expected an object with mouse event properties")
        .ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Object eventObj = info[0].As<Napi::Object>();
    
    // Extract event properties
    std::string type = eventObj.Has("type") ? eventObj.Get("type").As<Napi::String>().Utf8Value() : "move";
    int x = eventObj.Has("x") ? eventObj.Get("x").As<Napi::Number>().Int32Value() : 0;
    int y = eventObj.Has("y") ? eventObj.Get("y").As<Napi::Number>().Int32Value() : 0;
    int button = eventObj.Has("button") ? eventObj.Get("button").As<Napi::Number>().Int32Value() : 0;
    int buttons = eventObj.Has("buttons") ? eventObj.Get("buttons").As<Napi::Number>().Int32Value() : 0;
    bool shift = eventObj.Has("shiftKey") ? eventObj.Get("shiftKey").As<Napi::Boolean>().Value() : false;
    bool ctrl = eventObj.Has("ctrlKey") ? eventObj.Get("ctrlKey").As<Napi::Boolean>().Value() : false;
    bool alt = eventObj.Has("altKey") ? eventObj.Get("altKey").As<Napi::Boolean>().Value() : false;
    bool meta = eventObj.Has("metaKey") ? eventObj.Get("metaKey").As<Napi::Boolean>().Value() : false;
    
    // Convert type string to enum
    int eventType = MOUSE_MOVE;
    if (type == "mousedown") eventType = MOUSE_DOWN;
    else if (type == "mouseup") eventType = MOUSE_UP;
    else if (type == "click") eventType = MOUSE_CLICK;
    
    // Call platform-specific implementation
    bool success = InjectMouseEventNative(eventType, x, y, button, buttons, shift, ctrl, alt, meta);
    
    return Napi::Boolean::New(env, success);
  }
  
  Napi::Value InjectKeyboardEvent(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    if (info.Length() < 1 || !info[0].IsObject()) {
      Napi::TypeError::New(env, "Expected an object with keyboard event properties")
        .ThrowAsJavaScriptException();
      return env.Null();
    }
    
    Napi::Object eventObj = info[0].As<Napi::Object>();
    
    // Extract event properties
    std::string type = eventObj.Has("type") ? eventObj.Get("type").As<Napi::String>().Utf8Value() : "keydown";
    std::string key = eventObj.Has("key") ? eventObj.Get("key").As<Napi::String>().Utf8Value() : "";
    std::string code = eventObj.Has("code") ? eventObj.Get("code").As<Napi::String>().Utf8Value() : "";
    bool shift = eventObj.Has("shiftKey") ? eventObj.Get("shiftKey").As<Napi::Boolean>().Value() : false;
    bool ctrl = eventObj.Has("ctrlKey") ? eventObj.Get("ctrlKey").As<Napi::Boolean>().Value() : false;
    bool alt = eventObj.Has("altKey") ? eventObj.Get("altKey").As<Napi::Boolean>().Value() : false;
    bool meta = eventObj.Has("metaKey") ? eventObj.Get("metaKey").As<Napi::Boolean>().Value() : false;
    
    // Convert type string to enum
    int eventType = KEY_DOWN;
    if (type == "keyup") eventType = KEY_UP;
    else if (type == "keypress") eventType = KEY_PRESS;
    
    // Call platform-specific implementation
    bool success = InjectKeyboardEventNative(eventType, key.c_str(), code.c_str(), shift, ctrl, alt, meta);
    
    return Napi::Boolean::New(env, success);
  }
  
  void Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
      Napi::String::New(env, "injectMouseEvent"),
      Napi::Function::New(env, InjectMouseEvent)
    );
    
    exports.Set(
      Napi::String::New(env, "injectKeyboardEvent"),
      Napi::Function::New(env, InjectKeyboardEvent)
    );
  }
}

