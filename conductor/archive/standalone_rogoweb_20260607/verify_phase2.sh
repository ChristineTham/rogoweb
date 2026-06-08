#!/bin/bash
# Test to verify Phase 2: Build Configuration Updates

# 1. Rogomatic build scripts
if [ ! -f "rogoweb/rogomatic/src/Makefile.wasm" ]; then
    echo "Error: rogoweb/rogomatic/src/Makefile.wasm is missing."
    exit 1
fi
if [ ! -f "rogoweb/rogomatic/src/install.h" ]; then
    echo "Error: rogoweb/rogomatic/src/install.h is missing."
    exit 1
fi

# 2. Rogue build scripts
if [ ! -f "rogoweb/rogue/Makefile.wasm" ]; then
    echo "Error: rogoweb/rogue/Makefile.wasm is missing."
    exit 1
fi
if ! grep -q "../public/wasm/rogue" "rogoweb/rogue/Makefile.wasm"; then
    echo "Error: rogoweb/rogue/Makefile.wasm does not point to public wasm directory."
    exit 1
fi

# 3. Main frontend logic
if ! grep -q "rogoweb-mode" "rogoweb/src/main.ts"; then
    echo "Error: rogoweb/src/main.ts is missing mode switching logic."
    exit 1
fi

echo "Success: Phase 2 configurations verified."
exit 0
