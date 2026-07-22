import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';
import { ClockManager } from './ClockManager.js';

export class PlayerCardMenu extends Menu {
  private player: Player;
  private clockManager: ClockManager;
  private getPlayTimeMs: () => number;

  constructor(player: Player, clockManager: ClockManager, getPlayTimeMs: () => number) {
    super();
    this.player = player;
    this.clockManager = clockManager;
    this.getPlayTimeMs = getPlayTimeMs;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;
    if (key === 'Escape' || key === 'KeyE') {
      if (this.audioManager) this.audioManager.playSFX('cancel');
      this.close();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const margin = 32;
    const w = GAME_WIDTH - margin * 2;
    const h = GAME_HEIGHT - margin * 2;
    this.drawWindow(ctx, margin, margin, w, h);

    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Header
    ctx.fillStyle = '#4deeea';
    ctx.fillRect(margin + 2, margin + 2, w - 4, 24);
    
    ctx.fillStyle = '#0f1423';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TRAINER CARD', GAME_WIDTH / 2, margin + 14);

    // Body
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    
    const startY = margin + 40;
    const lineHeight = 16;
    
    ctx.fillText(`Name: Trainer`, margin + 16, startY);
    ctx.fillStyle = '#8ab4f8';
    ctx.fillText(`Money: ¥3000`, margin + 16, startY + lineHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Database: 0`, margin + 16, startY + lineHeight * 2);
    
    const currentPlayTime = this.getPlayTimeMs();
    const playHours = Math.floor(currentPlayTime / 3600000);
    const playMins = Math.floor((currentPlayTime % 3600000) / 60000);
    const playMinsStr = playMins < 10 ? `0${playMins}` : `${playMins}`;
    
    ctx.fillStyle = '#8ab4f8';
    ctx.fillText(`Time: ${playHours}:${playMinsStr}`, margin + 16, startY + lineHeight * 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`In-Game Time: ${this.clockManager.getTimeString()}`, margin + 16, startY + lineHeight * 4);

    ctx.restore();
  }
}
