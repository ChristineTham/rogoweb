/* Rogue Worker Entry Point (Classic Script) */
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
    (self as any).ipc = ipc;

    const term = new ((self as any).Terminal)();
    term.ipc = ipc;

    (self as any).Module = {
      noInitialRun: true,
      ENV: { USER: userName, LOGNAME: userName },
      TerminalShim: (self as any).Terminal,
      wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const dest = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
        return ipc.rogomaticToRogue.read(dest, true); // BLOCKING READ
      },
      wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
        if (!ipc) return 0;
        const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
        return ipc.rogueToRogomatic.write(src);
      },
      onRuntimeInitialized: () => {
        console.log('Rogue Worker: WASM Runtime Initialized');
        
        const FS = (self as any).Module.FS;
        try {
          // Ensure directory structure exists
          FS.mkdir('/var');
          FS.mkdir('/var/games');
          FS.mkdir('/var/games/rogomatic');
        } catch (e) {
          // ignore if directory already exists
        }

        // Mount IDBFS to the rogomatic data directory
        FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');

        // Sync from IndexedDB to the virtual filesystem
        FS.syncfs(true, (err: any) => {
          if (err) {
            console.error('Rogue Worker: IDBFS syncfs(true) failed:', err);
          } else {
            console.log('Rogue Worker: IDBFS synced');
          }
          // Start Rogue after FS is ready
          (self as any).Module.callMain(['-n', userName]);
        });
      },
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/rogoweb/wasm/' + path;
        }
        return path;
      },
      print: (text: string) => console.log('Rogue stdout:', text),
      printErr: (text: string) => console.error('Rogue stderr:', text),
    };

    importScripts('/rogoweb/wasm/rogue.js');
  }
};
