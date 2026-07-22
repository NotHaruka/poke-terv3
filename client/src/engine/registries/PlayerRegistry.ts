/** Player body types, layer z-orders per direction, and base character specifications */

import { Direction } from 'poke-ter-shared';

export interface BodyTypeDefinition {
  id: string;
  name: string;
  width: number;
  height: number;
  shadowWidth: number;
  shadowHeight: number;
}

export type CosmeticLayer = 'backpack' | 'body' | 'pants' | 'shirt' | 'shoes' | 'eyes' | 'hair' | 'hat' | 'accessory';

export class PlayerRegistry {
  private static bodyTypes = new Map<string, BodyTypeDefinition>([
    ['male', { id: 'male', name: 'Boy Trainer', width: 16, height: 16, shadowWidth: 14, shadowHeight: 6 }],
    ['female', { id: 'female', name: 'Girl Trainer', width: 16, height: 16, shadowWidth: 14, shadowHeight: 6 }],
  ]);

  /**
   * Z-order rendering order of layers depending on character direction.
   * For example:
   * When facing UP: Backpack renders behind shirt, hair/hat render on top of head.
   * When facing DOWN: Backpack renders behind or in front depending on bag type, eyes on top of face.
   * When facing SIDE: Backpack renders on left/right side.
   */
  static getLayerOrder(direction: Direction): CosmeticLayer[] {
    const dir = direction.includes('left') ? 'left' : direction.includes('right') ? 'right' : direction.includes('up') ? 'up' : 'down';

    switch (dir) {
      case 'up':
        return ['shoes', 'pants', 'shirt', 'body', 'backpack', 'hair', 'hat', 'accessory'];
      case 'down':
        return ['backpack', 'shoes', 'pants', 'shirt', 'body', 'eyes', 'hair', 'hat', 'accessory'];
      case 'left':
      case 'right':
      default:
        return ['shoes', 'pants', 'shirt', 'backpack', 'body', 'eyes', 'hair', 'hat', 'accessory'];
    }
  }

  static getBodyType(id: string): BodyTypeDefinition {
    return this.bodyTypes.get(id) || this.bodyTypes.get('male')!;
  }
}
