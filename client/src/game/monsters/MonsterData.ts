/** Monster data definitions and species database */

import { MonsterSpecies, MonsterType, GrowthRate, EvolutionMethod, MonsterStats } from 'poke-ter-shared';

// Base monster species definitions
export const MONSTER_SPECIES: MonsterSpecies[] = [
  {
    id: 1,
    name: 'Flamepup',
    types: [MonsterType.Fire, null],
    baseStats: { hp: 45, attack: 60, defense: 40, spAttack: 50, spDefense: 45, speed: 55 },
    evYield: { hp: 0, attack: 1, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    catchRate: 45,
    experienceYield: 65,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 2, method: EvolutionMethod.Level, level: 16 },
    ],
  },
  {
    id: 2,
    name: 'Blazehound',
    types: [MonsterType.Fire, null],
    baseStats: { hp: 65, attack: 85, defense: 55, spAttack: 75, spDefense: 60, speed: 80 },
    evYield: { hp: 0, attack: 2, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    catchRate: 30,
    experienceYield: 145,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 3, method: EvolutionMethod.Level, level: 36 },
    ],
  },
  {
    id: 3,
    name: 'Infernotaur',
    types: [MonsterType.Fire, MonsterType.Fighting],
    baseStats: { hp: 85, attack: 115, defense: 75, spAttack: 100, spDefense: 80, speed: 95 },
    evYield: { hp: 0, attack: 3, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    catchRate: 15,
    experienceYield: 245,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [],
  },
  {
    id: 4,
    name: 'Sproutling',
    types: [MonsterType.Grass, null],
    baseStats: { hp: 50, attack: 45, defense: 50, spAttack: 60, spDefense: 55, speed: 40 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 1, spDefense: 0, speed: 0 },
    catchRate: 45,
    experienceYield: 65,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 5, method: EvolutionMethod.Level, level: 16 },
    ],
  },
  {
    id: 5,
    name: 'Floramander',
    types: [MonsterType.Grass, MonsterType.Poison],
    baseStats: { hp: 70, attack: 60, defense: 65, spAttack: 85, spDefense: 75, speed: 65 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 2, spDefense: 0, speed: 0 },
    catchRate: 30,
    experienceYield: 145,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 6, method: EvolutionMethod.Level, level: 36 },
    ],
  },
  {
    id: 6,
    name: 'Venusaur',
    types: [MonsterType.Grass, MonsterType.Poison],
    baseStats: { hp: 90, attack: 75, defense: 85, spAttack: 115, spDefense: 100, speed: 80 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 3, spDefense: 0, speed: 0 },
    catchRate: 15,
    experienceYield: 245,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [],
  },
  {
    id: 7,
    name: 'Aquafin',
    types: [MonsterType.Water, null],
    baseStats: { hp: 55, attack: 50, defense: 45, spAttack: 50, spDefense: 50, speed: 50 },
    evYield: { hp: 1, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
    catchRate: 45,
    experienceYield: 65,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 8, method: EvolutionMethod.Level, level: 16 },
    ],
  },
  {
    id: 8,
    name: 'Dolphirate',
    types: [MonsterType.Water, null],
    baseStats: { hp: 75, attack: 70, defense: 60, spAttack: 75, spDefense: 65, speed: 75 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 2, spDefense: 0, speed: 0 },
    catchRate: 30,
    experienceYield: 145,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [
      { targetSpeciesId: 9, method: EvolutionMethod.Level, level: 36 },
    ],
  },
  {
    id: 9,
    name: 'Leviaqua',
    types: [MonsterType.Water, MonsterType.Dragon],
    baseStats: { hp: 95, attack: 85, defense: 80, spAttack: 110, spDefense: 90, speed: 85 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 3, spDefense: 0, speed: 0 },
    catchRate: 15,
    experienceYield: 255,
    growthRate: GrowthRate.MediumSlow,
    evolutions: [],
  },
  {
    id: 10,
    name: 'Chirpix',
    types: [MonsterType.Normal, MonsterType.Flying],
    baseStats: { hp: 35, attack: 40, defense: 30, spAttack: 35, spDefense: 30, speed: 55 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 1 },
    catchRate: 255,
    experienceYield: 45,
    growthRate: GrowthRate.MediumFast,
    evolutions: [
      { targetSpeciesId: 11, method: EvolutionMethod.Level, level: 18 },
    ],
  },
  {
    id: 11,
    name: 'Stratbeak',
    types: [MonsterType.Normal, MonsterType.Flying],
    baseStats: { hp: 55, attack: 65, defense: 50, spAttack: 50, spDefense: 50, speed: 75 },
    evYield: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 2 },
    catchRate: 120,
    experienceYield: 120,
    growthRate: GrowthRate.MediumFast,
    evolutions: [],
  },
];

