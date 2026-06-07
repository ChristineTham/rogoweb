# Implementation Plan: UI Redesign - VT100 Theme

## Phase 1: Environment & Theme Setup [checkpoint: a8096ed]
- [x] Task: Configure Tailwind CSS for VT100 theme.
    - [x] Sub-task: Define custom color palette (industrial bezel colors, pure black background, phosphor text colors).
    - [x] Sub-task: Ensure VT100-style fonts (e.g., VT323) are loaded and applied globally.
- [x] Task: Enforce fixed screen constraint (`100vh`, `100vw`, `overflow: hidden`) on the main application container.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Environment & Theme Setup' (Protocol in workflow.md)

## Phase 2: VT100 Shell & Responsive Top Bar [checkpoint: d13b5bb]
- [x] Task: Implement the Top Bar HTML structure.
    - [x] Sub-task: Write tests for Top Bar rendering and component presence.
    - [x] Sub-task: Implement App Title (name of app: Rogoweb).
    - [x] Sub-task: Implement Logo section (digital image + "VT100" text).
    - [x] Sub-task: Implement Username input field, Mode Toggle (Manual/Rogomatic), and Start Game button.
    - [x] Sub-task: Implement the 4 status lights (L1, L2, L3, L4).
- [x] Task: Apply responsive styling to the Top Bar.
    - [x] Sub-task: Use Tailwind breakpoints to ensure it occupies 1 line on wide displays and up to 3 lines on narrow displays.
- [x] Task: Conductor - User Manual Verification 'Phase 2: VT100 Shell & Responsive Top Bar' (Protocol in workflow.md)

## Phase 3: Adaptive Terminal Scaling [checkpoint: a6c36a7]
- [x] Task: Implement dynamic terminal sizing logic.
    - [x] Sub-task: Write tests to verify the `5:3` aspect ratio calculation.
    - [x] Sub-task: Update `xterm.js` initialization and resize handlers to stretch to max available height or width while strictly maintaining the `5:3` ratio.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Adaptive Terminal Scaling' (Protocol in workflow.md)

## Phase 4: Adaptive Statistics Panel [checkpoint: d05c692]
- [x] Task: Implement the Statistics Panel UI component.
    - [x] Sub-task: Write tests for the panel's data display.
    - [x] Sub-task: Create readouts for Rogue stats (HP, Gold, Level, Strength, Armor, Exp).
    - [x] Sub-task: Create readouts for Rog-O-Matic bot stats.
- [x] Task: Implement adaptive layout logic for the terminal and stats panel.
    - [x] Sub-task: Write tests for layout positioning based on container dimensions.
    - [x] Sub-task: Apply CSS/logic so that if height-constrained, the terminal centers (`mx-auto`) OR aligns left with stats on the right.
    - [x] Sub-task: Apply CSS/logic so that if width-constrained, the stats panel is placed at the bottom.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Adaptive Statistics Panel' (Protocol in workflow.md)