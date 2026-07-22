/** Registry for monster species sprite assets, shiny palette mappings, and animation frames */

export interface MonsterSpriteSpec {
  speciesId: number;
  name: string;
  frontSpriteId: string;
  backSpriteId: string;
  iconSpriteId: string;
  baseColor: string;
  shinyColor: string;
  primaryType: string;
  secondaryType?: string;
  idleAnimName: string;
}

export class MonsterRegistry {
  private static species = new Map<number, MonsterSpriteSpec>();

  static initDefaults(): void {
    if (this.species.size > 0) return;

    this.register({
      speciesId: 1,
      name: 'Leaflet',
      frontSpriteId: 'mon_001_front',
      backSpriteId: 'mon_001_back',
      iconSpriteId: 'mon_001_icon',
      baseColor: '#27ae60',
      shinyColor: '#f39c12',
      primaryType: 'Grass',
      idleAnimName: 'flower_sway',
    });

    this.register({
      speciesId: 4,
      name: 'Emberkin',
      frontSpriteId: 'mon_004_front',
      backSpriteId: 'mon_004_back',
      iconSpriteId: 'mon_004_icon',
      baseColor: '#e67e22',
      shinyColor: '#bdc3c7',
      primaryType: 'Fire',
      idleAnimName: 'human_idle',
    });

    this.register({
      speciesId: 7,
      name: 'Aquafit',
      frontSpriteId: 'mon_007_front',
      backSpriteId: 'mon_007_back',
      iconSpriteId: 'mon_007_icon',
      baseColor: '#2980b9',
      shinyColor: '#8e44ad',
      primaryType: 'Water',
      idleAnimName: 'water_flow',
    });
  }

  static get(speciesId: number): MonsterSpriteSpec | undefined {
    if (this.species.size === 0) {
      this.initDefaults();
    }
    return this.species.get(speciesId);
  }

  static register(spec: MonsterSpriteSpec): void {
    this.species.set(spec.speciesId, spec);
  }
}
