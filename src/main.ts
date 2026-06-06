import './style.css';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { TerminalShim, TermGlobals } from './terminal-shim';

/* =========================================
   VT100 TECHNICAL CONSTANTS
========================================= */
const COLS = 80;
const ROWS = 24;

const xterm = new XTerm({
  cursorBlink: true,
  cols: COLS,
  rows: ROWS,
  allowTransparency: true,
  theme: {
    background: 'transparent',
    foreground: '#ebf0ff', // P4 White
    cursor: '#ebf0ff',
  },
  fontFamily: '"VT323", monospace',
  fontSize: 20, // Baseline
  letterSpacing: 0,
  lineHeight: 1.0,
});

(window as any).xtermInstance = xterm;
(window as any).Terminal = TerminalShim;
(window as any).TermGlobals = TermGlobals;

const updateLEDs = (running: boolean) => {
  const waitLeds = [document.getElementById('led-wait'), document.getElementById('led-wait-h')];
  const onlineLeds = [document.getElementById('led-online'), document.getElementById('led-online-h')];
  const localLed = document.getElementById('led-local');
  
  waitLeds.forEach(led => {
    if (led) led.className = `led amber ${!running ? 'active' : ''}`;
  });
  onlineLeds.forEach(led => {
    if (led) led.className = `led green ${running ? 'active' : ''}`;
  });
  if (localLed) localLed.className = `led amber ${!running ? 'active' : ''}`;
};

const updateBotLEDs = (state: string) => {
  const l1 = document.getElementById('led-l1');
  const l2 = document.getElementById('led-l2');
  const l3 = document.getElementById('led-l3');
  const l4 = document.getElementById('led-l4');
  
  if (l1) l1.className = `led green ${state === 'exploring' ? 'active' : ''}`;
  if (l2) l2.className = `led green ${state === 'combat' ? 'active' : ''}`;
  if (l3) l3.className = `led green ${state === 'resting' ? 'active' : ''}`;
  if (l4) l4.className = `led green ${state === 'danger' ? 'active' : ''}`;
};

const fitAddon = new FitAddon();
xterm.loadAddon(fitAddon);

let engineRunning = false;
const startBtn = document.getElementById('btn-start') as HTMLButtonElement;
const startBtnH = document.getElementById('btn-start-h') as HTMLButtonElement;

/**
 * HIGH-PRECISION FRACTIONAL FONT SCALING
 * Fills the 1.6:1 anchor exactly.
 */
const scaleTerminal = () => {
  const container = document.getElementById('terminal-container');
  if (!container) return;

  const targetW = container.clientWidth;
  const targetH = container.clientHeight;
  
  if (targetW === 0 || targetH === 0) {
    setTimeout(scaleTerminal, 100);
    return;
  }

  // 1. Precise Font Size for Height
  // We subtract a tiny buffer (0.1px) to prevent vertical overflow/cropping
  const bestFontSize = (targetH / ROWS) - 0.1;
  xterm.options.fontSize = bestFontSize;
  xterm.options.lineHeight = 1.0;
  
  // 2. Measure resulting width with fractional precision
  const core = (xterm as any)._core;
  const dims = core._renderService.dimensions;
  
  if (!dims || !dims.actualCellWidth) {
    setTimeout(scaleTerminal, 50);
    return;
  }

  // 3. Precise Letter Spacing for Width
  const targetCellW = targetW / COLS;
  const spacing = targetCellW - dims.actualCellWidth;
  
  xterm.options.letterSpacing = spacing;
  
  fitAddon.fit();
  console.log(`VT100 High-Res Lock: Font=${bestFontSize.toFixed(2)}px, Spacing=${spacing.toFixed(2)}px`);
};

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  xterm.open(terminalElement);
  
  // Ensure font is ready for measurement
  document.fonts.ready.then(() => {
    console.log('Fonts ready, starting scaler');
    setTimeout(scaleTerminal, 200);
  });
  
  window.addEventListener('resize', scaleTerminal);

  // KEYBOARD INPUT BRIDGE
  xterm.onData((data) => {
    const shim = (window as any).term;
    if (shim && engineRunning) {
      for (let i = 0; i < data.length; i++) {
        shim.pushInput(data.charCodeAt(i));
      }
    }
  });
}

// Emscripten Configuration
(window as any).Module = {
  preRun: [() => {
    (window as any).ENV = (window as any).ENV || {};
    (window as any).ENV.PDC_LINES = '24';
    (window as any).ENV.PDC_COLS = '80';
  }],
  noInitialRun: true,
  onRuntimeInitialized: () => {
    const initEngine = () => {
      if (engineRunning) return;
      
      const userName = (document.getElementById('unix-name') as HTMLInputElement)?.value || 'rogue';
      const isAuto = (document.getElementById('mode-auto') as HTMLInputElement)?.checked;
      
      engineRunning = true;
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.innerText = 'CONNECTED';
      }
      if (startBtnH) {
        startBtnH.disabled = true;
        startBtnH.innerText = 'RUNNING';
      }
      
      xterm.reset();
      xterm.writeln('\x1b[1;37m*** VT100 POWER ON : P4 ACTIVE ***\x1b[0m');
      xterm.writeln(`\x1b[1;32m4.2 BSD UNIX (ucbvax) (tty01)\x1b[0m`);
      xterm.writeln(`\x1b[1;37mlogin: ${userName}\x1b[0m`);
      
      updateLEDs(true);
      xterm.focus(); // Capture keyboard focus
      
      const cmd = isAuto ? 'rogomatic' : 'rogue';
      xterm.writeln(`\x1b[1;37m% ${cmd}\x1b[0m`);

      try {
        (window as any).Module.ccall('main', 'number', ['number', 'array'], [0, []], { async: true });
      } catch (e: any) {
        if (e && e.name !== 'ExitStatus') handleExit(-1);
      }
    };

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.onclick = initEngine;
    }
    if (startBtnH) {
      startBtnH.disabled = false;
      startBtnH.onclick = initEngine;
    }
  },
  locateFile: (p: string) => p.endsWith('.wasm') ? '/wasm/' + p : p,
  onExit: (s: number) => handleExit(s),
  quit: (s: number) => handleExit(s),
  _my_exit: (s: number) => handleExit(s)
};

const handleExit = (status: number) => {
  engineRunning = false;
  updateLEDs(false);
  const shim = (window as any).term;
  if (shim && shim.close) shim.close();
  setTimeout(() => {
    xterm.write('\x1b[?1049l\x1b[H\x1b[2J');
    xterm.writeln(`\x1b[1;31m*** POWER OFF (${status}) ***\x1b[0m`);
    xterm.writeln('\x1b[1;32mREADY\x1b[0m');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = 'CONNECT';
    }
    if (startBtnH) {
      startBtnH.disabled = false;
      startBtnH.innerText = 'START ENGINE';
    }
  }, 300);
};

const script = document.createElement('script');
script.src = '/wasm/rogue.js';
document.body.appendChild(script);
