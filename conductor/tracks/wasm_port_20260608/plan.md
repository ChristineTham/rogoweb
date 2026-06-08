# Implementation Plan: Phase 3 - Rogomatic WASM Port

## Phase 1: Serialization Audit & Testing [checkpoint: bd9e99e]

- [x] Task: Create a C test harness to verify file serialization for `ltm.c` and `gene.c`. 3462b94
    - [x] Sub-task: Write tests that simulate writing and reading dummy `ltm` and `gene` data structures, verifying byte boundaries and 32-bit alignment in the WASM environment. 3462b94
    - [x] Sub-task: Execute tests via Emscripten/Node.js to confirm file I/O works as expected on the `wasm32` target. 3462b94
    - [x] Sub-task: Make any necessary adjustments (via `#ifdef ROGOWEB`) to struct packing or I/O functions if tests reveal alignment issues. 3462b94
- [x] Task: Conductor - User Manual Verification 'Phase 1: Serialization Audit & Testing' (Protocol in workflow.md) bd9e99e

## Phase 2: Refactoring `setup.c` for WASM [~]

- [x] Task: Refactor `setup.c` to bypass OS-level process management. 76f13ca
    - [x] Sub-task: Identify all instances of `fork()`, `execl()`, and related UNIX pipe creation in `setup.c`. 76f13ca
    - [x] Sub-task: Wrap identified code blocks with `#ifndef ROGOWEB` to exclude them from the WASM build. 76f13ca
    - [x] Sub-task: Add `#ifdef ROGOWEB` blocks to define the new WASM entry point behavior (initializing player state and preparing for virtual pipe connections). 76f13ca
- [x] Task: Verify compilation for both target environments. 76f13ca
    - [x] Sub-task: Compile `rogomatic` using `make -f Makefile.wasm` (which should define `ROGOWEB`) and ensure it builds successfully without undefined references to `fork`/`execl`. 76f13ca
    - [x] Sub-task: Verify standard desktop compilation is unaffected. 76f13ca
- [~] Task: Conductor - User Manual Verification 'Phase 2: Refactoring setup.c for WASM' (Protocol in workflow.md)