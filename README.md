# Rogoweb

**Rogoweb** is a modern, web-based port of the classic 1980 dungeon crawler **Rogue** and its legendary automated player, **Rog-O-Matic**. 

This project unites these two historic C codebases into a single repository, compiling them to WebAssembly (WASM) and running them entirely in the browser. It features a rich VT100-style terminal interface and live, high-fidelity telemetry.

---

## 📜 Origin and History

This repository was created by merging the original C source codes of:
*   **Rogue 5.4**: The definitive version of the foundational roguelike game, originally created by Michael Toy, Glenn Wichman, and Ken Arnold.
*   **Rog-O-Matic XIV**: The famous expert system created in 1981 by Michael Mauldin, Guy Jacobson, Andrew Appel, and Leonard Hamey at Carnegie Mellon University to autonomously play and beat Rogue.

### The Porting Process
Historically, Rog-O-Matic ran as a separate Unix process, playing Rogue by spawning it as a child process and communicating with it via standard `stdin`/`stdout` pipes. 

To bring this architecture to the web, we undertook the following engineering steps:
1.  **Consolidation**: Both codebases and a custom terminal emulation layer (`emcurses`) were brought into a single standalone repository.
2.  **WebAssembly Compilation**: We modified the `Makefile` and `Autotools` configurations to compile the C code using **Emscripten** (`emcc`).
3.  **Virtual IPC (Inter-Process Communication)**: Because browsers do not have traditional OS pipes or `fork()`/`exec()`, we replaced the standard `read()` and `write()` calls in the C code with custom `wasm_pipe_read()` and `wasm_pipe_write()` hooks.
4.  **Dual Worker Architecture**: Rogue and Rog-O-Matic run in separate, dedicated **Web Workers**. They communicate synchronously via a `SharedArrayBuffer` implementing a thread-safe ring buffer, perfectly mimicking the original Unix pipe behavior without blocking the browser's main UI thread.
5.  **High-Fidelity Telemetry**: Instead of scraping the terminal screen for stats (which causes overhead and parsing errors), the C code was modified to write internal engine state (HP, Gold, Level, AI Intent) directly into a dedicated region of the `SharedArrayBuffer`. The React-style UI passively polls this memory, providing real-time stats with zero performance overhead.

---

## 🎮 UI & Dashboard Guide

Rogoweb features a high-fidelity dashboard inspired by the **DEC VT100** terminal. The interface is split between the live terminal and a telemetry sidepanel.

### 1. Operator Panel (Top Bar)

Located at the top of the workspace, this panel controls the simulation state.

*   **Status Lights (LEDs)**:
    *   **L1 (Green)**: **GAME ACTIVE** – Lit when the Rogue game process is running in its worker.
    *   **L2 (Green)**: **AI ACTIVE** – Lit specifically when Rog-O-Matic has control of the input stream.
    *   **L3 (Green)**: **SYSTEM READY** – Indicates the simulation environment and SharedArrayBuffer are healthy.
    *   **L4 (Amber)**: **STANDBY/LOAD** – Lights up during initialization or background filesystem synchronization.
*   **User Input**: Set the Unix-style username for the session (affects high scores and save files).
*   **Mode Toggle**:
    *   **MANUAL PLAY**: You have full keyboard control over the terminal.
    *   **ROGOMATIC**: Hand over control to the AI.
*   **Control Buttons**:
    *   **START**: Launches the game processes.
    *   **PAUSE**: Freezes the simulation (useful for inspecting a difficult dungeon floor).
    *   **STOP**: Terminates the session and resets the workspace.

### 2. Telemetry Dashboard (Side Panel)

This panel provides a live "heartbeat" of the internal engine state without interrupting the terminal display.

