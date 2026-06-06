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
  const waitLed = document.getElementById('led-wait');
  const localLed = document.getElementById('led-local');
  const onlineLed = document.getElementById('led-online');

  if (waitLed) waitLed.classList.add('active');
  if (localLed) localLed.classList.remove('active');

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
  await simulateTyping('rogue', 150);
  xterm.writeln('');
  await sleep(300);

  if (waitLed) waitLed.classList.remove('active');
  if (onlineLed) onlineLed.classList.add('active');

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
  const container = document.getElementById('terminal-viewport');
  if (!container) return;

  const targetW = container.clientWidth;
  const targetH = container.clientHeight;
  
  if (targetW === 0 || targetH === 0) {
    setTimeout(scaleTerminal, 100);
    return;
  }

  // 1. Precise Font Size for Height (2px bezel already handled by container margin)
  const bestFontSize = (targetH / ROWS);
  xterm.options.fontSize = bestFontSize;
  xterm.options.letterSpacing = 0;
  xterm.options.lineHeight = 1.0;
  
  xterm.resize(COLS, ROWS);
  console.log(`VT100 High-Res Lock: Font=${bestFontSize.toFixed(2)}px`);
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
  const onlineLed = document.getElementById('led-online');
  const localLed = document.getElementById('led-local');
  if (onlineLed) onlineLed.classList.remove('active');
  if (localLed) localLed.classList.add('active');

  setTimeout(() => {
    xterm.write('\x1b[?1049l\x1b[H\x1b[2J');
    xterm.writeln(`*** POWER OFF (${status}) ***`);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = 'CONNECT';
    }
  }, 300);
};

const script = document.createElement('script');
script.src = '/wasm/rogue.js';
document.body.appendChild(script);
