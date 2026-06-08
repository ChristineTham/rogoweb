#!/bin/bash
# Test to verify if rogue has been copied to rogoweb/rogue

TARGET_DIR="rogoweb/rogue"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR does not exist."
    exit 1
fi

# Check some key files
KEY_FILES=("main.c" "rogue.h" "Makefile.in")

for file in "${KEY_FILES[@]}"; do
    if [ ! -f "$TARGET_DIR/$file" ]; then
        echo "Error: $TARGET_DIR/$file is missing."
        exit 1
    fi
done

echo "Success: rogue has been correctly copied to rogoweb/rogue."
exit 0
