import { Terminal as XTerm } from '@xterm/xterm';

export class TerminalShim {
  xterm: XTerm;
  inputQueue: number[] = [];
  handler: () => void = () => {};
  conf: { rows: number; cols: number } = { rows: 24, cols: 80 };
  charMode: boolean = false;
  lock: boolean = false;
  crsrBlinkMode: boolean = true;
  crsrBlockMode: boolean = true;
  inputChar: number = 0;
  charBuf: any[][] = [];
  styleBuf: any[][] = [];
  maxLines: number = 24;
  maxCols: number = 80;
  lastRow: number = -1;
  lastCol: number = -1;

  constructor(conf: any) {
    console.log('TerminalShim constructor', conf);
    this.xterm = (window as any).xtermInstance;
    (window as any).term = this; // Explicitly set global for emcurses

    this.conf.cols = conf.cols || 80;
    this.conf.rows = conf.rows || 24;
    this.maxCols = this.conf.cols;
    this.maxLines = this.conf.rows;

    if (conf.handler) this.handler = conf.handler;
    if (conf.initHandler) (this as any).initHandler = conf.initHandler;

    // Initialize legacy buffers to prevent "undefined" access errors in emcurses
    this.clear();
  }

  get cols(): number {
    return this.conf.cols;
  }
  get rows(): number {
    return this.conf.rows;
  }

  clear() {
    this.charBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.styleBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.xterm.reset();
  }

  hasInput(): boolean {
    return this.inputQueue.length > 0;
  }

  getKey(): number {
    const key = this.inputQueue.shift() || 0;
    if (key > 0) console.log('TerminalShim.getKey', key, String.fromCharCode(key));
    return key;
  }

  pushInput(ch: number) {
    console.log('TerminalShim.pushInput', ch, String.fromCharCode(ch));
    this.inputQueue.push(ch);
  }

  open() {
    console.log('TerminalShim.open');
    if ((this as any).initHandler) {
      console.log('Calling initHandler');
      (this as any).initHandler();
    }
  }

  close() {
    console.log('TerminalShim.close');
    this.inputQueue = [];
    const clearAnsi = '\x1b[H\x1b[2J';

    if ((this as any).ipc) {
      const encoder = new TextEncoder();
      const isWorker = typeof self !== 'undefined' && typeof (self as any).importScripts !== 'undefined';
      (this as any).ipc.rogueToRogomatic.write(encoder.encode(clearAnsi), isWorker);
    }

    if (this.xterm) {
      this.xterm.reset();
      this.xterm.write(clearAnsi); // Home and clear
    } else if (typeof postMessage !== 'undefined') {
      postMessage({ type: 'stdout', message: clearAnsi, raw: true });
    }
  }

  setChar(ch: number, row: number, col: number, style: number) {
    if (row < 0 || row >= this.maxLines || col < 0 || col >= this.maxCols) {
      // console.warn(`setChar out of bounds: ${row},${col}`);
      return;
    }

    if (!this.charBuf[row]) this.charBuf[row] = Array(this.maxCols).fill(0);
    if (!this.styleBuf[row]) this.styleBuf[row] = Array(this.maxCols).fill(0);

    this.charBuf[row][col] = ch;
    this.styleBuf[row][col] = style;

    let ansi = '';
    // Only emit cursor move if not contiguous
    if (row !== this.lastRow || col !== this.lastCol + 1) {
      ansi += '\x1b[' + (row + 1) + ';' + (col + 1) + 'H';
    }

    if (style & 4) ansi += '\x1b[1m'; // Bold
    if (style & 2) ansi += '\x1b[4m'; // Underline
    if (style & 1) ansi += '\x1b[7m'; // Reverse

    ansi += String.fromCharCode(ch || 32);
    if (style !== 0) ansi += '\x1b[0m';

    this.lastRow = row;
    this.lastCol = col;

    // Route to IPC if this is the Rogue worker talking to Rogomatic
    if ((this as any).ipc) {
      const encoder = new TextEncoder();
      const isWorker = typeof self !== 'undefined' && typeof (self as any).importScripts !== 'undefined';
      (this as any).ipc.rogueToRogomatic.write(encoder.encode(ansi), isWorker);
    }

    if (this.xterm) {
      this.xterm.write(ansi);
    } else if (typeof postMessage !== 'undefined') {
      postMessage({ type: 'stdout', message: ansi, raw: true });
    }
  }

  private parseTimeout: any = null;

  private parseStatusLine() {
    // Redundant now that we have internal stat reporting.
  }

  // Allow manual trigger of parsing (useful for main thread xterm polling)
  public forceParseStats() {
    // Redundant now that we have internal stat reporting.
  }

  cursorSet(row: number, col: number) {
    const ansi = '\x1b[' + (row + 1) + ';' + (col + 1) + 'H';
    
    if ((this as any).ipc) {
      const encoder = new TextEncoder();
      const isWorker = typeof self !== 'undefined' && typeof (self as any).importScripts !== 'undefined';
      (this as any).ipc.rogueToRogomatic.write(encoder.encode(ansi), isWorker);
    }

    if (this.xterm) {
      this.xterm.write(ansi);
    } else if (typeof postMessage !== 'undefined') {
      postMessage({ type: 'stdout', message: ansi, raw: true });
    }
  }

  resizeTo(cols: number, rows: number) {
    console.log('TerminalShim.resizeTo', cols, rows);
    this.conf.cols = cols;
    this.conf.rows = rows;
    if (this.xterm) {
      this.xterm.resize(cols, rows);
    }
  }

  cursorOn() {
    if (this.xterm) this.xterm.options.cursorBlink = true;
  }

  cursorOff() {
    if (this.xterm) this.xterm.options.cursorBlink = false;
  }
}

export const TermGlobals = {
  getColorString: (color: number) => {
    console.log('TermGlobals.getColorString', color);
    return '#ffffff';
  },
  setColor: (color: number, str: string) => {
    console.log('TermGlobals.setColor', color, str);
  },
  setStats: (_stats: any) => {
    // Stats are now handled via a direct SharedArrayBuffer poller in main.ts
    // to avoid race conditions and blocking JS callouts from the workers.
  },
};
