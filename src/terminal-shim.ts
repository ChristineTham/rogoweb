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
    
    // Style bits from emcurses/emscripten/pdcdisp.c:
    // style |= 1<<0; // REVERSE
    // style |= 1<<1; // UNDERLINE
    // style |= 1<<4; // BOLD
    
    if (style & (1 << 4)) ansi += '\x1b[1m'; // Bold
    if (style & (1 << 1)) ansi += '\x1b[4m'; // Underline
    if (style & (1 << 0)) ansi += '\x1b[7m'; // Reverse
    
    ansi += String.fromCharCode(ch);
    
    // Reset all styles
    ansi += '\x1b[0m'; 
    
    this.xterm.write(ansi);
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
  }
};
