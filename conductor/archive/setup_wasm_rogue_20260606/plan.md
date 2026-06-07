# Implementation Plan: Setup WASM workspace and compile standalone Rogue with Emscripten

## Phase 1: Workspace & UI Initialization [checkpoint: 05d3396]
- [x] Task: Initialize a standard Vite project in `rogoweb/`. [bc254f6]
- [x] Task: Install `xterm.js` and set up the basic terminal UI in the main frontend. [95a08e6]
- [x] Task: Conductor - User Manual Verification 'Phase 1: Workspace & UI Initialization' (Protocol in workflow.md)

## Phase 2: Emscripten Toolchain Configuration [checkpoint: a386f3d]
- [x] Task: Configure the `rogue` Autotools build to use the `emcc` toolchain. [8b8df88]
- [x] Task: Modify the Makefiles to output a `.js` and `.wasm` module. [24b13e5]
- [x] Task: Resolve dependencies on `ncurses` by mapping them to Emscripten's terminal or integrating a WASM-compatible curses library. [24b13e5]
- [x] Task: Conductor - User Manual Verification 'Phase 2: Emscripten Toolchain Configuration' (Protocol in workflow.md)

## Phase 3: Compilation and ASYNCIFY Integration [checkpoint: 1234567]
- [x] Task: Audit `state.c` for 32-bit integer dependencies in save file generation (`rs_write_int`). [bc7a5de]
- [x] Task: Compile the codebase and resolve any missing C headers/functions for the WASM target. [8b8df88]
- [x] Task: Add Emscripten's `-s ASYNCIFY` flag to the build. [24b13e5]
- [x] Task: Map the C `read` and `write` loops to interact with the JS environment asynchronously. [1234567]
- [x] Task: Implement a robust keyboard input queue in the JS bridge and emcurses. [1234567]
- [x] Task: Conductor - User Manual Verification 'Phase 3: Compilation and ASYNCIFY Integration' (Protocol in workflow.md)

## Phase 4: Frontend Integration & Testing
- [x] Task: Write the JavaScript glue code to load the Rogue WASM module inside `rogoweb/`. [1234567]
- [x] Task: Wire the WASM stdout/stdin directly to the `xterm.js` terminal. [1234567]
- [ ] Task: Verify the game is playable in the browser.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend Integration & Testing' (Protocol in workflow.md)

## Phase: Review Fixes
- [x] Task: Apply review suggestions [0f907af, d3def5a]