/** Main overworld exploration scene */

import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { Camera } from '../../engine/Camera.js';
import { CollisionSystem, Collider } from '../../engine/Collision.js';
import { ParticleSystem } from '../../engine/ParticleSystem.js';
import { Player } from '../entities/Player.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { UIManager } from '../ui/UIManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
import { envSystem } from '../../engine/EnvironmentSystem.js';
import { AudioManager } from '../../engine/AudioManager.js';
import { MenuManager } from '../ui/menus/MenuManager.js';
import { ClockManager } from '../ui/menus/ClockManager.js';
import { MainMenu } from '../ui/menus/MainMenu.js';
import { BackpackMenu } from '../ui/menus/BackpackMenu.js';
import { PokedexMenu } from '../ui/menus/PokedexMenu.js';
import { PartyMenu } from '../ui/menus/PartyMenu.js';
import { PlayerCardMenu } from '../ui/menus/PlayerCardMenu.js';
import { OutfitMenu } from '../ui/menus/OutfitMenu.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PacketType,
  WelcomePacket,
  MapChangeResponsePacket,
  MapChangeRequestPacket,
  PlayerSnapshot,
  PlayerJoinPacket,
  PlayerLeavePacket,
  PlayerMovePacket,
  getBiomeAt,
  getNPCsForMap,
  NPCDefinition
} from 'poke-ter-shared';

import { NPCRenderer } from '../../engine/rendering/NPCRenderer.js';
import { PlayerRenderer } from '../../engine/rendering/PlayerRenderer.js';
import { UIRenderer } from '../../engine/rendering/UIRenderer.js';

import { BuildingManager } from '../../engine/buildings/BuildingManager.js';
import { InteriorManager } from '../../engine/interiors/InteriorManager.js';
import { TransitionManager } from '../../engine/doors/TransitionManager.js';
import { DoorSystem } from '../../engine/doors/DoorSystem.js';

