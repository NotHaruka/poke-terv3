/** Main overworld exploration scene */

import { Scene } from '../../engine/SceneManager.js';
import { Renderer } from '../../engine/Renderer.js';
import { InputManager } from '../../engine/InputManager.js';
import { Camera } from '../../engine/Camera.js';
import { CollisionSystem, Collider } from '../../engine/Collision.js';
import { Player } from '../entities/Player.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { UIManager } from '../ui/UIManager.js';
import { NetworkClient } from '../network/NetworkClient.js';
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

export class OverworldScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private camera: Camera;
  private collisionSystem: CollisionSystem;
  private player: Player;
  private chunkManager: ChunkManager;
  private uiManager: UIManager;
  private networkClient: NetworkClient | null;
  private debugMode = false;
  
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

  // Warp control
  private isWarping: boolean = false;

  constructor(renderer: Renderer, inputManager: InputManager, networkClient: NetworkClient | null = null) {
    this.renderer = renderer;
    this.inputManager = inputManager;
    this.networkClient = networkClient;
    this.camera = new Camera();
    this.collisionSystem = new CollisionSystem();
    this.player = new Player(128 * 16, 128 * 16, inputManager, this.collisionSystem);
    this.chunkManager = new ChunkManager(this.collisionSystem);
    this.uiManager = new UIManager(renderer.getContext());
    
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
    this.chunkManager.clear(); // Clean slate to regenerate tiles and colliders for the new map!
    const seed = this.chunkManager.currentSeed;

    // Load deterministic NPCs
    this.npcs = getNPCsForMap(mapId, seed);

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
  }

  init(): void {
    this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());
  }

  private getNPCInFront(): NPCDefinition | null {
    const px = this.player.x;
    const py = this.player.y;
    
    for (const npc of this.npcs) {
      const dx = npc.position.x - px;
      const dy = npc.position.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // If we are close enough to interact (within ~1.5 tiles, 24 pixels)
      if (distance < 24) {
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
    // Toggle debug mode with F3
    if (this.inputManager.justPressed('F3')) {
      this.debugMode = !this.debugMode;
    }

    // Dialogue State Machine
    if (this.isDialogueActive) {
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        this.currentDialogueIndex++;
        if (this.currentDialogueIndex >= this.activeDialogueLines.length) {
          this.isDialogueActive = false;
        }
      }
    } else {
      // Normal update when no dialogue is blocking
      this.player.update(dt);

      // Check for dialogue trigger
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        const npc = this.getNPCInFront();
        if (npc) {
          this.isDialogueActive = true;
          this.activeDialogueLines = npc.dialogues[0];
          this.currentDialogueIndex = 0;

          // Face NPC towards the player
          switch (this.player.direction) {
            case 'up': npc.direction = 'down'; break;
            case 'down': npc.direction = 'up'; break;
            case 'left': npc.direction = 'right'; break;
            case 'right': npc.direction = 'left'; break;
          }
        }
      }

      // Gateway warping triggers
      const gx = Math.floor(this.player.x / 16);
      const gy = Math.floor(this.player.y / 16);
      
      if (this.networkClient && this.networkClient.isConnected() && !this.isWarping) {
        // Step on portal tile (ID: 10) to warp
        const currentTile = this.chunkManager.getTile(this.player.getCenterX(), this.player.getCenterY());
        if (currentTile === 10) {
          if (this.currentMapId === 'city') {
            // North exit (gy < 100) -> Route 1
            if (gy < 100) {
              this.warpToMap('route_1');
            }
            // South exit (gy > 140) -> Route 2
            else if (gy > 140) {
              this.warpToMap('route_2');
            }
            // East exit (gx > 140) -> Route 3
            else if (gx > 140) {
              this.warpToMap('route_3');
            }
            // West exit (gx < 110) -> Route 4
            else if (gx < 110) {
              this.warpToMap('route_4');
            }
          } else {
            // On any route, portal warps back to city
            this.warpToMap('city');
          }
        }
      }
    }

    // Dynamic Biome Discovery Banner Tracker
    const currentSeed = this.chunkManager.currentSeed;
    const playerGx = Math.floor(this.player.x / 16);
    const playerGy = Math.floor(this.player.y / 16);
    const currentBiome = getBiomeAt(playerGx, playerGy, currentSeed);
    
    if (currentBiome.name !== this.lastBiomeName) {
      this.lastBiomeName = currentBiome.name;
      this.bannerAlpha = 1;
      this.bannerTimer = 3.5;
    }

    // Sync input actions / position back to server
    if (this.networkClient && this.networkClient.isConnected()) {
      const keysRecord = this.inputManager.getKeysRecord();
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
          this.bannerTimer = 0.01; // Fade step continue
        }
      }
    }

    // Map change testing (Press M to toggle manually in debug)
    if (this.inputManager.justPressed('KeyM') && this.networkClient) {
      const nextMap = this.currentMapId === 'city' ? 'route_1' : 'city';
      this.warpToMap(nextMap);
    }

    // Update chunks around player
    this.chunkManager.update(this.player.getCenterX(), this.player.getCenterY());

    // Update camera to follow player
    this.camera.follow(this.player.getCenterX(), this.player.getCenterY());
    this.camera.update(dt);

    // Call input manager update at the VERY END of the frame
    this.inputManager.update();
  }

  render(): void {
    const ctx = this.renderer.getContext();
    const offsetX = this.camera.getOffsetX();
    const offsetY = this.camera.getOffsetY();

    // Clear with screen backdrop
    this.renderer.clear('#1a1a2e');

    // Render chunks (ground pass — trees only show their low trunk stub here)
    this.chunkManager.render(ctx, offsetX, offsetY);

    // ===== Y-sorted overhang pass =====
    // Tall tree canopies, buildings roofs, mountain tops, NPCs, other players, and the local player all get
    // merged into one list sorted by their grounded Y position.
    type Drawable = { sortY: number; draw: () => void };
    const drawables: Drawable[] = [];

    for (const overhang of this.chunkManager.getOverhangs(offsetX, offsetY)) {
      drawables.push({
        sortY: overhang.sortY,
        draw: () => this.chunkManager.renderOverhang(ctx, overhang.type, overhang.screenX, overhang.screenY, overhang.gx, overhang.gy),
      });
    }

    for (const npc of this.npcs) {
      const screenX = Math.round(npc.position.x - offsetX);
      const screenY = Math.round(npc.position.y - offsetY);
      if (screenX < -16 || screenX > GAME_WIDTH || screenY < -16 || screenY > GAME_HEIGHT) continue;

      drawables.push({
        sortY: npc.position.y + 16,
        draw: () => {
          // Draw npc shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(screenX + 8, screenY + 15, 7, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw npc body
          ctx.fillStyle = npc.sprite === 'nurse_joy' ? '#ff69b4' :
                          npc.sprite === 'clerk' ? '#ffd700' :
                          npc.sprite === 'clerk_blue' ? '#4169e1' :
                          npc.sprite === 'clerk_route' ? '#ffa500' :
                          npc.sprite === 'craftsman' ? '#8b4513' :
                          npc.sprite === 'guide' ? '#32cd32' : '#708090';
          ctx.fillRect(screenX + 3, screenY + 10, 10, 6); // pants
          ctx.fillStyle = npc.sprite === 'nurse_joy' ? '#ffffff' : '#dddddd';
          ctx.fillRect(screenX + 3, screenY + 4, 10, 6); // shirt
          // head
          ctx.fillStyle = '#ffccaa'; // skin
          ctx.fillRect(screenX + 4, screenY - 2, 8, 6);
          // hair/hat
          ctx.fillStyle = npc.sprite === 'nurse_joy' ? '#ff69b4' : '#555555';
          ctx.fillRect(screenX + 3, screenY - 4, 10, 3);
          if (npc.direction === 'left') {
              ctx.fillRect(screenX + 1, screenY - 2, 4, 2);
          } else if (npc.direction === 'right') {
              ctx.fillRect(screenX + 11, screenY - 2, 4, 2);
          } else if (npc.direction === 'down') {
              ctx.fillRect(screenX + 3, screenY - 2, 10, 2);
          }

          // eyes
          ctx.fillStyle = '#000000';
          const eyeSize = 2;
          switch (npc.direction) {
            case 'up':
              break;
            case 'down':
              ctx.fillRect(screenX + 5, screenY, eyeSize, eyeSize);
              ctx.fillRect(screenX + 9, screenY, eyeSize, eyeSize);
              break;
            case 'left':
              ctx.fillRect(screenX + 4, screenY, eyeSize, eyeSize);
              break;
            case 'right':
              ctx.fillRect(screenX + 10, screenY, eyeSize, eyeSize);
              break;
            default:
              ctx.fillRect(screenX + 5, screenY, eyeSize, eyeSize);
              ctx.fillRect(screenX + 9, screenY, eyeSize, eyeSize);
              break;
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = '6px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(npc.name, screenX + 8, screenY - 6);
        },
      });
    }

    for (const [, op] of this.otherPlayers) {
      const screenX = Math.round(op.position.x - offsetX);
      const screenY = Math.round(op.position.y - offsetY);
      if (screenX < -16 || screenX > GAME_WIDTH || screenY < -16 || screenY > GAME_HEIGHT) continue;

      drawables.push({
        sortY: op.position.y + 16,
        draw: () => {
          // Draw other player shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(screenX + 8, screenY + 15, 7, 3, 0, 0, Math.PI * 2);
          ctx.fill();

          // Draw other player body
          ctx.fillStyle = '#9e1e1e'; // pants
          ctx.fillRect(screenX + 3, screenY + 10, 10, 6);
          ctx.fillStyle = '#e83a3a'; // shirt
          ctx.fillRect(screenX + 3, screenY + 4, 10, 6);
          // head
          ctx.fillStyle = '#ffccaa'; // skin
          ctx.fillRect(screenX + 4, screenY - 2, 8, 6);
          // hair/hat
          ctx.fillStyle = '#222222'; // hat
          ctx.fillRect(screenX + 3, screenY - 4, 10, 3);
          if (op.direction === 'left' || op.direction === 'down-left' || op.direction === 'up-left') {
              ctx.fillRect(screenX + 1, screenY - 2, 4, 2);
          } else if (op.direction === 'right' || op.direction === 'down-right' || op.direction === 'up-right') {
              ctx.fillRect(screenX + 11, screenY - 2, 4, 2);
          } else if (op.direction === 'down') {
              ctx.fillRect(screenX + 3, screenY - 2, 10, 2);
          }

          // eyes
          ctx.fillStyle = '#000000';
          const eyeSize = 2;
          switch (op.direction) {
            case 'up':
              break;
            case 'down':
              ctx.fillRect(screenX + 5, screenY, eyeSize, eyeSize);
              ctx.fillRect(screenX + 9, screenY, eyeSize, eyeSize);
              break;
            case 'left':
            case 'down-left':
            case 'up-left':
              ctx.fillRect(screenX + 4, screenY, eyeSize, eyeSize);
              break;
            case 'right':
            case 'down-right':
            case 'up-right':
              ctx.fillRect(screenX + 10, screenY, eyeSize, eyeSize);
              break;
            default:
              ctx.fillRect(screenX + 5, screenY, eyeSize, eyeSize);
              ctx.fillRect(screenX + 9, screenY, eyeSize, eyeSize);
              break;
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = '6px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(op.username, screenX + 8, screenY - 6);
        },
      });
    }

    drawables.push({
      sortY: this.player.y + this.player.height,
      draw: () => this.player.render(ctx, offsetX, offsetY),
    });

    drawables.sort((a, b) => a.sortY - b.sortY);
    for (const d of drawables) d.draw();

    // Dialogue Overlay UI
    if (this.isDialogueActive && this.activeDialogueLines.length > 0) {
      const currentLine = this.activeDialogueLines[this.currentDialogueIndex];
      if (currentLine) {
        this.uiManager.drawDialogue(ctx, currentLine.text, currentLine.speaker);
      }
    }

    // Render location banner
    if (this.bannerAlpha > 0) {
      const title = this.currentMapId === 'city' ? 'Permanent City' : 'Route ' + this.currentMapId.split('_')[1].toUpperCase();
      this.uiManager.drawLocationBanner(ctx, title, this.lastBiomeName, this.bannerAlpha);
    }

    // Render debug info
    if (this.debugMode) {
      this.renderDebug(ctx);
    }

    this.renderer.present();
  }

  private renderDebug(ctx: CanvasRenderingContext2D): void {
    const debugInfo = [
      `Map: ${this.currentMapId}`,
      `Pos: ${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`,
      `Dir: ${this.player.direction}`,
      `Biome: ${this.lastBiomeName}`,
      `Other Players: ${this.otherPlayers.size}`,
    ];

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 120, debugInfo.length * 12 + 4);

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