# Specification: Phase 6 - Frontend UI & Harnesses

## Overview
This track implements Phase 6 of the Rogoweb plan. It focuses on enhancing the existing Vanilla TypeScript/Vite frontend to include a comprehensive VT100-style dashboard. The dashboard will control the execution of Standalone Rogue and Rog-O-Matic, display live telemetry, and provide a testing harness for deterministic runs.

## Functional Requirements
1. **Frontend Architecture:**
   - Enhance the existing Vanilla TypeScript/HTML/Tailwind structure.
   - Build upon the current DOM manipulation patterns.
2. **Transport Controls:**
   - Implement UI buttons to start, stop, and pause/resume Standalone Rogue.
   - Implement UI buttons to start, stop, and pause/resume Rog-O-Matic Auto-Play.
3. **Live Statistics Panel:**
   - Create a dashboard area surrounding the `xterm.js` terminal to display real-time game metrics (e.g., Level, Gold, HP, Status).
4. **Observer Log Pane:**
   - Implement a dedicated text area/pane to display Rog-O-Matic's internal thought processes, debug logs, and observer output.
5. **Testing Harness UI:**
   - Provide input fields for setting deterministic random seeds.
   - Implement controls to initiate batch test executions to verify win rates or specific scenarios.
6. **Data Flow (Telemetry):**
   - The Web Workers must transmit structured statistical and log data to the main thread via asynchronous `postMessage` events.
   - The main thread will listen for these events and update the DOM accordingly.

## Non-Functional Requirements
- **Performance:** UI updates from `postMessage` events should not block or stutter the main terminal rendering.
- **Styling:** The UI must adhere to the "VT100 Hardware Interface" aesthetic described in the Product Guidelines (industrial-style bezel, retro styling).

## Acceptance Criteria
- [ ] User can start and stop both Rogue and Rog-O-Matic from the UI.
- [ ] Live stats (HP, Gold, Level) update in real-time without flickering.
- [ ] Rog-O-Matic's internal logs are visible in a separate pane.
- [ ] A deterministic seed can be entered, and a run can be initiated resulting in consistent behavior.
- [ ] All data transmission for stats and logs utilizes `postMessage`.

## Out of Scope
- Backend integrations or leaderboards.
- Rewriting the frontend in a new framework.