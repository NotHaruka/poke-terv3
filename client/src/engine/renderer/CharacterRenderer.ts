/** Base humanoid character renderer with shadow, bounce, breath, and nameplate pass */

import { Direction, PlayerProfile } from 'poke-ter-shared';
import { CosmeticManager } from './CosmeticManager.js';
import { envSystem } from '../physics/EnvironmentSystem.js';

export class CharacterRenderer {
  private static cosmeticManager = CosmeticManager.getInstance();

  /** Draw soft elliptical drop shadow */
  static renderShadow(ctx: CanvasRenderingContext2D, screenX: number, screenY: number, width = 14, height = 6): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX + 8, screenY + 15, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Render a complete humanoid trainer */
  static renderCharacter(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    direction: Direction,
    moving: boolean,
    speed: number,
    worldX: number,
    profile: PlayerProfile,
    nameplate?: string
  ): void {
    // 1. Shadow
    this.renderShadow(ctx, screenX, screenY);

    // 2. Motion bounce & breathing calculations
    let bounceOffset = 0;
    if (moving) {
      bounceOffset = Math.sin(envSystem.time * 0.015 * (speed / 2.5)) > 0 ? 1 : 0;
    }
    const breathOffset = (!moving && Math.sin(envSystem.time * 0.003 + worldX * 0.1) > 0.5) ? 1 : 0;

    // 3. Render cosmetic layers in direction-aware order
    this.cosmeticManager.renderTrainerLayers(
      ctx,
      screenX,
      screenY,
      direction,
      profile,
      bounceOffset,
      breathOffset
    );

    // 4. Nameplate (if provided)
    if (nameplate) {
      const upperY = screenY + breathOffset - bounceOffset;
      ctx.fillStyle = '#ffffff';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(nameplate, screenX + 8, upperY - 8);
    }
  }
}
