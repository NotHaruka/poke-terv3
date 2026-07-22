/** Registry for interior and exterior furniture definitions */

export interface FurnitureDefinition {
  id: string;
  name: string;
  widthTiles: number;
  heightTiles: number;
  solid: boolean;
  color: string;
  secondaryColor?: string;
  hasInteractiveGlow?: boolean;
}

export class FurnitureRegistry {
  private static furniture = new Map<string, FurnitureDefinition>([
    ['table_oak', { id: 'table_oak', name: 'Oak Table', widthTiles: 2, heightTiles: 1, solid: true, color: '#8b4513', secondaryColor: '#a0522d' }],
    ['chair_wooden', { id: 'chair_wooden', name: 'Wooden Chair', widthTiles: 1, heightTiles: 1, solid: false, color: '#a0522d' }],
    ['pc_terminal', { id: 'pc_terminal', name: 'PC Terminal', widthTiles: 1, heightTiles: 1, solid: true, color: '#bdc3c7', secondaryColor: '#3498db', hasInteractiveGlow: true }],
    ['healing_machine', { id: 'healing_machine', name: 'Healing Machine', widthTiles: 2, heightTiles: 1, solid: true, color: '#e74c3c', secondaryColor: '#2ecc71', hasInteractiveGlow: true }],
    ['bed_single', { id: 'bed_single', name: 'Single Bed', widthTiles: 1, heightTiles: 2, solid: true, color: '#3498db', secondaryColor: '#ffffff' }],
    ['counter_wood', { id: 'counter_wood', name: 'Reception Counter', widthTiles: 3, heightTiles: 1, solid: true, color: '#5c3a21', secondaryColor: '#f5f5dc' }],
    ['bookshelf', { id: 'bookshelf', name: 'Bookshelf', widthTiles: 1, heightTiles: 2, solid: true, color: '#8b4513', secondaryColor: '#e74c3c' }],
    ['rug_red', { id: 'rug_red', name: 'Red Velvet Rug', widthTiles: 3, heightTiles: 2, solid: false, color: '#cc2222', secondaryColor: '#f1c40f' }],
    ['pot_plant', { id: 'pot_plant', name: 'Potted Plant', widthTiles: 1, heightTiles: 1, solid: true, color: '#27ae60', secondaryColor: '#d35400' }],
    ['tv_flat', { id: 'tv_flat', name: 'Flat Screen TV', widthTiles: 2, heightTiles: 1, solid: true, color: '#2c3e50', secondaryColor: '#34495e', hasInteractiveGlow: true }],
    ['couch_blue', { id: 'couch_blue', name: 'Blue Velvet Sofa', widthTiles: 2, heightTiles: 1, solid: true, color: '#2980b9', secondaryColor: '#3498db' }],
  ]);

  static get(id: string): FurnitureDefinition | undefined {
    return this.furniture.get(id);
  }

  static register(def: FurnitureDefinition): void {
    this.furniture.set(def.id, def);
  }
}
