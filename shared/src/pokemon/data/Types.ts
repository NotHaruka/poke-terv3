export enum PokemonType {
  Normal = 'normal',
  Fire = 'fire',
  Water = 'water',
  Grass = 'grass',
  Electric = 'electric',
  Ice = 'ice',
  Fighting = 'fighting',
  Poison = 'poison',
  Ground = 'ground',
  Flying = 'flying',
  Psychic = 'psychic',
  Bug = 'bug',
  Rock = 'rock',
  Ghost = 'ghost',
  Dragon = 'dragon',
  Dark = 'dark',
  Steel = 'steel',
  Fairy = 'fairy',
}

export interface TypeInfo {
  readonly id: PokemonType;
  readonly name: string;
  readonly color: string;
}

export const Types: Record<PokemonType, TypeInfo> = {
  [PokemonType.Normal]: { id: PokemonType.Normal, name: 'Normal', color: '#A8A878' },
  [PokemonType.Fire]: { id: PokemonType.Fire, name: 'Fire', color: '#F08030' },
  [PokemonType.Water]: { id: PokemonType.Water, name: 'Water', color: '#6890F0' },
  [PokemonType.Grass]: { id: PokemonType.Grass, name: 'Grass', color: '#78C850' },
  [PokemonType.Electric]: { id: PokemonType.Electric, name: 'Electric', color: '#F8D030' },
  [PokemonType.Ice]: { id: PokemonType.Ice, name: 'Ice', color: '#98D8D8' },
  [PokemonType.Fighting]: { id: PokemonType.Fighting, name: 'Fighting', color: '#C03028' },
  [PokemonType.Poison]: { id: PokemonType.Poison, name: 'Poison', color: '#A040A0' },
  [PokemonType.Ground]: { id: PokemonType.Ground, name: 'Ground', color: '#E0C068' },
  [PokemonType.Flying]: { id: PokemonType.Flying, name: 'Flying', color: '#A890F0' },
  [PokemonType.Psychic]: { id: PokemonType.Psychic, name: 'Psychic', color: '#F85888' },
  [PokemonType.Bug]: { id: PokemonType.Bug, name: 'Bug', color: '#A8B820' },
  [PokemonType.Rock]: { id: PokemonType.Rock, name: 'Rock', color: '#B8A038' },
  [PokemonType.Ghost]: { id: PokemonType.Ghost, name: 'Ghost', color: '#705598' },
  [PokemonType.Dragon]: { id: PokemonType.Dragon, name: 'Dragon', color: '#7038F8' },
  [PokemonType.Dark]: { id: PokemonType.Dark, name: 'Dark', color: '#705848' },
  [PokemonType.Steel]: { id: PokemonType.Steel, name: 'Steel', color: '#B8B8D0' },
  [PokemonType.Fairy]: { id: PokemonType.Fairy, name: 'Fairy', color: '#EE99AC' },
};
