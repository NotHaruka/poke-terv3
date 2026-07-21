/** Client-side chunk management and rendering */

import {
  Vec2, CHUNK_SIZE, TILE_SIZE, CHUNK_PIXELS, RENDER_CHUNK_RADIUS,
  worldToChunk,
  generateChunkTiles as generateChunkTilesShared,
  isWalkableTileId,
  getBiomeAt,
} from 'poke-ter-shared';
import { CollisionSystem, Collider } from '../../engine/Collision.js';
import { envSystem } from '../../engine/EnvironmentSystem.js';

interface Chunk {
  cx: number;
  cy: number;
  tiles: number[][];
  loaded: boolean;
}

export class ChunkManager {
  private chunks = new Map<string, Chunk>();
  private collisionSystem: CollisionSystem;
  private tileColliders: Collider[] = [];
  public currentSeed: number = 0;
  public currentMapId: string = 'city';

  constructor(collisionSystem: CollisionSystem) {
    this.collisionSystem = collisionSystem;
  }

  /** Pseudo-random hash for deterministic environmental variations */
  private hash(x: number, y: number, seed: number = 0): number {
    let h = x * 374761393 + y * 668265263 + seed * 982451653;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h >>> 0) % 100000) / 100000;
  }

  public setSeed(seed: number): void {
    if (this.currentSeed !== seed) {
      this.currentSeed = seed;
      this.clear(); // Clear chunks so they regenerate with new seed
    }
  }

  /** Get chunk key from coordinates */
  private chunkKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  /** Load or create a chunk */
  loadChunk(cx: number, cy: number, tiles?: number[][]): void {
    const key = this.chunkKey(cx, cy);
    if (this.chunks.has(key)) return;

    const chunk: Chunk = {
      cx,
      cy,
      tiles: tiles ?? this.generateChunkTiles(cx, cy),
      loaded: true,
    };

    this.chunks.set(key, chunk);
    this.addChunkColliders(chunk);
  }

  /** Unload a chunk */
  unloadChunk(cx: number, cy: number): void {
    const key = this.chunkKey(cx, cy);
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.removeChunkColliders(chunk);
    this.chunks.delete(key);
  }

  /** Check if a chunk is loaded */
  isChunkLoaded(cx: number, cy: number): boolean {
    return this.chunks.has(this.chunkKey(cx, cy));
  }

  /** Get a tile at world coordinates */
  getTile(worldX: number, worldY: number): number | null {
    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);
    const chunkCoord = worldToChunk(worldX, worldY, CHUNK_SIZE, TILE_SIZE);
    const chunk = this.chunks.get(this.chunkKey(chunkCoord.x, chunkCoord.y));
    if (!chunk) return null;

    const localX = ((tileX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY = ((tileY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    if (localY < 0 || localY >= chunk.tiles.length) return null;
    if (localX < 0 || localX >= chunk.tiles[localY].length) return null;

    return chunk.tiles[localY][localX];
  }

  /** Check if a tile is walkable */
  isWalkable(worldX: number, worldY: number): boolean {
    const tile = this.getTile(worldX, worldY);
    if (tile === null) return false;
    return isWalkableTileId(tile);
  }

  /** Update chunks around a position */
  update(playerX: number, playerY: number): void {
    const centerChunk = worldToChunk(playerX, playerY, CHUNK_SIZE, TILE_SIZE);

    // Load chunks in radius
    for (let dy = -RENDER_CHUNK_RADIUS; dy <= RENDER_CHUNK_RADIUS; dy++) {
      for (let dx = -RENDER_CHUNK_RADIUS; dx <= RENDER_CHUNK_RADIUS; dx++) {
        const cx = centerChunk.x + dx;
        const cy = centerChunk.y + dy;
        if (!this.isChunkLoaded(cx, cy)) {
          this.loadChunk(cx, cy);
        }
      }
    }

    // Unload chunks outside radius
    for (const [key, chunk] of this.chunks) {
      const distX = Math.abs(chunk.cx - centerChunk.x);
      const distY = Math.abs(chunk.cy - centerChunk.y);
      if (distX > RENDER_CHUNK_RADIUS + 1 || distY > RENDER_CHUNK_RADIUS + 1) {
        this.unloadChunk(chunk.cx, chunk.cy);
      }
    }
  }

  /** Render visible chunks */
  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    for (const [, chunk] of this.chunks) {
      if (!chunk.loaded) continue;

      const worldX = chunk.cx * CHUNK_PIXELS;
      const worldY = chunk.cy * CHUNK_PIXELS;
      const screenX = Math.round(worldX - offsetX);
      const screenY = Math.round(worldY - offsetY);

      // Skip if off screen
      if (screenX + CHUNK_PIXELS < -TILE_SIZE || screenX > 320 + TILE_SIZE) continue;
      if (screenY + CHUNK_PIXELS < -TILE_SIZE || screenY > 240 + TILE_SIZE) continue;

      // Render tiles
      for (let ty = 0; ty < chunk.tiles.length; ty++) {
        for (let tx = 0; tx < chunk.tiles[ty].length; tx++) {
          const tileId = chunk.tiles[ty][tx];
          const tileScreenX = screenX + tx * TILE_SIZE;
          const tileScreenY = screenY + ty * TILE_SIZE;
          const gx = chunk.cx * CHUNK_SIZE + tx;
          const gy = chunk.cy * CHUNK_SIZE + ty;
          this.renderTile(ctx, tileId, tileScreenX, tileScreenY, gx, gy);
        }
      }
    }
  }

  /**
   * Collect every tile currently on screen that has a vertical overhang.
   * Each entry's sortY is the tile's grounded point.
   */
  getOverhangs(offsetX: number, offsetY: number): Array<{ type: string; screenX: number; screenY: number; gx: number; gy: number; sortY: number }> {
    const overhangs: Array<{ type: string; screenX: number; screenY: number; gx: number; gy: number; sortY: number }> = [];

    for (const [, chunk] of this.chunks) {
      if (!chunk.loaded) continue;

      const worldX = chunk.cx * CHUNK_PIXELS;
      const worldY = chunk.cy * CHUNK_PIXELS;
      const screenX = Math.round(worldX - offsetX);
      const screenY = Math.round(worldY - offsetY);

      if (screenX + CHUNK_PIXELS < -TILE_SIZE * 4 || screenX > 320 + TILE_SIZE * 4) continue;
      if (screenY + CHUNK_PIXELS < -TILE_SIZE * 4 || screenY > 240 + TILE_SIZE * 4) continue;

      for (let ty = 0; ty < chunk.tiles.length; ty++) {
        for (let tx = 0; tx < chunk.tiles[ty].length; tx++) {
          const tileId = chunk.tiles[ty][tx];
          const tileScreenX = screenX + tx * TILE_SIZE;
          const tileScreenY = screenY + ty * TILE_SIZE;
          const gx = chunk.cx * CHUNK_SIZE + tx;
          const gy = chunk.cy * CHUNK_SIZE + ty;
          const bottomY = worldY + ty * TILE_SIZE + TILE_SIZE;

          if (tileId === 5) {
            overhangs.push({ type: 'tree', screenX: tileScreenX, screenY: tileScreenY, gx, gy, sortY: bottomY });
          } else if (tileId === 9) {
            overhangs.push({ type: 'tall_grass', screenX: tileScreenX, screenY: tileScreenY, gx, gy, sortY: bottomY + 0.1 });
          } else if (tileId === 7) {
            const tileAbove = this.getTile(gx * TILE_SIZE, (gy - 1) * TILE_SIZE);
            if (tileAbove !== 7 && tileAbove !== 6 && tileAbove !== 8) {
              overhangs.push({ type: 'building_roof', screenX: tileScreenX, screenY: tileScreenY, gx, gy, sortY: bottomY });
            }
          } else if (tileId === 4) {
            const tileAbove = this.getTile(gx * TILE_SIZE, (gy - 1) * TILE_SIZE);
            if (tileAbove !== 4) {
              overhangs.push({ type: 'mountain_top', screenX: tileScreenX, screenY: tileScreenY, gx, gy, sortY: bottomY });
            }
          }
        }
      }
    }

    return overhangs;
  }

  /**
   * Draw the overhang element based on its type.
   */
  renderOverhang(ctx: CanvasRenderingContext2D, type: string, screenX: number, screenY: number, gx: number, gy: number): void {
    const biome = getBiomeAt(gx, gy, this.currentSeed);
    const h = this.hash(gx, gy, this.currentSeed);

    if (type === 'tree') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.ellipse(screenX + 12, screenY + 14, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tree sway calculation
      const sway = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.002, 3);
      const sway2 = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.003, 1, Math.PI / 2);

      const cx = screenX + 8 + sway;
      const cy = screenY + sway2;

      if (h > 0.6) {
        ctx.fillStyle = biome.treeColor;
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx - 10, cy + 6); ctx.lineTo(cx + 10, cy + 6); ctx.fill();
        ctx.fillStyle = '#1a3311';
        ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy + 6); ctx.lineTo(cx + 10, cy + 6); ctx.fill();

        ctx.fillStyle = biome.treeColor;
        ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx - 12, cy + 10); ctx.lineTo(cx + 12, cy + 10); ctx.fill();
        ctx.fillStyle = '#1a3311';
        ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 10); ctx.lineTo(cx + 12, cy + 10); ctx.fill();
      } else {
        ctx.fillStyle = biome.treeColor;
        ctx.beginPath(); ctx.arc(cx, cy - 6, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = biome.tallGrassColor;
        ctx.beginPath(); ctx.arc(cx, cy - 10, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = biome.treeColor;
        ctx.beginPath(); ctx.arc(cx - 8, cy + 2, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 8, cy + 2, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = biome.grassColor;
        ctx.beginPath(); ctx.arc(cx - 4, cy - 12, 4, 0, Math.PI * 2); ctx.fill();

        if (h < 0.2) {
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(cx - 6, cy - 4, 2, 2);
          ctx.fillRect(cx + 4, cy, 2, 2);
          ctx.fillRect(cx + 2, cy - 10, 2, 2);
        }
      }
    } else if (type === 'tall_grass') {
      const sway = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.003, 1.5);
      const sway1 = sway * 1.0;
      const sway2 = envSystem.getSwayOffset(gx * TILE_SIZE + 5, gy * TILE_SIZE, 0.003, 1.5, 0.5);
      const sway3 = envSystem.getSwayOffset(gx * TILE_SIZE + 10, gy * TILE_SIZE, 0.003, 1.5, 1.0);

      ctx.fillStyle = biome.tallGrassColor;
      ctx.fillRect(screenX + 4 + sway1, screenY + 6, 2, 10);
      ctx.fillRect(screenX + 10 + sway2, screenY + 5, 2, 11);
      ctx.fillRect(screenX + 14 + sway3, screenY + 8, 2, 8);

      if (h > 0.8) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 4 + sway1, screenY + 5, 2, 2);
      }
    } else if (type === 'building_roof') {
      const leftTile = this.getTile((gx - 1) * TILE_SIZE, gy * TILE_SIZE);
      const rightTile = this.getTile((gx + 1) * TILE_SIZE, gy * TILE_SIZE);
      
      ctx.fillStyle = '#3a2218';
      ctx.fillRect(screenX - 1, screenY - 16, TILE_SIZE + 2, 19);
      ctx.fillStyle = '#a84532';
      ctx.fillRect(screenX, screenY - 15, TILE_SIZE, 16);
      
      ctx.fillStyle = '#8a3522';
      ctx.fillRect(screenX, screenY - 11, TILE_SIZE, 1);
      ctx.fillRect(screenX, screenY - 7, TILE_SIZE, 1);
      ctx.fillRect(screenX, screenY - 3, TILE_SIZE, 1);
      
      ctx.fillStyle = '#c85a42';
      ctx.fillRect(screenX, screenY, TILE_SIZE, 1);
      
      if (leftTile !== 7 && leftTile !== 8) {
        ctx.fillStyle = '#3a2218';
        ctx.beginPath(); ctx.moveTo(screenX - 1, screenY - 16); ctx.lineTo(screenX - 5, screenY + 3); ctx.lineTo(screenX - 1, screenY + 3); ctx.fill();
        ctx.fillStyle = '#8a3522';
        ctx.beginPath(); ctx.moveTo(screenX, screenY - 15); ctx.lineTo(screenX - 3, screenY + 1); ctx.lineTo(screenX, screenY + 1); ctx.fill();
      }
      if (rightTile !== 7 && rightTile !== 8) {
        ctx.fillStyle = '#3a2218';
        ctx.beginPath(); ctx.moveTo(screenX + TILE_SIZE + 1, screenY - 16); ctx.lineTo(screenX + TILE_SIZE + 5, screenY + 3); ctx.lineTo(screenX + TILE_SIZE + 1, screenY + 3); ctx.fill();
        ctx.fillStyle = '#5a2211';
        ctx.beginPath(); ctx.moveTo(screenX + TILE_SIZE, screenY - 15); ctx.lineTo(screenX + TILE_SIZE + 3, screenY + 1); ctx.lineTo(screenX + TILE_SIZE, screenY + 1); ctx.fill();
      }
      
      if (h > 0.8) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(screenX + 8, screenY - 24, 4, 8);
        ctx.fillStyle = '#444444';
        ctx.fillRect(screenX + 7, screenY - 26, 6, 2);
      }

      // Roof right-side shadow
      if (rightTile !== 7 && rightTile !== 8) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.moveTo(screenX + TILE_SIZE, screenY + 1);
        ctx.lineTo(screenX + TILE_SIZE + 4, screenY + 1);
        ctx.lineTo(screenX + TILE_SIZE + 4, screenY - 15);
        ctx.lineTo(screenX + TILE_SIZE, screenY - 15);
        ctx.fill();
      }
    } else if (type === 'mountain_top') {
      ctx.fillStyle = '#6a5a45';
      ctx.fillRect(screenX, screenY - 8, TILE_SIZE, 8);
      ctx.fillStyle = biome.grassColor;
      ctx.fillRect(screenX, screenY - 8, TILE_SIZE, 2);
      ctx.fillStyle = '#7a6a55';
      ctx.fillRect(screenX, screenY - 2, TILE_SIZE, 2);
      
      // Right edge shadow
      if (this.getTile((gx + 1) * TILE_SIZE, gy * TILE_SIZE) !== 4) {
         ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
         ctx.fillRect(screenX + TILE_SIZE, screenY, 4, TILE_SIZE);
      }
    }
  }

  /** Render a single tile */
  private renderTile(ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number, gx: number, gy: number): void {
    const biome = getBiomeAt(gx, gy, this.currentSeed);
    const h = this.hash(gx, gy, this.currentSeed);

    switch (tileId) {
      case 0: // Void/empty
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
      case 1: // Grass
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Shadow from left adjacent walls
        if (this.getTile((gx - 1) * TILE_SIZE, gy * TILE_SIZE) === 7) {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
           ctx.fillRect(x, y, 4, TILE_SIZE);
        }
        if (h > 0.8) {
          const sway = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.003, 1.0);
          ctx.fillStyle = biome.tallGrassColor;
          ctx.fillRect(x + 4 + sway, y + 8, 2, 4);
          ctx.fillRect(x + 10 + sway, y + 4, 2, 3);
        } else if (h > 0.75) {
          const sway = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.002, 0.8);
          ctx.fillStyle = biome.id === 'forest' ? '#9933ff' : '#ff99aa';
          ctx.fillRect(x + 6 + sway, y + 6, 2, 2);
          ctx.fillStyle = biome.tallGrassColor;
          ctx.fillRect(x + 6 + sway * 0.5, y + 8, 2, 2);
        } else if (h < 0.05) {
          ctx.fillStyle = '#7a7a7a';
          ctx.fillRect(x + 8, y + 10, 3, 2);
          ctx.fillStyle = '#555555';
          ctx.fillRect(x + 8, y + 11, 3, 1);
        } else if (h < 0.1) {
          ctx.fillStyle = '#8b5a2b';
          ctx.fillRect(x + 3, y + 3, 2, 1);
          ctx.fillRect(x + 11, y + 12, 1, 1);
        }
        break;
      case 2: // Path
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = biome.bgColor;
        ctx.fillRect(x + 1, y, TILE_SIZE - 2, TILE_SIZE);
        ctx.fillRect(x, y + 1, TILE_SIZE, TILE_SIZE - 2);
        ctx.fillStyle = '#9e844a';
        if (h > 0.5) {
          ctx.fillRect(x + 3, y + 2, 2, 12);
          ctx.fillRect(x + 11, y + 2, 2, 12);
        }
        if (this.hash(gx, gy, this.currentSeed + 1) > 0.8) {
           ctx.fillStyle = '#bfa56a';
           ctx.fillRect(x + 6, y + 6, 3, 2);
        }

        // Shadow from left adjacent walls
        if (this.getTile((gx - 1) * TILE_SIZE, gy * TILE_SIZE) === 7) {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
           ctx.fillRect(x, y, 4, TILE_SIZE);
        }
        break;
      case 3: { // Water
        ctx.fillStyle = biome.id === 'lake' ? '#2e5b82' : '#3b6fa0';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        const waveOffset = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.002, 2.0);
        const waveOffset2 = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.0025, 1.5, Math.PI);
        ctx.fillStyle = biome.id === 'lake' ? '#3d729e' : '#4b7fb0';
        ctx.fillRect(x + 2 + waveOffset, y + 4, 8, 2);
        ctx.fillRect(x + 8 + waveOffset2, y + 10, 6, 2);
        const isUpWater = this.getTile(gx * TILE_SIZE, (gy - 1) * TILE_SIZE) === 3;
        if (!isUpWater) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          const shoreSway = Math.max(0, envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.0015, 2.0));
          ctx.fillRect(x, y, TILE_SIZE, 2 + shoreSway);
        }
        if (h < 0.1 && biome.id === 'lake') {
          ctx.fillStyle = '#4da64d'; // lilypad
          const lilypadSway = envSystem.getSwayOffset(gx * TILE_SIZE, gy * TILE_SIZE, 0.001, 1.0);
          ctx.fillRect(x + 4 + lilypadSway, y + 8, 6, 4);
          ctx.fillStyle = '#3a8a3a';
          ctx.fillRect(x + 6 + lilypadSway, y + 10, 2, 2);
        }
        break;
      }
      case 4: { // Mountain
        ctx.fillStyle = '#4a3a25';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3a2a15';
        ctx.fillRect(x, y + 4, TILE_SIZE, TILE_SIZE - 4);
        if (h > 0.7) {
          ctx.fillStyle = '#2a1a05';
          ctx.fillRect(x + 6, y + 6, 2, 6);
          ctx.fillRect(x + 5, y + 10, 2, 2);
        }
        break;
      }
      case 5: // Tree
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(x + 6, y + 5, 4, 11);
        ctx.fillStyle = '#3e2a20';
        ctx.fillRect(x + 6, y + 5, 2, 11);
        // Roots
        if (h > 0.5) ctx.fillRect(x + 4, y + 14, 2, 2);
        if (h < 0.5) ctx.fillRect(x + 10, y + 14, 2, 2);
        break;
      case 6: // Building floor
        ctx.fillStyle = '#7c6546';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#5c4526';
        ctx.fillRect(x, y + 3, TILE_SIZE, 1);
        ctx.fillRect(x, y + 7, TILE_SIZE, 1);
        ctx.fillRect(x, y + 11, TILE_SIZE, 1);
        ctx.fillRect(x, y + 15, TILE_SIZE, 1);
        
        if (this.getTile((gx - 1) * TILE_SIZE, gy * TILE_SIZE) === 7) {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
           ctx.fillRect(x, y, 4, TILE_SIZE);
        }
        break;
      case 7: // Building wall
        ctx.fillStyle = '#b8a68c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#8b7b65';
        ctx.fillRect(x, y + 12, TILE_SIZE, 4);

        ctx.fillStyle = '#9b8b75';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        if (h > 0.6) {
           ctx.fillStyle = '#5b8b95';
           ctx.fillRect(x + 4, y + 4, 8, 8);
           ctx.fillStyle = '#dbe5e5';
           ctx.fillRect(x + 4, y + 4, 8, 2);
           ctx.fillStyle = '#4a2e15';
           ctx.fillRect(x + 4, y + 8, 8, 1);
           ctx.fillRect(x + 7, y + 4, 1, 8);
           ctx.strokeStyle = '#4a2e15';
           ctx.lineWidth = 1;
           ctx.strokeRect(x + 4, y + 4, 8, 8);
        }
        break;
      case 8: // Door
        ctx.fillStyle = '#b8a68c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3a2210';
        ctx.fillRect(x + 2, y + 2, 12, 14);
        ctx.fillStyle = '#5b3b1e';
        ctx.fillRect(x + 3, y + 3, 10, 13);
        ctx.fillStyle = '#4a2e15';
        ctx.fillRect(x + 4, y + 4, 8, 4);
        ctx.fillRect(x + 4, y + 9, 8, 6);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x + 11, y + 9, 2, 2);
        break;
      case 9: // Tall Grass
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = biome.tallGrassColor;
        ctx.fillRect(x + 2, y + 2, 2, 10);
        ctx.fillRect(x + 8, y + 1, 2, 12);
        ctx.fillRect(x + 12, y + 4, 2, 8);
        
        if (this.getTile((gx - 1) * TILE_SIZE, gy * TILE_SIZE) === 7) {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
           ctx.fillRect(x, y, 4, TILE_SIZE);
        }
        break;
      case 10: { // Portal
        // Draw the background
        ctx.fillStyle = '#110b29';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Draw swirling rings using envSystem time
        const time = envSystem.time * 0.005;
        const radius1 = 6 + Math.sin(time) * 1.5;
        const radius2 = 4 + Math.cos(time + 1) * 1.0;
        
        // Outer glow/ring
        ctx.strokeStyle = '#8a2be2'; // neon purple
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, radius1, 0, Math.PI * 2);
        ctx.stroke();
        
        // Inner glowing core
        ctx.fillStyle = '#00ffff'; // neon cyan
        ctx.beginPath();
        ctx.arc(x + 8, y + 8, radius2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core speck
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 7, y + 7, 2, 2);
        break;
      }
      default:
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
    }
  }

  /**
   * Generate procedural chunk tiles — delegates to the shared world
   * generator so the offline client fallback always matches what the
   * server would produce for the same coordinates.
   */
  private generateChunkTiles(cx: number, cy: number): number[][] {
    return generateChunkTilesShared(cx, cy, this.currentSeed, this.currentMapId);
  }

  /** Add colliders for a chunk's solid tiles */
  private addChunkColliders(chunk: Chunk): void {
    for (let ty = 0; ty < chunk.tiles.length; ty++) {
      for (let tx = 0; tx < chunk.tiles[ty].length; tx++) {
        const tileId = chunk.tiles[ty][tx];
        if (!this.isWalkableTile(tileId)) {
          const worldX = chunk.cx * CHUNK_PIXELS + tx * TILE_SIZE;
          const worldY = chunk.cy * CHUNK_PIXELS + ty * TILE_SIZE;

          const collider: Collider = {
            x: worldX,
            y: worldY,
            width: TILE_SIZE,
            height: TILE_SIZE,
            solid: true,
            group: 'tile',
          };

          this.tileColliders.push(collider);
          this.collisionSystem.add(collider);
        }
      }
    }
  }

  /** Remove colliders for a chunk */
  private removeChunkColliders(chunk: Chunk): void {
    for (let i = this.tileColliders.length - 1; i >= 0; i--) {
      const c = this.tileColliders[i];
      if (
        c.x >= chunk.cx * CHUNK_PIXELS &&
        c.x < (chunk.cx + 1) * CHUNK_PIXELS &&
        c.y >= chunk.cy * CHUNK_PIXELS &&
        c.y < (chunk.cy + 1) * CHUNK_PIXELS
      ) {
        this.collisionSystem.remove(c);
        this.tileColliders.splice(i, 1);
      }
    }
  }

  /** Check if a tile ID is walkable */
  private isWalkableTile(tileId: number): boolean {
    return isWalkableTileId(tileId);
  }

  /** Clear all chunks */
  clear(): void {
    for (const [, chunk] of this.chunks) {
      this.removeChunkColliders(chunk);
    }
    this.chunks.clear();
  }
}