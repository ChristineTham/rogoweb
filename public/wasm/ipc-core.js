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
  write(src) {
    const head = Atomics.load(this.head, 0);
    const tail = Atomics.load(this.tail, 0);

    const available = this.getAvailableWriteInternal(head, tail);
    const toWrite = Math.min(src.length, available);

    if (toWrite === 0) return 0;

    for (let i = 0; i < toWrite; i++) {
      this.data[(tail + i) % this.capacity] = src[i];
    }

    Atomics.store(this.tail, 0, (tail + toWrite) % this.capacity);
    Atomics.notify(this.tail, 0);

    return toWrite;
  }

  /**
   * Reads data from the buffer.
   * @returns The number of bytes read.
   */
  read(dest) {
    const head = Atomics.load(this.head, 0);
    const tail = Atomics.load(this.tail, 0);

    const available = this.getAvailableReadInternal(head, tail);
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
    const headerSize = 8;
    const directionSize = headerSize + capacityPerDirection;

    this.rogueToRogomatic = new SharedRingBuffer(sab, 0, capacityPerDirection);
    this.rogomaticToRogue = new SharedRingBuffer(sab, directionSize, capacityPerDirection);
  }
}

/**
 * HeadlessTerminal: A dummy terminal implementation for Web Workers.
 * Prevents emcurses/termlib.js from crashing when touching the DOM.
 */
class HeadlessTerminal {
  constructor(conf) {
    console.log('HeadlessTerminal initialized', conf);
    this.conf = conf || { rows: 24, cols: 80 };
    if (!this.conf.rows) this.conf.rows = 24;
    if (!this.conf.cols) this.conf.cols = 80;
    this.maxLines = this.conf.rows || 24;
    this.maxCols = this.conf.cols || 80;
    this.charBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.styleBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
    this.lock = false;
    this.closed = false;
  }
  open() { if (this.initHandler) this.initHandler(); }
  close() { this.closed = true; }
  hasInput() { return false; }
  getKey() { return 0; }
  setChar(ch, row, col, style) {
    if (row >= 0 && row < this.maxLines && col >= 0 && col < this.maxCols) {
      this.charBuf[row][col] = ch;
      this.styleBuf[row][col] = style;
    }
  }
  cursorSet(row, col) { }
  cursorOn() { }
  cursorOff() { }
  clear() {
    this.charBuf = Array.from({ length: this.maxLines }, () => Array(this.maxCols).fill(0));
  }
}

self.SharedIPC = SharedIPC;
self.SharedRingBuffer = SharedRingBuffer;
self.Terminal = HeadlessTerminal;
