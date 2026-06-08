/* Rogomatic Worker Entry Point (Classic Script) */
declare var Module: any;
declare var importScripts: (...args: string[]) => void;

let ipc: any = null;

self.onmessage = (e: MessageEvent) => {
  try {
    const { type, sab, userName } = e.data;
    console.log('Rogomatic Worker: received message', type);

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
          return ipc.rogueToRogomatic.read(dest, true); // BLOCKING READ
        },
        wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogomaticToRogue.write(src);
        },
        onRuntimeInitialized: () => {
          console.log('Rogomatic Worker: WASM Runtime Initialized');

          const FS = (self as any).Module.FS;
          const mkdirSync = (path: string) => {
            try {
              FS.mkdir(path);
              console.log(`Rogomatic Worker: Created directory ${path}`);
            } catch (e: any) {
              if (e.errno !== 20) { // 20 is EEXIST
                 console.warn(`Rogomatic Worker: mkdir ${path} info:`, e.message);
              }
            }
          };

          mkdirSync('/var');
          mkdirSync('/var/games');
          mkdirSync('/var/games/rogomatic');

          console.log('Rogomatic Worker: Mounting IDBFS...');
          FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');

          console.log('Rogomatic Worker: Starting IDBFS sync...');
          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Rogomatic Worker: IDBFS syncfs(true) failed:', err);
            } else {
              console.log('Rogomatic Worker: IDBFS synced');
            }

            // Create critical files if they don't exist to prevent C crashes
            const criticalFiles = [
              '/var/games/rogomatic/GeneLog544',
              '/var/games/rogomatic/GenePool544',
              '/var/games/rogomatic/ltm544',
              '/var/games/rogomatic/rgmdelta5.4.4'
            ];
            criticalFiles.forEach(file => {
              try {
                if (!FS.analyzePath(file).exists) {
                  console.log(`Rogomatic Worker: Creating empty file ${file}`);
                  FS.writeFile(file, '');
                }
              } catch (e) {
                console.error(`Rogomatic Worker: Error checking/creating ${file}:`, e);
              }
            });

            console.log('Rogomatic Worker: Calling callMain...');
            (self as any).Module.callMain(['aa', '0', '0', userName]);
          });
        },
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/rogoweb/wasm/' + path;
          }
          return path;
        },
        print: (text: string) => console.log('Rogomatic stdout:', text),
        printErr: (text: string) => console.error('Rogomatic stderr:', text),
        syncFS: () => {
          console.log('Rogomatic Worker: Syncing FS to IDBFS...');
          const FS = (self as any).Module.FS;
          if (FS && FS.syncfs) {
            FS.syncfs(false, (err: any) => {
              if (err) console.error('Rogomatic Worker: syncfs(false) failed:', err);
              else console.log('Rogomatic Worker: syncfs(false) complete');
            });
          }
        }
      };

      // Ensure it's available globally for EM_ASM
      (self as any).syncFS = (self as any).Module.syncFS;

      importScripts('/rogoweb/wasm/rogomatic.js');
    }
  } catch (err) {
    console.error('Rogomatic Worker: Fatal initialization error:', err);
  }
};
