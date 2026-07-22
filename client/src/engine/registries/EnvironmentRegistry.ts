/** Registry for environmental object templates, variant weights, and collision dimensions */

export interface EnvironmentObjectDef {
  id: string;
  name: string;
  widthTiles: number;
  heightTiles: number;
  solid: boolean;
  overhangHeightPx: number; // Y-sorted canopy/roof height
  variants: number;
  hasAnimation?: boolean;
  animationClipName?: string;
}

export class EnvironmentRegistry {
  private static objects = new Map<string, EnvironmentObjectDef>([
    ['tree_oak', { id: 'tree_oak', name: 'Oak Tree', widthTiles: 2, heightTiles: 2, solid: true, overhangHeightPx: 32, variants: 3 }],
    ['tree_pine', { id: 'tree_pine', name: 'Pine Tree', widthTiles: 2, heightTiles: 3, solid: true, overhangHeightPx: 48, variants: 2 }],
    ['tree_palm', { id: 'tree_palm', name: 'Palm Tree', widthTiles: 2, heightTiles: 3, solid: true, overhangHeightPx: 48, variants: 2 }],
    ['tree_cherry', { id: 'tree_cherry', name: 'Cherry Blossom Tree', widthTiles: 2, heightTiles: 2, solid: true, overhangHeightPx: 32, variants: 2 }],
    ['bush_berry', { id: 'bush_berry', name: 'Berry Bush', widthTiles: 1, heightTiles: 1, solid: true, overhangHeightPx: 0, variants: 4 }],
    ['flower_patch', { id: 'flower_patch', name: 'Flower Patch', widthTiles: 1, heightTiles: 1, solid: false, overhangHeightPx: 0, variants: 4, hasAnimation: true, animationClipName: 'flower_sway' }],
    ['tall_grass', { id: 'tall_grass', name: 'Tall Grass', widthTiles: 1, heightTiles: 1, solid: false, overhangHeightPx: 0, variants: 2 }],
    ['water_shore', { id: 'water_shore', name: 'Water Shore', widthTiles: 1, heightTiles: 1, solid: true, overhangHeightPx: 0, variants: 4, hasAnimation: true, animationClipName: 'water_flow' }],
    ['sign_wooden', { id: 'sign_wooden', name: 'Wooden Sign', widthTiles: 1, heightTiles: 1, solid: true, overhangHeightPx: 0, variants: 2 }],
    ['lamp_street', { id: 'lamp_street', name: 'Street Lamp', widthTiles: 1, heightTiles: 2, solid: true, overhangHeightPx: 16, variants: 1 }],
    ['bridge_wood', { id: 'bridge_wood', name: 'Wooden Bridge', widthTiles: 1, heightTiles: 1, solid: false, overhangHeightPx: 0, variants: 3 }],
    ['cliff_edge', { id: 'cliff_edge', name: 'Cliff Edge', widthTiles: 1, heightTiles: 1, solid: true, overhangHeightPx: 16, variants: 4 }],
  ]);

  static get(id: string): EnvironmentObjectDef | undefined {
    return this.objects.get(id);
  }

  static register(def: EnvironmentObjectDef): void {
    this.objects.set(def.id, def);
  }
}
