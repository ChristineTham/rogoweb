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
      const head = Atomics.load(this.head, 0);
      const tail = Atomics.load(this.tail, 0);

      const available = this.getAvailableWriteInternal(head, tail);
      
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
 * SharedIPC: Manages bidirectional communication and shared stats using ring buffers in one SAB.
 */
export class SharedIPC {
  public readonly rogueToRogomatic: SharedRingBuffer;
  public readonly rogomaticToRogue: SharedRingBuffer;
  public readonly sab: SharedArrayBuffer;

  // Offsets for the stats regions
  public static readonly ROGUE_STATS_OFFSET = 10000; // Well beyond the buffers
  public static readonly ROGOMATIC_STATS_OFFSET = 10100;
  
  // Field offsets within each stats block (4 bytes each)
  public static readonly STAT_HP = 0;
  public static readonly STAT_MAXHP = 4;
  public static readonly STAT_STR = 8;
  public static readonly STAT_GOLD = 12;
  public static readonly STAT_LEVEL = 16;
  public static readonly STAT_EXP = 20;
  public static readonly STAT_EXPLEV = 24;
  public static readonly STAT_TURNS = 28;
  public static readonly STAT_GENEID = 32;
  public static readonly STAT_BOT_STATE = 36; // String data starts here (max 64 bytes)

  constructor(sab: SharedArrayBuffer, capacityPerDirection: number = 4096) {
    this.sab = sab;
    const headerSize = 8;
    const directionSize = headerSize + capacityPerDirection;

    this.rogueToRogomatic = new SharedRingBuffer(sab, 0, capacityPerDirection);
    this.rogomaticToRogue = new SharedRingBuffer(sab, directionSize, capacityPerDirection);
  }

  static createSAB(): SharedArrayBuffer {
    // 2 ring buffers + stats area
    return new SharedArrayBuffer(16384); 
  }

  getStats(isRogomatic: boolean) {
    const offset = isRogomatic ? SharedIPC.ROGOMATIC_STATS_OFFSET : SharedIPC.ROGUE_STATS_OFFSET;
    const view = new Int32Array(this.sab, offset, 10); // Read 10 int32s
    const stats: any = {
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

    // Parse bot state string
    const stringView = new Uint8Array(this.sab, offset + 36, 64);
    let end = 0;
    while (end < 64 && stringView[end] !== 0) end++;
    if (end > 0) {
      stats.botState = new TextDecoder().decode(stringView.slice(0, end));
    }

    return stats;
  }

  writeStats(stats: any, isRogomatic: boolean) {
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
      stringView[encoded.length] = 0; // Null terminate
    }
  }
}
