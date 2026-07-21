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

// ===== Helper: Curve Distance Routing for Connected Roads =====

function distanceToCurve(px: number, py: number, x0: number, y0: number, x1: number, y1: number, seed: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((px - x0) * (px - x0) + (py - y0) * (py - y0));

  let t = ((px - x0) * dx + (py - y0) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  // Gentler curves, avoid unnecessary winding for Pokémon-style direct route paths
  const warpFreq = 0.015;
  const warpAmp = 3.0;
  const warpX = Math.sin(t * Math.PI * 2.5 + seed) * warpAmp;
  const warpY = Math.cos(t * Math.PI * 2.5 + seed) * warpAmp;

  const projX = x0 + t * dx + warpX;
  const projY = y0 + t * dy + warpY;

  return Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));
}

// ===== Modular Generator Systems (Seed-Deterministic) =====

export class HeightGenerator {
  static getElevation(gx: number, gy: number, seed: number, mapId: string = 'route_1'): number {
    // 1. Flatten towns completely to prevent hills/depressions
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return 0.45; // flat ground
    }

    // 2. Beautiful thematic landscape blending for landmarks
    if (mapId === 'route_1') {
      // Shrine at (110, 110) in a flat clearing
      const dist = Math.sqrt((gx - 110) ** 2 + (gy - 110) ** 2);
      if (dist < 15) return 0.45;
    } else if (mapId === 'route_2') {
      // Tower at (150, 130) on an elevated plateau
      const dist = Math.sqrt((gx - 150) ** 2 + (gy - 130) ** 2);
      if (dist < 15) return 0.68;
    } else if (mapId === 'route_3') {
      // Cabin at (130, 90) beside a scenic lakeside
      const dist = Math.sqrt((gx - 130) ** 2 + (gy - 90) ** 2);
      if (dist < 15) {
        const lakeDist = Math.sqrt((gx - 138) ** 2 + (gy - 90) ** 2);
        if (lakeDist < 6) return 0.25; // water body
        return 0.42; // lakeside flat land
      }
    } else if (mapId === 'route_4') {
      // Crater at (105, 145) inside a craggy mountain basin
      const dist = Math.sqrt((gx - 105) ** 2 + (gy - 145) ** 2);
      if (dist < 15) {
        if (dist < 6) return 0.30; // low crater basin
        if (dist < 9) return 0.75; // high rim
        return 0.55; // outer slope
      }
    }

    // 3. Large, natural, connected mountain ridges using base FBM + ridged FBM
    const base = fbm2D(gx, gy, seed, 4, 0.012);
    const n2 = fbm2D(gx + 500, gy + 500, seed + 123, 3, 0.02);
    const ridge = 1.0 - Math.abs(n2 * 2.0 - 1.0);

    let raw = base;
    if (base > 0.52) {
      // Create tall, connected ridges
      raw = base + ridge * 0.25;
    } else {
      // Flat valleys and plains basins
      raw = Math.pow(base / 0.52, 1.5) * 0.52;
    }

    // High stepped plateaus
    if (raw > 0.66 && raw < 0.74) {
      raw = 0.68; // flat plateau step
    }

    return Math.min(0.99, Math.max(0.0, raw));
  }
}

export class MoistureGenerator {
  static getMoisture(gx: number, gy: number, seed: number): number {
    return fbm2D(gx, gy, seed + 1000, 3, 0.04);
  }
}

export class TemperatureGenerator {
  static getTemperature(gx: number, gy: number, seed: number, elevation: number): number {
    const rawTemp = fbm2D(gx, gy, seed + 4000, 3, 0.025);
    return rawTemp - (elevation - 0.38) * 0.5;
  }
}

export class BiomeGenerator {
  static determineBiome(elevation: number, moisture: number, temp: number): string {
    if (elevation < 0.33) return 'lake';
    if (elevation > 0.73) return 'mountain';

    if (moisture > 0.55) {
      return 'forest';
    } else if (moisture < 0.24) {
      return 'desert';
    }
    return 'plains';
  }

  static getWaterProximity(gx: number, gy: number, seed: number, mapId: string): number {
    // Check radius up to 4 tiles for water
    for (let r = 1; r <= 4; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const nx = gx + dx;
            const ny = gy + dy;
            const el = HeightGenerator.getElevation(nx, ny, seed, mapId);
            if (el < 0.33 || RiverGenerator.isRiverTile(nx, ny, seed, mapId) || PondGenerator.isPondTile(nx, ny, seed)) {
              return 5 - r; // closer water has higher value (1..4)
            }
          }
        }
      }
    }
    return 0;
  }

  static isBeachTile(gx: number, gy: number, seed: number, mapId: string = 'route_1'): boolean {
    const el = HeightGenerator.getElevation(gx, gy, seed, mapId);
    if (el < 0.33 || RiverGenerator.isRiverTile(gx, gy, seed, mapId) || PondGenerator.isPondTile(gx, gy, seed)) {
      return false; // water itself is never beach sand
    }

    const prox = BiomeGenerator.getWaterProximity(gx, gy, seed, mapId);
    if (prox === 0) return false;

    // Beautiful varying 1-4 tile sand transition width
    const beachNoise = fbm2D(gx * 0.15, gy * 0.15, seed + 7777, 2, 0.08);
    if (prox >= 4) return true;
    if (prox === 3 && beachNoise > 0.3) return true;
    if (prox === 2 && beachNoise > 0.55) return true;
    if (prox === 1 && beachNoise > 0.8) return true;

    return false;
  }

  static isNearWater(gx: number, gy: number, seed: number, mapId: string): boolean {
    return BiomeGenerator.isBeachTile(gx, gy, seed, mapId);
  }
}

