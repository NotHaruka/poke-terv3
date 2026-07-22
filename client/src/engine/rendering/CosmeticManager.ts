/** Cosmetic Manager resolving cosmetic IDs into ordered rendering chains */

import { Direction, PlayerProfile } from 'poke-ter-shared';
import { CosmeticRegistry } from '../registries/CosmeticRegistry.js';
import { PlayerRegistry, CosmeticLayer } from '../registries/PlayerRegistry.js';

export class CosmeticManager {
  private static instance: CosmeticManager;

  static getInstance(): CosmeticManager {
    if (!this.instance) {
      this.instance = new CosmeticManager();
    }
    return this.instance;
  }

  /** Normalizes direction string to 'up' | 'down' | 'left' | 'right' */
  private normalizeDir(direction: Direction): 'up' | 'down' | 'left' | 'right' {
    if (direction.includes('up')) return 'up';
    if (direction.includes('left')) return 'left';
    if (direction.includes('right')) return 'right';
    return 'down';
  }

  /**
   * Renders all cosmetic layers for a player profile in the mathematically correct Z-order
   * according to facing direction.
   */
  renderTrainerLayers(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    direction: Direction,
    profile: PlayerProfile,
    bounceOffset = 0,
    breathOffset = 0
  ): void {
    const dirStr = this.normalizeDir(direction);
    const layerOrder = PlayerRegistry.getLayerOrder(direction);

    const skinTone = profile.skinTone || '#ffccaa';
    const eyeColor = profile.eyeColor || '#000000';
    const hairStyle = profile.hairStyle || 'Short';
    const hairColor = profile.hairColor || '#000000';
    const shirtColor = profile.shirtColor || '#3a8be8';
    const pantsColor = profile.pantsColor || '#1e5b9e';
    const shoesColor = profile.shoesColor || '#444444';
    const hatType = profile.hatType || 'Cap';
    const backpackType = profile.backpackType || 'Standard';

    for (const layer of layerOrder) {
      switch (layer) {
        case 'body': {
          // Draw head and skin base
          const upperY = screenY + breathOffset - bounceOffset;
          ctx.fillStyle = skinTone;
          ctx.fillRect(screenX + 4, upperY - 3, 8, 7);
          break;
        }
        case 'eyes': {
          const eyesDef = CosmeticRegistry.get('eyes_standard');
          if (eyesDef) eyesDef.render(ctx, screenX, screenY, dirStr, eyeColor, bounceOffset, breathOffset);
          break;
        }
        case 'shoes': {
          const shoesDef = CosmeticRegistry.get('shoes_sneakers');
          if (shoesDef) shoesDef.render(ctx, screenX, screenY, dirStr, shoesColor, bounceOffset, breathOffset);
          break;
        }
        case 'pants': {
          const pantsDef = CosmeticRegistry.get('pants_jeans');
          if (pantsDef) pantsDef.render(ctx, screenX, screenY, dirStr, pantsColor, bounceOffset, breathOffset);
          break;
        }
        case 'shirt': {
          const shirtDef = CosmeticRegistry.get(`shirt_${shirtColor.startsWith('#') ? 'tshirt' : shirtColor.toLowerCase()}`) || CosmeticRegistry.get('shirt_tshirt');
          if (shirtDef) shirtDef.render(ctx, screenX, screenY, dirStr, shirtColor, bounceOffset, breathOffset);
          break;
        }
        case 'backpack': {
          if (backpackType.toLowerCase() !== 'none') {
            const packDef = CosmeticRegistry.get(`backpack_${backpackType.toLowerCase()}`) || CosmeticRegistry.get('backpack_standard');
            if (packDef) packDef.render(ctx, screenX, screenY, dirStr, '#8B4513', bounceOffset, breathOffset);
          }
          break;
        }
        case 'hair': {
          const hairDef = CosmeticRegistry.get(`hair_${hairStyle.toLowerCase()}`) || CosmeticRegistry.get('hair_short');
          if (hairDef) hairDef.render(ctx, screenX, screenY, dirStr, hairColor, bounceOffset, breathOffset);
          break;
        }
        case 'hat': {
          if (hatType.toLowerCase() !== 'none') {
            const hatDef = CosmeticRegistry.get(`hat_${hatType.toLowerCase()}`) || CosmeticRegistry.get('hat_cap');
            if (hatDef) hatDef.render(ctx, screenX, screenY, dirStr, '#cc2222', bounceOffset, breathOffset);
          }
          break;
        }
        default:
          break;
      }
    }
  }
}