*   **Monitor Stats**:
    *   **BOT STATE**: Displays the current AI intent (e.g., IDLE, RUNNING, EXPLORING, HEALING).
    *   **HP (Hit Points)**: A real-time health bar. It turns **Red** when critical (<30%) and **Amber** when wounded (<70%).
    *   **Dungeon Readouts**: Live values for Strength, Gold, Level, and Experience.
    *   **Generation**: In Rog-O-Matic mode, shows which "Generation" from the genetic algorithm is currently playing.
    *   **Turns**: Cumulative count of game turns processed.
*   **Gene Management**:
    *   **RESET GENE POOL**: Opens a dialog to re-initialize the genetic population. You can set the population size and an initial seed for evolution.
    *   **GENE STATS**: Displays detailed fitness data from the `GenePool544` file, showing which "genes" (strategy parameters) are performing best.
*   **Observer Log**: A diagnostic stream showing low-level system events, filesystem syncs, and worker status messages.
*   **Configuration**:
    *   **Random Seed**: Lock the game to a specific seed for reproducible "speedruns" or debugging.
    *   **Randomise Toggle**: When active, every new game will generate a fresh random seed.
    *   **Auto Restart**: Perfect for "headless" training; the system will automatically launch a new game 5 seconds after the previous one ends.

---

## 🏗️ Architecture

*   **`rogue/`**: The Rogue 5.4 C source code. Modified with `#ifdef ROGOWEB` blocks to support WASM IPC and stat reporting.
*   **`rogomatic/`**: The Rog-O-Matic XIV C source code. Adapted to communicate via virtual WASM pipes instead of OS-level pipes.
*   **`emcurses/`**: A custom implementation of `curses` designed for Emscripten, hooking into our VT100 frontend.
*   **`src/`**: The modern frontend built with **TypeScript**, **Vite**, **Tailwind CSS**, and **xterm.js**.
    *   `src/rogue-worker.ts` & `src/rogomatic-worker.ts`: Web Workers hosting the WASM instances.
    *   `src/ipc/ring-buffer.ts`: The `SharedArrayBuffer` implementation handling inter-worker pipes and shared stat memory.

---

## 🚀 How to Build and Run

### Prerequisites

To build this project, you need both modern web tools and C compilation tools:
1.  **Node.js** (v18 or higher) and `npm`.
2.  **Emscripten** (`emsdk`): The WASM compiler toolchain. Make sure `emcc` is in your `$PATH`.
3.  **Standard Build Tools**: `make`, `autoconf`, `automake` (required to compile the legacy C codebases).

### Setup & Compilation

1.  **Install JS Dependencies:**
    ```bash
    npm install
    ```

2.  **Compile the C code to WebAssembly:**
    This step runs `emmake` and compiles `emcurses`, `rogue`, and `rogomatic` into `.js` and `.wasm` files located in `public/wasm/`.
    ```bash
    npm run build:wasm
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Open the provided `localhost` URL in your browser. 
    
    *Note: The development server is configured with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers, which are strictly required by browsers to enable `SharedArrayBuffer`.*

### Building for Production

To create a static production build:
```bash
npm run build
```
The compiled files will be output to the `dist/` directory.

#### Hosting Notes (GitHub Pages)
Because this application relies on `SharedArrayBuffer`, your production web server **must** send cross-origin isolation headers. If you are deploying to a static host that doesn't allow custom headers (like GitHub Pages), this repository includes `coi-serviceworker`, which intercepts requests client-side to enforce the necessary isolation policies automatically.

---

## 🎮 Playing the Game

When you load the app, you will see the VT100 terminal interface and the telemetry dashboard.

*   **MANUAL PLAY**: You take control. Type commands directly into the terminal to play Rogue.
*   **ROGOMATIC (AUTO)**: Click "START" and watch as the legendary AI takes over, playing the game at blazing speeds while broadcasting its internal thoughts and statistics to the dashboard.

---

## ⚖️ License

The original Rogue and Rog-O-Matic codebases are distributed under their respective historical licenses (see `rogue/LICENSE.TXT` and `rogomatic/COPYING`). 

The web frontend, WASM bridge, and IPC tooling are provided as part of this modern port.
