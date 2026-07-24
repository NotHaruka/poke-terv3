import { GAME_WIDTH, GAME_HEIGHT, Direction, getGlobalTile } from 'poke-ter-shared';
import { DirectionalPointer } from './DirectionalPointer.js';

export interface MinimapMarker {
  x: number;
  y: number;
  type: 'player' | 'friend' | 'npc' | 'building' | 'door';
  label?: string;
  isPinned?: boolean;
}

export class MinimapHUD {
  private isExpanded: boolean = false;
  private zoomLevel: number = 1; // 1 = normal, 2 = zoomed out
  private expandProgress: number = 0.0;

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  isMaximized(): boolean {
    return this.isExpanded;
  }

  getExpandProgress(): number {
    return this.expandProgress;
  }

  update(dt: number): void {
    const target = this.isExpanded ? 1.0 : 0.0;
    if (this.expandProgress < target) {
      this.expandProgress = Math.min(target, this.expandProgress + dt * 0.015);
    } else if (this.expandProgress > target) {
      this.expandProgress = Math.max(target, this.expandProgress - dt * 0.015);
    }
  }

  handleClick(clickX: number, clickY: number, pointer: DirectionalPointer): 'toggle_friends' | 'toggle_portals' | 'toggle_expand' | null {
    const size = this.isExpanded ? 110 : 54;
    const extraHeight = this.isExpanded ? 34 : 0;
    const x = 6;
    const y = 6;

    if (clickX >= x && clickX <= x + size && clickY >= y && clickY <= y + size + extraHeight) {
      if (this.isExpanded) {
        const buttonY = y + size + 15;
        const buttonH = 12;
        if (clickY >= buttonY && clickY <= buttonY + buttonH) {
          // Check Left Button: x + 4 to x + 52
          if (clickX >= x + 4 && clickX <= x + 52) {
            pointer.showFriends = !pointer.showFriends;
            return 'toggle_friends';
          }
          // Check Right Button: x + 58 to x + 106
          if (clickX >= x + 58 && clickX <= x + 106) {
            pointer.showPortals = !pointer.showPortals;
            return 'toggle_portals';
          }
        }
      }
      return 'toggle_expand';
    }
    return null;
  }

  render(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    playerDir: Direction,
    currentMapId: string,
    biomeName: string,
    markers: MinimapMarker[],
    seed: number,
    activeInterior?: { tilemap: number[][]; widthTiles: number; heightTiles: number } | null,
    showFriends: boolean = true,
    showPortals: boolean = true
  ): void {
    ctx.save();

    // Small HUD layout vs Expanded HUD layout
    const size = 54 + (110 - 54) * this.expandProgress;
    const extraHeight = 34 * this.expandProgress;
    const x = 6;
    const y = 6;

    const centerX = x + size / 2;
    const centerY = y + size / 2;

    // Outer Frame Window
    ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
    ctx.fillRect(x, y, size, size + extraHeight);
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, size, size + extraHeight);

    // Corner Accents
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(x, y, 3, 3);
    ctx.fillRect(x + size - 3, y, 3, 3);
    ctx.fillRect(x, y + size + extraHeight - 3, 3, 3);
    ctx.fillRect(x + size - 3, y + size + extraHeight - 3, 3, 3);

