/* Rogomatic Worker Entry Point (Classic Script) */

self.onmessage = (e: MessageEvent) => {
  const { type, sab, userName } = e.data;

  if (type === 'init') {
    (self as any).Module = {
      noInitialRun: true,
      wasm_pipe_read: (fd: number, ptr: number, count: number) => {
        return 0; 
      },
      wasm_pipe_write: (fd: number, ptr: number, count: number) => {
        return 0;
      },
      onRuntimeInitialized: () => {
        console.log('Rogomatic Worker: WASM Runtime Initialized');
        (self as any).Module.callMain(['ZZ', '0', '0', userName]);
      },
      print: (text: string) => console.log('Rogomatic stdout:', text),
      printErr: (text: string) => console.error('Rogomatic stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogomatic.js');
  }
};
