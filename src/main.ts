import './style.css';
import { Terminal as XTerm } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import '@xterm/xterm/css/xterm.css';
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
  fontFamily: 'VT323, monospace',
  fontSize: 20, // Baseline
  letterSpacing: 0,
  lineHeight: 1.0,
});

(window as any).xtermInstance = xterm;
(window as any).Terminal = TerminalShim;
(window as any).TermGlobals = TermGlobals;

/**
 * ASYNCHRONOUS LOGIN SIMULATION
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const simulateTyping = async (text: string, speed = 100) => {
  for (const char of text) {
    xterm.write(char);
    await sleep(speed + Math.random() * 50);
  }
};

const runLoginSequence = async (userName: string) => {
  const l1 = document.getElementById('led-l1'); // Game Active
  const l2 = document.getElementById('led-l2'); // Rogomatic Active
  const l3 = document.getElementById('led-l3'); // Status (Green/Amber/Red)
  const l4 = document.getElementById('led-l4'); // Danger
  const modeToggle = document.getElementById('mode-toggle') as HTMLInputElement;
  const isAuto = modeToggle?.checked;

  if (l1) l1.classList.add('active');
  if (l3) l3.classList.add('active'); // Start with green health

  xterm.reset();
  xterm.writeln('4.2 BSD UNIX (ucbvax) (tty01)');
  await sleep(500);
  xterm.write('login: ');
  await sleep(800);
  await simulateTyping(userName);
  xterm.writeln('');
  
  await sleep(400);
  xterm.write('Password: ');
  await sleep(1200); // Simulate typing
  xterm.writeln('');
  
  await sleep(600);
  xterm.writeln('');
  xterm.writeln('4.2 BSD UNIX #1: Sun Aug 14 11:15:32 PDT 1983');
  xterm.writeln('Welcome to the UCB VAX-11/780.');
  xterm.writeln('');
  await sleep(400);
  xterm.write('% ');
  await sleep(500);
  
  const cmd = isAuto ? 'rogomatic' : 'rogue';
  await simulateTyping(cmd, 150);
  xterm.writeln('');
  await sleep(300);

  if (isAuto && l2) l2.classList.add('active');

  // Trigger WASM main
  try {
    (window as any).Module.ccall('main', 'number', ['number', 'array'], [0, []], { async: true })
      .then((s: number) => handleExit(s))
      .catch((e: any) => {
        if (e && e.name !== 'ExitStatus') handleExit(-1);
      });
  } catch (e: any) {
    if (e && e.name !== 'ExitStatus') handleExit(-1);
  }
};

/**
 * HIGH-PRECISION NATURAL SCALING (5:3 ASPECT RATIO)
 */
const scaleTerminal = () => {
  const mainArea = document.getElementById('main-container');
  const viewport = document.getElementById('terminal-viewport');
  const statsPanel = document.getElementById('stats-panel');
  if (!mainArea || !viewport || !statsPanel) return;

  const containerW = mainArea.clientWidth;
  const containerH = mainArea.clientHeight;

  if (containerW === 0 || containerH === 0) {
    setTimeout(scaleTerminal, 100);
    return;
  }

  const RATIO = 5 / 3;
  let targetW, targetH;

  // Initial calculation without stats
  if (containerH * RATIO <= containerW) {
    // Height constrained
    targetH = containerH;
    targetW = containerH * RATIO;
  } else {
    // Width constrained
    targetW = containerW;
    targetH = containerW / RATIO;
  }

  // ADAPTIVE LAYOUT LOGIC
  statsPanel.classList.add('hidden');
  mainArea.classList.remove('flex-row', 'flex-col', 'justify-center', 'justify-start');

  const MIN_STATS_W = 180;
  const MIN_STATS_H = 120;

  if (containerW >= targetW + MIN_STATS_W + 20) {
    // WIDE SCREEN: Stats on the right
    mainArea.classList.add('flex-row', 'justify-start', 'items-center');
    statsPanel.classList.remove('hidden');
    console.log("Layout: WIDE (Stats Right)");
  } else if (containerH >= targetH + MIN_STATS_H + 20) {
    // TALL SCREEN: Stats at the bottom
    mainArea.classList.add('flex-col', 'justify-start', 'items-center');
    statsPanel.classList.remove('hidden');
    console.log("Layout: TALL (Stats Bottom)");
  } else {
    // COMPACT: Center terminal, hide stats
    mainArea.classList.add('flex-col', 'justify-center', 'items-center');
    console.log("Layout: COMPACT (Stats Hidden)");
  }

  // Update Viewport Dimensions
  viewport.style.width = `${targetW}px`;
  viewport.style.height = `${targetH}px`;

  // 1. Precise Font Size for Height
  const bestFontSize = (targetH / ROWS);
  xterm.options.fontSize = bestFontSize;
  xterm.options.letterSpacing = 0;
  xterm.options.lineHeight = 1.0;

  xterm.resize(COLS, ROWS);
};

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  xterm.open(terminalElement);

  // ACTIVATE CANVAS RENDERER
  try {
    const canvasAddon = new CanvasAddon();
    xterm.loadAddon(canvasAddon);
  } catch (e) {
    console.error('Canvas addon fail', e);
  }

  document.fonts.ready.then(() => {
    setTimeout(scaleTerminal, 200);
  });
  window.addEventListener('resize', scaleTerminal);
}

const startBtn = document.getElementById('btn-start') as HTMLButtonElement;

// Emscripten Configuration
(window as any).Module = {
  noInitialRun: true,
  onRuntimeInitialized: () => {
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.onclick = () => {
        const userName = (document.getElementById('unix-name') as HTMLInputElement)?.value || 'rogue';
        startBtn.disabled = true;
        startBtn.innerText = 'ONLINE';
        runLoginSequence(userName);
      };
    }
  },
  locateFile: (p: string) => p.endsWith('.wasm') ? '/wasm/' + p : p,
  onExit: (s: number) => handleExit(s),
};

const handleExit = (status: number) => {
  const leds = ['led-l1', 'led-l2', 'led-l3', 'led-l4'];
  leds.forEach(id => document.getElementById(id)?.classList.remove('active'));

  setTimeout(() => {
    xterm.write('\x1b[?1049l\x1b[H\x1b[2J');
    xterm.writeln(`*** POWER OFF (${status}) ***`);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = 'START';
    }
  }, 300);
};

const script = document.createElement('script');
script.src = '/wasm/rogue.js';
document.body.appendChild(script);
