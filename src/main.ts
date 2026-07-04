import './style.css';
import { Terminal as XTerm } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { TerminalShim, TermGlobals } from './terminal-shim';
import { SharedIPC } from './ipc/ring-buffer';
import {
  parseStatPair,
  barColorClass,
  parseGenePoolSize,
  descentMessage,
  hpCrisisTransition,
  gameOverSummary,
  newGameBanner,
  versionLabel,
  commitUrl,
} from './telemetry';

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
const stopBtn = document.getElementById('btn-stop') as HTMLButtonElement;
const pauseBtn = document.getElementById('btn-pause') as HTMLButtonElement;
const randomiseToggle = document.getElementById('randomise-toggle') as HTMLInputElement;
const autoRestartToggle = document.getElementById('autorestart-toggle') as HTMLInputElement;
const resetGeneBtn = document.getElementById('btn-reset-gene') as HTMLButtonElement;
const seedInput = document.getElementById('seed-input') as HTMLInputElement;

const resetModal = document.getElementById('modal-reset-gene') as HTMLDialogElement;
const resetForm = document.getElementById('form-reset-gene') as HTMLFormElement;
const resetCancelBtn = document.getElementById('btn-reset-cancel') as HTMLButtonElement;
const resetPoolSizeInput = document.getElementById('reset-pool-size') as HTMLInputElement;
const resetSeedInput = document.getElementById('reset-seed') as HTMLInputElement;

/* =========================================
   VERSION / BUILD INFO + OBSERVER-LOG EVENTS
========================================= */
// Injected at build time by vite `define` (see vite.config.ts).
declare const __APP_VERSION__: string;
declare const __GIT_COMMIT__: string;

// Populate the persistent version/commit footer in the status panel.
(() => {
  const ver = document.getElementById('app-ver');
  if (ver) ver.textContent = versionLabel(__APP_VERSION__);
  const commitEl = document.getElementById('app-commit') as HTMLAnchorElement | null;
  if (commitEl) {
    commitEl.textContent = __GIT_COMMIT__;
    const url = commitUrl(__GIT_COMMIT__);
    if (url) commitEl.href = url;
  }
})();

/** Append one line to the OBSERVER LOG pane (auto-scrolls). */
const logObserver = (message: string, cls = 'text-green-400') => {
  const pane = document.getElementById('observer-log');
  if (!pane) return;
  const entry = document.createElement('div');
  entry.textContent = message;
  cls.split(/\s+/).filter(Boolean).forEach((c) => entry.classList.add(c));
  pane.appendChild(entry);
  requestAnimationFrame(() => { pane.scrollTop = pane.scrollHeight; });
};

// Per-game trackers so the observer log can surface milestones, not spam.
let evtPrevLevel = 0; // last dungeon level seen (for descent messages)
let evtHpCrisis = false; // latched while HP is critically low

const statsModal = document.getElementById('modal-gene-stats') as HTMLDialogElement;
const statsContent = document.getElementById('gene-stats-content') as HTMLDivElement;
const geneStatsBtn = document.getElementById('btn-gene-stats') as HTMLButtonElement;

(window as any).xtermInstance = xterm;
(window as any).Terminal = TerminalShim;
(window as any).TermGlobals = TermGlobals;

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
 * TELEMETRY POLLING
 */
const pollTelemetry = () => {
  const term = (window as any).term as TerminalShim;
  if (!term || !term.charBuf || !term.charBuf[23]) return;

  // The last line usually contains Rogue's status
  const statLine = String.fromCharCode(...term.charBuf[23].map(c => c || 32));
  
  const lvlMatch = statLine.match(/Level:\s*(\d+)/);
  if (lvlMatch) {
    const el = document.getElementById('stat-level');
    if (el) el.textContent = lvlMatch[1];
  }
  
  const goldMatch = statLine.match(/Gold:\s*(\d+)/);
  if (goldMatch) {
    const el = document.getElementById('stat-gold');
    if (el) el.textContent = goldMatch[1];
  }

  const hpMatch = statLine.match(/Hp:\s*(\d+)\((\d+)\)/);
  if (hpMatch) {
    const hp = parseInt(hpMatch[1], 10);
    const maxhp = parseInt(hpMatch[2], 10);
    const el = document.getElementById('stat-hp');
    if (el) el.textContent = `${hp}(${maxhp})`;
    const bar = document.getElementById('stat-hp-bar');
    if (bar) {
      const pct = maxhp > 0 ? (hp / maxhp) * 100 : 0;
      bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
      const colorClass = pct < 30 ? 'bg-red-600' : pct < 70 ? 'bg-amber-500' : 'bg-green-600';
      bar.className = `h-full rounded-sm transition-all duration-300 ${colorClass}`;
    }
  }

  const strMatch = statLine.match(/Str:\s*(\d+)/);
  if (strMatch) {
    const el = document.getElementById('stat-str');
    if (el) el.textContent = strMatch[1];
  }

  const expMatch = statLine.match(/Exp:\s*(\d+)\/(\d+)/);
  if (expMatch) {
    const exp = parseInt(expMatch[1], 10);
    const explev = parseInt(expMatch[2], 10);
    const el = document.getElementById('stat-exp');
    if (el) el.textContent = `${exp}/${explev}`;
  }
};

