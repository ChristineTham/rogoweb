# Specification: Phase 4 - Virtual Pipe IPC Integration

## Overview
The goal of this track is to implement Inter-Process Communication (IPC) between the Rogue and Rogomatic Web Workers using a `SharedArrayBuffer` (SAB). This will replace the UNIX `pipe()` architecture that is unsupported in WASM. The track covers the JavaScript SAB ring buffer implementation, the C-level read/write hooks exposed via WASM, and comprehensive testing to ensure robust communication.

## Functional Requirements
- **JavaScript Ring Buffer**: Implement a high-performance ring buffer using a single `SharedArrayBuffer` and `Atomics` to manage the state and data for bidirectional communication between the two Web Workers.
- **C-Level WASM Hooks**: Implement `wasm_pipe_read()` and `wasm_pipe_write()` functions in C (conditionally compiled via `#ifdef ROGOWEB`). These functions will replace the standard `read(0, ...)` and `write(1, ...)` calls used for inter-process communication in the original source.
- **WASM Export**: Export these C functions using Emscripten's `EXPORTED_FUNCTIONS` so they can interact with the JavaScript-managed SAB.
- **Web Worker Integration**: Connect the Rogue Worker's output stream to the Rogomatic Worker's input stream, and vice versa, through the centralized SAB ring buffer.

## Acceptance Criteria
- A standalone JavaScript/TypeScript test suite successfully verifies the logic and thread-safety of the SAB ring buffer independent of WASM.
- A minimal WASM IPC test (using dummy C modules) successfully demonstrates bidirectional communication between two Web Workers using the SAB and C hooks.
- End-to-end integration is verified: Rogomatic can successfully complete its initial handshake with the Rogue WASM module running in a separate worker.
- All WASM-specific C changes are protected by `#ifdef ROGOWEB` to maintain native build compatibility.

## Out of Scope
- Full game loop automation and UI rendering of the Rogomatic state (this is reserved for Phase 6).
- Emscripten IDBFS persistence integration (Phase 5).