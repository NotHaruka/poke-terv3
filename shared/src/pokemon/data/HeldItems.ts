export interface HeldItemEffectSpec {
  readonly itemId: number | string;
  readonly effectType: 'heal_turn' | 'stat_boost' | 'endure_ko' | 'life_orb' | 'choice_lock' | 'status_cure';
  readonly value?: number;
}

export const HELD_ITEMS_DATABASE: Record<string, HeldItemEffectSpec> = {
  leftovers: { itemId: 40, effectType: 'heal_turn', value: 0.0625 },
  choice_band: { itemId: 41, effectType: 'choice_lock', value: 1.5 },
  focus_sash: { itemId: 42, effectType: 'endure_ko' },
  life_orb: { itemId: 43, effectType: 'life_orb', value: 1.3 },
  oran_berry: { itemId: 30, effectType: 'heal_turn', value: 10 },
  sitrus_berry: { itemId: 31, effectType: 'heal_turn', value: 0.25 },
  lum_berry: { itemId: 32, effectType: 'status_cure' },
};

export const HeldItems = HELD_ITEMS_DATABASE;
