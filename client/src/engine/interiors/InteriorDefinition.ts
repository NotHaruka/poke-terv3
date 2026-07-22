/** Interior map definitions, furniture objects, lighting, and spawn points */

import { NPCDefinition } from 'poke-ter-shared';

export type FurnitureType = 
  | 'table' 
  | 'chair' 
  | 'bed' 
  | 'counter' 
  | 'bookshelf' 
  | 'tv' 
  | 'pc' 
  | 'plant' 
  | 'healing_machine' 
  | 'shop_shelf' 
  | 'rug' 
  | 'fireplace'
  | 'crate'
  | 'barrel'
  | 'mirror'
  | 'tactical_map'
  | 'starter_pod'
  | 'decor';

export interface FurnitureItem {
  id: string;
  name: string;
  type: FurnitureType;
  tileX: number; // local tile X in interior
  tileY: number; // local tile Y in interior
  widthTiles: number;
  heightTiles: number;
  solid: boolean;
  color?: string;
  interactable?: boolean;
  interactionText?: string | string[];
}

export interface InteriorLighting {
  ambientColor: string;
  brightness: number; // 0.0 to 1.0
  warmGlow?: boolean;
}

export interface InteriorDefinition {
  interiorId: string;
  name: string;
  widthTiles: number; // e.g. 12
  heightTiles: number; // e.g. 10
  tilemap: number[][]; // 2D grid of interior tile IDs
  furniture: FurnitureItem[];
  npcs: NPCDefinition[];
  lighting: InteriorLighting;
  music: string;
  ambientSound?: string;
  entranceSpawn: { tileX: number; tileY: number; direction: 'up' | 'down' | 'left' | 'right' };
  exitTile: { tileX: number; tileY: number };
  exitWarpOverworld?: { mapId: string; tileX: number; tileY: number; direction: 'down' };
}