import { GAME_WIDTH, GAME_HEIGHT, PlayerSnapshot } from 'poke-ter-shared';

export interface PointerTarget {
  id: string;
  username: string;
  x: number;
  y: number;
  mapId: string;
}

export class DirectionalPointer {
  public showFriends: boolean = true;
  public showPortals: boolean = true;

  render(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    currentMapId: string,
    realPlayers: Map<string, PlayerSnapshot>,
    offsetX: number,
    offsetY: number
  ): void {
    ctx.save();

    const targets: PointerTarget[] = [];

    if (this.showFriends) {
      for (const [, op] of realPlayers) {
        targets.push({
          id: op.id,
          username: op.username || 'Trainer',
          x: op.position.x,
          y: op.position.y,
          mapId: currentMapId,
        });
      }
    }



    // Add city portal pointer if we are on a route map
    if (this.showPortals) {
      if (currentMapId === 'route_1') {
        targets.push({
          id: 'portal_city',
          username: 'City Portal 🌀',
          x: 127 * 16,
          y: 244 * 16,
          mapId: currentMapId,
        });
      } else if (currentMapId === 'route_2') {
        targets.push({
          id: 'portal_city',
          username: 'City Portal 🌀',
          x: 127 * 16,
          y: 12 * 16,
          mapId: currentMapId,
        });
      } else if (currentMapId === 'route_3') {
        targets.push({
          id: 'portal_city',
          username: 'City Portal 🌀',
          x: 12 * 16,
          y: 121 * 16,
          mapId: currentMapId,
        });
      } else if (currentMapId === 'route_4') {
        targets.push({
          id: 'portal_city',
          username: 'City Portal 🌀',
          x: 244 * 16,
          y: 121 * 16,
          mapId: currentMapId,
        });
      }
    }

    const margin = 14;
    const playerScreenX = playerX - offsetX;
    const playerScreenY = playerY - offsetY;

    for (const t of targets) {
      const screenX = t.x - offsetX;
      const screenY = t.y - offsetY;

      // Check if off-screen (with margin)
      const isOffScreen =
        screenX < margin ||
        screenX > GAME_WIDTH - margin ||
        screenY < margin ||
        screenY > GAME_HEIGHT - margin;

      if (!isOffScreen) {
        continue; // They are visible on screen, no pointer needed
      }

      // Calculate directional vector
      const dx = screenX - playerScreenX;
      const dy = screenY - playerScreenY;
      const angle = Math.atan2(dy, dx);
      const distPixels = Math.sqrt(dx * dx + dy * dy);
      const distMeters = Math.round(distPixels / 16); // 1 tile = 1m

      let edgeX = playerScreenX;
      let edgeY = playerScreenY;

      if (dx !== 0 || dy !== 0) {
        let tScale = Infinity;

        // Check right edge intersection
        if (dx > 0) {
          tScale = Math.min(tScale, (GAME_WIDTH - margin - playerScreenX) / dx);
        }
        // Check left edge intersection
        if (dx < 0) {
          tScale = Math.min(tScale, (margin - playerScreenX) / dx);
        }
        // Check bottom edge intersection
        if (dy > 0) {
          tScale = Math.min(tScale, (GAME_HEIGHT - margin - playerScreenY) / dy);
        }
        // Check top edge intersection
        if (dy < 0) {
          tScale = Math.min(tScale, (margin - playerScreenY) / dy);
        }

        if (tScale !== Infinity && tScale > 0) {
          edgeX = playerScreenX + tScale * dx;
          edgeY = playerScreenY + tScale * dy;
        }
      }

      // Draw pointer arrow at (edgeX, edgeY)
      ctx.save();
      ctx.translate(edgeX, edgeY);
      ctx.rotate(angle);

      // Neon indicator styling
      const isPortal = t.id === 'portal_city';
      ctx.fillStyle = isPortal ? '#4deeea' : '#ff007f'; // neon cyan for portal, neon hot pink for friends
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(6, 0); // pointing outwards
      ctx.lineTo(-4, -4);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Render floating label near the arrow
      // Offset slightly towards the center of the screen
      const textX = edgeX - Math.cos(angle) * 16;
      const textY = edgeY - Math.sin(angle) * 16;

      ctx.save();
      ctx.font = '7px monospace';
      
      const label = `${t.username} (${distMeters}m)`;
      const labelWidth = ctx.measureText(label).width;

      // Draw a clean background capsule for the label to ensure legibility on any terrain
      ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
      ctx.strokeStyle = isPortal ? '#ffea00' : '#4deeea'; // gold border for portal, cyan for friends
      ctx.lineWidth = 1;
      
      const boxW = labelWidth + 6;
      const boxH = 10;
      
      // Align label box based on which edge of the screen it's on
      let boxX = textX - boxW / 2;
      let boxY = textY - boxH / 2;

      // Adjust to prevent box from drawing off screen boundaries
      boxX = Math.max(4, Math.min(GAME_WIDTH - boxW - 4, boxX));
      boxY = Math.max(4, Math.min(GAME_HEIGHT - boxH - 4, boxY));

      // Draw rounded background capsule
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(boxX, boxY, boxW, boxH, 3);
      } else {
        ctx.rect(boxX, boxY, boxW, boxH);
      }
      ctx.fill();
      ctx.stroke();

      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, boxX + boxW / 2, boxY + boxH / 2 + 0.5);

      ctx.restore();
    }

    ctx.restore();
  }
}
