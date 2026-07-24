/** Core math utilities */

import { Vec2, Direction } from './pokemon/models/PokemonInstance.js';
import { DIAGONAL_NORMALIZER } from './pokemon/data/Constants.js';

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vec2Add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vec2Sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vec2Scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vec2Length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vec2Distance(a: Vec2, b: Vec2): number {
  return vec2Length(vec2Sub(a, b));
}

export function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function vec2Lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function vec2Floor(v: Vec2): Vec2 {
  return { x: Math.floor(v.x), y: Math.floor(v.y) };
}

export function vec2Equals(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function tileToWorld(tileX: number, tileY: number, tileSize: number): Vec2 {
  return { x: tileX * tileSize, y: tileY * tileSize };
}

export function worldToTile(worldX: number, worldY: number, tileSize: number): Vec2 {
  return { x: Math.floor(worldX / tileSize), y: Math.floor(worldY / tileSize) };
}

export function worldToChunk(worldX: number, worldY: number, chunkSize: number, tileSize: number): Vec2 {
  const tile = worldToTile(worldX, worldY, tileSize);
  return {
    x: Math.floor(tile.x / chunkSize),
    y: Math.floor(tile.y / chunkSize),
  };
}

export function tileToChunk(tileX: number, tileY: number, chunkSize: number): Vec2 {
  return {
    x: Math.floor(tileX / chunkSize),
    y: Math.floor(tileY / chunkSize),
  };
}

export function chunkToTile(chunkX: number, chunkY: number, chunkSize: number): Vec2 {
  return { x: chunkX * chunkSize, y: chunkY * chunkSize };
}

export function directionToVec2(dir: Direction): Vec2 {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'up-left': return { x: -1, y: -1 };
    case 'up-right': return { x: 1, y: -1 };
    case 'down-left': return { x: -1, y: 1 };
    case 'down-right': return { x: 1, y: 1 };
  }
}

export function vec2ToDirection(v: Vec2): Direction {
  const angle = Math.atan2(v.y, v.x);
  if (angle >= -Math.PI / 8 && angle < Math.PI / 8) return 'right';
  if (angle >= Math.PI / 8 && angle < 3 * Math.PI / 8) return 'down-right';
  if (angle >= 3 * Math.PI / 8 && angle < 5 * Math.PI / 8) return 'down';
  if (angle >= 5 * Math.PI / 8 && angle < 7 * Math.PI / 8) return 'down-left';
  if (angle >= 7 * Math.PI / 8 || angle < -7 * Math.PI / 8) return 'left';
  if (angle >= -7 * Math.PI / 8 && angle < -5 * Math.PI / 8) return 'up-left';
  if (angle >= -5 * Math.PI / 8 && angle < -3 * Math.PI / 8) return 'up';
  return 'up-right';
}

export function normalizeMovement(velocity: Vec2, baseSpeed: number): Vec2 {
  if (velocity.x !== 0 && velocity.y !== 0) {
    return vec2Scale(velocity, baseSpeed * DIAGONAL_NORMALIZER);
  }
  return vec2Scale(velocity, baseSpeed);
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function aabbIntersect(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}