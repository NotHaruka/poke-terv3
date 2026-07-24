export type TrainerClass =
  | 'youngster'
  | 'lass'
  | 'bug_catcher'
  | 'hiker'
  | 'gym_leader'
  | 'rival'
  | 'champion'
  | 'player';

export interface TrainerPokemonSpec {
  readonly speciesId: number;
  readonly level: number;
  readonly moves?: readonly number[];
  readonly item?: string | number;
  readonly ability?: string;
  readonly nickname?: string;
}

export interface Trainer {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly trainerClass: TrainerClass;
  readonly sprite: string;
  readonly party: readonly TrainerPokemonSpec[];
  readonly rewardMoney: number;
  readonly winDialogue?: string;
  readonly loseDialogue?: string;
}
