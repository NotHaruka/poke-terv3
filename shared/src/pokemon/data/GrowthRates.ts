import { GrowthRate } from '../models/PokemonSpecies.js';

export function getExperienceForLevel(level: number, growthRate: GrowthRate): number {
  if (level <= 1) return 0;
  const n = level;

  switch (growthRate) {
    case 'fast':
      return Math.floor((4 * Math.pow(n, 3)) / 5);
    case 'medium_fast':
      return Math.floor(Math.pow(n, 3));
    case 'medium_slow':
      return Math.floor(6 / 5 * Math.pow(n, 3) - 15 * Math.pow(n, 2) + 100 * n - 140);
    case 'slow':
      return Math.floor((5 * Math.pow(n, 3)) / 4);
    case 'erratic':
      if (n <= 50) return Math.floor((Math.pow(n, 3) * (100 - n)) / 50);
      if (n <= 68) return Math.floor((Math.pow(n, 3) * (150 - n)) / 100);
      if (n <= 98) return Math.floor((Math.pow(n, 3) * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((Math.pow(n, 3) * (160 - n)) / 100);
    case 'fluctuating':
      if (n <= 15) return Math.floor((Math.pow(n, 3) * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n <= 36) return Math.floor((Math.pow(n, 3) * (n + 14)) / 50);
      return Math.floor((Math.pow(n, 3) * (Math.floor(n / 2) + 32)) / 50);
    default:
      return Math.floor(Math.pow(n, 3));
  }
}

export const GrowthRates = {
  getExperienceForLevel,
};