/** Get a monster species by ID */
export function getMonsterSpecies(id: number): MonsterSpecies | undefined {
  return MONSTER_SPECIES.find(s => s.id === id);
}

/** Calculate stats for a monster at a given level */
export function calculateStats(
  baseStats: MonsterStats,
  ivs: MonsterStats,
  evs: MonsterStats,
  level: number,
  natureMultiplier: number = 1.0,
): MonsterStats {
  const stats: MonsterStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    spAttack: 0,
    spDefense: 0,
    speed: 0,
  };

  // HP has a different formula
  stats.hp = Math.floor(((2 * baseStats.hp + ivs.hp + Math.floor(evs.hp / 4)) * level) / 100) + level + 10;

  // Other stats
  for (const stat of ['attack', 'defense', 'spAttack', 'spDefense', 'speed'] as (keyof MonsterStats)[]) {
    stats[stat] = Math.floor(
      Math.floor(((2 * baseStats[stat] + ivs[stat] + Math.floor(evs[stat] / 4)) * level) / 100) + 5
    );
  }

  return stats;
}

/** Calculate experience needed for a level */
export function experienceForLevel(level: number, growthRate: GrowthRate): number {
  switch (growthRate) {
    case GrowthRate.Fast:
      return Math.floor(4 * Math.pow(level, 3) / 5);
    case GrowthRate.MediumFast:
      return Math.floor(Math.pow(level, 3));
    case GrowthRate.MediumSlow:
      return Math.floor(6 * Math.pow(level, 3) / 5 - 15 * Math.pow(level, 2) + 100 * level - 140);
    case GrowthRate.Slow:
      return Math.floor(5 * Math.pow(level, 3) / 4);
    case GrowthRate.Erratic:
      if (level <= 50) return Math.floor(Math.pow(level, 3) * (100 - level) / 50);
      if (level <= 68) return Math.floor(Math.pow(level, 3) * (150 - level) / 100);
      if (level <= 98) return Math.floor(Math.pow(level, 3) * ((1911 - 10 * level) / 3) / 500);
      return Math.floor(Math.pow(level, 3) * (160 - level) / 100);
    case GrowthRate.Fluctuating:
      if (level <= 15) return Math.floor(Math.pow(level, 3) * ((24 + (level + 1) / 3)) / 50);
      if (level <= 36) return Math.floor(Math.pow(level, 3) * (14 + level) / 50);
      return Math.floor(Math.pow(level, 3) * (32 + level / 2) / 50);
    default:
      return Math.floor(Math.pow(level, 3));
  }
}

/** Get type effectiveness multiplier */
export function getTypeEffectiveness(
  attackType: MonsterType,
  defenderTypes: [MonsterType, MonsterType | null],
): number {
  // Simple type chart
  const typeChart: Partial<Record<MonsterType, Partial<Record<MonsterType, number>>>> = {
    [MonsterType.Fire]: {
      [MonsterType.Grass]: 2,
      [MonsterType.Water]: 0.5,
      [MonsterType.Fire]: 0.5,
      [MonsterType.Bug]: 2,
      [MonsterType.Steel]: 2,
      [MonsterType.Ice]: 2,
    },
    [MonsterType.Water]: {
      [MonsterType.Fire]: 2,
      [MonsterType.Water]: 0.5,
      [MonsterType.Grass]: 0.5,
      [MonsterType.Ground]: 2,
      [MonsterType.Rock]: 2,
    },
    [MonsterType.Grass]: {
      [MonsterType.Fire]: 0.5,
      [MonsterType.Water]: 2,
      [MonsterType.Grass]: 0.5,
      [MonsterType.Ground]: 2,
      [MonsterType.Rock]: 2,
    },
    [MonsterType.Electric]: {
      [MonsterType.Water]: 2,
      [MonsterType.Electric]: 0.5,
      [MonsterType.Ground]: 0,
      [MonsterType.Flying]: 2,
    },
  };

  let multiplier = 1;
  const attackChart = typeChart[attackType];
  if (attackChart) {
    for (const defType of defenderTypes) {
      if (defType !== null && attackChart[defType] !== undefined) {
        multiplier *= attackChart[defType];
      }
    }
  }

  return multiplier;
}