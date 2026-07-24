import { PokemonSpecies, FormDefinition } from './models/PokemonSpecies.js';
import { Move } from './models/Move.js';
import { Ability } from './models/Ability.js';
import { Item } from './models/Item.js';
import { SPECIES_DATABASE } from './data/Species.js';
import { MOVES_DATABASE } from './data/Moves.js';
import { ABILITIES_DATABASE } from './data/Abilities.js';
import { ITEMS_DATABASE } from './data/Items.js';
import { LEARNSETS_DATABASE, LearnsetMove } from './data/Learnsets.js';
import { EVOLUTIONS_DATABASE, EvolutionRequirement } from './data/Evolutions.js';
import { FORMS_DATABASE } from './data/Forms.js';
import { TypeChart } from './data/TypeChart.js';
import { PokemonType } from './data/Types.js';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const prop = (obj as Record<string, unknown>)[key];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop);
    }
  }
  return obj;
}

export class PokemonRegistry {
  private static instance: PokemonRegistry | null = null;

  private readonly speciesMap: Map<number, PokemonSpecies> = new Map();
  private readonly movesMap: Map<number, Move> = new Map();
  private readonly abilitiesMap: Map<string, Ability> = new Map();
  private readonly itemsMap: Map<number | string, Item> = new Map();
  private readonly learnsetsMap: Map<number, readonly LearnsetMove[]> = new Map();
  private readonly evolutionsMap: Map<number, readonly EvolutionRequirement[]> = new Map();
  private readonly formsMap: Map<number, readonly FormDefinition[]> = new Map();

  constructor() {
    this.loadData();
    this.validateData();
  }

  public static getInstance(): PokemonRegistry {
    if (!PokemonRegistry.instance) {
      PokemonRegistry.instance = new PokemonRegistry();
    }
    return PokemonRegistry.instance;
  }

  private loadData(): void {
    for (const [idStr, species] of Object.entries(SPECIES_DATABASE)) {
      this.speciesMap.set(Number(idStr), deepFreeze(species));
    }
    for (const [idStr, move] of Object.entries(MOVES_DATABASE)) {
      this.movesMap.set(Number(idStr), deepFreeze(move));
    }
    for (const [idKey, ability] of Object.entries(ABILITIES_DATABASE)) {
      this.abilitiesMap.set(idKey.toLowerCase(), deepFreeze(ability));
    }
    for (const [idKey, item] of Object.entries(ITEMS_DATABASE)) {
      const frozenItem = deepFreeze(item);
      this.itemsMap.set(idKey, frozenItem);
      this.itemsMap.set(item.id, frozenItem);
      if (typeof item.id === 'number') {
        this.itemsMap.set(item.id.toString(), frozenItem);
      } else {
        const num = Number(item.id);
        if (!isNaN(num)) this.itemsMap.set(num, frozenItem);
      }
      const numKey = Number(idKey);
      if (!isNaN(numKey)) this.itemsMap.set(numKey, frozenItem);
    }
    for (const [idStr, learnset] of Object.entries(LEARNSETS_DATABASE)) {
      this.learnsetsMap.set(Number(idStr), deepFreeze(learnset));
    }
    for (const [idStr, evos] of Object.entries(EVOLUTIONS_DATABASE)) {
      this.evolutionsMap.set(Number(idStr), deepFreeze(evos));
    }
    for (const [idStr, forms] of Object.entries(FORMS_DATABASE)) {
      this.formsMap.set(Number(idStr), deepFreeze(forms));
    }
    deepFreeze(TypeChart);
  }

  public validateData(): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const allTypes = Object.values(PokemonType);

