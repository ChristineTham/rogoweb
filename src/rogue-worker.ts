import { SharedIPC } from './ipc/ring-buffer';

/**
 * Rogue Worker Entry Point
 */

// Placeholder for Emscripten Module
declare var Module: any;
declare var importScripts: (...args: string[]) => void;

let ipc: SharedIPC | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, sab, userName } = e.data;

  if (type === 'init') {
    ipc = new SharedIPC(sab);

    // Define the C hooks before loading the WASM
    (self as any).Module = {
      noInitialRun: true,
      wasm_pipe_read: (fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const dest = new Uint8Array(Module.HEAPU8.buffer, ptr, count);
        // Rogue reads from Rogomatic
        return ipc.rogomaticToRogue.read(dest);
      },
      wasm_pipe_write: (fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const src = new Uint8Array(Module.HEAPU8.buffer, ptr, count);
        // Rogue writes to Rogomatic
        return ipc.rogueToRogomatic.write(src);
      },
      onRuntimeInitialized: () => {
        console.log('Rogue Worker: WASM Runtime Initialized');
        // Trigger main with arguments
        const args = ['-n', userName];
        Module.callMain(args);
      },
      print: (text: string) => console.log('Rogue stdout:', text),
      printErr: (text: string) => console.error('Rogue stderr:', text),
    };

    import(/* @vite-ignore */ '/rogoweb/wasm/rogue.js');
  }
};
