/** Chunk Renderer organizing ground passes, foliage layers, and Y-sorted overhangs */

import { TileRenderer } from './TileRenderer.js';
import { EnvironmentRenderer } from './EnvironmentRenderer.js';
import { BuildingRenderer } from './BuildingRenderer.js';

export interface OverhangDrawCall {
  type: string;
  screenX: number;
  screenY: number;
  sortY: number;
  gx: number;
  gy: number;
}

export class ChunkRenderer {
  /** Renders ground tile grid */
  static renderGroundChunk(
    ctx: CanvasRenderingContext2D,
    tiles: number[][],
    chunkGx: number,
    chunkGy: number,
    offsetX: number,
    offsetY: number,
    seed: number
  ): void {
    const CHUNK_SIZE = 16;
    const TILE_SIZE = 16;

    for (let r = 0; r < CHUNK_SIZE; r++) {
      for (let c = 0; c < CHUNK_SIZE; c++) {
        const gx = chunkGx + c;
        const gy = chunkGy + r;
        const screenX = Math.round(gx * TILE_SIZE - offsetX);
        const screenY = Math.round(gy * TILE_SIZE - offsetY);

        // Cull off-screen tiles
        if (screenX < -TILE_SIZE || screenX > ctx.canvas.width || screenY < -TILE_SIZE || screenY > ctx.canvas.height) {
          continue;
        }

        const tileId = tiles[r] ? tiles[r][c] : 0;
        TileRenderer.renderTile(ctx, tileId, screenX, screenY, gx, gy, seed);
      }
    }
  }

  /** Render overhang canopy or roof call */
  static renderOverhangCall(
    ctx: CanvasRenderingContext2D,
    type: string,
    screenX: number,
    screenY: number,
    gx: number,
    gy: number
  ): void {
    if (type.startsWith('building_')) {
      const bId = type.replace('building_', '');
      BuildingRenderer.renderBuilding(ctx, bId, screenX, screenY);
    } else {
      EnvironmentRenderer.renderObject(ctx, type, screenX, screenY, gx, gy);
    }
  }
}
