/** Centralized cosmetic registry containing definitions, IDs, and layered rendering commands */

import { Direction } from 'poke-ter-shared';
import { ColorRamp, PaletteRegistry } from './PaletteRegistry.js';

export interface CosmeticDefinition {
  id: string;
  name: string;
  category: 'hair' | 'shirt' | 'pants' | 'shoes' | 'backpack' | 'hat' | 'accessory' | 'eyes';
  render: (
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    dirStr: 'up' | 'down' | 'left' | 'right',
    colorHex: string,
    bounceOffset: number,
    breathOffset: number
  ) => void;
}

export class CosmeticRegistry {
  private static cosmetics = new Map<string, CosmeticDefinition>();

  static initDefaults(): void {
    if (this.cosmetics.size > 0) return;

    // --- EYES ---
    this.register({
      id: 'eyes_standard',
      name: 'Standard Eyes',
      category: 'eyes',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        ctx.fillStyle = PaletteRegistry.getEyeColor(color);
        const upperY = y + breath - bounce;
        if (dir === 'down') {
          ctx.fillRect(x + 6, upperY, 1, 1);
          ctx.fillRect(x + 9, upperY, 1, 1);
        } else if (dir === 'right') {
          ctx.fillRect(x + 10, upperY, 1, 1);
        } else if (dir === 'left') {
          ctx.fillRect(x + 5, upperY, 1, 1);
        }
      },
    });

