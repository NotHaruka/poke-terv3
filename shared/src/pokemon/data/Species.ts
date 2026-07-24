/** Monster data definitions and species database */

import { PokemonSpecies, StatBlock, EVYield } from '../models/PokemonSpecies.js';
import { PokemonType } from './Types.js';
import { GrowthRate, MonsterSpecies, MonsterStats, MonsterType, MoveCategory, MoveData } from '../models/PokemonInstance.js';

export const SPECIES_DATABASE: Record<number, PokemonSpecies> = {
  1: {
    id: 1,
    name: 'Bulbasaur',
    types: [PokemonType.Grass, PokemonType.Poison],
    baseStats: { hp: 45, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45 },
    abilities: { primary: 'overgrow', hidden: 'chlorophyll' },
    catchRate: 45,
    baseExp: 64,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'grass'],
    genderRatio: 87.5,
    height: 0.7,
    weight: 6.9,
    evYield: { specialAttack: 1 },
  },
  2: {
    id: 2,
    name: 'Ivysaur',
    types: [PokemonType.Grass, PokemonType.Poison],
    baseStats: { hp: 60, attack: 62, defense: 63, specialAttack: 80, specialDefense: 80, speed: 60 },
    abilities: { primary: 'overgrow', hidden: 'chlorophyll' },
    catchRate: 45,
    baseExp: 142,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'grass'],
    genderRatio: 87.5,
    height: 1.0,
    weight: 13.0,
    evYield: { specialAttack: 1, specialDefense: 1 },
  },
  3: {
    id: 3,
    name: 'Venusaur',
    types: [PokemonType.Grass, PokemonType.Poison],
    baseStats: { hp: 80, attack: 82, defense: 83, specialAttack: 100, specialDefense: 100, speed: 80 },
    abilities: { primary: 'overgrow', hidden: 'chlorophyll' },
    catchRate: 45,
    baseExp: 236,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'grass'],
    genderRatio: 87.5,
    height: 2.0,
    weight: 100.0,
    evYield: { specialAttack: 2, specialDefense: 1 },
  },
  4: {
    id: 4,
    name: 'Charmander',
    types: [PokemonType.Fire, PokemonType.Fire],
    baseStats: { hp: 39, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65 },
    abilities: { primary: 'blaze', hidden: 'solar_power' },
    catchRate: 45,
    baseExp: 62,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'dragon'],
    genderRatio: 87.5,
    height: 0.6,
    weight: 8.5,
    evYield: { speed: 1 },
  },
  5: {
    id: 5,
    name: 'Charmeleon',
    types: [PokemonType.Fire, PokemonType.Fire],
    baseStats: { hp: 58, attack: 64, defense: 58, specialAttack: 80, specialDefense: 65, speed: 80 },
    abilities: { primary: 'blaze', hidden: 'solar_power' },
    catchRate: 45,
    baseExp: 142,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'dragon'],
    genderRatio: 87.5,
    height: 1.1,
    weight: 19.0,
    evYield: { specialAttack: 1, speed: 1 },
  },
  6: {
    id: 6,
    name: 'Charizard',
    types: [PokemonType.Fire, PokemonType.Flying],
    baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
    abilities: { primary: 'blaze', hidden: 'solar_power' },
    catchRate: 45,
    baseExp: 240,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'dragon'],
    genderRatio: 87.5,
    height: 1.7,
    weight: 90.5,
    evYield: { specialAttack: 3 },
  },
  7: {
    id: 7,
    name: 'Squirtle',
    types: [PokemonType.Water, PokemonType.Water],
    baseStats: { hp: 44, attack: 48, defense: 65, specialAttack: 50, specialDefense: 64, speed: 43 },
    abilities: { primary: 'torrent', hidden: 'rain_dish' },
    catchRate: 45,
    baseExp: 63,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'water1'],
    genderRatio: 87.5,
    height: 0.5,
    weight: 9.0,
    evYield: { defense: 1 },
  },
  8: {
    id: 8,
    name: 'Wartortle',
    types: [PokemonType.Water, PokemonType.Water],
    baseStats: { hp: 59, attack: 63, defense: 80, specialAttack: 65, specialDefense: 80, speed: 58 },
    abilities: { primary: 'torrent', hidden: 'rain_dish' },
    catchRate: 45,
    baseExp: 142,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'water1'],
    genderRatio: 87.5,
    height: 1.0,
    weight: 22.5,
    evYield: { defense: 1, specialDefense: 1 },
  },
  9: {
    id: 9,
    name: 'Blastoise',
    types: [PokemonType.Water, PokemonType.Water],
    baseStats: { hp: 79, attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78 },
    abilities: { primary: 'torrent', hidden: 'rain_dish' },
    catchRate: 45,
    baseExp: 239,
    growthRate: 'medium_slow',
    eggGroups: ['monster', 'water1'],
    genderRatio: 87.5,
    height: 1.6,
    weight: 85.5,
    evYield: { specialDefense: 3 },
  },
  10: {
    id: 10,
    name: 'Caterpie',
    types: [PokemonType.Bug, PokemonType.Bug],
    baseStats: { hp: 45, attack: 30, defense: 35, specialAttack: 20, specialDefense: 20, speed: 45 },
    abilities: { primary: 'shield_dust', hidden: 'run_away' },
    catchRate: 255,
    baseExp: 39,
    growthRate: 'medium_fast',
    eggGroups: ['bug'],
    genderRatio: 50,
    height: 0.3,
    weight: 2.9,
    evYield: { hp: 1 },
  },
  11: {
    id: 11,
    name: 'Metapod',
    types: [PokemonType.Bug, PokemonType.Bug],
    baseStats: { hp: 50, attack: 20, defense: 55, specialAttack: 25, specialDefense: 25, speed: 30 },
    abilities: { primary: 'shed_skin' },
    catchRate: 120,
    baseExp: 72,
    growthRate: 'medium_fast',
    eggGroups: ['bug'],
    genderRatio: 50,
    height: 0.7,
    weight: 9.9,
    evYield: { defense: 2 },
  },
  12: {
    id: 12,
    name: 'Butterfree',
    types: [PokemonType.Bug, PokemonType.Flying],
    baseStats: { hp: 60, attack: 45, defense: 50, specialAttack: 90, specialDefense: 80, speed: 70 },
    abilities: { primary: 'compound_eyes', hidden: 'tinted_lens' },
    catchRate: 45,
    baseExp: 178,
    growthRate: 'medium_fast',
    eggGroups: ['bug'],
    genderRatio: 50,
    height: 1.1,
    weight: 32.0,
    evYield: { specialAttack: 2, specialDefense: 1 },
  },
  13: {
    id: 13,
    name: 'Pidgey',
    types: [PokemonType.Normal, PokemonType.Flying],
    baseStats: { hp: 40, attack: 45, defense: 40, specialAttack: 35, specialDefense: 35, speed: 56 },
    abilities: { primary: 'keen_eye', secondary: 'tangled_feet', hidden: 'big_pecks' },
    catchRate: 255,
    baseExp: 50,
    growthRate: 'medium_slow',
    eggGroups: ['flying'],
    genderRatio: 50,
    height: 0.3,
    weight: 1.8,
    evYield: { speed: 1 },
  },
  14: {
    id: 14,
    name: 'Pidgeotto',
    types: [PokemonType.Normal, PokemonType.Flying],
    baseStats: { hp: 63, attack: 60, defense: 55, specialAttack: 50, specialDefense: 50, speed: 71 },
    abilities: { primary: 'keen_eye', secondary: 'tangled_feet', hidden: 'big_pecks' },
    catchRate: 120,
    baseExp: 122,
    growthRate: 'medium_slow',
    eggGroups: ['flying'],
    genderRatio: 50,
    height: 1.1,
    weight: 30.0,
    evYield: { speed: 2 },
  },
  15: {
    id: 15,
    name: 'Pidgeot',
    types: [PokemonType.Normal, PokemonType.Flying],
    baseStats: { hp: 83, attack: 80, defense: 75, specialAttack: 70, specialDefense: 70, speed: 101 },
    abilities: { primary: 'keen_eye', secondary: 'tangled_feet', hidden: 'big_pecks' },
    catchRate: 45,
    baseExp: 216,
    growthRate: 'medium_slow',
    eggGroups: ['flying'],
    genderRatio: 50,
    height: 1.5,
    weight: 39.5,
    evYield: { speed: 3 },
  },
  25: {
    id: 25,
    name: 'Pikachu',
    types: [PokemonType.Electric, PokemonType.Electric],
    baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
    abilities: { primary: 'static', hidden: 'lightning_rod' },
    catchRate: 190,
    baseExp: 112,
    growthRate: 'medium_fast',
    eggGroups: ['field', 'fairy'],
    genderRatio: 50,
    height: 0.4,
    weight: 6.0,
    evYield: { speed: 2 },
  },
  26: {
    id: 26,
    name: 'Raichu',
    types: [PokemonType.Electric, PokemonType.Electric],
    baseStats: { hp: 60, attack: 90, defense: 55, specialAttack: 90, specialDefense: 80, speed: 110 },
    abilities: { primary: 'static', hidden: 'lightning_rod' },
    catchRate: 75,
    baseExp: 218,
    growthRate: 'medium_fast',
    eggGroups: ['field', 'fairy'],
    genderRatio: 50,
    height: 0.8,
    weight: 30.0,
    evYield: { speed: 3 },
  },
};

