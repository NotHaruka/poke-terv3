/** Core shared type definitions for Poke-ter */

export interface Vec2 {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right' | 'up-left' | 'up-right' | 'down-left' | 'down-right';

export type CardinalDirection = 'up' | 'down' | 'left' | 'right';

export interface TileCoord {
  x: number;
  y: number;
}

export interface ChunkCoord {
  cx: number;
  cy: number;
}

export enum MonsterType {
  Normal = 0,
  Fire = 1,
  Water = 2,
  Electric = 3,
  Grass = 4,
  Ice = 5,
  Fighting = 6,
  Poison = 7,
  Ground = 8,
  Flying = 9,
  Psychic = 10,
  Bug = 11,
  Rock = 12,
  Ghost = 13,
  Dragon = 14,
  Dark = 15,
  Steel = 16,
  Fairy = 17,
}

export enum Nature {
  Hardy = 0,
  Lonely = 1,
  Brave = 2,
  Adamant = 3,
  Naughty = 4,
  Bold = 5,
  Docile = 6,
  Relaxed = 7,
  Impish = 8,
  Lax = 9,
  Timid = 10,
  Hasty = 11,
  Serious = 12,
  Jolly = 13,
  Naive = 14,
  Modest = 15,
  Mild = 16,
  Quiet = 17,
  Bashful = 18,
  Rash = 19,
  Calm = 20,
  Gentle = 21,
  Sassy = 22,
  Careful = 23,
  Quirky = 24,
}

export enum Stat {
  HP = 0,
  Attack = 1,
  Defense = 2,
  SpAttack = 3,
  SpDefense = 4,
  Speed = 5,
}

export interface MonsterStats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
}

export interface MonsterSpecies {
  id: number;
  name: string;
  types: [MonsterType, MonsterType | null];
  baseStats: MonsterStats;
  evYield: MonsterStats;
  catchRate: number;
  experienceYield: number;
  growthRate: GrowthRate;
  evolutions: EvolutionRequirement[];
}

export enum GrowthRate {
  Fast = 0,
  MediumFast = 1,
  MediumSlow = 2,
  Slow = 3,
  Erratic = 4,
  Fluctuating = 5,
}

export interface EvolutionRequirement {
  targetSpeciesId: number;
  method: EvolutionMethod;
  level?: number;
  itemId?: number;
  trade?: boolean;
}

export enum EvolutionMethod {
  Level = 0,
  Item = 1,
  Trade = 2,
  TradeItem = 3,
}

export interface MonsterInstance {
  speciesId: number;
  nickname?: string;
  level: number;
  ivs: MonsterStats;
  evs: MonsterStats;
  nature: Nature;
  currentHp: number;
  maxHp: number;
  stats: MonsterStats;
  moves: number[];
  status: StatusEffect;
  friendship: number;
  experience: number;
  experienceToNext: number;
}

export enum StatusEffect {
  None = 0,
  Burn = 1,
  Freeze = 2,
  Paralysis = 3,
  Poison = 4,
  BadPoison = 5,
  Sleep = 6,
}

export enum MoveCategory {
  Physical = 0,
  Special = 1,
  Status = 2,
}

export interface MoveData {
  id: number;
  name: string;
  type: MonsterType;
  category: MoveCategory;
  power: number;
  accuracy: number;
  pp: number;
  priority: number;
  description: string;
}

export interface PlayerData {
  id: string;
  username: string;
  position: Vec2;
  direction: Direction;
  speed: number;
  money: number;
  party: MonsterInstance[];
  boxes: MonsterInstance[][];
  inventory: InventoryItem[];
  pokedex: number[];
  badges: number;
  currentMap: string;
  storyFlags: Record<string, boolean>;
}

export interface InventoryItem {
  itemId: number;
  quantity: number;
}

export interface ItemData {
  id: number;
  name: string;
  description: string;
  category: ItemCategory;
  price: number;
  healAmount?: number;
  effect?: string;
}

export enum ItemCategory {
  Medicine = 0,
  PokeBall = 1,
  Berry = 2,
  Held = 3,
  Key = 4,
  TM = 5,
}

export interface NPCDefinition {
  id: number;
  name: string;
  sprite: string;
  position: Vec2;
  direction: Direction;
  dialogues: DialogueLine[][];
  script?: string;
  shop?: number[];
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface TileData {
  id: number;
  walkable: boolean;
  spriteIndex: number;
  collisionGroup: number;
  isWater: boolean;
  isTallGrass: boolean;
  isDoor: boolean;
  warpTarget?: { map: string; x: number; y: number };
}

export interface ChunkData {
  cx: number;
  cy: number;
  tiles: number[][];
  npcs: NPCDefinition[];
  encounters: EncounterTable[];
}

export interface EncounterTable {
  type: EncounterType;
  species: number[];
  levels: [number, number];
  weight: number;
}

export enum EncounterType {
  TallGrass = 0,
  Surfing = 1,
  Cave = 2,
}