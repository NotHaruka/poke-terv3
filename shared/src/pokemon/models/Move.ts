import { PokemonType } from '../data/Types.js';

export type MoveCategory = 'physical' | 'special' | 'status';

export type MoveTarget =
  | 'selected_pokemon'
  | 'user'
  | 'all_opponents'
  | 'all_other_pokemon'
  | 'random_opponent'
  | 'entire_field';

export interface MoveSecondaryEffect {
  readonly chance: number; // Percentage 0-100
  readonly status?: string;
  readonly statChange?: {
    readonly stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed' | 'accuracy' | 'evasion';
    readonly stages: number;
  };
}

export interface Move {
  readonly id: number;
  readonly name: string;
  readonly type: PokemonType;
  readonly category: MoveCategory;
  readonly power: number;
  readonly accuracy: number; // 0 for moves that never miss
  readonly pp: number;
  readonly maxPp: number;
  readonly priority: number;
  readonly target: MoveTarget;
  readonly description: string;
  readonly drain?: number;
  readonly recoil?: number;
  readonly critRatio?: number;
  readonly secondaryEffect?: MoveSecondaryEffect;
}
