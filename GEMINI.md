# Rogoweb

A project focused on porting the classic dungeon crawler **Rogue** and its automated player, **Rog-O-Matic**, to a web application.

## Project Components

- **rogomatic/**: The automated Rogue player (based on the original 1985 source).
- **rogue/**: A modified version of Rogue 5.4 specifically compatible with Rog-O-Matic.

## Technology Stack

- **Language**: C (standard and K&R styles)
- **Library**: `curses`/`ncurses` for terminal graphics.
- **Build System**: Autotools (`automake`, `autoconf`) and traditional Makefiles.
- **Environment**: Unix-like systems (Linux, macOS/Darwin).

## Building and Running

### Rogue (the game)

Located in `rogue/`.

1. `cd rogue`
2. `./bootstrap` (if `configure` is missing)
3. `./configure`
4. `make`
5. Run with `./rogue54`

### Rog-O-Matic (the player)

Located in `rogomatic/`.

1. `cd rogomatic`
2. `./bootstrap` (if `configure` is missing)
3. `./configure`
4. `make`
5. Run with `./src/rogomatic`

**Note**: Rog-O-Matic expects Rogue to be in the path or a specific location. By default, it looks in `/usr/local/bin`. See `rogomatic/NEWS` for detailed installation and setup instructions.

## Development Conventions

- **VT100 Emulation**: The project relies heavily on VT100 terminal emulation. A custom `terminfo` file is provided in `rogomatic/src/vt100` to work around scrolling bugs.
- **Historical Source**: Much of the code is historical. Avoid large-scale refactorings that might break the delicate interaction between the player and the game.
- **Permissions**: Some features (like score files and gene pools) expect to live in `/var/games/rogomatic/` and require specific group permissions (`games`).

## Key Files & Directories

- `rogomatic/src/`: Core logic for the automated player (strategy, tactics, memory).
- `rogomatic/doc/`: Historical documentation and knowledge base for Rog-O-Matic.
- `rogue/rogue.h`: Main header for the Rogue game.
- `rogomatic/NEWS`: Comprehensive guide on installation, debugging, and project philosophy.
- `rogomatic/TODO`: Current bugs and feature requests.
