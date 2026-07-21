/** Client-side chunk management and rendering */

import {
  Vec2, CHUNK_SIZE, TILE_SIZE, CHUNK_PIXELS, RENDER_CHUNK_RADIUS,
  worldToChunk,
  generateChunkTiles as generateChunkTilesShared,
  isWalkableTileId,
  getBiomeAt,
} from 'poke-ter-shared';
import { CollisionSystem, Collider } from '../../engine/Collision.js';

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

  /** Render a single tile */
  private renderTile(ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number, gx: number, gy: number): void {
    const biome = getBiomeAt(gx, gy, this.currentSeed);

    switch (tileId) {
      case 0: // Void/empty
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
      case 1: // Grass
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = biome.tallGrassColor;
        ctx.fillRect(x + 4, y + 8, 2, 2);
        ctx.fillRect(x + 10, y + 4, 2, 2);
        break;
      case 2: // Path
        ctx.fillStyle = biome.bgColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#b4985a';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        break;
      case 3: // Water
        ctx.fillStyle = '#3b6fa0';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4b7fb0';
        ctx.fillRect(x + 3, y + 5, 10, 2);
        break;
      case 4: // Wall / Mountain
        ctx.fillStyle = '#5a4a35';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4a3a25';
        ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.fillStyle = '#6a5a45';
        ctx.fillRect(x + 2, y + 2, 6, 6);
        break;
      case 5: // Tree
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Trunk
        ctx.fillStyle = '#5c4033';
        ctx.fillRect(x + 6, y + 10, 4, 6);
        // Leaves
        ctx.fillStyle = biome.treeColor;
        ctx.beginPath();
        ctx.arc(x + 8, y + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2d5a1e';
        ctx.beginPath();
        ctx.arc(x + 8, y + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 6: // Building floor
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#7b6345';
        ctx.fillRect(x, y, TILE_SIZE, 1);
        ctx.fillRect(x, y + 8, TILE_SIZE, 1);
        break;
      case 7: // Building wall
        ctx.fillStyle = '#9b8b75';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#8b7b65';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        break;
      case 8: // Door
        ctx.fillStyle = '#5b3b1e';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#7b5b3e';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(x + 10, y + 5, 2, 2);
        break;
      case 9: // Tall Grass
        ctx.fillStyle = biome.grassColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Draw detailed tall grass blades (FireRed style)
        ctx.fillStyle = biome.tallGrassColor;
        ctx.fillRect(x + 2, y + 4, 2, 12);
        ctx.fillRect(x + 6, y + 2, 2, 14);
        ctx.fillRect(x + 10, y + 5, 2, 11);
        ctx.fillRect(x + 14, y + 3, 1, 13);
        break;
      case 10: // Portal
        // Draw the background
        ctx.fillStyle = '#110b29';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Draw swirling rings using a time-dependent angle or scale
        const time = Date.now() * 0.005;
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