    // Map Clipping Window
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, y + 2, size - 4, size - 4);
    ctx.clip();

    // Map background tint default fallback
    ctx.fillStyle = '#0c1222';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    // Scale calculation: Map world coordinates -> Radar relative pixel offset
    // 1 tile = 16 pixels. Scale factor:
    const scale = (0.05 + (0.08 - 0.05) * this.expandProgress) / this.zoomLevel;

    const tileSizeOnMinimap = 16 * scale;
    const minGx = Math.floor((playerX - (size / 2 - 2) / scale) / 16);
    const maxGx = Math.ceil((playerX + (size / 2 - 2) / scale) / 16);
    const minGy = Math.floor((playerY - (size / 2 - 2) / scale) / 16);
    const maxGy = Math.ceil((playerY + (size / 2 - 2) / scale) / 16);

    // Render individual terrain/structure tiles from seed or active interior
    for (let gy = minGy; gy <= maxGy; gy++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        let tileId = 0;
        if (activeInterior) {
          if (gy >= 0 && gy < activeInterior.heightTiles && gx >= 0 && gx < activeInterior.widthTiles) {
            tileId = activeInterior.tilemap[gy]?.[gx] ?? 0;
          } else {
            tileId = 0; // Void outside interior
          }
        } else {
          tileId = getGlobalTile(gx, gy, seed, currentMapId);
        }

        // Get custom minimap color for tileId
        let color = '#1a3c1e'; // Default grass green
        switch (tileId) {
          case 0: // TILE_VOID
            color = '#0c1222';
            break;
          case 1: // TILE_GRASS
            color = '#1a3c1e';
            break;
          case 2: // TILE_PATH
            color = '#735135';
            break;
          case 3: // TILE_WATER
            color = '#1c4f7c';
            break;
          case 4: // TILE_MOUNTAIN / wall
            color = '#4d5660';
            break;
          case 5: // TILE_TREE
            color = '#0e2a14';
            break;
          case 6: // TILE_BUILDING_FLOOR
            color = '#54402e';
            break;
          case 7: // TILE_BUILDING_WALL
            color = '#33261a';
            break;
          case 8: // TILE_DOOR
            color = '#d4af37';
            break;
          case 9: // TILE_TALL_GRASS
            color = '#2d5a27';
            break;
          case 10: // TILE_PORTAL
            color = '#800080';
            break;
        }

        // Calculate screen positions on minimap
        const dx = gx * 16 - playerX;
        const dy = gy * 16 - playerY;
        const mx = centerX + dx * scale;
        const my = centerY + dy * scale;

        // Draw tile block slightly oversized to ensure contiguous rendering without subpixel gaps
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(mx),
          Math.floor(my),
          Math.ceil(tileSizeOnMinimap) + 1,
          Math.ceil(tileSizeOnMinimap) + 1
        );
      }
    }

    // Grid pattern overlay (very subtle)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridSpacing = 12;
    for (let gx = x + 2; gx < x + size; gx += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(gx, y + 2);
      ctx.lineTo(gx, y + size - 2);
      ctx.stroke();
    }
    for (let gy = y + 2; gy < y + size; gy += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x + 2, gy);
      ctx.lineTo(x + size - 2, gy);
      ctx.stroke();
    }

    // Render Markers
    for (const m of markers) {
      if (m.type === 'player') continue; // render player last at center

      const dx = (m.x - playerX) * scale;
      const dy = (m.y - playerY) * scale;
      const mx = centerX + dx;
      const my = centerY + dy;

      // Check if within radar clip
      if (mx < x + 2 || mx > x + size - 2 || my < y + 2 || my > y + size - 2) {
        // Clamp to edge if pinned
        if (m.isPinned) {
          const edgeX = Math.max(x + 6, Math.min(x + size - 6, mx));
          const edgeY = Math.max(y + 6, Math.min(y + size - 6, my));
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(edgeX, edgeY, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }

      if (m.type === 'building') {
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(mx - 2, my - 2, 4, 4);
      } else if (m.type === 'door') {
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.type === 'npc') {
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(mx, my, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (m.type === 'friend') {
        if (!showFriends) continue;
        ctx.fillStyle = m.isPinned ? '#ff007f' : '#00e5ff';
        ctx.beginPath();
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
        ctx.fill();
        if (m.isPinned) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Render Player Icon (center dot with direction arrow)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Direction pointer
    let pointerX = centerX;
    let pointerY = centerY;
    if (playerDir.includes('up')) pointerY -= 5;
    if (playerDir.includes('down')) pointerY += 5;
    if (playerDir.includes('left')) pointerX -= 5;
    if (playerDir.includes('right')) pointerX += 5;

    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pointerX, pointerY);
    ctx.stroke();

    ctx.restore(); // Restore clip

    // Cardinal directions (N/S/E/W)
    ctx.fillStyle = '#ffffff';
    ctx.font = '5.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // N (Top Edge)
    ctx.fillText('N', centerX, y + 6);
    // S (Bottom Edge)
    ctx.fillText('S', centerX, y + size - 6);
    // W (Left Edge)
    ctx.fillText('W', x + 6, centerY);
    // E (Right Edge)
    ctx.fillText('E', x + size - 6, centerY);

    // Bottom info line if expanded
    if (this.expandProgress > 0) {
      ctx.save();
      ctx.globalAlpha = this.expandProgress;

      // 1. Text row (Map & Coordinates)
      ctx.fillStyle = '#4deeea';
      ctx.font = '6px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const mapLabel = currentMapId.includes('interior') ? 'Indoor' : currentMapId.toUpperCase();
      ctx.fillText(`MAP: ${mapLabel}`, x + 4, y + size + 2);
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`X:${Math.floor(playerX / 16)} Y:${Math.floor(playerY / 16)}`, x + size - 36, y + size + 2);

      // 2. Interactive Switch buttons row
      const buttonY = y + size + 15;
      const buttonH = 12;

      // Left Switch: Friends
      ctx.save();
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(10, 16, 30, 0.8)';
      ctx.strokeStyle = showFriends ? '#ff007f' : '#555555';
      ctx.fillRect(x + 4, buttonY, 48, buttonH);
      ctx.strokeRect(x + 4, buttonY, 48, buttonH);

      ctx.fillStyle = showFriends ? '#ffffff' : '#777777';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`👥 FRIENDS: ${showFriends ? 'ON' : 'OFF'}`, x + 28, buttonY + buttonH / 2 + 0.5);
      ctx.restore();

      // Right Switch: Portals
      ctx.save();
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(10, 16, 30, 0.8)';
      ctx.strokeStyle = showPortals ? '#4deeea' : '#555555';
      ctx.fillRect(x + 58, buttonY, 48, buttonH);
      ctx.strokeRect(x + 58, buttonY, 48, buttonH);

      ctx.fillStyle = showPortals ? '#ffffff' : '#777777';
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🌀 PORTALS: ${showPortals ? 'ON' : 'OFF'}`, x + 82, buttonY + buttonH / 2 + 0.5);
      ctx.restore();

      ctx.restore();
    }

    // [M] button prompt
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x + size - 10, y + 2, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = '5.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isExpanded ? '–' : 'M', x + size - 6, y + 6);

    ctx.restore();
  }
}