export class RiverGenerator {
  private static pathCache: Record<string, { x: number, y: number, el: number }[]> = {};

  static getRiverPath(seed: number, mapId: string): { x: number, y: number, el: number }[] {
    const cacheKey = `${seed}_${mapId}`;
    if (this.pathCache[cacheKey]) {
      return this.pathCache[cacheKey];
    }

    let sx = 64;
    let sy = 64;
    let maxEl = -1;

    for (let x = 40; x < 210; x += 24) {
      for (let y = 40; y < 210; y += 24) {
        const el = HeightGenerator.getElevation(x, y, seed, mapId);
        if (el > maxEl && el > 0.60) {
          maxEl = el;
          sx = x;
          sy = y;
        }
      }
    }

    const path: { x: number, y: number, el: number }[] = [];
    let cx = sx;
    let cy = sy;
    const visited = new Set<string>();
    const maxLen = 140;

    for (let step = 0; step < maxLen; step++) {
      const currentEl = HeightGenerator.getElevation(cx, cy, seed, mapId);
      path.push({ x: cx, y: cy, el: currentEl });
      visited.add(`${cx},${cy}`);

      let minEl = currentEl;
      let bestDirs: [number, number][] = [];

      const dirs = [
        [0, 1], [1, 0], [0, -1], [-1, 0],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (visited.has(`${nx},${ny}`)) continue;

        const nel = HeightGenerator.getElevation(nx, ny, seed, mapId);
        if (nel < minEl) {
          minEl = nel;
          bestDirs = [[dx, dy]];
        } else if (nel === minEl && minEl < currentEl) {
          bestDirs.push([dx, dy]);
        }
      }

      if (bestDirs.length > 0) {
        const h = hash2D(cx, cy, seed + step);
        const chosen = bestDirs[Math.floor(h * bestDirs.length)];
        cx += chosen[0];
        cy += chosen[1];

        if (minEl < 0.33) {
          path.push({ x: cx, y: cy, el: minEl });
          break;
        }
      } else {
        let escapeDir: [number, number] | null = null;
        let lowestNeigh = 999;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (visited.has(`${nx},${ny}`)) continue;
          const nel = HeightGenerator.getElevation(nx, ny, seed, mapId);
          if (nel < lowestNeigh) {
            lowestNeigh = nel;
            escapeDir = [dx, dy];
          }
        }
        if (escapeDir) {
          cx += escapeDir[0];
          cy += escapeDir[1];
        } else {
          break;
        }
      }
    }

    this.pathCache[cacheKey] = path;
    return path;
  }

  static isRiverTile(gx: number, gy: number, seed: number, mapId: string): boolean {
    if (mapId === 'city') return false;

    // Towns never have river tiles overlapping them
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return false;
    }

    const path = this.getRiverPath(seed, mapId);
    if (path.length === 0) return false;

    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      const dx = gx - pt.x;
      const dy = gy - pt.y;
      if (Math.abs(dx) <= 6 && Math.abs(dy) <= 6) {
        const t = i / path.length;
        const width = 1.2 + t * 2.2;
        const distSq = dx * dx + dy * dy;

        if (distSq < width * width) {
          if (width > 2.0) {
            const islandNoise = hash2D(gx, gy, seed + 20000);
            if (islandNoise > 0.85) {
              return false;
            }
          }
          return true;
        }
      }
    }

    return false;
  }
}

export class LakeGenerator {
  static isLakeTile(elevation: number, gx: number, gy: number, seed: number): boolean {
    // Towns never have lake tiles overlapping them
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return false;
    }

    // Irregular shoreline simulation using domain warping
    const warpX = fbm2D(gx * 0.08, gy * 0.08, seed + 8500, 2, 0.1) * 6.0;
    const warpY = fbm2D(gx * 0.08, gy * 0.08, seed + 9500, 2, 0.1) * 6.0;
    
    const shoreNoise = fbm2D((gx + warpX) * 0.12, (gy + warpY) * 0.12, seed + 8000, 3, 0.06) * 0.08;
    const threshold = 0.34 + shoreNoise;

    if (elevation < threshold) {
      // Natural lake islands, peninsulas, and coves
      const islandNoise = fbm2D(gx * 0.15, gy * 0.15, seed + 900, 2, 0.08);
      if (islandNoise > 0.70 && elevation > threshold - 0.08) {
        return false; // grass island
      }
      return true;
    }
    return false;
  }
}

export class PondGenerator {
  static getTile(gx: number, gy: number, seed: number): number | null {
    // Towns never have pond tiles overlapping them
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return null;
    }

    const cellX = Math.floor(gx / 18);
    const cellY = Math.floor(gy / 18);

