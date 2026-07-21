/**
 * Deterministic procedural world generation.
 *
 * Two-layer approach, same idea real open-world procedural games use
 * (Minecraft villages, Dwarf Fortress sites, No Man's Sky bases):
 *
 *  1. Continuous noise decides raw terrain (elevation/moisture -> water,
 *     grass, forest, mountain). Noise is smooth and spatially coherent,
 *     unlike independent per-tile randomness, so land/water/forest form
 *     real connected shapes instead of salt-and-pepper static.
 *
 *  2. A separate deterministic placement rule decides where towns go
 *     (a jittered grid, like Minecraft's structure spacing) and stamps a
 *     hand-designed-feeling layout there. This is what gives FireRed-style
 *     "this is clearly a town" moments inside a world nobody manually drew.
 *
 * Both client and server import this same module so they always agree on
 * what the world looks like at a given coordinate — required for
 * multiplayer, and for the offline client fallback to match the server.
 */

import { WORLD_SEED, TOWN_CHUNK_SPACING, CHUNK_SIZE } from './constants.js';
import { NPCDefinition, Vec2, Direction } from './types.js';

// ===== Tile IDs (shared meaning across client + server renderers) =====
export const TILE_VOID = 0;
export const TILE_GRASS = 1;
export const TILE_PATH = 2;
export const TILE_WATER = 3;
export const TILE_MOUNTAIN = 4; // formerly generic "Wall" — now a terrain feature
export const TILE_TREE = 5;
export const TILE_BUILDING_FLOOR = 6;
export const TILE_BUILDING_WALL = 7;
export const TILE_DOOR = 8;
export const TILE_TALL_GRASS = 9;
export const TILE_PORTAL = 10;

// ===== Low-level deterministic noise =====

function hash2D(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 982451653;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return ((h >>> 0) % 100000) / 100000; // -> [0, 1)
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Bilinear-interpolated value noise, continuous and smooth (not per-tile static). */
function valueNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const v00 = hash2D(xi, yi, seed);
  const v10 = hash2D(xi + 1, yi, seed);
  const v01 = hash2D(xi, yi + 1, seed);
  const v11 = hash2D(xi + 1, yi + 1, seed);

  const u = smoothstep(xf);
  const v = smoothstep(yf);
  const top = v00 + (v10 - v00) * u;
  const bottom = v01 + (v11 - v01) * u;
  return top + (bottom - top) * v; // [0, 1)
}

/** Fractal Brownian Motion: layered octaves of noise for natural-looking terrain. */
function fbm2D(x: number, y: number, seed: number, octaves: number, baseFreq: number): number {
  let total = 0;
  let amplitude = 1;
  let freq = baseFreq;
  let maxAmp = 0;

  for (let i = 0; i < octaves; i++) {
    total += valueNoise2D(x * freq, y * freq, seed + i * 97) * amplitude;
    maxAmp += amplitude;
    amplitude *= 0.5;
    freq *= 2;
  }
  return total / maxAmp; // [0, 1)
}

// ===== Terrain thresholds (tune these to change biome balance) =====

const WATER_THRESHOLD = 0.35;
const MOUNTAIN_THRESHOLD = 0.75;
const FOREST_MOISTURE_THRESHOLD = 0.6;
const PATH_NOISE_BAND = 0.03;

export interface BiomeInfo {
  id: string;
  name: string;
  bgColor: string;
  grassColor: string;
  treeColor: string;
  tallGrassColor: string;
}

