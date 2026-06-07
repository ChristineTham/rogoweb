# VT100 UI and UX design for rogomatic (v5)

## 1. Architectural Strategy: The "Screen-First" Anchor

The terminal screen (1.6:1 phosphor area) is the absolute master.

- **Mathematical Anchor**: Terminal container sized using `width: min(100vw, 160vh)` and `height: min(100vh, 62.5vw)`.
- **Flush Alignment**:
  - **Wide Displays (>1.6:1)**: Monitor is Flush Left (`left: 0`).
  - **Tall Displays (<=1.6:1)**: Monitor is Flush Top below the logo (`top: <logo_height>`).
- **Hardware Margin & Border**:
  - A subtle margin (no more than 2px) will surround the active phosphor area.
  - This margin will contain a thin, dark-grey inset border to emulate the physical CRT bezel (just a hint of an edge).
- **Hardware Margin Layout**:
  - **Branding**: The classic **digital** logo must be all lowercase, bold, sans-serif (emulating ITC Avant Garde). The **VT100** badge must be all uppercase, medium-to-bold, geometric/industrial sans-serif.
  - **Wide**: Branding at top-right of the screen area; Controls in the right margin.
  - **Tall**: Branding centered at top; Controls in the bottom margin.
- **Strict No-Scroll**: Locked to `100vh`/`100vw` with `overflow: hidden`.

## 2. Integrated Control & Status

The UI supports both manual play and Rog-O-Matic automation, integrated into the login UX.

### A. Pre-Game Controls (Login Configuration)

- **User Name Input**: A sleek, industrial text field to set the UNIX login name.
- **Mode Selector**: Toggle switch or distinct buttons to choose between "Manual Play" (Rogue) and "Auto Play" (Rog-O-Matic).
- **Power/Connect Button**: Initiates the login and boot sequence.

### B. In-Game Controls & Status

- **VT100 Status LEDs**:
  - `WAIT`: Engine loading/processing or simulated typing.
  - `ON LINE`: Connected to VAX/Engine active.
  - `LOCAL`: Terminal in local command mode.
  - `L1`-`L4`: Mapped to bot states (Exploring, Combat, Resting, Danger) during Rog-O-Matic mode.
- **System Display**: High-contrast digital readout for:
  - **Rogue Stats**: Level, Gold, Score.
  - **Bot Stats**: Current state, generation data.

## 3. The 4.2BSD Boot Sequence (UX Flow)

Instead of starting instantly, the terminal will simulate an authentic UNIX login experience:

1. **Ready State**: Terminal displays the classic Berkeley banner:
   `4.2 BSD UNIX (ucbvax) (tty01)`
   `login: `
2. **Initiation**: User clicks 'Connect/Start' on the control panel.
3. **Simulation**:
   - The terminal "types" the configured username.
   - Prompts for `Password:` (simulates secure typing pause).
   - Displays an authentic Message of the Day (MOTD):
     `4.2 BSD UNIX #1: Sun Aug 14 11:15:32 PDT 1983`
     `Welcome to the UCB VAX-11/780.`
   - Presents the C Shell prompt: `% `
   - "Types" the selected command: `rogue` or `rogomatic`.
4. **Handoff**: The WASM engine's `main()` is invoked, seamlessly taking over the terminal screen.

## 4. Font Handling: Predictive Fractional Scaling

- **Font**: **VT323** (Hosted locally in `public/fonts/`).
- **Predictive Scaling Engine**:
  - The algorithm uses known font metrics to calculate:
    1. `fontSize = (containerHeight - bezelMargin) / 24` (Fractional).
    2. `lineHeight = 1.0`.
    3. `letterSpacing = ((containerWidth - bezelMargin) - (calculatedCharWidth * 80)) / 80`.
  - **Outcome**: The 80x24 grid fills the 1.6:1 screen perfectly the moment the page renders or resizes.

## 4. Technical Restoration

- **Input Bridge**: Re-hook `xterm.onData` to the `TerminalShim` input queue. Ensure `window.term` is available for the C engine.
- **Engine Lifecycle**: Implement `Module.onExit` and `ccall` promise handling for clean restarts and terminal resets.

## 5. Implementation Phases [checkpoint: 976b9bf]

### Phase 1: Environment [checkpoint: eb32f4a]

- [x] Task: Download VT323 to `public/fonts/` and setup `@font-face`. [b8e9952]

### Phase 2: Responsive Grid & Layout Architecture

- [x] Task: Setup the dynamic grid (Flush-Left / Vertical-Stack) with strict 5:3 natural anchor. [9ab4d18]
- [x] Task: Implement authentic **digital** and **VT100** branding (Dual-font system). [976b9bf]
- [x] Task: Coordinate branding positioning: Sidebar (Wide) vs. Centered Header (Tall). [976b9bf]
- [x] Task: Fix the monitor unit border to exactly 2px with inset bezel styling (`#1a1a1b`). [c7af350]

### Phase 3: Hardware Control Panel

- [x] Task: Build the beige industrial-style sidebar/bottom-bar with recessed blocks. [3f16214]
- [x] Task: Wire high-contrast P4 White stat readouts and status LEDs (WAIT, ONLINE, LOCAL, L1-L4). [3f16214]

### Phase 4: Rendering & Scaling Engine [checkpoint: dc112c2]

- [x] Task: Implement the natural 5:3 scaling algorithm in `main.ts`. [9ab4d18]
- [x] Task: Force-load the **Canvas Renderer** addon to bypass VT323 'f' character width glitches. [3c9e2fa]
- [x] Task: Re-enable CRT phosphor glow and scanline effects on the canvas. [269a120]

### Phase 5: The 4.2BSD UX Simulation

- [x] Task: Implement `TerminalSimulator` class for human-like asynchronous typing. [976b9bf]
- [x] Task: Script the login flow: ucbvax banner -> username typing -> Password pause -> MOTD. [976b9bf]
- [x] Task: Restore the C/JS input bridge and engine lifecycle hooks. [f112106]
- [x] Task: Final polish: Ensure zero scroll, hidden cursors where appropriate, and clean restarts. [976b9bf]

### Phase 6: User-Specified Refinements

- [x] Task: Process and implement user requested changes
- [x] Task: Conductor - User Manual Verification 'Phase 6: User-Specified Refinements' (Protocol in workflow.md)
