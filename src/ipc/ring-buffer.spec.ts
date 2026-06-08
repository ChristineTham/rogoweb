import { describe, it, expect, beforeEach } from 'vitest';
import { SharedRingBuffer } from './ring-buffer';

describe('SharedRingBuffer', () => {
  let sab: SharedArrayBuffer;
  let buffer: SharedRingBuffer;
  const CAPACITY = 1024;
  const HEADER_SIZE = 8; // 2 * 4 bytes for head/tail

  beforeEach(() => {
    // Capacity + header (2 * 4 bytes for head/tail)
    sab = new SharedArrayBuffer(CAPACITY + HEADER_SIZE);
    buffer = new SharedRingBuffer(sab, 0, CAPACITY);
  });

  it('should initialize correctly', () => {
    expect(buffer.getAvailableRead()).toBe(0);
    expect(buffer.getAvailableWrite()).toBe(CAPACITY - 1);
  });

  it('should write and read data', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const written = buffer.write(data);
    expect(written).toBe(5);
    expect(buffer.getAvailableRead()).toBe(5);

    const readTarget = new Uint8Array(5);
    const read = buffer.read(readTarget);
    expect(read).toBe(5);
    expect(readTarget).toEqual(data);
    expect(buffer.getAvailableRead()).toBe(0);
  });

  it('should handle partial reads/writes', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    buffer.write(data);

    const readTarget = new Uint8Array(3);
    const read = buffer.read(readTarget);
    expect(read).toBe(3);
    expect(readTarget).toEqual(new Uint8Array([1, 2, 3]));
    expect(buffer.getAvailableRead()).toBe(2);
  });

  it('should handle wrap-around', () => {
    // Fill almost to capacity
    const padding = new Uint8Array(CAPACITY - 10);
    buffer.write(padding);
    expect(buffer.getAvailableRead()).toBe(CAPACITY - 10);

    // Read it all
    const readPadding = new Uint8Array(CAPACITY - 10);
    buffer.read(readPadding);
    expect(buffer.getAvailableRead()).toBe(0);

    // Now head/tail are near the end. Write across boundary.
    const crossData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110]);
    // This should work because tail will wrap around
    const written = buffer.write(crossData);
    expect(written).toBe(11);
    
    const readTarget = new Uint8Array(11);
    const read = buffer.read(readTarget);
    expect(read).toBe(11);
    expect(readTarget).toEqual(crossData);
  });

  it('should report correct available space', () => {
     const data = new Uint8Array(500);
     buffer.write(data);
     expect(buffer.getAvailableWrite()).toBe(CAPACITY - 1 - 500);
     
     buffer.read(new Uint8Array(200));
     expect(buffer.getAvailableWrite()).toBe(CAPACITY - 1 - 300);
  });
});
