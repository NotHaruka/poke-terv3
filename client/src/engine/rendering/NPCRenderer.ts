/** Dedicated NPC renderer using NPCRegistry templates and state badges */

import { Direction } from 'poke-ter-shared';
import { NPCRegistry } from '../registries/NPCRegistry.js';
import { CharacterRenderer } from './CharacterRenderer.js';

export class NPCRenderer {
  static render(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    direction: Direction,
    worldX: number,
    templateId: string,
    npcName?: string
  ): void {
    const template = NPCRegistry.get(templateId);

    CharacterRenderer.renderCharacter(
      ctx,
      screenX,
      screenY,
      direction,
      false, // NPCs idling
      0,
      worldX,
      {
        name: npcName || template.name,
        bodyType: 'male',
        hairStyle: template.spriteId === 'nurse_joy' ? 'Medium' : 'Short',
        hairColor: template.hairColor,
        skinTone: template.skinTone,
        eyeColor: '#000000',
        shirtColor: template.shirtColor,
        pantsColor: template.pantsColor,
        shoesColor: '#222222',
        hatType: 'None',
        backpackType: 'None',
      },
      npcName || template.name
    );
  }
}
