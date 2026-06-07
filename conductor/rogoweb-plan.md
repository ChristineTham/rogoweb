# Rog-O-Matic & Rogue Web Port Implementation Plan

## 1. Background & Motivation

The goal is to port the classic C-based dungeon crawler **Rogue (5.4)** and its expert system automated player **Rog-O-Matic** to run entirely in the browser. The user requested a "Pure Web" approach, meaning we will not rely on a backend server to execute the C binaries. Both applications will be compiled to WebAssembly (WASM) and execute client-side.

## 2. Research: Specific Challenges & Issues

Our research into porting C-based terminal games (and specifically Rogomatic's architecture) reveals several critical challenges:

- **Process Management (`fork`/`exec`):** Rogomatic operates by invoking `pipe()`, `fork()`, and `execl()` to spawn the Rogue game as a child process and communicate with it via anonymous pipes (`ptc` and `ctp`). WASM does not support OS-level process forks or execution.
- **Blocking I/O (The `getch` problem):** Both Rogue and Rogomatic use blocking synchronous reads to wait for terminal input or pipe data. In a browser, a blocking while-loop freezes the main thread (or worker thread).
- **32-bit Integer Dependencies:** Emscripten's `wasm32` compilation target uses 32-bit pointers and a 32-bit `long` type. We must carefully audit file serialization (like `rs_write_int` in `state.c` and LTM/Gene pool writes in Rogomatic) to ensure structs aren't dumped directly to disk using `sizeof(long)` or `sizeof(struct)` which could misalign if cross-compiled or ported later to `wasm64`.
- **File System Persistence:** Rogomatic relies heavily on persistent files in `/var/games/rogomatic/` (e.g., `GenePool544`, `ltm544`). In the browser, the virtual MEMFS is wiped on reload.

## 3. Proposed Solution

To achieve a pure WASM port while overcoming these challenges:

1.  **Web Workers:** We will compile `rogue` and `player` (Rogomatic) into separate WASM modules and run them in **separate Web Workers**.
2.  **Virtual Pipes:** We will replace the UNIX `pipe()` IPC with a simulated pipe using `SharedArrayBuffer` and `Atomics` (or asynchronous `postMessage` queues) to pass the VT100 datastream between the Rogue worker and the Rogomatic worker.
3.  **ASYNCIFY:** We will use Emscripten's `-s ASYNCIFY` compiler flag. This allows blocking C functions (like `read()` on our virtual pipes or `getch()`) to pause the WASM execution stack and yield to the browser's event loop, resuming when data is available.
4.  **Emscripten IDBFS:** We will mount Emscripten's IndexedDB File System (`IDBFS`) to `/var/games/rogomatic` to ensure Gene pools and long-term memory persist across browser sessions.
5.  **xterm.js:** We will use `xterm.js` in the main browser thread to render the VT100 output (either from standalone Rogue or from Rogomatic's observer output).

## 4. Phased Implementation Plan

### Phase 1: Workspace & Toolchain Setup

- Initialize an empty repository in `rogoweb/` (e.g., standard npm + Vite template).
- Set up Emscripten (`emcc`) build scripts (Makefiles or CMake toolchains).
- Integrate `xterm.js` in the frontend shell.

### Phase 2: Standalone Rogue WASM Port

- Modify `rogue` to compile with `emcc`.
- Link against an Emscripten-compatible curses library (e.g., `pdcurses` or Emscripten's minimal terminal wrapper).
- Apply `-s ASYNCIFY` to handle blocking terminal input.
- **Audit 32-bit dependencies:** Review `state.c` (specifically `rs_save_file` and `rs_write_int`) to ensure integers are cast to fixed-width types (e.g., `int32_t`) before serialization.
- **Verification:** Play Rogue manually in the browser via `xterm.js`.

### Phase 3: Rogomatic WASM Port

- Modify `rogomatic` build to target WASM.
- **Refactor `setup.c`:** Strip out the `fork()` and `execl()` calls. Instead, the WASM entry point will simply initialize the `player` logic and await pipe connections.
- Audit `ltm.c` and `gene.c` for 32-bit or struct alignment dependencies during file I/O.

### Phase 4: Virtual Pipe IPC Integration

- Implement a `SharedArrayBuffer` ring buffer in JavaScript.
- Expose C-level hooks in both WASM modules (e.g., `wasm_pipe_read()`, `wasm_pipe_write()`) that replace standard `read(0, ...)` and `write(1, ...)`.
- Connect the Rogue Worker's stdout to the Rogomatic Worker's stdin, and vice versa.

### Phase 5: File System Persistence

- Configure Emscripten's `FS.mkdir('/var/games/rogomatic')` and `FS.mount(IDBFS, ...)`.
- Implement a JS hook to call `FS.syncfs(false)` whenever a game ends or a gene pool is updated.

### Phase 6: Frontend UI & Harnesses

- Build a React/Vanilla UI with controls to:
  - Start "Standalone Rogue".
  - Start "Rogomatic Auto-Play".
- Display live game statistics (extracted from Rogomatic's observer output).
- Add testing harnesses to simulate deterministic seeds and verify Rogomatic wins at expected rates.

## 5. Migration & Rollback Strategy

- We will use `#ifdef ROGOWEB` blocks for all WASM-specific C modifications (e.g., the pipe replacements and asyncify hooks) to ensure the native desktop builds remain 100% intact and functional.
- Avoid making changes to rogue and rogomatic source code unless absolutely necessary because they are legacy code that should be preserved.
