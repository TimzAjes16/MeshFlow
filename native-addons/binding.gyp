{
  "targets": [
    {
      "target_name": "meshflow_native",
      "sources": [
        "src/meshflow_native.cc",
        "src/input_injection.cc",
        "src/window_embedding.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "conditions": [
        ["OS=='win'", {
          "sources": [
            "src/input_injection_win.cc",
            "src/window_embedding_win.cc"
          ],
          "libraries": [
            "-luser32",
            "-lgdi32"
          ]
        }],
        ["OS=='mac'", {
          "sources": [
            "src/input_injection_mac.mm",
            "src/window_embedding_mac.mm"
          ],
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.13"
          },
          "libraries": [
            "-framework Cocoa",
            "-framework ApplicationServices",
            "-framework Carbon"
          ]
        }]
      ]
    }
  ]
}

