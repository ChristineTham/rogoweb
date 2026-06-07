# Tech Stack

- **Core Logic**: C (standard and K&R)
- **Target Platform**: WebAssembly (WASM) compiled via Emscripten (`emcc`)
- **Compilation & Build**: Autotools (autoconf/automake) adapted for Emscripten
- **Frontend UI**: Vanilla JS / HTML / CSS (or React) bundled with Vite
- **Terminal Emulation**: `@xterm/xterm` (v5) with `@xterm/addon-canvas` for high-precision hardware emulation.
- **Concurrency & IPC**: Web Workers with `SharedArrayBuffer` and Atomics
- **Storage/Persistence**: Emscripten IndexedDB File System (IDBFS)