export const Species = SPECIES_DATABASE;

// Backwards compatibility helpers
export const MONSTER_SPECIES: MonsterSpecies[] = Object.values(SPECIES_DATABASE).map(s => ({
  id: s.id,
  name: s.name,
  types: [
    s.types[0] as unknown as MonsterType,
    s.types[1] && s.types[1] !== s.types[0] ? (s.types[1] as unknown as MonsterType) : null,
  ],
  baseStats: {
    hp: s.baseStats.hp,
    attack: s.baseStats.attack,
    defense: s.baseStats.defense,
    spAttack: s.baseStats.specialAttack,
    spDefense: s.baseStats.specialDefense,
    speed: s.baseStats.speed,
  },
  evYield: {
    hp: s.evYield.hp ?? 0,
    attack: s.evYield.attack ?? 0,
    defense: s.evYield.defense ?? 0,
    spAttack: s.evYield.specialAttack ?? 0,
    spDefense: s.evYield.specialDefense ?? 0,
    speed: s.evYield.speed ?? 0,
  },
  catchRate: s.catchRate,
  experienceYield: s.baseExp,
  growthRate: GrowthRate.MediumSlow,
  evolutions: [],
}));

export function getMonsterSpecies(id: number): MonsterSpecies | undefined {
  return MONSTER_SPECIES.find(s => s.id === id);
}

