/**
 * Starter Selection Modal UI
 * Allows player to inspect species stats and confirm choosing Flamepup, Sproutling, or Aquafin.
 */

import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT, MonsterInstance, MonsterType, Nature } from 'poke-ter-shared';
import { MONSTER_SPECIES, calculateStats } from '../../monsters/MonsterData.js';
import { Player } from '../../entities/Player.js';

export class StarterSelectModal extends Menu {
  private player: Player;
  private speciesId: number;
  private onConfirmCallback: (starterInstance: MonsterInstance) => void;

  constructor(
    player: Player,
    speciesId: number,
    onConfirmCallback: (starterInstance: MonsterInstance) => void
  ) {
    super();
    this.player = player;
    this.speciesId = speciesId;
    this.onConfirmCallback = onConfirmCallback;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    if (key === 'Enter' || key === 'Space') {
      if (this.audioManager) this.audioManager.playSFX('select');
      const starterInstance = this.createStarterInstance(this.speciesId);
      this.onConfirmCallback(starterInstance);
      this.close();
    } else if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  private createStarterInstance(speciesId: number): MonsterInstance {
    const species = MONSTER_SPECIES.find(s => s.id === speciesId) || MONSTER_SPECIES[0];
    const level = 5;
    const ivs = { hp: 20, attack: 20, defense: 20, spAttack: 20, spDefense: 20, speed: 20 };
    const evs = { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 };
    const stats = calculateStats(species.baseStats, ivs, evs, level);

    let move1 = 1; // Tackle
    let move2 = 2; // Ember (Fire) / Vine Whip (Grass) / Water Gun (Water)
    if (species.types[0] === MonsterType.Grass) move2 = 3;
    if (species.types[0] === MonsterType.Water) move2 = 4;

    return {
      speciesId: species.id,
      nickname: species.name,
      level,
      ivs,
      evs,
      nature: Nature.Hardy,
      currentHp: stats.hp,
      maxHp: stats.hp,
      stats,
      moves: [move1, move2],
      status: 0,
      friendship: 70,
      experience: 0,
      experienceToNext: 125,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const species = MONSTER_SPECIES.find(s => s.id === this.speciesId) || MONSTER_SPECIES[0];
    const w = 240;
    const h = 170;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;

    this.drawWindow(ctx, x, y, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Title Header
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(x + 10, y + 10, w - 20, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STARTER SELECTION POD', x + w / 2, y + 19);

    // Monster Title & Type
    ctx.fillStyle = '#4deeea';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${species.name} (Lv. 5)`, x + 20, y + 42);

    const typeName = species.types[0] === MonsterType.Fire ? 'FIRE' : species.types[0] === MonsterType.Grass ? 'GRASS' : 'WATER';
    const typeColor = species.types[0] === MonsterType.Fire ? '#ff4500' : species.types[0] === MonsterType.Grass ? '#2ecc71' : '#3498db';

    ctx.fillStyle = typeColor;
    ctx.fillRect(x + 170, y + 34, 50, 12);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(typeName, x + 195, y + 40);

    // Description
    ctx.fillStyle = '#dddddd';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    let desc = 'A fierce Fire-type pup with blazing spirit!';
    if (species.types[0] === MonsterType.Grass) desc = 'A gentle Grass-type sprout in tune with nature!';
    if (species.types[0] === MonsterType.Water) desc = 'A playful Water-type creature that glides smoothly!';
    ctx.fillText(desc, x + 20, y + 60);

    // Stats Grid Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x + 20, y + 70, w - 40, 50);
    ctx.strokeStyle = '#4deeea';
    ctx.strokeRect(x + 20, y + 70, w - 40, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.fillText(`Base HP: ${species.baseStats.hp}`, x + 30, y + 84);
    ctx.fillText(`Attack:  ${species.baseStats.attack}`, x + 30, y + 96);
    ctx.fillText(`Defense: ${species.baseStats.defense}`, x + 30, y + 108);

    ctx.fillText(`Sp.Atk:  ${species.baseStats.spAttack}`, x + 130, y + 84);
    ctx.fillText(`Sp.Def:  ${species.baseStats.spDefense}`, x + 130, y + 96);
    ctx.fillText(`Speed:   ${species.baseStats.speed}`, x + 130, y + 108);

    // Confirm Button Prompt
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(x + 20, y + 130, w - 40, 24);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 8.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[ENTER] CHOOSE ${species.name.toUpperCase()}`, x + w / 2, y + 142);

    ctx.restore();
  }
}
