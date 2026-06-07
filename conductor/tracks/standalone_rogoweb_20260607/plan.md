# Implementation Plan: Standalone Rogoweb Repository

## Phase 1: File Consolidation and Cleanup [checkpoint: be06a18]

- [x] Task: Copy `rogomatic` directory into `rogoweb/rogomatic` 08b6fc4
- [x] Task: Copy `rogue` directory into `rogoweb/rogue` 08b6fc4
- [x] Task: Identify and remove unused files/artifacts from `rogoweb/rogue` df17093
- [x] Task: Conductor - User Manual Verification 'Phase 1: File Consolidation and Cleanup' (Protocol in workflow.md) be06a18

## Phase 2: Build Configuration Updates [checkpoint: 65f6f7d]

- [x] Task: Update `rogoweb/rogomatic` build scripts (Makefiles, Autotools) to work in the new location 4184092
- [x] Task: Update `rogoweb/rogue` build scripts (Makefiles, Autotools) to work in the new location fc851ff
- [x] Task: Update `rogoweb/vite.config.ts` or related web build scripts to point to the new internal directories for WASM compilation/assets 9a9b607
- [x] Task: Conductor - User Manual Verification 'Phase 2: Build Configuration Updates' (Protocol in workflow.md) 65f6f7d

## Phase 3: Compilation and Verification

- [x] Task: Compile `rogoweb/rogue` successfully
- [~] Task: Compile `rogoweb/rogomatic` successfully
- [ ] Task: Build the `rogoweb` frontend and verify it correctly serves the compiled WASM binaries
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Compilation and Verification' (Protocol in workflow.md)
