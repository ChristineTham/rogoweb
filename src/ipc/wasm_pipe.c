#include <stdio.h>
#include <string.h>
#include <stdint.h>

#include <emscripten.h>

EM_ASYNC_JS(void, trigger_syncfs, (), {
  return new Promise(function(resolve) {
    var syncFn = null;
    if (typeof self !== 'undefined' && self.syncFS) syncFn = self.syncFS;
    else if (typeof window !== 'undefined' && window.syncFS) syncFn = window.syncFS;
    else if (typeof Module !== 'undefined' && Module.syncFS) syncFn = Module.syncFS;

    if (syncFn) {
      var p = syncFn();
      if (p && p.then) {
        p.then(resolve);
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
});

/*
 * wasm_pipe_read:
 * Reads up to 'count' bytes from the virtual pipe into 'buf'.
 * This function is intended to replace blocking read(0, ...)
 */
int wasm_pipe_read(int fd, char *buf, int count) {
    /* 
     * We'll use EM_JS to call into the JavaScript IPC layer.
     * The JS layer will handle the SharedArrayBuffer and Atomics.wait if necessary.
     */
    return EM_ASM_INT({
        return Module['wasm_pipe_read']($0, $1, $2);
    }, fd, buf, count);
}

/*
 * wasm_pipe_write:
 * Writes 'count' bytes from 'buf' to the virtual pipe.
 */
int wasm_pipe_write(int fd, const char *buf, int count) {
    return EM_ASM_INT({
        return Module['wasm_pipe_write']($0, $1, $2);
    }, fd, buf, count);
}

#ifndef RGM_PLAYER
#include <curses.h>
#include "../../rogue/rogue.h"

void report_stats(void) {
    extern int level;
    EM_ASM({
        if (Module['onStatsUpdate']) {
            Module['onStatsUpdate']({
                hp: $0,
                maxhp: $1,
                str: $2,
                gold: $3,
                level: $4,
                exp: $5,
                explev: $6
            });
        }
    }, player._t._t_stats.s_hpt, player._t._t_stats.s_maxhp, 
       player._t._t_stats.s_str, purse, level, 
       player._t._t_stats.s_exp, player._t._t_stats.s_lvl);
}
#endif
