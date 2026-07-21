# Poke-ter

An infinite-world, multiplayer, real-time procedural monster catching and roaming game built with TypeScript, HTML Canvas, and Node.js WebSockets.

---

##  Core Features

- **Infinite Procedural World**: Real-time deterministic chunk generation using noise maps and seed values.
- **Seamless Multiplayer**: High-performance WebSocket-based server synchronization supporting multiple maps, real-time broadcasts, and dynamic player joins/leaves.
- **High-Fidelity Movement Synchronization**: Frame-rate independent position tracking utilizing collision-resolved client coordinates matched with raw keypress inputs for zero-jitter, latency-resilient overworld navigation.
- **Modular Game Architecture**: Clear separation of concerns between client rendering, server-side simulation, and shared deterministic libraries.

---

##  Project Structure

```text
├── client/          # Frontend client application (Vite, HTML Canvas, Game Engine)
│   ├── src/
│   │   ├── engine/       # Custom lightweight game engine (Physics, Input, Camera, Audio, Render Loop)
│   │   ├── game/
│   │   │   ├── entities/  # Player, other players, and overworld entities
│   │   │   ├── network/   # NetworkClient WebSocket connector and packet handler
│   │   │   ├── scenes/    # Scene definitions (e.g., OverworldScene, BattleScene)
│   │   │   └── ui/        # Custom game UI overlay managers
│   │   └── main.ts       # Application entry point & loop bootstrapper
├── server/          # Backend game & asset server (Express, ws, Node.js)
│   ├── src/
│   │   ├── index.ts      # Server initialization and Vite middleware binding
│   │   ├── game.ts       # GameState session manager and map routing logic
│   │   ├── handlers.ts   # Modular WebSocket network packet handlers
│   │   └── types.ts      # Internal server type definitions
└── shared/          # Common library shared between client and server
    ├── src/
        ├── index.ts      # Unified exports interface
        ├── types.ts      # Shared poke-ter models and data interfaces
        ├── constants.ts  # System-wide gameplay constants (speeds, grid sizes)
        ├── packets.ts    # Strongly typed network packet structures
        ├── math.ts       # Vector mathematics and coordinate helpers
        └── worldgen.ts   # Deterministic chunk generation algorithm
```

---

##  Recent Synchronization & Stability Enhancements

We recently implemented several critical client-server synchronization improvements to eliminate latency bottlenecks and server-client drift:

1. **Client ID Parsing Fix**: Solved packet parsing failures (`this.networkClient?.getId is not a function`) by binding a robust unique identifier accessor directly to the `NetworkClient` engine instance.
2. **Hybrid Client-Authoritative Position Sync**: 
   - Extended `PlayerInputPacket` to include optional client position details (`{ x, y }`).
   - Client resolves all physical tile collisions locally and shares the smooth, frame-rate independent position with the server.
   - The server handles this hybrid packet by trusting the resolved client position under normal conditions while retaining safety fallback movement calculations.
3. **Movement Speeds Unified**: Synchronized movement physics across client-side prediction and server-side validation using shared constants (`PLAYER_WALK_SPEED` and `PLAYER_SPRINT_SPEED`).

---

##  Getting Started

### Development Mode
Runs Vite dev server alongside the WebSocket server with hot reloading enabled on both sides.
```bash
npm run dev
```

### Production Build
Compiles all client, server, and shared source files into optimized distribution packages.
```bash
npm run build
```

### Production Start
Launches the full-stack server serving the production client assets.
```bash
npm run start
```

