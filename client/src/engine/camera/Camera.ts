/** Camera system with smooth follow */

import { GAME_WIDTH, GAME_HEIGHT, CAMERA_SMOOTH_SPEED } from 'poke-ter-shared';

export class Camera {
  private x = 0;
  private y = 0;
  private targetX = 0;
  private targetY = 0;
  private width: number;
  private height: number;
  private smoothSpeed: number;

  constructor(width: number = GAME_WIDTH, height: number = GAME_HEIGHT, smoothSpeed: number = CAMERA_SMOOTH_SPEED) {
    this.width = width;
    this.height = height;
    this.smoothSpeed = smoothSpeed;
  }

  /** Set the target position for the camera to follow */
  follow(targetX: number, targetY: number): void {
    this.targetX = targetX - this.width / 2;
    this.targetY = targetY - this.height / 2;
  }

  /** Immediately snap to a position */
  snapTo(x: number, y: number): void {
    this.x = x - this.width / 2;
    this.y = y - this.height / 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  /** Update camera position (smooth interpolation) */
  update(dt: number): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;

    // If close enough, snap
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      this.x = this.targetX;
      this.y = this.targetY;
      return;
    }

    // Smooth interpolation
    const t = 1 - Math.pow(1 - this.smoothSpeed, dt / 16.667);
    this.x += dx * t;
    this.y += dy * t;
  }

  /** Get the camera offset X (how much to subtract for world-to-screen) */
  getOffsetX(): number {
    return Math.round(this.x);
  }

  /** Get the camera offset Y (how much to subtract for world-to-screen) */
  getOffsetY(): number {
    return Math.round(this.y);
  }

  /** Get camera X position */
  getX(): number {
    return this.x;
  }

  /** Get camera Y position */
  getY(): number {
    return this.y;
  }

  /** Get camera width */
  getWidth(): number {
    return this.width;
  }

  /** Get camera height */
  getHeight(): number {
    return this.height;
  }

  /** Convert world coordinates to screen coordinates */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.round(worldX - this.x),
      y: Math.round(worldY - this.y),
    };
  }

  /** Reset camera */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }
}