export function getMoveData(id: number): MoveData {
  return {
    id,
    name: 'Tackle',
    type: MonsterType.Normal,
    category: MoveCategory.Physical,
    power: 40,
    accuracy: 100,
    pp: 35,
    priority: 0,
    description: 'A physical charge attack.',
  };
}

export function getDefaultMovesForSpecies(speciesId: number): number[] {
  switch (speciesId) {
    case 1: case 2: case 3: return [1, 23, 3, 7];
    case 4: case 5: case 6: return [2, 23, 4, 8];
    case 7: case 8: case 9: return [1, 24, 5, 9];
    case 25: case 26: return [1, 24, 6, 10];
    default: return [1, 2, 22, 23];
  }
}

export function calculateStats(
  baseStats: MonsterStats,
  ivs: MonsterStats,
  evs: MonsterStats,
  level: number,
  natureMultiplier: number = 1.0,
): MonsterStats {
  const stats: MonsterStats = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
  stats.hp = Math.floor(((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;
  for (const stat of ['attack', 'defense', 'spAttack', 'spDefense', 'speed'] as (keyof MonsterStats)[]) {
    stats[stat] = Math.floor(
      Math.floor(((2 * baseStats[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100) + 5
    );
  }
  return stats;
}

export function experienceForLevel(level: number, growthRate: GrowthRate): number {
  return Math.floor(Math.pow(level, 3));
}

export function getTypeEffectiveness(
  attackType: MonsterType,
  defenderTypes: [MonsterType, MonsterType | null],
): number {
  return 1.0;
}
