#ifndef INPUT_INJECTION_H
#define INPUT_INJECTION_H

#include <napi.h>

namespace InputInjection {
  void Init(Napi::Env env, Napi::Object exports);
  
  // Mouse event injection
  Napi::Value InjectMouseEvent(const Napi::CallbackInfo& info);
  
  // Keyboard event injection
  Napi::Value InjectKeyboardEvent(const Napi::CallbackInfo& info);
  
  // Platform-specific implementations
  bool InjectMouseEventNative(int type, int x, int y, int button, int buttons, bool shift, bool ctrl, bool alt, bool meta);
  bool InjectKeyboardEventNative(int type, const char* key, const char* code, bool shift, bool ctrl, bool alt, bool meta);
}

#endif // INPUT_INJECTION_H

