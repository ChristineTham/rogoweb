# Product Guide

## Initial Concept
A pure-web, client-side port of the classic C-based Rogue (5.4) and its automated player, Rog-O-Matic. The project leverages WebAssembly (WASM), Emscripten, and Web Workers to run the original C binaries entirely in the browser without a backend.

## Target Audience & Use Case
This project appeals to a broad spectrum of users:
- **Classic Players**: Nostalgic gamers who want a frictionless way to play Rogue directly in their browser.
- **AI/Bot Enthusiasts**: Developers and researchers interested in observing and analyzing Rogomatic's historical "belligerent expert system" and genetic programming logic.
- **Technical Showcase**: A demonstration of advanced web technologies, specifically compiling legacy C applications to WASM, utilizing Web Workers, and simulating UNIX pipes via `SharedArrayBuffer` for Inter-Process Communication (IPC).

## UI/UX Approach
- **VT100 Hardware Interface**: The frontend mimics the physical hardware of a classic DEC VT100 terminal. It features a central `xterm.js` terminal emulator for gameplay, surrounded by an industrial-style bezel with responsive status indicators and statistics panels. This dashboard provide deep insights, displaying real-time statistics, inventory status, and visualizations of Rogomatic's gene pool and long-term memory.

## Data Persistence Strategy
- **Layered Storage System**:
  - **Local Browser Storage**: Core persistence will rely on Emscripten's IndexedDB File System (`IDBFS`) to seamlessly save standard files (saves, score files, `GenePool`, `ltm`).
  - **Import/Export System**: To mitigate browser data clearance, users will be able to manually download and upload their save states and genetic data.
  - **Cloud Sync Ready**: The storage architecture will be abstracted to allow for future backend integration (e.g., Supabase) to enable features like global leaderboards or cross-device gene pool syncing.