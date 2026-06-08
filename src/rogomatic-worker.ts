/* Rogomatic Worker Entry Point (Classic Script) */
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
        console.log('Rogomatic Worker: WASM Runtime Initialized');
        Module.callMain(['ZZ', '0', '0', userName]);
      },
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/rogoweb/wasm/' + path;
        }
        return path;
      },
      print: (text: string) => console.log('Rogomatic stdout:', text),
      printErr: (text: string) => console.error('Rogomatic stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogomatic.js');
  }
};
