# Specification: Standalone Rogoweb Repository

## Overview

The goal of this track is to consolidate all necessary code and assets from the `rogue` and `rogomatic` directories into the `rogoweb` directory. This will transform `rogoweb` into a standalone repository that can be built and run independently, without relying on files in external sibling directories.

## Functional Requirements

- **Comprehensive Copy:** Copy all files, including source code (.c, .h), build scripts (Makefiles, Autotools configurations), and historical documentation (doc/, AUTHORS, NEWS) from both source directories.
- **Preserve Directory Structure:** Maintain the original directory structures within `rogoweb`. For example, files will be copied into `rogoweb/rogomatic/...` and `rogoweb/rogue/...`.
- **Update Build Configurations:** Modify any Makefiles, Autotools scripts, or other build configurations to reflect the new relative paths within the `rogoweb` standalone repository.
- **Cleanup:** Identify and remove explicitly unused files or historical artifacts that are not required for the WASM build or project documentation, streamlining the new standalone repository.

## Acceptance Criteria

- `rogoweb` contains all necessary source and build files.
- The directory structure of `rogue` and `rogomatic` is preserved inside `rogoweb`.
- Both the Rogue game and Rog-O-Matic player can be successfully configured and compiled from within the `rogoweb` directory using their respective build scripts.
- Unused files have been identified and removed from the newly copied directories.
- The `rogoweb` project builds and runs independently without referencing the original parent `Rogue` directory.

## Out of Scope

- Major refactoring of the C source code logic.
- Implementing new features in the Rogue game or Rog-O-Matic player.
- Changes to the frontend UI/UX in `rogoweb` beyond what is necessary to support the new build paths.
