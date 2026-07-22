/** Cosmetic Manager resolving cosmetic IDs into ordered rendering chains */

import { Direction, PlayerProfile } from 'poke-ter-shared';
import { CosmeticRegistry } from '../registries/CosmeticRegistry.js';
import { PlayerRegistry, CosmeticLayer } from '../registries/PlayerRegistry.js';
import { PaletteRegistry } from '../registries/PaletteRegistry.js';

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

          if (profile.bodyType === 'female') {
            ctx.fillStyle = 'rgba(255, 120, 150, 0.65)'; // Soft feminine cheek blush
            if (dirStr === 'down') {
              ctx.fillRect(screenX + 5, upperY + 1, 1, 1);
              ctx.fillRect(screenX + 10, upperY + 1, 1, 1);
              // Cute petite smile (soft pink lips)
              ctx.fillStyle = '#ff6688';
              ctx.fillRect(screenX + 7, upperY + 2, 2, 1);
            } else if (dirStr === 'left') {
              ctx.fillRect(screenX + 4, upperY + 1, 1, 1);
              // Cute side profile lips
              ctx.fillStyle = '#ff6688';
              ctx.fillRect(screenX + 5, upperY + 2, 1, 1);
            } else if (dirStr === 'right') {
              ctx.fillRect(screenX + 11, upperY + 1, 1, 1);
              // Cute side profile lips
              ctx.fillStyle = '#ff6688';
              ctx.fillRect(screenX + 10, upperY + 2, 1, 1);
            }
          }
          break;
        }
        case 'eyes': {
          if (profile.bodyType === 'female') {
            const upperY = screenY + breathOffset - bounceOffset;
            const finalEyeColor = PaletteRegistry.getEyeColor(eyeColor);

            if (dirStr === 'down') {
              // --- FRONT VIEW TALL EXPRESSIVE EYES ---
              // Left Eye Iris (1x2 tall)
              ctx.fillStyle = finalEyeColor;
              ctx.fillRect(screenX + 6, upperY, 1, 2);
              // Right Eye Iris (1x2 tall)
              ctx.fillRect(screenX + 9, upperY, 1, 2);

              // Cute Sparkle Highlights (white)
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(screenX + 6, upperY, 1, 1);
              ctx.fillRect(screenX + 9, upperY, 1, 1);

              // Dark Winged Eyelashes
              ctx.fillStyle = '#1a1a1a';
              // Left Lash line & wing
              ctx.fillRect(screenX + 5, upperY - 1, 2, 1);
              ctx.fillRect(screenX + 5, upperY, 1, 1);
              // Right Lash line & wing
              ctx.fillRect(screenX + 9, upperY - 1, 2, 1);
              ctx.fillRect(screenX + 10, upperY, 1, 1);

            } else if (dirStr === 'left') {
              // --- LEFT VIEW EYE ---
              ctx.fillStyle = finalEyeColor;
              ctx.fillRect(screenX + 5, upperY, 1, 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(screenX + 5, upperY, 1, 1);
              ctx.fillStyle = '#1a1a1a';
              ctx.fillRect(screenX + 4, upperY - 1, 2, 1);
              ctx.fillRect(screenX + 4, upperY, 1, 1);

            } else if (dirStr === 'right') {
              // --- RIGHT VIEW EYE ---
              ctx.fillStyle = finalEyeColor;
              ctx.fillRect(screenX + 10, upperY, 1, 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(screenX + 10, upperY, 1, 1);
              ctx.fillStyle = '#1a1a1a';
              ctx.fillRect(screenX + 10, upperY - 1, 2, 1);
              ctx.fillRect(screenX + 11, upperY, 1, 1);
            }
          } else {
            const eyesDef = CosmeticRegistry.get('eyes_standard');
            if (eyesDef) eyesDef.render(ctx, screenX, screenY, dirStr, eyeColor, bounceOffset, breathOffset);
          }
          break;
        }
        case 'shoes': {
          const shoesDef = CosmeticRegistry.get('shoes_sneakers');
          if (shoesDef) shoesDef.render(ctx, screenX, screenY, dirStr, shoesColor, bounceOffset, breathOffset);
          break;
        }
        case 'pants': {
          if (profile.bodyType === 'female') {
            // Render a beautiful flared pleated skirt instead of jeans/pants
            if (dirStr === 'down' || dirStr === 'up') {
              // Row 9 (Waist / top of skirt): x + 5 to x + 10 (width 6)
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + 5, screenY + 9, 6, 1);

              // Row 10: x + 4 to x + 11 (width 8)
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + 4, screenY + 10, 8, 1);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; // Soft shadow on edges
              ctx.fillRect(screenX + 4, screenY + 10, 1, 1);
              ctx.fillRect(screenX + 11, screenY + 10, 1, 1);

              // Row 11: x + 3 to x + 12 (width 10)
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + 3, screenY + 11, 10, 1);
              // Pleat shadows (x+3, x+7, x+8, x+12)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
              ctx.fillRect(screenX + 3, screenY + 11, 1, 1);
              ctx.fillRect(screenX + 7, screenY + 11, 2, 1);
              ctx.fillRect(screenX + 12, screenY + 11, 1, 1);
              // Pleat highlights (x+4, x+5, x+9, x+10)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(screenX + 4, screenY + 11, 2, 1);
              ctx.fillRect(screenX + 9, screenY + 11, 2, 1);

              // Row 12: x + 2 to x + 13 (width 12) - High fidelity flared pleats
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + 2, screenY + 12, 12, 1);
              // Pleat 1 (shadow left edge)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.fillRect(screenX + 2, screenY + 12, 1, 1);
              // Pleat 2 (light)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(screenX + 3, screenY + 12, 2, 1);
              // Pleat 4 (shadow crease)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
              ctx.fillRect(screenX + 6, screenY + 12, 2, 1);
              // Pleat 5 (light)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fillRect(screenX + 8, screenY + 12, 2, 1);
              // Pleat 7 (shadow right edge)
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.fillRect(screenX + 13, screenY + 12, 1, 1);

              // Row 13 (Bottom hem): x + 2 to x + 13 (width 12) with a deep shadow/hem shade
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + 2, screenY + 13, 12, 1);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
              ctx.fillRect(screenX + 2, screenY + 13, 12, 1);
            } else {
              // Side views ('left' / 'right') - A-line flare
              // Row 9 (Waist): width 4 (x+6 to x+9 for left, x+7 to x+10 for right)
              const startX9 = dirStr === 'left' ? 6 : 7;
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + startX9, screenY + 9, 4, 1);

              // Row 10: width 6
              const startX10 = dirStr === 'left' ? 5 : 6;
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + startX10, screenY + 10, 6, 1);

              // Row 11: width 8
              const startX11 = dirStr === 'left' ? 4 : 5;
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + startX11, screenY + 11, 8, 1);

              // Row 12: width 10
              const startX12 = dirStr === 'left' ? 3 : 4;
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + startX12, screenY + 12, 10, 1);

              // Shade the front of the skirt lighter and back of the skirt darker
              if (dirStr === 'left') {
                // Front (left side, x+3 to x+6)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.fillRect(screenX + 3, screenY + 11, 4, 2);
                // Back (right side, x+8 to x+12)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(screenX + 8, screenY + 11, 5, 2);
                // Crease (middle, x+7)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
                ctx.fillRect(screenX + 7, screenY + 11, 1, 2);
              } else {
                // Front (right side, x+10 to x+13)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
                ctx.fillRect(screenX + 10, screenY + 11, 4, 2);
                // Back (left side, x+4 to x+8)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
                ctx.fillRect(screenX + 4, screenY + 11, 5, 2);
                // Crease (middle, x+9)
                ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
                ctx.fillRect(screenX + 9, screenY + 11, 1, 2);
              }

              // Row 13: width 10 with hem shade
              ctx.fillStyle = pantsColor;
              ctx.fillRect(screenX + startX12, screenY + 13, 10, 1);
              ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
              ctx.fillRect(screenX + startX12, screenY + 13, 10, 1);
            }
          } else {
            const pantsDef = CosmeticRegistry.get('pants_jeans');
            if (pantsDef) pantsDef.render(ctx, screenX, screenY, dirStr, pantsColor, bounceOffset, breathOffset);
          }
          break;
        }
        case 'shirt': {
          if (profile.bodyType === 'female') {
            // Render a beautiful custom tailored feminine top/shirt that curves in at the waist
            const upperY = screenY + breathOffset - bounceOffset;
            
            if (dirStr === 'down') {
              // --- FRONT VIEW ---
              // Row 3 (Shoulder/Neckline area):
              // Skin-colored open neck/collarbone in center
              ctx.fillStyle = skinTone;
              ctx.fillRect(screenX + 6, upperY + 3, 4, 1);
              // Shoulder straps/sleeves
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 4, upperY + 3, 2, 1);
              ctx.fillRect(screenX + 10, upperY + 3, 2, 1);

              // Row 4 (Chest / Bust):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 4, upperY + 4, 8, 1);
              // Add a subtle shadow split to define bust shape
              ctx.fillStyle = 'rgba(0,0,0,0.12)';
              ctx.fillRect(screenX + 7, upperY + 4, 2, 1);

              // Row 5 (Midriff/Waist curves in - width 6):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 5, upperY + 5, 6, 1);

              // Row 6 (Sleek Waist - width 6):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 5, upperY + 6, 6, 1);

              // Row 7 (Lower waist/belt transition - width 6):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 5, upperY + 7, 6, 1);

              // Row 8 (Crop/Hem line - width 6):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 5, upperY + 8, 6, 1);

            } else if (dirStr === 'up') {
              // --- BACK VIEW ---
              // Row 3 (Shoulders):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 4, upperY + 3, 8, 1);

              // Row 4 (Upper back):
              ctx.fillRect(screenX + 4, upperY + 4, 8, 1);

              // Row 5 (Midriff curves in):
              ctx.fillRect(screenX + 5, upperY + 5, 6, 1);

              // Row 6 (Sleek Waist):
              ctx.fillRect(screenX + 5, upperY + 6, 6, 1);

              // Row 7 (Lower waist):
              ctx.fillRect(screenX + 5, upperY + 7, 6, 1);

              // Row 8 (Bottom):
              ctx.fillRect(screenX + 5, upperY + 8, 6, 1);

            } else {
              // --- SIDE VIEWS ('left' / 'right') ---
              const isLeft = dirStr === 'left';
              const frontXOffset = isLeft ? 0 : 1; // front shifts left or right

              // Row 3 (Shoulder):
              ctx.fillStyle = shirtColor;
              ctx.fillRect(screenX + 6, upperY + 3, 4, 1);

              // Row 4 (Chest with elegant feminine side-profile curve):
              // Width 6, slightly extended on the front side (x+5 to x+10 for left, x+6 to x+11 for right)
              ctx.fillRect(screenX + 5 + frontXOffset, upperY + 4, 6, 1);

              // Row 5 (Slim Waist - width 4):
              ctx.fillRect(screenX + 6 + frontXOffset, upperY + 5, 4, 1);

              // Row 6 (Slim Waist):
              ctx.fillRect(screenX + 6 + frontXOffset, upperY + 6, 4, 1);

              // Row 7 (Lower shirt):
              ctx.fillRect(screenX + 6 + frontXOffset, upperY + 7, 4, 1);

              // Row 8:
              ctx.fillRect(screenX + 6, upperY + 8, 4, 1);
            }
          } else {
            const shirtDef = CosmeticRegistry.get(`shirt_${shirtColor.startsWith('#') ? 'tshirt' : shirtColor.toLowerCase()}`) || CosmeticRegistry.get('shirt_tshirt');
            if (shirtDef) shirtDef.render(ctx, screenX, screenY, dirStr, shirtColor, bounceOffset, breathOffset);
          }
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

          if (profile.bodyType === 'female') {
            const upperY = screenY + breathOffset - bounceOffset;
            ctx.fillStyle = '#ff3366'; // Pink/Red Bow
            if (dirStr === 'down') {
              // Cute bow on left side of head
              ctx.fillRect(screenX + 3, upperY - 3, 2, 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(screenX + 4, upperY - 2, 1, 1);
            } else if (dirStr === 'left') {
              ctx.fillRect(screenX + 8, upperY - 3, 2, 2);
            } else if (dirStr === 'right') {
              ctx.fillRect(screenX + 6, upperY - 3, 2, 2);
            } else if (dirStr === 'up') {
              ctx.fillRect(screenX + 3, upperY - 3, 2, 2);
              ctx.fillRect(screenX + 11, upperY - 3, 2, 2);
            }
          }
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
