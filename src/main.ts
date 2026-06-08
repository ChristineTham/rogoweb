import './style.css';
import { Terminal as XTerm } from '@xterm/xterm';
import { CanvasAddon } from '@xterm/addon-canvas';
import '@xterm/xterm/css/xterm.css';
import { TerminalShim, TermGlobals } from './terminal-shim';
import { SharedIPC } from './ipc/ring-buffer';

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

const startBtn = document.getElementById('btn-start') as HTMLButtonElement;

(window as any).xtermInstance = xterm;
(window as any).Terminal = TerminalShim;
(window as any).TermGlobals = TermGlobals;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const settleRender = () =>
  new Promise<void>((resolve) => {
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
    ...((await applyTerminalFontSize(FONT_SIZE_PRECISION, runId)) ?? {
      width: VIEWPORT_BORDER_PX,
      height: VIEWPORT_BORDER_PX,
    }),
  };

  while (high - low >= FONT_SIZE_PRECISION) {
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

  while (renderedViewport.width > containerW || renderedViewport.height > containerH) {
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

  return renderedViewport ? { fontSize: bestFit.fontSize, ...renderedViewport } : bestFit;
};

/**
 * ASYNCHRONOUS LOGIN SIMULATION
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  xterm.writeln('UC Berkeley VAX-11/780 (ucbvax)');
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

  if (isAuto) {
    // DUAL WORKER MODE (Phase 4)
    console.log('Starting Dual Worker IPC Mode...');
    const sab = SharedIPC.createSAB();
    
    const rogueWorker = new Worker(new URL('./rogue-worker.ts', import.meta.url), { type: 'module' });
    const rogomaticWorker = new Worker(new URL('./rogomatic-worker.ts', import.meta.url), { type: 'module' });

    rogueWorker.postMessage({ type: 'init', sab, userName });
    rogomaticWorker.postMessage({ type: 'init', sab, userName });

    // Note: In Phase 4, Rogue output still needs to be piped to xterm.
    // This will be handled in Phase 6, but for now we prove the IPC link.
    return;
  }

  // Trigger WASM main
  try {
    const Module = (window as any).Module;

    // Set environment variable for the C code's getenv
    // The WASM wrapper has been patched to pick this up via Module.ENV reference.
    if (!Module.ENV) Module.ENV = {};
    Module.ENV['USER'] = userName;
    Module.ENV['LOGNAME'] = userName;

    if (typeof Module._setenv === 'function') {
      const userKeyPtr = Module.stackAlloc(5);
      Module.stringToUTF8('USER', userKeyPtr, 5);
      const userValPtr = Module.stackAlloc(userName.length * 4 + 1);
      Module.stringToUTF8(userName, userValPtr, userName.length * 4 + 1);
      Module._setenv(userKeyPtr, userValPtr, 1);

      const logKeyPtr = Module.stackAlloc(8);
      Module.stringToUTF8('LOGNAME', logKeyPtr, 8);
      const logValPtr = Module.stackAlloc(userName.length * 4 + 1);
      Module.stringToUTF8(userName, logValPtr, userName.length * 4 + 1);
      Module._setenv(logKeyPtr, logValPtr, 1);
    }

    console.log(`Starting engine for user: ${userName} (Auto: ${isAuto})`);

    const args = isAuto ? ['ZZ', '0', '0', userName] : ['-n', userName];

    // Use manual stack allocation to construct char** argv
    // This provides exact control over arguments and avoids the non-async wrapper logic of callMain
    const fullArgs = isAuto ? ['rogomatic', ...args] : ['rogue', ...args];
    const argc = fullArgs.length;
    const argv = Module.stackAlloc((argc + 1) * 4);
    for (let i = 0; i < argc; i++) {
      const strLen = fullArgs[i].length * 4 + 1; // Safe upper bound for UTF-8
      const strPtr = Module.stackAlloc(strLen);
      Module.stringToUTF8(fullArgs[i], strPtr, strLen);
      Module.setValue(argv + i * 4, strPtr, 'i32');
    }
    Module.setValue(argv + argc * 4, 0, 'i32');

    try {
      Module._main(argc, argv);
    } catch (e: any) {
      if (e && e.name !== 'ExitStatus' && e !== 'unwind') {
        console.error('Startup Error:', e);
        handleExit(-1);
      }
    }
  } catch (e: any) {
    if (e && e.name !== 'ExitStatus') {
      console.error('Startup Error:', e);
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
  mainArea.classList.remove(
    'flex-row',
    'flex-col',
    'justify-center',
    'justify-start',
    'items-center',
    'gap-4',
  );
  mainArea.style.justifyContent = '';

  const MIN_STATS_W = 140;
  const MIN_STATS_H = 110;

  if (containerW >= targetW + MIN_STATS_W + 5) {
    // WIDE SCREEN: Stats on the right
    mainArea.classList.add('flex-row', 'justify-center', 'items-center', 'gap-2');
    statsPanel.classList.remove('hidden');
    console.log('Layout: WIDE (Stats Right)');
  } else if (containerH >= targetH + MIN_STATS_H + 10) {
    // TALL SCREEN: Stats at the bottom
    mainArea.classList.add('flex-col', 'justify-center', 'items-center', 'gap-2');
    statsPanel.classList.remove('hidden');
    console.log('Layout: TALL (Stats Bottom)');
  } else {
    // COMPACT: Center terminal, hide stats
    mainArea.classList.add('flex-col', 'justify-center', 'items-center');
    console.log('Layout: COMPACT (Stats Hidden)');
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
const handleExit = (_status: number) => {
  const leds = ['led-l1', 'led-l2', 'led-l3', 'led-l4'];
  leds.forEach((id) => document.getElementById(id)?.classList.remove('active'));

  xterm.write('\r\n*** Press RETURN to continue ***\r\n');

  const onDataListener = xterm.onData((data) => {
    if (data === '\r' || data === '\n') {
      onDataListener.dispose();
      window.location.reload();
    }
  });
};

// Emscripten Configuration
(window as any).Module = {
  noInitialRun: true,
  ENV: {},
  TerminalShim: TerminalShim,
  onRuntimeInitialized: () => {
    console.log('WASM Runtime Initialized');
    xterm.writeln('(PRESS START TO BEGIN)\r\n>>>');
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.onclick = () => {
        const userName =
          (document.getElementById('unix-name') as HTMLInputElement)?.value || 'rogue';
        localStorage.setItem('rogoweb-username', userName);

        // Ensure USER is set in ENV before callMain
        if ((window as any).Module.ENV) {
          (window as any).Module.ENV['USER'] = userName;
        }

        startBtn.disabled = true;
        startBtn.innerText = 'ONLINE';
        runLoginSequence(userName);
      };
    }
  },
  locateFile: (p: string) => (p.endsWith('.wasm') ? '/rogoweb/wasm/' + p : p),
  onExit: (s: number) => handleExit(s),
  print: (text: string) => {
    console.log('WASM stdout:', text);
    xterm.writeln(text);
  },
  printErr: (text: string) => {
    console.error('WASM stderr:', text);
    xterm.writeln(`\x1b[31m${text}\x1b[0m`);
  },
};

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  xterm.open(terminalElement);
  xterm.writeln('CPU HALTED, SOMM CLEAR, STEP=NONE, CLOCK=NORM.\r\nRAD=HEX, ADD=PHYS, DAT LONG, FILL=00, REL=000000.\r\nINIT SEQ DONE.\r\nHALTED AT 00000000.');

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

const savedName = localStorage.getItem('rogoweb-username');
const unixNameInput = document.getElementById('unix-name') as HTMLInputElement;
if (unixNameInput && savedName) {
  unixNameInput.value = savedName;
}

const modeToggle = document.getElementById('mode-toggle') as HTMLInputElement;
if (modeToggle) {
  // Restore state
  const savedMode = localStorage.getItem('rogoweb-mode');
  if (savedMode !== null) {
    modeToggle.checked = savedMode === 'auto';
  }

  modeToggle.onchange = () => {
    localStorage.setItem('rogoweb-mode', modeToggle.checked ? 'auto' : 'manual');
    window.location.reload();
  };
}
const script = document.createElement('script');
script.src = modeToggle?.checked ? '/rogoweb/wasm/rogomatic.js' : '/rogoweb/wasm/rogue.js';
document.body.appendChild(script);
