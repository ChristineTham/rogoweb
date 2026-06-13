import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Set up JSDOM environment before importing the module to ensure globals are defined
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('TerminalShim and TermGlobals', () => {
  let dom: JSDOM;
  let mockXterm: any;

  beforeEach(() => {
    dom = new JSDOM(html, { url: 'http://localhost' });
    global.window = dom.window as any;
    global.document = dom.window.document as any;

    mockXterm = {
      reset: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      options: {
        cursorBlink: true,
      },
      buffer: {
        active: {
          getLine: vi.fn().mockReturnValue({
            translateToString: () => 'Hp: 12(15) Str: 16(16) Gold: 250 Level: 3',
          }),
        },
      },
    };

    (global.window as any).xtermInstance = mockXterm;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (global as any).window;
    delete (global as any).document;
  });

  it('initialises buffers and registers global instance', async () => {
    // Import dynamically so it registers the window/document globals setup above
    const { TerminalShim } = await import('./terminal-shim');

    const shim = new TerminalShim({ cols: 80, rows: 24 });

    expect(shim.cols).toBe(80);
    expect(shim.rows).toBe(24);
    expect(shim.charBuf.length).toBe(24);
    expect(shim.charBuf[0].length).toBe(80);
    expect(shim.styleBuf.length).toBe(24);
    expect(shim.styleBuf[0].length).toBe(80);
    expect((global.window as any).term).toBe(shim);
    expect(mockXterm.reset).toHaveBeenCalled();
  });

  it('manages the keyboard input queue correctly', async () => {
    const { TerminalShim } = await import('./terminal-shim');
    const shim = new TerminalShim({ cols: 80, rows: 24 });

    expect(shim.hasInput()).toBe(false);
    expect(shim.getKey()).toBe(0);

    shim.pushInput(104); // 'h'
    shim.pushInput(106); // 'j'

    expect(shim.hasInput()).toBe(true);
    expect(shim.getKey()).toBe(104);
    expect(shim.getKey()).toBe(106);
    expect(shim.hasInput()).toBe(false);
  });

  it('handles terminal open and close operations', async () => {
    const { TerminalShim } = await import('./terminal-shim');
    const initHandler = vi.fn();
    const shim = new TerminalShim({ cols: 80, rows: 24, initHandler });

    shim.open();
    expect(initHandler).toHaveBeenCalled();

    shim.pushInput(97);
    shim.close();
    expect(shim.hasInput()).toBe(false);
    expect(mockXterm.reset).toHaveBeenCalled();
    expect(mockXterm.write).toHaveBeenCalledWith('\x1b[H\x1b[J');
  });

  it('updates buffer characters and emits correct ANSI sequences', async () => {
    const { TerminalShim } = await import('./terminal-shim');
    const shim = new TerminalShim({ cols: 80, rows: 24 });

    // Writing 'A' (ASCII 65) at row 5, col 10 with style 0 (normal)
    shim.setChar(65, 5, 10, 0);

    expect(shim.charBuf[5][10]).toBe(65);
    expect(shim.styleBuf[5][10]).toBe(0);
    // Row/col in ANSI sequence is 1-indexed (row 6, col 11)
    expect(mockXterm.write).toHaveBeenCalledWith('\x1b[6;11HA');
  });

  it('emits styled ANSI sequences (bold, underline, reverse)', async () => {
    const { TerminalShim } = await import('./terminal-shim');
    const shim = new TerminalShim({ cols: 80, rows: 24 });

    // Style 4: Bold, Style 2: Underline, Style 1: Reverse
    // Combined style 7 = 4 + 2 + 1
    shim.setChar(66, 5, 10, 7);

    expect(mockXterm.write).toHaveBeenCalledWith('\x1b[6;11H\x1b[1m\x1b[4m\x1b[7mB\x1b[0m');
  });

  it('updates the status line and parses stats into DOM elements', async () => {
    const { TerminalShim } = await import('./terminal-shim');
    const shim = new TerminalShim({ cols: 80, rows: 24 });

    // Set mock status line values in the xterm buffer mock
    mockXterm.buffer.active.getLine.mockReturnValue({
      translateToString: () => 'Hp: 45(50) Str: 18(18) Gold: 999 Level: 5',
    });

    // Setting a char on status line row (row 23) triggers parsing
    shim.setChar(32, 23, 0, 0);

    // Run debounced setTimeout parsing
    vi.runAllTimers();

    const hpEl = global.document.getElementById('stat-hp');
    const strEl = global.document.getElementById('stat-str');
    const goldEl = global.document.getElementById('stat-gold');
    const lvlEl = global.document.getElementById('stat-level');

    expect(hpEl?.innerText).toBe('45(50)');
    expect(strEl?.innerText).toBe('18(18)');
    expect(goldEl?.innerText).toBe('999');
    expect(lvlEl?.innerText).toBe('5');
  });

  it('directly updates DOM elements using TermGlobals.setStats', async () => {
    const { TermGlobals } = await import('./terminal-shim');

    TermGlobals.setStats({
      hp: '99(99)',
      str: '20(20)',
      gold: '12345',
      level: '12',
      botState: 'PLAYING',
      botGen: '42',
    });

    expect(global.document.getElementById('stat-hp')?.innerText).toBe('99(99)');
    expect(global.document.getElementById('stat-str')?.innerText).toBe('20(20)');
    expect(global.document.getElementById('stat-gold')?.innerText).toBe('12345');
    expect(global.document.getElementById('stat-level')?.innerText).toBe('12');
    expect(global.document.getElementById('bot-state')?.innerText).toBe('PLAYING');
    expect(global.document.getElementById('bot-gen')?.innerText).toBe('42');
  });
});
