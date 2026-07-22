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

import { WORLD_SEED, TOWN_CHUNK_SPACING, CHUNK_SIZE, TILE_SIZE } from './constants.js';
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

/** GLSL-style edge smoothstep: 0 below edge0, 1 above edge1, smooth between. */
function smoothstepEdge(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return smoothstep(t);
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
  // NEW: Generates the raw terrain data, completely ignoring towns to prevent recursion loops
  static getBaseElevation(gx: number, gy: number, seed: number, mapId: string = 'route_1'): number {
    // Beautiful thematic landscape blending for landmarks
    if (mapId === 'route_1') {
      const dist = Math.sqrt((gx - 110) ** 2 + (gy - 110) ** 2);
      if (dist < 15) return 0.45;
    } else if (mapId === 'route_2') {
      const dist = Math.sqrt((gx - 150) ** 2 + (gy - 130) ** 2);
      if (dist < 15) return 0.68;
    } else if (mapId === 'route_3') {
      const dist = Math.sqrt((gx - 130) ** 2 + (gy - 90) ** 2);
      if (dist < 15) {
        const lakeDist = Math.sqrt((gx - 138) ** 2 + (gy - 90) ** 2);
        if (lakeDist < 6) return 0.25; 
        return 0.42; 
      }
    } else if (mapId === 'route_4') {
      const dist = Math.sqrt((gx - 105) ** 2 + (gy - 145) ** 2);
      if (dist < 15) {
        if (dist < 6) return 0.30; 
        if (dist < 9) return 0.75; 
        return 0.55; 
      }
    }

    // Large, natural, connected mountain ridges using base FBM + ridged FBM
    const base = fbm2D(gx, gy, seed, 4, 0.012);
    const n2 = fbm2D(gx + 500, gy + 500, seed + 123, 3, 0.02);
    const ridge = 1.0 - Math.abs(n2 * 2.0 - 1.0);

    let raw = base;
    if (base > 0.52) {
      raw = base + ridge * 0.25;
    } else {
      raw = Math.pow(base / 0.52, 1.5) * 0.52;
    }

    if (raw > 0.66 && raw < 0.74) {
      raw = 0.68; 
    }

    return Math.min(0.99, Math.max(0.0, raw));
  }

  static getElevation(gx: number, gy: number, seed: number, mapId: string = 'route_1'): number {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    
    // Check towns first, but DO NOT use getElevation inside town checks!
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return 0.45; // flat ground
    }

    return this.getBaseElevation(gx, gy, seed, mapId);
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
    if (elevation > 0.82) return 'ice_peak'; // all high ground is now one identity — no more separate warm/brown "mountain"
    if (temp < 0.12) return 'tundra';

    if (moisture > 0.55) {
      return 'forest';
    } else if (moisture < 0.24) {
      return 'desert';
    }
    return 'plains';
  }

  static getWaterProximity(gx: number, gy: number, seed: number, mapId: string): number {
    for (let r = 1; r <= 4; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const nx = gx + dx;
            const ny = gy + dy;
            const el = HeightGenerator.getBaseElevation(nx, ny, seed, mapId);
            if (el < 0.33 || RiverGenerator.isRawRiverTile(nx, ny, seed, mapId) || PondGenerator.isRawPondTile(nx, ny, seed)) {
              return 5 - r;
            }
          }
        }
      }
    }
    return 0;
  }

  static isBeachTile(gx: number, gy: number, seed: number, mapId: string = 'route_1'): boolean {
    const el = HeightGenerator.getBaseElevation(gx, gy, seed, mapId);
    if (el < 0.33 || RiverGenerator.isRawRiverTile(gx, gy, seed, mapId) || PondGenerator.isRawPondTile(gx, gy, seed)) {
      return false;
    }

    const prox = BiomeGenerator.getWaterProximity(gx, gy, seed, mapId);
    if (prox === 0) return false;

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
        const el = HeightGenerator.getBaseElevation(x, y, seed, mapId);
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
      const currentEl = HeightGenerator.getBaseElevation(cx, cy, seed, mapId);
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

        const nel = HeightGenerator.getBaseElevation(nx, ny, seed, mapId);
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
          const nel = HeightGenerator.getBaseElevation(nx, ny, seed, mapId);
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

  static isRawRiverTile(gx: number, gy: number, seed: number, mapId: string): boolean {
    if (mapId === 'city') return false;

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

  static isRiverTile(gx: number, gy: number, seed: number, mapId: string): boolean {
    if (mapId === 'city') return false;

    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return false;
    }

    return this.isRawRiverTile(gx, gy, seed, mapId);
  }
}

