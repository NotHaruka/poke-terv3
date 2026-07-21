import { GameState } from './game.js';
import { ClientState } from './types.js';
import {
  PacketType, AnyPacket, HelloPacket, WelcomePacket,
  PlayerInputPacket, PlayerMovePacket, PlayerPosPacket, ChunkRequestPacket, ChunkDataPacket,
  PlayerJoinPacket, PingPacket, PongPacket,
  ChunkSnapshot, generateChunkTiles, MapChangeRequestPacket, MapChangeResponsePacket, PlayerLeavePacket,
  findSafeSpawn, PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED
} from 'poke-ter-shared';

export function handlePacket(gameState: GameState, client: ClientState, packet: AnyPacket): void {
  switch (packet.type) {
    case PacketType.Hello:
      handleHello(gameState, client, packet as HelloPacket);
      break;
    case PacketType.PlayerInput:
      handlePlayerInput(gameState, client, packet as PlayerInputPacket);
      break;
    case PacketType.ChunkRequest:
      handleChunkRequest(gameState, client, packet as ChunkRequestPacket);
      break;
    case PacketType.Ping:
      handlePing(gameState, client, packet as PingPacket);
      break;
    case PacketType.MapChangeRequest:
      handleMapChangeRequest(gameState, client, packet as MapChangeRequestPacket);
      break;
    default:
      console.log(`[?] Unknown packet type: ${packet.type}`);
  }
}

function handleHello(gameState: GameState, client: ClientState, packet: HelloPacket): void {
  client.username = packet.username;

  if (packet.sessionId) {
    const existingClient = gameState.getClient(packet.sessionId);
    if (existingClient && existingClient.ws === null) {
      console.log(`[+] ${existingClient.id} reconnected`);
      existingClient.ws = client.ws;
      if (existingClient.disconnectTimer) {
        clearTimeout(existingClient.disconnectTimer);
        existingClient.disconnectTimer = undefined;
      }
      gameState.removeClient(client.id, true);
      client = existingClient;
    }
  }

  // Compile active players for the welcome list (only in the same map)
  const players = gameState.getClientsInMap(client.mapInstanceId)
    .filter(c => c.id !== client.id)
    .map(c => ({
      id: c.id,
      username: c.username,
      position: c.position,
      direction: c.direction,
    }));

  const map = gameState.getMap(client.mapInstanceId)!;

  gameState.send(client, {
    type: PacketType.Welcome,
    playerId: client.id,
    position: client.position,
    players,
    mapId: map.id,
    seed: map.seed,
    timestamp: Date.now(),
  } as WelcomePacket);

  // Notify other players in the same map
  gameState.broadcastToMap(client.mapInstanceId, {
    type: PacketType.PlayerJoin,
    player: {
      id: client.id,
      username: client.username,
      position: client.position,
      direction: client.direction,
    },
    timestamp: Date.now(),
  } as PlayerJoinPacket, client.id);

  console.log(`  → ${client.username} (${client.id}) joined`);
}

function handlePlayerInput(gameState: GameState, client: ClientState, packet: PlayerInputPacket): void {
  // Validate input sequence
  if (packet.inputSeq <= client.lastInputSeq) {
    console.log(`[!] Replayed input from ${client.id}`);
    return;
  }
  client.lastInputSeq = packet.inputSeq;

  // Update direction
  client.direction = packet.direction;

  // Calculate new position from input using correct exported speed values
  const speed = packet.keys['ShiftLeft'] || packet.keys['ShiftRight'] ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED;
  let dx = 0, dy = 0;

  if (packet.keys['ArrowUp'] || packet.keys['KeyW']) dy -= speed;
  if (packet.keys['ArrowDown'] || packet.keys['KeyS']) dy += speed;
  if (packet.keys['ArrowLeft'] || packet.keys['KeyA']) dx -= speed;
  if (packet.keys['ArrowRight'] || packet.keys['KeyD']) dx += speed;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  // Calculate theoretical new position with boundaries
  const newX = Math.max(0, Math.min(4096, client.position.x + dx));
  const newY = Math.max(0, Math.min(4096, client.position.y + dy));
  
  if (packet.position) {
    const pX = packet.position.x;
    const pY = packet.position.y;
    
    // Check distance between server's expected pos and client's requested pos
    const diffX = pX - newX;
    const diffY = pY - newY;
    const distSq = diffX * diffX + diffY * diffY;
    
    // Allow up to ~80 pixels of divergence (squared = 6400) to account for frame-rate physics & slight lag
    if (distSq < 6400) {
      // Trust client's resolved collision position
      client.position = { x: Math.round(pX * 10) / 10, y: Math.round(pY * 10) / 10 };
    } else {
      // Reject client's position, fallback to server's calculation and snap them back
      client.position = { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 };
      gameState.send(client, {
        type: PacketType.PlayerPos,
        position: client.position,
        direction: client.direction,
        inputSeq: packet.inputSeq,
        timestamp: Date.now(),
      } as PlayerPosPacket);
    }
  } else {
    // Legacy fallback (no client position sent)
    client.position = { x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 };
  }

  // Broadcast the move to other players in the same map
  gameState.broadcastToMap(client.mapInstanceId, {
    type: PacketType.PlayerMove,
    playerId: client.id,
    position: client.position,
    direction: client.direction,
    inputSeq: packet.inputSeq,
    timestamp: Date.now(),
  } as PlayerMovePacket, client.id);
}

