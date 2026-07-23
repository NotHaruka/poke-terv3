# Poke-ter

An infinite-world, multiplayer, real-time procedural monster catching and roaming game built with TypeScript, HTML Canvas, and Node.js WebSockets.

---

## Core Features

- **Infinite Procedural World**: Real-time deterministic chunk generation using noise maps and seed values.
- **Seamless Multiplayer**: High-performance WebSocket-based server synchronization supporting multiple maps, real-time broadcasts, and dynamic player joins/leaves.
- **High-Fidelity Movement Synchronization**: Frame-rate independent position tracking utilizing collision-resolved client coordinates matched with raw keypress inputs for zero-jitter, latency-resilient overworld navigation.
- **Modular Game Architecture**: Clear separation of concerns between client rendering, server-side simulation, and shared deterministic libraries.

---

## Project Structure

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

## Recent Synchronization & Stability Enhancements

We recently implemented several critical client-server synchronization improvements to eliminate latency bottlenecks and server-client drift:

1. **Client ID Parsing Fix**: Solved packet parsing failures (`this.networkClient?.getId is not a function`) by binding a robust unique identifier accessor directly to the `NetworkClient` engine instance.
2. **Hybrid Client-Authoritative Position Sync**: 
   - Extended `PlayerInputPacket` to include optional client position details (`{ x, y }`).
   - Client resolves all physical tile collisions locally and shares the smooth, frame-rate independent position with the server.
   - The server handles this hybrid packet by trusting the resolved client position under normal conditions while retaining safety fallback movement calculations.
3. **Movement Speeds Unified**: Synchronized movement physics across client-side prediction and server-side validation using shared constants (`PLAYER_WALK_SPEED` and `PLAYER_SPRINT_SPEED`).

---

## Getting Started

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

---

## Android Export & Mobile Porting Guide (Capacitor)

Since Poke-ter's frontend client is a compiled static web app (`dist/client/`), you can easily wrap it into a high-performance native Android application using **Capacitor**. This completes **Milestone 5**.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed
- [Android Studio](https://developer.android.com/studio) installed on your system (with Android SDK)

### 2. Setup Capacitor in the Client Directory
Navigate to your `client/` directory and install the Capacitor CLI and Core dependencies:
```bash
cd client
npm install @capacitor/core @capacitor/cli
```

### 3. Initialize Capacitor
Initialize Capacitor with your app name and bundle ID. Ensure the web asset directory is set to `dist/client`:
```bash
npx cap init "Poke-ter" "com.poketer.app" --web-dir=../dist/client
```

### 4. Add the Android Platform
Install the Capacitor Android library and add the platform:
```bash
npm install @capacitor/android
npx cap add android
```

### 5. Build and Sync
Whenever you build your frontend game client, sync the compiled assets into your Android project:
```bash
# Compile client assets from root directory
npm run build

# Sync assets to Android project
cd client
npx cap sync
```

### 6. Run on Device / Emulator
Open the project in Android Studio to compile and build the `.apk`:
```bash
npx cap open android
```
Inside Android Studio, select your emulator or connected physical Android device and click **Run** (Green play button) to launch the game with full virtual joystick support!



