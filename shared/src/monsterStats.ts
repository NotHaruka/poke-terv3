import {
  MonsterStats, Stat, Nature, GrowthRate, MonsterSpecies, MonsterInstance, StatusEffect,
} from './types.js';
import { rollRandomNature, getNatureMultiplier } from './natures.js';

const MAX_IV = 31;
const MAX_EV_PER_STAT = 252;
const MAX_EV_TOTAL = 510;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===== IVs =====
// Rolled once per individual on spawn — this is what makes two of the same
// species genuinely different, so re-catching one you already have is
// still worth doing if this roll is better.
export function rollIVs(): MonsterStats {
  return {
    hp: randInt(0, MAX_IV),
    attack: randInt(0, MAX_IV),
    defense: randInt(0, MAX_IV),
    spAttack: randInt(0, MAX_IV),
    spDefense: randInt(0, MAX_IV),
    speed: randInt(0, MAX_IV),
  };
}

export function emptyEVs(): MonsterStats {
  return { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
}

const EV_KEY_BY_STAT: (keyof MonsterStats)[] = ['hp', 'attack', 'defense', 'spAttack', 'spDefense', 'speed'];

/** Adds EVs earned from defeating a monster (species.evYield), respecting caps. */
export function addEVs(current: MonsterStats, gained: MonsterStats): MonsterStats {
  const next = { ...current };
  let total = Object.values(next).reduce((a, b) => a + b, 0);

  for (const key of EV_KEY_BY_STAT) {
    const amount = gained[key] ?? 0;
    if (amount <= 0) continue;
    const roomInStat = MAX_EV_PER_STAT - next[key];
    const roomInTotal = MAX_EV_TOTAL - total;
    const applied = Math.max(0, Math.min(amount, roomInStat, roomInTotal));
    next[key] += applied;
    total += applied;
  }
  return next;
}

// ===== Stat calculation =====

export function calculateHP(baseHP: number, iv: number, ev: number, level: number): number {
  return Math.floor(((2 * baseHP + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calculateStat(
  baseStat: number,
  iv: number,
  ev: number,
  level: number,
  natureMultiplier: number
): number {
  const raw = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(raw * natureMultiplier);
}

export function calculateFullStatBlock(
  base: MonsterStats,
  ivs: MonsterStats,
  evs: MonsterStats,
  level: number,
  nature: Nature
): MonsterStats {
  return {
    hp: calculateHP(base.hp, ivs.hp, evs.hp, level),
    attack: calculateStat(base.attack, ivs.attack, evs.attack, level, getNatureMultiplier(nature, Stat.Attack)),
    defense: calculateStat(base.defense, ivs.defense, evs.defense, level, getNatureMultiplier(nature, Stat.Defense)),
    spAttack: calculateStat(base.spAttack, ivs.spAttack, evs.spAttack, level, getNatureMultiplier(nature, Stat.SpAttack)),
    spDefense: calculateStat(base.spDefense, ivs.spDefense, evs.spDefense, level, getNatureMultiplier(nature, Stat.SpDefense)),
    speed: calculateStat(base.speed, ivs.speed, evs.speed, level, getNatureMultiplier(nature, Stat.Speed)),
  };
}

// ===== Experience curves (all six growth rates from GrowthRate enum) =====

export function expForLevel(curve: GrowthRate, level: number): number {
  const n = level;
  switch (curve) {
    case GrowthRate.Fast:
      return Math.floor((4 * n ** 3) / 5);
    case GrowthRate.MediumFast:
      return n ** 3;
    case GrowthRate.MediumSlow:
      return Math.floor(1.2 * n ** 3 - 15 * n ** 2 + 100 * n - 140);
    case GrowthRate.Slow:
      return Math.floor((5 * n ** 3) / 4);
    case GrowthRate.Erratic:
      if (n <= 50) return Math.floor((n ** 3 * (100 - n)) / 50);
      if (n <= 68) return Math.floor((n ** 3 * (150 - n)) / 100);
      if (n <= 98) return Math.floor((n ** 3 * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((n ** 3 * (160 - n)) / 100);
    case GrowthRate.Fluctuating:
      if (n <= 15) return Math.floor(n ** 3 * ((Math.floor((n + 1) / 3) + 24) / 50));
      if (n <= 36) return Math.floor(n ** 3 * ((n + 14) / 50));
      return Math.floor(n ** 3 * ((Math.floor(n / 2) + 32) / 50));
  }
}

export function expToNextLevel(curve: GrowthRate, currentLevel: number): number {
  return expForLevel(curve, currentLevel + 1) - expForLevel(curve, currentLevel);
}

// ===== Spawning a wild monster instance =====

export function spawnWildMonster(species: MonsterSpecies, level: number): MonsterInstance {
  const ivs = rollIVs();
  const evs = emptyEVs();
  const nature = rollRandomNature();
  const stats = calculateFullStatBlock(species.baseStats, ivs, evs, level, nature);

  return {
    speciesId: species.id,
    level,
    ivs,
    evs,
    nature,
    currentHp: stats.hp,
    maxHp: stats.hp,
    stats,
    moves: [], // TODO: populate from a per-species learnset once moves are wired up
    status: StatusEffect.None,
    friendship: 70, // standard base friendship starting value
    experience: expForLevel(species.growthRate, level),
    experienceToNext: expToNextLevel(species.growthRate, level),
  };
}

// ===== Chase speed derived from actual base Speed stat =====
// No fixed per-type table: two monsters that share a type can have very
// different chase behavior if their base Speed differs, mirroring how
// real Speed stats work as a design signal players learn to read.

const CHASE_MIN_SPEED_STAT = 5;
const CHASE_MAX_SPEED_STAT = 140;
const CHASE_MIN_MULT = 0.5;
const CHASE_MAX_MULT = 1.5;

export function getChaseSpeedMultiplier(baseSpeedStat: number): number {
  const clamped = Math.max(CHASE_MIN_SPEED_STAT, Math.min(CHASE_MAX_SPEED_STAT, baseSpeedStat));
  const normalized = (clamped - CHASE_MIN_SPEED_STAT) / (CHASE_MAX_SPEED_STAT - CHASE_MIN_SPEED_STAT);
  return CHASE_MIN_MULT + normalized * (CHASE_MAX_MULT - CHASE_MIN_MULT);
}