import { Menu } from './Menu.js';
import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class BackpackMenu extends Menu {
  private categories: string[] = ['Items', 'Key Items', 'Capture Pods', 'Berries', 'Materials'];
  private selectedCategory: number = 0;
  private selectedItem: number = 0;
  
  // Placeholder inventory data (Empty for now)
  private inventory: Record<string, {name: string, desc: string, qty: number}[]> = {
    'Items': [],
    'Key Items': [],
    'Capture Pods': [],
    'Berries': [],
    'Materials': []
  };

  onKeyDown(key: string): void {
    if (this.targetAlpha < 1) return;

    const currentItems = this.inventory[this.categories[this.selectedCategory]] || [];

    if (key === 'ArrowLeft' || key === 'KeyA') {
      this.selectedCategory = (this.selectedCategory - 1 + this.categories.length) % this.categories.length;
      this.selectedItem = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowRight' || key === 'KeyD') {
      this.selectedCategory = (this.selectedCategory + 1) % this.categories.length;
      this.selectedItem = 0;
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowUp' || key === 'KeyW') {
      this.selectedItem--;
      if (this.selectedItem < 0) this.selectedItem = Math.max(0, currentItems.length - 1);
      if (this.audioManager) this.audioManager.playSFX('select');
    } else if (key === 'ArrowDown' || key === 'KeyS') {
      this.selectedItem++;
      if (this.selectedItem >= currentItems.length) this.selectedItem = 0;
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
    
    // Draw Category Tabs
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    const tabW = w / this.categories.length;
    for (let i = 0; i < this.categories.length; i++) {
      const tabX = margin + i * tabW;
      if (i === this.selectedCategory) {
        ctx.fillStyle = '#4deeea';
        ctx.fillRect(tabX, margin, tabW, 20);
        ctx.fillStyle = '#0f1423';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(tabX, margin, tabW, 20);
        ctx.fillStyle = '#8ab4f8';
      }
      ctx.fillText(this.categories[i], tabX + tabW / 2, margin + 5);
    }

    // Draw Items
    const items = this.inventory[this.categories[this.selectedCategory]] || [];
    const itemStartY = margin + 30;
    
    ctx.textAlign = 'left';
    if (items.length === 0) {
      ctx.fillStyle = '#8ab4f8';
      ctx.fillText('No items in this pocket.', margin + 20, itemStartY);
    } else {
      for (let i = 0; i < items.length; i++) {
        const y = itemStartY + i * 20;
        
        if (i === this.selectedItem) {
          ctx.fillStyle = '#4deeea';
          ctx.beginPath();
          ctx.moveTo(margin + 10, y + 5);
          ctx.lineTo(margin + 16, y + 10);
          ctx.lineTo(margin + 10, y + 15);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
        } else {
          ctx.fillStyle = '#8ab4f8';
        }
        
        ctx.fillText(items[i].name, margin + 25, y + 5);
        ctx.textAlign = 'right';
        ctx.fillText(`x${items[i].qty}`, margin + w - 20, y + 5);
        ctx.textAlign = 'left';
      }
      
      // Draw Description Box
      const descY = margin + h - 40;
      this.drawWindow(ctx, margin, descY, w, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px monospace';
      
      const currentItem = items[this.selectedItem];
      if (currentItem) {
        ctx.fillText(currentItem.desc, margin + 10, descY + 15);
      }
    }
    
    ctx.restore();
  }
}