export class LakeGenerator {
  static isLakeTile(elevation: number, gx: number, gy: number, seed: number): boolean {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return false;
    }

    const warpX = fbm2D(gx * 0.08, gy * 0.08, seed + 8500, 2, 0.1) * 6.0;
    const warpY = fbm2D(gx * 0.08, gy * 0.08, seed + 9500, 2, 0.1) * 6.0;
    
    const shoreNoise = fbm2D((gx + warpX) * 0.12, (gy + warpY) * 0.12, seed + 8000, 3, 0.06) * 0.08;
    const threshold = 0.34 + shoreNoise;

    if (elevation < threshold) {
      const islandNoise = fbm2D(gx * 0.15, gy * 0.15, seed + 900, 2, 0.08);
      if (islandNoise > 0.70 && elevation > threshold - 0.08) {
        return false;
      }
      return true;
    }
    return false;
  }
}

export class PondGenerator {
  static getRawTile(gx: number, gy: number, seed: number): number | null {
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

  static getTile(gx: number, gy: number, seed: number): number | null {
    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) {
      return null;
    }

    return this.getRawTile(gx, gy, seed);
  }

  static isRawPondTile(gx: number, gy: number, seed: number): boolean {
    return this.getRawTile(gx, gy, seed) !== null;
  }

  static isPondTile(gx: number, gy: number, seed: number): boolean {
    return this.getTile(gx, gy, seed) !== null;
  }
}

export class BeachGenerator {
  static getTile(gx: number, gy: number, seed: number, isNearWater: boolean, mapId: string = 'city'): number | null {
    if (!isNearWater) return null;

    const h = hash2D(gx, gy, seed + 3500);
    if (h < 0.15) {
      return TILE_TALL_GRASS;
    }

    return null;
  }
}

