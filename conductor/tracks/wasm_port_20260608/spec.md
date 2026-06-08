# Specification: Phase 3 - Rogomatic WASM Port

## Overview
The goal of this track is to adapt the Rog-O-Matic automated player for execution within a WebAssembly (WASM) environment, running as a Web Worker. This requires removing OS-level process management (`fork`/`exec`) and replacing it with a web-compatible Inter-Process Communication (IPC) architecture. Additionally, we will audit file I/O operations to ensure compatibility with Emscripten's 32-bit compilation target.

## Functional Requirements
- **Process Management Refactoring**: Refactor `setup.c` to remove UNIX-specific `fork()` and `execl()` calls. The WASM entry point will initialize the player logic and enter a state awaiting pipe connections.
- **IPC Architecture**: Prepare the architecture to use `SharedArrayBuffer` and `Atomics` to simulate synchronous UNIX pipes between the Rogue and Rogomatic Web Workers.
- **Legacy Code Preservation**: All modifications to C source code, particularly in `setup.c`, must be wrapped in `#ifdef ROGOWEB` blocks to ensure the original desktop build remains untouched and functional.
- **32-bit / Serialization Audit**: Audit `ltm.c` and `gene.c` for struct alignment and 32-bit dependencies during file I/O. We will rely on Emscripten's `wasm32` target for natural 32-bit behavior, but we must add a serialization test to verify that file I/O boundaries match expectations.

## Acceptance Criteria
- `setup.c` successfully compiles for WASM with `fork` and `execl` logic bypassed via `#ifdef ROGOWEB` macros.
- The `rogomatic` WASM binary can be instantiated in a Web Worker environment without attempting to spawn child processes.
- A test suite or harness is created to verify that file serialization in `ltm.c` and `gene.c` functions correctly within the WASM environment.
- The project still successfully compiles for native UNIX environments (non-WASM).

## Out of Scope
- Full implementation of the JavaScript `SharedArrayBuffer` ring buffer (this track focuses on the C-side preparation and architecture decision).
- Frontend UI modifications.
- Emscripten IDBFS persistence integration.