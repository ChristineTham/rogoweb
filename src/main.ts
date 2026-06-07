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
const VIEWPORT_BORDER_PX = 4;
const MAX_FONT_SIZE = 128;
const FONT_SIZE_PRECISION = 0.25;
const RESIZE_SETTLE_MS = 80;

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

const nextFrame = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => resolve());
});

const settleRender = () => new Promise<void>((resolve) => {
  setTimeout(() => resolve(), 32);
});

const getRenderedViewport = () => {
  const canvas = (xterm as any)?._core?._renderService?.dimensions?.css?.canvas;
  if (!canvas?.width || !canvas?.height) return null;

  return {
    width: canvas.width + VIEWPORT_BORDER_PX,
    height: canvas.height + VIEWPORT_BORDER_PX,
  };
};

const quantizeFontSize = (fontSize: number) => {
  return Math.max(
    FONT_SIZE_PRECISION,
    Math.round(fontSize / FONT_SIZE_PRECISION) * FONT_SIZE_PRECISION,
  );
};

const getCurrentTerminalFit = () => {
  const renderedViewport = getRenderedViewport();
  const fontSize = Number(xterm.options.fontSize);

  if (!renderedViewport || !Number.isFinite(fontSize) || fontSize <= 0) {
    return null;
  }

  return {
    fontSize,
    ...renderedViewport,
  };
};

const isScaleRunCurrent = (runId: number) => runId === scaleRunId;

const applyTerminalFontSize = async (fontSize: number, runId: number) => {
  if (!isScaleRunCurrent(runId)) return null;

  xterm.options.fontSize = quantizeFontSize(fontSize);
  xterm.options.letterSpacing = 0;
  xterm.options.lineHeight = 1.0;
  xterm.resize(COLS, ROWS);

  await nextFrame();
  if (!isScaleRunCurrent(runId)) return null;
  await nextFrame();
  if (!isScaleRunCurrent(runId)) return null;
  await settleRender();
  if (!isScaleRunCurrent(runId)) return null;
  await nextFrame();
  if (!isScaleRunCurrent(runId)) return null;

  return getRenderedViewport();
};

const findBestTerminalFit = async (containerW: number, containerH: number, runId: number) => {
  let low = FONT_SIZE_PRECISION;
  let high = MAX_FONT_SIZE;
  let bestFit = {
    fontSize: FONT_SIZE_PRECISION,
    ...(await applyTerminalFontSize(FONT_SIZE_PRECISION, runId) ?? {
      width: VIEWPORT_BORDER_PX,
      height: VIEWPORT_BORDER_PX,
    }),
  };

  while ((high - low) >= FONT_SIZE_PRECISION) {
    if (!isScaleRunCurrent(runId)) return null;

    const fontSize = quantizeFontSize((low + high) / 2);
    const renderedViewport = await applyTerminalFontSize(fontSize, runId);
    if (!renderedViewport) break;

    if (renderedViewport.width <= containerW && renderedViewport.height <= containerH) {
      bestFit = { fontSize, ...renderedViewport };
      low = fontSize + FONT_SIZE_PRECISION;
    } else {
      high = fontSize - FONT_SIZE_PRECISION;
    }
  }

  return bestFit;
};

const refineTerminalFit = async (
  containerW: number,
  containerH: number,
  runId: number,
  startingFontSize: number,
) => {
  let fontSize = quantizeFontSize(startingFontSize);
  let renderedViewport = await applyTerminalFontSize(fontSize, runId);
  if (!renderedViewport) return null;

  while (
    renderedViewport.width > containerW || renderedViewport.height > containerH
  ) {
    const nextFontSize = quantizeFontSize(fontSize - FONT_SIZE_PRECISION);
    if (nextFontSize === fontSize || nextFontSize < FONT_SIZE_PRECISION) {
      break;
    }

    fontSize = nextFontSize;
    renderedViewport = await applyTerminalFontSize(fontSize, runId);
    if (!renderedViewport) return null;
  }

  while (true) {
    const nextFontSize = quantizeFontSize(fontSize + FONT_SIZE_PRECISION);
    if (nextFontSize === fontSize || nextFontSize > MAX_FONT_SIZE) {
      break;
    }

    const nextViewport = await applyTerminalFontSize(nextFontSize, runId);
    if (!nextViewport) return null;

    if (nextViewport.width > containerW || nextViewport.height > containerH) {
      await applyTerminalFontSize(fontSize, runId);
      break;
    }

    fontSize = nextFontSize;
    renderedViewport = nextViewport;
  }

  return {
    fontSize,
    ...renderedViewport,
  };
};

const estimateTerminalFit = async (containerW: number, containerH: number, runId: number) => {
  const currentFit = getCurrentTerminalFit();
  if (!currentFit) {
    return findBestTerminalFit(containerW, containerH, runId);
  }

  const widthScale = containerW / currentFit.width;
  const heightScale = containerH / currentFit.height;
  const estimatedFontSize = currentFit.fontSize * Math.min(widthScale, heightScale);

  return refineTerminalFit(containerW, containerH, runId, estimatedFontSize);
};