    for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
      for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
        const hash = hash2D(cx, cy, seed + 1500);
        if (hash > 0.93) {
          const px = cx * 18 + 5 + Math.floor((hash * 100) % 8);
          const py = cy * 18 + 5 + Math.floor((hash * 1000) % 8);
          const dx = gx - px;
          const dy = gy - py;
          const r = 2.1 + (hash * 10) % 1.5;
          const noise = valueNoise2D(gx * 0.4, gy * 0.4, seed + 1600) * 1.2;
          if (dx * dx + dy * dy < (r + noise) * (r + noise)) {
            return TILE_WATER;
          }
        }
      }
    }
    return null;
  }

  static isPondTile(gx: number, gy: number, seed: number): boolean {
    return this.getTile(gx, gy, seed) !== null;
  }
}

export class BeachGenerator {
  static getTile(gx: number, gy: number, seed: number, isNearWater: boolean, mapId: string = 'city'): number | null {
    if (!isNearWater) return null;

    // No mountain rocks or boulders on beaches
    // Occasional reeds/weeds near shorelines
    const h = hash2D(gx, gy, seed + 3500);
    if (h < 0.15) {
      return TILE_TALL_GRASS; // reeds / shore grasses
    }

    return null;
  }
}

export class CliffGenerator {
  static getTile(gx: number, gy: number, seed: number, elevation: number, southElevation: number, mapId: string = 'route_1'): number | null {
    // 1. Cliffs exist only in highlands/mountain plateaus (elevation > 0.65)
    if (elevation < 0.65) return null;

    // 2. Eliminate rocky clutter around roads
    if (RoadGenerator.isNearRoad(gx, gy, seed, mapId)) return null;

    // 3. No cliffs overlapping towns
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) return null;

    // 4. No cliffs overlapping water features
    if (RiverGenerator.isRiverTile(gx, gy, seed, mapId) || 
        PondGenerator.isPondTile(gx, gy, seed) || 
        LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
      return null;
    }

    // 5. Generate beautiful cliff faces facing south on sharp drops
    const diffSouth = elevation - southElevation;
    if (diffSouth >= 0.08) {
      return TILE_MOUNTAIN;
    }

    // East/west drop-offs with continuous noise filter to prevent isolated tiles
    const westElevation = HeightGenerator.getElevation(gx - 1, gy, seed, mapId);
    const eastElevation = HeightGenerator.getElevation(gx + 1, gy, seed, mapId);
    if (elevation - westElevation >= 0.08 || elevation - eastElevation >= 0.08) {
      const cliffNoise = fbm2D(gx * 0.1, gy * 0.1, seed + 999, 2, 0.1);
      if (cliffNoise > 0.45) {
        return TILE_MOUNTAIN;
      }
    }

    return null;
  }
}

export class RoadWaypoints {
  private static cache: Record<string, { x: number, y: number }[]> = {};

  static getWaypoints(p0: { x: number, y: number }, p1: { x: number, y: number }, seed: number, mapId: string): { x: number, y: number }[] {
    const key = `${seed}_${mapId}`;
    if (this.cache[key]) {
      return this.cache[key];
    }

    const pts: { x: number, y: number }[] = [p0];
    const segments = 3;

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const bx = p0.x + t * (p1.x - p0.x);
      const by = p0.y + t * (p1.y - p0.y);

      let bestX = bx;
      let bestY = by;
      let bestScore = -999999;

      const hash = hash2D(Math.floor(bx), Math.floor(by), seed + i * 100);

      for (let angleIdx = 0; angleIdx < 8; angleIdx++) {
        const angle = (angleIdx / 8) * Math.PI * 2 + hash * 0.5;
        const radius = 15 + hash * 10;
        const cx = Math.floor(bx + Math.cos(angle) * radius);
        const cy = Math.floor(by + Math.sin(angle) * radius);

        if (cx < 10 || cx > 245 || cy < 10 || cy > 245) continue;

        const el = HeightGenerator.getElevation(cx, cy, seed, mapId);
        const isRiver = RiverGenerator.isRiverTile(cx, cy, seed, mapId);

        let score = 0;
        if (isRiver) score -= 300;
        if (el < 0.33) score -= 250;
        if (el > 0.58) score -= 200;

        const elDiff = Math.abs(el - 0.45);
        score -= elDiff * 80;

        if (score > bestScore) {
          bestScore = score;
          bestX = cx;
          bestY = cy;
        }
      }

      pts.push({ x: bestX, y: bestY });
    }

    pts.push(p1);
    this.cache[key] = pts;
    return pts;
  }
}