    // --- SHOES ---
    this.register({
      id: 'shoes_sneakers',
      name: 'Sneakers',
      category: 'shoes',
      render: (ctx, x, y, dir, color) => {
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.base;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 4, y + 14, 3, 2);
          ctx.fillRect(x + 9, y + 14, 3, 2);
          ctx.fillStyle = ramp.light;
          ctx.fillRect(x + 4, y + 15, 3, 1);
          ctx.fillRect(x + 9, y + 15, 3, 1);
        } else if (dir === 'left') {
          ctx.fillRect(x + 5, y + 14, 4, 2);
          ctx.fillStyle = ramp.light;
          ctx.fillRect(x + 5, y + 15, 4, 1);
        } else {
          ctx.fillRect(x + 7, y + 14, 4, 2);
          ctx.fillStyle = ramp.light;
          ctx.fillRect(x + 7, y + 15, 4, 1);
        }
      },
    });

    this.register({
      id: 'shoes_boots',
      name: 'Boots',
      category: 'shoes',
      render: (ctx, x, y, dir, color) => {
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.dark;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 4, y + 12, 3, 4);
          ctx.fillRect(x + 9, y + 12, 3, 4);
        } else if (dir === 'left') {
          ctx.fillRect(x + 5, y + 12, 4, 4);
        } else {
          ctx.fillRect(x + 7, y + 12, 4, 4);
        }
      },
    });

    // --- PANTS ---
    this.register({
      id: 'pants_jeans',
      name: 'Jeans',
      category: 'pants',
      render: (ctx, x, y, dir, color) => {
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.base;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 4, y + 9, 8, 5);
          ctx.fillStyle = ramp.dark;
          ctx.fillRect(x + 7, y + 9, 2, 5); // seam split
        } else {
          ctx.fillRect(x + 5, y + 9, 6, 5);
        }
      },
    });

    this.register({
      id: 'pants_shorts',
      name: 'Shorts',
      category: 'pants',
      render: (ctx, x, y, dir, color) => {
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.base;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 4, y + 9, 8, 3);
        } else {
          ctx.fillRect(x + 5, y + 9, 6, 3);
        }
      },
    });

    // --- SHIRTS ---
    this.register({
      id: 'shirt_tshirt',
      name: 'T-Shirt',
      category: 'shirt',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.base;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 3, upperY + 3, 10, 6);
          ctx.fillStyle = ramp.light;
          ctx.fillRect(x + 4, upperY + 3, 8, 1);
        } else {
          ctx.fillRect(x + 5, upperY + 3, 6, 6);
        }
      },
    });

    this.register({
      id: 'shirt_hoodie',
      name: 'Hoodie',
      category: 'shirt',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getClothRamp(color);
        ctx.fillStyle = ramp.base;
        if (dir === 'down' || dir === 'up') {
          ctx.fillRect(x + 2, upperY + 2, 12, 7);
          ctx.fillStyle = ramp.dark;
          ctx.fillRect(x + 7, upperY + 4, 2, 5); // zipper/pouch
        } else {
          ctx.fillRect(x + 4, upperY + 2, 8, 7);
        }
      },
    });

    // --- BACKPACKS ---
    this.register({
      id: 'backpack_standard',
      name: 'Standard Backpack',
      category: 'backpack',
      render: (ctx, x, y, dir, _color, bounce, breath) => {
        const upperY = y + breath - bounce;
        ctx.fillStyle = '#8B4513';
        if (dir === 'up') {
          ctx.fillRect(x + 4, upperY + 2, 8, 7);
          ctx.fillStyle = '#a0522d';
          ctx.fillRect(x + 5, upperY + 5, 6, 3); // flap
        } else if (dir === 'right') {
          ctx.fillRect(x + 3, upperY + 3, 3, 6);
        } else if (dir === 'left') {
          ctx.fillRect(x + 10, upperY + 3, 3, 6);
        }
      },
    });

    this.register({
      id: 'backpack_explorer',
      name: 'Explorer Pack',
      category: 'backpack',
      render: (ctx, x, y, dir, _color, bounce, breath) => {
        const upperY = y + breath - bounce;
        ctx.fillStyle = '#2d572c';
        if (dir === 'up') {
          ctx.fillRect(x + 3, upperY + 1, 10, 8);
          ctx.fillStyle = '#1e381d';
          ctx.fillRect(x + 4, upperY + 4, 8, 4);
        } else if (dir === 'right') {
          ctx.fillRect(x + 2, upperY + 2, 4, 7);
        } else if (dir === 'left') {
          ctx.fillRect(x + 10, upperY + 2, 4, 7);
        }
      },
    });

    // --- HAIR STYLES ---
    this.register({
      id: 'hair_short',
      name: 'Short Hair',
      category: 'hair',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getHairRamp(color);
        ctx.fillStyle = ramp.base;
        ctx.fillRect(x + 3, upperY - 4, 10, 3);
        if (dir === 'down') {
          ctx.fillRect(x + 4, upperY - 1, 8, 1);
        }
      },
    });

    this.register({
      id: 'hair_medium',
      name: 'Medium Hair',
      category: 'hair',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getHairRamp(color);
        ctx.fillStyle = ramp.base;
        ctx.fillRect(x + 3, upperY - 5, 10, 5);
        if (dir === 'down') {
          ctx.fillRect(x + 3, upperY, 2, 3);
          ctx.fillRect(x + 11, upperY, 2, 3);
        }
      },
    });

    this.register({
      id: 'hair_long',
      name: 'Long Hair',
      category: 'hair',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getHairRamp(color);
        ctx.fillStyle = ramp.base;
        ctx.fillRect(x + 3, upperY - 4, 10, 4);
        if (dir !== 'up') {
          ctx.fillRect(x + 2, upperY, 3, 5);
          ctx.fillRect(x + 11, upperY, 3, 5);
        } else {
          ctx.fillRect(x + 3, upperY, 10, 6);
        }
      },
    });

    this.register({
      id: 'hair_spiky',
      name: 'Spiky Hair',
      category: 'hair',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getHairRamp(color);
        ctx.fillStyle = ramp.base;
        ctx.fillRect(x + 4, upperY - 5, 8, 4);
        ctx.fillRect(x + 5, upperY - 7, 2, 2);
        ctx.fillRect(x + 9, upperY - 6, 2, 2);
      },
    });

    this.register({
      id: 'hair_ponytail',
      name: 'Ponytail',
      category: 'hair',
      render: (ctx, x, y, dir, color, bounce, breath) => {
        const upperY = y + breath - bounce;
        const ramp = PaletteRegistry.getHairRamp(color);
        ctx.fillStyle = ramp.base;
        ctx.fillRect(x + 4, upperY - 4, 8, 3);
        if (dir === 'right') ctx.fillRect(x + 1, upperY - 3, 3, 4);
        if (dir === 'left') ctx.fillRect(x + 12, upperY - 3, 3, 4);
        if (dir === 'up') ctx.fillRect(x + 6, upperY - 3, 4, 6);
      },
    });

    // --- HATS ---
    this.register({
      id: 'hat_cap',
      name: 'Trainer Cap',
      category: 'hat',
      render: (ctx, x, y, dir, _color, bounce, breath) => {
        const upperY = y + breath - bounce;
        ctx.fillStyle = '#cc2222';
        ctx.fillRect(x + 4, upperY - 5, 8, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 6, upperY - 5, 4, 1); // Front logo plate
        ctx.fillStyle = '#cc2222';
        if (dir === 'down') ctx.fillRect(x + 4, upperY - 3, 8, 2);
        if (dir === 'right') ctx.fillRect(x + 8, upperY - 3, 6, 2);
        if (dir === 'left') ctx.fillRect(x + 2, upperY - 3, 6, 2);
      },
    });

    this.register({
      id: 'hat_beanie',
      name: 'Beanie',
      category: 'hat',
      render: (ctx, x, y, dir, _color, bounce, breath) => {
        const upperY = y + breath - bounce;
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x + 3, upperY - 6, 10, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(x + 7, upperY - 7, 2, 2); // Pom-pom
      },
    });

    this.register({
      id: 'hat_none',
      name: 'No Hat',
      category: 'hat',
      render: () => {},
    });
  }

  static register(def: CosmeticDefinition): void {
    this.cosmetics.set(def.id, def);
  }

  static get(id: string): CosmeticDefinition | undefined {
    if (this.cosmetics.size === 0) {
      this.initDefaults();
    }
    // Match exact ID or category prefix
    const exact = this.cosmetics.get(id);
    if (exact) return exact;

    // Soft fallback matching (e.g., 'Short' -> 'hair_short', 'Cap' -> 'hat_cap')
    const normalized = id.toLowerCase();
    for (const [key, value] of this.cosmetics) {
      if (key.includes(normalized) || value.name.toLowerCase() === normalized) {
        return value;
      }
    }
    return undefined;
  }
}