    // 1. Validate Species
    for (const species of this.speciesMap.values()) {
      if (species.id <= 0 || !Number.isInteger(species.id)) {
        errors.push(`Species "${species.name}" has invalid ID #${species.id}`);
      }
      // Base stats check
      const { hp, attack, defense, specialAttack, specialDefense, speed } = species.baseStats;
      if (hp <= 0 || attack <= 0 || defense <= 0 || specialAttack <= 0 || specialDefense <= 0 || speed <= 0) {
        errors.push(`Species "${species.name}" (#${species.id}) has invalid non-positive base stats`);
      }
      // Types check
      for (const type of species.types) {
        if (!allTypes.includes(type)) {
          errors.push(`Species "${species.name}" (#${species.id}) has invalid type "${type}"`);
        }
      }
      // Abilities check
      if (!this.abilitiesMap.has(species.abilities.primary.toLowerCase())) {
        errors.push(`Species "${species.name}" (#${species.id}) references missing primary ability "${species.abilities.primary}"`);
      }
      if (species.abilities.secondary && !this.abilitiesMap.has(species.abilities.secondary.toLowerCase())) {
        errors.push(`Species "${species.name}" (#${species.id}) references missing secondary ability "${species.abilities.secondary}"`);
      }
      if (species.abilities.hidden && !this.abilitiesMap.has(species.abilities.hidden.toLowerCase())) {
        errors.push(`Species "${species.name}" (#${species.id}) references missing hidden ability "${species.abilities.hidden}"`);
      }
      // Growth rate check
      const validGrowthRates = ['fast', 'medium_fast', 'medium_slow', 'slow', 'erratic', 'fluctuating'];
      if (!validGrowthRates.includes(species.growthRate)) {
        errors.push(`Species "${species.name}" (#${species.id}) has invalid growth rate "${species.growthRate}"`);
      }
      // Learnset check
      if (!this.learnsetsMap.has(species.id) || this.learnsetsMap.get(species.id)!.length === 0) {
        warnings.push(`Species "${species.name}" (#${species.id}) has no learnset entries defined`);
      }
    }

    // 2. Validate Moves
    for (const move of this.movesMap.values()) {
      if (move.id <= 0 || !Number.isInteger(move.id)) {
        errors.push(`Move "${move.name}" has invalid ID #${move.id}`);
      }
      if (!allTypes.includes(move.type)) {
        errors.push(`Move "${move.name}" (#${move.id}) references invalid type "${move.type}"`);
      }
      if (!['physical', 'special', 'status'].includes(move.category)) {
        errors.push(`Move "${move.name}" (#${move.id}) has invalid category "${move.category}"`);
      }
      if (move.pp <= 0 || move.maxPp < move.pp) {
        errors.push(`Move "${move.name}" (#${move.id}) has invalid PP values (${move.pp}/${move.maxPp})`);
      }
      if (move.accuracy < 0 || move.accuracy > 100) {
        errors.push(`Move "${move.name}" (#${move.id}) has invalid accuracy value ${move.accuracy}`);
      }
      if (move.priority < -7 || move.priority > 7) {
        errors.push(`Move "${move.name}" (#${move.id}) priority ${move.priority} out of allowed range [-7, 7]`);
      }
    }

    // 3. Validate Abilities
    for (const ability of this.abilitiesMap.values()) {
      if (!ability.id || typeof ability.id !== 'string') {
        errors.push(`Ability "${ability.name}" has invalid ID string "${ability.id}"`);
      }
    }

    // 4. Validate Items
    for (const item of this.itemsMap.values()) {
      if (!item.id) {
        errors.push(`Item "${item.name}" has missing ID`);
      }
    }

    // 5. Validate Forms
    for (const [speciesId, forms] of this.formsMap.entries()) {
      if (!this.speciesMap.has(speciesId)) {
        errors.push(`Form references non-existent parent species #${speciesId}`);
      }
      for (const form of forms) {
        if (!this.abilitiesMap.has(form.abilities.primary.toLowerCase())) {
          errors.push(`Form "${form.formName}" for species #${speciesId} references missing primary ability "${form.abilities.primary}"`);
        }
        if (form.abilities.secondary && !this.abilitiesMap.has(form.abilities.secondary.toLowerCase())) {
          errors.push(`Form "${form.formName}" for species #${speciesId} references missing secondary ability "${form.abilities.secondary}"`);
        }
        if (form.abilities.hidden && !this.abilitiesMap.has(form.abilities.hidden.toLowerCase())) {
          errors.push(`Form "${form.formName}" for species #${speciesId} references missing hidden ability "${form.abilities.hidden}"`);
        }
      }
    }

    // 6. Validate Learnsets
    for (const [speciesId, learnset] of this.learnsetsMap.entries()) {
      if (!this.speciesMap.has(speciesId)) {
        errors.push(`Learnset defined for non-existent species #${speciesId}`);
      }
      const seenMovesAtLevel = new Set<string>();
      for (const entry of learnset) {
        if (!this.movesMap.has(entry.moveId)) {
          errors.push(`Learnset for species #${speciesId} references missing move #${entry.moveId}`);
        }
        if (entry.level < 1 || entry.level > 100) {
          errors.push(`Learnset for species #${speciesId} has invalid level requirement ${entry.level}`);
        }
        const key = `${entry.level}:${entry.moveId}`;
        if (seenMovesAtLevel.has(key)) {
          errors.push(`Learnset for species #${speciesId} has duplicate move #${entry.moveId} at level ${entry.level}`);
        }
        seenMovesAtLevel.add(key);
      }
    }