export class RoadGenerator {
  static getTile(gx: number, gy: number, seed: number, mapId: string = 'city', elevation: number = 0.5): number | null {
    if (mapId === 'city') return null;

    let p0 = { x: 127, y: 244 };
    let p1 = { x: 127, y: 128 };

    if (mapId === 'route_1') {
      p0 = { x: 127, y: 244 };
      p1 = { x: 110, y: 110 };
    } else if (mapId === 'route_2') {
      p0 = { x: 127, y: 12 };
      p1 = { x: 150, y: 130 };
    } else if (mapId === 'route_3') {
      p0 = { x: 12, y: 121 };
      p1 = { x: 130, y: 90 };
    } else if (mapId === 'route_4') {
      p0 = { x: 244, y: 121 };
      p1 = { x: 105, y: 145 };
    } else {
      return null;
    }

    const highwayWaypoints = RoadWaypoints.getWaypoints(p0, p1, seed, mapId);
    let minDist = 999999;

    for (let i = 0; i < highwayWaypoints.length - 1; i++) {
      const d = distanceToCurve(gx, gy, highwayWaypoints[i].x, highwayWaypoints[i].y, highwayWaypoints[i+1].x, highwayWaypoints[i+1].y, seed + i);
      if (d < minDist) {
        minDist = d;
      }
    }

    // Connect to towns
    for (let cx = 0; cx < 16; cx++) {
      for (let cy = 0; cy < 16; cy++) {
        if (isTownChunk(cx, cy, seed)) {
          const tx = cx * 16 + 7;
          const ty = cy * 16 + 7;

          const t0Pts = RoadWaypoints.getWaypoints(p0, { x: tx, y: ty }, seed, `${mapId}_town_0_${cx}_${cy}`);
          for (let i = 0; i < t0Pts.length - 1; i++) {
            const d = distanceToCurve(gx, gy, t0Pts[i].x, t0Pts[i].y, t0Pts[i+1].x, t0Pts[i+1].y, seed + i + 10);
            if (d < minDist) {
              minDist = d;
            }
          }

          const t1Pts = RoadWaypoints.getWaypoints({ x: tx, y: ty }, p1, seed, `${mapId}_town_1_${cx}_${cy}`);
          for (let i = 0; i < t1Pts.length - 1; i++) {
            const d = distanceToCurve(gx, gy, t1Pts[i].x, t1Pts[i].y, t1Pts[i+1].x, t1Pts[i+1].y, seed + i + 20);
            if (d < minDist) {
              minDist = d;
            }
          }
        }
      }
    }

    if (minDist < 1.5) {
      // Wood floor represents bridges over water bodies
      if (elevation < 0.33 || RiverGenerator.isRiverTile(gx, gy, seed, mapId) || PondGenerator.isPondTile(gx, gy, seed)) {
        return TILE_BUILDING_FLOOR;
      }
      return TILE_PATH;
    }

    return null;
  }

  static isNearRoad(gx: number, gy: number, seed: number, mapId: string): boolean {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (RoadGenerator.getTile(gx + dx, gy + dy, seed, mapId) !== null) {
          return true;
        }
      }
    }
    return false;
  }
}

export class LandmarkGenerator {
  static getTile(gx: number, gy: number, seed: number, mapId: string): number | null {
    if (mapId === 'route_1') {
      const lx = 110;
      const ly = 110;
      const dx = gx - lx;
      const dy = gy - ly;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      if (dist <= 4) {
        if (dist === 4) {
          if (Math.abs(dx) === 4 && Math.abs(dy) === 4) return TILE_MOUNTAIN;
          return TILE_PATH;
        }
        if (dx === 0 && dy === 0) return TILE_PORTAL;
        if (dist === 1) return TILE_PATH;
        if (dist === 2) {
          if (hash2D(gx, gy, seed) > 0.4) return TILE_PATH;
          return TILE_TALL_GRASS;
        }
        return TILE_PATH;
      }
    } else if (mapId === 'route_2') {
      const lx = 150;
      const ly = 130;
      const dx = gx - lx;
      const dy = gy - ly;
      const distSq = dx * dx + dy * dy;
      if (distSq <= 16) {
        if (distSq > 9 && distSq <= 16) {
          if (hash2D(gx, gy, seed) > 0.28) return TILE_BUILDING_WALL;
          return TILE_VOID;
        }
        if (dx === 0 && dy === 0) return TILE_PORTAL;
        return TILE_BUILDING_FLOOR;
      }
    } else if (mapId === 'route_3') {
      const lx = 130;
      const ly = 90;
      const dx = gx - lx;
      const dy = gy - ly;
      if (dx >= -3 && dx <= 3 && dy >= -2 && dy <= 2) {
        if (dx === -3 || dx === 3 || dy === -2 || dy === 2) {
          if (dx === 0 && dy === 2) return TILE_DOOR;
          if (hash2D(gx, gy, seed) > 0.25) return TILE_BUILDING_WALL;
          return TILE_TALL_GRASS;
        }
        return TILE_BUILDING_FLOOR;
      }
    } else if (mapId === 'route_4') {
      const lx = 105;
      const ly = 145;
      const dx = gx - lx;
      const dy = gy - ly;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 8) {
        if (dist > 7) return TILE_MOUNTAIN;
        if (dist < 3) {
          if (dx === 0 && dy === 0) return TILE_PORTAL;
          return TILE_VOID;
        }
        if (hash2D(gx, gy, seed) > 0.55) return TILE_WATER;
        return TILE_TALL_GRASS;
      }
    }
    return null;
  }
}

export class VegetationGenerator {
  static getTile(gx: number, gy: number, seed: number, moisture: number, biomeId: string, mapId: string = 'route_1'): number | null {
    // Avoid blocking roads
    if (RoadGenerator.isNearRoad(gx, gy, seed, mapId)) return null;

    // Continuous forest density mapping to form dense cores, woodlands, clearings, and groves
    const forestNoise = fbm2D(gx, gy, seed + 1200, 3, 0.04);
    const detailNoise = valueNoise2D(gx * 0.6, gy * 0.6, seed + 3000);

    if (biomeId === 'forest') {
      // Dense Forest Core
      if (forestNoise > 0.55) {
        if (detailNoise < 0.22) {
          return TILE_TALL_GRASS; // clearing
        }
        return TILE_TREE;
      }
      // Outer Woodlands
      if (forestNoise > 0.38) {
        if (detailNoise > 0.45) return TILE_TREE;
        if (detailNoise < 0.25) return TILE_TALL_GRASS;
        return TILE_GRASS;
      }
      // Winding edge groves
      if (forestNoise > 0.25) {
        if (detailNoise > 0.65) return TILE_TREE;
        if (detailNoise > 0.4) return TILE_TALL_GRASS;
      }
      return TILE_GRASS;
    }

    if (biomeId === 'plains') {
      // Spacious plains: very few lone trees, small occasional groves, patches of tall grass
      if (forestNoise > 0.45 && detailNoise > 0.75) {
        return TILE_TREE;
      }
      if (detailNoise > 0.8) {
        return TILE_TALL_GRASS;
      }
    }

    return null;
  }
}

