/**
 * SharedRingBuffer: A thread-safe ring buffer implementation using SharedArrayBuffer and Atomics.
 * Designed for bidirectional communication between Web Workers.
 */
class SharedRingBuffer {
  /**
   * @param sab The SharedArrayBuffer to use.
   * @param offset The byte offset where this buffer starts in the SAB.
   * @param capacity The capacity of the data area (excluding header).
   */
  constructor(sab, offset, capacity) {
    // Header uses 8 bytes: 4 for head, 4 for tail.
    this.head = new Int32Array(sab, offset, 1);
    this.tail = new Int32Array(sab, offset + 4, 1);
    this.data = new Uint8Array(sab, offset + 8, capacity);
    this.capacity = capacity;
  }

  /**
   * Writes data to the buffer.
   * @returns The number of bytes written.
   */
  write(src, block = false) {
    let totalWritten = 0;
    while (totalWritten < src.length) {
      const head = Atomics.load(this.head, 0);
      const tail = Atomics.load(this.tail, 0);

      const available = this.getAvailableWriteInternal(head, tail);
      
      if (available === 0 && block) {
        Atomics.wait(this.head, 0, head, 100);
        continue;
      }

      const toWrite = Math.min(src.length - totalWritten, available);

      if (toWrite === 0) break;
      // console.log("SharedRingBuffer.write", toWrite, "bytes:", new TextDecoder().decode(src.subarray(totalWritten, totalWritten + toWrite)));

      for (let i = 0; i < toWrite; i++) {
        this.data[(tail + i) % this.capacity] = src[totalWritten + i];
      }

      Atomics.store(this.tail, 0, (tail + toWrite) % this.capacity);
      Atomics.notify(this.tail, 0);

      totalWritten += toWrite;
      if (!block) break;
    }
    return totalWritten;
  }

  /**
   * Reads data from the buffer. Blocks if empty and block=true.
   * @returns The number of bytes read.
   */
  read(dest, block = false) {
    let head = Atomics.load(this.head, 0);
    let tail = Atomics.load(this.tail, 0);

    let available = this.getAvailableReadInternal(head, tail);
    
    if (available === 0 && block) {
      // Loop until data is available to handle spurious wakeups
      while (available === 0) {
        Atomics.wait(this.tail, 0, tail, 100);
        head = Atomics.load(this.head, 0);
        tail = Atomics.load(this.tail, 0);
        available = this.getAvailableReadInternal(head, tail);
      }
    }

    const toRead = Math.min(dest.length, available);
    if (toRead === 0) return 0;

    for (let i = 0; i < toRead; i++) {
      dest[i] = this.data[(head + i) % this.capacity];
    }

    Atomics.store(this.head, 0, (head + toRead) % this.capacity);
    Atomics.notify(this.head, 0);

    return toRead;
  }

  getAvailableRead() {
    return this.getAvailableReadInternal(
      Atomics.load(this.head, 0),
      Atomics.load(this.tail, 0)
    );
  }

  getAvailableWrite() {
    return this.getAvailableWriteInternal(
      Atomics.load(this.head, 0),
      Atomics.load(this.tail, 0)
    );
  }

  getAvailableReadInternal(head, tail) {
    if (tail >= head) {
      return tail - head;
    } else {
      return this.capacity - head + tail;
    }
  }

  getAvailableWriteInternal(head, tail) {
    const available = this.getAvailableReadInternal(head, tail);
    return this.capacity - available - 1; 
  }
}

/**
 * SharedIPC: Manages bidirectional communication using two ring buffers in one SAB.
 */
class SharedIPC {
  constructor(sab, capacityPerDirection = 4096) {
    this.sab = sab;
    const headerSize = 8;
    const directionSize = headerSize + capacityPerDirection;

    this.rogueToRogomatic = new SharedRingBuffer(sab, 0, capacityPerDirection);
    this.rogomaticToRogue = new SharedRingBuffer(sab, directionSize, capacityPerDirection);
  }

  getStats(isRogomatic) {
    const offset = isRogomatic ? SharedIPC.ROGOMATIC_STATS_OFFSET : SharedIPC.ROGUE_STATS_OFFSET;
    const view = new Int32Array(this.sab, offset, 10);
    const stats = {
      hp: view[0],
      maxhp: view[1],
      str: view[2],
      gold: view[3],
      level: view[4],
      exp: view[5],
      explev: view[6],
      turns: view[7],
      geneid: view[8]
    };

    const stringView = new Uint8Array(this.sab, offset + 36, 64);
    let end = 0;
    while (end < 64 && stringView[end] !== 0) end++;
    if (end > 0) {
      stats.botState = new TextDecoder().decode(stringView.slice(0, end));
    }
    return stats;
  }

