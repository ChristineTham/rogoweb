# Implementation Plan: DEC VT100 Visual Redesign

## Phase 1: Structure & Enclosure
- [ ] Task: Update `index.html` to wrap the terminal in a `vt100-enclosure` and `vt100-bezel` div.
- [ ] Task: Recreate the classic DEC digital logo in HTML/CSS and place it in the bezel.
- [ ] Task: Move the control buttons and stats into a new `keyboard-deck` layout below the screen.

## Phase 2: CSS Aesthetic (The CRT & Plastic)
- [ ] Task: Update `style.css` with VT100 colors (beige enclosure, dark grey bezel, green/amber phosphor).
- [ ] Task: Implement CRT screen effects including `border-radius` curvature, deep inner shadows (vignette), and intense CSS-based scanlines.
- [ ] Task: Add text-shadow for authentic phosphor glow and a subtle CSS animation for screen flicker.
- [ ] Task: Style the buttons in the `keyboard-deck` to resemble chunky, mechanical terminal keys with tactile active states.

## Phase 3: Terminal Integration
- [ ] Task: Update `main.ts` to configure `xterm.js` to match the new aesthetic.
- [ ] Task: Disable `xterm.js` canvas rendering (`disableStdin: false, allowTransparency: true`) to ensure CSS text-shadow effects apply to the terminal characters.
- [ ] Task: Set the terminal font to `VT323` (which is a digitized DEC VT320 font, nearly identical to DEC Terminal Modern) and adjust letter-spacing/line-height for authenticity.
