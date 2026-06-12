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

      // IPC Polling loop for Rogomatic keystrokes
      const pollIPC = () => {
        const activeTerm = (self as any).term;
        if (activeTerm && ipc && ipc.rogomaticToRogue.getAvailableRead() > 0) {
          const buf = new Uint8Array(1);
          if (ipc.rogomaticToRogue.read(buf, false) === 1) {
            activeTerm.pushInput(buf[0]);
            if (activeTerm.handler) activeTerm.handler();
          }
        }
        setTimeout(pollIPC, 10);
      };
      pollIPC();

      const roguename = `Rog-O-Matic XIV for ${userName}`;
      const rogueopts = `name=${roguename},fruit=apricot,terse,noflush,noask,jump,step,nopassgo,inven=slow,seefloor`;
      (self as any).Module = {
        noInitialRun: true,
        ENV: {
          USER: userName,
          LOGNAME: userName,
          ROGUEOPTS: rogueopts
        },
        TerminalShim: (self as any).Terminal,
        wasm_pipe_read: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const dest = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogomaticToRogue.read(dest, true); // BLOCKING READ
        },
        wasm_pipe_write: (_fd: number, ptr: number, count: number) => {
          if (!ipc) return 0;
          const src = new Uint8Array((self as any).Module.HEAPU8.buffer, ptr, count);
          return ipc.rogueToRogomatic.write(src, true); // BLOCKING WRITE
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
          try {
            FS.mount(FS.filesystems.IDBFS, {}, '/var/games/rogomatic');
          } catch (e: any) {
            console.error('Rogue Worker: IDBFS mount failed:', e);
            self.postMessage({ type: 'fs_error', message: 'Failed to mount persistent storage.' });
          }

          console.log('Rogue Worker: Starting IDBFS sync...');
          FS.syncfs(true, (err: any) => {
            if (err) {
              console.error('Rogue Worker: IDBFS syncfs(true) failed:', err);
              self.postMessage({ type: 'fs_error', message: 'Failed to synchronize persistent storage.' });
            } else {
              console.log('Rogue Worker: IDBFS synced');
            }

            // Clean up any stale lock files before starting
            try {
              const files = FS.readdir('/var/games/rogomatic');
              files.forEach((file: string) => {
                if (file.includes('Lock') || file.endsWith('.lck')) {
                  const fullPath = `/var/games/rogomatic/${file}`;
                  console.log(`Rogue Worker: Cleaning up stale lock file ${fullPath}`);
                  FS.unlink(fullPath);
                }
              });
            } catch (e) {
              console.warn('Rogue Worker: Error cleaning up lock files:', e);
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

            const Module = (self as any).Module;
            if (typeof Module._setenv === 'function') {
              console.log('Rogue Worker: Setting environment variables via _setenv...');
              const setenvHelper = (key: string, value: string) => {
                const keyPtr = Module.stackAlloc(key.length * 4 + 1);
                Module.stringToUTF8(key, keyPtr, key.length * 4 + 1);
                const valPtr = Module.stackAlloc(value.length * 4 + 1);
                Module.stringToUTF8(value, valPtr, value.length * 4 + 1);
                Module._setenv(keyPtr, valPtr, 1);
              };
              setenvHelper('USER', userName);
              setenvHelper('LOGNAME', userName);
              setenvHelper('ROGUEOPTS', rogueopts);
            }

            console.log('Rogue Worker: Calling callMain...');
            try {
              (self as any).Module.callMain(['-n', userName]);
            } catch (e: any) {
              if (e && e.name !== 'ExitStatus' && e !== 'unwind') {
                console.error('Rogue Worker: Startup Error caught:', e);
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
          console.log(`Rogue Worker: Exited with status ${status}`);
          self.postMessage({ type: 'exit', source: 'rogue', status });
        },
        print: (text: string) => {
          console.log('Rogue stdout:', text);
          self.postMessage({ type: 'log', source: 'rogue', message: text });
        },
        printErr: (text: string) => {
          console.error('Rogue stderr:', text);
          self.postMessage({ type: 'log', source: 'rogue', message: text, error: true });
        },
        syncFS: () => {
          console.log('Rogue Worker: Syncing FS to IDBFS...');
          return new Promise<void>((resolve) => {
            const FS = (self as any).Module.FS;
            if (FS && FS.syncfs) {
              FS.syncfs(false, (err: any) => {
                if (err) console.error('Rogue Worker: syncfs(false) failed:', err);
                else console.log('Rogue Worker: syncfs(false) complete');
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

      importScripts('/rogoweb/wasm/rogue.js');
    }
  } catch (err) {
    console.error('Rogue Worker: Fatal initialization error:', err);
  }
};
