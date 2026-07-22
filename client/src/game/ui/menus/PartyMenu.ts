/**
 * Monster Party Menu UI
 * Fully populates party slots with stats, HP, level progress, moves, and follower selection.
 */

import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT, MonsterInstance, MonsterType } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';
import { MONSTER_SPECIES } from '../../monsters/MonsterData.js';

export class PartyMenu extends Menu {
  private player: Player;
  private selectedSlot: number = 0;
  private swapSourceSlot: number | null = null;

  constructor(player: Player) {
    super();
    this.player = player;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    const party = this.player.party || [];
    const partyLength = Math.max(1, party.length);

    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedSlot--;
      if (this.selectedSlot < 0) this.selectedSlot = partyLength - 1;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedSlot++;
      if (this.selectedSlot >= partyLength) this.selectedSlot = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      if (party.length > 0) {
        if (this.swapSourceSlot === null) {
          // Select slot to swap
          this.swapSourceSlot = this.selectedSlot;
          if (this.audioManager) this.audioManager.playSFX('select');
        } else {
          // Swap slots
          if (this.swapSourceSlot !== this.selectedSlot && this.selectedSlot < party.length) {
            const temp = party[this.swapSourceSlot];
            party[this.swapSourceSlot] = party[this.selectedSlot];
            party[this.selectedSlot] = temp;
            this.player.activeFollowerIndex = 0; // Slot 0 is always the active overworld follower!
            if (this.audioManager) this.audioManager.playSFX('bump');
          }
          this.swapSourceSlot = null;
        }
      }
    } else if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const margin = 16;
    const w = GAME_WIDTH - margin * 2;
    const h = GAME_HEIGHT - margin * 2;
    this.drawWindow(ctx, margin, margin, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;

    // Header
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(margin + 10, margin + 8, w - 20, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MONSTER PARTY (Press ENTER to swap follower slot)', margin + 16, margin + 16);

    const party = this.player.party || [];

    for (let i = 0; i < 6; i++) {
      const slotY = margin + 30 + i * 26;
      const monster: MonsterInstance | undefined = party[i];
      const isSelected = i === this.selectedSlot;
      const isSwapSource = i === this.swapSourceSlot;

      if (isSelected || isSwapSource) {
        ctx.fillStyle = isSwapSource ? 'rgba(255, 235, 59, 0.3)' : 'rgba(77, 238, 234, 0.25)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = isSwapSource ? '#ffeb3b' : '#4deeea';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      } else if (monster) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      }

      if (monster) {
        const species = MONSTER_SPECIES.find(s => s.id === monster.speciesId);
        let name = monster.nickname || species?.name || 'Monster';
        if (name.length > 10) {
          name = name.substring(0, 9) + '…';
        }

        // Left Column: Monster Name & Level
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${name} L${monster.level}`, margin + 12, slotY + 2);

        // Follower Badge or EXP Label
        if (i === 0) {
          ctx.fillStyle = '#ff007f';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('★ FOLLOWER', margin + 12, slotY + 12);
        } else {
          ctx.fillStyle = '#8ab4f8';
          ctx.font = '7px monospace';
          ctx.fillText('EXP', margin + 12, slotY + 12);
        }

        // Middle Column: HP Bar
        const barX = margin + 120;
        const barY = slotY + 3;
        const barW = 65;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barW, 6);

        const hpRatio = Math.max(0, Math.min(1, monster.currentHp / monster.maxHp));
        ctx.fillStyle = hpRatio > 0.5 ? '#4deeea' : hpRatio > 0.2 ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(barX, barY, barW * hpRatio, 6);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, 6);

        // EXP Bar (placed directly below HP bar)
        const expBarY = slotY + 13;
        const expRatio = Math.max(0, Math.min(1, monster.experience / (monster.experienceToNext || 100)));
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(barX, expBarY, barW, 3);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(barX, expBarY, barW * expRatio, 3);

        // Right Column: HP Numbers
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${monster.currentHp}/${monster.maxHp}`, margin + w - 12, slotY + 2);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fillText('--- Empty Party Slot ---', margin + 12, slotY + 6);
      }
    }

    ctx.restore();
  }
}
