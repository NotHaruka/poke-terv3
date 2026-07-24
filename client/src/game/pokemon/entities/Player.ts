/** Player entity with movement, animation, and network sync */

import {
  Vec2, Direction, TILE_SIZE, PlayerState,
  PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_SPRINT_SPEED,
  DIAGONAL_NORMALIZER, PlayerProfile, PlayerData
} from 'poke-ter-shared';
import { InputManager } from '../../../engine/input/InputManager.js';
import { CollisionSystem } from '../../../engine/physics/Collision.js';

import { envSystem } from '../../../engine/physics/EnvironmentSystem.js';
import { PlayerRenderer } from '../../../engine/renderer/PlayerRenderer.js';

export class Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number = 0;
  targetSpeed: number = 0;
  maxSpeed: number = PLAYER_WALK_SPEED;
  state: PlayerState = PlayerState.Walking;
  direction: Direction = 'down';
  moving = false;
  profile?: PlayerProfile;
  party: import('poke-ter-shared').MonsterInstance[] = [];
  money: number = 500;
  inventory: { itemId: number; quantity: number }[] = [
    { itemId: 1, quantity: 10 },
    { itemId: 3, quantity: 5 }
  ];
  hasStarter: boolean = false;
  activeFollowerIndex: number = 0;
  currentMap: string = 'city';
  pokedex: number[] = [];
  badges: number = 0;
  boxes: import('poke-ter-shared').MonsterInstance[][] = Array(8).fill([]);
  storyFlags: Record<string, boolean> = {};

  private inputManager: InputManager;
  private collisionSystem: CollisionSystem;

  constructor(
    x: number,
    y: number,
    inputManager: InputManager,
    collisionSystem: CollisionSystem,
    profile?: PlayerProfile
  ) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE;
    this.height = TILE_SIZE;
    this.inputManager = inputManager;
    this.collisionSystem = collisionSystem;
    this.profile = profile;
  }

  getPlayerData(id: string, username: string): PlayerData {
    return {
      id,
      username,
      profile: this.profile || { name: username, bodyType: 'male', hairStyle: 'Short', hairColor: '#333', skinTone: '#fcdcb8', eyeColor: '#333', shirtColor: '#fff', pantsColor: '#333', shoesColor: '#fff', hatType: 'None', backpackType: 'Standard' },
      position: { x: this.x, y: this.y },
      direction: this.direction,
      speed: this.speed,
      money: this.money,
      party: this.party,
      boxes: this.boxes,
      inventory: this.inventory,
      pokedex: this.pokedex,
      badges: this.badges,
      currentMap: this.currentMap,
      storyFlags: this.storyFlags
    };
  }

  loadPlayerData(data: PlayerData): void {
    if (data.profile) this.profile = data.profile;
    this.x = data.position.x;
    this.y = data.position.y;
    this.direction = data.direction;
    this.money = data.money || 0;
    this.party = data.party || [];
    this.boxes = data.boxes || Array(8).fill([]);
    this.inventory = data.inventory || [];
    this.pokedex = data.pokedex || [];
    this.badges = data.badges || 0;
    this.currentMap = data.currentMap || 'city';
    this.storyFlags = data.storyFlags || {};
    this.hasStarter = this.party.length > 0;
  }

  update(dt: number): void {
    if (
      this.state === PlayerState.MenuOpen ||
      this.state === PlayerState.Cutscene ||
      this.state === PlayerState.Interacting ||
      this.state === PlayerState.Battling
    ) {
      this.moving = false;
      this.speed = 0;
      this.targetSpeed = 0;
      return; // Do not process movement if input is disabled
    }

    const dtFactor = dt / 16.667; // Normalize to 60fps

    // Determine target speed based on shift
    if (this.inputManager.isShiftHeld()) {
      this.maxSpeed = PLAYER_WALK_SPEED * 1.5; // ~1.5x walking speed for running
      if (this.state !== PlayerState.BattleRequestPending) {
        this.state = PlayerState.Running;
      }
    } else {
      this.maxSpeed = PLAYER_WALK_SPEED;
      if (this.state !== PlayerState.BattleRequestPending) {
        this.state = PlayerState.Walking;
      }
    }

    // Get input direction
    let dx = 0, dy = 0;
    if (this.inputManager.isDown('ArrowUp') || this.inputManager.isDown('KeyW')) dy -= 1;
    if (this.inputManager.isDown('ArrowDown') || this.inputManager.isDown('KeyS')) dy += 1;
    if (this.inputManager.isDown('ArrowLeft') || this.inputManager.isDown('KeyA')) dx -= 1;
    if (this.inputManager.isDown('ArrowRight') || this.inputManager.isDown('KeyD')) dx += 1;

    // Smooth acceleration / deceleration
    const acceleration = 0.4; 
    const deceleration = 0.3;

    if (dx !== 0 || dy !== 0) {
      this.targetSpeed = this.maxSpeed;
      this.speed += acceleration * dtFactor;
      if (this.speed > this.targetSpeed) this.speed = this.targetSpeed;
    } else {
      this.targetSpeed = 0;
      this.speed -= deceleration * dtFactor;
      if (this.speed < 0) this.speed = 0;
    }

    this.moving = this.speed > 0;

    if (this.moving) {
      // If we don't have active input but are still moving (decelerating), keep moving in last direction
      // However, if we do have input, use it and update direction
      let moveDx = dx;
      let moveDy = dy;
      
      if (dx === 0 && dy === 0) {
        // Continue moving in the facing direction during deceleration
        if (this.direction.includes('left')) moveDx -= 1;
        if (this.direction.includes('right')) moveDx += 1;
        if (this.direction.includes('up')) moveDy -= 1;
        if (this.direction.includes('down')) moveDy += 1;
      } else {
        this.updateDirection(dx, dy);
      }

      // Normalize diagonal movement
      if (moveDx !== 0 && moveDy !== 0) {
        moveDx *= DIAGONAL_NORMALIZER;
        moveDy *= DIAGONAL_NORMALIZER;
      }

      // Calculate desired position
      const moveX = moveDx * this.speed * dtFactor;
      const moveY = moveDy * this.speed * dtFactor;
      
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

  static renderTrainer(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    direction: Direction,
    moving: boolean,
    speed: number,
    x: number,
    profile?: PlayerProfile,
    username?: string
  ): void {
    PlayerRenderer.render(
      ctx,
      screenX,
      screenY,
      direction,
      moving,
      speed,
      x,
      profile,
      username
    );
  }

  /** Render the player */
  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const screenX = Math.round(this.x - offsetX);
    const screenY = Math.round(this.y - offsetY);

    Player.renderTrainer(
      ctx, screenX, screenY, this.direction, this.moving, this.speed, this.x, this.profile, this.profile?.name
    );
  }
}