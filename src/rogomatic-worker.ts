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
      (self as any).isRogomatic = true;

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
        onStatsUpdate: (stats: any) => {
          if (ipc) ipc.writeStats(stats, true);
        },
        wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const dest = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogueToRogomatic.read(dest, true); // BLOCKING READ
        },
        wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogomaticToRogue.write(src, true); // BLOCKING WRITE
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
          try {
            FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');
          } catch (e: any) {
            console.error('Rogomatic Worker: IDBFS mount failed:', e);
            self.postMessage({ type: 'fs_error', message: 'Failed to mount persistent storage.' });
          }

          console.log('Rogomatic Worker: Starting IDBFS sync...');
          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Rogomatic Worker: IDBFS syncfs(true) failed:', err);
              self.postMessage({ type: 'fs_error', message: 'Failed to synchronize persistent storage.' });
            } else {
              console.log('Rogomatic Worker: IDBFS synced');
            }

            // Clean up any stale lock files before starting
            try {
              const files = FS.readdir('/var/games/rogomatic');
              files.forEach((file: string) => {
                if (file.includes('Lock') || file.endsWith('.lck')) {
                  const fullPath = `/var/games/rogomatic/${file}`;
                  console.log(`Rogomatic Worker: Cleaning up stale lock file ${fullPath}`);
                  FS.unlink(fullPath);
                }
              });
            } catch (e) {
              console.warn('Rogomatic Worker: Error cleaning up lock files:', e);
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

            const Module = (self as any).Module;
            if (typeof Module._setenv === 'function') {
              console.log('Rogomatic Worker: Setting environment variables via _setenv...');
              const setenvHelper = (key: string, value: string) => {
                const keyPtr = Module.stackAlloc(key.length * 4 + 1);
                Module.stringToUTF8(key, keyPtr, key.length * 4 + 1);
                const valPtr = Module.stackAlloc(value.length * 4 + 1);
                Module.stringToUTF8(value, valPtr, value.length * 4 + 1);
                Module._setenv(keyPtr, valPtr, 1);
              };
              setenvHelper('USER', userName);
              setenvHelper('LOGNAME', userName);
            }

            console.log('Rogomatic Worker: Calling callMain...');
            try {
              (self as any).Module.callMain(['aa', '0', '0', userName]);
            } catch (e: any) {
              if (e && e.name !== 'ExitStatus' && e !== 'unwind') {
                console.error('Rogomatic Worker: Startup Error:', e);
              }
            }
          });
        },
        locateFile: (path: string) => {
          if (path.endsWith('.wasm')) {
            return '/rogoweb/wasm/' + path;
          }
          return path;
        },
        onExit: (status: number) => {
          console.log(`Rogomatic Worker: Exited with status ${status}`);
          self.postMessage({ type: 'exit', source: 'rogomatic', status });
        },
        print: (text: string) => {
          // Rogomatic stdout contains the VT100 stream
          self.postMessage({ type: 'stdout', source: 'rogomatic', message: text });
        },
        printErr: (text: string) => {
          console.error('Rogomatic stderr:', text);
          self.postMessage({ type: 'log', source: 'rogomatic', message: text, error: true });
        },
        syncFS: () => {
          console.log('Rogomatic Worker: Syncing FS to IDBFS...');
          return new Promise<void>((resolve) => {
            const FS = (self as any).Module.FS;
            if (FS && FS.syncfs) {
              FS.syncfs(false, (err: any) => {
                if (err) console.error('Rogomatic Worker: syncfs(false) failed:', err);
                else console.log('Rogomatic Worker: syncfs(false) complete');
                resolve();
              });
            } else {
              resolve();
            }
          });
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