function handleChunkRequest(gameState: GameState, client: ClientState, packet: ChunkRequestPacket): void {
  const map = gameState.getMap(client.mapInstanceId);
  const seed = map ? map.seed : 0;

  const chunks: ChunkSnapshot[] = packet.chunks.map(c => ({
    cx: c.cx,
    cy: c.cy,
    tiles: generateChunkTiles(c.cx, c.cy, seed, client.mapInstanceId),
    npcs: [],
  }));

  gameState.send(client, {
    type: PacketType.ChunkData,
    chunks,
    timestamp: Date.now(),
  } as ChunkDataPacket);
}

function handlePing(gameState: GameState, client: ClientState, packet: PingPacket): void {
  gameState.send(client, {
    type: PacketType.Pong,
    clientTime: packet.clientTime,
    serverTime: Date.now(),
  } as PongPacket);
}

function handleMapChangeRequest(gameState: GameState, client: ClientState, packet: MapChangeRequestPacket): void {
  // 1. Leave current map
  const oldMapId = client.mapInstanceId;
  const oldMap = gameState.getMap(oldMapId);
  if (oldMap) {
    oldMap.players.delete(client.id);
    gameState.broadcastToMap(oldMapId, {
      type: PacketType.PlayerLeave,
      playerId: client.id,
      timestamp: Date.now(),
    } as PlayerLeavePacket);
  }

  // 2. Join new map
  let newMap = gameState.getMap(packet.targetMapId);
  if (!newMap) {
    // If it's a route and doesn't exist, create it
    if (packet.targetMapId.startsWith('route_')) {
      newMap = gameState.createRouteMap(packet.targetMapId);
    } else {
      // Fallback to city
      newMap = gameState.getMap('city')!;
    }
  }

  client.mapInstanceId = newMap.id;
  newMap.players.add(client.id);
  
  // Calculate specific spawn positions and directions based on target map and old map
  let spawnX = 128 * 16;
  let spawnY = 128 * 16;
  let spawnDirection: 'up' | 'down' | 'left' | 'right' = 'down';

  if (newMap.id === 'city') {
    if (oldMapId === 'route_1') {
      spawnX = 127 * 16;
      spawnY = 98 * 16;
      spawnDirection = 'down';
    } else if (oldMapId === 'route_2') {
      spawnX = 127 * 16;
      spawnY = 146 * 16;
      spawnDirection = 'up';
    } else if (oldMapId === 'route_3') {
      spawnX = 146 * 16;
      spawnY = 121 * 16;
      spawnDirection = 'left';
    } else if (oldMapId === 'route_4') {
      spawnX = 108 * 16;
      spawnY = 121 * 16;
      spawnDirection = 'right';
    } else {
      spawnX = 128 * 16;
      spawnY = 128 * 16;
      spawnDirection = 'down';
    }
  } else if (newMap.id === 'route_1') {
    // Route 1 Portal (facing North/up into route)
    spawnX = 127 * 16;
    spawnY = 242 * 16;
    spawnDirection = 'up';
  } else if (newMap.id === 'route_2') {
    // Route 2 Portal (facing South/down into route)
    spawnX = 127 * 16;
    spawnY = 14 * 16;
    spawnDirection = 'down';
  } else if (newMap.id === 'route_3') {
    // Route 3 Portal (facing East/right into route)
    spawnX = 14 * 16;
    spawnY = 121 * 16;
    spawnDirection = 'right';
  } else if (newMap.id === 'route_4') {
    // Route 4 Portal (facing West/left into route)
    spawnX = 242 * 16;
    spawnY = 121 * 16;
    spawnDirection = 'left';
  }

  // Assign safe spawn position depending on map
  client.position = findSafeSpawn(newMap.seed, spawnX, spawnY, newMap.id);
  client.direction = spawnDirection;

  // 3. Send response to client
  const players = gameState.getClientsInMap(newMap.id)
    .filter(c => c.id !== client.id)
    .map(c => ({
      id: c.id,
      username: c.username,
      position: c.position,
      direction: c.direction,
    }));

  gameState.send(client, {
    type: PacketType.MapChangeResponse,
    mapId: newMap.id,
    seed: newMap.seed,
    position: client.position,
    players,
    timestamp: Date.now(),
  } as MapChangeResponsePacket);

  // 4. Notify others in the new map
  gameState.broadcastToMap(newMap.id, {
    type: PacketType.PlayerJoin,
    player: {
      id: client.id,
      username: client.username,
      position: client.position,
      direction: client.direction,
    },
    timestamp: Date.now(),
  } as PlayerJoinPacket, client.id);
}