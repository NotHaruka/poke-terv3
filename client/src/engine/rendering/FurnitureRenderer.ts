/**
 * Detailed renderer for interior furniture objects and decorations
 * (Pokémon Center Healing Machine, Shop Counters, PCs, Beds, Tables, Bookshelves, Fireplaces)
 */

import { FurnitureItem } from '../interiors/InteriorDefinition.js';

export class FurnitureRenderer {
  public static renderFurniture(
    ctx: CanvasRenderingContext2D,
    item: FurnitureItem,
    screenX: number,
    screenY: number,
    animTime: number = 0
  ): void {
    const w = item.widthTiles * 16;
    const h = item.heightTiles * 16;

    switch (item.type) {
      case 'healing_machine': {
        // Pokémon Center Healing Machine
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(screenX + 1, screenY + 1, w - 2, h - 2);

        // 6 Pokéball trays / slots
        for (let i = 0; i < 6; i++) {
          const bx = screenX + 2 + (i % 3) * 4;
          const by = screenY + 2 + Math.floor(i / 3) * 6;

          // Glowing Pokéballs on machine
          const glow = Math.sin(animTime * 4 + i) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(231, 76, 60, ${0.7 + glow * 0.3})`;
          ctx.beginPath();
          ctx.arc(bx + 2, by + 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'counter': {
        // Clean reception / shop counter
        ctx.fillStyle = '#8e5a2b';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(screenX, screenY, w, 3);
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(screenX, screenY + h - 2, w, 2);
        break;
      }

      case 'pc': {
        // Storage PC Terminal / Computer
        ctx.fillStyle = '#34495e';
        ctx.fillRect(screenX + 2, screenY, 12, 16);
        // Monitor screen glow
        const glow = Math.sin(animTime * 3) * 0.1 + 0.9;
        ctx.fillStyle = `rgba(52, 152, 219, ${glow})`;
        ctx.fillRect(screenX + 4, screenY + 2, 8, 7);
        // Keyboard
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(screenX + 4, screenY + 11, 8, 3);
        break;
      }

      case 'tv': {
        // Television
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#111111';
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, h - 4);
        // Screen static/broadcast glow
        ctx.fillStyle = '#2980b9';
        ctx.fillRect(screenX + 3, screenY + 3, w - 6, h - 6);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 5, screenY + 5, 2, 2);
        break;
      }

      case 'bed': {
        // Bed with pillow & blanket
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(screenX, screenY, w, h);
        // Pillow
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, 6);
        // Quilt Blanket
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(screenX + 2, screenY + 8, w - 4, h - 10);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(screenX + 2, screenY + 8, w - 4, 2);
        break;
      }

      case 'table': {
        // Wooden Table
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(screenX + 1, screenY + 1, w - 2, h - 2);
        ctx.strokeStyle = '#5c3a12';
        ctx.strokeRect(screenX + 1, screenY + 1, w - 2, h - 2);
        break;
      }

      case 'chair': {
        // Chair / Sofa
        ctx.fillStyle = '#a04000';
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, h - 4);
        ctx.fillStyle = '#d35400';
        ctx.fillRect(screenX + 3, screenY + 3, w - 6, h - 6);
        break;
      }

      case 'bookshelf': {
        // Bookshelf filled with colored books
        ctx.fillStyle = '#5c3a1e';
        ctx.fillRect(screenX, screenY, w, h);
        // Shelves
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(screenX, screenY + 5, w, 2);
        ctx.fillRect(screenX, screenY + 11, w, 2);

        // Books on shelves
        const bookColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
        for (let bx = screenX + 2; bx < screenX + w - 3; bx += 3) {
          const color = bookColors[Math.floor(bx) % bookColors.length];
          ctx.fillStyle = color;
          ctx.fillRect(bx, screenY + 1, 2, 4);
          ctx.fillRect(bx, screenY + 7, 2, 4);
        }
        break;
      }

      case 'plant': {
        // Potted house plant
        ctx.fillStyle = '#8b4513'; // Pot
        ctx.fillRect(screenX + 4, screenY + 8, 8, 7);
        ctx.fillStyle = '#27ae60'; // Leaves
        ctx.beginPath();
        ctx.arc(screenX + 8, screenY + 6, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#2ee677';
        ctx.beginPath();
        ctx.arc(screenX + 6, screenY + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'shop_shelf': {
        // Display Shelves with shop items
        ctx.fillStyle = '#34495e';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, h - 4);
        ctx.fillStyle = '#e74c3c'; // Item 1 (Pokeball)
        ctx.fillRect(screenX + 4, screenY + 4, 3, 3);
        ctx.fillStyle = '#3498db'; // Item 2 (Potion)
        ctx.fillRect(screenX + 10, screenY + 4, 3, 3);
        break;
      }

      case 'fireplace': {
        // Fireplace
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(screenX + 4, screenY + 4, w - 8, h - 4);

        // Fire glow
        const fGlow = Math.sin(animTime * 8) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(230, 126, 34, ${fGlow})`;
        ctx.fillRect(screenX + 6, screenY + 8, w - 12, h - 8);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(screenX + 8, screenY + 10, w - 16, h - 10);
        break;
      }

      case 'crate': {
        // Wooden Crate
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.strokeStyle = '#5c3a1e';
        ctx.strokeRect(screenX, screenY, w, h);
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + w, screenY + h);
        ctx.stroke();
        break;
      }

      case 'barrel': {
        // Barrel
        ctx.fillStyle = '#6e472a';
        ctx.beginPath();
        ctx.ellipse(screenX + w / 2, screenY + h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#34495e'; // Metal hoops
        ctx.stroke();
        break;
      }

      case 'mirror': {
        // Full length mirror
        ctx.fillStyle = '#d63031';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#81ecec';
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, h - 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX + 3, screenY + 3, 2, h - 6);
        break;
      }

      case 'tactical_map': {
        // Wilderness Tactical Map Table
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(screenX, screenY, w, h);
        ctx.fillStyle = '#27ae60'; // Green map surface
        ctx.fillRect(screenX + 2, screenY + 2, w - 4, h - 4);
        ctx.fillStyle = '#f1c40f'; // Routes/marks
        ctx.fillRect(screenX + 6, screenY + 6, 8, 2);
        break;
      }

      case 'starter_pod': {
        // Starter Pokéball Pod Display
        ctx.fillStyle = '#34495e';
        ctx.fillRect(screenX + 2, screenY + 8, 12, 8); // Pedestal base
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(screenX + 3, screenY + 2, 10, 7); // Glass dome

        const podColor = item.id.includes('flamepup') ? '#ff3333' : item.id.includes('sproutling') ? '#33cc66' : '#3399ff';
        // Pokéball upper half
        ctx.fillStyle = podColor;
        ctx.beginPath();
        ctx.arc(screenX + 8, screenY + 5, 4, Math.PI, 0, false);
        ctx.fill();
        // Pokéball lower half
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenX + 8, screenY + 5, 4, 0, Math.PI, false);
        ctx.fill();
        // Center button glow
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(screenX + 8, screenY + 5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      default: {
        ctx.fillStyle = item.color || '#95a5a6';
        ctx.fillRect(screenX, screenY, w, h);
        break;
      }
    }
  }
}
