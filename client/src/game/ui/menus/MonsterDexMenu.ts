import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';
import { Player } from '../../entities/Player.js';

export class MonsterDexMenu extends Menu {
  private player: Player;
  private selectedTab: number = 0;
  private tabs: string[] = ['Overview', 'List', 'Stats'];

  constructor(player: Player) {
    super();
    this.player = player;
  }

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    if (key === 'ArrowLeft' || key === 'KeyA') {
      this.selectedTab = (this.selectedTab - 1 + this.tabs.length) % this.tabs.length;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.selectedTab = (this.selectedTab + 1) % this.tabs.length;
      if (this.audioManager) this.audioManager.playSFX('select');
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
    
    // Draw Category Tabs
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const tabW = w / this.tabs.length;
    for (let i = 0; i < this.tabs.length; i++) {
      const tabX = margin + i * tabW;
      if (i === this.selectedTab) {
        ctx.fillStyle = '#4deeea';
        ctx.fillRect(tabX, margin, tabW, 20);
        ctx.fillStyle = '#0f1423';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(tabX, margin, tabW, 20);
        ctx.fillStyle = '#8ab4f8';
      }
      ctx.fillText(this.tabs[i], tabX + tabW / 2, margin + 5);
    }

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('Data Log not yet fully integrated.', margin + 20, margin + 40);

    if (this.selectedTab === 0) {
      ctx.fillText(`Scanned: 0`, margin + 20, margin + 60);
      ctx.fillText(`Captured: 0`, margin + 20, margin + 80);
      ctx.fillText(`Database Completion: 0%`, margin + 20, margin + 100);
    } else if (this.selectedTab === 1) {
      ctx.fillText(`???`, margin + 20, margin + 60);
      ctx.fillText(`???`, margin + 20, margin + 80);
    }

    ctx.restore();
  }
}