export class CliffGenerator {
  static getTile(gx: number, gy: number, seed: number, elevation: number, southElevation: number, mapId: string = 'route_1'): number | null {
    if (elevation < 0.65) return null;
    if (RoadGenerator.isNearRoad(gx, gy, seed, mapId)) return null;

    const cx = Math.floor(gx / CHUNK_SIZE);
    const cy = Math.floor(gy / CHUNK_SIZE);
    if (seed !== 0 && isTownChunk(cx, cy, seed)) return null;

    if (RiverGenerator.isRawRiverTile(gx, gy, seed, mapId) || 
        PondGenerator.isRawPondTile(gx, gy, seed) || 
        LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
      return null;
    }

    const diffSouth = elevation - southElevation;
    if (diffSouth >= 0.08) {
      return TILE_MOUNTAIN;
    }

    const westElevation = HeightGenerator.getBaseElevation(gx - 1, gy, seed, mapId);
    const eastElevation = HeightGenerator.getBaseElevation(gx + 1, gy, seed, mapId);
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

        const el = HeightGenerator.getBaseElevation(cx, cy, seed, mapId);
        const isRiver = RiverGenerator.isRawRiverTile(cx, cy, seed, mapId);

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
  private static townListCache: Record<number, { cx: number, cy: number }[]> = {};

  private static getTownChunksForSeed(seed: number): { cx: number, cy: number }[] {
    if (this.townListCache[seed]) return this.townListCache[seed];
    const towns: { cx: number, cy: number }[] = [];
    for (let cx = 0; cx < 16; cx++) {
      for (let cy = 0; cy < 16; cy++) {
        if (isTownChunk(cx, cy, seed)) {
          towns.push({ cx, cy });
        }
      }
    }
    this.townListCache[seed] = towns;
    return towns;
  }

  // Pre-computed road distance cache to avoid O(n) distance checks per tile
  private static roadDistanceCache: Record<string, number> = {};

  static getTile(gx: number, gy: number, seed: number, mapId: string = 'city', elevation: number = 0.5): number | null {
    if (mapId === 'city') return null;

    // Check cache first
    const cacheKey = `${seed}_${mapId}_${gx}_${gy}`;
    if (this.roadDistanceCache[cacheKey] !== undefined) {
      const minDist = this.roadDistanceCache[cacheKey];
      if (minDist < 1.5) {
        if (elevation < 0.33 || RiverGenerator.isRawRiverTile(gx, gy, seed, mapId) || PondGenerator.isRawPondTile(gx, gy, seed)) {
          return TILE_BUILDING_FLOOR;
        }
        return TILE_PATH;
      }
      return null;
    }

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

    if (seed !== 0) {
      const towns = this.getTownChunksForSeed(seed);
      for (const town of towns) {
        const tx = town.cx * 16 + 7;
        const ty = town.cy * 16 + 7;

        const t0Pts = RoadWaypoints.getWaypoints(p0, { x: tx, y: ty }, seed, `${mapId}_town_0_${town.cx}_${town.cy}`);
        for (let i = 0; i < t0Pts.length - 1; i++) {
          const d = distanceToCurve(gx, gy, t0Pts[i].x, t0Pts[i].y, t0Pts[i+1].x, t0Pts[i+1].y, seed + i + 10);
          if (d < minDist) {
            minDist = d;
          }
        }

        const t1Pts = RoadWaypoints.getWaypoints({ x: tx, y: ty }, p1, seed, `${mapId}_town_1_${town.cx}_${town.cy}`);
        for (let i = 0; i < t1Pts.length - 1; i++) {
          const d = distanceToCurve(gx, gy, t1Pts[i].x, t1Pts[i].y, t1Pts[i+1].x, t1Pts[i+1].y, seed + i + 20);
          if (d < minDist) {
            minDist = d;
          }
        }
      }
    }

    this.roadDistanceCache[cacheKey] = minDist;

    if (minDist < 1.5) {
      if (elevation < 0.33 || RiverGenerator.isRawRiverTile(gx, gy, seed, mapId) || PondGenerator.isRawPondTile(gx, gy, seed)) {
        return TILE_BUILDING_FLOOR;
      }
      return TILE_PATH;
    }

    return null;
  }

  static isNearRoad(gx: number, gy: number, seed: number, mapId: string): boolean {
    // Use cached distance check instead of calling getTile 25 times
    const cacheKey = `${seed}_${mapId}_${gx}_${gy}`;
    if (RoadGenerator.roadDistanceCache[cacheKey] !== undefined) {
      return RoadGenerator.roadDistanceCache[cacheKey] < 1.5;
    }
    // If not in cache, compute it
    const result = RoadGenerator.getTile(gx, gy, seed, mapId) !== null;
    return result;
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
    // Use cached road check via public method
    if (RoadGenerator.isNearRoad(gx, gy, seed, mapId)) return null;

    const forestNoise = fbm2D(gx, gy, seed + 1200, 3, 0.04);
    const detailNoise = valueNoise2D(gx * 0.6, gy * 0.6, seed + 3000);

    if (biomeId === 'forest') {
      if (forestNoise > 0.55) {
        if (detailNoise < 0.22) {
          return TILE_TALL_GRASS;
        }
        return TILE_TREE;
      }
      if (forestNoise > 0.38) {
        if (detailNoise > 0.45) return TILE_TREE;
        if (detailNoise < 0.25) return TILE_TALL_GRASS;
        return TILE_GRASS;
      }
      if (forestNoise > 0.25) {
        if (detailNoise > 0.65) return TILE_TREE;
        if (detailNoise > 0.4) return TILE_TALL_GRASS;
      }
      return TILE_GRASS;
    }

    if (biomeId === 'plains') {
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
    if (seed === 0) return DecorationType.NONE;

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
      } else if (biomeId === 'ice_peak') {
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

export function getBiomeAt(gx: number, gy: number, seed: number, mapId: string = 'route_1'): BiomeInfo {
  // Fast cache lookup
  const cacheKey = `${seed}_${mapId}_${gx}_${gy}`;
  if (biomeCache[cacheKey]) return biomeCache[cacheKey];

  if (seed === 0) {
    const biome: BiomeInfo = {
      id: 'city',
      name: 'Permanent City',
      bgColor: '#e2d6b5',
      grassColor: '#60a050',
      treeColor: '#1d4a0e',
      tallGrassColor: '#4d8a3e',
    };
    biomeCache[cacheKey] = biome;
    return biome;
  }

  if (gx <= 3 || gx >= 252 || gy <= 3 || gy >= 252) {
    const biome: BiomeInfo = {
      id: 'forest',
      name: 'Ancient Grove',
      bgColor: '#3a7c2f',
      grassColor: '#4a8c3f',
      treeColor: '#1a4a0e',
      tallGrassColor: '#2d5a1e',
    };
    biomeCache[cacheKey] = biome;
    return biome;
  }

  const landmark = LandmarkGenerator.getTile(gx, gy, seed, mapId);
  if (landmark !== null) {
    if (landmark === TILE_WATER) {
      const biome: BiomeInfo = {
        id: 'lake',
        name: 'Cerulean Lake',
        bgColor: '#3b6fa0',
        grassColor: '#3b6fa0',
        treeColor: '#1d4a0e',
        tallGrassColor: '#4d8a3e',
      };
      biomeCache[cacheKey] = biome;
      return biome;
    }
    if (landmark === TILE_MOUNTAIN) {
      const biome: BiomeInfo = {
        id: 'ice_peak',
        name: 'Frozen Summit',
        bgColor: '#c9dbe8',
        grassColor: '#dbe9f2',
        treeColor: '#4a6b7a',
        tallGrassColor: '#a8c8d8',
      };
      biomeCache[cacheKey] = biome;
      return biome;
    }
  }

  const isRiver = RiverGenerator.isRawRiverTile(gx, gy, seed, mapId);
  const isPond = PondGenerator.isRawPondTile(gx, gy, seed);
  const elevation = HeightGenerator.getBaseElevation(gx, gy, seed, mapId);

  if (isRiver || isPond || LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
    const biome: BiomeInfo = {
      id: 'lake',
      name: 'Cerulean Lake',
      bgColor: '#3b6fa0',
      grassColor: '#3b6fa0',
      treeColor: '#1d4a0e',
      tallGrassColor: '#4d8a3e',
    };
    biomeCache[cacheKey] = biome;
    return biome;
  }

  if (BiomeGenerator.isBeachTile(gx, gy, seed, mapId)) {
    const biome: BiomeInfo = {
      id: 'desert',
      name: 'Sandy Beach',
      bgColor: '#d8c292',
      grassColor: '#e4d2a3',
      treeColor: '#c29b53',
      tallGrassColor: '#b59247',
    };
    biomeCache[cacheKey] = biome;
    return biome;
  }

  const moisture = MoistureGenerator.getMoisture(gx, gy, seed);
  const temp = TemperatureGenerator.getTemperature(gx, gy, seed, elevation);
  const biomeId = BiomeGenerator.determineBiome(elevation, moisture, temp);

  // ===== Continuous color blending =====
  // Rather than hard-switching to a flat color the instant a threshold is
  // crossed, every tile blends smoothly across TWO independent axes:
  //   - mountainFactor: how far into "high elevation" this tile is
  //   - coldFactor: how far into "cold" this tile is
  // The four corner palettes (normal / mountain / tundra / ice_peak) sit at
  // the extremes of that 2D space, and every tile bilinearly interpolates
  // between whichever corners it's nearest — so a tile just below the
  // mountain threshold is mostly normal-colored with a faint rocky tint,
  // not a hard line between "green" and "brown". id/name still switch at
  // the same discrete thresholds as before (for the banner/gameplay logic),
  // only the visual color is continuous now.

  const MOUNTAIN_THRESHOLD = 0.82;
  const mountainFactor = smoothstepEdge(MOUNTAIN_THRESHOLD - 0.09, MOUNTAIN_THRESHOLD, elevation);
  const coldFactor = 1 - smoothstepEdge(0.08, 0.20, temp); // 1 when temp<=0.08 (cold), 0 when temp>=0.20

  const cDesertBg = '#d8c292';
  const cDesertGrass = '#e4d2a3';
  const cDesertTree = '#c29b53';
  const cDesertTallGrass = '#b59247';

  const cPlainsBg = '#5c9c4f'; // was a muddy tan — kept green so path tiles don't look like bare dirt
  const cPlainsGrass = '#4a8c3f';
  const cPlainsTree = '#2d5a1e';
  const cPlainsTallGrass = '#3a7c2f';

  const cForestBg = '#3a7c2f';
  const cForestGrass = '#4a8c3f';
  const cForestTree = '#1a4a0e';
  const cForestTallGrass = '#2d5a1e';

  // Base "normal" palette — same moisture-driven forest/plains/desert
  // blend as before, just always computed rather than gated behind a
  // biomeId check.
  let normalBg = cPlainsBg, normalGrass = cPlainsGrass, normalTree = cPlainsTree, normalTallGrass = cPlainsTallGrass;

  if (moisture <= 0.22) {
    normalBg = cDesertBg; normalGrass = cDesertGrass; normalTree = cDesertTree; normalTallGrass = cDesertTallGrass;
  } else if (moisture >= 0.58) {
    normalBg = cForestBg; normalGrass = cForestGrass; normalTree = cForestTree; normalTallGrass = cForestTallGrass;
  } else if (moisture < 0.38) {
    const t = (moisture - 0.22) / (0.38 - 0.22);
    normalBg = lerpColor(cDesertBg, cPlainsBg, t);
    normalGrass = lerpColor(cDesertGrass, cPlainsGrass, t);
    normalTree = lerpColor(cDesertTree, cPlainsTree, t);
    normalTallGrass = lerpColor(cDesertTallGrass, cPlainsTallGrass, t);
  } else if (moisture < 0.42) {
    // stays plains
  } else {
    const t = (moisture - 0.42) / (0.58 - 0.42);
    normalBg = lerpColor(cPlainsBg, cForestBg, t);
    normalGrass = lerpColor(cPlainsGrass, cForestGrass, t);
    normalTree = lerpColor(cPlainsTree, cForestTree, t);
    normalTallGrass = lerpColor(cPlainsTallGrass, cForestTallGrass, t);
  }

  // Tundra palette (Frostbound Tundra)
  const tunBg = '#e2edf2', tunGrass = '#eef5f8', tunTree = '#6b8a9a', tunTallGrass = '#b8d4e0';
  // Ice peak palette (Frozen Summit) — the only "high ground" identity now;
  // there's no separate brown "mountain" palette to blend toward anymore.
  const iceBg = '#c9dbe8', iceGrass = '#dbe9f2', iceTree = '#4a6b7a', iceTallGrass = '#a8c8d8';

  // Step 1: elevation trends normal terrain toward icy peak colors as it
  // climbs (replacing the old normal->mountain blend).
  const elevBg = lerpColor(normalBg, iceBg, mountainFactor);
  const elevGrass = lerpColor(normalGrass, iceGrass, mountainFactor);
  const elevTree = lerpColor(normalTree, iceTree, mountainFactor);
  const elevTallGrass = lerpColor(normalTallGrass, iceTallGrass, mountainFactor);

  // Step 2: temperature separately trends toward tundra colors, independent
  // of elevation — a cold lowland goes pale/frosty even nowhere near a peak.
  const bgColor = lerpColor(elevBg, tunBg, coldFactor);
  const grassColor = lerpColor(elevGrass, tunGrass, coldFactor);
  const treeColor = lerpColor(elevTree, tunTree, coldFactor);
  const tallGrassColor = lerpColor(elevTallGrass, tunTallGrass, coldFactor);

  const result: BiomeInfo = {
    id: biomeId,
    name:
      biomeId === 'forest' ? 'Ancient Grove' :
      biomeId === 'desert' ? 'Sandy Wasteland' :
      biomeId === 'ice_peak' ? 'Frozen Summit' :
      biomeId === 'tundra' ? 'Frostbound Tundra' :
      'Grassland Plains',
    bgColor,
    grassColor,
    treeColor,
    tallGrassColor,
  };
  biomeCache[cacheKey] = result;
  return result;
}

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

export function getCityTile(gx: number, gy: number): number {
  const cityMinX = 105;
  const cityMaxX = 149;
  const cityMinY = 95;
  const cityMaxY = 149;

  const isInsideCity = (gx >= cityMinX && gx <= cityMaxX && gy >= cityMinY && gy <= cityMaxY);

  if (!isInsideCity) {
    return TILE_TREE;
  }

  if (gx >= 126 && gx <= 128 && gy >= 95 && gy <= 97) {
    if (gx === 127 && gy === 96) return TILE_PORTAL;
    return TILE_PATH;
  }
  if (gx >= 126 && gx <= 128 && gy >= 147 && gy <= 149) {
    if (gx === 127 && gy === 148) return TILE_PORTAL;
    return TILE_PATH;
  }
  if (gx >= 147 && gx <= 149 && gy >= 120 && gy <= 122) {
    if (gx === 148 && gy === 121) return TILE_PORTAL;
    return TILE_PATH;
  }
  if (gx >= 105 && gx <= 107 && gy >= 120 && gy <= 122) {
    if (gx === 106 && gy === 121) return TILE_PORTAL;
    return TILE_PATH;
  }

  const isMainRoad = (gy >= 118 && gy <= 124) || (gx >= 124 && gx <= 130);

  if (gx >= 112 && gx <= 122 && gy >= 104 && gy <= 112) {
    if (gy === 112 && gx === 117) return TILE_DOOR;
    if (gy === 112) return TILE_BUILDING_WALL;
    if (gx === 112 || gx === 122 || gy === 104) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  if (gx >= 132 && gx <= 142 && gy >= 104 && gy <= 112) {
    if (gy === 112 && gx === 137) return TILE_DOOR;
    if (gy === 112) return TILE_BUILDING_WALL;
    if (gx === 132 || gx === 142 || gy === 104) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  if (gx >= 112 && gx <= 122 && gy >= 132 && gy <= 140) {
    if (gy === 140 && gx === 117) return TILE_DOOR;
    if (gy === 140) return TILE_BUILDING_WALL;
    if (gx === 112 || gx === 122 || gy === 132) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  if (gx >= 132 && gx <= 142 && gy >= 132 && gy <= 140) {
    if (gy === 140 && gx === 137) return TILE_DOOR;
    if (gy === 140) return TILE_BUILDING_WALL;
    if (gx === 132 || gx === 142 || gy === 132) return TILE_BUILDING_WALL;
    return TILE_BUILDING_FLOOR;
  }

  if (isInsideCity) {
    const isNearStructure = 
      (gx >= 110 && gx <= 124 && gy >= 102 && gy <= 114) || 
      (gx >= 130 && gx <= 144 && gy >= 102 && gy <= 114) || 
      (gx >= 110 && gx <= 124 && gy >= 130 && gy <= 142) || 
      (gx >= 130 && gx <= 144 && gy >= 130 && gy <= 142);

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
    if (gx >= 126 && gx <= 128 && gy >= 243 && gy <= 245) {
      if (gx === 127 && gy === 244) return TILE_PORTAL;
      return TILE_PATH;
    }
  } else if (mapId === 'route_2') {
    if (gx >= 126 && gx <= 128 && gy >= 11 && gy <= 13) {
      if (gx === 127 && gy === 12) return TILE_PORTAL;
      return TILE_PATH;
    }
  } else if (mapId === 'route_3') {
    if (gx >= 11 && gx <= 13 && gy >= 120 && gy <= 122) {
      if (gx === 12 && gy === 121) return TILE_PORTAL;
      return TILE_PATH;
    }
  } else if (mapId === 'route_4') {
    if (gx >= 243 && gx <= 245 && gy >= 120 && gy <= 122) {
      if (gx === 244 && gy === 121) return TILE_PORTAL;
      return TILE_PATH;
    }
  }

  return null;
}

// Cache for raw terrain tiles to avoid recomputation
const rawTerrainCache: Record<string, number> = {};

// Cache for biome info to avoid expensive getBiomeAt() calls during rendering
const biomeCache: Record<string, BiomeInfo> = {};

export function rawTerrainTile(gx: number, gy: number, seed: number, mapId: string = 'city'): number {
  // Check cache first
  const cacheKey = `${seed}_${mapId}_${gx}_${gy}`;
  if (rawTerrainCache[cacheKey] !== undefined) {
    return rawTerrainCache[cacheKey];
  }

  if (seed === 0) {
    return getCityTile(gx, gy);
  }

  if (gx <= 3 || gx >= 252 || gy <= 3 || gy >= 252) {
    return TILE_TREE;
  }

  const outpostTile = getRouteOutpostTile(gx, gy, mapId);
  if (outpostTile !== null) {
    rawTerrainCache[cacheKey] = outpostTile;
    return outpostTile;
  }

  const landmarkTile = LandmarkGenerator.getTile(gx, gy, seed, mapId);
  if (landmarkTile !== null) {
    rawTerrainCache[cacheKey] = landmarkTile;
    return landmarkTile;
  }

  const elevation = HeightGenerator.getBaseElevation(gx, gy, seed, mapId);
  const moisture = MoistureGenerator.getMoisture(gx, gy, seed);
  const temp = TemperatureGenerator.getTemperature(gx, gy, seed, elevation);

  const biomeId = BiomeGenerator.determineBiome(elevation, moisture, temp);

  const isRiver = RiverGenerator.isRawRiverTile(gx, gy, seed, mapId);
  if (isRiver) {
    rawTerrainCache[cacheKey] = TILE_WATER;
    return TILE_WATER;
  }

  if (LakeGenerator.isLakeTile(elevation, gx, gy, seed)) {
    rawTerrainCache[cacheKey] = TILE_WATER;
    return TILE_WATER;
  }

  const pondTile = PondGenerator.getRawTile(gx, gy, seed);
  if (pondTile !== null) {
    rawTerrainCache[cacheKey] = pondTile;
    return pondTile;
  }

  const nearWater = BiomeGenerator.isBeachTile(gx, gy, seed, mapId);
  if (nearWater) {
    const beachTile = BeachGenerator.getTile(gx, gy, seed, true);
    if (beachTile !== null) {
      rawTerrainCache[cacheKey] = beachTile;
      return beachTile;
    }
    rawTerrainCache[cacheKey] = TILE_GRASS;
    return TILE_GRASS;
  }

  const southElevation = HeightGenerator.getBaseElevation(gx, gy + 1, seed, mapId);
  const cliffTile = CliffGenerator.getTile(gx, gy, seed, elevation, southElevation);
  if (cliffTile !== null) {
    rawTerrainCache[cacheKey] = cliffTile;
    return cliffTile;
  }

  const roadTile = RoadGenerator.getTile(gx, gy, seed, mapId, elevation);
  if (roadTile !== null) {
    rawTerrainCache[cacheKey] = roadTile;
    return roadTile;
  }

  const vegTile = VegetationGenerator.getTile(gx, gy, seed, moisture, biomeId);
  if (vegTile !== null) {
    rawTerrainCache[cacheKey] = vegTile;
    return vegTile;
  }

  const g = hash2D(gx, gy, seed + 4000);
  if (g > 0.72) {
    rawTerrainCache[cacheKey] = TILE_TALL_GRASS;
    return TILE_TALL_GRASS;
  }

  rawTerrainCache[cacheKey] = TILE_GRASS;
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
    // FIX: Use getBaseElevation, isRawRiverTile, and isRawPondTile to prevent stack overflow recursion
    const el = HeightGenerator.getBaseElevation(sx, sy, seed);
    if (el < 0.33) {
      score -= 150;
    }
    if (el > 0.58) {
      score -= 100;
    }
    if (RiverGenerator.isRawRiverTile(sx, sy, seed, 'route_1')) {
      score -= 150;
    }
    if (PondGenerator.isRawPondTile(sx, sy, seed)) {
      score -= 150;
    }
  }
  return score;
}

// Global cache for town chunk grid lookups to prevent heavy math loops on safe-spawn checks
const townChunkCellCache: Record<string, ChunkCoordPair> = {};

function townChunkForCell(cellX: number, cellY: number, seed: number): ChunkCoordPair {
  const cacheKey = `${cellX}_${cellY}_${seed}`;
  if (townChunkCellCache[cacheKey]) return townChunkCellCache[cacheKey];

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

  const result = { cx: bestCx, cy: bestCy };
  townChunkCellCache[cacheKey] = result;
  return result;
}

export function isTownChunk(cx: number, cy: number, seed: number): boolean {
  if (seed === 0) return false;
  const cellX = Math.floor(cx / TOWN_CHUNK_SPACING);
  const cellY = Math.floor(cy / TOWN_CHUNK_SPACING);
  const town = townChunkForCell(cellX, cellY, seed);
  return town.cx === cx && town.cy === cy;
}

function stampTown(tiles: number[][], cx: number, cy: number, seed: number): void {
  const townHash = hash2D(cx, cy, seed + 12000);
  const townType = Math.floor(townHash * 3);

  for (let y = 1; y <= 14; y++) {
    for (let x = 1; x <= 14; x++) {
      tiles[y][x] = TILE_GRASS;
    }
  }

  for (let i = 0; i < 16; i++) {
    tiles[7][i] = TILE_PATH;
    tiles[i][7] = TILE_PATH;
  }

  if (townType === 0) {
    for (let y = 1; y <= 14; y++) {
      if (y === 7) continue;
      for (let x = 12; x <= 14; x++) {
        tiles[y][x] = TILE_WATER;
      }
    }

    for (let x = 8; x <= 14; x++) {
      tiles[7][x] = TILE_BUILDING_FLOOR;
    }

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

    tiles[2][8] = TILE_TREE;
    tiles[13][8] = TILE_TREE;
    tiles[3][10] = TILE_TALL_GRASS;
    tiles[11][10] = TILE_TALL_GRASS;

  } else if (townType === 1) {
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

    for (let y = 10; y <= 13; y++) {
      for (let x = 2; x <= 6; x++) {
        if (y === 10 || x === 2 || x === 6) {
          tiles[y][x] = TILE_BUILDING_WALL;
        } else if (y === 13) {
          if (x === 4) {
            tiles[y][x] = TILE_PATH;
          } else {
            tiles[y][x] = TILE_BUILDING_WALL;
          }
        } else {
          tiles[y][x] = TILE_TALL_GRASS;
        }
      }
    }

    tiles[10][9] = TILE_TREE;
    tiles[11][13] = TILE_TREE;
    tiles[13][10] = TILE_TREE;
    tiles[13][13] = TILE_TREE;

  } else {
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

    for (let y = 3; y <= 5; y++) {
      for (let x = 9; x <= 11; x++) {
        tiles[y][x] = TILE_PATH;
      }
    }
    tiles[4][10] = TILE_PORTAL;

    for (let x = 2; x <= 6; x++) {
      tiles[10][x] = TILE_BUILDING_WALL;
      tiles[13][x] = TILE_BUILDING_WALL;
    }
    tiles[11][2] = TILE_BUILDING_WALL;
    tiles[12][2] = TILE_BUILDING_WALL;

    tiles[12][4] = TILE_TALL_GRASS;
  }
}

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

const townChunkCache: Record<string, number[][]> = {};

export function getGlobalTile(gx: number, gy: number, seed: number, mapId: string = 'city'): number {
  const cx = Math.floor(gx / CHUNK_SIZE);
  const cy = Math.floor(gy / CHUNK_SIZE);
  
  if (seed !== 0 && isTownChunk(cx, cy, seed)) {
    const cacheKey = `${cx},${cy},${seed},${mapId}`;
    if (!townChunkCache[cacheKey]) {
      townChunkCache[cacheKey] = generateChunkTiles(cx, cy, seed, mapId);
    }
    const chunk = townChunkCache[cacheKey];
    let lx = gx - cx * CHUNK_SIZE;
    let ly = gy - cy * CHUNK_SIZE;
    if (lx >= 0 && lx < CHUNK_SIZE && ly >= 0 && ly < CHUNK_SIZE) {
      return chunk[ly][lx];
    }
  }
  
  return rawTerrainTile(gx, gy, seed, mapId);
}

export function findSafeSpawn(seed: number, startPixelX: number, startPixelY: number, mapId: string = 'city'): { x: number, y: number } {
  let gx = Math.floor(startPixelX / TILE_SIZE);
  let gy = Math.floor(startPixelY / TILE_SIZE);
  
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
              x: testGx * TILE_SIZE,
              y: testGy * TILE_SIZE
            };
          }
        }
      }
    }
  }
  
  return { x: startPixelX, y: startPixelY };
}

export function getNPCsForMap(mapId: string, seed: number): NPCDefinition[] {
  const npcs: NPCDefinition[] = [];

  if (mapId === 'city') {
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
    for (let cx = 0; cx < 16; cx++) {
      for (let cy = 0; cy < 16; cy++) {
        if (isTownChunk(cx, cy, seed)) {
          const townHash = hash2D(cx, cy, seed + 12000);
          const townType = Math.floor(townHash * 3);

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
              { speaker: 'Miner Brock', text: "Greetings, trainer! This mining camp sits high up in the Frozen Summit." },
              { speaker: 'Miner Brock', text: "Beware of sudden cliff faces and steep, icy drops! Ice-type monsters thrive up here in the cold." }
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