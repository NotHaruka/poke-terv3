export type ItemCategory =
  | 'pokeball'
  | 'medicine'
  | 'berry'
  | 'held'
  | 'key'
  | 'tm'
  | 'battle';

export interface Item {
  readonly id: number | string;
  readonly name: string;
  readonly description: string;
  readonly category: ItemCategory;
  readonly price: number;
  readonly catchMultiplier?: number;
  readonly healAmount?: number;
  readonly healPercentage?: number;
  readonly revivePercentage?: number;
  readonly statusCure?: readonly string[];
  readonly heldEffect?: string;
  readonly tmMoveId?: number;
}
