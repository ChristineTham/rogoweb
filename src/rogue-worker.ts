/* Rogue Worker Entry Point (Classic Script) */

let ipc_data: any = null;

self.onmessage = (e: MessageEvent) => {
  const { type, sab, userName } = e.data;

  if (type === 'init') {
    // We can't import SharedIPC directly in a classic worker if it's an ESM module.
    // However, since Vite bundles this, we need a way to access the RingBuffer logic.
    // For now, I'll use the message data to initialize and assume logic is injected or bundled.
    
    (self as any).Module = {
      noInitialRun: true,
      wasm_pipe_read: (fd: number, ptr: number, count: number) => {
        // Placeholder for logic - will refine in next turn if SharedIPC is needed here
        return 0; 
      },
      wasm_pipe_write: (fd: number, ptr: number, count: number) => {
        return 0;
      },
      onRuntimeInitialized: () => {
        console.log('Rogue Worker: WASM Runtime Initialized');
        (self as any).Module.callMain(['-n', userName]);
      },
      print: (text: string) => console.log('Rogue stdout:', text),
      printErr: (text: string) => console.error('Rogue stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogue.js');
  }
};
