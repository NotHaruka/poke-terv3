export interface LearnsetMove {
  readonly level: number;
  readonly moveId: number;
}

export const LEARNSETS_DATABASE: Record<number, readonly LearnsetMove[]> = {
  1: [ // Bulbasaur
    { level: 1, moveId: 1 },  // Tackle
    { level: 1, moveId: 23 }, // Growl
    { level: 3, moveId: 3 },  // Vine Whip
    { level: 9, moveId: 26 }, // Toxic
    { level: 13, moveId: 7 }, // Razor Leaf
  ],
  2: [ // Ivysaur
    { level: 1, moveId: 1 },
    { level: 1, moveId: 23 },
    { level: 1, moveId: 3 },
    { level: 9, moveId: 26 },
    { level: 13, moveId: 7 },
    { level: 20, moveId: 17 }, // Sludge Bomb
  ],
  3: [ // Venusaur
    { level: 1, moveId: 1 },
    { level: 1, moveId: 3 },
    { level: 13, moveId: 7 },
    { level: 20, moveId: 17 },
    { level: 32, moveId: 30 }, // Hyper Beam
  ],
  4: [ // Charmander
    { level: 1, moveId: 2 },  // Scratch
    { level: 1, moveId: 23 }, // Growl
    { level: 4, moveId: 4 },  // Ember
    { level: 12, moveId: 22 }, // Quick Attack
    { level: 19, moveId: 8 }, // Flamethrower
  ],
  5: [ // Charmeleon
    { level: 1, moveId: 2 },
    { level: 1, moveId: 4 },
    { level: 12, moveId: 22 },
    { level: 19, moveId: 8 },
    { level: 28, moveId: 27 }, // Will-O-Wisp
  ],
  6: [ // Charizard
    { level: 1, moveId: 2 },
    { level: 1, moveId: 4 },
    { level: 19, moveId: 8 },
    { level: 36, moveId: 18 }, // Air Slash
    { level: 45, moveId: 15 }, // Dragon Pulse
  ],
  7: [ // Squirtle
    { level: 1, moveId: 1 },  // Tackle
    { level: 1, moveId: 24 }, // Tail Whip
    { level: 3, moveId: 5 },  // Water Gun
    { level: 12, moveId: 22 }, // Quick Attack
    { level: 21, moveId: 9 },  // Hydro Pump
  ],
  8: [ // Wartortle
    { level: 1, moveId: 1 },
    { level: 1, moveId: 5 },
    { level: 12, moveId: 22 },
    { level: 21, moveId: 9 },
    { level: 28, moveId: 11 }, // Ice Beam
  ],
  9: [ // Blastoise
    { level: 1, moveId: 1 },
    { level: 1, moveId: 5 },
    { level: 21, moveId: 9 },
    { level: 28, moveId: 11 },
    { level: 36, moveId: 30 }, // Hyper Beam
  ],
  10: [ // Caterpie
    { level: 1, moveId: 1 },  // Tackle
  ],
  11: [ // Metapod
    { level: 1, moveId: 1 },  // Tackle
  ],
  12: [ // Butterfree
    { level: 1, moveId: 1 },
    { level: 10, moveId: 18 }, // Air Slash
  ],
  13: [ // Pidgey
    { level: 1, moveId: 1 },   // Tackle
    { level: 5, moveId: 22 },  // Quick Attack
    { level: 13, moveId: 18 }, // Air Slash
  ],
  14: [ // Pidgeotto
    { level: 1, moveId: 1 },
    { level: 5, moveId: 22 },
    { level: 13, moveId: 18 },
  ],
  15: [ // Pidgeot
    { level: 1, moveId: 1 },
    { level: 13, moveId: 18 },
    { level: 36, moveId: 30 }, // Hyper Beam
  ],
  25: [ // Pikachu
    { level: 1, moveId: 1 },
    { level: 1, moveId: 24 },
    { level: 4, moveId: 6 },   // Thunder Shock
    { level: 8, moveId: 22 },  // Quick Attack
    { level: 12, moveId: 25 }, // Thunder Wave
    { level: 18, moveId: 10 }, // Thunderbolt
  ],
  26: [ // Raichu
    { level: 1, moveId: 6 },
    { level: 1, moveId: 10 },
    { level: 1, moveId: 22 },
  ],
};

export const Learnsets = LEARNSETS_DATABASE;
