# Track Specification: VT100 UI and UX Design (v6 Final)

## 1. Vision
Deliver a high-fidelity, hardware-accurate DEC VT100 terminal emulation experience. The interface must feel like a physical machine, simulating the boot-up and login process of a 4.2BSD UNIX system on a VAX-11/780, while providing a highly adaptive hardware margin for dashboard controls and branding.

## 2. Visual & Hardware Requirements

### 2.1 The Terminal Monitor (Phosphor Area)
- **Grid**: Strict 80 columns by 24 rows.
- **Font**: **VT323** (monospaced).
- **Renderer**: **Canvas Renderer** (Mandatory). Must ignore browser text shaping to bypass the wide 'f' character bug.
- **Natural Aspect Ratio**: **5:3 (1.666:1)**. This matches the 1:2 character cell ratio of the VT323 font.
- **Bezel**: A 2px dark-grey inset border (`#1a1a1b`) immediately surrounding the black phosphor area.
- **Atmospherics**: **None**. No phosphor glow or scanline overlays are to be implemented.

### 2.2 Adaptive Hardware Layout
The interface must adapt to any viewport size while keeping the **5:3 Monitor** as the "Mathematical Anchor." Hardware areas must use VT100 beige (`#d0ccbc`).

#### Component Constraints (Anti-Bloat)
- **Max Width (Sidebar)**: 400px.
- **Max Height (Bottom Bar)**: 250px.
- **Scaling Behavior**: Once these maximums are reached, the controls remain centered within their beige margin, allowing the margin itself to grow without bloating the industrial components.

#### Scenario A: Wide Viewport (Aspect Ratio > 5:3)
- **Layout**: Terminal is **Flush-Left**.
- **Control Panel**: Becomes a **Sidebar** on the right.
- **Sidebar Scaling**:
  - **Standard (250px - 400px)**: Full "Mechanical Keyboard" layout (recessed blocks, full text labels).
  - **Narrow (100px - 250px)**: Icon-only rail. Labels appear as tooltips.
  - **Extremely Narrow (<100px)**: Sidebar collapses to a 4px "Seam".
- **Branding**: Classic **digital** badge located at the **Top-Right of the Sidebar**.

#### Scenario B: Tall Viewport (Aspect Ratio < 5:3)
- **Layout**: Terminal is **Flush-Top** (below the header).
- **Branding Area**: A beige header section **above** the monitor.
- **Control Panel**: Becomes a **Horizontal Bar** at the bottom.
- **Bottom Bar Scaling**:
  - **Standard (120px - 250px height)**: Full dashboard with recessed panels.
  - **Short (40px - 120px height)**: "Status Strip" mode. Only LEDs and readouts shown.
  - **Extremely Short (<40px)**: Collapses to a 4px "Bezel".
- **Branding**: Classic **digital** badge **centered in the Header**.

#### Scenario C: Perfect Fit (Aspect Ratio == 5:3)
- **Layout**: The monitor fills the **entire viewport**.
- **Hardware Controls**: Automatically hidden.

### 2.3 Hardware Branding (Asset-Based)
To ensure 100% historical accuracy, the branding will use a high-resolution transparent asset.
- **Asset**: `public/assets/dec-logo-blue.png`.
- **Source**: [Wikimedia Commons DEC 1987 Logo](https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Digital_Equipment_Corporation_1987_logo.svg/1280px-Digital_Equipment_Corporation_1987_logo.svg.png).
- **Color**: Digital Blue (`#003DA5`).
- **Badge Styling**: Accompanied by a bold sans-serif "VT100" text badge (Helvetica/Univers style), positioned horizontally and sized to match the logo's height.

## 3. Dynamic Controls & Simulation

### 3.1 Status LEDs & Readouts
- **Indicators**: `WAIT` (Amber), `ON LINE` (Green), `LOCAL` (Amber), `L1`-`L4` (Green).
- **Readouts**: Level, Gold, Score in high-contrast P4 White with black text-shadows.

### 3.2 4.2BSD Login Sequence
Clicking "Connect" initiates an asynchronous text-stream simulation:
1. `4.2 BSD UNIX (ucbvax) (tty01)`
2. `login: [User Name]` (Simulated typing).
3. `Password: ` (1s pause).
4. `Welcome to the UCB VAX-11/780.`
5. `% [rogue|rogomatic]`
6. **WASM Handoff**: Engine takes control only after the sequence ends.

## 4. Technical Implementation Notes
- **Scaling**: Use `min(100vw, 1.666vh)` and `min(100vh, 0.6vw)` for monitor anchoring.
- **Flexibility**: Use `max-width` and `max-height` constraints on recessed blocks to prevent "giant UI" artifacts on 4K+ displays.