export enum DecorationType {
  NONE = 0,
  FLOWER_RED = 1,
  FLOWER_YELLOW = 2,
  FLOWER_PURPLE = 3,
  MUSHROOM = 4,
  FALLEN_LOG = 5,
  TREE_STUMP = 6,
  PEBBLE = 7,
  BUSH = 8,
  REEDS = 9
}

export class DecorationGenerator {
  static getDecoration(gx: number, gy: number, seed: number, tileId: number, biomeId: string): DecorationType {
    if (seed === 0) return DecorationType.NONE; // no decorations in custom city

    // Decorations are strictly part of a separate layer on grass or paths
    if (tileId !== TILE_GRASS && tileId !== TILE_PATH) {
      return DecorationType.NONE;
    }

    const h = hash2D(gx, gy, seed + 9999);

    if (tileId === TILE_GRASS) {
      if (biomeId === 'plains') {
        if (h > 0.94) return DecorationType.FLOWER_RED;
        if (h > 0.88) return DecorationType.FLOWER_YELLOW;
        if (h > 0.82) return DecorationType.FLOWER_PURPLE;
        if (h < 0.04) return DecorationType.BUSH;
        if (h < 0.08) return DecorationType.PEBBLE;
      } else if (biomeId === 'forest') {
        if (h > 0.90) return DecorationType.MUSHROOM;
        if (h < 0.05) return DecorationType.FALLEN_LOG;
        if (h < 0.10) return DecorationType.TREE_STUMP;
        if (h < 0.15) return DecorationType.BUSH;
      } else if (biomeId === 'desert') {
        if (h < 0.05) return DecorationType.PEBBLE;
        if (h < 0.08) return DecorationType.REEDS;
      } else if (biomeId === 'mountain') {
        if (h < 0.08) return DecorationType.PEBBLE;
        if (h < 0.12) return DecorationType.BUSH;
      }
    }

    return DecorationType.NONE;
  }
}

export class SpawnGenerator {
  static findSafeSpawn(seed: number, startPixelX: number, startPixelY: number, mapId: string = 'city'): { x: number, y: number } {
    return findSafeSpawn(seed, startPixelX, startPixelY, mapId);
  }
}

export interface BiomeInfo {
  id: string;
  name: string;
  bgColor: string;
  grassColor: string;
  treeColor: string;
  tallGrassColor: string;
}

