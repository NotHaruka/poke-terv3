/** Main overworld exploration scene with full QoL HUD, Minimap, Friend Radar, and Controls */

import { Scene } from '../../engine/renderer/SceneManager.js';
import { Renderer } from '../../engine/renderer/Renderer.js';
import { InputManager } from '../../engine/input/InputManager.js';
import { Camera } from '../../engine/camera/Camera.js';
import { CollisionSystem, Collider } from '../../engine/physics/Collision.js';
import { ParticleSystem } from '../../engine/particles/ParticleSystem.js';
import { Player } from '../pokemon/entities/Player.js';
import { ChunkManager } from '../pokemon/world/ChunkManager.js';
import { UIManager } from '../pokemon/ui/UIManager.js';
import { WorldSync } from '../pokemon/multiplayer/WorldSync.js';
import { envSystem } from '../../engine/physics/EnvironmentSystem.js';
import { AudioManager } from '../../engine/audio/AudioManager.js';
import { MusicManager } from '../../engine/audio/MusicManager.js';
import { MenuManager } from '../pokemon/ui/menus/MenuManager.js';
import { ClockManager } from '../pokemon/ui/menus/ClockManager.js';
import { MainMenu } from '../pokemon/ui/menus/MainMenu.js';
import { BackpackMenu } from '../pokemon/ui/menus/BackpackMenu.js';
import { MonsterDexMenu } from '../pokemon/ui/menus/MonsterDexMenu.js';
import { PartyMenu } from '../pokemon/ui/menus/PartyMenu.js';
import { PlayerCardMenu } from '../pokemon/ui/menus/PlayerCardMenu.js';
import { OutfitMenu } from '../pokemon/ui/menus/OutfitMenu.js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PacketType,
  PlayerState,
  WelcomePacket,
  MapChangeResponsePacket,
  MapChangeRequestPacket,
  PlayerSnapshot,
  PlayerJoinPacket,
  PlayerLeavePacket,
  PlayerMovePacket,
  getBiomeAt,
  rawTerrainTile,
  BattleEnvironmentData,
  getNPCsForMap,
  findSafeSpawn,
  NPCDefinition
} from 'poke-ter-shared';

import { NPCRenderer } from '../../engine/renderer/NPCRenderer.js';
import { PlayerRenderer } from '../../engine/renderer/PlayerRenderer.js';

import { BuildingManager } from '../../engine/buildings/BuildingManager.js';
import { InteriorManager } from '../../engine/interiors/InteriorManager.js';
import { TransitionManager } from '../../engine/doors/TransitionManager.js';
import { DoorSystem } from '../../engine/doors/DoorSystem.js';

// Gameplay & Overworld Combat imports
import { PokemonFollower } from '../pokemon/entities/PokemonFollower.js';
import { EncounterManager } from '../pokemon/world/EncounterManager.js';
import { StarterSelectModal } from '../pokemon/ui/menus/StarterSelectModal.js';
import { SupplyMartMenu } from '../pokemon/ui/menus/SupplyMartMenu.js';
import { MONSTER_SPECIES, calculateStats, getMonsterSpecies, getDefaultMovesForSpecies } from 'poke-ter-shared';
import { TitleScreenScene } from './TitleScreenScene.js';

// QoL HUD imports
import { MinimapHUD, MinimapMarker } from '../pokemon/ui/hud/MinimapHUD.js';
import { DirectionalPointer } from '../pokemon/ui/hud/DirectionalPointer.js';
import { ControlsHUD } from '../pokemon/ui/hud/ControlsHUD.js';

import { BattleRequestManager } from '../pokemon/battle/BattleRequestManager.js';
import { BattleTransitionManager } from '../pokemon/battle/BattleTransitionManager.js';
import { BattleScene } from './BattleScene.js';

export class OverworldScene implements Scene {
  private renderer: Renderer;
  private inputManager: InputManager;
  private camera: Camera;
  private collisionSystem: CollisionSystem;
  private particleSystem: ParticleSystem;
  private player: Player;
  private chunkManager: ChunkManager;
  private uiManager: UIManager;
  private networkClient: WorldSync | null;
  private audioManager: AudioManager | null = null;
  private debugMode = false;

  private battleRequestManager: BattleRequestManager;
  private battleTransitionManager: BattleTransitionManager;

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
  private otherFollowers = new Map<string, PokemonFollower>();
  private autosaveTimer: number = 0;
  private musicUpdateTimer: number = 0;

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
  private followerMonster: PokemonFollower;
  private combatManager: EncounterManager;
  private totalAnimTime: number = 0;

  // Non-blocking Battle Request state
  private pendingOutgoingBattleRequest: { targetId: string; targetName: string } | null = null;
  private pendingIncomingBattleRequest: { challengerId: string; challengerName: string } | null = null;
  private acceptBtnBounds = { x: 0, y: 0, w: 0, h: 0 };
  private declineBtnBounds = { x: 0, y: 0, w: 0, h: 0 };

  // Chat & Trading state
  private chatBubbles: Map<string, { text: string; timer: number }> = new Map();
  private isChatInputActive: boolean = false;
  private chatInputValue: string = '';

  private activeTradeId: string | null = null;
  private tradeOpponentId: string | null = null;
  private tradeOpponentName: string = '';
  private tradeMyOfferSlot: number = -1;
  private tradeOpponentOfferSlot: number = -1;
  private tradeOpponentOfferMonster: import('poke-ter-shared').MonsterSnapshot | null = null;
  private tradeMyConfirmed: boolean = false;
  private tradeOpponentConfirmed: boolean = false;
  private tradeSelectedSlotIndex: number = 0;

  private pendingIncomingTradeRequest: { senderId: string; senderName: string } | null = null;
  private pendingOutgoingTradeRequest: { targetId: string; targetName: string } | null = null;
  private acceptTradeBtnBounds = { x: 0, y: 0, w: 0, h: 0 };
  private declineTradeBtnBounds = { x: 0, y: 0, w: 0, h: 0 };

