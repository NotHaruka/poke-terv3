/** Building data structure and configuration definitions for overworld structures */

export type BuildingType = 
  | 'house' 
  | 'lab' 
  | 'healing_center' 
  | 'shop' 
  | 'inn' 
  | 'warehouse' 
  | 'ranger_station' 
  | 'windmill' 
  | 'gym'
  | 'boutique'
  | 'library'
  | 'manor';

export interface BuildingDefinition {
  id: string;
  name: string;
  type: BuildingType;
  widthTiles: number;
  heightTiles: number;
  doorOffsetX: number; // in tiles from left
  doorOffsetY: number; // in tiles from top
  roofColor: string;
  wallColor: string;
  trimColor: string;
  roofStyle?: 'sloped' | 'flat' | 'peaked' | 'windmill' | 'glass';
  signSymbol?: string;
  signText?: string;
  interiorMapId: string;
  interiorSpawnTile: { x: number; y: number };
  interiorSpawnDirection?: 'up' | 'down' | 'left' | 'right';
  isLocked?: boolean;
  requiredKey?: string;
  animated?: boolean;
}

export interface BuildingInstance {
  instanceId: string;
  definitionId: string;
  mapId: string; // e.g. 'city', 'route_1'
  tileX: number; // top-left tile X in world coordinates
  tileY: number; // top-left tile Y in world coordinates
  customName?: string;
  isLocked?: boolean;
}
