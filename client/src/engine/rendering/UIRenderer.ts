/** Modular UI Renderer for 9-slice panels, status bars, dialogue boxes, and cursor graphics */

import { UIRegistry } from '../registries/UIRegistry.js';
import { envSystem } from '../EnvironmentSystem.js';

export class UIRenderer {
  /** Draw a styled 9-slice frame window */
  static drawWindow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    frameThemeId = 'default_window'
  ): void {
    const theme = UIRegistry.getFrame(frameThemeId);

    // Drop shadow
    ctx.fillStyle = theme.shadowColor;
    ctx.fillRect(Math.round(x + 2), Math.round(y + 2), Math.round(width), Math.round(height));

    // Background
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));

    // Outer Border
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = theme.borderWidth;
    ctx.strokeRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));

    // Inner Accent Line
    ctx.strokeStyle = theme.accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x + 2), Math.round(y + 2), Math.round(width - 4), Math.round(height - 4));
  }

  /** Draw health bar with dynamic HP color transition */
  static drawHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    currentHp: number,
    maxHp: number
  ): void {
    const ratio = Math.max(0, Math.min(1, currentHp / maxHp));

    // Border & Container
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, width, height);

    // Health Color
    ctx.fillStyle = ratio > 0.5 ? '#2ecc71' : ratio > 0.2 ? '#f1c40f' : '#e74c3c';
    ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * ratio), height - 2);

    // Border outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  /** Draw experience bar */
  static drawExpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    currentExp: number,
    maxExp: number
  ): void {
    const ratio = Math.max(0, Math.min(1, currentExp / maxExp));

    ctx.fillStyle = '#111122';
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#3498db';
    ctx.fillRect(x + 1, y + 1, Math.round((width - 2) * ratio), height - 2);

    ctx.strokeStyle = '#5555aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
  }

  /** Draw dialogue box with speaker header */
  static drawDialogueBox(
    ctx: CanvasRenderingContext2D,
    text: string,
    speaker?: string
  ): void {
    const w = ctx.canvas.width || 240;
    const h = ctx.canvas.height || 160;

    const boxW = w - 16;
    const boxH = 42;
    const boxX = 8;
    const boxY = h - boxH - 8;

    this.drawWindow(ctx, boxX, boxY, boxW, boxH, 'dialogue_box');

    // Speaker Plate
    if (speaker) {
      const spkW = ctx.measureText(speaker).width + 12;
      this.drawWindow(ctx, boxX + 4, boxY - 10, spkW, 12, 'default_window');
      ctx.fillStyle = '#ffe600';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(speaker, boxX + 10, boxY - 8);
    }

    // Text Body
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, boxX + 8, boxY + 8);

    // Bouncing Next Indicator Arrow
    const arrowBounce = Math.sin(envSystem.time * 0.01) * 2;
    ctx.fillStyle = '#ffe600';
    ctx.beginPath();
    ctx.moveTo(boxX + boxW - 12, boxY + boxH - 10 + arrowBounce);
    ctx.lineTo(boxX + boxW - 6, boxY + boxH - 10 + arrowBounce);
    ctx.lineTo(boxX + boxW - 9, boxY + boxH - 6 + arrowBounce);
    ctx.fill();
  }
}
