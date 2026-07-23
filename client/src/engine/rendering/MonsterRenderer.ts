/**
 * Dedicated Monster Renderer for Overworld Followers & Roaming Monsters
 * Renders distinct pixel-art monsters, shadows, level badges, HP bars, and biome emotes.
 */

import { Direction, MonsterType } from 'poke-ter-shared';

export class MonsterRenderer {
  /** Draw a monster sprite on context */
  static renderMonster(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    speciesId: number,
    speciesName: string,
    level: number,
    currentHp?: number,
    maxHp?: number,
    isFollower: boolean = false,
    emoteEmoji?: string,
    time: number = 0,
    moving: boolean = false,
    direction: Direction = 'down'
  ): void {
    ctx.save();

    // Walking / Idle animation bounce
    const bounceY = moving ? Math.abs(Math.sin(time * 0.012)) * 3 : Math.sin(time * 0.004) * 1.5;

    // Shadow underneath
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(screenX + 8, screenY + 14, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Monster Body based on species
    ctx.translate(screenX + 8, screenY + 8 - bounceY);

    this.drawMonsterBody(ctx, speciesId, time, direction);

    ctx.restore();

    // Draw HUD above monster (Name, Level, HP Bar)
    ctx.save();
    const hudY = screenY - 10 - bounceY;

    // Follower badge or Level Tag
    if (isFollower) {
      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`★ ${speciesName} Lv.${level}`, screenX + 8, hudY);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${speciesName} Lv.${level}`, screenX + 8, hudY);
    }

    // Health Bar if HP provided
    if (currentHp !== undefined && maxHp !== undefined && maxHp > 0) {
      const barW = 20;
      const barH = 3;
      const barX = screenX + 8 - barW / 2;
      const barY = hudY + 1;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(barX, barY, barW, barH);

      const hpRatio = Math.max(0, Math.min(1, currentHp / maxHp));
      ctx.fillStyle = hpRatio > 0.5 ? '#4deeea' : hpRatio > 0.2 ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    // Biome Emote Bubble above head
    if (emoteEmoji) {
      const bubbleY = hudY - 11;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(screenX + 8, bubbleY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoteEmoji, screenX + 8, bubbleY + 0.5);
    }

    ctx.restore();
  }

  /** Draw species pixel art geometry */
  private static drawMonsterBody(ctx: CanvasRenderingContext2D, speciesId: number, time: number, direction: Direction): void {
    const dir = direction.includes('up') ? 'up' : direction.includes('left') ? 'left' : direction.includes('right') ? 'right' : 'down';

    switch (speciesId) {
      case 1: // Flamepup (Fire Dog)
      case 2: // Blazehound
      case 3: // Infernotaur
        // Orange/Red Fire Monster
        ctx.fillStyle = speciesId === 3 ? '#b30000' : speciesId === 2 ? '#d93800' : '#ff5500';
        
        if (dir === 'down') {
          ctx.fillRect(-6, -6, 12, 10);
          // Head
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(-5, -9, 10, 7);
          // Ears
          ctx.fillStyle = '#cc0000';
          ctx.fillRect(-6, -11, 3, 4);
          ctx.fillRect(3, -11, 3, 4);
          // Flame Tail
          const flameOffset = Math.sin(time * 0.015) * 2;
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(0 + flameOffset, 4, 3, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -7, 2, 2);
          ctx.fillRect(1, -7, 2, 2);
          ctx.fillStyle = '#000000';
          ctx.fillRect(-2, -6, 1, 1);
          ctx.fillRect(2, -6, 1, 1);
        } else if (dir === 'up') {
          ctx.fillRect(-6, -6, 12, 10);
          // Head
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(-5, -9, 10, 7);
          // Ears (from back)
          ctx.fillStyle = '#cc0000';
          ctx.fillRect(-5, -11, 3, 4);
          ctx.fillRect(2, -11, 3, 4);
          // Flapping Flame Tail (Centered on back)
          const flameOffset = Math.sin(time * 0.02) * 2.5;
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(0 + flameOffset, -2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (dir === 'left') {
          // Narrower side body
          ctx.fillRect(-5, -6, 10, 10);
          // Head facing left
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(-7, -9, 10, 7);
          // Left ear (front) and right ear (peeking from behind)
          ctx.fillStyle = '#cc0000';
          ctx.fillRect(-2, -11, 3, 4); // Back ear
          ctx.fillStyle = '#b30000'; // Darker shade
          ctx.fillRect(-6, -11, 3, 4); // Front ear
          // Tail on right side
          const flameOffset = Math.sin(time * 0.015) * 2;
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(4 + flameOffset, 4, 3, 0, Math.PI * 2);
          ctx.fill();
          // Left Eye facing left side
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-5, -7, 2, 2);
          ctx.fillStyle = '#000000';
          ctx.fillRect(-5, -6, 1, 1);
        } else {
          // Right side
          ctx.fillRect(-5, -6, 10, 10);
          // Head facing right
          ctx.fillStyle = '#ffaa00';
          ctx.fillRect(-3, -9, 10, 7);
          // Right ear (front) and left ear (peeking)
          ctx.fillStyle = '#cc0000';
          ctx.fillRect(-1, -11, 3, 4);
          ctx.fillStyle = '#b30000';
          ctx.fillRect(3, -11, 3, 4);
          // Tail on left side
          const flameOffset = Math.sin(time * 0.015) * 2;
          ctx.fillStyle = '#ffea00';
          ctx.beginPath();
          ctx.arc(-4 + flameOffset, 4, 3, 0, Math.PI * 2);
          ctx.fill();
          // Right Eye facing right side
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(3, -7, 2, 2);
          ctx.fillStyle = '#000000';
          ctx.fillRect(4, -6, 1, 1);
        }
        break;

      case 4: // Sproutling (Grass)
      case 5: // Floramander
      case 6: // Verdantsaur
        // Green Grass Monster
        ctx.fillStyle = speciesId === 6 ? '#2d6a4f' : speciesId === 5 ? '#40916c' : '#52b788';
        
        if (dir === 'down') {
          ctx.fillRect(-6, -5, 12, 9);
          // Head & Sprout
          ctx.fillStyle = '#74c69d';
          ctx.fillRect(-5, -8, 10, 6);
          // Leaf on head
          ctx.fillStyle = '#d8f3dc';
          ctx.beginPath();
          ctx.arc(0, -11, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b4332';
          ctx.fillRect(0, -11, 1, 4);
          // Eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(-3, -6, 2, 2);
          ctx.fillRect(1, -6, 2, 2);
        } else if (dir === 'up') {
          ctx.fillRect(-6, -5, 12, 9);
          // Head & Sprout
          ctx.fillStyle = '#74c69d';
          ctx.fillRect(-5, -8, 10, 6);
          // Leaf on head (tilts slightly backward)
          ctx.fillStyle = '#d8f3dc';
          ctx.beginPath();
          ctx.arc(1, -10, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b4332';
          ctx.fillRect(1, -10, 1, 4);
        } else if (dir === 'left') {
          ctx.fillRect(-5, -5, 10, 9);
          // Head facing left
          ctx.fillStyle = '#74c69d';
          ctx.fillRect(-7, -8, 10, 6);
          // Leaf on head (centered to the left)
          ctx.fillStyle = '#d8f3dc';
          ctx.beginPath();
          ctx.arc(-2, -11, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b4332';
          ctx.fillRect(-2, -11, 1, 4);
          // Single Eye facing left
          ctx.fillStyle = '#000000';
          ctx.fillRect(-5, -6, 2, 2);
        } else {
          ctx.fillRect(-5, -5, 10, 9);
          // Head facing right
          ctx.fillStyle = '#74c69d';
          ctx.fillRect(-3, -8, 10, 6);
          // Leaf on head (centered to the right)
          ctx.fillStyle = '#d8f3dc';
          ctx.beginPath();
          ctx.arc(2, -11, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1b4332';
          ctx.fillRect(2, -11, 1, 4);
          // Single Eye facing right
          ctx.fillStyle = '#000000';
          ctx.fillRect(3, -6, 2, 2);
        }
        break;

      case 7: // Aquafin (Water)
      case 8: // Dolphirate
      case 9: // Leviaqua
        // Blue Water Monster
        ctx.fillStyle = speciesId === 9 ? '#03045e' : speciesId === 8 ? '#0077b6' : '#00b4d8';
        
        if (dir === 'down') {
          ctx.fillRect(-6, -6, 12, 10);
          // Fin on top
          ctx.fillStyle = '#90e0ef';
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(-4, -6);
          ctx.lineTo(4, -6);
          ctx.closePath();
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-4, -5, 3, 3);
          ctx.fillRect(1, -5, 3, 3);
          ctx.fillStyle = '#000d6b';
          ctx.fillRect(-3, -4, 1, 1);
          ctx.fillRect(2, -4, 1, 1);
        } else if (dir === 'up') {
          ctx.fillRect(-6, -6, 12, 10);
          // Dorsal fin from behind
          ctx.fillStyle = '#90e0ef';
          ctx.beginPath();
          ctx.moveTo(-1, -12);
          ctx.lineTo(-4, -6);
          ctx.lineTo(2, -6);
          ctx.closePath();
          ctx.fill();
          // Tail fin on bottom
          ctx.fillStyle = speciesId === 9 ? '#0077b6' : '#00b4d8';
          ctx.fillRect(-2, 4, 4, 2);
        } else if (dir === 'left') {
          // Horizontal sleek body
          ctx.fillRect(-8, -6, 14, 10);
          // Sleek fin pointing backwards
          ctx.fillStyle = '#90e0ef';
          ctx.beginPath();
          ctx.moveTo(2, -11);
          ctx.lineTo(-1, -6);
          ctx.lineTo(4, -6);
          ctx.closePath();
          ctx.fill();
          // Tail fin at right side
          ctx.fillStyle = speciesId === 9 ? '#03045e' : speciesId === 8 ? '#0077b6' : '#00b4d8';
          ctx.fillRect(5, -2, 2, 5);
          // Left Eye facing left
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-6, -5, 3, 3);
          ctx.fillStyle = '#000d6b';
          ctx.fillRect(-5, -4, 1, 1);
        } else {
          // Right side horizontal body
          ctx.fillRect(-6, -6, 14, 10);
          // Sleek fin pointing backwards
          ctx.fillStyle = '#90e0ef';
          ctx.beginPath();
          ctx.moveTo(-2, -11);
          ctx.lineTo(-4, -6);
          ctx.lineTo(1, -6);
          ctx.closePath();
          ctx.fill();
          // Tail fin at left side
          ctx.fillStyle = speciesId === 9 ? '#03045e' : speciesId === 8 ? '#0077b6' : '#00b4d8';
          ctx.fillRect(-7, -2, 2, 5);
          // Right Eye facing right
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(3, -5, 3, 3);
          ctx.fillStyle = '#000d6b';
          ctx.fillRect(4, -4, 1, 1);
        }
        break;

      default: // Chirpix / Flying / Normal (Yellow/Brown Bird/Creature)
        ctx.fillStyle = '#e67e22';
        
        if (dir === 'down') {
          ctx.fillRect(-5, -5, 10, 8);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-4, -8, 8, 5);
          // Beak
          ctx.fillStyle = '#e67e22';
          ctx.fillRect(-1, -6, 2, 2);
          // Eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(-3, -7, 1, 2);
          ctx.fillRect(2, -7, 1, 2);
        } else if (dir === 'up') {
          ctx.fillRect(-5, -5, 10, 8);
          // Cute Tail feathers
          ctx.fillStyle = '#d35400';
          ctx.fillRect(-1, 3, 2, 3);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-4, -8, 8, 5);
        } else if (dir === 'left') {
          ctx.fillRect(-5, -5, 10, 8);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-5, -8, 8, 5);
          // Beak facing left
          ctx.fillStyle = '#e67e22';
          ctx.fillRect(-7, -6, 2, 2);
          // Left Eye facing left
          ctx.fillStyle = '#000000';
          ctx.fillRect(-4, -7, 1, 2);
          // Left wing folded
          ctx.fillStyle = '#d35400';
          ctx.fillRect(1, -3, 3, 4);
        } else {
          ctx.fillRect(-5, -5, 10, 8);
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(-3, -8, 8, 5);
          // Beak facing right
          ctx.fillStyle = '#e67e22';
          ctx.fillRect(5, -6, 2, 2);
          // Right Eye facing right
          ctx.fillStyle = '#000000';
          ctx.fillRect(3, -7, 1, 2);
          // Right wing folded
          ctx.fillStyle = '#d35400';
          ctx.fillRect(-4, -3, 3, 4);
        }
        break;
    }
  }
}
