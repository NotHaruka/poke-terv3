import { Nature, Stat } from './types.js';

interface NatureEffect {
  increased: Stat | null;
  decreased: Stat | null;
}

// Indexed directly by the Nature enum value — order matches the existing
// enum in types.ts exactly (Hardy=0 ... Quirky=24).
const NATURE_EFFECTS: NatureEffect[] = [
  { increased: null, decreased: null },              // 0  Hardy
  { increased: Stat.Attack, decreased: Stat.Defense },     // 1  Lonely
  { increased: Stat.Attack, decreased: Stat.Speed },       // 2  Brave
  { increased: Stat.Attack, decreased: Stat.SpAttack },    // 3  Adamant
  { increased: Stat.Attack, decreased: Stat.SpDefense },   // 4  Naughty
  { increased: Stat.Defense, decreased: Stat.Attack },     // 5  Bold
  { increased: null, decreased: null },              // 6  Docile
  { increased: Stat.Defense, decreased: Stat.Speed },      // 7  Relaxed
  { increased: Stat.Defense, decreased: Stat.SpAttack },   // 8  Impish
  { increased: Stat.Defense, decreased: Stat.SpDefense },  // 9  Lax
  { increased: Stat.Speed, decreased: Stat.Attack },       // 10 Timid
  { increased: Stat.Speed, decreased: Stat.Defense },      // 11 Hasty
  { increased: null, decreased: null },              // 12 Serious
  { increased: Stat.Speed, decreased: Stat.SpAttack },     // 13 Jolly
  { increased: Stat.Speed, decreased: Stat.SpDefense },    // 14 Naive
  { increased: Stat.SpAttack, decreased: Stat.Attack },    // 15 Modest
  { increased: Stat.SpAttack, decreased: Stat.Defense },   // 16 Mild
  { increased: Stat.SpAttack, decreased: Stat.Speed },     // 17 Quiet
  { increased: null, decreased: null },              // 18 Bashful
  { increased: Stat.SpAttack, decreased: Stat.SpDefense }, // 19 Rash
  { increased: Stat.SpDefense, decreased: Stat.Attack },   // 20 Calm
  { increased: Stat.SpDefense, decreased: Stat.Defense },  // 21 Gentle
  { increased: Stat.SpDefense, decreased: Stat.Speed },    // 22 Sassy
  { increased: Stat.SpDefense, decreased: Stat.SpAttack }, // 23 Careful
  { increased: null, decreased: null },              // 24 Quirky
];

export function rollRandomNature(): Nature {
  return Math.floor(Math.random() * 25) as Nature;
}

export function getNatureMultiplier(nature: Nature, stat: Stat): number {
  const effect = NATURE_EFFECTS[nature];
  if (stat === effect.increased) return 1.1;
  if (stat === effect.decreased) return 0.9;
  return 1.0;
}

export function getNatureName(nature: Nature): string {
  return Nature[nature];
}