  private selectedPlayerForInteraction: PlayerSnapshot | null = null;

  constructor(
    renderer: Renderer,
    inputManager: InputManager,
    networkClient: WorldSync | null = null,
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
    this.followerMonster = new PokemonFollower(this.player.x, this.player.y + 18);
    this.combatManager = new EncounterManager(this.player, this.particleSystem);
    
    // Battle Request and Transition Managers Setup
    this.battleRequestManager = new BattleRequestManager(this.audioManager);
    this.battleTransitionManager = new BattleTransitionManager(this.audioManager);

    this.battleRequestManager.setCallbacks(
      (req) => {
        if (this.networkClient) {
          this.networkClient.send({
            type: PacketType.BattleChallengeAnswer,
            challengerId: req.fromPlayerId,
            accept: true
          });
          this.controlsHUD.showToast('Accepted battle challenge!', '⚔️', 2.5);
        }
      },
      (req) => {
        if (this.networkClient) {
          this.networkClient.send({
            type: PacketType.BattleChallengeAnswer,
            challengerId: req.fromPlayerId,
            accept: false
          });
          this.controlsHUD.showToast('Declined battle request.', '❌', 2.5);
        }
      }
    );

    if (this.networkClient) {
      this.networkClient.on(PacketType.BattleChallengeResponse, (p: any) => {
        this.battleRequestManager.receiveRequest(p.challengerId, p.challengerId, p.challengerName, 15);
      });

      this.networkClient.on(PacketType.BattleChallengeResult, (p: any) => {
        if (!p.accepted) {
          this.battleRequestManager.clearOutgoingRequest();
          this.battleRequestManager.clearIncomingRequest();
          if (this.player.state === PlayerState.BattleRequestPending) {
            this.player.state = PlayerState.Walking;
          }
          this.controlsHUD.showToast(p.message || 'Battle request ended.', '❌', 3.0);
        }
      });

      this.networkClient.on(PacketType.BattleStart, (p: any) => {
        this.battleRequestManager.clearOutgoingRequest();
        this.battleRequestManager.clearIncomingRequest();
        this.player.state = PlayerState.Battling; // Freeze player during battle transition

        if (!p.env) {
          p.env = this.captureEnvironmentData();
        }

        this.battleTransitionManager.startTransition('pvp', 600, () => {
          const game = (window as any).__game;
          if (game && game.sceneManager) {
            game.sceneManager.push(new BattleScene(
              this.renderer,
              this.inputManager,
              this.networkClient!,
              this.audioManager,
              p,
              () => {
                this.player.state = PlayerState.Walking;
              }
            ));
          }
        });
      });

      
      this.networkClient.on(35 /* BattleChallengeResponse */, (p: any) => {
        import('../pokemon/ui/menus/BattleRequestMenu.js').then(m => {
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

      this.networkClient.on(PacketType.ChatMessage, (p: any) => {
        this.chatBubbles.set(p.playerId, { text: p.message, timer: 4.0 });
        if (this.audioManager) this.audioManager.playSFX('select');
      });

      this.networkClient.on(PacketType.TradeRequest, (p: any) => {
        this.pendingIncomingTradeRequest = { senderId: p.targetPlayerId, senderName: p.senderName };
        if (this.audioManager) this.audioManager.playSFX('open');
      });

      this.networkClient.on(PacketType.TradeResponse, (p: any) => {
        if (p.accept) {
          this.pendingIncomingTradeRequest = null;
          this.pendingOutgoingTradeRequest = null;
          this.activeTradeId = p.tradeId || `trade_${p.senderId}`;
          this.tradeOpponentId = p.senderId;
          this.tradeOpponentName = p.senderName;
          this.tradeMyOfferSlot = -1;
          this.tradeOpponentOfferSlot = -1;
          this.tradeOpponentOfferMonster = null;
          this.tradeMyConfirmed = false;
          this.tradeOpponentConfirmed = false;
          this.tradeSelectedSlotIndex = 0;
          this.player.state = PlayerState.Battling; // Freeze movement
          if (this.audioManager) this.audioManager.playSFX('open');
        } else {
          this.pendingOutgoingTradeRequest = null;
          this.controlsHUD.showToast(`${p.senderName} declined the trade.`, '❌', 3.0);
        }
      });

      this.networkClient.on(PacketType.TradeOfferUpdate, (p: any) => {
        this.tradeOpponentOfferSlot = p.offeredSlot;
        this.tradeOpponentOfferMonster = p.offeredMonsterSnapshot || null;
        this.tradeMyConfirmed = false;
        this.tradeOpponentConfirmed = false;
        if (this.audioManager) this.audioManager.playSFX('select');
      });

      this.networkClient.on(PacketType.TradeConfirm, (p: any) => {
        this.tradeOpponentConfirmed = p.confirmed;
        if (this.audioManager) this.audioManager.playSFX('select');
      });

      this.networkClient.on(PacketType.TradeComplete, (p: any) => {
        this.player.state = PlayerState.Walking; // Unfreeze
        this.activeTradeId = null;

        if (p.success && p.receivedMonster) {
          if (this.tradeMyOfferSlot >= 0 && this.tradeMyOfferSlot < this.player.party.length) {
            const rec = p.receivedMonster;
            const fullMon: import('poke-ter-shared').MonsterInstance = {
              speciesId: rec.speciesId,
              level: rec.level,
              currentHp: rec.currentHp,
              maxHp: rec.maxHp,
              stats: rec.stats,
              status: rec.status,
              nickname: rec.nickname,
              moves: getDefaultMovesForSpecies(rec.speciesId)
            };
            this.player.party[this.tradeMyOfferSlot] = fullMon;
          }
          this.controlsHUD.showToast(`Trade completed! Received ${p.receivedMonster.nickname || getMonsterSpecies(p.receivedMonster.speciesId)?.name || 'Monster'}!`, '🤝', 5.0);
          if (this.audioManager) this.audioManager.playSFX('heal');
        } else {
          this.controlsHUD.showToast('Trade canceled or failed.', '❌', 3.0);
          if (this.audioManager) this.audioManager.playSFX('select');
        }
      });
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

      // Check Trade Screen Clicks
      if (this.activeTradeId) {
        const boxW = 300;
        const boxH = 180;
        const boxX = (GAME_WIDTH - boxW) / 2;
        const boxY = (GAME_HEIGHT - boxH) / 2;
        const p1X = boxX + 10;
        const p1Y = boxY + 28;
        const pW = 135;

        // 1. Party Slots
        for (let i = 0; i < 6; i++) {
          const slotY = p1Y + 20 + i * 15;
          if (
            clickX >= p1X + 4 && clickX <= p1X + pW - 4 &&
            clickY >= slotY && clickY <= slotY + 12
          ) {
            this.tradeSelectedSlotIndex = i;
            const mon = this.player.party[i];
            if (mon) {
              this.tradeMyOfferSlot = i;
              this.tradeMyConfirmed = false;
              this.tradeOpponentConfirmed = false;
              const snap: import('poke-ter-shared').MonsterSnapshot = {
                speciesId: mon.speciesId,
                level: mon.level,
                currentHp: mon.currentHp,
                maxHp: mon.maxHp,
                stats: mon.stats,
                status: mon.status,
                nickname: mon.nickname
              };
              if (this.networkClient) {
                this.networkClient.send({
                  type: PacketType.TradeOfferUpdate,
                  tradeId: this.activeTradeId,
                  offeredSlot: this.tradeMyOfferSlot,
                  offeredMonsterSnapshot: snap
                });
              }
              if (this.audioManager) this.audioManager.playSFX('select');
            }
            return;
          }
        }

        // 2. Ready Button
        const btnW = 100;
        const btnH = 16;
        const btnX = boxX + (boxW - btnW) / 2;
        const btnY = boxY + boxH - 44;
        if (
          clickX >= btnX && clickX <= btnX + btnW &&
          clickY >= btnY && clickY <= btnY + btnH
        ) {
          if (this.tradeMyOfferSlot === -1) {
            this.controlsHUD.showToast('Please offer a monster first!', '⚠️');
          } else {
            this.tradeMyConfirmed = !this.tradeMyConfirmed;
            if (this.networkClient) {
              this.networkClient.send({
                type: PacketType.TradeConfirm,
                tradeId: this.activeTradeId,
                confirmed: this.tradeMyConfirmed
              });
            }
            if (this.audioManager) this.audioManager.playSFX('select');
          }
          return;
        }

        // 3. Cancel Button
        const closeBtnW = 60;
        const closeBtnH = 12;
        const closeBtnX = boxX + boxW - closeBtnW - 10;
        const closeBtnY = boxY + boxH - 20;
        if (
          clickX >= closeBtnX && clickX <= closeBtnX + closeBtnW &&
          clickY >= closeBtnY && clickY <= closeBtnY + closeBtnH
        ) {
          if (this.networkClient) {
            this.networkClient.send({
              type: PacketType.TradeComplete,
              tradeId: this.activeTradeId,
              success: false
            });
          }
          this.activeTradeId = null;
          this.player.state = PlayerState.Walking;
          if (this.audioManager) this.audioManager.playSFX('select');
          return;
        }
        return;
      }

      // Check Player Interaction Menu Clicks
      if (this.selectedPlayerForInteraction) {
        const boxW = 160;
        const boxH = 64;
        const boxX = (GAME_WIDTH - boxW) / 2;
        const boxY = (GAME_HEIGHT - boxH) / 2;
        const battleY = boxY + 20;
        const tradeY = boxY + 38;

        if (clickX >= boxX + 10 && clickX <= boxX + 150) {
          if (clickY >= battleY && clickY <= battleY + 14) {
            this.sendBattleChallenge(this.selectedPlayerForInteraction);
            this.selectedPlayerForInteraction = null;
            if (this.audioManager) this.audioManager.playSFX('select');
            return;
          } else if (clickY >= tradeY && clickY <= tradeY + 14) {
            this.sendTradeRequest(this.selectedPlayerForInteraction);
            this.selectedPlayerForInteraction = null;
            if (this.audioManager) this.audioManager.playSFX('select');
            return;
          }
        }
        this.selectedPlayerForInteraction = null;
        if (this.audioManager) this.audioManager.playSFX('select');
        return;
      }

      // Check incoming trade accept/decline bounds
      if (this.pendingIncomingTradeRequest) {
        if (
          clickX >= this.acceptTradeBtnBounds.x &&
          clickX <= this.acceptTradeBtnBounds.x + this.acceptTradeBtnBounds.w &&
          clickY >= this.acceptTradeBtnBounds.y &&
          clickY <= this.acceptTradeBtnBounds.y + this.acceptTradeBtnBounds.h
        ) {
          this.acceptIncomingTradeRequest();
          return;
        }
        if (
          clickX >= this.declineTradeBtnBounds.x &&
          clickX <= this.declineTradeBtnBounds.x + this.declineTradeBtnBounds.w &&
          clickY >= this.declineTradeBtnBounds.y &&
          clickY <= this.declineTradeBtnBounds.y + this.declineTradeBtnBounds.h
        ) {
          this.declineIncomingTradeRequest();
          return;
        }
      }

      // Click on another player to interact
      const cameraX = this.camera.x;
      const cameraY = this.camera.y;
      const offsetX = cameraX - GAME_WIDTH / 2;
      const offsetY = cameraY - GAME_HEIGHT / 2;

      for (const [opId, op] of this.otherPlayers) {
        const opScreenX = op.position.x - offsetX;
        const opScreenY = op.position.y - offsetY;
        if (
          clickX >= opScreenX - 8 && clickX <= opScreenX + 24 &&
          clickY >= opScreenY - 8 && clickY <= opScreenY + 24
        ) {
          this.selectedPlayerForInteraction = op;
          if (this.audioManager) this.audioManager.playSFX('select');
          return;
        }
      }

      // 1. Check Battle Request overlay clicks
      if (this.pendingIncomingBattleRequest) {
        if (
          clickX >= this.acceptBtnBounds.x &&
          clickX <= this.acceptBtnBounds.x + this.acceptBtnBounds.w &&
          clickY >= this.acceptBtnBounds.y &&
          clickY <= this.acceptBtnBounds.y + this.acceptBtnBounds.h
        ) {
          this.acceptIncomingBattleRequest();
          return;
        }
        if (
          clickX >= this.declineBtnBounds.x &&
          clickX <= this.declineBtnBounds.x + this.declineBtnBounds.w &&
          clickY >= this.declineBtnBounds.y &&
          clickY <= this.declineBtnBounds.y + this.declineBtnBounds.h
        ) {
          this.declineIncomingBattleRequest();
          return;
        }
      }



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
            else if (option === 'Data Log') this.menuManager.openMenu(new MonsterDexMenu(this.player));
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
            this.otherFollowers.set(op.id, new PokemonFollower(op.position.x, op.position.y + 18));
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
            this.otherFollowers.set(op.id, new PokemonFollower(op.position.x, op.position.y + 18));
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
          this.otherFollowers.set(p.id, new PokemonFollower(p.position.x, p.position.y + 18));
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
    const game = (window as any).__game;
    if (!game || !game.musicManager) {
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
      return;
    }

    const isInterior = this.doorSystem.isInInterior || this.currentMapId.includes('interior');
    const interiorId = isInterior ? this.interiorManager.getActiveInterior()?.id || 'interior' : null;

    let biomeId = 'plains';
    if (!isInterior) {
      const gx = Math.floor(this.player.x / 16);
      const gy = Math.floor(this.player.y / 16);
      const seed = this.chunkManager.currentSeed;
      const biome = getBiomeAt(gx, gy, seed, this.currentMapId);
      biomeId = biome.id;
    } else {
      biomeId = 'interior';
    }

    const weather = (envSystem as any).weather || 'clear';
    const timeOfDay = this.clockManager.getTimeOfDay();

    game.musicManager.updateState({
      scene: 'overworld',
      biome: biomeId,
      route: this.currentMapId,
      town: this.currentMapId === 'city' ? 'city' : 'route',
      interior: interiorId,
      weather: weather,
      timeOfDay: timeOfDay,
    });
  }

  init(): void {
    const isOffline = !this.networkClient || !this.networkClient.isConnected();
    if (isOffline) {
      console.log('[OverworldScene] Running in offline sandbox mode...');
      this.chunkManager.setSeed(1337);
    }

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

    if (isOffline) {
      setTimeout(() => {
        this.controlsHUD.showToast('Playing in Offline Sandbox Mode 📴', '🎮', 4.0);
      }, 1500);
    }

    this.updateBackgroundMusic();
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
    // Tick down chat bubble timers
    for (const [id, bubble] of this.chatBubbles.entries()) {
      bubble.timer -= dt / 1000;
      if (bubble.timer <= 0) {
        this.chatBubbles.delete(id);
      }
    }

    // Trade updates
    if (this.activeTradeId) {
      if (this.inputManager.justPressed('KeyW') || this.inputManager.justPressed('ArrowUp')) {
        this.tradeSelectedSlotIndex = (this.tradeSelectedSlotIndex - 1 + 6) % 6;
        if (this.audioManager) this.audioManager.playSFX('select');
      } else if (this.inputManager.justPressed('KeyS') || this.inputManager.justPressed('ArrowDown')) {
        this.tradeSelectedSlotIndex = (this.tradeSelectedSlotIndex + 1) % 6;
        if (this.audioManager) this.audioManager.playSFX('select');
      }

      if (this.inputManager.justPressed('Space') || this.inputManager.justPressed('Enter')) {
        const mon = this.player.party[this.tradeSelectedSlotIndex];
        if (mon) {
          this.tradeMyOfferSlot = this.tradeSelectedSlotIndex;
          this.tradeMyConfirmed = false;
          this.tradeOpponentConfirmed = false;
          
          const snap: import('poke-ter-shared').MonsterSnapshot = {
            speciesId: mon.speciesId,
            level: mon.level,
            currentHp: mon.currentHp,
            maxHp: mon.maxHp,
            stats: mon.stats,
            status: mon.status,
            nickname: mon.nickname
          };

          if (this.networkClient) {
            this.networkClient.send({
              type: PacketType.TradeOfferUpdate,
              tradeId: this.activeTradeId,
              offeredSlot: this.tradeMyOfferSlot,
              offeredMonsterSnapshot: snap
            });
          }
          if (this.audioManager) this.audioManager.playSFX('select');
        } else {
          this.controlsHUD.showToast('No monster in this slot.', '⚠️');
        }
      }

      if (this.inputManager.justPressed('KeyC')) {
        if (this.tradeMyOfferSlot === -1) {
          this.controlsHUD.showToast('Please offer a monster first!', '⚠️');
        } else {
          this.tradeMyConfirmed = !this.tradeMyConfirmed;
          if (this.networkClient) {
            this.networkClient.send({
              type: PacketType.TradeConfirm,
              tradeId: this.activeTradeId,
              confirmed: this.tradeMyConfirmed
            });
          }
          if (this.audioManager) this.audioManager.playSFX('select');
        }
      }

      if (this.inputManager.justPressed('Escape')) {
        if (this.networkClient) {
          this.networkClient.send({
            type: PacketType.TradeComplete,
            tradeId: this.activeTradeId,
            success: false
          });
        }
        this.activeTradeId = null;
        this.player.state = PlayerState.Walking;
        if (this.audioManager) this.audioManager.playSFX('select');
      }

      this.inputManager.update();
      return;
    }

    // Interaction menu key binds
    if (this.selectedPlayerForInteraction) {
      if (this.inputManager.justPressed('Digit1') || this.inputManager.justPressed('Numpad1')) {
        this.sendBattleChallenge(this.selectedPlayerForInteraction);
        this.selectedPlayerForInteraction = null;
        if (this.audioManager) this.audioManager.playSFX('select');
      } else if (this.inputManager.justPressed('Digit2') || this.inputManager.justPressed('Numpad2')) {
        this.sendTradeRequest(this.selectedPlayerForInteraction);
        this.selectedPlayerForInteraction = null;
        if (this.audioManager) this.audioManager.playSFX('select');
      } else if (this.inputManager.justPressed('Escape')) {
        this.selectedPlayerForInteraction = null;
        if (this.audioManager) this.audioManager.playSFX('select');
      }
    }

    this.totalAnimTime += dt;
    this.playTimeMs += dt;
    this.clockManager.update(dt);
    this.transitionManager.update(dt);
    this.controlsHUD.update(dt);
    this.minimapHUD.update(dt);
    
    this.musicUpdateTimer += dt;
    if (this.musicUpdateTimer >= 1.0) {
      this.musicUpdateTimer = 0;
      this.updateBackgroundMusic();
    }
    
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

    // Update battle request manager & transition manager
    this.battleRequestManager.update(dt);
    this.battleTransitionManager.update(dt);

    if (this.battleRequestManager.hasIncomingRequest()) {
      if (this.inputManager.justPressed('KeyY') || this.inputManager.justPressed('Enter')) {
        this.battleRequestManager.acceptIncomingRequest();
      } else if (this.inputManager.justPressed('KeyN') || this.inputManager.justPressed('Escape')) {
        this.battleRequestManager.declineIncomingRequest();
      }
    } else if (this.battleRequestManager.hasOutgoingRequest()) {
      if (this.inputManager.justPressed('KeyC') || this.inputManager.justPressed('Escape')) {
        if (this.networkClient) {
          this.networkClient.send({
            type: PacketType.BattleChallengeAnswer,
            challengerId: this.networkClient.getId(),
            accept: false
          });
        }
        this.battleRequestManager.clearOutgoingRequest();
        this.controlsHUD.showToast('Cancelled battle request.', 'ℹ️', 2.5);
      }
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
          follower = new PokemonFollower(op.position.x, op.position.y + 18);
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
          this.menuManager.openMenu(new MonsterDexMenu(this.player));
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

    // Keybind shortcut: Enter or KeyC opens chat input modal
    if ((this.inputManager.justPressed('Enter') || this.inputManager.justPressed('KeyC')) && !this.isDialogueActive && !this.menuManager.isOpen() && !this.isChatInputActive && !this.activeTradeId && !this.selectedPlayerForInteraction) {
      this.openChatInput();
    }

    // Keybind shortcut for incoming trades
    if (this.pendingIncomingTradeRequest) {
      if (this.inputManager.justPressed('KeyY')) {
        this.acceptIncomingTradeRequest();
      } else if (this.inputManager.justPressed('KeyN') || this.inputManager.justPressed('Escape')) {
        this.declineIncomingTradeRequest();
      }
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
          import('../pokemon/ui/menus/PlayerInteractionMenu.js').then(m => {
            this.menuManager.openMenu(new m.PlayerInteractionMenu(op.username, (option) => {
              if (option === 'Challenge to Battle') {
                this.sendBattleChallenge(op);
              }
            }));
          });
          this.inputManager.consume('Space');
          this.inputManager.consume('Enter');
          interacted = true;
        }
        
        if (!interacted) {
          
        const op = this.getOtherPlayerInFront();
        if (op) {
          if (this.networkClient) {
            this.networkClient.send({
              type: 34, // BattleChallengeRequest
              targetPlayerId: op.id
            } as any);
            this.controlsHUD.showToast(`Sent battle request to ${op.username}!`, '⚔️', 3.0);
          }
          return;
        }
        
const npc = this.getNPCInFront();
          if (npc) {
            if (npc.sprite === 'clerk' || npc.name.includes('Mart Clerk')) {
              this.menuManager.openMenu(new SupplyMartMenu(this.player));
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
      if (this.menuManager.isOpen() || this.isDialogueActive || this.transitionManager.isTransitioning() || this.isChatInputActive || this.activeTradeId) {
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

    // Render Non-Blocking Battle Request Overlay
    this.battleRequestManager.render(ctx, GAME_WIDTH, GAME_HEIGHT);

    // Render Battle Transition Screen Overlay (Flashes, Panels, Fades)
    this.battleTransitionManager.render(ctx, GAME_WIDTH, GAME_HEIGHT);

    // Render Menus
    this.menuManager.render(ctx);

    // Render Transition Screen Fade Overlay
    this.transitionManager.render(ctx);

    // Render trade overlays
    if (this.activeTradeId) {
      this.renderTradeScreen(ctx);
    }
    
    // Render trade requests overlay
    if (this.pendingIncomingTradeRequest) {
      this.renderTradeRequestOverlay(ctx);
    }

    // Render interaction selection modal
    if (this.selectedPlayerForInteraction) {
      this.renderPlayerInteractionMenu(ctx);
    }

    // Render chat input bar
    if (this.isChatInputActive) {
      this.renderChatInputBar(ctx);
    }

    // Render Chat Bubbles
    for (const [id, bubble] of this.chatBubbles.entries()) {
      if (id === this.networkClient?.getId()) {
        const sx = Math.round(this.player.x - offsetX);
        const sy = Math.round(this.player.y - offsetY);
        this.renderChatBubble(ctx, bubble.text, sx, sy);
      } else {
        const op = this.otherPlayers.get(id);
        if (op) {
          const sx = Math.round(op.position.x - offsetX);
          const sy = Math.round(op.position.y - offsetY);
          this.renderChatBubble(ctx, bubble.text, sx, sy);
        }
      }
    }

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

  private sendBattleChallenge(op: any): void {
    if (this.battleRequestManager.hasOutgoingRequest() || this.battleRequestManager.hasIncomingRequest()) {
      this.controlsHUD.showToast('You already have a pending battle request.', '⚠️', 3.0);
      return;
    }
    if (this.networkClient) {
      this.networkClient.send({
        type: PacketType.BattleChallengeRequest,
        targetPlayerId: op.id
      });
      this.battleRequestManager.setOutgoingRequest(op.id, op.username, 15);
      this.controlsHUD.showToast(`Sent battle request to ${op.username}!`, '⚔️', 4.0);
    }
  }

  private acceptIncomingBattleRequest(): void {
    if (!this.pendingIncomingBattleRequest || !this.networkClient) return;
    this.networkClient.send({
      type: PacketType.BattleChallengeAnswer,
      challengerId: this.pendingIncomingBattleRequest.challengerId,
      accept: true
    });
    this.controlsHUD.showToast('Accepted battle challenge!', '⚔️', 2.5);
    this.pendingIncomingBattleRequest = null;
  }

  private declineIncomingBattleRequest(): void {
    if (!this.pendingIncomingBattleRequest || !this.networkClient) return;
    this.networkClient.send({
      type: PacketType.BattleChallengeAnswer,
      challengerId: this.pendingIncomingBattleRequest.challengerId,
      accept: false
    });
    this.pendingIncomingBattleRequest = null;
    if (this.player.state === PlayerState.BattleRequestPending) {
      this.player.state = PlayerState.Walking;
    }
    this.controlsHUD.showToast('Declined battle request.', '❌', 2.5);
  }

  private renderBattleRequestOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.pendingIncomingBattleRequest) {
      ctx.save();
      const boxW = 220;
      const boxH = 48;
      const boxX = (GAME_WIDTH - boxW) / 2;
      const boxY = 16;

      ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#4deeea';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`⚔️ ${this.pendingIncomingBattleRequest.challengerName} wants to battle!`, boxX + boxW / 2, boxY + 6);

      const btnW = 90;
      const btnH = 18;
      const btnY = boxY + 22;

      // Accept Button
      const acceptX = boxX + 12;
      this.acceptBtnBounds = { x: acceptX, y: btnY, w: btnW, h: btnH };

      ctx.fillStyle = '#27ae60';
      ctx.fillRect(acceptX, btnY, btnW, btnH);
      ctx.strokeStyle = '#2ecc71';
      ctx.strokeRect(acceptX, btnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ACCEPT [Y/Enter]', acceptX + btnW / 2, btnY + btnH / 2);

      // Decline Button
      const declineX = boxX + boxW - btnW - 12;
      this.declineBtnBounds = { x: declineX, y: btnY, w: btnW, h: btnH };

      ctx.fillStyle = '#c0392b';
      ctx.fillRect(declineX, btnY, btnW, btnH);
      ctx.strokeStyle = '#e74c3c';
      ctx.strokeRect(declineX, btnY, btnW, btnH);

      ctx.fillStyle = '#ffffff';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DECLINE [N/Esc]', declineX + btnW / 2, btnY + btnH / 2);

      ctx.restore();
    } else if (this.pendingOutgoingBattleRequest) {
      ctx.save();
      const boxW = 220;
      const boxH = 22;
      const boxX = (GAME_WIDTH - boxW) / 2;
      const boxY = 16;

      ctx.fillStyle = 'rgba(12, 18, 34, 0.92)';
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX, boxY, boxW, boxH);

      ctx.fillStyle = '#f1c40f';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `⚔️ Request sent to ${this.pendingOutgoingBattleRequest.targetName}... [C/Esc] Cancel`,
        boxX + boxW / 2,
        boxY + boxH / 2
      );

      ctx.restore();
    }
  }

  private openChatInput(): void {
    this.isChatInputActive = true;
    this.chatInputValue = '';
    this.player.state = PlayerState.Battling; // Freeze movement
    window.addEventListener('keydown', this.chatKeydownListener);
  }

  private closeChatInput(): void {
    this.isChatInputActive = false;
    this.player.state = PlayerState.Walking; // Unfreeze
    window.removeEventListener('keydown', this.chatKeydownListener);
  }

  private chatKeydownListener = (e: KeyboardEvent) => {
    if (!this.isChatInputActive) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const msg = this.chatInputValue.trim();
      if (msg.length > 0 && this.networkClient) {
        this.networkClient.send({
          type: PacketType.ChatMessage,
          message: msg,
          playerId: this.networkClient.getId(),
          username: this.player.username || 'Trainer'
        });
        this.chatBubbles.set(this.networkClient.getId(), { text: msg, timer: 4.0 });
      }
      this.closeChatInput();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closeChatInput();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      this.chatInputValue = this.chatInputValue.slice(0, -1);
    } else if (e.key.length === 1) {
      e.preventDefault();
      if (this.chatInputValue.length < 50) {
        this.chatInputValue += e.key;
      }
    }
  };

  private sendTradeRequest(op: any): void {
    if (this.networkClient) {
      this.networkClient.send({
        type: PacketType.TradeRequest,
        targetPlayerId: op.id,
        senderName: this.player.username || 'Trainer'
      });
      this.pendingOutgoingTradeRequest = { targetId: op.id, targetName: op.username };
      this.controlsHUD.showToast(`Sent trade request to ${op.username}!`, '🤝', 4.0);
    }
  }

  private acceptIncomingTradeRequest(): void {
    if (!this.pendingIncomingTradeRequest || !this.networkClient) return;
    this.networkClient.send({
      type: PacketType.TradeResponse,
      senderId: this.pendingIncomingTradeRequest.senderId,
      senderName: this.pendingIncomingTradeRequest.senderName,
      accept: true
    });
    this.pendingIncomingTradeRequest = null;
  }

  private declineIncomingTradeRequest(): void {
    if (!this.pendingIncomingTradeRequest || !this.networkClient) return;
    this.networkClient.send({
      type: PacketType.TradeResponse,
      senderId: this.pendingIncomingTradeRequest.senderId,
      senderName: this.pendingIncomingTradeRequest.senderName,
      accept: false
    });
    this.pendingIncomingTradeRequest = null;
  }

  private renderTradeRequestOverlay(ctx: CanvasRenderingContext2D): void {
    if (!this.pendingIncomingTradeRequest) return;

    ctx.save();
    const boxW = 220;
    const boxH = 48;
    const boxX = (GAME_WIDTH - boxW) / 2;
    const boxY = 70; // below battle challenge request

    ctx.fillStyle = 'rgba(12, 18, 34, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`🤝 ${this.pendingIncomingTradeRequest.senderName} wants to trade!`, boxX + boxW / 2, boxY + 6);

    const btnW = 90;
    const btnH = 18;
    const btnY = boxY + 22;

    // Accept Button
    const acceptX = boxX + 12;
    this.acceptTradeBtnBounds = { x: acceptX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = '#059669';
    ctx.fillRect(acceptX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(acceptX, btnY, btnW, btnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ACCEPT [Y]', acceptX + btnW / 2, btnY + btnH / 2);

    // Decline Button
    const declineX = boxX + boxW - btnW - 12;
    this.declineTradeBtnBounds = { x: declineX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(declineX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(declineX, btnY, btnW, btnH);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('DECLINE [N]', declineX + btnW / 2, btnY + btnH / 2);

    ctx.restore();
  }

  private renderPlayerInteractionMenu(ctx: CanvasRenderingContext2D): void {
    if (!this.selectedPlayerForInteraction) return;
    
    ctx.save();
    const boxW = 160;
    const boxH = 64;
    const boxX = (GAME_WIDTH - boxW) / 2;
    const boxY = (GAME_HEIGHT - boxH) / 2;

    ctx.fillStyle = 'rgba(12, 18, 34, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Trainer: ${this.selectedPlayerForInteraction.username}`, boxX + boxW / 2, boxY + 6);

    // Battle Option Button
    const btnW = 140;
    const btnH = 14;
    const battleY = boxY + 20;
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(boxX + 10, battleY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillText('1. Challenge to Battle', boxX + boxW / 2, battleY + btnH / 2);

    // Trade Option Button
    const tradeY = boxY + 38;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(boxX + 10, tradeY, btnW, btnH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('2. Propose Monster Trade', boxX + boxW / 2, tradeY + btnH / 2);

    // Hint
    ctx.fillStyle = '#94a3b8';
    ctx.font = '6px monospace';
    ctx.fillText('[Press 1 or 2, or click outside]', boxX + boxW / 2, boxY + 54);

    ctx.restore();
  }

  private renderTradeScreen(ctx: CanvasRenderingContext2D): void {
    if (!this.activeTradeId) return;

    ctx.save();
    // Darken background
    ctx.fillStyle = 'rgba(10, 15, 30, 0.85)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Main Box
    const boxW = 300;
    const boxH = 180;
    const boxX = (GAME_WIDTH - boxW) / 2;
    const boxY = (GAME_HEIGHT - boxH) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.98)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Title Header
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.fillRect(boxX + 2, boxY + 2, boxW - 4, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤝 MONSTER TRADE 🤝', boxX + boxW / 2, boxY + 12);

    // Left Panel: YOUR OFFER
    const p1X = boxX + 10;
    const p1Y = boxY + 28;
    const pW = 135;
    const pH = 115;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.fillRect(p1X, p1Y, pW, pH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(p1X, p1Y, pW, pH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('YOUR PARTY OFFER:', p1X + 6, p1Y + 12);

    // Render your party slots in left panel
    for (let i = 0; i < 6; i++) {
      const mon = this.player.party[i];
      const slotY = p1Y + 20 + i * 15;
      const isSelected = this.tradeSelectedSlotIndex === i;
      const isOffered = this.tradeMyOfferSlot === i;

      if (isOffered) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      } else {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
      }
      ctx.fillRect(p1X + 4, slotY, pW - 8, 12);

      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(p1X + 4, slotY, pW - 8, 12);
      }

      if (mon) {
        const species = MONSTER_SPECIES.find(s => s.id === mon.speciesId);
        const name = mon.nickname || species?.name || 'Unknown';
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px monospace';
        ctx.fillText(`${i + 1}. ${name} (Lv.${mon.level})`, p1X + 8, slotY + 6);
        if (isOffered) {
          ctx.fillStyle = '#10b981';
          ctx.textAlign = 'right';
          ctx.fillText('OFFERED', p1X + pW - 8, slotY + 6);
          ctx.textAlign = 'left';
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '7px monospace';
        ctx.fillText(`${i + 1}. [Empty]`, p1X + 8, slotY + 6);
      }
    }

    // Right Panel: OPPONENT OFFER
    const p2X = boxX + boxW - pW - 10;
    const p2Y = boxY + 28;

    ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.fillRect(p2X, p2Y, pW, pH);
    ctx.strokeStyle = '#f43f5e';
    ctx.strokeRect(p2X, p2Y, pW, pH);

    ctx.fillStyle = '#f43f5e';
    ctx.font = '8px monospace';
    ctx.fillText(`${this.tradeOpponentName.toUpperCase()}'S OFFER:`, p2X + 6, p2Y + 12);

    if (this.tradeOpponentOfferSlot >= 0 && this.tradeOpponentOfferMonster) {
      const mon = this.tradeOpponentOfferMonster;
      const species = MONSTER_SPECIES.find(s => s.id === mon.speciesId);
      const name = mon.nickname || species?.name || 'Unknown';

      ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
      ctx.fillRect(p2X + 6, p2Y + 25, pW - 12, 50);
      ctx.strokeStyle = '#f43f5e';
      ctx.strokeRect(p2X + 6, p2Y + 25, pW - 12, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = '8.5px monospace';
      ctx.fillText(name, p2X + 12, p2Y + 38);
      ctx.font = '7.5px monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`Level: ${mon.level}`, p2X + 12, p2Y + 50);
      ctx.fillText(`HP: ${mon.currentHp}/${mon.maxHp}`, p2X + 12, p2Y + 60);

      if (species) {
        ctx.fillStyle = '#f43f5e';
        ctx.fillText(`Types: ${species.types.map(t => ['Normal','Fire','Water','Grass','Electric','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon'][t]).join('/')}`, p2X + 12, p2Y + 70);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '7.5px monospace';
      ctx.fillText('Awaiting offer...', p2X + 12, p2Y + 40);
    }

    // Confirm button box
    const btnW = 100;
    const btnH = 16;
    const btnX = boxX + (boxW - btnW) / 2;
    const btnY = boxY + boxH - 44;

    ctx.fillStyle = this.tradeMyConfirmed ? '#059669' : '#0284c7';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.tradeMyConfirmed ? 'READY! [C]' : 'CONFIRM [C]', btnX + btnW / 2, btnY + btnH / 2);

    // Cancel button box at bottom right
    const closeBtnW = 60;
    const closeBtnH = 12;
    const closeBtnX = boxX + boxW - closeBtnW - 10;
    const closeBtnY = boxY + boxH - 20;

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(closeBtnX, closeBtnY, closeBtnW, closeBtnH);

    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.fillText('CANCEL', closeBtnX + closeBtnW / 2, closeBtnY + closeBtnH / 2);

    // Bottom status text
    ctx.fillStyle = this.tradeMyConfirmed ? '#10b981' : '#e2e8f0';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this.tradeMyConfirmed ? '✅ YOU: READY' : '❌ YOU: NOT READY', p1X + 4, boxY + boxH - 32);

    ctx.fillStyle = this.tradeOpponentConfirmed ? '#10b981' : '#e2e8f0';
    ctx.textAlign = 'right';
    ctx.fillText(this.tradeOpponentConfirmed ? `✅ ${this.tradeOpponentName.toUpperCase()}: READY` : `❌ ${this.tradeOpponentName.toUpperCase()}: NOT READY`, p2X + pW - 4, boxY + boxH - 32);

    // Instructions footer
    ctx.fillStyle = '#94a3b8';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[W/S] Select  [Space] Offer  [C] Confirm  [Esc] Cancel', boxX + boxW / 2, boxY + boxH - 10);

    ctx.restore();
  }

  private renderChatInputBar(ctx: CanvasRenderingContext2D): void {
    if (!this.isChatInputActive) return;

    ctx.save();
    const boxW = 240;
    const boxH = 18;
    const boxX = (GAME_WIDTH - boxW) / 2;
    const boxY = GAME_HEIGHT - 36;

    ctx.fillStyle = 'rgba(12, 18, 34, 0.95)';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('SAY:', boxX + 6, boxY + boxH / 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    const cleanVal = this.chatInputValue.length > 35 ? '...' + this.chatInputValue.slice(-35) : this.chatInputValue;
    const blinkingCursor = Math.floor(Date.now() / 500) % 2 === 0 ? '|' : '';
    ctx.fillText(cleanVal + blinkingCursor, boxX + 32, boxY + boxH / 2);

    ctx.fillStyle = '#64748b';
    ctx.font = '6px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('[Esc] Cancel  [Enter] Send', boxX + boxW - 6, boxY + boxH / 2);

    ctx.restore();
  }

  private renderChatBubble(ctx: CanvasRenderingContext2D, text: string, sx: number, sy: number): void {
    ctx.save();
    ctx.font = '7px monospace';
    const textWidth = ctx.measureText(text).width;
    const padding = 4;
    const bubbleW = textWidth + padding * 2;
    const bubbleH = 12;
    const bx = sx + 8 - bubbleW / 2; // center above player
    const by = sy - 14;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fillRect(bx, by, bubbleW, bubbleH);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bubbleW, bubbleH);

    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bubbleW / 2, by + bubbleH / 2);

    ctx.restore();
  }

  public captureEnvironmentData(): BattleEnvironmentData {
    const gx = Math.floor(this.player.x / 16);
    const gy = Math.floor(this.player.y / 16);
    const seed = this.chunkManager.currentSeed;
    const isInterior = this.doorSystem.isInInterior || this.currentMapId.includes('interior');

    let biomeId = 'plains';
    let biomeName = 'Grassland Plains';
    let groundTile = 1;

    if (isInterior) {
      biomeId = 'interior';
      biomeName = this.currentMapId.includes('lab') ? 'Research Lab' :
                  this.currentMapId.includes('pokecenter') ? 'Monster Center' :
                  this.currentMapId.includes('mart') ? 'Supply Mart' : 'Building Interior';
      groundTile = 6;
    } else {
      const biome = getBiomeAt(gx, gy, seed, this.currentMapId);
      biomeId = biome.id;
      biomeName = biome.name;
      groundTile = rawTerrainTile(gx, gy, seed, this.currentMapId);
    }

    const weather = (envSystem as any).weather || 'clear';
    const timeOfDay = this.clockManager.getTimeOfDay();

    const nearbyObjects: string[] = [];
    if (!isInterior) {
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          const t = rawTerrainTile(gx + dx, gy + dy, seed, this.currentMapId);
          if (t === 5) nearbyObjects.push('tree');
          else if (t === 9) nearbyObjects.push('tall_grass');
          else if (t === 3) nearbyObjects.push('water');
          else if (t === 4) nearbyObjects.push('cliff');
          else if (t === 2) nearbyObjects.push('path');
        }
      }
    } else {
      nearbyObjects.push('furniture', 'carpet', 'wall');
    }

    return {
      mapId: this.currentMapId,
      x: this.player.x,
      y: this.player.y,
      seed,
      biomeId,
      biomeName,
      weather: weather as any,
      timeOfDay,
      isInterior,
      groundTile,
      nearbyObjects: Array.from(new Set(nearbyObjects))
    };
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