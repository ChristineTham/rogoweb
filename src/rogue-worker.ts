/* Rogue Worker Entry Point (Classic Script) */
declare var Module: any;
declare var importScripts: (...args: string[]) => void;

self.onmessage = (e: MessageEvent) => {
  const { type, userName } = e.data;

  if (type === 'init') {
    (self as any).Module = {
      noInitialRun: true,
      wasm_pipe_read: (_fd: number, _ptr: number, _count: number) => {
        return 0; 
      },
      wasm_pipe_write: (_fd: number, _ptr: number, _count: number) => {
        return 0;
      },
      onRuntimeInitialized: () => {
        console.log('Rogue Worker: WASM Runtime Initialized');
        Module.callMain(['-n', userName]);
      },
      print: (text: string) => console.log('Rogue stdout:', text),
      printErr: (text: string) => console.error('Rogue stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogue.js');
  }
};
