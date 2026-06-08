#include <stdio.h>
#include <string.h>
#include <stdint.h>

#ifdef ROGOWEB

/* 
 * These functions will be provided by JavaScript via Emscripten's 
 * runtime or linked as EXPORTED_FUNCTIONS that JS calls.
 * Actually, it's easier to define them here and have JS call them,
 * or have them call JS functions.
 * 
 * For 'wasm_pipe_read', the C code calls it. It needs to:
 * 1. Check JS for data.
 * 2. If no data and synchronous, use Atomics.wait (handled by JS or Emscripten).
 * 
 * However, the simplest way is to use EM_JS or EM_ASM to interface with the 
 * SharedArrayBuffer logic defined in Phase 1.
 */

#include <emscripten.h>

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

#endif
