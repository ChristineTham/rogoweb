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

  constructor(conf: any) {
    console.log('TerminalShim constructor', conf);
    this.xterm = (window as any).xtermInstance;
    (window as any).term = this; // Explicitly set global for emcurses
    if (conf.cols) this.conf.cols = conf.cols;
    if (conf.rows) this.conf.rows = conf.rows;
    if (conf.handler) this.handler = conf.handler;
    if (conf.initHandler) (this as any).initHandler = conf.initHandler;
  }

  get cols(): number { return this.conf.cols; }
  get rows(): number { return this.conf.rows; }

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
    this.xterm.reset();
    this.xterm.write('\x1b[H\x1b[2J'); // Home and clear
  }

  setChar(ch: number, row: number, col: number, style: number) {
    let ansi = '\x1b[' + (row + 1) + ';' + (col + 1) + 'H';
    
    if (style & (1 << 4)) ansi += '\x1b[1m'; // Bold
    if (style & (1 << 1)) ansi += '\x1b[4m'; // Underline
    if (style & (1 << 0)) ansi += '\x1b[7m'; // Reverse
    
    ansi += String.fromCharCode(ch);
    if (style !== 0) ansi += '\x1b[0m'; 
    
    this.xterm.write(ansi);

    // STATUS LINE PARSING (Row 23 is the typical Rogue status line)
    if (row === 23) {
       this.parseStatusLine();
    }
  }

  private parseTimeout: any = null;

  private parseStatusLine() {
    // Debounce parsing to avoid overhead
    if (this.parseTimeout) clearTimeout(this.parseTimeout);
    this.parseTimeout = setTimeout(() => {
      // Extract line from xterm buffer if possible, or maintain internal buffer
      // For now, let's just assume we can get it from xterm
      const line = this.xterm.buffer.active.getLine(23)?.translateToString(true) || "";
      console.log("Parsing status line:", line);

      // Regex patterns for Rogue stats
      const hpMatch = line.match(/Hp:\s*(\d+\(\d+\))/i);
      const strMatch = line.match(/Str:\s*(\d+\(\d+\))/i);
      const goldMatch = line.match(/Gold:\s*(\d+)/i);
      const levelMatch = line.match(/Level:\s*(\d+)/i);

      TermGlobals.setStats({
        hp: hpMatch ? hpMatch[1] : undefined,
        str: strMatch ? strMatch[1] : undefined,
        gold: goldMatch ? goldMatch[1] : undefined,
        level: levelMatch ? levelMatch[1] : undefined
      });
    }, 100);
  }

  cursorSet(row: number, col: number) {
    // console.log(`cursorSet: ${row},${col}`);
    this.xterm.write('\x1b[' + (row + 1) + ';' + (col + 1) + 'H');
  }

  resizeTo(cols: number, rows: number) {
    console.log('TerminalShim.resizeTo', cols, rows);
    this.conf.cols = cols;
    this.conf.rows = rows;
    this.xterm.resize(cols, rows);
  }

  cursorOn() {
    this.xterm.options.cursorBlink = true;
  }

  cursorOff() {
    this.xterm.options.cursorBlink = false;
  }
}

export const TermGlobals = {
  getColorString: (color: number) => {
    console.log('TermGlobals.getColorString', color);
    return "#ffffff";
  },
  setColor: (color: number, str: string) => {
    console.log('TermGlobals.setColor', color, str);
  },
  setStats: (stats: any) => {
    console.log('TermGlobals.setStats', stats);
    if (stats.hp !== undefined) {
      const el = document.getElementById('stat-hp');
      if (el) el.innerText = stats.hp;
    }
    if (stats.str !== undefined) {
      const el = document.getElementById('stat-str');
      if (el) el.innerText = stats.str;
    }
    if (stats.gold !== undefined) {
      const el = document.getElementById('stat-gold');
      if (el) el.innerText = stats.gold;
    }
    if (stats.level !== undefined) {
      const el = document.getElementById('stat-level');
      if (el) el.innerText = stats.level;
    }
    if (stats.botState !== undefined) {
      const el = document.getElementById('bot-state');
      if (el) el.innerText = stats.botState;
    }
    if (stats.botGen !== undefined) {
      const el = document.getElementById('bot-gen');
      if (el) el.innerText = stats.botGen;
    }
  }
};