/** Get biome info at a global tile coordinate */
export function getBiomeAt(gx: number, gy: number, seed: number): BiomeInfo {
  if (seed === 0) {
    return {
      id: 'city',
      name: 'Permanent City',
      bgColor: '#e2d6b5',
      grassColor: '#60a050',
      treeColor: '#1d4a0e',
      tallGrassColor: '#4d8a3e',
    };
  }

  // Enforce forest biome at extreme route borders so boundary trees render beautifully with lush green grass backgrounds
  if (gx <= 3 || gx >= 252 || gy <= 3 || gy >= 252) {
    return {
      id: 'forest',
      name: 'Ancient Grove',
      bgColor: '#3a7c2f',
      grassColor: '#4a8c3f',
      treeColor: '#1a4a0e',
      tallGrassColor: '#2d5a1e',
    };
  }

  const elevation = fbm2D(gx, gy, seed, 4, 0.04);
  const moisture = fbm2D(gx, gy, seed + 1000, 3, 0.06);

  if (elevation < WATER_THRESHOLD) {
    return {
      id: 'lake',
      name: 'Cerulean Lake',
      bgColor: '#3b6fa0',
      grassColor: '#3b6fa0',
      treeColor: '#1d4a0e',
      tallGrassColor: '#4d8a3e',
    };
  }

  if (elevation > MOUNTAIN_THRESHOLD) {
    return {
      id: 'mountain',
      name: 'Craggy Highlands',
      bgColor: '#5a4a35',
      grassColor: '#6c5b45',
      treeColor: '#2d4d2d',
      tallGrassColor: '#4a7a4a',
    };
  }

  if (moisture > FOREST_MOISTURE_THRESHOLD) {
    return {
      id: 'forest',
      name: 'Ancient Grove',
      bgColor: '#3a7c2f',
      grassColor: '#4a8c3f',
      treeColor: '#1a4a0e',
      tallGrassColor: '#2d5a1e',
    };
  }

  if (moisture < 0.2) {
    return {
      id: 'desert',
      name: 'Sandy Wasteland',
      bgColor: '#d8c292',
      grassColor: '#e4d2a3',
      treeColor: '#c29b53',
      tallGrassColor: '#b59247',
    };
  }

  return {
    id: 'plains',
    name: 'Grassland Plains',
    bgColor: '#c4a86a',
    grassColor: '#4a8c3f',
    treeColor: '#2d5a1e',
    tallGrassColor: '#3a7c2f',
  };
}

