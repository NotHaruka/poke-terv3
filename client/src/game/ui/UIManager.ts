/** UI rendering helpers for menus, HUDs, and dialogs */

import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class UIManager {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  /** Draw a battle HUD with HP bars */
  drawBattleHUD(
    ctx: CanvasRenderingContext2D,
    playerName: string, playerHp: number, playerMaxHp: number, playerLevel: number,
    enemyName: string, enemyHp: number, enemyMaxHp: number, enemyLevel: number,
  ): void {
    // Enemy HUD (top right)
    this.drawPokemonHUD(ctx, enemyName, enemyHp, enemyMaxHp, enemyLevel, GAME_WIDTH - 8, 8, 'right');

    // Player HUD (bottom left)
    this.drawPokemonHUD(ctx, playerName, playerHp, playerMaxHp, playerLevel, 8, GAME_HEIGHT - 72, 'left');
  }

  /** Draw a single Pokemon HUD */
  private drawPokemonHUD(
    ctx: CanvasRenderingContext2D,
    name: string, hp: number, maxHp: number, level: number,
    x: number, y: number, align: 'left' | 'right',
  ): void {
    const boxWidth = 120;
    const boxHeight = 40;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    const drawX = align === 'right' ? x - boxWidth : x;
    ctx.fillRect(drawX, y, boxWidth, boxHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(drawX, y, boxWidth, boxHeight);

    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(name, drawX + 4, y + 4);

    // Level
    ctx.fillText(`Lv${level}`, drawX + boxWidth - 30, y + 4);

    // HP text
    ctx.fillStyle = '#88ff88';
    ctx.fillText('HP', drawX + 4, y + 16);

    // HP bar background
    ctx.fillStyle = '#333333';
    ctx.fillRect(drawX + 24, y + 16, 80, 6);

    // HP bar fill
    const hpRatio = maxHp > 0 ? hp / maxHp : 0;
    const hpColor = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillStyle = hpColor;
    ctx.fillRect(drawX + 24, y + 16, 80 * hpRatio, 6);

    // HP numbers
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.fillText(`${hp}/${maxHp}`, drawX + 4, y + 28);
  }

  /** Draw a menu with selectable options */
  drawMenu(ctx: CanvasRenderingContext2D, options: string[], selectedIndex: number): void {
    const itemHeight = 16;
    const padding = 4;
    const width = 80;
    const height = options.length * itemHeight + padding * 2;
    const x = GAME_WIDTH - width - 8;
    const y = GAME_HEIGHT - height - 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // Options
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < options.length; i++) {
      const optionY = y + padding + i * itemHeight + itemHeight / 2;

      if (i === selectedIndex) {
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(x + 2, y + padding + i * itemHeight, width - 4, itemHeight - 2);
        ctx.fillStyle = '#ffffff';
      } else {
        ctx.fillStyle = '#aaaaaa';
      }

      ctx.fillText(options[i], x + 8, optionY);
    }

    // Cursor indicator
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 4, y + padding + selectedIndex * itemHeight + 4, 2, 8);
  }

  /** Draw a dialogue box */
  drawDialogue(ctx: CanvasRenderingContext2D, text: string, speaker?: string): void {
    const boxHeight = 48;
    const y = GAME_HEIGHT - boxHeight - 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(8, y, GAME_WIDTH - 16, boxHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, y, GAME_WIDTH - 16, boxHeight);

    // Speaker name
    if (speaker) {
      ctx.fillStyle = '#ffcc00';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(speaker, 16, y + 4);
    }

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, 16, y + (speaker ? 16 : 8));
  }

  /** Draw a text overlay in the center of the screen */
  drawOverlayText(ctx: CanvasRenderingContext2D, text: string, subtext?: string): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, GAME_HEIGHT / 2 - 20, GAME_WIDTH, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 4);

    if (subtext) {
      ctx.fillText(subtext, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10);
    }
  }

  /** Draw a FireRed-style location banner */
  drawLocationBanner(ctx: CanvasRenderingContext2D, title: string, subtitle: string, alpha: number): void {
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    const boxWidth = 140;
    const boxHeight = 32;
    const x = (GAME_WIDTH - boxWidth) / 2;
    const y = 16;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(x, y, boxWidth, boxHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(title, GAME_WIDTH / 2, y + 4);

    // Subtitle
    ctx.fillStyle = '#ffcc00';
    ctx.font = '8px monospace';
    ctx.fillText(subtitle, GAME_WIDTH / 2, y + 18);

    ctx.restore();
  }
}