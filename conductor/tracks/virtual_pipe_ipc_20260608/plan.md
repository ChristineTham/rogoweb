# Implementation Plan: Phase 4 - Virtual Pipe IPC Integration

## Phase 1: JavaScript Ring Buffer Implementation [checkpoint: c2c6660]

- [x] Task: Implement `SharedArrayBuffer` ring buffer in TypeScript. 0481e53
    - [x] Sub-task: Create a TypeScript class/module for a bidirectional ring buffer utilizing a single `SharedArrayBuffer` and `Atomics` for thread-safe operations. 0481e53
    - [x] Sub-task: Write isolated unit tests (using Vitest) to verify ring buffer logic, including read/write boundaries, overflow, and underflow conditions. 0481e53
- [x] Task: Conductor - User Manual Verification 'Phase 1: JavaScript Ring Buffer Implementation' (Protocol in workflow.md) c2c6660

## Phase 2: C-Level Hooks & WASM Export [~]

- [~] Task: Implement WASM pipe hooks in C.
    - [~] Sub-task: Create C source files defining `wasm_pipe_read()` and `wasm_pipe_write()` designed to interface with the JS `SharedArrayBuffer`.
    - [ ] Sub-task: Replace standard `read()` and `write()` calls in Rogue and Rogomatic's IPC logic with these new hooks, wrapped in `#ifdef ROGOWEB`.
    - [ ] Sub-task: Update `Makefile.wasm` for both projects to include the new C files and export the functions via `EXPORTED_FUNCTIONS`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: C-Level Hooks & WASM Export' (Protocol in workflow.md)

## Phase 3: Worker Integration & IPC Testing

- [ ] Task: Connect Workers and perform End-to-End Handshake.
    - [ ] Sub-task: Create a minimal WASM IPC test harness to verify bidirectional communication between two simulated workers.
    - [ ] Sub-task: Update `main.ts` and the worker instantiation scripts to create the shared SAB and pass it to both the Rogue and Rogomatic workers upon startup.
    - [ ] Sub-task: Verify that Rogomatic successfully completes its initial handshake with Rogue via the virtual pipes.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Worker Integration & IPC Testing' (Protocol in workflow.md)