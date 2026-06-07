# Specification: Setup WASM Workspace and Compile Rogue

## Goal
Establish the frontend workspace inside `rogoweb/` and successfully compile the standalone `rogue` C codebase into WebAssembly using Emscripten.

## Scope
- Initialize the `rogoweb/` frontend application using Vite.
- Integrate `xterm.js` for the terminal emulator UI.
- Modify the `rogue` build system (Autotools/Make) to compile via `emcc`.
- Implement `-s ASYNCIFY` in Emscripten to handle Rogue's blocking terminal reads without freezing the browser.
- Link against a web-compatible `ncurses` substitute (or Emscripten's native term APIs).
- Render the compiled Rogue game in the browser.

## Constraints & Requirements
- **No Backend**: The game must run 100% in the browser.
- **Non-Destructive**: C source code modifications must be wrapped in `#ifdef __EMSCRIPTEN__` to ensure the native build continues to function.
- **32-Bit Integers**: WASM is a 32-bit environment. Ensure serialization routines (`rs_save_file`, `rs_write_int`) handle standard `long` values correctly without memory corruption across architectures.