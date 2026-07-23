/**
 * DoorSystem validates entrance/exit step triggers, plays door SFX,
 * saves overworld positions, and seamlessly transfers the player into
 * or out of building interiors via the TransitionManager.
 */

import { BuildingManager } from '../buildings/BuildingManager.js';
import { InteriorManager } from '../interiors/InteriorManager.js';
import { TransitionManager } from './TransitionManager.js';
import { AudioManager } from '../AudioManager.js';
import { MusicManager } from '../MusicManager.js';
import { Player } from '../../game/entities/Player.js';
import { Camera } from '../Camera.js';
import { PacketType, findSafeSpawn } from 'poke-ter-shared';
import { NetworkClient } from '../../game/network/NetworkClient.js';

export interface SavedOverworldState {
  mapId: string;
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  seed?: number;
}

export class DoorSystem {
  private buildingManager: BuildingManager;
  private interiorManager: InteriorManager;
  private transitionManager: TransitionManager;
  private audioManager: AudioManager | null;
  private networkClient: NetworkClient | null;
  private player: Player;
  private camera: Camera;

  // Active scene mode tracking
  public isInInterior: boolean = false;
  public currentSeed: number = 0;
  public savedOverworldState: SavedOverworldState | null = null;
  private lastTriggerTile: { x: number; y: number } | null = null;

  constructor(
    buildingManager: BuildingManager,
    interiorManager: InteriorManager,
    transitionManager: TransitionManager,
    audioManager: AudioManager | null,
    networkClient: NetworkClient | null,
    player: Player,
    camera: Camera
  ) {
    this.buildingManager = buildingManager;
    this.interiorManager = interiorManager;
    this.transitionManager = transitionManager;
    this.audioManager = audioManager;
    this.networkClient = networkClient;
    this.player = player;
    this.camera = camera;
  }

  public setSeed(seed: number): void {
    this.currentSeed = seed;
  }

  public update(): void {
    if (this.transitionManager.isTransitioning()) return;

    const gx = Math.floor(this.player.getCenterX() / 16);
    const gy = Math.floor(this.player.getCenterY() / 16);

    // Prevent re-triggering on the exact same tile while standing still
    if (this.lastTriggerTile && this.lastTriggerTile.x === gx && this.lastTriggerTile.y === gy) {
      return;
    }

    if (!this.isInInterior) {
      // 1. Check Overworld Building Entrance
      const entrance = this.buildingManager.getEntranceAt(gx, gy);
      if (entrance) {
        this.lastTriggerTile = { x: gx, y: gy };
        this.enterBuilding(entrance.definition.interiorMapId, entrance.building.mapId, gx, gy);
      } else {
        this.lastTriggerTile = null;
      }
    } else {
      // 2. Check Interior Exit Doormat
      if (this.interiorManager.isExitTile(gx, gy)) {
        this.lastTriggerTile = { x: gx, y: gy };
        this.exitBuilding();
      } else {
        this.lastTriggerTile = null;
      }
    }
  }

  /** Enter building interior */
  public enterBuilding(
    interiorMapId: string,
    currentOverworldMapId: string,
    entranceGx: number,
    entranceGy: number
  ): void {
    if (this.transitionManager.isTransitioning()) return;

    // Door Open Sound Effect
    if (this.audioManager) {
      this.audioManager.playSound('open');
    }

    // Save overworld position right outside doorway facing down
    this.savedOverworldState = {
      mapId: currentOverworldMapId,
      x: entranceGx * 16,
      y: (entranceGy + 1) * 16,
      direction: 'down',
      seed: this.currentSeed,
    };

    const targetMapId = currentOverworldMapId && !interiorMapId.includes(':')
      ? `${currentOverworldMapId}:${interiorMapId}`
      : interiorMapId;

    this.transitionManager.startTransition(() => {
      // Load Interior Map
      const interior = this.interiorManager.loadInterior(interiorMapId);
      if (!interior) return;

      this.isInInterior = true;

      // Spawn Player inside interior
      const spawnX = interior.entranceSpawn.tileX * 16;
      const spawnY = interior.entranceSpawn.tileY * 16;
      this.player.x = spawnX;
      this.player.y = spawnY;
      this.player.direction = interior.entranceSpawn.direction || 'up';

      // Snap Camera to player
      this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());

      // Update background music if interior defines its own track
      const musicManager = MusicManager.getInstance();
      if (musicManager) {
        musicManager.updateState({ interior: interiorMapId });
      } else if (this.audioManager && interior.music) {
        this.audioManager.playMusic(interior.music);
      }

      // Sync map change to multiplayer server
      if (this.networkClient && this.networkClient.isConnected()) {
        this.networkClient.send({
          type: PacketType.MapChangeRequest,
          targetMapId: targetMapId,
          spawnX: spawnX,
          spawnY: spawnY,
          spawnDirection: this.player.direction,
          timestamp: Date.now(),
        });
      }
    });
  }

  /** Exit building interior back to overworld */
  public exitBuilding(): void {
    if (this.transitionManager.isTransitioning()) return;

    // Door Close Sound Effect
    if (this.audioManager) {
      this.audioManager.playSound('close');
    }

    const savedState = this.savedOverworldState || {
      mapId: 'city',
      x: 117 * 16,
      y: 113 * 16,
      direction: 'down' as const,
    };

    this.transitionManager.startTransition(() => {
      // Unload active interior
      this.interiorManager.unloadCurrent();
      this.isInInterior = false;

      // Restore overworld map buildings
      this.buildingManager.setMap(savedState.mapId, savedState.seed || 0);

      // Spawn player outside door
      const safePos = findSafeSpawn(savedState.seed || 0, savedState.x, savedState.y, savedState.mapId);
      this.player.x = safePos.x;
      this.player.y = safePos.y;
      this.player.direction = savedState.direction;

      // Snap Camera
      this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());

      // Restore Overworld BGM
      const musicManager = MusicManager.getInstance();
      if (musicManager) {
        musicManager.updateState({
          interior: null,
          route: savedState.mapId,
          town: savedState.mapId === 'city' ? 'city' : 'route'
        });
      } else if (this.audioManager) {
        const music = savedState.mapId === 'city' ? '/morning_in_the_village.mp3' : '/lanterns_at_home.mp3';
        this.audioManager.playMusic(music);
      }

      // Sync map change back to overworld map on server
      if (this.networkClient && this.networkClient.isConnected()) {
        this.networkClient.send({
          type: PacketType.MapChangeRequest,
          targetMapId: savedState.mapId,
          spawnX: savedState.x,
          spawnY: savedState.y,
          spawnDirection: savedState.direction,
          timestamp: Date.now(),
        });
      }
    });
  }
}
