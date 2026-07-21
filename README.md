# poke-ter
Roam and catch monsters. heh.

## Project Structure

This project has been restructured into a clean, modular, and modern full-stack TypeScript application:

```text
├── client/          # Frontend client application (Vite, TypeScript, HTML Canvas game engine)
├── server/          # Backend game and asset server (Express, WS, TypeScript)
│   ├── src/
│   │   ├── index.ts     # Main bootstrap script (Server initialization & Vite middleware)
│   │   ├── game.ts      # GameState manager class for player sessions and broadcasts
│   │   ├── handlers.ts  # Modularized WebSocket packet routing logic
│   │   └── types.ts     # Internal server type definitions
├── shared/          # Common library containing shared game mechanics, types, and constants
│   └── src/
│       ├── index.ts     # Unified exports interface
│       ├── types.ts     # Shared Poke-ter models and interface definitions
│       ├── constants.ts # System-wide game constants
│       ├── packets.ts   # Strongly typed network communication packets
│       ├── math.ts      # Vector maths and grid operations
│       └── worldgen.ts  # Deterministic infinite chunk world generator
```

## Running the Project

* **Development Mode (Vite & Hot Reloading)**: `npm run dev`
* **Production Build**: `npm run build`
* **Production Run**: `npm run start`