/** Design a static, handcrafted-feeling permanent city layout centered around 128, 128 */
export function getCityTile(gx: number, gy: number): number {
  // Define City Bounds
  const cityMinX = 105;
  const cityMaxX = 149;
  const cityMinY = 95;
  const cityMaxY = 149;

  const isInsideCity = (gx >= cityMinX && gx <= cityMaxX && gy >= cityMinY && gy <= cityMaxY);

  // If outside the city, block with impenetrable boundary forest
  if (!isInsideCity) {
    return TILE_TREE;
  }

  // Define Portal sites and their beautiful stone pedestals
  // 1. North Portal (127, 96)
  if (gx >= 126 && gx <= 128 && gy >= 95 && gy <= 97) {
    if (gx === 127 && gy === 96) return TILE_PORTAL;
    return TILE_PATH; // platform floor
  }
  // 2. South Portal (127, 148)
  if (gx >= 126 && gx <= 128 && gy >= 147 && gy <= 149) {
    if (gx === 127 && gy === 148) return TILE_PORTAL;
    return TILE_PATH; // platform floor
  }
  // 3. East Portal (148, 121)
  if (gx >= 147 && gx <= 149 && gy >= 120 && gy <= 122) {
    if (gx === 148 && gy === 121) return TILE_PORTAL;
    return TILE_PATH; // platform floor
  }
  // 4. West Portal (106, 121)
  if (gx >= 105 && gx <= 107 && gy >= 120 && gy <= 122) {
    if (gx === 106 && gy === 121) return TILE_PORTAL;
    return TILE_PATH; // platform floor
  }

  // Main roads: vertical at gx: 124 to 130, and horizontal at gy: 118 to 124
  const isMainRoad = (gy >= 118 && gy <= 124) || (gx >= 124 && gx <= 130);

  // Inside or on the exit path
  // Pokemon Center (Healer House)
  if (gx >= 112 && gx <= 122 && gy >= 104 && gy <= 112) {
    if (gy === 112 && gx === 117) return TILE_DOOR;
    if (gy === 112) return TILE_BUILDING_WALL;
    if (gx === 112 || gx === 122 || gy === 104) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  // Poke Mart (Merchant Shop)
  if (gx >= 132 && gx <= 142 && gy >= 104 && gy <= 112) {
    if (gy === 112 && gx === 137) return TILE_DOOR;
    if (gy === 112) return TILE_BUILDING_WALL;
    if (gx === 132 || gx === 142 || gy === 104) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  // Storage Vault
  if (gx >= 112 && gx <= 122 && gy >= 132 && gy <= 140) {
    if (gy === 140 && gx === 117) return TILE_DOOR;
    if (gy === 140) return TILE_BUILDING_WALL;
    if (gx === 112 || gx === 122 || gy === 132) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  // Crafting Lab
  if (gx >= 132 && gx <= 142 && gy >= 132 && gy <= 140) {
    if (gy === 140 && gx === 137) return TILE_DOOR;
    if (gy === 140) return TILE_BUILDING_WALL;
    if (gx === 132 || gx === 142 || gy === 132) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  // Decor trees inside the city to give it a nice organic park feel
  if (isInsideCity) {
    // Avoid blocking any main roads or structures
    const isNearStructure = 
      (gx >= 110 && gx <= 124 && gy >= 102 && gy <= 114) || // Center
      (gx >= 130 && gx <= 144 && gy >= 102 && gy <= 114) || // Mart
      (gx >= 110 && gx <= 124 && gy >= 130 && gy <= 142) || // Storage
      (gx >= 130 && gx <= 144 && gy >= 130 && gy <= 142);   // Lab

    if (!isMainRoad && !isNearStructure) {
      if (hash2D(gx, gy, 888) > 0.72) {
        return TILE_TREE;
      }
    }
  }

  if (isMainRoad) return TILE_PATH;
  return TILE_GRASS;
}

export function getRouteOutpostTile(gx: number, gy: number, mapId: string = 'city'): number | null {
  if (mapId === 'route_1') {
    // Route 1 Portal: South edge (gx 127, gy 244)
    if (gx >= 126 && gx <= 128 && gy >= 243 && gy <= 245) {
      if (gx === 127 && gy === 244) return TILE_PORTAL;
      return TILE_PATH; // platform floor
    }
  } else if (mapId === 'route_2') {
    // Route 2 Portal: North edge (gx 127, gy 12)
    if (gx >= 126 && gx <= 128 && gy >= 11 && gy <= 13) {
      if (gx === 127 && gy === 12) return TILE_PORTAL;
      return TILE_PATH; // platform floor
    }
  } else if (mapId === 'route_3') {
    // Route 3 Portal: West edge (gx 12, gy 121)
    if (gx >= 11 && gx <= 13 && gy >= 120 && gy <= 122) {
      if (gx === 12 && gy === 121) return TILE_PORTAL;
      return TILE_PATH; // platform floor
    }
  } else if (mapId === 'route_4') {
    // Route 4 Portal: East edge (gx 244, gy 121)
    if (gx >= 243 && gx <= 245 && gy >= 120 && gy <= 122) {
      if (gx === 244 && gy === 121) return TILE_PORTAL;
      return TILE_PATH; // platform floor
    }
  }

  return null;
}

/** Raw terrain tile at a GLOBAL tile coordinate, ignoring towns. */
export function rawTerrainTile(gx: number, gy: number, seed: number, mapId: string = 'city'): number {
  if (seed === 0) {
    return getCityTile(gx, gy);
  }

  // Enforce solid boundary trees at the extreme borders of procedural Routes
  if (gx <= 3 || gx >= 252 || gy <= 3 || gy >= 252) {
    return TILE_TREE;
  }

  // Enforce central Expedition Outpost Gatehouse
  const outpostTile = getRouteOutpostTile(gx, gy, mapId);
  if (outpostTile !== null) {
    return outpostTile;
  }

  const elevation = fbm2D(gx, gy, seed, 4, 0.04);
  const moisture = fbm2D(gx, gy, seed + 1000, 3, 0.06);

  if (elevation < WATER_THRESHOLD) return TILE_WATER;
  if (elevation > MOUNTAIN_THRESHOLD) return TILE_MOUNTAIN;

  if (moisture > FOREST_MOISTURE_THRESHOLD) {
    const d = hash2D(gx, gy, seed + 3000);
    if (d > 0.45) return TILE_TREE;
    if (d < 0.15) return TILE_TALL_GRASS;
    return TILE_GRASS;
  }

  // thin winding dirt trails through open terrain, only near towns
  const pathNoise = fbm2D(gx, gy, seed + 2000, 2, 0.12);
  if (Math.abs(pathNoise - 0.5) < PATH_NOISE_BAND) {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    let nearTown = false;
    for (let dcx = -1; dcx <= 1; dcx++) {
      for (let dcy = -1; dcy <= 1; dcy++) {
        if (isTownChunk(cx + dcx, cy + dcy, seed)) {
          nearTown = true;
          break;
        }
      }
      if (nearTown) break;
    }
    if (nearTown) return TILE_PATH;
  }

  // Tall grass clusters in plains
  const g = hash2D(gx, gy, seed + 4000);
  if (g > 0.72) return TILE_TALL_GRASS;

  return TILE_GRASS;
}

// ===== Town placement (jittered grid, same family of technique as Minecraft structures) =====

interface ChunkCoordPair {
  cx: number;
  cy: number;
}

/** Which chunk (if any) in this cell of the town-spacing grid is the town. */
function townChunkForCell(cellX: number, cellY: number, seed: number): ChunkCoordPair {
  const jitterX = Math.floor(hash2D(cellX, cellY, seed + 5000) * TOWN_CHUNK_SPACING);
  const jitterY = Math.floor(hash2D(cellX, cellY, seed + 6000) * TOWN_CHUNK_SPACING);
  return {
    cx: cellX * TOWN_CHUNK_SPACING + jitterX,
    cy: cellY * TOWN_CHUNK_SPACING + jitterY,
  };
}

export function isTownChunk(cx: number, cy: number, seed: number): boolean {
  if (seed === 0) return false; // permanent city is custom and doesn't use random towns
  const cellX = Math.floor(cx / TOWN_CHUNK_SPACING);
  const cellY = Math.floor(cy / TOWN_CHUNK_SPACING);
  const town = townChunkForCell(cellX, cellY, seed);
  return town.cx === cx && town.cy === cy;
}

/**
 * Stamp a simple town layout onto an already-generated tile grid (mutates
 * in place). Right now this is one fixed building template — the natural
 * next step is an array of hand-designed templates picked by hash, so
 * towns vary instead of being identical everywhere.
 */
function stampTown(tiles: number[][]): void {
  // First, clear obstacles (Trees, Mountains, Water) in a small zone around the house to form a clean yard.
  // House is at x: 4..11, y: 4..10.
  // Yard boundary: x: 3..12, y: 3..13.
  for (let y = 3; y <= 13; y++) {
    for (let x = 3; x <= 12; x++) {
      const tile = tiles[y][x];
      if (tile === TILE_TREE || tile === TILE_MOUNTAIN || tile === TILE_WATER) {
        tiles[y][x] = TILE_GRASS;
      }
    }
  }

  // Stamp the house walls (top, bottom, sides) and floors
  // Top walls (roof/depth)
  for (let x = 4; x <= 11; x++) {
    tiles[4][x] = TILE_BUILDING_WALL;
    tiles[5][x] = TILE_BUILDING_WALL;
  }

  // Side walls and bottom wall
  for (let y = 6; y <= 10; y++) {
    for (let x = 4; x <= 11; x++) {
      if (y === 10) {
        tiles[y][x] = TILE_BUILDING_WALL; // Bottom wall
      } else if (x === 4 || x === 11) {
        tiles[y][x] = TILE_BUILDING_WALL; // Left/Right side wall
      } else {
        tiles[y][x] = TILE_BUILDING_FLOOR; // Inside floor
      }
    }
  }

  // Place the door
  tiles[10][7] = TILE_DOOR;

  // Draw a beautiful small clean path coming out of the door (y: 11..13)
  for (let y = 11; y <= 13; y++) {
    tiles[y][7] = TILE_PATH;
  }
}

/** Generate a full chunk's tile grid for the given chunk coordinates. */
export function generateChunkTiles(cx: number, cy: number, seed: number, mapId: string = 'city'): number[][] {
  const tiles: number[][] = [];

  for (let y = 0; y < CHUNK_SIZE; y++) {
    tiles[y] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      const gx = cx * CHUNK_SIZE + x;
      const gy = cy * CHUNK_SIZE + y;
      tiles[y][x] = rawTerrainTile(gx, gy, seed, mapId);
    }
  }

  if (seed !== 0 && isTownChunk(cx, cy, seed)) {
    stampTown(tiles);
  }

  return tiles;
}

export function isWalkableTileId(tileId: number): boolean {
  return (
    tileId === TILE_GRASS ||
    tileId === TILE_PATH ||
    tileId === TILE_BUILDING_FLOOR ||
    tileId === TILE_DOOR ||
    tileId === TILE_TALL_GRASS ||
    tileId === TILE_PORTAL
  );
}

export function getGlobalTile(gx: number, gy: number, seed: number, mapId: string = 'city'): number {
  const cx = Math.floor(gx / CHUNK_SIZE);
  const cy = Math.floor(gy / CHUNK_SIZE);
  
  if (seed !== 0 && isTownChunk(cx, cy, seed)) {
    const chunk = generateChunkTiles(cx, cy, seed, mapId);
    let lx = gx - cx * CHUNK_SIZE;
    let ly = gy - cy * CHUNK_SIZE;
    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
      return chunk[ly][lx];
    }
  }
  
  return rawTerrainTile(gx, gy, seed, mapId);
}

export function findSafeSpawn(seed: number, startPixelX: number, startPixelY: number, mapId: string = 'city'): { x: number, y: number } {
  let gx = Math.floor(startPixelX / 16); // Assuming TILE_SIZE = 16
  let gy = Math.floor(startPixelY / 16);
  
  const maxRadius = 50; 
  
  for (let r = 0; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.abs(dx) === r || Math.abs(dy) === r) {
          const testGx = gx + dx;
          const testGy = gy + dy;
          
          if (testGx < 0 || testGy < 0) continue;
          
          const tile = getGlobalTile(testGx, testGy, seed, mapId);
          if (isWalkableTileId(tile)) {
            return {
              x: testGx * 16,
              y: testGy * 16
            };
          }
        }
      }
    }
  }
  
  return { x: startPixelX, y: startPixelY };
}

