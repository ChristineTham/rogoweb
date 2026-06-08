# Project Tracks

This file tracks all major tracks for the project. Each track has its own detailed plan in its respective folder.

---

## Archived Tracks

- [x] **Track: Phase 5: File System Persistence. Configure Emscripten's FS.mkdir('/var/games/rogomatic') and FS.mount(IDBFS, ...). Implement a JS hook to call FS.syncfs(false) whenever a game ends or a gene pool is updated.**
  _Link: [./archive/file_system_persistence_20260608/](./archive/file_system_persistence_20260608/)_

- [x] **Track: Phase 4: Virtual Pipe IPC Integration. Implement a SharedArrayBuffer ring buffer in JavaScript. Expose C-level hooks in both WASM modules. Connect Worker streams.**
  _Link: [./archive/virtual_pipe_ipc_20260608/](./archive/virtual_pipe_ipc_20260608/)_

- [x] **Track: Phase 3: Rogomatic WASM Port. Modify rogomatic build to target WASM. Refactor setup.c to remove fork/exec. Audit ltm.c and gene.c for 32-bit dependencies.**
  _Link: [./archive/wasm_port_20260608/](./archive/wasm_port_20260608/)_

- [x] **Track: Copy all relevant files from @rogue/ and @rogomatic/ into @rogoweb/ so that that it is a standalone repo that does not depend on files from the other repos.**
  _Link: [./archive/standalone_rogoweb_20260607/](./archive/standalone_rogoweb_20260607/)_

- [x] **Track: VT100 UI and UX design for rogomatic**
  _Link: [./archive/vt100_final_design_20260607/](./archive/vt100_final_design_20260607/)_

---

- [ ] **Track: Build a React/Vanilla UI with controls to start standalone Rogue and Rogomatic auto-play, display live game statistics, and add testing harnesses to simulate deterministic seeds.**
*Link: [./tracks/frontend_ui_harnesses_20260608/](./tracks/frontend_ui_harnesses_20260608/)*