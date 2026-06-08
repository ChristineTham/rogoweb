import { SharedIPC } from './ipc/ring-buffer';

/**
 * Rogomatic Worker Entry Point
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
        // Rogomatic reads from Rogue
        return ipc.rogueToRogomatic.read(dest);
      },
      wasm_pipe_write: (fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const src = new Uint8Array(Module.HEAPU8.buffer, ptr, count);
        // Rogomatic writes to Rogue
        return ipc.rogomaticToRogue.write(src);
      },
      onRuntimeInitialized: () => {
        console.log('Rogomatic Worker: WASM Runtime Initialized');
        // Trigger main with arguments: [pipe_chars, pid, options, name]
        // In standalone WASM, setup.c bypasses findscore and expects these.
        const args = ['ZZ', '0', '0', userName];
        Module.callMain(args);
      },
      print: (text: string) => console.log('Rogomatic stdout:', text),
      printErr: (text: string) => console.error('Rogomatic stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogomatic.js');
  }
};
