# Implementation Plan: Phase 5 - File System Persistence

## Phase 1: Setup IDBFS and Mount Points [checkpoint: 950267c]
- [x] Task: Configure Emscripten Module for IDBFS [5d7daa2]
    - [x] Add `IDBFS` to the exported settings in the Emscripten build configuration (Makefiles or vite config, if applicable). [5d7daa2]
    - [x] Ensure `FS` object is accessible from the worker scripts (`rogue-worker.ts`, `rogomatic-worker.ts`). [5d7daa2]
- [x] Task: Initialize Directories and Mount IDBFS [5d7daa2]
    - [x] In the worker startup sequence (e.g., `preRun` or `onRuntimeInitialized`), create the required directory structure: `/var/games/rogomatic`. [5d7daa2]
    - [x] Call `FS.mount(IDBFS, {}, '/var/games/rogomatic')`. [5d7daa2]
    - [x] Call `FS.syncfs(true, callback)` to populate the in-memory filesystem from IndexedDB. [5d7daa2]
    - [x] Delay the actual execution of the C `main()` function until the initial `syncfs` completes. [5d7daa2]
- [x] Task: Create Empty Files for Fresh Loads [5d7daa2]
    - [x] After initial `syncfs(true)`, check if critical files (like `GenePool544`, `ltm544`) exist. [5d7daa2]
    - [x] If they don't exist, create them as empty files or with default seed data to prevent crashes. [5d7daa2]
- [~] Task: Conductor - User Manual Verification 'Setup IDBFS and Mount Points' (Protocol in workflow.md)

## Phase 2: Synchronization Triggers and JS Hooks
- [ ] Task: Define JS Hook for Synchronization
    - [ ] Implement a function in the worker scope (or exposed via `Module`) that calls `FS.syncfs(false, callback)`.
- [ ] Task: Instrument C Code for Event-Driven Sync
    - [ ] Identify the points in the C source code where a game ends (e.g., `score()` or death routines) and where the gene pool is saved.
    - [ ] Inject `EM_ASM` calls or exported C-to-JS callbacks to trigger the JS sync hook at these specific points.
    - [ ] Ensure the sync operates asynchronously and doesn't block the WASM execution unnecessarily, or handles the callback properly.
- [ ] Task: Conductor - User Manual Verification 'Synchronization Triggers and JS Hooks' (Protocol in workflow.md)

## Phase 3: Error Handling and Notifications
- [ ] Task: Implement IDBFS Error Catching
    - [ ] Wrap the `FS.mount` and `FS.syncfs` calls in try/catch blocks or check their callback error arguments.
- [ ] Task: Relay Errors to Main Thread
    - [ ] If an error occurs, post a message (`postMessage`) from the worker to the main thread indicating a persistence failure.
- [ ] Task: Display UI Notification
    - [ ] In the main thread, listen for persistence error messages.
    - [ ] Display a non-intrusive UI toast or banner warning the user that their data will not be saved (e.g., due to incognito mode).
- [ ] Task: Conductor - User Manual Verification 'Error Handling and Notifications' (Protocol in workflow.md)
