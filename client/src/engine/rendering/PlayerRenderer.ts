/** Dedicated renderer for local and remote multiplayer players */

import { Direction, PlayerProfile } from 'poke-ter-shared';
import { CharacterRenderer } from './CharacterRenderer.js';

export class PlayerRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    direction: Direction,
    moving: boolean,
    speed: number,
    worldX: number,
    profile?: PlayerProfile,
    username?: string
  ): void {
    const defaultProfile: PlayerProfile = {
      name: username || 'Trainer',
      bodyType: 'male',
      hairStyle: 'Short',
      hairColor: '#cc2222',
      skinTone: '#ffccaa',
      eyeColor: '#000000',
      shirtColor: '#3a8be8',
      pantsColor: '#1e5b9e',
      shoesColor: '#222222',
      hatType: 'Cap',
      backpackType: 'Standard',
    };

    const activeProfile = profile || defaultProfile;

    CharacterRenderer.renderCharacter(
      ctx,
      screenX,
      screenY,
      direction,
      moving,
      speed,
      worldX,
      activeProfile,
      username
    );
  }
}
