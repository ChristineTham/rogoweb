# Rogoweb UI Design System: VT100 & Tailwind v4

This document defines the user interface design language, color tokens, typography, and styling components implemented in **Rogoweb**, using modern **Tailwind CSS v4** utilities to emulate the retro-industrial aesthetic of the classic **Digital Equipment Corporation (DEC) VT100 terminal** (introduced in 1978).

---

## 💾 The Aesthetic: DEC VT100 Retro-Industrialism

The physical design of the VT100 console, paired with its monochrome CRT phosphor display, serves as the core inspiration for the Rogoweb dashboard. The UI is built to feel like an operator console monitor in a 1980s computer laboratory.

Key elements of this aesthetic include:
- **Office Putty/Beige Chassis:** Utilitarian, textured, warm grey/tan housing.
- **High-Contrast Dark Bezel:** CRT frames and keycaps colored deep charcoal-black.
- **P4 Phosphor Glow:** Soft white-cyan luminescence representing standard VT100 monochrome output (rather than the green/amber of other eras).
- **Physical LED Indicators:** Discrete mechanical keyboard lamps representing operational states.
- **Tactile Keypresses:** Sculpted keycaps and mechanical feedback simulated through inset styling and active press offsets.

---

## 🎨 Design Tokens & Theme Definition

The Tailwind v4 theme is configured in [src/style.css](file:///Users/christie/Repositories/Rogue/rogoweb/src/style.css) using CSS custom properties:

```css
@theme {
  --font-term: 'VT323', monospace;
  --color-vt-beige: #d0ccbc;
  --color-vt-beige-dark: #b0aca0;
  --color-vt-black: #111112;
  --color-p4-white: #ebf0ff;
  --color-dec-blue: #003da5;
  --color-vt-led-red: #ff0000;
  --color-vt-led-amber: #ffaa00;
  --color-vt-led-green: #33ff33;

  /* Shadows (Bevels, Depressions, Glows) */
  --shadow-vt-button: 2px 2px 0 rgba(0, 0, 0, 0.5), inset 1px 1px 0 rgba(255, 255, 255, 0.2);
  --shadow-vt-bevel-inset: inset 1px 1px 2px rgba(255, 255, 255, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-vt-sunken: inset 0 2px 4px rgba(0, 0, 0, 0.5);
  --shadow-vt-panel-inner: inset 1px 1px 3px rgba(0, 0, 0, 0.2), 1px 1px 0 rgba(255, 255, 255, 0.5);
  --shadow-vt-dialog: 8px 8px 0 rgba(0, 0, 0, 0.5), inset 2px 2px 0 rgba(255, 255, 255, 0.4);
  --shadow-vt-led-active-green: 0 0 12px var(--color-vt-led-green), inset 0 1px 2px rgba(255, 255, 255, 0.5);
  --shadow-vt-led-active-amber: 0 0 12px var(--color-vt-led-amber), inset 0 1px 2px rgba(255, 255, 255, 0.5);
  --shadow-vt-led-active-red: 0 0 12px var(--color-vt-led-red), inset 0 1px 2px rgba(255, 255, 255, 0.5);

  /* Radius (Retro sharp styling) */
  --radius-vt-sharp: 2px;
  --radius-vt-panel: 6px;
  --radius-vt-pill: 9999px;
}
```

### 1. Palette Specifications

| Name | Hex Code | Purpose |
|:---|:---|:---|
| `vt-beige` | `#d0ccbc` | Primary chassis color (DEC "putty" / warm office beige). |
| `vt-beige-dark` | `#b0aca0` | Shading and textures for recessed panels. |
| `vt-black` | `#111112` | High-contrast bezels, dark background text, and keycap base. |
| `p4-white` | `#ebf0ff` | Luminescent P4 white phosphor output. |
| `dec-blue` | `#003da5` | Corporate brand accents, reminiscent of the DEC company logo. |
| `vt-led-red` | `#ff0000` | Critical alarms, blocked states, and red keycap buttons. |
| `vt-led-amber` | `#ffaa00` | Warning lights and system initialization status. |
| `vt-led-green` | `#33ff33` | Online, running, and successful status lights. |

### 2. Visual Style Tokens (Shadows & Bevels)

- `shadow-vt-button`: Highlights and drop-shadows on keycaps to simulate a raised 3D switch.
- `shadow-vt-bevel-inset`: The classic DEC cabinet indent profile.
- `shadow-vt-sunken`: Inner depth shadow for input fields and screen readouts.
- `shadow-vt-panel-inner`: Inner depth styling for the console monitor deck.
- `shadow-vt-dialog`: Heavy solid-color offset shadows for dialog boxes and overlays.
- `shadow-vt-led-active-*`: Luminous neon glow for the active LED lights on the operator panel.

### 3. Structural Boundary Tokens (Radii)

- `rounded-vt-sharp`: Used on dialogs, readouts, and console borders to preserve a sharp boxy 1978 design.
- `rounded-vt-panel`: Subtle corner rounding for the operator panels.
- `rounded-vt-pill`: Perfect circles for the circular indicator lamps.

---

## 🔤 Typography & Size Scales

The primary typeface is **VT323**, a high-fidelity monospace raster pixel font that replicates standard 80x24 character terminal cells.

- **Global Font Family:** Inherited on the body via `--font-term`.
- **Text Rendering:** Optimized for screen readability at various sizes with minimal anti-aliasing to preserve the pixel grid feel.
- **Character Attributes:** Emulates double-width and double-height attributes typical of the VT100 text controller.
- **Font Size Standard:** The project avoids arbitrary pixel sizes (e.g. `text-[13px]`). Instead, it standardizes on Tailwind defaults:
  - `text-xs` (12px, ~9pt) - Used for compact overlays and sub-labels.
  - `text-sm` (14px, ~10.5pt) - The standard readable layout size for primary labels, buttons, and status panels (minimum 10pt target).
  - `text-base` (16px, ~12pt) - Used for titles and prominent headings.

---

## 🏗️ Industrial Components

### 1. Tactile Buttons (`.btn-industrial`)
Simulates the physical "Hi-Tek" mechanical keyboard switches of the VT100 terminal.
- **Borders & Shadows:** Double borders (`border-2 border-black/60`) and the `shadow-vt-button` token.
- **Interactive State:** Undergoes a physical depression on click using `@apply active:shadow-none active:translate-x-0.5 active:translate-y-0.5`.

### 2. Panel Blocks (`.panel-block`)
Represents the structural steel/plastic recessments of terminal casings.
- Styled with `bg-vt-beige-dark`, `rounded-vt-sharp`, and `shadow-vt-bevel-inset`.

### 3. Unified Monitor Panel
Consolidates real-time information streams.
- **Progress Bars:** Representing health (HP). Styled as a sunken track (`bg-black/30 rounded border border-black/10`) with a dynamically colored fill (`bg-red-600` / `bg-amber-500` / `bg-green-600`) depending on relative health fullness, and a text label centered over the track.
- **Compact Stats Grid:** Single-line flex layout presenting Strength, Gold, Level, Experience, Generation, and Turns with fully spelled-out text labels for maximum legibility.

### 4. Status LEDs (`#led-l1` to `#led-l3`)
Represents the keyboard indicator lights of the VT100 console.
- Defined as circular indicator dots with `rounded-vt-pill` and `shadow-vt-sunken` when inactive.
- Active states apply glow filters: `shadow-vt-led-active-*` to mimic light-emitting diodes under room lighting.
- Red, Amber, and Green indicators signal game active status, Rog-O-Matic automation active, and health/exit safety status.
