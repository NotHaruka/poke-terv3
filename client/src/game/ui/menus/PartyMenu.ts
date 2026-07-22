import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';

export class PartyMenu extends Menu {
  private player: Player;
  private selectedSlot: number = 0;
  
  // Placeholder party
  private party: any[] = [];

  constructor(player: Player) {
    super();
    this.player = player;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedSlot--;
      if (this.selectedSlot < 0) this.selectedSlot = Math.max(0, this.party.length - 1);
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedSlot++;
      if (this.selectedSlot >= this.party.length) this.selectedSlot = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'Enter' || key === 'Space') {
      if (this.audioManager) this.audioManager.playSFX('bump');
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
    
    ctx.fillStyle = '#4deeea';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Monster Party', margin + 10, margin + 10);

    for (let i = 0; i < 6; i++) {
      const slotY = margin + 30 + i * 26;
      const monster = this.party[i];

      if (i === this.selectedSlot) {
        ctx.fillStyle = 'rgba(77, 238, 234, 0.2)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = '#4deeea';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      } else if (monster) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(margin + 5, slotY - 2, w - 10, 24);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(margin + 5, slotY - 2, w - 10, 24);
      }

      if (monster) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${monster.name} L${monster.level}`, margin + 10, slotY + 2);
        
        // HP Bar
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(margin + 120, slotY + 4, 100, 6);
        const hpRatio = monster.hp / monster.maxHp;
        ctx.fillStyle = hpRatio > 0.5 ? '#4deeea' : hpRatio > 0.2 ? '#f1c40f' : '#e74c3c';
        ctx.fillRect(margin + 120, slotY + 4, 100 * hpRatio, 6);
        
        ctx.fillStyle = '#8ab4f8';
        ctx.textAlign = 'right';
        ctx.fillText(`${monster.hp}/${monster.maxHp}`, margin + w - 10, slotY + 2);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('--- Empty Slot ---', margin + 10, slotY + 4);
      }
    }

    ctx.restore();
  }
}
