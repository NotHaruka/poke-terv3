/** Strongly typed network packet definitions */

import { PlayerProfile, PlayerData } from './types.js';

export enum PacketType {
  // Connection
  Hello = 0,
  Welcome = 1,
  Disconnect = 2,

  // Player
  PlayerJoin = 10,
  PlayerLeave = 11,
  PlayerInput = 12,
  PlayerMove = 13,
  PlayerPos = 14,
  PlayerState = 15,

  // World
  ChunkRequest = 20,
  ChunkData = 21,
  EntitySpawn = 22,
  EntityDespawn = 23,
  EntityMove = 24,

  // Battle
  BattleStart = 30,
  BattleAction = 31,
  BattleResult = 32,
  BattleEnd = 33,
  BattleChallengeRequest = 34,
  BattleChallengeResponse = 35,
  BattleChallengeAnswer = 36,
  BattleChallengeResult = 37,

  // Monsters
  MonsterEncounter = 40,
  CatchAttempt = 41,
  CatchResult = 42,

  // Chat
  ChatMessage = 50,

  // System
  Ping = 60,
  Pong = 61,
  Error = 62,
  SaveRequest = 63,
  SaveResponse = 64,
  MapChangeRequest = 65,
  MapChangeResponse = 66,
}

export interface Packet {
  type: PacketType;
  timestamp: number;
  seq?: number;
}

export interface HelloPacket extends Packet {
  type: PacketType.Hello;
  username: string;
  version: string;
  sessionId?: string;
  profile?: PlayerProfile;
}

export interface WelcomePacket extends Packet {
  type: PacketType.Welcome;
  playerId: string;
  position: { x: number; y: number };
  players: PlayerSnapshot[];
  mapId: string;
  seed: number;
  serverStartTime: number;
  playerData?: PlayerData;
}

export interface DisconnectPacket extends Packet {
  type: PacketType.Disconnect;
  playerId: string;
  reason: string;
}

export interface PlayerSnapshot {
  id: string;
  username: string;
  position: { x: number; y: number };
  direction: string;
  profile?: PlayerProfile;
  activeMonster?: MonsterSnapshot;
}

export interface PlayerInputPacket extends Packet {
  type: PacketType.PlayerInput;
  inputSeq: number;
  keys: Record<string, boolean>;
  direction: string;
  position?: { x: number; y: number };
  timestamp: number;
}

export interface PlayerMovePacket extends Packet {
  type: PacketType.PlayerMove;
  playerId: string;
  position: { x: number; y: number };
  direction: string;
  inputSeq: number;
}

export interface PlayerPosPacket extends Packet {
  type: PacketType.PlayerPos;
  position: { x: number; y: number };
  direction: string;
  inputSeq: number;
}

export interface PlayerJoinPacket extends Packet {
  type: PacketType.PlayerJoin;
  player: PlayerSnapshot;
}

export interface PlayerLeavePacket extends Packet {
  type: PacketType.PlayerLeave;
  playerId: string;
}

export interface ChunkRequestPacket extends Packet {
  type: PacketType.ChunkRequest;
  chunks: { cx: number; cy: number }[];
}

export interface ChunkDataPacket extends Packet {
  type: PacketType.ChunkData;
  chunks: ChunkSnapshot[];
}

export interface ChunkSnapshot {
  cx: number;
  cy: number;
  tiles: number[][];
  npcs: { id: number; name: string; position: { x: number; y: number }; direction: string }[];
}

