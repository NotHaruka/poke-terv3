/**
 * Renders complete interior maps, floor tiles, wallpaper, furniture, and lighting overlays
 */

import { InteriorDefinition } from '../interiors/InteriorDefinition.js';
import { FurnitureRenderer } from './FurnitureRenderer.js';

export class InteriorRenderer {
  private static animTime: number = 0;

  public static update(dt: number): void {
    this.animTime += dt;
  }

  public static renderInterior(
    ctx: CanvasRenderingContext2D,
    interior: InteriorDefinition,
    offsetX: number,
    offsetY: number
  ): void {
    const time = this.animTime;

    // 1. Render Tilemap Grid
    for (let ty = 0; ty < interior.heightTiles; ty++) {
      for (let tx = 0; tx < interior.widthTiles; tx++) {
        const tileId = interior.tilemap[ty][tx];
        const worldX = tx * 16;
        const worldY = ty * 16;
        const screenX = Math.round(worldX - offsetX);
        const screenY = Math.round(worldY - offsetY);

        this.renderTile(ctx, tileId, screenX, screenY, tx, ty);
      }
    }

    // 2. Render Furniture
    for (const item of interior.furniture) {
      const worldX = item.tileX * 16;
      const worldY = item.tileY * 16;
      const screenX = Math.round(worldX - offsetX);
      const screenY = Math.round(worldY - offsetY);

      FurnitureRenderer.renderFurniture(ctx, item, screenX, screenY, time);
    }

    // 3. Ambient Lighting Overlay
    if (interior.lighting) {
      ctx.fillStyle = interior.lighting.ambientColor;
      ctx.globalAlpha = 1 - (interior.lighting.brightness ?? 0.9);
      ctx.fillRect(0, 0, 320, 240);
      ctx.globalAlpha = 1.0;
    }
  }

  private static renderTile(
    ctx: CanvasRenderingContext2D,
    tileId: number,
    x: number,
    y: number,
    tx: number,
    ty: number
  ): void {
    switch (tileId) {
      case 0: // Void / Black Outer Wall Boundary
        ctx.fillStyle = '#0f0f1d';
        ctx.fillRect(x, y, 16, 16);
        break;

      case 5: // Upper Wall / Wallpaper Trim
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#34495e';
        ctx.fillRect(x, y + 2, 16, 12);
        ctx.fillStyle = '#1a252f';
        ctx.fillRect(x, y + 14, 16, 2);
        break;

      case 1: // Hardwood Floor Planks
        ctx.fillStyle = '#c0a080';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#a08060';
        ctx.fillRect(x, y + 7, 16, 1);
        ctx.fillRect(x, y + 15, 16, 1);
        if ((tx + ty) % 2 === 0) {
          ctx.fillRect(x + 7, y, 1, 7);
          ctx.fillRect(x + 12, y + 8, 1, 7);
        } else {
          ctx.fillRect(x + 11, y, 1, 7);
          ctx.fillRect(x + 4, y + 8, 1, 7);
        }
        break;

      case 2: // Plush Red Decorative Carpet / Rug
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = '#f1c40f'; // Gold Border Pattern
        ctx.fillRect(x + 1, y + 1, 14, 14);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 2, y + 2, 12, 12);
        break;

      case 3: // Checkerboard Ceramic Tile Floor (Mart / Lab)
        if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = '#ecf0f1';
        } else {
          ctx.fillStyle = '#bdc3c7';
        }
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(x, y, 16, 1);
        ctx.fillRect(x, y, 1, 16);
        break;

      case 4: // Entrance Doormat Tile
        ctx.fillStyle = '#c0a080'; // Base Floor
        ctx.fillRect(x, y, 16, 16);

        // Entrance Welcome Mat
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x + 1, y + 2, 14, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 3, y + 4, 10, 8);
        ctx.fillStyle = '#27ae60';
        ctx.font = '7px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('EXIT', x + 8, y + 8);
        break;

      default:
        ctx.fillStyle = '#c0a080';
        ctx.fillRect(x, y, 16, 16);
        break;
    }
  }
}