/** Get biome info at a global tile coordinate */
export function getBiomeAt(gx: number, gy: number, seed: number, mapId: string = 'route_1'): BiomeInfo {
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

  // Try landmark first (with proper mapId)
  const landmark = LandmarkGenerator.getTile(gx, gy, seed, mapId);
  if (landmark !== null) {
    if (landmark === TILE_WATER) {
      return {
        id: 'lake',
        name: 'Cerulean Lake',
        bgColor: '#3b6fa0',
        grassColor: '#3b6fa0',
        treeColor: '#1d4a0e',
        tallGrassColor: '#4d8a3e',
      };
    }
    if (landmark === TILE_MOUNTAIN) {
      return {
        id: 'mountain',
        name: 'Craggy Highlands',
        bgColor: '#5a4a35',
        grassColor: '#6c5b45',
        treeColor: '#2d4d2d',
        tallGrassColor: '#4a7a4a',
      };
    }
  }

  // Check water features (rivers, lakes, ponds)
  const isRiver = RiverGenerator.isRiverTile(gx, gy, seed, mapId);
  const isPond = PondGenerator.isPondTile(gx, gy, seed);
  const elevation = HeightGenerator.getElevation(gx, gy, seed, mapId);

  if (isRiver || isPond || LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
    return {
      id: 'lake',
      name: 'Cerulean Lake',
      bgColor: '#3b6fa0',
      grassColor: '#3b6fa0',
      treeColor: '#1d4a0e',
      tallGrassColor: '#4d8a3e',
    };
  }

  // Beach sand transition
  if (BiomeGenerator.isBeachTile(gx, gy, seed, mapId)) {
    return {
      id: 'desert',
      name: 'Sandy Beach',
      bgColor: '#d8c292',
      grassColor: '#e4d2a3',
      treeColor: '#c29b53',
      tallGrassColor: '#b59247',
    };
  }

  const moisture = MoistureGenerator.getMoisture(gx, gy, seed);
  const temp = TemperatureGenerator.getTemperature(gx, gy, seed, elevation);
  const biomeId = BiomeGenerator.determineBiome(elevation, moisture, temp);

  if (biomeId === 'mountain') {
    return {
      id: 'mountain',
      name: 'Craggy Highlands',
      bgColor: '#5a4a35',
      grassColor: '#6c5b45',
      treeColor: '#2d4d2d',
      tallGrassColor: '#4a7a4a',
    };
  }

  // Dynamic Color Blending based on continuous moisture and elevation mapping
  const cDesertBg = '#d8c292';
  const cDesertGrass = '#e4d2a3';
  const cDesertTree = '#c29b53';
  const cDesertTallGrass = '#b59247';

  const cPlainsBg = '#c4a86a';
  const cPlainsGrass = '#4a8c3f';
  const cPlainsTree = '#2d5a1e';
  const cPlainsTallGrass = '#3a7c2f';

  const cForestBg = '#3a7c2f';
  const cForestGrass = '#4a8c3f';
  const cForestTree = '#1a4a0e';
  const cForestTallGrass = '#2d5a1e';

  let bgColor = cPlainsBg;
  let grassColor = cPlainsGrass;
  let treeColor = cPlainsTree;
  let tallGrassColor = cPlainsTallGrass;

  if (moisture <= 0.22) {
    bgColor = cDesertBg;
    grassColor = cDesertGrass;
    treeColor = cDesertTree;
    tallGrassColor = cDesertTallGrass;
  } else if (moisture >= 0.58) {
    bgColor = cForestBg;
    grassColor = cForestGrass;
    treeColor = cForestTree;
    tallGrassColor = cForestTallGrass;
  } else if (moisture < 0.38) {
    // Interpolate desert -> plains
    const t = (moisture - 0.22) / (0.38 - 0.22);
    bgColor = lerpColor(cDesertBg, cPlainsBg, t);
    grassColor = lerpColor(cDesertGrass, cPlainsGrass, t);
    treeColor = lerpColor(cDesertTree, cPlainsTree, t);
    tallGrassColor = lerpColor(cDesertTallGrass, cPlainsTallGrass, t);
  } else if (moisture < 0.42) {
    bgColor = cPlainsBg;
    grassColor = cPlainsGrass;
    treeColor = cPlainsTree;
    tallGrassColor = cPlainsTallGrass;
  } else {
    // Interpolate plains -> forest
    const t = (moisture - 0.42) / (0.58 - 0.42);
    bgColor = lerpColor(cPlainsBg, cForestBg, t);
    grassColor = lerpColor(cPlainsGrass, cForestGrass, t);
    treeColor = lerpColor(cPlainsTree, cForestTree, t);
    tallGrassColor = lerpColor(cPlainsTallGrass, cForestTallGrass, t);
  }

  return {
    id: biomeId,
    name: biomeId === 'forest' ? 'Ancient Grove' : biomeId === 'desert' ? 'Sandy Wasteland' : 'Grassland Plains',
    bgColor,
    grassColor,
    treeColor,
    tallGrassColor
  };
}

// Color interpolator helper function
function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.substring(1, 3), 16);
  const g1 = parseInt(c1.substring(3, 5), 16);
  const b1 = parseInt(c1.substring(5, 7), 16);

  const r2 = parseInt(c2.substring(1, 3), 16);
  const g2 = parseInt(c2.substring(3, 5), 16);
  const b2 = parseInt(c2.substring(5, 7), 16);

  const r = Math.round(r1 + t * (r2 - r1));
  const g = Math.round(g1 + t * (g2 - g1));
  const b = Math.round(b1 + t * (b2 - b1));

  const rs = Math.min(255, Math.max(0, r)).toString(16).padStart(2, '0');
  const gs = Math.min(255, Math.max(0, g)).toString(16).padStart(2, '0');
  const bs = Math.min(255, Math.max(0, b)).toString(16).padStart(2, '0');

  return `#${rs}${gs}${bs}`;
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

  // PASS 1: Landmark Placement (Highest priority so landmarks aren't carved up)
  const landmarkTile = LandmarkGenerator.getTile(gx, gy, seed, mapId);
  if (landmarkTile !== null) {
    return landmarkTile;
  }

  // PASS 2: Height Map, Moisture Map, and Temperature Map Generation
  const elevation = HeightGenerator.getElevation(gx, gy, seed);
  const moisture = MoistureGenerator.getMoisture(gx, gy, seed);
  const temp = TemperatureGenerator.getTemperature(gx, gy, seed, elevation);

  // PASS 3: Biome Assignment
  const biomeId = BiomeGenerator.determineBiome(elevation, moisture, temp);

  // PASS 4: River Generation (Flowing from high elevation down towards lakes/edges)
  const isRiver = RiverGenerator.isRiverTile(gx, gy, seed, mapId);
  if (isRiver) {
    return TILE_WATER;
  }

  // PASS 5: Lake Generation (Flooding depressions and creating irregular shorelines + islands)
  if (LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
    return TILE_WATER;
  }

  // PASS 6: Pond Generation (Small organic bodies of water with surrounding reeds)
  const pondTile = PondGenerator.getTile(gx, gy, seed);
  if (pondTile !== null) {
    return pondTile;
  }

  // PASS 7: Beach Detection & Transition Zone
  const nearWater = BiomeGenerator.isNearWater(gx, gy, seed, mapId);
  if (nearWater) {
    const beachTile = BeachGenerator.getTile(gx, gy, seed, true);
    if (beachTile !== null) {
      return beachTile;
    }
    return TILE_GRASS;
  }

  // PASS 8: Cliff Detection (Finding steep elevation changes to render rock faces)
  const southElevation = HeightGenerator.getElevation(gx, gy + 1, seed);
  const cliffTile = CliffGenerator.getTile(gx, gy, seed, elevation, southElevation);
  if (cliffTile !== null) {
    return cliffTile;
  }

  // PASS 9: Road Generation (Winding dirt paths near towns)
  const roadTile = RoadGenerator.getTile(gx, gy, seed, mapId, elevation);
  if (roadTile !== null) {
    return roadTile;
  }

  // PASS 10: Vegetation Generation (Organic forest distribution with clearings)
  const vegTile = VegetationGenerator.getTile(gx, gy, seed, moisture, biomeId);
  if (vegTile !== null) {
    return vegTile;
  }

  // PASS 11: Decoration & Default Grass Variant Placement
  const g = hash2D(gx, gy, seed + 4000);
  if (g > 0.72) return TILE_TALL_GRASS;

  return TILE_GRASS;
}

