/* Rogomatic Worker Entry Point (Classic Script) */
declare var Module: any;
declare var importScripts: (...args: string[]) => void;

let ipc: any = null;

self.onmessage = (e: MessageEvent) => {
  const { type, sab, userName } = e.data;

  if (type === 'init') {
    importScripts('/rogoweb/wasm/ipc-core.js');

    // Worker Polyfills for emcurses/termlib.js
    (self as any).window = self;
    (self as any).document = {
      createElement: () => ({ style: {}, appendChild: () => {} }),
      getElementById: () => null,
      all: null,
    };
    (self as any).navigator = { userAgent: 'WebWorker' };

    const SharedIPC = (self as any).SharedIPC;
    ipc = new SharedIPC(sab);

    (self as any).Module = {
      noInitialRun: true,
      wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const dest = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
        return ipc.rogueToRogomatic.read(dest);
      },
      wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
        return ipc.rogomaticToRogue.write(src);
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