/**
 * ASYNCHRONOUS LOGIN SIMULATION
 */
const simulateTyping = async (text: string, speed = 100) => {
  for (const char of text) {
    xterm.write(char);
    await sleep(speed + Math.random() * 50);
  }
};

const startWorkerGame = (userName: string) => {
  isExited = false;
  // New game: reset milestone trackers and stamp the build info in the log.
  evtPrevLevel = 0;
  evtHpCrisis = false;
  logObserver(newGameBanner(__APP_VERSION__, __GIT_COMMIT__), 'text-cyan-400 font-bold');
  if (activeRogueWorker) {
    activeRogueWorker.terminate();
    activeRogueWorker = null;
  }
  if (activeRogomaticWorker) {
    activeRogomaticWorker.terminate();
    activeRogomaticWorker = null;
  }
  if (statsPollerInterval) {
    clearInterval(statsPollerInterval);
    statsPollerInterval = null;
  }
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
  if (autoRestartTimeout) {
    clearTimeout(autoRestartTimeout);
    autoRestartTimeout = null;
  }

  const l1 = document.getElementById('led-l1'); // Game Active
  const l2 = document.getElementById('led-l2'); // Rogomatic Active
  const l3 = document.getElementById('led-l3'); // Status (Green/Amber/Red)

  if (l1) l1.classList.add('active');
  if (l2) l2.classList.add('active');
  if (l3) l3.classList.add('active'); // Start with green health

  // SEED HANDLING
  const isRandomize = randomiseToggle?.checked;
  let activeSeed = seedInput?.value || '';

  if (isRandomize || !activeSeed) {
    activeSeed = (Math.floor(Math.random() * 900000) + 100000).toString();
    if (seedInput) {
      seedInput.value = activeSeed;
    }
    console.log(`Main Thread: Generated random seed: ${activeSeed}`);
  } else {
    console.log(`Main Thread: Reusing seed: ${activeSeed}`);
  }

  const Module = (window as any).Module;
  if (Module) {
    if (!Module.ENV) Module.ENV = {};
    Module.ENV['SEED'] = activeSeed;
  }

  // Start telemetry polling
  telemetryInterval = setInterval(pollTelemetry, 250);

  // FOCUS: Bring focus to terminal for immediate play
  xterm.focus();

  // DUAL WORKER MODE (Phase 4)
  console.log('Starting Dual Worker IPC Mode...');
  
  if (!window.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
    console.error('CRITICAL: Cross-Origin Isolation is not active. SharedArrayBuffer is required for Dual Worker mode.');
    xterm.writeln('\x1b[31mERROR: CROSS-ORIGIN ISOLATION REQUIRED\x1b[0m');
    return;
  }

  const sab = SharedIPC.createSAB();
  const ipc = new SharedIPC(sab);
  
  activeRogueWorker = new Worker(new URL('./rogue-worker.ts', import.meta.url));
  activeRogomaticWorker = new Worker(new URL('./rogomatic-worker.ts', import.meta.url));

  const handleWorkerMessage = (e: MessageEvent) => {
    if (e.data && e.data.type === 'fs_error') {
      showPersistenceError();
    } else if (e.data && e.data.type === 'exit') {
      if (!isExited) {
        isExited = true;
        handleAutoExit(e.data.status, userName);
      }
    } else if (e.data && e.data.type === 'log') {
      // Surface the gene-pool size ("Gene pool size N, started ...") as a stat.
      const poolSize = parseGenePoolSize(e.data.message);
      if (poolSize !== null) {
        const poolEl = document.getElementById('stat-pool');
        if (poolEl) poolEl.innerText = String(poolSize);
      }
      const logPane = document.getElementById('observer-log');
      if (logPane) {
        const entry = document.createElement('div');
        entry.textContent = `[${e.data.source}] ${e.data.message}`;
        if (e.data.error) {
          entry.classList.add('text-red-400');
        } else {
          entry.classList.add('text-green-400');
        }
        logPane.appendChild(entry);
        requestAnimationFrame(() => {
          logPane.scrollTop = logPane.scrollHeight;
        });
      }
    } else if (e.data && e.data.type === 'stdout') {
      if (e.data.raw) {
        xterm.write(e.data.message);
      } else {
        xterm.writeln(e.data.message);
      }
    }
  };
  activeRogueWorker.onmessage = handleWorkerMessage;
  activeRogomaticWorker.onmessage = handleWorkerMessage;

  activeRogueWorker.postMessage({ type: 'init', sab, userName, seed: activeSeed });
  activeRogomaticWorker.postMessage({ type: 'init', sab, userName, seed: activeSeed });

  // Passive polling of SharedArrayBuffer for high-fidelity stats
  statsPollerInterval = setInterval(() => {
    const rogueStats = ipc.getStats(false);
    const rgmStats = ipc.getStats(true);
    
    renderStats({ ...rogueStats, source: 'rogue' });
    renderStats({ ...rgmStats, source: 'rogomatic' });
  }, 250);

  (window as any).statsPoller = statsPollerInterval;
};

