#!/bin/bash
# Test to verify if rogomatic has been copied to rogoweb/rogomatic

TARGET_DIR="rogoweb/rogomatic"
SOURCE_DIR="rogomatic"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR does not exist."
    exit 1
fi

# Check some key files
KEY_FILES=("src/main.c" "src/Makefile.am" "README.md")

for file in "${KEY_FILES[@]}"; do
    if [ ! -f "$TARGET_DIR/$file" ]; then
        echo "Error: $TARGET_DIR/$file is missing."
        exit 1
    fi
done

echo "Success: rogomatic has been correctly copied to rogoweb/rogomatic."
exit 0