// ===== Town placement (jittered grid, same family of technique as Minecraft structures) =====

interface ChunkCoordPair {
  cx: number;
  cy: number;
}

function getTownSuitability(cx: number, cy: number, seed: number): number {
  const tx = cx * 16 + 7;
  const ty = cy * 16 + 7;

  const samples = [
    [tx, ty],
    [cx * 16 + 4, cy * 16 + 4],
    [cx * 16 + 11, cy * 16 + 4],
    [cx * 16 + 4, cy * 16 + 11],
    [cx * 16 + 11, cy * 16 + 11]
  ];

  let score = 100;
  for (const [sx, sy] of samples) {
    const el = HeightGenerator.getElevation(sx, sy, seed);
    if (el < 0.33) {
      score -= 150;
    }
    if (el > 0.58) {
      score -= 100;
    }
    if (RiverGenerator.isRiverTile(sx, sy, seed, 'route_1')) {
      score -= 150;
    }
    if (PondGenerator.isPondTile(sx, sy, seed)) {
      score -= 150;
    }
  }
  return score;
}

/** Which chunk (if any) in this cell of the town-spacing grid is the town. */
function townChunkForCell(cellX: number, cellY: number, seed: number): ChunkCoordPair {
  let bestCx = cellX * TOWN_CHUNK_SPACING;
  let bestCy = cellY * TOWN_CHUNK_SPACING;
  let maxScore = -999999;

  for (let cand = 0; cand < 5; cand++) {
    const hx = hash2D(cellX, cellY, seed + 5000 + cand);
    const hy = hash2D(cellX, cellY, seed + 6000 + cand);
    const cx = cellX * TOWN_CHUNK_SPACING + Math.floor(hx * TOWN_CHUNK_SPACING);
    const cy = cellY * TOWN_CHUNK_SPACING + Math.floor(hy * TOWN_CHUNK_SPACING);

    if (cx < 1 || cx >= 15 || cy < 1 || cy >= 15) continue;

    const score = getTownSuitability(cx, cy, seed);
    if (score > maxScore) {
      maxScore = score;
      bestCx = cx;
      bestCy = cy;
    }
  }

  return {
    cx: bestCx,
    cy: bestCy,
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
 * Stamp a highly stylized themed town template onto the chunk tile grid (mutates in place).
 * Picked deterministically by cell coordinates to ensure high visual variety across towns.
 */
function stampTown(tiles: number[][], cx: number, cy: number, seed: number): void {
  const townHash = hash2D(cx, cy, seed + 12000);
  const townType = Math.floor(townHash * 3); // 0: Fishing Village, 1: Forest Sanctuary, 2: Mountain Camp

  // Clear obstacles in town chunk boundaries (x: 1..14, y: 1..14)
  for (let y = 1; y <= 14; y++) {
    for (let x = 1; x <= 14; x++) {
      tiles[y][x] = TILE_GRASS;
    }
  }

  // Draw cleaner intersecting roads entering and leaving town (at x = 7 and y = 7)
  // This ensures roads from all 4 directions naturally enter/leave!
  for (let i = 0; i < 16; i++) {
    tiles[7][i] = TILE_PATH;
    tiles[i][7] = TILE_PATH;
  }

  if (townType === 0) {
    // === FISHING VILLAGE (Water/Piers Theme) ===
    // Beautiful water cove on the right (x: 12..14, y: 1..14, excluding the road at y = 7)
    for (let y = 1; y <= 14; y++) {
      if (y === 7) continue; // preserve entering road
      for (let x = 12; x <= 14; x++) {
        tiles[y][x] = TILE_WATER;
      }
    }

    // Wooden bridge docks extending from the road into water
    for (let x = 8; x <= 14; x++) {
      tiles[7][x] = TILE_BUILDING_FLOOR; // bridge tiles
    }

    // Building 1 (Fisherman's Main Cabin): at x: 2..6, y: 2..5
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 6; x++) {
        if (y === 2 || y === 5 || x === 2 || x === 6) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[5][4] = TILE_DOOR;

    // Building 2 (Fish Market Shack): at x: 2..5, y: 10..13
    for (let y = 10; y <= 13; y++) {
      for (let x = 2; x <= 5; x++) {
        if (y === 10 || y === 13 || x === 2 || x === 5) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[10][4] = TILE_DOOR;

    // Fences and decoration trees
    tiles[2][8] = TILE_TREE;
    tiles[13][8] = TILE_TREE;
    tiles[3][10] = TILE_TALL_GRASS;
    tiles[11][10] = TILE_TALL_GRASS;

  } else if (townType === 1) {
    // === FOREST SANCTUARY (Nature/Woodland Theme) ===
    // Building 1 (Sanctuary Lodge): at x: 2..6, y: 2..5
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 6; x++) {
        if (y === 2 || y === 5 || x === 2 || x === 6) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[5][4] = TILE_DOOR;

    // Building 2 (Greenhouse Shrine): at x: 9..13, y: 2..5
    for (let y = 2; y <= 5; y++) {
      for (let x = 9; x <= 13; x++) {
        if (y === 2 || y === 5 || x === 9 || x === 13) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[5][11] = TILE_DOOR;

    // Fenced Garden at x: 2..6, y: 10..13
    // Use TILE_BUILDING_WALL for the neat wooden garden fence
    for (let y = 10; y <= 13; y++) {
      for (let x = 2; x <= 6; x++) {
        if (y === 10 || x === 2 || x === 6) {
          tiles[y][x] = TILE_BUILDING_WALL; // fence
        } else if (y === 13) {
          // Keep bottom open as a garden gate or path
          if (x === 4) {
            tiles[y][x] = TILE_PATH;
          } else {
            tiles[y][x] = TILE_BUILDING_WALL;
          }
        } else {
          tiles[y][x] = TILE_TALL_GRASS; // lush garden plants
        }
      }
    }

    // Elegant sanctuary trees and wild groves framing the town
    tiles[10][9] = TILE_TREE;
    tiles[11][13] = TILE_TREE;
    tiles[13][10] = TILE_TREE;
    tiles[13][13] = TILE_TREE;

  } else {
    // === MOUNTAIN CAMP (Highlands/Stone Theme) ===
    // Building 1 (Mining Outpost): at x: 2..7, y: 2..5
    for (let y = 2; y <= 5; y++) {
      for (let x = 2; x <= 7; x++) {
        if (y === 2 || y === 5 || x === 2 || x === 7) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[5][4] = TILE_DOOR;

    // Building 2 (Tool Storage): at x: 9..13, y: 10..13
    for (let y = 10; y <= 13; y++) {
      for (let x = 9; x <= 13; x++) {
        if (y === 10 || y === 13 || x === 9 || x === 13) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else {
          tiles[y][x] = TILE_BUILDING_FLOOR;
        }
      }
    }
    tiles[10][11] = TILE_DOOR;

    // Mountain town central bonfire / plaza at x: 9..11, y: 3..5
    for (let y = 3; y <= 5; y++) {
      for (let x = 9; x <= 11; x++) {
        tiles[y][x] = TILE_PATH; // Stone plaza floor
      }
    }
    tiles[4][10] = TILE_PORTAL; // Campfire core represented by a mini-swirling portal/fire!

    // Stone walls surrounding parts of the camp to feel fortified
    for (let x = 2; x <= 6; x++) {
      tiles[10][x] = TILE_BUILDING_WALL; // defensive stone fence
      tiles[13][x] = TILE_BUILDING_WALL;
    }
    tiles[11][2] = TILE_BUILDING_WALL;
    tiles[12][2] = TILE_BUILDING_WALL;

    tiles[12][4] = TILE_TALL_GRASS; // rugged mountain weeds
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
    stampTown(tiles, cx, cy, seed);
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
          const townHash = hash2D(cx, cy, seed + 12000);
          const townType = Math.floor(townHash * 3); // 0: Fishing, 1: Forest, 2: Mountain

          let name = 'Town Merchant';
          let sprite = 'clerk_route';
          let dialogueLines = [
            { speaker: 'Town Merchant', text: "Greetings, traveler! This is a temporary town generated on this expedition." },
            { speaker: 'Town Merchant', text: "When this route is empty, this town and its NPCs will be recycled!" }
          ];

          if (townType === 0) {
            name = 'Fisher Joe';
            sprite = 'clerk_route';
            dialogueLines = [
              { speaker: 'Fisher Joe', text: "Ahoy, explorer! Welcome to our lakeside fishing village. The Cerulean Lake contains rare aquatic creatures!" },
              { speaker: 'Fisher Joe', text: "We build our wood cabins on piers so we can cast lines straight from our doorsteps!" }
            ];
          } else if (townType === 1) {
            name = 'Druid Elara';
            sprite = 'ranger';
            dialogueLines = [
              { speaker: 'Druid Elara', text: "Welcome, traveler, to our quiet forest sanctuary. The ancient grove trees whisper secrets of legendary spawns." },
              { speaker: 'Druid Elara', text: "Feel free to rest inside our wooden cabin, but please respect the forest's gentle ecosystems!" }
            ];
          } else {
            name = 'Miner Brock';
            sprite = 'craftsman';
            dialogueLines = [
              { speaker: 'Miner Brock', text: "Greetings, trainer! This rocky mountain camp is situated high in the Craggy Highlands." },
              { speaker: 'Miner Brock', text: "Beware of sudden cliff faces and steep drops! Rock-type monsters thrive in these craggy crevices." }
            ];
          }

          npcs.push({
            id: 100 + cx * 16 + cy,
            name,
            sprite,
            position: { x: (cx * 16 + 7) * 16, y: (cy * 16 + 9) * 16 },
            direction: 'down',
            dialogues: [dialogueLines]
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