/** Auto-tiling, tile variants, and chunk-safe deterministic tile renderer */

import { envSystem } from '../EnvironmentSystem.js';

export class TileRenderer {
  /**
   * Deterministic pseudo-random number generator for tile variants
   */
  private static hashTile(gx: number, gy: number, seed: number): number {
    let h = (gx * 374761393 + gy * 668265263 + seed * 144674389) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  /**
   * Render tile with auto-tiling and weighted variants
   */
  static renderTile(
    ctx: CanvasRenderingContext2D,
    tileId: number,
    screenX: number,
    screenY: number,
    gx: number,
    gy: number,
    seed: number
  ): void {
    const rnd = this.hashTile(gx, gy, seed);

    switch (tileId) {
      case 0: { // Grass
        // Base grass color with subtle variant patches
        const isLight = rnd > 0.8;
        ctx.fillStyle = isLight ? '#5db336' : '#52a32e';
        ctx.fillRect(screenX, screenY, 16, 16);

        // Random grass blade decoration
        if (rnd < 0.15) {
          ctx.fillStyle = '#6ac343';
          ctx.fillRect(screenX + 3, screenY + 4, 1, 3);
          ctx.fillRect(screenX + 11, screenY + 9, 1, 3);
        }
        break;
      }
      case 1: { // Water (Animated)
        const frame = Math.floor((envSystem.time + (gx + gy) * 100) / 300) % 3;
        ctx.fillStyle = frame === 0 ? '#3498db' : frame === 1 ? '#2980b9' : '#3498db';
        ctx.fillRect(screenX, screenY, 16, 16);

        // Water specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(screenX + (frame * 4), screenY + 6, 4, 1);
        ctx.fillRect(screenX + ((frame + 2) * 3) % 12, screenY + 12, 3, 1);
        break;
      }
      case 2: { // Tall Grass
        ctx.fillStyle = '#2d801e';
        ctx.fillRect(screenX, screenY, 16, 16);
        ctx.fillStyle = '#3ca02c';
        ctx.fillRect(screenX + 2, screenY + 2, 4, 12);
        ctx.fillRect(screenX + 10, screenY + 2, 4, 12);
        break;
      }
      case 3: { // Sand / Dirt Path
        ctx.fillStyle = rnd > 0.5 ? '#d2b48c' : '#c2a47c';
        ctx.fillRect(screenX, screenY, 16, 16);
        if (rnd < 0.2) {
          ctx.fillStyle = '#b2946c';
          ctx.fillRect(screenX + 6, screenY + 8, 2, 2);
        }
        break;
      }
      case 4: { // Cobblestone / City Pavement
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(screenX, screenY, 16, 16);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(screenX + 1, screenY + 1, 14, 14);
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, 16, 16);
        break;
      }
      case 5: { // Cliff Edge
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(screenX, screenY, 16, 16);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(screenX, screenY + 12, 16, 4); // Shadow
        break;
      }
      case 10: { // Portal / Gate Tile
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(screenX, screenY, 16, 16);
        const pulse = Math.sin(envSystem.time * 0.01) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(155, 89, 182, ${pulse})`;
        ctx.fillRect(screenX + 2, screenY + 2, 12, 12);
        break;
      }
      default: {
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(screenX, screenY, 16, 16);
        break;
      }
    }
  }
}
