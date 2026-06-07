# Specification: UI Redesign - VT100 Theme

## Overview
Redesign the Rogue/Rog-O-Matic web interface to closely mimic the physical hardware and aesthetic of a classic DEC VT100 terminal, utilizing Tailwind CSS for responsive layout. The layout centers around a fixed-aspect-ratio terminal screen and adapts based on available viewport space.

## Functional Requirements

### 1. General Layout
- **Fixed Screen:** The entire viewport (`100vh`, `100vw`) must be locked with no scrolling (`overflow: hidden`).
- **Terminal Screen:** The `xterm.js` terminal must maintain a strict `5:3` aspect ratio. It will dynamically stretch to either the maximum available height or maximum available width of the browser window, whichever constraint applies first.

### 2. Top Bar (Hardware Bezel)
- **Responsive Sizing:** The top bar will be a single line on wide displays and wrap to a maximum of 3 lines on narrow displays, managed via Tailwind breakpoints.
- **Content:**
  - **Name of app**: Rogoweb
  - **Logo:** Digital logo image and "VT100" text.
  - **Status Lights:** Four LEDs styled to match the VT100 keyboard indicators. They will map to bot/game activity (e.g., L1: Game active, L2: Rogomatic active, L3: Health status (red, amber, green), L4: Danger warning).
  - **Input:** Username text input box.
  - **Mode Toggle:** Switch between "Manual Play" (Rogue) and "Auto Play" (Rog-O-Matic).
  - **Control Button:** "Start Game".

### 3. Adaptive Statistics Panel
- **Content:** A high-contrast digital readout displaying:
  - **Rogue Stats:** HP, Gold, Level, Strength, Armor (Ac), Experience.
  - **Bot Stats:** Current Rogomatic State (e.g., Exploring, Fighting), Generation/Game Count, gene pool
- **Positioning Logic:**
  - **Height Constrained (Wide Screen):** If the terminal takes up the entire height, and there is horizontal space, the terminal centers (`mx-auto`), OR if space permits, the terminal aligns left and the stats panel is placed on the right.
  - **Width Constrained (Tall Screen):** If the terminal takes up the entire width, and there is significant vertical space remaining at the bottom, the stats panel is placed at the bottom.

## Non-Functional Requirements
- **Theme:** Strict adherence to VT100 colors (e.g., beige/industrial gray for the bezel, pure black `#000000` screen with p4white text). Do not implement phosphor effects or scanlines and if you see in code, remove them.
- **Framework:** Tailwind CSS must be used for all styling and responsive breakpoints.

## Out of Scope
- Modifications to the underlying C codebase or WebAssembly compilation process.
- Changes to the core game logic or terminal escape sequence parsing.