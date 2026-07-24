/** Renderer for environmental objects (Trees, Bushes, Flowers, Grass, Water, Cliffs, Signs) */

import { EnvironmentRegistry } from '../registries/EnvironmentRegistry.js';
import { envSystem } from '../EnvironmentSystem.js';

export class EnvironmentRenderer {
  static renderObject(
    ctx: CanvasRenderingContext2D,
    type: string,
    screenX: number,
    screenY: number,
    gx: number,
    gy: number
  ): void {
    const def = EnvironmentRegistry.get(type);

    if (type.startsWith('tree')) {
      // Draw Tree (Trunk + Foliage Canopy)
      const isPine = type === 'tree_pine';
      const isCherry = type === 'tree_cherry';

      // Trunk
      ctx.fillStyle = isPine ? '#3b2313' : '#5c3a21';
      ctx.fillRect(screenX + 12, screenY + 16, 8, 16);

      // Canopy
      ctx.fillStyle = isCherry ? '#ff94ce' : isPine ? '#1e381d' : '#27ae60';
      ctx.beginPath();
      ctx.arc(screenX + 16, screenY + 8, 18, 0, Math.PI * 2);
      ctx.fill();

      // Highlight
      ctx.fillStyle = isCherry ? '#ffbde0' : isPine ? '#2d572c' : '#2ecc71';
      ctx.beginPath();
      ctx.arc(screenX + 12, screenY + 4, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (type.startsWith('bush')) {
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(screenX + 2, screenY + 4, 12, 10);
      ctx.fillStyle = '#cc2222'; // berries
      ctx.fillRect(screenX + 4, screenY + 6, 2, 2);
      ctx.fillRect(screenX + 10, screenY + 8, 2, 2);
    } else if (type.startsWith('flower')) {
      const sway = Math.sin(envSystem.time * 0.003 + gx) * 1.5;
      ctx.fillStyle = '#27ae60';
      ctx.fillRect(screenX + 7, screenY + 8, 2, 6);
      ctx.fillStyle = (gx + gy) % 2 === 0 ? '#ff69b4' : '#f1c40f';
      ctx.fillRect(screenX + 6 + sway, screenY + 4, 4, 4);
    } else if (type === 'sign_wooden') {
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(screenX + 7, screenY + 8, 2, 8);
      ctx.fillRect(screenX + 3, screenY + 2, 10, 7);
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(screenX + 4, screenY + 3, 8, 1);
    } else if (type === 'lamp_street') {
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(screenX + 7, screenY - 12, 2, 28);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(screenX + 5, screenY - 14, 6, 5);
    } else {
      // Default fallback block
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(screenX, screenY, (def?.widthTiles || 1) * 16, (def?.heightTiles || 1) * 16);
    }
  }
}
