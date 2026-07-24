import { PokemonType } from '../data/Types';

export type GrowthRate =
  | 'fast'
  | 'medium_fast'
  | 'medium_slow'
  | 'slow'
  | 'erratic'
  | 'fluctuating';

export type EggGroup =
  | 'monster'
  | 'water1'
  | 'bug'
  | 'flying'
  | 'field'
  | 'fairy'
  | 'grass'
  | 'humanlike'
  | 'water3'
  | 'mineral'
  | 'amorphous'
  | 'water2'
  | 'ditto'
  | 'dragon'
  | 'undiscovered';

export interface StatBlock {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
}

export interface EVYield {
  readonly hp?: number;
  readonly attack?: number;
  readonly defense?: number;
  readonly specialAttack?: number;
  readonly specialDefense?: number;
  readonly speed?: number;
}

export interface SpeciesAbilities {
  readonly primary: string;
  readonly secondary?: string;
  readonly hidden?: string;
}

export interface FormDefinition {
  readonly formId: string;
  readonly formName: string;
  readonly types: readonly [PokemonType] | readonly [PokemonType, PokemonType];
  readonly baseStats: StatBlock;
  readonly abilities: SpeciesAbilities;
  readonly height: number; // in meters
  readonly weight: number; // in kg
  readonly isMega?: boolean;
  readonly requiredItem?: string;
}

export interface PokemonSpecies {
  readonly id: number; // National Dex Number
  readonly name: string;
  readonly types: readonly [PokemonType] | readonly [PokemonType, PokemonType];
  readonly baseStats: StatBlock;
  readonly abilities: SpeciesAbilities;
  readonly catchRate: number;
  readonly baseExp: number;
  readonly growthRate: GrowthRate;
  readonly eggGroups: readonly EggGroup[];
  readonly genderRatio: number; // -1 for genderless, 0 = 100% female, 100 = 100% male, 50 = 50/50
  readonly height: number; // in meters
  readonly weight: number; // in kg
  readonly evYield: EVYield;
  readonly forms?: readonly FormDefinition[];
}