/** Get NPC definitions deterministically spawned for a given map */
export function getNPCsForMap(mapId: string, seed: number): NPCDefinition[] {
  const npcs: NPCDefinition[] = [];

  if (mapId === 'city') {
    // Nurse Joy (Healer) - Placed deeper in Pokemon Center (gx 117, gy 108) instead of blocking door
    npcs.push({
      id: 1,
      name: 'Nurse Joy',
      sprite: 'nurse_joy',
      position: { x: 117 * 16, y: 108 * 16 },
      direction: 'down',
      dialogues: [[
        { speaker: 'Nurse Joy', text: "Hello! Welcome to the permanent FlashTrainer City Center." },
        { speaker: 'Nurse Joy', text: "I have restored your party to full health! Rest well before your expedition." }
      ]]
    });

    // Poké Mart Clerk - Placed deeper in Poke Mart (gx 137, gy 108) instead of blocking door
    npcs.push({
      id: 2,
      name: 'Mart Clerk',
      sprite: 'clerk',
      position: { x: 137 * 16, y: 108 * 16 },
      direction: 'down',
      dialogues: [[
        { speaker: 'Mart Clerk', text: "Welcome to the Poké Mart! We're stocked up with essential supplies." },
        { speaker: 'Mart Clerk', text: "Take some potions and Pokeballs for your journey into the wild." }
      ]]
    });

    // Storage Clerk - Placed deeper in Storage Vault (gx 117, gy 136) instead of blocking door
    npcs.push({
      id: 3,
      name: 'Storage Clerk',
      sprite: 'clerk_blue',
      position: { x: 117 * 16, y: 136 * 16 },
      direction: 'down',
      dialogues: [[
        { speaker: 'Storage Clerk', text: "Welcome to the Storage Vault. Your items and caught monsters are safe here!" }
      ]]
    });

    // Crafting Expert - Placed deeper in Crafting Lab (gx 137, gy 136) instead of blocking door
    npcs.push({
      id: 4,
      name: 'Crafting Expert',
      sprite: 'craftsman',
      position: { x: 137 * 16, y: 136 * 16 },
      direction: 'down',
      dialogues: [[
        { speaker: 'Crafting Expert', text: "Hey there, Trainer! Bring back raw materials from the expeditions." },
        { speaker: 'Crafting Expert', text: "I can help you craft rare items and upgrades using biome resources!" }
      ]]
    });

    // Travel Guide
    npcs.push({
      id: 5,
      name: 'Travel Guide',
      sprite: 'guide',
      position: { x: 121 * 16, y: 120 * 16 },
      direction: 'right',
      dialogues: [[
        { speaker: 'Travel Guide', text: "Hello, explorer! Outside the city lie the procedurally generated Routes." },
        { speaker: 'Travel Guide', text: "Route 1 is North, Route 2 is South, Route 3 is East, and Route 4 is West!" },
        { speaker: 'Travel Guide', text: "If a Route becomes empty of players, it stays open for 15s reconnect grace," },
        { speaker: 'Travel Guide', text: "then triggers a 45s empty reset timer, after which it completely regenerates with a new seed!" }
      ]]
    });
  } else if (mapId.startsWith('route_')) {
    // Generate temporary town NPCs in route
    for (let cx = 0; cx < 16; cx++) {
      for (let cy = 0; cy < 16; cy++) {
        if (isTownChunk(cx, cy, seed)) {
          npcs.push({
            id: 100 + cx * 16 + cy,
            name: 'Town Merchant',
            sprite: 'clerk_route',
            position: { x: (cx * 16 + 7) * 16, y: (cy * 16 + 9) * 16 },
            direction: 'down',
            dialogues: [[
              { speaker: 'Town Merchant', text: "Greetings, traveler! This is a temporary town generated on this expedition." },
              { speaker: 'Town Merchant', text: "When this route is empty, this town and its NPCs will be recycled!" }
            ]]
          });
        }
      }
    }

    // Wandering explorers/trainers
    npcs.push({
      id: 201,
      name: 'Explorer Dave',
      sprite: 'explorer',
      position: { x: 60 * 16, y: 80 * 16 },
      direction: 'right',
      dialogues: [[
        { speaker: 'Dave', text: "Wow, this biome is incredible! Have you noticed how the layout matches the biome banner?" },
        { speaker: 'Dave', text: "I'm looking for legendary creatures in the Ancient Grove!" }
      ]]
    });

    npcs.push({
      id: 202,
      name: 'Ranger Sarah',
      sprite: 'ranger',
      position: { x: 180 * 16, y: 150 * 16 },
      direction: 'left',
      dialogues: [[
        { speaker: 'Sarah', text: "Be careful! The monster habitats change dynamically based on local moisture and elevation." },
        { speaker: 'Sarah', text: "Train hard and protect the ecosystems!" }
      ]]
    });
  }

  return npcs;
}