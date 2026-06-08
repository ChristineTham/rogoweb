# Specification: Phase 5 - File System Persistence

## Overview
This track implements client-side file system persistence for Rogomatic and Rogue using Emscripten's IndexedDB File System (IDBFS). This allows historical data and save states to persist across browser reloads.

## Functional Requirements
- **Directory Setup:** The application must create the `/var/games/rogomatic` directory (and any other required directories) within the Emscripten virtual file system on startup.
- **IDBFS Mounting:** Mount the `IDBFS` file system to the created directories before the WASM modules begin execution.
- **Data Persistence:** The following data must be persisted:
  - Gene Pools
  - Score Files
  - Long Term Memory (ltm)
  - Save Games
- **Initial Load Handling:** On a fresh load where no data exists, the system must automatically create the necessary empty files (or default configurations) to prevent Rogomatic from crashing due to missing files.
- **Synchronization Trigger:** Implement a JavaScript hook to call `FS.syncfs(false)` to synchronize the in-memory file system with IndexedDB. This sync should be **event-driven**, occurring specifically when a game ends or when a gene pool is updated.
- **Error Handling:** If IDBFS fails to mount or sync (e.g., due to strict privacy settings or quota limits), the game should not crash. Instead, it should display a non-intrusive UI notification to the user indicating that progress cannot be saved.

## Non-Functional Requirements
- **Performance:** Synchronization (`syncfs`) should not cause noticeable stuttering or lockups in the main thread UI.
- **Robustness:** The application should gracefully handle corrupted or incompatible IDBFS states by clearing them and starting fresh if necessary.

## Acceptance Criteria
- [ ] Refreshing the browser after a completed game retains the updated gene pool.
- [ ] High scores are visible across browser sessions.
- [ ] Attempting to run in incognito mode (where IndexedDB might be restricted) shows a warning notification but allows gameplay.
- [ ] Initializing the app on a new machine successfully bootstraps the file system without C-level segmentation faults or file-not-found aborts.

## Out of Scope
- Cloud synchronization (e.g., Supabase backend integration).
- Manual file import/export UI (to be handled in a separate UI track).