const settleBestTerminalFit = async (containerW: number, containerH: number, runId: number) => {
  let bestFit = hasCompletedInitialScale
    ? await estimateTerminalFit(containerW, containerH, runId)
    : await findBestTerminalFit(containerW, containerH, runId);
  if (!bestFit || !isScaleRunCurrent(runId)) return null;

  let renderedViewport = await applyTerminalFontSize(bestFit.fontSize, runId);

  while (
    renderedViewport &&
    (renderedViewport.width > containerW || renderedViewport.height > containerH) &&
    bestFit.fontSize > FONT_SIZE_PRECISION
  ) {
    if (!isScaleRunCurrent(runId)) return null;

    bestFit = {
      ...bestFit,
      fontSize: quantizeFontSize(bestFit.fontSize - FONT_SIZE_PRECISION),
    };
    renderedViewport = await applyTerminalFontSize(bestFit.fontSize, runId);
  }

  if (!isScaleRunCurrent(runId)) return null;

  return renderedViewport
    ? { fontSize: bestFit.fontSize, ...renderedViewport }
    : bestFit;
};

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
  xterm.writeln("UC Berkeley VAX-11/780 (ucbvax)");
  xterm.writeln('');
  await sleep(400);
  xterm.write('% ');
  await sleep(500);
  
  const cmd = isAuto ? 'rogomatic' : 'rogue';
  await simulateTyping(cmd, 150);
  xterm.writeln('');
  await sleep(300);

  if (isAuto && l2) l2.classList.add('active');

  // FOCUS: Bring focus to terminal for immediate play
  xterm.focus();

  // Trigger WASM main
  try {
    const mainPromise = (window as any).Module.ccall('main', 'number', ['number', 'array'], [0, []], { async: true });
    
    mainPromise
      .then((s: number) => handleExit(s))
      .catch((e: any) => {
        if (e && e.name !== 'ExitStatus') {
          console.error("Engine crash:", e);
          handleExit(-1);
        }
      });
  } catch (e: any) {
    if (e && e.name !== 'ExitStatus') {
      console.error("ccall error:", e);
      handleExit(-1);
    }
  }
};

/**
 * Scale the terminal to the largest font size that fits the actual xterm cell metrics.
 */
let scaleRunId = 0;
let hasCompletedInitialScale = false;
let scheduledScaleTimer: number | null = null;

const scaleTerminal = async () => {
  const runId = ++scaleRunId;
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

  const measuredViewport = await settleBestTerminalFit(containerW, containerH, runId);
  if (!measuredViewport) return;
  if (runId !== scaleRunId) return;

  const targetW = measuredViewport.width;
  const targetH = measuredViewport.height;

  // ADAPTIVE LAYOUT LOGIC
  statsPanel.classList.add('hidden');
  mainArea.classList.remove('flex-row', 'flex-col', 'justify-center', 'justify-start', 'items-center', 'gap-4');
  mainArea.style.justifyContent = '';

  const MIN_STATS_W = 140;
  const MIN_STATS_H = 110;

  if (containerW >= targetW + MIN_STATS_W + 5) {
    // WIDE SCREEN: Stats on the right
    mainArea.classList.add('flex-row', 'justify-center', 'items-center', 'gap-2');
    statsPanel.classList.remove('hidden');
    console.log("Layout: WIDE (Stats Right)");
  } else if (containerH >= targetH + MIN_STATS_H + 10) {
    // TALL SCREEN: Stats at the bottom
    mainArea.classList.add('flex-col', 'justify-center', 'items-center', 'gap-2');
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

  if (!hasCompletedInitialScale) {
    viewport.style.visibility = 'visible';
    hasCompletedInitialScale = true;
  }
};

const scheduleScaleTerminal = (delay = RESIZE_SETTLE_MS) => {
  if (scheduledScaleTimer !== null) {
    window.clearTimeout(scheduledScaleTimer);
  }

  scheduledScaleTimer = window.setTimeout(() => {
    scheduledScaleTimer = null;
    void scaleTerminal();
  }, delay);
};

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  xterm.open(terminalElement);
  xterm.writeln('*** POWER OFF (Press START to play) ***');

  // ACTIVATE CANVAS RENDERER
  try {
    const canvasAddon = new CanvasAddon();
    xterm.loadAddon(canvasAddon);
  } catch (e) {
    console.error('Canvas addon fail', e);
  }

  // INPUT BRIDGE: Hook xterm.onData to the global term instance
  xterm.onData((data) => {
    const term = (window as any).term as TerminalShim;
    if (term) {
      for (let i = 0; i < data.length; i++) {
        term.pushInput(data.charCodeAt(i));
      }
      if (term.handler) term.handler();
    }
  });

  document.fonts.ready.then(() => {
    scheduleScaleTerminal(200);
  });
  window.addEventListener('resize', () => {
    scheduleScaleTerminal();
  });
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
    xterm.writeln(`*** POWER OFF (Press START to play) ***`);
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = 'START';
    }
  }, 300);
};

const script = document.createElement('script');
script.src = '/wasm/rogue.js';
document.body.appendChild(script);
