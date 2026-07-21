/** Player entity with movement, animation, and network sync */

import {
  Vec2, Direction, TILE_SIZE,
  PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_SPRINT_SPEED,
  DIAGONAL_NORMALIZER,
} from 'poke-ter-shared';
import { InputManager } from '../../engine/InputManager.js';
import { CollisionSystem } from '../../engine/Collision.js';

import { envSystem } from '../../engine/EnvironmentSystem.js';

export class Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  direction: Direction = 'down';
  moving = false;
  private inputManager: InputManager;
  private collisionSystem: CollisionSystem;

  constructor(
    x: number,
    y: number,
    inputManager: InputManager,
    collisionSystem: CollisionSystem,
  ) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;
    this.speed = PLAYER_WALK_SPEED;
    this.inputManager = inputManager;
    this.collisionSystem = collisionSystem;
  }

  update(dt: number): void {
    const dtFactor = dt / 16.667; // Normalize to 60fps

    // Determine speed
    if (this.inputManager.isShiftHeld()) {
      this.speed = PLAYER_SPRINT_SPEED;
    } else {
      this.speed = PLAYER_WALK_SPEED;
    }

    // Get input direction
    let dx = 0, dy = 0;
    if (this.inputManager.isDown('ArrowUp') || this.inputManager.isDown('KeyW')) dy -= 1;
    if (this.inputManager.isDown('ArrowDown') || this.inputManager.isDown('KeyS')) dy += 1;
    if (this.inputManager.isDown('ArrowLeft') || this.inputManager.isDown('KeyA')) dx -= 1;
    if (this.inputManager.isDown('ArrowRight') || this.inputManager.isDown('KeyD')) dx += 1;

    this.moving = dx !== 0 || dy !== 0;

    if (this.moving) {
      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        dx *= DIAGONAL_NORMALIZER;
        dy *= DIAGONAL_NORMALIZER;
      }

      // Calculate desired position
      const moveX = dx * this.speed * dtFactor;
      const moveY = dy * this.speed * dtFactor;
      
      // Use a centered smaller collision box (10x10) for smooth navigation of 1x1 gaps and doors
      const colW = 10;
      const colH = 10;
      const colOffsetX = 3;
      const colOffsetY = 3;

      const currentColX = this.x + colOffsetX;
      const currentColY = this.y + colOffsetY;
      const targetColX = Math.max(0, Math.min(4096 - colW, currentColX + moveX));
      const targetColY = Math.max(0, Math.min(4096 - colH, currentColY + moveY));

      // Try to move with collision
      const result = this.collisionSystem.tryMove(
        currentColX, currentColY,
        targetColX, targetColY,
        colW, colH,
      );

      this.x = result.x - colOffsetX;
      this.y = result.y - colOffsetY;

      // Update direction based on input
      this.updateDirection(dx, dy);
    }
  }

  private updateDirection(dx: number, dy: number): void {
    if (dx < 0 && dy < 0) this.direction = 'up-left';
    else if (dx > 0 && dy < 0) this.direction = 'up-right';
    else if (dx < 0 && dy > 0) this.direction = 'down-left';
    else if (dx > 0 && dy > 0) this.direction = 'down-right';
    else if (dy < 0) this.direction = 'up';
    else if (dy > 0) this.direction = 'down';
    else if (dx < 0) this.direction = 'left';
    else if (dx > 0) this.direction = 'right';
  }

  /** Get the center position of the player */
  getCenterX(): number {
    return this.x + this.width / 2;
  }

  /** Get the center position of the player */
  getCenterY(): number {
    return this.y + this.height / 2;
  }

  /** Get position as Vec2 */
  getPosition(): Vec2 {
    return { x: this.x, y: this.y };
  }

  /** Set position */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** Render the player */
  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const screenX = Math.round(this.x - offsetX);
    const screenY = Math.round(this.y - offsetY);

    // Draw player shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(screenX + 8, screenY + 15, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw player body
    ctx.fillStyle = '#1e5b9e'; // pants
    ctx.fillRect(screenX + 3, screenY + 10, 10, 6);
    let breathOffset = (!this.moving && Math.sin(envSystem.time * 0.003 + this.x * 0.1) > 0.5) ? 1 : 0; const upperY = screenY + breathOffset; ctx.fillStyle = '#3a8be8';
    ctx.fillRect(screenX + 3, upperY + 4, 10, 6);
    // head
    ctx.fillStyle = '#ffccaa'; // skin
    ctx.fillRect(screenX + 4, upperY - 2, 8, 6);
    // hair/hat
    ctx.fillStyle = '#cc2222'; // hat
    ctx.fillRect(screenX + 3, upperY - 4, 10, 3);
    if (this.direction === 'left' || this.direction === 'down-left' || this.direction === 'up-left') {
        ctx.fillRect(screenX + 1, upperY - 2, 4, 2); // brim left
    } else if (this.direction === 'right' || this.direction === 'down-right' || this.direction === 'up-right') {
        ctx.fillRect(screenX + 11, upperY - 2, 4, 2); // brim right
    } else if (this.direction === 'down') {
        ctx.fillRect(screenX + 3, upperY - 2, 10, 2); // brim forward
    }

    // Draw direction indicator (eyes)
    ctx.fillStyle = '#000000';
    const eyeSize = 2;
    switch (this.direction) {
      case 'up':
        // no eyes facing away
        break;
      case 'down':
        ctx.fillRect(screenX + 5, upperY, eyeSize, eyeSize);
        ctx.fillRect(screenX + 9, upperY, eyeSize, eyeSize);
        break;
      case 'left':
      case 'down-left':
      case 'up-left':
        ctx.fillRect(screenX + 4, upperY, eyeSize, eyeSize);
        break;
      case 'right':
      case 'down-right':
      case 'up-right':
        ctx.fillRect(screenX + 10, upperY, eyeSize, eyeSize);
        break;
    }
  }
}