const runLoginSequence = async (userName: string, skipLogin = false) => {
  isExited = false;
  if (activeRogueWorker) {
    activeRogueWorker.terminate();
    activeRogueWorker = null;
  }
  if (activeRogomaticWorker) {
    activeRogomaticWorker.terminate();
    activeRogomaticWorker = null;
  }
  if (statsPollerInterval) {
    clearInterval(statsPollerInterval);
    statsPollerInterval = null;
  }
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }
  if (autoRestartTimeout) {
    clearTimeout(autoRestartTimeout);
    autoRestartTimeout = null;
  }

  const l1 = document.getElementById('led-l1'); // Game Active
  const l3 = document.getElementById('led-l3'); // Status (Green/Amber/Red)
  const modeToggle = document.getElementById('mode-toggle') as HTMLInputElement;
  const isAuto = modeToggle?.checked;

  if (l1) l1.classList.add('active');
  if (l3) l3.classList.add('active'); // Start with green health

  // SEED HANDLING
  const isRandomize = randomiseToggle?.checked;
  let activeSeed = seedInput?.value || '';

  if (isRandomize || !activeSeed) {
    activeSeed = (Math.floor(Math.random() * 900000) + 100000).toString();
    if (seedInput) {
      seedInput.value = activeSeed;
    }
    console.log(`Main Thread: Generated random seed: ${activeSeed}`);
  } else {
    console.log(`Main Thread: Reusing seed: ${activeSeed}`);
  }

  const Module = (window as any).Module;
  if (Module) {
    if (!Module.ENV) Module.ENV = {};
    Module.ENV['SEED'] = activeSeed;
  }

  if (!skipLogin) {
    xterm.write('4.2 BSD UNIX (ucbvax) (tty01)\r\nlogin: ');
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
  } else {
    xterm.reset();
  }

  if (isAuto) {
    startWorkerGame(userName);
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

      if (activeSeed) {
        const seedKeyPtr = Module.stackAlloc(5);
        Module.stringToUTF8('SEED', seedKeyPtr, 5);
        const seedValPtr = Module.stackAlloc(activeSeed.length * 4 + 1);
        Module.stringToUTF8(activeSeed, seedValPtr, activeSeed.length * 4 + 1);
        Module._setenv(seedKeyPtr, seedValPtr, 1);
      }
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
      xterm.focus();
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

let hasShownPersistenceError = false;
const showPersistenceError = () => {
  if (hasShownPersistenceError) return;
  hasShownPersistenceError = true;
  
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-900 border border-red-500 text-white px-4 py-3 rounded shadow-lg z-50 animate-pulse';
  toast.innerHTML = `
    <div class="flex items-center">
      <svg class="w-6 h-6 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
      <div>
        <p class="font-bold font-mono text-sm tracking-wider">PERSISTENCE ERROR</p>
        <p class="text-xs text-red-200 mt-1">Browser storage is unavailable. Your progress will not be saved. (Incognito mode?)</p>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('animate-pulse');
    setTimeout(() => toast.remove(), 8000);
  }, 2000);
};

let mainInputBridge: { dispose: () => void } | null = null;
let activeRogueWorker: Worker | null = null;
let activeRogomaticWorker: Worker | null = null;
let statsPollerInterval: any = null;
let telemetryInterval: any = null;
let autoRestartTimeout: any = null;
let isExited = false;

/**
 * Central UI State Update (React-style model)
 * Directly maps incoming structured stats to the DOM.
 */
const renderStats = (stats: any) => {
  if (stats.source === 'rogue') {
    if (stats.hp !== undefined) {
      const el = document.getElementById('stat-hp');
      if (el) el.innerText = stats.maxhp !== undefined ? `${stats.hp}(${stats.maxhp})` : stats.hp;
      const bar = document.getElementById('stat-hp-bar');
      if (bar) {
        let hpVal = 0;
        let maxhpVal = 0;
        if (stats.maxhp !== undefined) {
          hpVal = Number(stats.hp);
          maxhpVal = Number(stats.maxhp);
        } else if (typeof stats.hp === 'string') {
          const pair = parseStatPair(stats.hp);
          if (pair) {
            hpVal = pair.cur;
            maxhpVal = pair.max;
          }
        }
        if (maxhpVal > 0) {
          const pct = (hpVal / maxhpVal) * 100;
          bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
          bar.className = `h-full rounded-sm transition-all duration-300 ${barColorClass(pct)}`;
          // Latched low-HP warning: log once per crisis, clear when recovered.
          const crisis = hpCrisisTransition(hpVal, maxhpVal, evtHpCrisis);
          evtHpCrisis = crisis.latched;
          if (crisis.message) logObserver(crisis.message, 'text-red-400');
        }
      }
    }
    if (stats.str !== undefined) {
      const el = document.getElementById('stat-str');
      if (el) el.innerText = stats.str;
      const bar = document.getElementById('stat-str-bar');
      if (bar) {
        let strVal = 0;
        let maxStrVal = 0;
        if (typeof stats.str === 'string') {
          const pair = parseStatPair(stats.str);
          if (pair) {
            strVal = pair.cur;
            maxStrVal = pair.max;
          } else {
            strVal = parseInt(stats.str, 10);
            maxStrVal = strVal; // Fallback if no max is provided
          }
        } else if (typeof stats.str === 'number') {
          strVal = stats.str;
          // In WASM mode, stats.str might just be the current value if max is not passed separately.
          // Rogue 5.4 typical max strength is usually 16 to start, up to 31.
          // Since the maxstr isn't passed in the binary IPC struct currently, we'll try to infer it
          // from the string readout first. If it's a number, it's missing the max context here.
          // However, the IPC layer doesn't pass maxStr separately.
          // Let's assume a default max of 16 for the bar if it's just a raw number, or just 100%.
          maxStrVal = Math.max(16, strVal);
        }
        
        if (maxStrVal > 0) {
          const pct = (strVal / maxStrVal) * 100;
          bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
          bar.className = `h-full rounded-sm transition-all duration-300 ${barColorClass(pct)}`;
        }
      }
    }
    if (stats.gold !== undefined) {
      const el = document.getElementById('stat-gold');
      if (el) el.innerText = stats.gold;
    }
    if (stats.level !== undefined) {
      const el = document.getElementById('stat-level');
      if (el) el.innerText = stats.level;
      const lvl = Number(stats.level);
      const descent = descentMessage(evtPrevLevel, lvl);
      if (descent) logObserver(descent, 'text-cyan-400');
      if (lvl > evtPrevLevel) evtPrevLevel = lvl;
    }
    if (stats.exp !== undefined && stats.explev !== undefined) {
      const el = document.getElementById('stat-exp');
      if (el) el.innerText = `${stats.exp}/${stats.explev}`;
    }
  }

  if (stats.source === 'rogomatic') {
    if (stats.botState !== undefined) {
      const el = document.getElementById('bot-state');
      if (el) el.innerText = stats.botState || 'IDLE';
    }
    if (stats.geneid !== undefined || stats.botGen !== undefined) {
      const el = document.getElementById('bot-gen');
      if (el) el.innerText = stats.geneid ?? stats.botGen ?? '0';
    }
    if (stats.turns !== undefined) {
      const el = document.getElementById('bot-turns');
      if (el) el.innerText = stats.turns;
    }
  }
};

const resetStatsUI = () => {
  const hpEl = document.getElementById('stat-hp');
  if (hpEl) hpEl.innerText = '0(0)';
  const hpBar = document.getElementById('stat-hp-bar');
  if (hpBar) {
    hpBar.style.width = '0%';
    hpBar.className = 'h-full bg-red-600 rounded-sm transition-all duration-300';
  }
  const strEl = document.getElementById('stat-str');
  if (strEl) strEl.innerText = '0';
  const goldEl = document.getElementById('stat-gold');
  if (goldEl) goldEl.innerText = '0';
  const levelEl = document.getElementById('stat-level');
  if (levelEl) levelEl.innerText = '1';
  const expEl = document.getElementById('stat-exp');
  if (expEl) expEl.innerText = '0/1';
  const stateEl = document.getElementById('bot-state');
  if (stateEl) stateEl.innerText = 'IDLE';
  const turnsEl = document.getElementById('bot-turns');
  if (turnsEl) turnsEl.innerText = '0';
};

const handleAutoExit = (status: number, userName: string) => {
  const leds = ['led-l1', 'led-l2', 'led-l3', 'led-l4'];
  leds.forEach((id) => document.getElementById(id)?.classList.remove('active'));

  // Clean up workers and stats poller right away so they don't consume resources
  if (activeRogueWorker) {
    activeRogueWorker.terminate();
    activeRogueWorker = null;
  }
  if (activeRogomaticWorker) {
    activeRogomaticWorker.terminate();
    activeRogomaticWorker = null;
  }
  if (statsPollerInterval) {
    clearInterval(statsPollerInterval);
    statsPollerInterval = null;
  }
  if (telemetryInterval) {
    clearInterval(telemetryInterval);
    telemetryInterval = null;
  }

  const logPane = document.getElementById('observer-log');
  const botStateEl = document.getElementById('bot-state');

  const shouldAutoRestart = autoRestartToggle ? autoRestartToggle.checked : true;

  // Game-over summary (depth / gold / turns) from the last-seen stats.
  const goDepth = document.getElementById('stat-level')?.innerText || '?';
  const goGold = document.getElementById('stat-gold')?.innerText || '?';
  const goTurns = document.getElementById('bot-turns')?.innerText || '?';
  logObserver(gameOverSummary(goDepth, goGold, goTurns), 'text-amber-400 font-bold');

  if (shouldAutoRestart) {
    // Log in observer log
    if (logPane) {
      const entry = document.createElement('div');
      entry.textContent = `[system] Game exited with status ${status}. Restarting in 5 seconds...`;
      entry.classList.add('text-amber-400', 'font-bold', 'mt-2');
      logPane.appendChild(entry);
      logPane.scrollTop = logPane.scrollHeight;
    }

    // Update state in stats panel
    if (botStateEl) {
      botStateEl.innerText = 'RESTARTING...';
    }

    // Wait 5 seconds to let the user see the final screen, then start the next game
    autoRestartTimeout = setTimeout(() => {
      // Clear terminal and reset stats
      xterm.reset();
      resetStatsUI();
      
      // Start next game directly
      startWorkerGame(userName);
    }, 5000);
  } else {
    // Log in observer log
    if (logPane) {
      const entry = document.createElement('div');
      entry.textContent = `[system] Game exited with status ${status}. Auto restart disabled.`;
      entry.classList.add('text-amber-400', 'font-bold', 'mt-2');
      logPane.appendChild(entry);
      logPane.scrollTop = logPane.scrollHeight;
    }

    // Update state in stats panel
    if (botStateEl) {
      botStateEl.innerText = 'IDLE';
    }

    // Restore buttons and UI to idle state
    if (startBtn) {
      startBtn.disabled = false;
      startBtn.innerText = 'START';
    }
    if (resetGeneBtn) {
      resetGeneBtn.disabled = false;
    }
    if (geneStatsBtn) {
      geneStatsBtn.disabled = false;
    }
    if (stopBtn) {
      stopBtn.disabled = true;
    }
    if (pauseBtn) {
      pauseBtn.disabled = true;
      pauseBtn.innerText = 'PAUSE';
      pauseBtn.classList.remove('active');
    }
  }
};

const handleExit = (status: number) => {
  const leds = ['led-l1', 'led-l2', 'led-l3', 'led-l4'];
  leds.forEach((id) => document.getElementById(id)?.classList.remove('active'));

  // Dispose of main input bridge to stop characters going to dead WASM instance
  if (mainInputBridge) {
    mainInputBridge.dispose();
    mainInputBridge = null;
  }

  const shouldAutoRestart = autoRestartToggle ? autoRestartToggle.checked : true;

  if (shouldAutoRestart) {
    xterm.write(`\r\n*** Game exited with status ${status}. Restarting in 5 seconds... ***\r\n`);

    // Set auto-restart flag in sessionStorage
    sessionStorage.setItem('rogoweb-autorestart', 'true');

    setTimeout(() => {
      window.location.reload();
    }, 5000);
  } else {
    xterm.write('\r\n*** Press RETURN to continue ***\r\n');

    console.log('handleExit called, scheduling xterm.onData listener...');

    // Delay registration to prevent immediate reset from queued/accidental key presses
    setTimeout(() => {
      console.log('xterm.onData listener registered for exit.');
      const onDataListener = xterm.onData((data) => {
        console.log('Exit onData received data:', JSON.stringify(data), 'length:', data.length);
        if (data === '\r' || data === '\n') {
          console.log('Reload triggered by:', JSON.stringify(data));
          onDataListener.dispose();
          // Give the UI a moment to breathe before reloading
          setTimeout(() => {
            window.location.reload();
          }, 10);
        }
      });
    }, 1000);
  }
};

// Emscripten Configuration
(window as any).Module = {
  noInitialRun: true,
  ENV: {},
  TerminalShim: TerminalShim,
  wasm_pipe_read: (_fd: number, _ptr: number, _count: number) => {
    // In manual mode, there is no virtual pipe to read from.
    return 0;
  },
  wasm_pipe_write: (_fd: number, _ptr: number, _count: number) => {
    // In manual mode, we don't need to pipe the output anywhere else.
    return _count;
  },
  onStatsUpdate: (stats: any) => {
    // In manual mode, we just pass stats to renderStats
    renderStats({ ...stats, source: 'rogue' });
  },
  onRuntimeInitialized: () => {
    console.log('Main Thread: WASM Runtime Initialized');
    
    const FS = (window as any).Module.FS;
    if (FS) {
      const mkdirSync = (path: string) => {
        try {
          FS.mkdir(path);
          console.log(`Main Thread: Created directory ${path}`);
        } catch (e: any) {
          if (e.errno !== 20) console.warn(`Main Thread: mkdir ${path} info:`, e.message);
        }
      };

      mkdirSync('/var');
      mkdirSync('/var/games');
      mkdirSync('/var/games/rogomatic');

      console.log('Main Thread: Mounting IDBFS...');
      try {
        FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');
      } catch (e: any) {
        console.error('Main Thread: IDBFS mount failed:', e);
        showPersistenceError();
      }

      console.log('Main Thread: Starting IDBFS sync...');
      FS.syncfs(true, (err: any) => {
        if (err) {
          console.error('Main Thread: IDBFS syncfs(true) failed:', err);
          showPersistenceError();
        } else {
          console.log('Main Thread: IDBFS synced');
        }

        const scoreFile = '/var/games/rogomatic/rogue.scr';
        try {
          if (!FS.analyzePath(scoreFile).exists) {
            console.log(`Main Thread: Creating empty file ${scoreFile}`);
            FS.writeFile(scoreFile, '');
          }
        } catch (e) {
          console.error(`Main Thread: Error checking/creating ${scoreFile}:`, e);
        }
        
        setupLoginUI();
      });
    } else {
      setupLoginUI();
    }

    function setupLoginUI() {
      if (startBtn) {
        let shouldSkipLogin = false;
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

          if (resetGeneBtn) {
            resetGeneBtn.disabled = true;
          }
          if (geneStatsBtn) {
            geneStatsBtn.disabled = true;
          }

          if (stopBtn) stopBtn.disabled = false;
          if (pauseBtn) pauseBtn.disabled = false;

          runLoginSequence(userName, shouldSkipLogin);
          shouldSkipLogin = false;
        };

        const autoRestart = sessionStorage.getItem('rogoweb-autorestart');
        if (autoRestart === 'true') {
          sessionStorage.removeItem('rogoweb-autorestart');
          shouldSkipLogin = true;
          startBtn.click();
        }
      }

      if (geneStatsBtn) {
        geneStatsBtn.disabled = false;
      }

      if (resetGeneBtn && resetModal) {
        resetGeneBtn.disabled = false;
        resetGeneBtn.onclick = () => {
          resetModal.showModal();
        };

        if (resetCancelBtn) {
          resetCancelBtn.onclick = () => {
            resetModal.close();
          };
        }

        // Fallback for browsers without closedby support (e.g. Safari)
        if (!('closedBy' in HTMLDialogElement.prototype)) {
          resetModal.onclick = (event) => {
            if (event.target !== resetModal) return;
            const rect = resetModal.getBoundingClientRect();
            const isDialogContent = (
              rect.top <= event.clientY &&
              event.clientY <= rect.top + rect.height &&
              rect.left <= event.clientX &&
              event.clientX <= rect.left + rect.width
            );
            if (!isDialogContent) {
              resetModal.close();
            }
          };
        }

        if (resetForm) {
          resetForm.onsubmit = (e) => {
            e.preventDefault();
            resetModal.close();

            const poolSize = parseInt(resetPoolSizeInput?.value || '20', 10);
            const randomSeed = parseInt(resetSeedInput?.value || '0', 10);

            resetGeneBtn.disabled = true;
            if (geneStatsBtn) {
              geneStatsBtn.disabled = true;
            }
            if (startBtn) startBtn.disabled = true;

            const logPane = document.getElementById('observer-log');
            if (logPane) {
              const entry = document.createElement('div');
              entry.textContent = `[system] Resetting gene pool (size: ${poolSize}, seed: ${randomSeed})...`;
              entry.classList.add('text-amber-400', 'font-bold');
              logPane.appendChild(entry);
              logPane.scrollTop = logPane.scrollHeight;
            }

            // Spawn a temporary worker to initialize the pool using Emscripten FS & WASM
            const userName = (document.getElementById('unix-name') as HTMLInputElement)?.value || 'rogue';
            const sab = SharedIPC.createSAB();
            
            const tempWorker = new Worker(new URL('./rogomatic-worker.ts', import.meta.url));
            tempWorker.onmessage = (event) => {
              if (event.data && event.data.type === 'reset_complete') {
                console.log('Main Thread: received reset_complete from temporary worker');
                tempWorker.terminate();

                resetGeneBtn.disabled = false;
                if (geneStatsBtn) {
                  geneStatsBtn.disabled = false;
                }
                if (startBtn) startBtn.disabled = false;

                const logPaneInner = document.getElementById('observer-log');
                if (logPaneInner) {
                  const entry = document.createElement('div');
                  entry.textContent = `[system] Gene pool initialized successfully.`;
                  entry.classList.add('text-green-400', 'font-bold');
                  logPaneInner.appendChild(entry);
                  logPaneInner.scrollTop = logPaneInner.scrollHeight;
                }
              } else if (event.data && event.data.type === 'fs_error') {
                tempWorker.terminate();
                resetGeneBtn.disabled = false;
                if (geneStatsBtn) {
                  geneStatsBtn.disabled = false;
                }
                if (startBtn) startBtn.disabled = false;
                showPersistenceError();
              }
            };

            tempWorker.postMessage({
              type: 'init',
              sab,
              userName,
              seed: randomSeed.toString(),
              isReset: true,
              size: poolSize
            });
          };
        }
      }

      if (geneStatsBtn && statsModal && statsContent) {
        geneStatsBtn.onclick = () => {
          const FS = (window as any).Module?.FS;
          if (!FS) {
            statsContent.innerHTML = '<div class="italic text-red-600 font-bold">WASM filesystem not initialized.</div>';
            statsModal.showModal();
            return;
          }

          statsContent.innerHTML = '<div class="italic text-black/60">Loading stats...</div>';
          statsModal.showModal();

          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Main Thread: failed to sync IndexedDB for gene stats:', err);
              statsContent.innerHTML = '<div class="italic text-red-600 font-bold">Failed to sync file system.</div>';
              return;
            }

            const poolFile = '/var/games/rogomatic/GenePool544';
            try {
              if (FS.analyzePath(poolFile).exists) {
                const content = FS.readFile(poolFile, { encoding: 'utf8' });
                renderGeneStats(content);
              } else {
                statsContent.innerHTML = '<div class="italic text-red-600 font-bold">No gene pool file found. Play Rog-O-Matic first.</div>';
              }
            } catch (e: any) {
              console.error('Main Thread: error reading GenePool544:', e);
              statsContent.innerHTML = `<div class="italic text-red-600 font-bold">Error reading gene pool: ${e.message}</div>`;
            }
          });
        };

        // Fallback for browsers without closedby support (e.g. Safari)
        if (!('closedBy' in HTMLDialogElement.prototype)) {
          statsModal.onclick = (event) => {
            if (event.target !== statsModal) return;
            const rect = statsModal.getBoundingClientRect();
            const isDialogContent = (
              rect.top <= event.clientY &&
              event.clientY <= rect.top + rect.height &&
              rect.left <= event.clientX &&
              event.clientX <= rect.left + rect.width
            );
            if (!isDialogContent) {
              statsModal.close();
            }
          };
        }
      }

      if (stopBtn) {
        stopBtn.onclick = () => {
          window.location.reload();
        };
      }

      if (pauseBtn) {
        pauseBtn.onclick = () => {
          if (pauseBtn.innerText === 'PAUSE') {
            pauseBtn.innerText = 'RESUME';
            pauseBtn.classList.add('active');
          } else {
            pauseBtn.innerText = 'PAUSE';
            pauseBtn.classList.remove('active');
            xterm.focus();
          }
        };
      }

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
  syncFS: () => {
    console.log('Main Thread: Syncing FS to IDBFS...');
    return new Promise<void>((resolve) => {
      const FS = (window as any).Module.FS;
      if (FS && FS.syncfs) {
        FS.syncfs(false, (err: any) => {
          if (err) console.error('Main Thread: syncfs(false) failed:', err);
          else console.log('Main Thread: syncfs(false) complete');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
};

// Ensure syncFS is globally available on window for EM_ASM
(window as any).syncFS = (window as any).Module.syncFS;

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  document.fonts.ready.then(() => {
    xterm.open(terminalElement);
    xterm.writeln('Press START to play');

    // ACTIVATE CANVAS RENDERER
    try {
      // Disable CanvasAddon to allow DOM renderer to draw the custom font correctly
      // const canvasAddon = new CanvasAddon();
      // xterm.loadAddon(canvasAddon);
    } catch (e) {
      console.error('Canvas addon fail', e);
    }

    // INPUT BRIDGE: Hook xterm.onData to the global term instance
    mainInputBridge = xterm.onData((data) => {
      const term = (window as any).term as TerminalShim;
      if (term) {
        for (let i = 0; i < data.length; i++) {
          term.pushInput(data.charCodeAt(i));
        }
        if (term.handler) term.handler();
      }
    });

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
script.src = '/rogoweb/wasm/rogue.js';
document.body.appendChild(script);

interface Genotype {
  id: number;
  creation: number;
  father: number;
  mother: number;
  dna: number[];
  score: { count: number; sum: number; sumsq: number; low: number; high: number };
  level: { count: number; sum: number; sumsq: number; low: number; high: number };
}

function parseGenePool(content: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const headerParts = lines[0].split('|');
  const [inittime, trialno, lastid, crosses, shifts, mutations] = headerParts[0].split(/\s+/).map(Number);
  
  const parseStat = (str: string) => {
    const [count, sum, sumsq, low, high] = str.trim().split(/\s+/).map(Number);
    return { count, sum, sumsq, low, high };
  };

  const poolScore = parseStat(headerParts[1]);
  const poolLevel = parseStat(headerParts[2]);

  const genotypes: Genotype[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('|');
    if (parts.length < 4) continue;

    const [id, creation, father, mother] = parts[0].trim().split(/\s+/).map(Number);
    const dna = parts[1].trim().split(/\s+/).map(Number);
    const score = parseStat(parts[2]);
    const level = parseStat(parts[3]);

    genotypes.push({ id, creation, father, mother, dna, score, level });
  }

  return {
    inittime, trialno, lastid, crosses, shifts, mutations,
    poolScore, poolLevel,
    genotypes
  };
}

function renderGeneStats(content: string) {
  const stats = parseGenePool(content);
  const contentEl = document.getElementById('gene-stats-content');
  if (!contentEl) return;

  if (!stats) {
    contentEl.innerHTML = '<div class="italic text-red-600 font-bold">Failed to parse gene pool or file is empty.</div>';
    return;
  }

  const fmt = (num: number) => num.toFixed(2);
  const mean = (stat: any) => stat.count > 0 ? stat.sum / stat.count : 0;
  const stdev = (stat: any) => {
    if (stat.count <= 1) return 0;
    const variance = (stat.sumsq - (stat.sum * stat.sum) / stat.count) / (stat.count - 1);
    return Math.sqrt(Math.max(0, variance));
  };

  let html = `
    <!-- GENERAL POOL INFO -->
    <div class="grid grid-cols-2 gap-2 border border-black/20 p-2 rounded bg-black/5">
      <div>
        <div class="font-extrabold uppercase text-[10px] text-black/60">Trials / Births</div>
        <div class="font-bold text-sm text-vt-black">${stats.trialno} / ${stats.lastid}</div>
      </div>
      <div>
        <div class="font-extrabold uppercase text-[10px] text-black/60">Cross / Mut / Shift</div>
        <div class="font-bold text-sm text-vt-black">${stats.crosses} / ${stats.mutations} / ${stats.shifts}</div>
      </div>
      <div>
        <div class="font-extrabold uppercase text-[10px] text-black/60">Mean Score</div>
        <div class="font-bold text-sm text-vt-black">${fmt(mean(stats.poolScore))} ± ${fmt(stdev(stats.poolScore))}</div>
      </div>
      <div>
        <div class="font-extrabold uppercase text-[10px] text-black/60">Mean Level</div>
        <div class="font-bold text-sm text-vt-black">${fmt(mean(stats.poolLevel))} ± ${fmt(stdev(stats.poolLevel))}</div>
      </div>
    </div>

    <!-- GENOTYPES LIST -->
    <div class="mt-2">
      <h3 class="font-bold uppercase tracking-wider text-[11px] mb-1.5 text-black/70">Genotypes (${stats.genotypes.length})</h3>
      <div class="flex flex-col gap-1.5">
  `;

  const knobNames = [
    "trap search", "door search", "resting", "use arrows",
    "experiment", "retreat", "wake monst", "hoard food"
  ];

  stats.genotypes.forEach(g => {
    const pStr = g.mother ? `${g.father}, ${g.mother}` : g.father ? `${g.father}` : 'None';
    const sMean = mean(g.score);
    const lMean = mean(g.level);
    const sDev = stdev(g.score);
    const lDev = stdev(g.level);

    html += `
      <div class="border border-black/20 p-2 rounded bg-white/40 shadow-xs flex flex-col gap-1">
        <div class="flex justify-between items-center border-b border-black/10 pb-0.5">
          <span class="font-black text-sm text-dec-blue">ID: ${g.id}</span>
          <span class="text-[10px] text-black/60">Created: ${g.creation} | Parents: ${pStr}</span>
        </div>
        <div class="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
          <div>
            <span class="font-bold">Score:</span> ${fmt(sMean)} ± ${fmt(sDev)} (High: ${g.score.high})
          </div>
          <div>
            <span class="font-bold">Level:</span> ${fmt(lMean)} ± ${fmt(lDev)} (High: ${g.level.high})
          </div>
        </div>
        <div class="text-[9px] bg-black/5 p-1 rounded font-mono text-black/80 mt-0.5">
          <span class="font-extrabold uppercase text-[8px] block mb-0.5 text-black/50">DNA / Knobs:</span>
          <div class="grid grid-cols-4 gap-x-1 gap-y-0.5">
            ${g.dna.map((val, idx) => `<div>${knobNames[idx]}: <strong>${val}</strong></div>`).join('')}
          </div>
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  contentEl.innerHTML = html;
}
