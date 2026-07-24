/** Canvas 2D renderer with pixel-art scaling support */

import { GAME_WIDTH, GAME_HEIGHT } from 'poke-ter-shared';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private _scale = 1;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.imageRendering = 'pixelated';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    container.appendChild(this.canvas);

    this.buffer = document.createElement('canvas');
    this.buffer.width = GAME_WIDTH;
    this.buffer.height = GAME_HEIGHT;
    const bufferCtx = this.buffer.getContext('2d');
    if (!bufferCtx) throw new Error('Failed to get 2D context');
    this.bufferCtx = bufferCtx;
    this.bufferCtx.imageSmoothingEnabled = false;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.resize();
    window.addEventListener('resize', this.resize);
  }

  private resize = (): void => {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const maxW = parent.clientWidth || window.innerWidth;
    const maxH = parent.clientHeight || window.innerHeight;

    const aspect = GAME_WIDTH / GAME_HEIGHT;
    let width = maxW;
    let height = maxW / aspect;
    if (height > maxH) {
      height = maxH;
      width = maxH * aspect;
    }

    const dpr = window.devicePixelRatio || 1;
    this._scale = width / GAME_WIDTH;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.imageSmoothingEnabled = false;
  };

  getScale(): number {
    return this._scale;
  }

  getWidth(): number {
    return GAME_WIDTH;
  }

  getHeight(): number {
    return GAME_HEIGHT;
  }

  getContext(): CanvasRenderingContext2D {
    return this.bufferCtx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Clear the buffer with a color */
  clear(color: string = '#000000'): void {
    this.bufferCtx.fillStyle = color;
    this.bufferCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  /** Present the buffer to the screen */
  present(): void {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.buffer,
      0, 0, GAME_WIDTH, GAME_HEIGHT,
      0, 0, this.canvas.width, this.canvas.height,
    );
  }

  /** Draw a sprite from a spritesheet */
  drawSprite(
    spritesheet: HTMLImageElement | HTMLCanvasElement,
    sx: number, sy: number, sw: number, sh: number,
    dx: number, dy: number, dw?: number, dh?: number,
  ): void {
    this.bufferCtx.drawImage(
      spritesheet,
      sx, sy, sw, sh,
      Math.round(dx), Math.round(dy),
      dw ?? sw, dh ?? sh,
    );
  }

  /** Draw a filled rectangle */
  fillRect(x: number, y: number, w: number, h: number, color: string): void {
    this.bufferCtx.fillStyle = color;
    this.bufferCtx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** Draw a stroked rectangle */
  strokeRect(x: number, y: number, w: number, h: number, color: string, lineWidth: number = 1): void {
    this.bufferCtx.strokeStyle = color;
    this.bufferCtx.lineWidth = lineWidth;
    this.bufferCtx.strokeRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** Draw text */
  drawText(text: string, x: number, y: number, color: string = '#ffffff', font: string = '8px monospace', align: CanvasTextAlign = 'left'): void {
    this.bufferCtx.fillStyle = color;
    this.bufferCtx.font = font;
    this.bufferCtx.textBaseline = 'top';
    this.bufferCtx.textAlign = align;
    this.bufferCtx.fillText(text, Math.round(x), Math.round(y));
  }

  /** Measure text width */
  measureText(text: string, font: string = '8px monospace'): number {
    this.bufferCtx.font = font;
    return this.bufferCtx.measureText(text).width;
  }

  destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
  }
}