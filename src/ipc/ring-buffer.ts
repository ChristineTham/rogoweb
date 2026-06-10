/**
 * SharedRingBuffer: A thread-safe ring buffer implementation using SharedArrayBuffer and Atomics.
 * Designed for bidirectional communication between Web Workers.
 */
export class SharedRingBuffer {
  private head: Int32Array;
  private tail: Int32Array;
  private data: Uint8Array;
  private capacity: number;

  /**
   * @param sab The SharedArrayBuffer to use.
   * @param offset The byte offset where this buffer starts in the SAB.
   * @param capacity The capacity of the data area (excluding header).
   */
  constructor(sab: SharedArrayBuffer, offset: number, capacity: number) {
    // Header uses 8 bytes: 4 for head, 4 for tail.
    this.head = new Int32Array(sab, offset, 1);
    this.tail = new Int32Array(sab, offset + 4, 1);
    this.data = new Uint8Array(sab, offset + 8, capacity);
    this.capacity = capacity;
  }

  /**
   * Writes data to the buffer.
   * @param src The data to write.
   * @param blocking If true, blocks until all data is written.
   * @returns The number of bytes written.
   */
  write(src: Uint8Array, blocking: boolean = false): number {
    let totalWritten = 0;

    while (totalWritten < src.length) {
      let head = Atomics.load(this.head, 0);
      let tail = Atomics.load(this.tail, 0);

      let available = this.getAvailableWriteInternal(head, tail);
      
      if (blocking && available === 0) {
        Atomics.wait(this.head, 0, head, 100); // 100ms timeout
        continue;
      }

      const toWrite = Math.min(src.length - totalWritten, available);
      if (toWrite === 0) break;

      for (let i = 0; i < toWrite; i++) {
        this.data[(tail + i) % this.capacity] = src[totalWritten + i];
      }

      Atomics.store(this.tail, 0, (tail + toWrite) % this.capacity);
      Atomics.notify(this.tail, 0);

      totalWritten += toWrite;
      if (!blocking) break;
    }

    return totalWritten;
  }

  /**
   * Reads data from the buffer.
   * @param dest The destination array.
   * @param blocking If true, blocks until data is available.
   * @returns The number of bytes read.
   */
  read(dest: Uint8Array, blocking: boolean = false): number {
    let head = Atomics.load(this.head, 0);
    let tail = Atomics.load(this.tail, 0);

    let available = this.getAvailableReadInternal(head, tail);
    
    if (blocking) {
      while (available === 0) {
        Atomics.wait(this.tail, 0, tail, 100); // 100ms timeout to avoid deadlocks
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

  getAvailableRead(): number {
    return this.getAvailableReadInternal(
      Atomics.load(this.head, 0),
      Atomics.load(this.tail, 0)
    );
  }

  getAvailableWrite(): number {
    return this.getAvailableWriteInternal(
      Atomics.load(this.head, 0),
      Atomics.load(this.tail, 0)
    );
  }

  private getAvailableReadInternal(head: number, tail: number): number {
    if (tail >= head) {
      return tail - head;
    } else {
      return this.capacity - head + tail;
    }
  }

  private getAvailableWriteInternal(head: number, tail: number): number {
    const available = this.getAvailableReadInternal(head, tail);
    return this.capacity - available - 1; // Leave 1 byte empty to distinguish full vs empty
  }
}

/**
 * SharedIPC: Manages bidirectional communication using two ring buffers in one SAB.
 */
export class SharedIPC {
  public readonly rogueToRogomatic: SharedRingBuffer;
  public readonly rogomaticToRogue: SharedRingBuffer;

  constructor(sab: SharedArrayBuffer, capacityPerDirection: number = 4096) {
    const headerSize = 8;
    const directionSize = headerSize + capacityPerDirection;

    if (sab.byteLength < directionSize * 2) {
      throw new Error(`SharedArrayBuffer too small. Expected at least ${directionSize * 2} bytes.`);
    }

    this.rogueToRogomatic = new SharedRingBuffer(sab, 0, capacityPerDirection);
    this.rogomaticToRogue = new SharedRingBuffer(sab, directionSize, capacityPerDirection);
  }

  static createSAB(capacityPerDirection: number = 4096): SharedArrayBuffer {
    const headerSize = 8;
    const directionSize = headerSize + capacityPerDirection;
    return new SharedArrayBuffer(directionSize * 2);
  }
}
