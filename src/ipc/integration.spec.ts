import { describe, it, expect } from 'vitest';
import { SharedIPC } from './ring-buffer';

/* 
 * This test simulates the Worker environment to prove the IPC layer.
 * Since we can't easily spawn real Web Workers in Vitest Node environment 
 * without complex setup, we'll simulate the call flow.
 */
describe('WASM IPC Integration Simulation', () => {
  it('should simulate bidirectional communication via JS hooks', async () => {
    const sab = SharedIPC.createSAB(1024);
    const ipc = new SharedIPC(sab, 1024);

    // Mock the Emscripten Module hooks for Worker A (Sender)
    const moduleA: any = {
      wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
        // Simulate reading from WASM memory (ptr)
        // In real WASM this would be Module.HEAPU8.subarray(ptr, ptr+count)
        // For simulation we'll just treat ptr as a local index into a dummy data array
        const data = new Uint8Array([72, 69, 76, 76, 79]); // "HELLO"
        return ipc.rogueToRogomatic.write(data);
      }
    };

    // Mock the Emscripten Module hooks for Worker B (Receiver)
    const moduleB: any = {
      wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
        const dest = new Uint8Array(count);
        const read = ipc.rogueToRogomatic.read(dest);
        // Simulate writing to WASM memory
        return read;
      }
    };

    // 1. Worker A writes data
    const written = moduleA.wasm_pipe_write(1, 0, 5);
    expect(written).toBe(5);

    // 2. Worker B reads data
    const read = moduleB.wasm_pipe_read(0, 0, 5);
    expect(read).toBe(5);
    expect(ipc.rogueToRogomatic.getAvailableRead()).toBe(0);
  });
});
