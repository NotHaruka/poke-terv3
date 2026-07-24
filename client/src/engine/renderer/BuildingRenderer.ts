/**
 * High-performance Pokémon-style Building Renderer
 *
 * Renders large overworld buildings as detailed single structures with depth sorting,
 * wall textures, roofs, doorframes, glowing windows, signs, and animations (smoke, windmill blades).
 */

import { BuildingRegistry } from '../registries/BuildingRegistry.js';
import { BuildingDefinition } from '../buildings/BuildingDefinition.js';

export class BuildingRenderer {
  private static animTime: number = 0;

  public static update(dt: number): void {
    this.animTime += dt;
  }

  public static renderBuilding(
    ctx: CanvasRenderingContext2D,
    buildingId: string,
    screenX: number,
    screenY: number,
    customName?: string
  ): void {
    const b: BuildingDefinition = BuildingRegistry.get(buildingId) || BuildingRegistry.get('pokecenter')!;
    const w = b.widthTiles * 16;
    const h = b.heightTiles * 16;
    const time = this.animTime;

    // 1. Soft Ground Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(screenX + w / 2, screenY + h - 1, w / 2 + 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Walls & Texture
    ctx.fillStyle = b.wallColor;
    ctx.fillRect(screenX, screenY + 16, w, h - 16);

    // Wall Siding / Brick Pattern Lines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let yOffset = 22; yOffset < h - 4; yOffset += 6) {
      ctx.fillRect(screenX, screenY + yOffset, w, 1);
    }

    // Wall Trim / Foundation Accent
    ctx.fillStyle = b.trimColor;
    ctx.fillRect(screenX, screenY + h - 4, w, 4);

    // Side Pillars / Wall Frames
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(screenX, screenY + 16, 3, h - 20);
    ctx.fillRect(screenX + w - 3, screenY + 16, 3, h - 20);

    // 3. Illuminated Windows with Glow
    this.renderWindows(ctx, b, screenX, screenY, w, h);

    // 4. Roof Geometry
    this.renderRoof(ctx, b, screenX, screenY, w, h, time);

    // 5. Door Frame, Doormat & Doorway Accent
    const doorX = screenX + b.doorOffsetX * 16;
    const doorY = screenY + b.doorOffsetY * 16;

    // Frame recessed background
    ctx.fillStyle = '#1a100c';
    ctx.fillRect(doorX - 1, doorY - 1, 18, 17);

    // Door Panel
    ctx.fillStyle = '#4a2e1b';
    ctx.fillRect(doorX, doorY, 16, 16);

    // Door Window / Wood Grain Panel
    ctx.fillStyle = '#6e472a';
    ctx.fillRect(doorX + 3, doorY + 2, 10, 6);
    ctx.fillRect(doorX + 3, doorY + 9, 10, 5);

    // Brass Doorknob
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(doorX + 12, doorY + 10, 2, 2);

    // Doormat (Accent Entry Mat)
    ctx.fillStyle = b.trimColor;
    ctx.fillRect(doorX + 1, doorY + 14, 14, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(doorX + 3, doorY + 15, 10, 1);

    // 6. Overhead Signboard & Symbol Plate
    this.renderSign(ctx, b, screenX, screenY, w, customName);

    // 7. Chimney & Smoke Particles (if animated)
    if (b.type === 'house' || b.type === 'inn' || b.type === 'manor' || b.type === 'ranger_station') {
      this.renderChimneyAndSmoke(ctx, screenX + w - 12, screenY - 6, time);
    }
  }

  private static renderWindows(
    ctx: CanvasRenderingContext2D,
    b: BuildingDefinition,
    screenX: number,
    screenY: number,
    w: number,
    h: number
  ): void {
    const numWindows = Math.max(1, Math.floor(w / 28));
    const windowSpacing = w / (numWindows + 1);

    for (let i = 1; i <= numWindows; i++) {
      // Skip window if blocked by door column
      const winX = screenX + windowSpacing * i - 5;
      const winY = screenY + 22;

      if (Math.abs(winX - (screenX + b.doorOffsetX * 16)) < 12) continue;

      // Window Frame
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(winX - 1, winY - 1, 12, 12);

      // Warm Yellow Glass Light
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(winX, winY, 10, 10);

      // Window Cross Panes
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(winX + 4, winY, 2, 10);
      ctx.fillRect(winX, winY + 4, 10, 2);

      // Window Sill / Flower Box
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(winX - 2, winY + 10, 14, 2);

      // Small flower dots
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(winX - 1, winY + 9, 2, 2);
      ctx.fillRect(winX + 9, winY + 9, 2, 2);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(winX + 3, winY + 9, 4, 2);
    }
  }