  writeStats(stats, isRogomatic) {
    const offset = isRogomatic ? SharedIPC.ROGOMATIC_STATS_OFFSET : SharedIPC.ROGUE_STATS_OFFSET;
    const view = new Int32Array(this.sab, offset, 10);
    
    if (stats.hp !== undefined) view[0] = stats.hp;
    if (stats.maxhp !== undefined) view[1] = stats.maxhp;
    if (stats.str !== undefined) view[2] = stats.str;
    if (stats.gold !== undefined) view[3] = stats.gold;
    if (stats.level !== undefined) view[4] = stats.level;
    if (stats.exp !== undefined) view[5] = stats.exp;
    if (stats.explev !== undefined) view[6] = stats.explev;
    if (stats.turns !== undefined) view[7] = stats.turns;
    if (stats.geneid !== undefined) view[8] = stats.geneid;

    if (stats.botState !== undefined) {
      const stringView = new Uint8Array(this.sab, offset + 36, 64);
      const encoded = new TextEncoder().encode(stats.botState.substring(0, 63));
      stringView.set(encoded);
      stringView[encoded.length] = 0;
    }
  }
}

SharedIPC.ROGUE_STATS_OFFSET = 10000;
SharedIPC.ROGOMATIC_STATS_OFFSET = 10100;

/**
 * HeadlessTerminal: A dummy terminal implementation for Web Workers.
 * Prevents emcurses/termlib.js from crashing when touching the DOM.
 */
class HeadlessTerminal {
  constructor(conf) {
    this.conf = conf || { rows: 24, cols: 80 };
    if (!this.conf.rows) this.conf.rows = 24;
    if (!this.conf.cols) this.conf.cols = 80;
    this.maxLines = this.conf.rows || 24;
    this.maxCols = this.conf.cols || 80;
    this.charBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.styleBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.lock = false;
    this.closed = false;
    this.cursorRow = 0;
    this.cursorCol = 0;
    this.lastRow = -1;
    this.lastCol = -1;
    this.inputQueue = [];
    if (conf) {
      if (conf.initHandler) this.initHandler = conf.initHandler;
      if (conf.handler) this.handler = conf.handler;
    }
    self.term = this; // Global for emcurses
  }
  open() { 
    if (this.initHandler) this.initHandler(); 
  }
  close() { this.closed = true; this.inputQueue = []; }
  pushInput(ch) {
    this.inputQueue.push(ch);
  }
  hasInput() { 
    return this.inputQueue.length > 0;
  }
  getKey() {
    return this.inputQueue.shift() || 0;
  }
  clear() {
    // Fill internal buffers with spaces
    for (let r = 0; r < this.maxLines; r++) {
      this.charBuf[r].fill(32);
      this.styleBuf[r].fill(0);
    }
    this.lastRow = -1;
    this.lastCol = -1;

    const clearAnsi = '\x1b[H\x1b[2J';
    if (self.isRogomatic) {
      self.postMessage({ type: 'stdout', message: clearAnsi, raw: true });
    } else {
      const ipc = self.ipc;
      if (ipc) {
        this.writeToPipe(ipc, clearAnsi);
      }
    }
  }

  setChar(ch, row, col, style) {
    if (row >= 0 && row < this.maxLines && col >= 0 && col < this.maxCols) {
      this.charBuf[row][col] = ch;
      this.styleBuf[row][col] = style;
      
      let ansi = '';
      if (row !== this.lastRow || col !== this.lastCol + 1) {
        ansi += `\x1b[${row + 1};${col + 1}H`;
      }
      
      if (style & 4) ansi += '\x1b[1m';
      if (style & 2) ansi += '\x1b[4m';
      if (style & 1) ansi += '\x1b[7m';
      ansi += String.fromCharCode(ch || 32);
      if (style !== 0) ansi += '\x1b[0m';
      
      this.lastRow = row;
      this.lastCol = col;
      
      if (self.isRogomatic) {
        self.postMessage({ type: 'stdout', message: ansi, raw: true });
      } else {
        const ipc = self.ipc;
        if (ipc) {
          this.writeToPipe(ipc, ansi);
        }
      }
    }
  }
  cursorSet(row, col) {
    this.cursorRow = row;
    this.cursorCol = col;

    // Sync internal state so next setChar knows where we are
    this.lastRow = row;
    this.lastCol = col - 1;

    if (self.isRogomatic) {
      const ansi = `\x1b[${row + 1};${col + 1}H`;
      self.postMessage({ type: 'stdout', message: ansi, raw: true });
    } else {
      const ipc = self.ipc;
      if (ipc) {
         this.writeToPipe(ipc, `\x1b[${row + 1};${col + 1}H`);
      }
    }
  }
  cursorOn() { }
  cursorOff() { }
  clear() {
    this.charBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    if (self.isRogomatic) {
      self.postMessage({ type: 'stdout', message: '\x1b[2J\x1b[H', raw: true });
    } else {
      const ipc = self.ipc;
      if (ipc) {
         this.writeToPipe(ipc, '\x1b[2J\x1b[H');
      }
    }
  }
  writeToPipe(ipc, str) {
    console.log("Rogue -> Rogomatic pipe write:", JSON.stringify(str));
    const data = new TextEncoder().encode(str);
    ipc.rogueToRogomatic.write(data, true);
  }
}

self.SharedIPC = SharedIPC;
self.SharedRingBuffer = SharedRingBuffer;
self.Terminal = HeadlessTerminal;