export class OverworldScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private camera: Camera;
  private collisionSystem: CollisionSystem;
  private particleSystem: ParticleSystem;
  private player: Player;
  private chunkManager: ChunkManager;
  private uiManager: UIManager;
  private networkClient: NetworkClient | null;
  private audioManager: AudioManager | null = null;
  private debugMode = false;

  // Pokémon-style Building & Interior System
  private buildingManager: BuildingManager;
  private interiorManager: InteriorManager;
  private transitionManager: TransitionManager;
  private doorSystem: DoorSystem;
  
  // Banner state
  private currentMapId: string = 'city';
  private bannerAlpha: number = 0;
  private bannerTimer: number = 0;

  // NPC and Collision lists
  private npcs: NPCDefinition[] = [];
  private npcColliders: Collider[] = [];

  // Multiplayer player list
  private otherPlayers = new Map<string, PlayerSnapshot>();

  // Biome discovery tracking
  private lastBiomeName: string = '';

  // Dialogue system state
  private isDialogueActive: boolean = false;
  private activeDialogueLines: { speaker: string; text: string }[] = [];
  private currentDialogueIndex: number = -1;
  private activeNPC: NPCDefinition | null = null;

  // Warp control
  private isWarping: boolean = false;

  // Menus
  private menuManager: MenuManager;
  private clockManager: ClockManager;
  private playTimeMs: number = 0;

  constructor(renderer: Renderer, inputManager: InputManager, networkClient: NetworkClient | null = null, audioManager: AudioManager | null = null, profile?: import('poke-ter-shared').PlayerProfile) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.audioManager = audioManager;
    this.camera = new Camera();
    this.collisionSystem = new CollisionSystem();
    this.particleSystem = new ParticleSystem();
    this.player = new Player(128 * 16, 128 * 16, inputManager, this.collisionSystem, profile);
    this.chunkManager = new ChunkManager(this.collisionSystem);
    this.uiManager = new UIManager(renderer.getContext());
    this.menuManager = new MenuManager(inputManager, this.player, this.audioManager);
    this.clockManager = new ClockManager();

    // Initialize Building & Interior Systems
    this.buildingManager = new BuildingManager(this.collisionSystem);
    this.interiorManager = new InteriorManager(this.collisionSystem);
    this.transitionManager = new TransitionManager();
    this.doorSystem = new DoorSystem(
      this.buildingManager,
      this.interiorManager,
      this.transitionManager,
      this.audioManager,
      this.networkClient,
      this.player,
      this.camera
    );
    
    if (this.networkClient) {
      this.networkClient.on(PacketType.Welcome, this.onWelcome);
      this.networkClient.on(PacketType.MapChangeResponse, this.onMapChange);
      this.networkClient.on(PacketType.PlayerJoin, this.onPlayerJoin);
      this.networkClient.on(PacketType.PlayerLeave, this.onPlayerLeave);
      this.networkClient.on(PacketType.PlayerMove, this.onPlayerMove);
      this.networkClient.on(PacketType.PlayerPos, this.onPlayerPos);
    }
  }

  private onPlayerPos = (packet: any): void => {
    const pos = packet as import('poke-ter-shared').PlayerPosPacket;
    this.player.x = pos.position.x;
    this.player.y = pos.position.y;
    this.player.direction = pos.direction as import('poke-ter-shared').Direction;
  };

  private onWelcome = (packet: any): void => {
    const welcome = packet as WelcomePacket;
    this.chunkManager.setSeed(welcome.seed);
    this.player.x = welcome.position.x;
    this.player.y = welcome.position.y;
    this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());
    if (welcome.serverStartTime) {
      this.clockManager.setServerStartTime(welcome.serverStartTime);
    }
    
    // Process initial other players
    this.otherPlayers.clear();
    if (welcome.players) {
      for (const op of welcome.players) {
        if (op.id !== welcome.playerId) {
          this.otherPlayers.set(op.id, op);
        }
      }
    }

    this.setMap(welcome.mapId);
  };

  private onMapChange = (packet: any): void => {
    const res = packet as MapChangeResponsePacket;
    this.chunkManager.setSeed(res.seed);
    this.player.x = res.position.x;
    this.player.y = res.position.y;
    this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());
    
    // Reload other players for this map
    this.otherPlayers.clear();
    if (res.players) {
      for (const op of res.players) {
        if (op.id !== this.networkClient?.getId()) {
          this.otherPlayers.set(op.id, op);
        }
      }
    }

    this.setMap(res.mapId);
  };

  private onPlayerJoin = (packet: any): void => {
    const p = (packet as PlayerJoinPacket).player;
    if (p.id !== this.networkClient?.getId()) {
      this.otherPlayers.set(p.id, p);
    }
  };

  private onPlayerLeave = (packet: any): void => {
    const id = (packet as PlayerLeavePacket).playerId;
    this.otherPlayers.delete(id);
  };

  private onPlayerMove = (packet: any): void => {
    const move = packet as PlayerMovePacket;
    if (move.playerId === this.networkClient?.getId()) return;
    const op = this.otherPlayers.get(move.playerId);
    if (op) {
      op.position = move.position;
      op.direction = move.direction;
    } else {
      this.otherPlayers.set(move.playerId, {
        id: move.playerId,
        username: 'Trainer',
        position: move.position,
        direction: move.direction,
      });
    }
  };

  private setMap(mapId: string) {
    this.currentMapId = mapId;
    this.chunkManager.currentMapId = mapId;
    this.chunkManager.clear(); // Clean slate

    // If map is an interior map
    if (mapId.includes('interior')) {
      const interior = this.interiorManager.loadInterior(mapId);
      this.npcs = interior ? interior.npcs : [];
      this.doorSystem.isInInterior = true;
    } else {
      // Overworld Map
      const seed = this.chunkManager.currentSeed;
      this.doorSystem.setSeed(seed);
      this.buildingManager.setMap(mapId, seed);
      this.interiorManager.unloadCurrent();
      this.doorSystem.isInInterior = false;

      this.npcs = getNPCsForMap(mapId, seed);
    }

    // Clear old npc colliders from collision system
    for (const c of this.npcColliders) {
      this.collisionSystem.remove(c);
    }
    this.npcColliders = [];

    // Add new npc colliders
    for (const npc of this.npcs) {
      const collider: Collider = {
        x: npc.position.x,
        y: npc.position.y,
        width: 16,
        height: 16,
        solid: true,
        group: 'npc',
      };
      this.npcColliders.push(collider);
      this.collisionSystem.add(collider);
    }

    this.bannerAlpha = 1;
    this.bannerTimer = 3; // Show for 3 seconds
    this.updateBackgroundMusic();
  }

  private updateBackgroundMusic() {
    if (!this.audioManager) return;

    if (this.doorSystem.isInInterior) {
      const interior = this.interiorManager.getActiveInterior();
      if (interior && interior.music) {
        this.audioManager.playMusic(interior.music);
        return;
      }
    }

    if (this.currentMapId === 'city') {
      this.audioManager.playMusic('/morning_in_the_village.mp3');
    } else {
      this.audioManager.playMusic('/lanterns_at_home.mp3');
    }
  }

  init(): void {
    this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());
    this.setMap(this.currentMapId);
  }

  private getNPCInFront(): NPCDefinition | null {
    const px = this.player.x;
    const py = this.player.y;
    
    // Check interior NPCs or Overworld NPCs
    const activeNpcs = this.doorSystem.isInInterior 
      ? (this.interiorManager.getActiveInterior()?.npcs || [])
      : this.npcs;

    for (const npc of activeNpcs) {
      const dx = npc.position.x - px;
      const dy = npc.position.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If we are close enough to interact (within ~1.5 tiles / 24 pixels in overworld, or ~2.8 tiles / 45 pixels in interiors to reach across counters)
      const maxDistance = this.doorSystem.isInInterior ? 45 : 24;
      if (distance < maxDistance) {
        const dir = this.player.direction;
        
        // Lenient directional check: are they facing towards the NPC?
        if (dir.includes('up') && dy < -4) return npc;
        if (dir.includes('down') && dy > 4) return npc;
        if (dir.includes('left') && dx < -4) return npc;
        if (dir.includes('right') && dx > 4) return npc;
        
        // Fallback: if they are extremely close, allow interaction
        if (distance < 18) return npc;
      }
    }
    return null;
  }

  private warpToMap(targetMapId: string) {
    this.isWarping = true;
    this.networkClient?.send({
      type: PacketType.MapChangeRequest,
      targetMapId,
      timestamp: Date.now()
    } as MapChangeRequestPacket);
    setTimeout(() => {
      this.isWarping = false;
    }, 1500);
  }

  update(dt: number): void {
    this.playTimeMs += dt;
    this.clockManager.update(dt);
    this.transitionManager.update(dt);
    
    // Process menu update
    this.menuManager.update(dt);
    
    // Toggle menu
    if (this.inputManager.justPressed('KeyE') && !this.isDialogueActive && !this.menuManager.isOpen()) {
      this.menuManager.openMenu(new MainMenu((option) => {
        if (option === 'Backpack') {
          this.menuManager.openMenu(new BackpackMenu());
        } else if (option === 'Data Log') {
          this.menuManager.openMenu(new PokedexMenu(this.player));
        } else if (option === 'Monster Party') {
          this.menuManager.openMenu(new PartyMenu(this.player));
        } else if (option === 'Player Card') {
          this.menuManager.openMenu(new PlayerCardMenu(this.player, this.clockManager, () => this.playTimeMs));
        } else if (option === 'Save') {
          console.log('Save architecture ready.');
        } else if (option === 'Exit') {
          // Do nothing
        }
      }));
    }

    envSystem.update(dt);
    this.particleSystem.update(dt);
    
    if (this.doorSystem.isInInterior) {
      this.interiorManager.update(dt);
    } else {
      this.buildingManager.update(dt);
    }

    // Door system trigger checks
    this.doorSystem.update();

    // Spawn environmental particles
    if (Math.random() < 0.1 && !this.doorSystem.isInInterior) {
      const pX = this.camera.getX() + Math.random() * GAME_WIDTH;
      const pY = this.camera.getY() + Math.random() * GAME_HEIGHT;
      if (this.lastBiomeName.toLowerCase().includes('forest')) {
        this.particleSystem.emit(pX, pY, 1, ['#8bbf40', '#6aa32a'], 0.5, 20, 60, 'leaf');
      } else if (this.lastBiomeName.toLowerCase().includes('frozen') || this.lastBiomeName.toLowerCase().includes('tundra')) {
        this.particleSystem.emit(pX, pY, 1, ['#ffffff', '#e8f2f8'], 0.6, 15, 50, 'dust');
      } else if (this.lastBiomeName.toLowerCase().includes('city')) {
        this.particleSystem.emit(pX, pY, 1, ['#888888', '#555555'], 0.2, 5, 80, 'dust');
      }
    }

    // Toggle debug mode
    if (this.inputManager.justPressed('F3')) {
      this.debugMode = !this.debugMode;
    }

    // Dialogue State Machine
    if (this.isDialogueActive) {
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        this.currentDialogueIndex++;
        if (this.currentDialogueIndex >= this.activeDialogueLines.length) {
          this.isDialogueActive = false;
          if (this.activeNPC && (this.activeNPC.sprite === 'stylist' || this.activeNPC.name.includes('Stylist'))) {
            this.menuManager.openMenu(new OutfitMenu(this.player, (updatedProfile) => {
              if (this.networkClient) {
                this.networkClient.setProfile(updatedProfile.name);
              }
            }));
          }
          this.activeNPC = null;
        }
      }
    } else {
      // Player movement update (locked during transition)
      if (!this.transitionManager.isTransitioning()) {
        this.player.update(dt);
      }

      // Check NPC / Furniture interactions
      if (!this.menuManager.isOpen() && (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter'))) {
        // 1. Check NPC interaction
        const npc = this.getNPCInFront();
        if (npc) {
          this.isDialogueActive = true;
          this.activeNPC = npc;
          this.activeDialogueLines = npc.dialogues[0];
          this.currentDialogueIndex = 0;

          switch (this.player.direction) {
            case 'up': npc.direction = 'down'; break;
            case 'down': npc.direction = 'up'; break;
            case 'left': npc.direction = 'right'; break;
            case 'right': npc.direction = 'left'; break;
          }
        } else if (this.doorSystem.isInInterior) {
          // 2. Check Interior Furniture interaction
          const pGx = Math.floor(this.player.getCenterX() / 16);
          const pGy = Math.floor(this.player.getCenterY() / 16);
          // Look 1 tile ahead based on player direction
          let checkGx = pGx;
          let checkGy = pGy;
          if (this.player.direction === 'up') checkGy--;
          else if (this.player.direction === 'down') checkGy++;
          else if (this.player.direction === 'left') checkGx--;
          else if (this.player.direction === 'right') checkGx++;

          const furniture = this.interiorManager.getInteractableFurniture(checkGx, checkGy);
          if (furniture && furniture.interactionText) {
            this.isDialogueActive = true;
            this.activeNPC = null;
            const textLines = Array.isArray(furniture.interactionText) ? furniture.interactionText : [furniture.interactionText];
            this.activeDialogueLines = textLines.map(t => ({ speaker: furniture.name, text: t }));
            this.currentDialogueIndex = 0;

            if (this.audioManager) {
              this.audioManager.playSound('open');
            }

            // If Healing Machine, heal party
            if (furniture.type === 'healing_machine' && this.player.party) {
              for (const m of this.player.party) {
                m.currentHp = m.maxHp;
                m.status = 0;
              }
            }
          }
        }
      }

      // Gateway portal tile checks (Overworld portals)
      if (!this.doorSystem.isInInterior) {
        const gx = Math.floor(this.player.x / 16);
        const gy = Math.floor(this.player.y / 16);
        
        if (!this.menuManager.isOpen() && this.networkClient && this.networkClient.isConnected() && !this.isWarping) {
          const currentTile = this.chunkManager.getTile(this.player.getCenterX(), this.player.getCenterY());
          if (currentTile === 10) {
            if (this.currentMapId === 'city') {
              if (gy < 100) this.warpToMap('route_1');
              else if (gy > 140) this.warpToMap('route_2');
              else if (gx > 140) this.warpToMap('route_3');
              else if (gx < 110) this.warpToMap('route_4');
            } else {
              this.warpToMap('city');
            }
          }
        }
      }
    }

    // Dynamic Biome Discovery
    if (!this.doorSystem.isInInterior) {
      const currentSeed = this.chunkManager.currentSeed;
      const playerGx = Math.floor(this.player.x / 16);
      const playerGy = Math.floor(this.player.y / 16);
      const currentBiome = getBiomeAt(playerGx, playerGy, currentSeed);
      
      if (currentBiome.name !== this.lastBiomeName) {
        this.lastBiomeName = currentBiome.name;
        this.bannerAlpha = 1;
        this.bannerTimer = 3.5;
      }
    }

    // Sync input actions back to server
    if (this.networkClient && this.networkClient.isConnected()) {
      let keysRecord = this.inputManager.getKeysRecord();
      if (this.menuManager.isOpen() || this.isDialogueActive || this.transitionManager.isTransitioning()) {
        keysRecord = {};
      }
      this.networkClient.sendInput(keysRecord, this.player.direction, { x: this.player.x, y: this.player.y });
    }

    // Banner fade logic
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) {
        this.bannerAlpha -= dt * 2;
        if (this.bannerAlpha <= 0) {
          this.bannerAlpha = 0;
        } else {
          this.bannerTimer = 0.01;
        }
      }
    }

    // Update chunks if in overworld
    if (!this.doorSystem.isInInterior) {
      this.chunkManager.update(this.player.getCenterX(), this.player.getCenterY());
    }

    // Camera follow
    this.camera.follow(this.player.getCenterX(), this.player.getCenterY());
    this.camera.update(dt);

    this.inputManager.update();
  }

  render(): void {
    const ctx = this.renderer.getContext();
    const offsetX = this.camera.getOffsetX();
    const offsetY = this.camera.getOffsetY();

    this.renderer.clear('#1a1a2e');

    type Drawable = { sortY: number; draw: () => void };
    const drawables: Drawable[] = [];

    if (this.doorSystem.isInInterior) {
      // 1. Render Interior Map
      this.interiorManager.render(ctx, offsetX, offsetY);

      // Interior NPCs
      for (const npc of this.npcs) {
        const screenX = Math.round(npc.position.x - offsetX);
        const screenY = Math.round(npc.position.y - offsetY);

        drawables.push({
          sortY: npc.position.y + 16,
          draw: () => {
            NPCRenderer.render(ctx, screenX, screenY, npc.direction, npc.position.x, npc.sprite, npc.name);
          },
        });
      }

      // Other interior players
      for (const [, op] of this.otherPlayers) {
        const screenX = Math.round(op.position.x - offsetX);
        const screenY = Math.round(op.position.y - offsetY);

        drawables.push({
          sortY: op.position.y + 16,
          draw: () => {
            PlayerRenderer.render(ctx, screenX, screenY, op.direction as import('poke-ter-shared').Direction, false, 0, op.position.x, op.profile, op.username);
          },
        });
      }

      // Player
      drawables.push({
        sortY: this.player.y + this.player.height,
        draw: () => this.player.render(ctx, offsetX, offsetY),
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw();

    } else {
      // 2. Render Overworld Map
      this.chunkManager.render(ctx, offsetX, offsetY);

      // Overhangs
      for (const overhang of this.chunkManager.getOverhangs(offsetX, offsetY)) {
        drawables.push({
          sortY: overhang.sortY,
          draw: () => this.chunkManager.renderOverhang(ctx, overhang.type, overhang.screenX, overhang.screenY, overhang.gx, overhang.gy),
        });
      }

      // Buildings
      for (const bDrawable of this.buildingManager.getDrawables(ctx, offsetX, offsetY)) {
        drawables.push(bDrawable);
      }

      // Overworld NPCs
      for (const npc of this.npcs) {
        const screenX = Math.round(npc.position.x - offsetX);
        const screenY = Math.round(npc.position.y - offsetY);
        if (screenX < -16 || screenX > GAME_WIDTH || screenY < -16 || screenY > GAME_HEIGHT) continue;

        drawables.push({
          sortY: npc.position.y + 16,
          draw: () => {
            NPCRenderer.render(ctx, screenX, screenY, npc.direction, npc.position.x, npc.sprite, npc.name);
          },
        });
      }

      // Other players
      for (const [, op] of this.otherPlayers) {
        const screenX = Math.round(op.position.x - offsetX);
        const screenY = Math.round(op.position.y - offsetY);
        if (screenX < -16 || screenX > GAME_WIDTH || screenY < -16 || screenY > GAME_HEIGHT) continue;

        drawables.push({
          sortY: op.position.y + 16,
          draw: () => {
            PlayerRenderer.render(ctx, screenX, screenY, op.direction as import('poke-ter-shared').Direction, false, 0, op.position.x, op.profile, op.username);
          },
        });
      }

      // Local player
      drawables.push({
        sortY: this.player.y + this.player.height,
        draw: () => this.player.render(ctx, offsetX, offsetY),
      });

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw();

      this.particleSystem.render(ctx, offsetX, offsetY);
    }

    // Dialogue Overlay UI
    if (this.isDialogueActive && this.activeDialogueLines.length > 0) {
      const currentLine = this.activeDialogueLines[this.currentDialogueIndex];
      if (currentLine) {
        this.uiManager.drawDialogue(ctx, currentLine.text, currentLine.speaker);
      }
    }

    // Location Banner
    if (this.bannerAlpha > 0 && !this.doorSystem.isInInterior) {
      const title = this.currentMapId === 'city' ? 'Permanent City' : 'Route ' + this.currentMapId.split('_')[1].toUpperCase();
      this.uiManager.drawLocationBanner(ctx, title, this.lastBiomeName, this.bannerAlpha);
    } else if (this.doorSystem.isInInterior && this.interiorManager.getActiveInterior()) {
      const activeInterior = this.interiorManager.getActiveInterior()!;
      this.uiManager.drawLocationBanner(ctx, activeInterior.name, 'Building Interior', this.bannerAlpha);
    }

    // Clock HUD
    ctx.fillStyle = 'rgba(15, 20, 35, 0.85)';
    ctx.fillRect(GAME_WIDTH - 64, 4, 60, 20);
    ctx.strokeStyle = '#4deeea';
    ctx.strokeRect(GAME_WIDTH - 64, 4, 60, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.clockManager.getTimeString(), GAME_WIDTH - 34, 15);

    // Render Menus
    this.menuManager.render(ctx);

    // Render Transition Screen Fade Overlay
    this.transitionManager.render(ctx);

    // Render debug info
    if (this.debugMode) {
      this.renderDebug(ctx);
    }
  }

  private renderDebug(ctx: CanvasRenderingContext2D): void {
    const musicStatus = this.audioManager ? (this.audioManager.musicVol > 0 ? `${Math.round(this.audioManager.musicVol * 100)}%` : 'MUTED') : 'N/A';
    const debugInfo = [
      `Map: ${this.currentMapId}`,
      `Pos: ${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`,
      `Dir: ${this.player.direction}`,
      `Biome: ${this.lastBiomeName}`,
      `Other Players: ${this.otherPlayers.size}`,
      `Music [N]: ${musicStatus}`,
    ];

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 130, debugInfo.length * 12 + 4);

    ctx.fillStyle = '#00ff00';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    for (let i = 0; i < debugInfo.length; i++) {
      ctx.fillText(debugInfo[i], 4, 4 + i * 12);
    }
  }

  destroy(): void {
    if (this.networkClient) {
      this.networkClient.off(PacketType.Welcome, this.onWelcome);
      this.networkClient.off(PacketType.MapChangeResponse, this.onMapChange);
      this.networkClient.off(PacketType.PlayerJoin, this.onPlayerJoin);
      this.networkClient.off(PacketType.PlayerLeave, this.onPlayerLeave);
      this.networkClient.off(PacketType.PlayerMove, this.onPlayerMove);
    }
    this.chunkManager.clear();
    this.collisionSystem.clear();
  }
}