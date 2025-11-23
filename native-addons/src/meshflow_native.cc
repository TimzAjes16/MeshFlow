#include <napi.h>
#include "input_injection.h"
#include "window_embedding.h"

// Initialize the module
Napi::Object Init(Napi::Env env, Napi::Object exports) {
  // Initialize input injection module
  InputInjection::Init(env, exports);
  
  // Initialize window embedding module
  WindowEmbedding::Init(env, exports);
  
  return exports;
}

NODE_API_MODULE(meshflow_native, Init)

