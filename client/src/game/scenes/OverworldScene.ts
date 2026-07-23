/** Main overworld exploration scene with full QoL HUD, Minimap, Friend Radar, and Controls */

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
  findSafeSpawn,
  NPCDefinition
} from 'poke-ter-shared';

import { NPCRenderer } from '../../engine/rendering/NPCRenderer.js';
import { PlayerRenderer } from '../../engine/rendering/PlayerRenderer.js';

import { BuildingManager } from '../../engine/buildings/BuildingManager.js';
import { InteriorManager } from '../../engine/interiors/InteriorManager.js';
import { TransitionManager } from '../../engine/doors/TransitionManager.js';
import { DoorSystem } from '../../engine/doors/DoorSystem.js';

// Gameplay & Overworld Combat imports
import { FollowerMonster } from '../entities/FollowerMonster.js';
import { OverworldCombatManager } from '../combat/OverworldCombatManager.js';
import { StarterSelectModal } from '../ui/menus/StarterSelectModal.js';
import { PokemartMenu } from '../ui/menus/PokemartMenu.js';
import { MONSTER_SPECIES, calculateStats, getMonsterSpecies } from 'poke-ter-shared';
import { TitleScreenScene } from './TitleScreenScene.js';

// QoL HUD imports
import { MinimapHUD, MinimapMarker } from '../ui/hud/MinimapHUD.js';
import { DirectionalPointer } from '../ui/hud/DirectionalPointer.js';
import { ControlsHUD } from '../ui/hud/ControlsHUD.js';

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

  // QoL HUD instances
  private minimapHUD: MinimapHUD;
  private directionalPointer: DirectionalPointer;
  private controlsHUD: ControlsHUD;

  // Footstep audio timing
  private footstepTimer: number = 0;

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
  private otherFollowers = new Map<string, FollowerMonster>();
  private autosaveTimer: number = 0;

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

  // Active Companion Follower & Overworld Combat
  private followerMonster: FollowerMonster;
  private combatManager: OverworldCombatManager;
  private totalAnimTime: number = 0;

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: NetworkClient | null = null,
    audioManager: AudioManager | null = null,
    profile?: import('poke-ter-shared').PlayerProfile
  ) {
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

    // QoL HUD initializations
    this.minimapHUD = new MinimapHUD();
    this.directionalPointer = new DirectionalPointer();
    this.controlsHUD = new ControlsHUD();

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

    // Synchronously restore last saved local progress
    const savedDataStr = localStorage.getItem('poketer_player_data');
    if (savedDataStr) {
      try {
        console.log('[OverworldScene] Sync-loading player data from local storage...');
        const data = JSON.parse(savedDataStr);
        this.player.loadPlayerData(data);
        this.currentMapId = data.currentMap || 'city';
      } catch (e) {
        console.error('[OverworldScene] Failed to load saved local progress:', e);
      }
    }

    // Active Companion & Combat Setup
    this.followerMonster = new FollowerMonster(this.player.x, this.player.y + 18);
    this.combatManager = new OverworldCombatManager(this.player, this.particleSystem);
    
    if (this.networkClient) {
      
      this.networkClient.on(35 /* BattleChallengeResponse */, (p: any) => {
        import('../ui/menus/BattleRequestMenu.js').then(m => {
          this.menuManager.openMenu(new m.BattleRequestMenu(p.challengerId, p.challengerName, this.networkClient!, () => {
            this.menuManager.closeMenu();
          }));
        });
      });
      this.networkClient.on(37 /* BattleChallengeResult */, (p: any) => {
        if (!p.accepted) {
           this.controlsHUD.showToast(p.message || 'Battle request declined.', '❌', 3.0);
        }
      });
      this.networkClient.on(30 /* BattleStart */, (p: any) => {
        const game = (window as any).__game;
        import('./BattleScene.js').then(m => {
          game.sceneManager.push(new m.BattleScene(this.renderer, this.inputManager, this.networkClient!, this.audioManager, p));
        });
      });
this.networkClient.on(PacketType.Welcome, this.onWelcome);
      this.networkClient.on(PacketType.MapChangeResponse, this.onMapChange);
      this.networkClient.on(PacketType.PlayerJoin, this.onPlayerJoin);
      this.networkClient.on(PacketType.PlayerLeave, this.onPlayerLeave);
      this.networkClient.on(PacketType.PlayerMove, this.onPlayerMove);
      this.networkClient.on(PacketType.PlayerPos, this.onPlayerPos);
    }

    this.attachCanvasClickListener();
  }

  private attachCanvasClickListener(): void {
    const canvas = this.renderer.getCanvas();
    if (!canvas) return;

    canvas.addEventListener('click', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = this.renderer.getScale();
      const clickX = (e.clientX - rect.left) / scale;
      const clickY = (e.clientY - rect.top) / scale;



      // 2. Check Minimap click (Top-Left 6,6 with expanded buttons height)
      const minimapAction = this.minimapHUD.handleClick(clickX, clickY, this.directionalPointer);
      if (minimapAction) {
        if (this.audioManager) {
          this.audioManager.playSFX(minimapAction === 'toggle_expand' ? 'open' : 'select');
        }
        if (minimapAction === 'toggle_expand') {
          this.controlsHUD.showToast(this.minimapHUD.isMaximized() ? 'Minimap Expanded' : 'Minimap Compacted', '🗺️');
        } else if (minimapAction === 'toggle_friends') {
          this.controlsHUD.showToast(this.directionalPointer.showFriends ? 'Friend Radar Enabled' : 'Friend Radar Disabled', '👥');
        } else if (minimapAction === 'toggle_portals') {
          this.controlsHUD.showToast(this.directionalPointer.showPortals ? 'Portal Pointers Enabled' : 'Portal Pointers Disabled', '🌀');
        }
        return;
      }

      // 3. Check Control HUD chip clicks
      const action = this.controlsHUD.handleClick(clickX, clickY);
      if (action === 'M') {
        this.minimapHUD.toggleExpand();
        if (this.audioManager) this.audioManager.playSFX('select');
        this.controlsHUD.showToast(this.minimapHUD.isMaximized() ? 'Minimap Expanded' : 'Minimap Compacted', '🗺️');
      } else if (action === 'N') {
        this.cycleAudioVolume();
      } else if (action === 'E') {
        if (!this.menuManager.isOpen()) {
          this.menuManager.openMenu(new MainMenu((option) => {
            if (option === 'Backpack') this.menuManager.openMenu(new BackpackMenu(this.player));
            else if (option === 'Data Log') this.menuManager.openMenu(new PokedexMenu(this.player));
            else if (option === 'Monster Party') this.menuManager.openMenu(new PartyMenu(this.player));
            else if (option === 'Player Card') this.menuManager.openMenu(new PlayerCardMenu(this.player, this.clockManager, () => this.playTimeMs));
          }));
        }
      }
    });
  }

  private cycleAudioVolume(): void {
    if (!this.audioManager) return;
    const current = this.audioManager.musicVol;
    let next = 0.5;
    if (current >= 0.9) next = 0.0;
    else if (current === 0.0) next = 0.25;
    else if (current === 0.25) next = 0.5;
    else next = 1.0;

    this.audioManager.setMusicVolume(next);
    if (this.audioManager) this.audioManager.playSFX('select');

    if (next === 0) {
      this.controlsHUD.showToast('Audio Muted', '🔇');
    } else {
      this.controlsHUD.showToast(`Music: ${Math.round(next * 100)}%`, '🔊');
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
    
    this.otherPlayers.clear();
    this.otherFollowers.clear();
    if (welcome.players) {
      for (const op of welcome.players) {
        if (op.id !== welcome.playerId) {
          this.otherPlayers.set(op.id, op);
          if (op.activeMonster) {
            console.log(`[Multiplayer] Spawning active companion for ${op.username}: ${op.activeMonster.nickname || 'Monster'}`);
            this.otherFollowers.set(op.id, new FollowerMonster(op.position.x, op.position.y + 18));
          }
        }
      }
    }

    if (welcome.playerData) {
      const savedProfileStr = localStorage.getItem('poketer_player_profile');
      if (savedProfileStr) {
        try {
          const localProf = JSON.parse(savedProfileStr);
          if (!welcome.playerData.profile || welcome.playerData.profile.name === localProf.name) {
            console.log('[Multiplayer] Loaded server-authoritative save data');
            this.player.loadPlayerData(welcome.playerData);
          } else {
            console.log('[Multiplayer] Server save mismatch with local profile. Overwriting server save with new profile.');
            this.saveGame(false);
          }
        } catch {
          this.player.loadPlayerData(welcome.playerData);
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
    
    this.otherPlayers.clear();
    this.otherFollowers.clear();
    if (res.players) {
      for (const op of res.players) {
        if (op.id !== this.networkClient?.getId()) {
          this.otherPlayers.set(op.id, op);
          if (op.activeMonster) {
            console.log(`[Multiplayer] Spawning active companion for ${op.username}: ${op.activeMonster.nickname || 'Monster'}`);
            this.otherFollowers.set(op.id, new FollowerMonster(op.position.x, op.position.y + 18));
          }
        }
      }
    }

    this.setMap(res.mapId);
  };

  private onPlayerJoin = (packet: any): void => {
    const p = (packet as PlayerJoinPacket).player;
    if (p.id !== this.networkClient?.getId()) {
      const existed = this.otherPlayers.has(p.id);
      this.otherPlayers.set(p.id, p);
      
      if (p.activeMonster) {
        if (!this.otherFollowers.has(p.id)) {
          this.otherFollowers.set(p.id, new FollowerMonster(p.position.x, p.position.y + 18));
        }
      } else {
        this.otherFollowers.delete(p.id);
      }

      if (!existed) {
        this.controlsHUD.showToast(`${p.username || 'Trainer'} joined world!`, '👋');
      } else {
        console.log(`[Multiplayer] Updated player info for ${p.id} (active companion: ${p.activeMonster?.nickname || 'none'})`);
      }
    }
  };

  private onPlayerLeave = (packet: any): void => {
    const id = (packet as PlayerLeavePacket).playerId;
    const op = this.otherPlayers.get(id);
    if (op) {
      this.controlsHUD.showToast(`${op.username || 'Trainer'} left area`, '🚶');
    }
    this.otherPlayers.delete(id);
    this.otherFollowers.delete(id);
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
    this.chunkManager.clear();

    if (mapId.includes('interior')) {
      const interior = this.interiorManager.loadInterior(mapId);
      this.npcs = interior ? interior.npcs : [];
      this.doorSystem.isInInterior = true;
      this.lastBiomeName = 'Building';

      // Auto-reconstruct savedOverworldState for exit door lookup
      const parentMapId = mapId.includes(':') ? mapId.split(':')[0] : 'city';
      const baseInteriorId = mapId.includes(':') ? mapId.split(':')[1] : mapId;
      const seed = this.chunkManager.currentSeed;
      this.buildingManager.setMap(parentMapId, seed);
      const bInfo = this.buildingManager.getBuildingForInterior(baseInteriorId);
      if (bInfo) {
        const def = bInfo.definition;
        const inst = bInfo.building;
        this.doorSystem.savedOverworldState = {
          mapId: parentMapId,
          x: (inst.tileX + def.doorOffsetX) * 16,
          y: (inst.tileY + def.doorOffsetY + 1) * 16,
          direction: 'down',
          seed
        };
      }
    } else {
      const seed = this.chunkManager.currentSeed;
      this.doorSystem.setSeed(seed);
      this.buildingManager.setMap(mapId, seed);
      this.interiorManager.unloadCurrent();
      this.doorSystem.isInInterior = false;

      this.npcs = getNPCsForMap(mapId, seed);

      // Verify and snap player to a safe walkable position
      const safePos = findSafeSpawn(seed, this.player.x, this.player.y, mapId);
      this.player.x = safePos.x;
      this.player.y = safePos.y;
      this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());

      const playerGx = Math.floor(this.player.x / 16);
      const playerGy = Math.floor(this.player.y / 16);
      const currentBiome = getBiomeAt(playerGx, playerGy, seed, mapId);
      this.lastBiomeName = currentBiome.name;

      // Spawn wild roaming monsters for route maps
      this.combatManager.populateRouteMonsters(mapId, 6);
    }

    for (const c of this.npcColliders) {
      this.collisionSystem.remove(c);
    }
    this.npcColliders = [];

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

    // Fix: Synchronously load chunks surrounding the player immediately after setting the map.
    // This ensures that tile colliders are added to the CollisionSystem before the 
    // first frame of player.update() can execute. This prevents a race condition 
    // on reconnect where the player could move freely through unloaded solid tiles for 
    // one frame and then get stuck when the chunks loaded subsequently.
    if (!this.doorSystem.isInInterior) {
      this.chunkManager.update(this.player.getCenterX(), this.player.getCenterY());
    }

    this.bannerAlpha = 1;
    this.bannerTimer = 3;
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
    if (!this.player.hasStarter) {
      // Spawn player directly inside Professor's Research Lab in front of the 3 Starter Pods
      this.doorSystem.enterBuilding('lab_interior', 'city', 117, 113);
      this.player.x = 6 * 16;
      this.player.y = 5 * 16;
      this.player.direction = 'up';
      this.controlsHUD.showToast('Welcome! Go inspect the 3 Capture Pods in the Lab to choose your starter!', '🐾', 5.0);
    } else {
      this.camera.snapTo(this.player.getCenterX(), this.player.getCenterY());
      this.setMap(this.currentMapId);
      this.controlsHUD.showToast('Welcome back to Poke-ter!', '✨', 3.0);
    }
  }

  
  private getOtherPlayerInFront(): any | null {
    const px = this.player.x;
    const py = this.player.y;
    
    for (const [id, op] of this.otherPlayers) {
      const dx = op.position.x - px;
      const dy = op.position.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 24) {
        const dir = this.player.direction;
        if (dir.includes('up') && dy < -4) return { id, ...op };
        if (dir.includes('down') && dy > 4) return { id, ...op };
        if (dir.includes('left') && dx < -4) return { id, ...op };
        if (dir.includes('right') && dx > 4) return { id, ...op };
      }
    }
    return null;
  }
private getNPCInFront(): NPCDefinition | null {
    const px = this.player.x;
    const py = this.player.y;
    
    const activeNpcs = this.doorSystem.isInInterior 
      ? (this.interiorManager.getActiveInterior()?.npcs || [])
      : this.npcs;

    for (const npc of activeNpcs) {
      const dx = npc.position.x - px;
      const dy = npc.position.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = this.doorSystem.isInInterior ? 45 : 24;

      if (distance < maxDistance) {
        const dir = this.player.direction;
        if (dir.includes('up') && dy < -4) return npc;
        if (dir.includes('down') && dy > 4) return npc;
        if (dir.includes('left') && dx < -4) return npc;
        if (dir.includes('right') && dx > 4) return npc;
        if (distance < 18) return npc;
      }
    }
    return null;
  }

  private warpToMap(targetMapId: string) {
    // Route restriction check: Prevent players from leaving for Routes 1-4 until they pick a starter
    if (targetMapId.startsWith('route_') && !this.player.hasStarter) {
      this.controlsHUD.showToast('Professor Elm: Hold on! Choose a starter Pokémon in the Research Lab first!', '🛑', 4.0);
      if (this.audioManager) this.audioManager.playSFX('cancel');
      return;
    }

    this.saveGame(false); // Save progress when changing maps/warps!

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

  public saveGame(showIndicator = true): void {
    const pData = this.player.getPlayerData(this.networkClient?.getId() || 'local', this.player.profile?.name || 'Trainer');
    pData.currentMap = this.currentMapId;
    const dataStr = JSON.stringify(pData);
    localStorage.setItem('poketer_player_data', dataStr);
    if (this.player.profile) {
      localStorage.setItem('poketer_player_profile', JSON.stringify(this.player.profile));
    }
    
    if (this.networkClient && this.networkClient.isConnected()) {
      console.log('[SaveGame] Sending save request to server...');
      this.networkClient.sendSaveData(pData);
    }
    
    if (showIndicator) {
      this.controlsHUD.showSaveIndicator(2.0);
    }
  }

  update(dt: number): void {
    this.totalAnimTime += dt;
    this.playTimeMs += dt;
    this.clockManager.update(dt);
    this.transitionManager.update(dt);
    this.controlsHUD.update(dt);
    this.minimapHUD.update(dt);
    
    this.menuManager.update(dt);
    
    // Combat Manager update
    this.combatManager.update(dt);

    // Overworld combat hotkeys (1, 2, 3 = moves, 4 = capture pod)
    if (!this.menuManager.isOpen() && !this.isDialogueActive) {
      if (this.inputManager.justPressed('Digit1')) this.combatManager.triggerPlayerAttack(0);
      if (this.inputManager.justPressed('Digit2')) this.combatManager.triggerPlayerAttack(1);
      if (this.inputManager.justPressed('Digit3')) this.combatManager.triggerPlayerAttack(2);
      if (this.inputManager.justPressed('Digit4')) this.combatManager.throwCapturePod();
    }

    // Active Companion Follower update
    if (this.player.hasStarter && this.player.party && this.player.party.length > 0) {
      const activeIdx = this.player.activeFollowerIndex || 0;
      const activeMonster = this.player.party[activeIdx] || this.player.party[0];
      if (activeMonster) {
        const species = MONSTER_SPECIES.find(s => s.id === activeMonster.speciesId);
        if (species) {
          this.followerMonster.update(
            dt,
            this.player.x,
            this.player.y,
            this.player.direction,
            this.player.moving,
            this.lastBiomeName,
            species.types[0],
            species.name,
            this.particleSystem
          );
        }
      }
    }

    // Update other players' follower companion monsters
    for (const [opId, op] of this.otherPlayers) {
      if (op.activeMonster) {
        const activeMon = op.activeMonster;
        let follower = this.otherFollowers.get(opId);
        if (!follower) {
          follower = new FollowerMonster(op.position.x, op.position.y + 18);
          this.otherFollowers.set(opId, follower);
          console.log(`[Multiplayer] Spawning missing active companion for ${op.username}`);
        }

        const species = MONSTER_SPECIES.find(s => s.id === activeMon.speciesId);
        const monsterType = species ? species.types[0] : 0;
        const speciesName = species ? species.name : 'Monster';

        // Detect if remote player is moving
        let opMoving = false;
        const lastPos = (op as any).lastLoggedPosition;
        if (lastPos) {
          const dx = op.position.x - lastPos.x;
          const dy = op.position.y - lastPos.y;
          if (Math.hypot(dx, dy) > 0.1) {
            opMoving = true;
          }
        }
        (op as any).lastLoggedPosition = { x: op.position.x, y: op.position.y };

        follower.update(
          dt,
          op.position.x,
          op.position.y,
          op.direction as import('poke-ter-shared').Direction,
          opMoving,
          this.lastBiomeName,
          monsterType,
          speciesName,
          this.particleSystem
        );
      } else {
        this.otherFollowers.delete(opId);
      }
    }

    // Periodic autosave (every 30 seconds)
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 30000) {
      this.autosaveTimer = 0;
      this.saveGame(true);
    }
    
    // Keybind shortcut: E key opens Main Menu
    if (this.inputManager.justPressed('KeyE') && !this.isDialogueActive && !this.menuManager.isOpen()) {
      this.menuManager.openMenu(new MainMenu((option) => {
        if (option === 'Backpack') {
          this.menuManager.openMenu(new BackpackMenu(this.player));
        } else if (option === 'Data Log') {
          this.menuManager.openMenu(new PokedexMenu(this.player));
        } else if (option === 'Monster Party') {
          this.menuManager.openMenu(new PartyMenu(this.player));
        } else if (option === 'Player Card') {
          this.menuManager.openMenu(new PlayerCardMenu(this.player, this.clockManager, () => this.playTimeMs));
        } else if (option === 'Save') {
          this.saveGame(true);
          if (this.audioManager) this.audioManager.playSFX('select');
        } else if (option === 'Exit') {
          this.saveGame(false);
          const game = (window as any).__game;
          if (game && game.sceneManager) {
            game.sceneManager.replace(new TitleScreenScene(this.renderer, this.inputManager, this.networkClient, this.audioManager));
          }
        }
      }));
    }

    // Keybind shortcut: M key toggles Minimap view
    if (this.inputManager.justPressed('KeyM')) {
      this.minimapHUD.toggleExpand();
      if (this.audioManager) this.audioManager.playSFX('open');
      this.controlsHUD.showToast(this.minimapHUD.isMaximized() ? 'Minimap Expanded' : 'Minimap Compacted', '🗺️');
    }

    // Keybind shortcut: N key cycles Audio Volume
    if (this.inputManager.justPressed('KeyN')) {
      this.cycleAudioVolume();
    }

    // Keybind shortcut: H key toggles Control HUD
    if (this.inputManager.justPressed('KeyH')) {
      this.controlsHUD.toggleVisibility();
    }

    envSystem.update(dt);
    this.particleSystem.update(dt);
    
    if (this.doorSystem.isInInterior) {
      this.interiorManager.update(dt);
    } else {
      this.buildingManager.update(dt);
    }

    this.doorSystem.update();

    // Environmental Particles
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

    if (this.inputManager.justPressed('F3')) {
      this.debugMode = !this.debugMode;
    }

    // Dialogue State Machine
    if (this.isDialogueActive) {
      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        if (!this.uiManager.isDialogueComplete()) {
          this.uiManager.finishDialogueLine();
        } else {
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
      }
    } else {
      // Player movement update (locked during transition)
      if (!this.transitionManager.isTransitioning()) {
        this.player.update(dt);
      }

      let interacted = false;
      // Check NPC / Furniture interactions
      if (!this.menuManager.isOpen() && (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter'))) {
        
        const op = this.getOtherPlayerInFront();
        if (op) {
          if (this.networkClient) {
            this.networkClient.send({
              type: 34, // BattleChallengeRequest
              targetPlayerId: op.id
            } as any);
            this.controlsHUD.showToast(`Sent battle request to ${op.username}!`, '⚔️', 3.0);
          }
          this.inputManager.consume('Space');
          this.inputManager.consume('Enter');
          interacted = true;
        }
        
        if (!interacted) {
          const npc = this.getNPCInFront();
          if (npc) {
            if (npc.sprite === 'clerk' || npc.name.includes('Mart Clerk')) {
              this.menuManager.openMenu(new PokemartMenu(this.player));
              this.inputManager.consume('Space');
              this.inputManager.consume('Enter');
              interacted = true;
            }

            if (!interacted) {
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
              interacted = true;
            }
          }
        }
        
        if (!interacted && this.doorSystem.isInInterior) {
          const pGx = Math.floor(this.player.getCenterX() / 16);
          const pGy = Math.floor(this.player.getCenterY() / 16);
          let checkGx = pGx;
          let checkGy = pGy;
          if (this.player.direction === 'up') checkGy--;
          else if (this.player.direction === 'down') checkGy++;
          else if (this.player.direction === 'left') checkGx--;
          else if (this.player.direction === 'right') checkGx++;

          let furniture = this.interiorManager.getInteractableFurniture(checkGx, checkGy);
          if (!furniture && this.player.direction === 'up') {
            furniture = this.interiorManager.getInteractableFurniture(checkGx, checkGy - 1);
          }

          if (furniture && furniture.interactionText) {
            if (furniture.type === 'starter_pod') {
              if (this.player.hasStarter) {
                this.controlsHUD.showToast('You already chose your starter companion! Take good care of them!', '🐾', 3.0);
              } else {
                let speciesId = 1; // Flamepup
                if (furniture.id.includes('sproutling')) speciesId = 4;
                if (furniture.id.includes('aquafin')) speciesId = 7;

                this.menuManager.openMenu(new StarterSelectModal(this.player, speciesId, (starter) => {
                  this.player.party = [starter];
                  this.player.hasStarter = true;
                  this.player.activeFollowerIndex = 0;
                  this.controlsHUD.showToast(`${starter.nickname} joined your party as your active companion!`, '✨', 4.0);
                  if (this.audioManager) this.audioManager.playSFX('open');
                  this.saveGame(false); // Save progress immediately
                }));
              }
              return;
            }

            this.isDialogueActive = true;
            this.activeNPC = null;
            const textLines = Array.isArray(furniture.interactionText) ? furniture.interactionText : [furniture.interactionText];
            this.activeDialogueLines = textLines.map(t => ({ speaker: furniture.name, text: t }));
            this.currentDialogueIndex = 0;

            if (this.audioManager) {
              this.audioManager.playSound('open');
            }

            if (furniture.type === 'healing_machine' && this.player.party) {
              for (const m of this.player.party) {
                m.currentHp = m.maxHp;
                m.status = 0;
              }
              this.controlsHUD.showToast('Party fully restored!', '💖');
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
      }
    }

    if (this.networkClient && this.networkClient.isConnected()) {
      let keysRecord = this.inputManager.getKeysRecord();
      if (this.menuManager.isOpen() || this.isDialogueActive || this.transitionManager.isTransitioning()) {
        keysRecord = {};
      }
      this.networkClient.sendInput(keysRecord, this.player.direction, { x: this.player.x, y: this.player.y });
    }

    if (this.bannerTimer > 0) {
      const dtSec = dt / 1000;
      this.bannerTimer -= dtSec;
      if (this.bannerTimer <= 0) {
        this.bannerAlpha -= dtSec * 2;
        if (this.bannerAlpha <= 0) {
          this.bannerAlpha = 0;
        } else {
          this.bannerTimer = 0.01;
        }
      }
    }

    if (!this.doorSystem.isInInterior) {
      this.chunkManager.update(this.player.getCenterX(), this.player.getCenterY());
    }

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
      this.interiorManager.render(ctx, offsetX, offsetY);

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

      for (const [opId, op] of this.otherPlayers) {
        const screenX = Math.round(op.position.x - offsetX);
        const screenY = Math.round(op.position.y - offsetY);

        drawables.push({
          sortY: op.position.y + 16,
          draw: () => {
            PlayerRenderer.render(ctx, screenX, screenY, op.direction as import('poke-ter-shared').Direction, false, 0, op.position.x, op.profile, op.username);
          },
        });

        if (op.activeMonster) {
          const activeMon = op.activeMonster;
          const follower = this.otherFollowers.get(opId);
          if (follower) {
            const species = MONSTER_SPECIES.find(s => s.id === activeMon.speciesId);
            if (species) {
              drawables.push({
                sortY: follower.y + 16,
                draw: () => {
                  follower.render(
                    ctx,
                    offsetX,
                    offsetY,
                    activeMon.speciesId,
                    activeMon.nickname || species.name,
                    activeMon.level,
                    activeMon.currentHp,
                    activeMon.maxHp,
                    this.totalAnimTime
                  );
                }
              });
            }
          }
        }
      }

      drawables.push({
        sortY: this.player.y + this.player.height,
        draw: () => this.player.render(ctx, offsetX, offsetY),
      });

      // Render Active Companion Follower in Interior
      if (this.player.hasStarter && this.player.party && this.player.party.length > 0) {
        const activeIdx = this.player.activeFollowerIndex || 0;
        const activeMonster = this.player.party[activeIdx] || this.player.party[0];
        if (activeMonster) {
          const species = MONSTER_SPECIES.find(s => s.id === activeMonster.speciesId);
          if (species) {
            drawables.push({
              sortY: this.followerMonster.y + 16,
              draw: () => {
                this.followerMonster.render(
                  ctx,
                  offsetX,
                  offsetY,
                  activeMonster.speciesId,
                  activeMonster.nickname || species.name,
                  activeMonster.level,
                  activeMonster.currentHp,
                  activeMonster.maxHp,
                  this.totalAnimTime
                );
              },
            });
          }
        }
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw();

    } else {
      this.chunkManager.render(ctx, offsetX, offsetY);

      for (const overhang of this.chunkManager.getOverhangs(offsetX, offsetY)) {
        drawables.push({
          sortY: overhang.sortY,
          draw: () => this.chunkManager.renderOverhang(ctx, overhang.type, overhang.screenX, overhang.screenY, overhang.gx, overhang.gy),
        });
      }

      for (const bDrawable of this.buildingManager.getDrawables(ctx, offsetX, offsetY)) {
        drawables.push(bDrawable);
      }

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

      for (const [opId, op] of this.otherPlayers) {
        const screenX = Math.round(op.position.x - offsetX);
        const screenY = Math.round(op.position.y - offsetY);
        if (screenX < -16 || screenX > GAME_WIDTH || screenY < -16 || screenY > GAME_HEIGHT) continue;

        drawables.push({
          sortY: op.position.y + 16,
          draw: () => {
            PlayerRenderer.render(ctx, screenX, screenY, op.direction as import('poke-ter-shared').Direction, false, 0, op.position.x, op.profile, op.username);
          },
        });

        if (op.activeMonster) {
          const activeMon = op.activeMonster;
          const follower = this.otherFollowers.get(opId);
          if (follower) {
            const species = MONSTER_SPECIES.find(s => s.id === activeMon.speciesId);
            if (species) {
              drawables.push({
                sortY: follower.y + 16,
                draw: () => {
                  follower.render(
                    ctx,
                    offsetX,
                    offsetY,
                    activeMon.speciesId,
                    activeMon.nickname || species.name,
                    activeMon.level,
                    activeMon.currentHp,
                    activeMon.maxHp,
                    this.totalAnimTime
                  );
                }
              });
            }
          }
        }
      }

      drawables.push({
        sortY: this.player.y + this.player.height,
        draw: () => this.player.render(ctx, offsetX, offsetY),
      });

      // Render Active Companion Follower in Overworld
      if (this.player.hasStarter && this.player.party && this.player.party.length > 0) {
        const activeIdx = this.player.activeFollowerIndex || 0;
        const activeMonster = this.player.party[activeIdx] || this.player.party[0];
        if (activeMonster) {
          const species = MONSTER_SPECIES.find(s => s.id === activeMonster.speciesId);
          if (species) {
            drawables.push({
              sortY: this.followerMonster.y + 16,
              draw: () => {
                this.followerMonster.render(
                  ctx,
                  offsetX,
                  offsetY,
                  activeMonster.speciesId,
                  activeMonster.nickname || species.name,
                  activeMonster.level,
                  activeMonster.currentHp,
                  activeMonster.maxHp,
                  this.totalAnimTime
                );
              },
            });
          }
        }
      }

      drawables.sort((a, b) => a.sortY - b.sortY);
      for (const d of drawables) d.draw();

      this.particleSystem.render(ctx, offsetX, offsetY);

      // Render Overworld Combat System
      this.combatManager.render(ctx, offsetX, offsetY, this.totalAnimTime);
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



    // QoL HUD 1: Minimap / Radar HUD (Top-Left)
    const minimapMarkers: MinimapMarker[] = [
      { x: this.player.x, y: this.player.y, type: 'player' },
    ];
    for (const npc of this.npcs) {
      minimapMarkers.push({ x: npc.position.x, y: npc.position.y, type: 'npc' });
    }
    for (const [, op] of this.otherPlayers) {
      minimapMarkers.push({ x: op.position.x, y: op.position.y, type: 'friend' });
    }
    this.minimapHUD.render(
      ctx,
      this.player.x,
      this.player.y,
      this.player.direction,
      this.currentMapId,
      this.lastBiomeName,
      minimapMarkers,
      this.chunkManager.currentSeed,
      this.interiorManager.getActiveInterior(),
      this.directionalPointer.showFriends,
      this.directionalPointer.showPortals
    );

    // Clock HUD (placed elegantly at the bottom of the map)
    const mapProgress = this.minimapHUD.getExpandProgress();
    const mapSize = 54 + (110 - 54) * mapProgress;
    const mapExtraHeight = 34 * mapProgress;
    const mapTotalHeight = mapSize + mapExtraHeight;
    const clockX = 6;
    const clockY = 6 + mapTotalHeight + 3;
    const clockW = mapSize;
    const clockH = 11;

    ctx.save();
    ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
    ctx.fillRect(clockX, clockY, clockW, clockH);
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.strokeRect(clockX, clockY, clockW, clockH);

    // Accent lines or corner dots
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(clockX, clockY, 2, 2);
    ctx.fillRect(clockX + clockW - 2, clockY, 2, 2);
    ctx.fillRect(clockX, clockY + clockH - 2, 2, 2);
    ctx.fillRect(clockX + clockW - 2, clockY + clockH - 2, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.clockManager.getTimeString(), clockX + clockW / 2, clockY + clockH / 2 + 0.5);
    ctx.restore();

    // Biome HUD (placed elegantly directly below the clock)
    const biomeX = clockX;
    const biomeY = clockY + clockH + 3;
    const biomeW = clockW;
    const biomeH = 11;

    let biomeText = this.lastBiomeName || 'Unknown';
    if (this.doorSystem.isInInterior) {
      biomeText = 'Building';
    }

    ctx.save();
    ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
    ctx.fillRect(biomeX, biomeY, biomeW, biomeH);
    ctx.strokeStyle = '#4deeea';
    ctx.lineWidth = 1;
    ctx.strokeRect(biomeX, biomeY, biomeW, biomeH);

    // Accent lines or corner dots (green for biome/nature)
    ctx.fillStyle = '#00ff66';
    ctx.fillRect(biomeX, biomeY, 2, 2);
    ctx.fillRect(biomeX + biomeW - 2, biomeY, 2, 2);
    ctx.fillRect(biomeX, biomeY + biomeH - 2, 2, 2);
    ctx.fillRect(biomeX + biomeW - 2, biomeY + biomeH - 2, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6.5px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(biomeText.toUpperCase(), biomeX + biomeW / 2, biomeY + biomeH / 2 + 0.5);
    ctx.restore();

    // QoL HUD 2: Directional Pointer HUD
    this.directionalPointer.render(
      ctx,
      this.player.x,
      this.player.y,
      this.currentMapId,
      this.otherPlayers,
      offsetX,
      offsetY
    );

    // QoL HUD 3: Controls & Keybinding Overlay (Bottom Bar)
    this.controlsHUD.render(
      ctx,
      this.inputManager.isShiftHeld(),
      this.audioManager ? this.audioManager.musicVol : 0.5,
      this.minimapHUD.isMaximized(),
      biomeY + biomeH + 3
    );

    // Render Menus
    this.menuManager.render(ctx);

    // Render Transition Screen Fade Overlay
    this.transitionManager.render(ctx);

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