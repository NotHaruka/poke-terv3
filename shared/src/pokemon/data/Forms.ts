import { FormDefinition } from '../models/PokemonSpecies.js';
import { PokemonType } from './Types.js';

export const FORMS_DATABASE: Record<number, readonly FormDefinition[]> = {
  3: [
    {
      formId: 'mega',
      formName: 'Mega Venusaur',
      types: [PokemonType.Grass, PokemonType.Poison],
      baseStats: { hp: 80, attack: 100, defense: 123, specialAttack: 122, specialDefense: 120, speed: 80 },
      abilities: { primary: 'thick_fat' },
      height: 2.4,
      weight: 155.5,
      isMega: true,
      requiredItem: 'Venusaurite',
    },
  ],
  6: [
    {
      formId: 'mega_x',
      formName: 'Mega Charizard X',
      types: [PokemonType.Fire, PokemonType.Dragon],
      baseStats: { hp: 78, attack: 130, defense: 111, specialAttack: 130, specialDefense: 85, speed: 100 },
      abilities: { primary: 'tough_claws' },
      height: 1.7,
      weight: 110.5,
      isMega: true,
      requiredItem: 'Charizardite X',
    },
    {
      formId: 'mega_y',
      formName: 'Mega Charizard Y',
      types: [PokemonType.Fire, PokemonType.Flying],
      baseStats: { hp: 78, attack: 104, defense: 78, specialAttack: 159, specialDefense: 115, speed: 100 },
      abilities: { primary: 'drought' },
      height: 1.7,
      weight: 100.5,
      isMega: true,
      requiredItem: 'Charizardite Y',
    },
  ],
  9: [
    {
      formId: 'mega',
      formName: 'Mega Blastoise',
      types: [PokemonType.Water],
      baseStats: { hp: 79, attack: 103, defense: 120, specialAttack: 135, specialDefense: 115, speed: 78 },
      abilities: { primary: 'mega_launcher' },
      height: 1.6,
      weight: 101.1,
      isMega: true,
      requiredItem: 'Blastoisinite',
    },
  ],
};

export const Forms = FORMS_DATABASE;
