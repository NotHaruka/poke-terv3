/**
 * Active Companion Monster Entity
 * Follows physically behind the player in the overworld and reacts to biome changes.
 */

import { Direction, MonsterType } from 'poke-ter-shared';
import { MonsterRenderer } from '../../../engine/renderer/MonsterRenderer.js';
import { ParticleSystem } from '../../../engine/particles/ParticleSystem.js';

export interface PositionHistory {
  x: number;
  y: number;
  playerX: number;
  playerY: number;
  direction: Direction;
  moving: boolean;
}

export class PokemonFollower {
  public x: number = 0;
  public y: number = 0;
  public direction: Direction = 'down';
  public moving: boolean = false;

  // Emote state
  private emoteEmoji: string | undefined = undefined;
  private emoteTimer: number = 0;
  private lastBiomeName: string = '';

  constructor(initialX: number, initialY: number) {
    this.x = initialX;
    this.y = initialY + 18;
  }

  /** Teleport instantly to target coordinates */
  public teleportTo(targetX: number, targetY: number, dir: Direction): void {
    this.x = targetX;
    this.y = targetY;
    this.direction = dir;
    this.moving = false;
  }

  /** Record player movement and update follower position */
  public update(
    dt: number,
    playerX: number,
    playerY: number,
    playerDirection: Direction,
    playerMoving: boolean,
    biomeName: string,
    monsterType: MonsterType,
    speciesName: string,
    particleSystem?: ParticleSystem
  ): void {
    // 1. Calculate distance to player
    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const dist = Math.hypot(dx, dy);

    // 2. Teleport instantly if player is too far (e.g. map change, interior warp)
    if (dist > 50) {
      let offX = 0;
      let offY = 0;
      if (playerDirection === 'down') offY = -18;
      else if (playerDirection === 'up') offY = 18;
      else if (playerDirection === 'left') offX = 18;
      else if (playerDirection === 'right') offX = -18;

      this.teleportTo(playerX + offX, playerY + offY, playerDirection);
      return;
    }

    // 3. Keep follower exactly behind player with smooth tracking
    const targetDist = 18; // Safe physical buffer distance so follower NEVER steps inside player
    if (dist > targetDist) {
      // Use smooth interpolation to slide towards target physical distance
      const ratio = (dist - targetDist) / dist;
      const lerpSpeed = playerMoving ? 0.22 : 0.15;
      
      this.x += dx * ratio * lerpSpeed;
      this.y += dy * ratio * lerpSpeed;
      this.moving = true;

      // Determine movement direction based on velocity vector
      if (Math.abs(dx) > Math.abs(dy)) {
        this.direction = dx > 0 ? 'right' : 'left';
      } else {
        this.direction = dy > 0 ? 'down' : 'up';
      }
    } else {
      this.moving = false;
      // When standing still, match the player's direction
      this.direction = playerDirection;
    }

    // 4. Check Biome Reaction
    if (biomeName !== this.lastBiomeName && biomeName !== '') {
      this.lastBiomeName = biomeName;
      this.triggerBiomeReaction(biomeName, monsterType, particleSystem);
    }

    if (this.emoteTimer > 0) {
      this.emoteTimer -= dt / 1000;
      if (this.emoteTimer <= 0) {
        this.emoteEmoji = undefined;
      }
    }
  }

  private triggerBiomeReaction(biomeName: string, monsterType: MonsterType, particleSystem?: ParticleSystem): void {
    const lowerBiome = biomeName.toLowerCase();
    let isPreferred = false;
    let emoji = '❤️';
    let colors = ['#ffcc00', '#ffffff'];

    if (monsterType === MonsterType.Fire && (lowerBiome.includes('mountain') || lowerBiome.includes('desert') || lowerBiome.includes('volcano'))) {
      isPreferred = true;
      emoji = '🔥';
      colors = ['#ff4500', '#ffaa00'];
    } else if (monsterType === MonsterType.Grass && (lowerBiome.includes('forest') || lowerBiome.includes('plains') || lowerBiome.includes('meadow'))) {
      isPreferred = true;
      emoji = '🌿';
      colors = ['#2ecc71', '#a8e6cf'];
    } else if (monsterType === MonsterType.Water && (lowerBiome.includes('water') || lowerBiome.includes('snow') || lowerBiome.includes('tundra') || lowerBiome.includes('coast'))) {
      isPreferred = true;
      emoji = '💧';
      colors = ['#3498db', '#74b9ff'];
    } else if (lowerBiome.includes('city')) {
      isPreferred = true;
      emoji = '✨';
      colors = ['#f1c40f', '#ffffff'];
    }

    if (isPreferred) {
      this.emoteEmoji = emoji;
      this.emoteTimer = 3.5; // Show emoji for 3.5s

      if (particleSystem) {
        particleSystem.emit(this.x + 8, this.y, 8, colors, 1.2, 12, 40, 'sparkle');
      }
    }
  }

  /** Render follower monster on screen */
  public render(
    ctx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    speciesId: number,
    speciesName: string,
    level: number,
    currentHp: number,
    maxHp: number,
    time: number
  ): void {
    const screenX = Math.round(this.x - offsetX);
    const screenY = Math.round(this.y - offsetY);

    MonsterRenderer.renderMonster(
      ctx,
      screenX,
      screenY,
      speciesId,
      speciesName,
      level,
      currentHp,
      maxHp,
      true, // isFollower
      this.emoteEmoji,
      time,
      this.moving,
      this.direction
    );
  }
}
