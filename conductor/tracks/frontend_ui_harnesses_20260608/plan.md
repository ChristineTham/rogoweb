# Implementation Plan: Phase 6 - Frontend UI & Harnesses

## Phase 1: Core UI Structure and Styling
- [ ] Task: Create tests for basic VT100 dashboard DOM layout
- [ ] Task: Implement HTML structure for VT100 bezel, terminal container, stats panel, log pane, and controls
- [ ] Task: Apply CSS styling for industrial/retro VT100 aesthetic
- [ ] Task: Conductor - User Manual Verification 'Core UI Structure and Styling' (Protocol in workflow.md)

## Phase 2: Transport Controls (Rogue & Rog-O-Matic)
- [ ] Task: Create tests for transport control event listeners (Start, Stop, Pause)
- [ ] Task: Implement logic in `main.ts` to dispatch start/stop commands to Web Workers
- [ ] Task: Wire up UI buttons to dispatch these commands
- [ ] Task: Conductor - User Manual Verification 'Transport Controls (Rogue & Rog-O-Matic)' (Protocol in workflow.md)

## Phase 3: Telemetry Data Flow (postMessage)
- [ ] Task: Create tests for structured telemetry message handling in main thread
- [ ] Task: Implement `postMessage` emitting logic in Web Workers for game stats and logs
- [ ] Task: Implement message listener in `main.ts` to route stats to UI update functions
- [ ] Task: Conductor - User Manual Verification 'Telemetry Data Flow (postMessage)' (Protocol in workflow.md)

## Phase 4: Live Statistics & Observer Log UI Updates
- [ ] Task: Create tests for DOM update functions (Stats panel and Log pane)
- [ ] Task: Implement logic to update DOM elements in the Stats panel based on received telemetry
- [ ] Task: Implement logic to append entries to the Observer Log pane and handle scrolling
- [ ] Task: Conductor - User Manual Verification 'Live Statistics & Observer Log UI Updates' (Protocol in workflow.md)

## Phase 5: Testing Harness
- [ ] Task: Create tests for seed input and deterministic run initiation
- [ ] Task: Add UI for seed input and "Run Test" controls
- [ ] Task: Implement logic to pass seed value to Web Workers on initialization
- [ ] Task: Conductor - User Manual Verification 'Testing Harness' (Protocol in workflow.md)