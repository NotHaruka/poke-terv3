export interface EvolutionRequirement {
  readonly targetSpeciesId: number;
  readonly method: 'level' | 'item' | 'trade' | 'friendship';
  readonly level?: number;
  readonly itemId?: number | string;
  readonly requiredItemName?: string;
  readonly minFriendship?: number;
}

export const EVOLUTIONS_DATABASE: Record<number, readonly EvolutionRequirement[]> = {
  1: [{ targetSpeciesId: 2, method: 'level', level: 16 }],
  2: [{ targetSpeciesId: 3, method: 'level', level: 32 }],
  3: [],
  4: [{ targetSpeciesId: 5, method: 'level', level: 16 }],
  5: [{ targetSpeciesId: 6, method: 'level', level: 36 }],
  6: [],
  7: [{ targetSpeciesId: 8, method: 'level', level: 16 }],
  8: [{ targetSpeciesId: 9, method: 'level', level: 36 }],
  9: [],
  10: [{ targetSpeciesId: 11, method: 'level', level: 7 }],
  11: [{ targetSpeciesId: 12, method: 'level', level: 10 }],
  12: [],
  13: [{ targetSpeciesId: 14, method: 'level', level: 18 }],
  14: [{ targetSpeciesId: 15, method: 'level', level: 36 }],
  15: [],
  25: [{ targetSpeciesId: 26, method: 'item', itemId: 52, requiredItemName: 'Thunder Stone' }],
  26: [],
};

export const Evolutions = EVOLUTIONS_DATABASE;
