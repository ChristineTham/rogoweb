/* Rogue Worker Entry Point (Classic Script) */
declare var Module: any;
declare var importScripts: (...args: string[]) => void;

let ipc: any = null;

self.onmessage = (e: MessageEvent) => {
  try {
    const { type, sab, userName } = e.data;
    console.log('Rogue Worker: received message', type);

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
          const mkdirSync = (path: string) => {
            try {
              FS.mkdir(path);
              console.log(`Rogue Worker: Created directory ${path}`);
            } catch (e: any) {
              if (e.errno !== 20) { // 20 is EEXIST
                 console.warn(`Rogue Worker: mkdir ${path} info:`, e.message);
              }
            }
          };

          mkdirSync('/var');
          mkdirSync('/var/games');
          mkdirSync('/var/games/rogomatic');

          console.log('Rogue Worker: Mounting IDBFS...');
          FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');

          console.log('Rogue Worker: Starting IDBFS sync...');
          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Rogue Worker: IDBFS syncfs(true) failed:', err);
            } else {
              console.log('Rogue Worker: IDBFS synced');
            }

            const scoreFile = '/var/games/rogomatic/rogue.scr';
            try {
              if (!FS.analyzePath(scoreFile).exists) {
                console.log(`Rogue Worker: Creating empty file ${scoreFile}`);
                FS.writeFile(scoreFile, '');
              }
            } catch (e) {
              console.error(`Rogue Worker: Error checking/creating ${scoreFile}:`, e);
            }

            console.log('Rogue Worker: Calling callMain...');
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
        syncFS: () => {
          console.log('Rogue Worker: Syncing FS to IDBFS...');
          const FS = (self as any).Module.FS;
          if (FS && FS.syncfs) {
            FS.syncfs(false, (err: any) => {
              if (err) console.error('Rogue Worker: syncfs(false) failed:', err);
              else console.log('Rogue Worker: syncfs(false) complete');
            });
          }
        }
      };

      // Ensure it's available globally for EM_ASM
      (self as any).syncFS = (self as any).Module.syncFS;

      importScripts('/rogoweb/wasm/rogue.js');
    }
  } catch (err) {
    console.error('Rogue Worker: Fatal initialization error:', err);
  }
};
