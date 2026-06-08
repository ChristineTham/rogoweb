#include <emscripten.h>
#include <stdio.h>
#include <string.h>

extern int wasm_pipe_read(int fd, char *buf, int count);
extern int wasm_pipe_write(int fd, const char *buf, int count);

int main(int argc, char *argv[]) {
    printf("WASM IPC Test Module Started. Args: %d\n", argc);
    for (int i = 0; i < argc; i++) {
        printf("  argv[%d]: %s\n", i, argv[i]);
    }

    if (argc > 1 && strcmp(argv[1], "sender") == 0) {
        printf("Role: SENDER. Sending 'HELLO FROM WORKER'...\n");
        const char *msg = "HELLO FROM WORKER";
        int written = wasm_pipe_write(1, msg, strlen(msg));
        printf("Written: %d bytes.\n", written);
    } 
    else if (argc > 1 && strcmp(argv[1], "receiver") == 0) {
        printf("Role: RECEIVER. Waiting for data...\n");
        char buf[64];
        memset(buf, 0, 64);
        int read = wasm_pipe_read(0, buf, 63);
        printf("Read: %d bytes. Content: '%s'\n", read, buf);
    }
    else {
        printf("Role: UNKNOWN. Usage: ipc_test [sender|receiver]\n");
    }

    return 0;
}