export interface EntitySpawnPacket extends Packet {
  type: PacketType.EntitySpawn;
  entityId: string;
  entityType: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

export interface EntityDespawnPacket extends Packet {
  type: PacketType.EntityDespawn;
  entityId: string;
}

export interface EntityMovePacket extends Packet {
  type: PacketType.EntityMove;
  entityId: string;
  position: { x: number; y: number };
}

export interface BattleStartPacket extends Packet {
  type: PacketType.BattleStart;
  battleId: string;
  isPvP: boolean;
  opponentName: string;
  opponentId?: string;
  opponentMonsters: MonsterSnapshot[];
  playerMonsters: MonsterSnapshot[];
}

export interface MonsterSnapshot {
  speciesId: number;
  level: number;
  currentHp: number;
  maxHp: number;
  stats: { attack: number; defense: number; spAttack: number; spDefense: number; speed: number };
  status: number;
  nickname?: string;
}

export interface BattleActionPacket extends Packet {
  type: PacketType.BattleAction;
  battleId: string;
  action: BattleActionData;
}

export type BattleActionData =
  | { kind: 'attack'; moveIndex: number }
  | { kind: 'switch'; slot: number }
  | { kind: 'item'; itemId: number }
  | { kind: 'run' };

export type BattleEvent =
  | { type: 'message'; text: string }
  | { type: 'damage'; target: 'player' | 'opponent'; amount: number; isCrit: boolean; effectiveness: number }
  | { type: 'heal'; target: 'player' | 'opponent'; amount: number }
  | { type: 'status'; target: 'player' | 'opponent'; status: number }
  | { type: 'faint'; target: 'player' | 'opponent' }
  | { type: 'switch'; target: 'player' | 'opponent'; monster: MonsterSnapshot }
  | { type: 'action'; source: 'player' | 'opponent'; action: BattleActionData; moveName?: string }
  | { type: 'exp'; amount: number }
  | { type: 'catch'; success: boolean };

export interface BattleResultPacket extends Packet {
  type: PacketType.BattleResult;
  battleId: string;
  events: BattleEvent[];
  turnReady: boolean;
  battleOver: boolean;
  winner?: string;
}

export interface BattleEndPacket extends Packet {
  type: PacketType.BattleEnd;
  battleId: string;
  reason: string;
  rewards?: { money: number; exp: number };
}

export interface BattleChallengeRequestPacket extends Packet {
  type: PacketType.BattleChallengeRequest;
  targetPlayerId: string;
}

export interface BattleChallengeResponsePacket extends Packet {
  type: PacketType.BattleChallengeResponse;
  challengerId: string;
  challengerName: string;
}

export interface BattleChallengeAnswerPacket extends Packet {
  type: PacketType.BattleChallengeAnswer;
  challengerId: string;
  accept: boolean;
}

export interface BattleChallengeResultPacket extends Packet {
  type: PacketType.BattleChallengeResult;
  accepted: boolean;
  message?: string;
}

export interface MonsterEncounterPacket extends Packet {
  type: PacketType.MonsterEncounter;
  monster: MonsterSnapshot;
}

export interface CatchAttemptPacket extends Packet {
  type: PacketType.CatchAttempt;
  battleId: string;
  itemId: number;
}

export interface CatchResultPacket extends Packet {
  type: PacketType.CatchResult;
  battleId: string;
  success: boolean;
  shakes: number;
}

export interface ChatMessagePacket extends Packet {
  type: PacketType.ChatMessage;
  playerId: string;
  username: string;
  message: string;
}

export interface PingPacket extends Packet {
  type: PacketType.Ping;
  clientTime: number;
}

export interface PongPacket extends Packet {
  type: PacketType.Pong;
  clientTime: number;
  serverTime: number;
}

export interface ErrorPacket extends Packet {
  type: PacketType.Error;
  code: number;
  message: string;
}

export interface SaveRequestPacket extends Packet {
  type: PacketType.SaveRequest;
  data: string;
}

export interface SaveResponsePacket extends Packet {
  type: PacketType.SaveResponse;
  success: boolean;
}

export interface MapChangeRequestPacket extends Packet {
  type: PacketType.MapChangeRequest;
  targetMapId: string; // e.g. 'city', 'route_1'
  spawnX?: number;
  spawnY?: number;
  spawnDirection?: 'up' | 'down' | 'left' | 'right';
}

export interface MapChangeResponsePacket extends Packet {
  type: PacketType.MapChangeResponse;
  mapId: string;
  seed: number;
  position: { x: number; y: number };
  players: PlayerSnapshot[];
}

export type AnyPacket =
  | HelloPacket | WelcomePacket | DisconnectPacket
  | PlayerJoinPacket | PlayerLeavePacket | PlayerInputPacket
  | PlayerMovePacket | PlayerPosPacket
  | ChunkRequestPacket | ChunkDataPacket
  | EntitySpawnPacket | EntityDespawnPacket | EntityMovePacket
  | BattleStartPacket | BattleActionPacket | BattleResultPacket | BattleEndPacket
  | BattleChallengeRequestPacket | BattleChallengeResponsePacket | BattleChallengeAnswerPacket | BattleChallengeResultPacket
  | MonsterEncounterPacket | CatchAttemptPacket | CatchResultPacket
  | ChatMessagePacket
  | PingPacket | PongPacket | ErrorPacket
  | SaveRequestPacket | SaveResponsePacket
  | MapChangeRequestPacket | MapChangeResponsePacket;