    // 7. Validate Evolution Trees & Circularity
    for (const [speciesId, evos] of this.evolutionsMap.entries()) {
      if (!this.speciesMap.has(speciesId)) {
        errors.push(`Evolution requirement defined for non-existent source species #${speciesId}`);
      }
      for (const evo of evos) {
        if (!this.speciesMap.has(evo.targetSpeciesId)) {
          errors.push(`Evolution requirement for species #${speciesId} references missing target species #${evo.targetSpeciesId}`);
        }
        if (evo.method === 'item' && evo.itemId) {
          if (!this.itemsMap.has(evo.itemId) && !this.itemsMap.has(String(evo.itemId))) {
            errors.push(`Evolution requirement for species #${speciesId} references missing evolution item #${evo.itemId}`);
          }
        }
      }
    }

    // Detect Circular Evolution
    const detectCycle = (startId: number, currentId: number, visited: Set<number>): boolean => {
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const evos = this.evolutionsMap.get(currentId) ?? [];
      for (const evo of evos) {
        if (detectCycle(startId, evo.targetSpeciesId, new Set(visited))) {
          return true;
        }
      }
      return false;
    };

    for (const speciesId of this.speciesMap.keys()) {
      if (detectCycle(speciesId, speciesId, new Set())) {
        errors.push(`Circular evolution chain detected starting at species #${speciesId}`);
      }
    }

    // 8. Validate Type Chart
    for (const atkType of allTypes) {
      if (!TypeChart[atkType]) {
        errors.push(`TypeChart missing row for attack type "${atkType}"`);
        continue;
      }
      for (const defType of allTypes) {
        const multiplier = TypeChart[atkType][defType];
        if (multiplier === undefined) {
          errors.push(`TypeChart missing matchup for ${atkType} -> ${defType}`);
        } else if (![0, 0.5, 1, 2].includes(multiplier)) {
          errors.push(`TypeChart multiplier ${multiplier} for ${atkType} -> ${defType} is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`[PokemonRegistry] Validation failed with ${errors.length} errors:\n - ${errors.join('\n - ')}`);
    }

    return { errors, warnings };
  }

  // --- Species Accessors ---
  public getSpecies(id: number | string): PokemonSpecies | undefined {
    const numericId = typeof id === 'number' ? id : parseInt(id, 10);
    return this.speciesMap.get(numericId);
  }

  public getAllSpecies(): readonly PokemonSpecies[] {
    return Array.from(this.speciesMap.values());
  }

  // --- Move Accessors ---
  public getMove(id: number): Move | undefined {
    return this.movesMap.get(id);
  }

  public getAllMoves(): readonly Move[] {
    return Array.from(this.movesMap.values());
  }

  // --- Ability Accessors ---
  public getAbility(id: string): Ability | undefined {
    return this.abilitiesMap.get(id.toLowerCase());
  }

  public getAllAbilities(): readonly Ability[] {
    return Array.from(this.abilitiesMap.values());
  }

  // --- Item Accessors ---
  public getItem(id: number | string): Item | undefined {
    return this.itemsMap.get(id);
  }

  public getAllItems(): readonly Item[] {
    return Array.from(new Set(this.itemsMap.values()));
  }

  // --- Learnset Accessors ---
  public getLearnset(speciesId: number): readonly LearnsetMove[] {
    return this.learnsetsMap.get(speciesId) ?? [];
  }

  // --- Evolution Accessors ---
  public getEvolution(speciesId: number): readonly EvolutionRequirement[] {
    return this.evolutionsMap.get(speciesId) ?? [];
  }

  // --- Form Accessors ---
  public getForm(speciesId: number, formId: string): FormDefinition | undefined {
    const forms = this.formsMap.get(speciesId);
    return forms?.find(f => f.formId === formId);
  }

  // --- Type Chart Calculators ---
  public getTypeEffectiveness(attackType: PokemonType, defendType: PokemonType): number {
    return TypeChart[attackType]?.[defendType] ?? 1.0;
  }

  public getDualTypeEffectiveness(
    attackType: PokemonType,
    defendTypes: readonly [PokemonType, PokemonType | null]
  ): number {
    let mult = this.getTypeEffectiveness(attackType, defendTypes[0]);
    if (defendTypes[1] && defendTypes[1] !== defendTypes[0]) {
      mult *= this.getTypeEffectiveness(attackType, defendTypes[1]);
    }
    return mult;
  }
}

export const pokemonRegistry = PokemonRegistry.getInstance();