  private static renderRoof(
    ctx: CanvasRenderingContext2D,
    b: BuildingDefinition,
    screenX: number,
    screenY: number,
    w: number,
    h: number,
    time: number
  ): void {
    const style = b.roofStyle || 'sloped';

    if (style === 'windmill') {
      // Windmill Tower Cap
      ctx.fillStyle = b.roofColor;
      ctx.beginPath();
      ctx.moveTo(screenX + w / 2, screenY - 12);
      ctx.lineTo(screenX - 4, screenY + 18);
      ctx.lineTo(screenX + w + 4, screenY + 18);
      ctx.closePath();
      ctx.fill();

      // Windmill Blades
      const cx = screenX + w / 2;
      const cy = screenY + 4;
      const bladeAngle = time * 1.5;

      ctx.save();
      ctx.translate(cx, cy);

      // Center Gear Hub
      ctx.fillStyle = '#3e2a20';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // 4 Rotating Canvas Sails
      for (let i = 0; i < 4; i++) {
        const a = bladeAngle + (i * Math.PI) / 2;
        const len = 28;

        ctx.strokeStyle = '#2c1e14';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.stroke();

        // Canvas Sail Cloth
        ctx.fillStyle = '#f5eef8';
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
        ctx.lineTo(Math.cos(a + 0.25) * (len - 4), Math.sin(a + 0.25) * (len - 4));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (style === 'peaked') {
      // Triangular Peaked Roof
      ctx.fillStyle = b.roofColor;
      ctx.beginPath();
      ctx.moveTo(screenX + w / 2, screenY - 6);
      ctx.lineTo(screenX - 6, screenY + 18);
      ctx.lineTo(screenX + w + 6, screenY + 18);
      ctx.closePath();
      ctx.fill();

      // Roof Edge Shadow / Shingles
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath();
      ctx.moveTo(screenX + w / 2, screenY - 6);
      ctx.lineTo(screenX + w / 2, screenY + 18);
      ctx.lineTo(screenX + w + 6, screenY + 18);
      ctx.closePath();
      ctx.fill();

      // Roof Trim
      ctx.fillStyle = b.trimColor;
      ctx.fillRect(screenX - 6, screenY + 16, w + 12, 3);
    } else if (style === 'glass') {
      // Modern Glass & Metal Frame Roof (Lab)
      ctx.fillStyle = b.roofColor;
      ctx.fillRect(screenX - 4, screenY, w + 8, 18);

      // Glass panels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(screenX - 2, screenY + 2, (w + 4) / 2 - 2, 14);
      ctx.fillRect(screenX + w / 2 + 1, screenY + 2, (w + 4) / 2 - 2, 14);

      // Solar Antenna / Satellite Disc on Lab Roof
      const antX = screenX + w - 8;
      ctx.fillStyle = '#7f8c8d';
      ctx.fillRect(antX, screenY - 8, 2, 8);
      ctx.beginPath();
      ctx.arc(antX + 1, screenY - 8, 4, 0, Math.PI, true);
      ctx.fill();
    } else {
      // Standard Sloped Shingled Roof
      ctx.fillStyle = b.roofColor;
      ctx.fillRect(screenX - 4, screenY, w + 8, 18);

      // Shingle Lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(screenX - 4, screenY + 6, w + 8, 1);
      ctx.fillRect(screenX - 4, screenY + 12, w + 8, 1);

      // Highlight Edge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(screenX - 4, screenY, w + 8, 3);

      // Eaves Trim
      ctx.fillStyle = b.trimColor;
      ctx.fillRect(screenX - 5, screenY + 16, w + 10, 3);
    }
  }

  private static renderSign(
    ctx: CanvasRenderingContext2D,
    b: BuildingDefinition,
    screenX: number,
    screenY: number,
    w: number,
    customName?: string
  ): void {
    if (!b.signSymbol && !customName && !b.signText) return;

    const signX = screenX + Math.floor(w / 2) - 10;
    const signY = screenY + 4;

    // Sign Board Backing
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(signX - 2, signY - 1, 24, 12);
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.strokeRect(signX - 2, signY - 1, 24, 12);

    // Pokéball Badge Spec for Pokecenter
    if (b.id === 'pokecenter') {
      const cx = signX + 10;
      const cy = signY + 5;

      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(cx, cy, 5, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 5, cy - 1, 10, 1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.stroke();
      return;
    }

    // Standard Sign Symbol
    ctx.fillStyle = b.roofColor;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.signSymbol || '★', signX + 10, signY + 5);
  }

  private static renderChimneyAndSmoke(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    time: number
  ): void {
    // Brick Chimney
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(cx, cy, 6, 12);
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(cx - 1, cy - 2, 8, 3);

    // Animated Smoke Puffs
    for (let i = 0; i < 3; i++) {
      const pTime = (time * 1.2 + i * 0.8) % 2.5;
      const puffY = cy - 2 - pTime * 8;
      const puffX = cx + 3 + Math.sin(pTime * 3) * 3;
      const puffRadius = 2 + pTime * 2;
      const alpha = Math.max(0, 1 - pTime / 2.5) * 0.45;

      ctx.fillStyle = `rgba(220, 220, 220, ${alpha})`;
      ctx.beginPath();
      ctx.arc(puffX, puffY, puffRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
