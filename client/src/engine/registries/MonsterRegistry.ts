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
      name: 'Flamepup',
      frontSpriteId: 'mon_001_front',
      backSpriteId: 'mon_001_back',
      iconSpriteId: 'mon_001_icon',
      baseColor: '#e67e22',
      shinyColor: '#bdc3c7',
      primaryType: 'Fire',
      idleAnimName: 'human_idle',
    });

    this.register({
      speciesId: 2,
      name: 'Blazehound',
      frontSpriteId: 'mon_002_front',
      backSpriteId: 'mon_002_back',
      iconSpriteId: 'mon_002_icon',
      baseColor: '#d93800',
      shinyColor: '#f39c12',
      primaryType: 'Fire',
      idleAnimName: 'human_idle',
    });

    this.register({
      speciesId: 3,
      name: 'Infernotaur',
      frontSpriteId: 'mon_003_front',
      backSpriteId: 'mon_003_back',
      iconSpriteId: 'mon_003_icon',
      baseColor: '#b30000',
      shinyColor: '#9b59b6',
      primaryType: 'Fire',
      secondaryType: 'Fighting',
      idleAnimName: 'human_idle',
    });

    this.register({
      speciesId: 4,
      name: 'Sproutling',
      frontSpriteId: 'mon_004_front',
      backSpriteId: 'mon_004_back',
      iconSpriteId: 'mon_004_icon',
      baseColor: '#27ae60',
      shinyColor: '#f39c12',
      primaryType: 'Grass',
      idleAnimName: 'flower_sway',
    });

    this.register({
      speciesId: 5,
      name: 'Floramander',
      frontSpriteId: 'mon_005_front',
      backSpriteId: 'mon_005_back',
      iconSpriteId: 'mon_005_icon',
      baseColor: '#40916c',
      shinyColor: '#e74c3c',
      primaryType: 'Grass',
      secondaryType: 'Poison',
      idleAnimName: 'flower_sway',
    });

    this.register({
      speciesId: 6,
      name: 'Verdantsaur',
      frontSpriteId: 'mon_006_front',
      backSpriteId: 'mon_006_back',
      iconSpriteId: 'mon_006_icon',
      baseColor: '#2d6a4f',
      shinyColor: '#8e44ad',
      primaryType: 'Grass',
      secondaryType: 'Poison',
      idleAnimName: 'flower_sway',
    });

    this.register({
      speciesId: 7,
      name: 'Aquafin',
      frontSpriteId: 'mon_007_front',
      backSpriteId: 'mon_007_back',
      iconSpriteId: 'mon_007_icon',
      baseColor: '#2980b9',
      shinyColor: '#8e44ad',
      primaryType: 'Water',
      idleAnimName: 'water_flow',
    });

    this.register({
      speciesId: 8,
      name: 'Dolphirate',
      frontSpriteId: 'mon_008_front',
      backSpriteId: 'mon_008_back',
      iconSpriteId: 'mon_008_icon',
      baseColor: '#0077b6',
      shinyColor: '#27ae60',
      primaryType: 'Water',
      idleAnimName: 'water_flow',
    });

    this.register({
      speciesId: 9,
      name: 'Leviaqua',
      frontSpriteId: 'mon_009_front',
      backSpriteId: 'mon_009_back',
      iconSpriteId: 'mon_009_icon',
      baseColor: '#03045e',
      shinyColor: '#ffea00',
      primaryType: 'Water',
      secondaryType: 'Dragon',
      idleAnimName: 'water_flow',
    });

    this.register({
      speciesId: 10,
      name: 'Chirpix',
      frontSpriteId: 'mon_010_front',
      backSpriteId: 'mon_010_back',
      iconSpriteId: 'mon_010_icon',
      baseColor: '#e67e22',
      shinyColor: '#9b59b6',
      primaryType: 'Normal',
      secondaryType: 'Flying',
      idleAnimName: 'wing_flap',
    });

    this.register({
      speciesId: 11,
      name: 'Stratbeak',
      frontSpriteId: 'mon_011_front',
      backSpriteId: 'mon_011_back',
      iconSpriteId: 'mon_011_icon',
      baseColor: '#f1c40f',
      shinyColor: '#e74c3c',
      primaryType: 'Normal',
      secondaryType: 'Flying',
      idleAnimName: 'wing_flap',
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
