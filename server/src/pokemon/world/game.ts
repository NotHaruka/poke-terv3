import { WebSocket } from 'ws';
import { ClientState, MapInstance } from '../../types.js';
import { AnyPacket, findSafeSpawn, WORLD_SEED, getBiomeAt, rawTerrainTile, BattleEnvironmentData } from 'poke-ter-shared';
import { BattleManager } from '../battle/BattleManager.js';
import { TradeManager } from '../managers/TradeManager.js';

export function getRouteSeed(mapId: string, worldSeed: number = WORLD_SEED): number {
  if (mapId === 'city') return 0;
  let hash = worldSeed;
  for (let i = 0; i < mapId.length; i++) {
    hash = ((hash << 5) - hash) + mapId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 2147483647;
}

export class GameState {
  private nextId = 1;
  private clients = new Map<string, ClientState>();
  private maps = new Map<string, MapInstance>();
  private mapEmptyTime = new Map<string, number>();
  public serverStartTime: number = Date.now();
  public battleManager: BattleManager;
  public tradeManager: TradeManager;

  constructor() {
    this.battleManager = new BattleManager(this);
    this.tradeManager = new TradeManager(this);
    this.maps.set('city', {
      id: 'city',
      seed: 0, // 0 for the permanent city
      type: 'city',
      players: new Set(),
    });

    setInterval(() => this.cleanupEmptyRoutes(), 5000); // Check every 5 seconds
  }

  private cleanupEmptyRoutes() {
    const now = Date.now();
    for (const [mapId, map] of this.maps) {
      if (map.type === 'route') {
        const playersOnRoute = map.players.size;
        let playersInRouteInteriors = 0;
        for (const m of this.maps.values()) {
          if (m.parentMapId === mapId && m.players.size > 0) {
            playersInRouteInteriors += m.players.size;
          }
        }

        // Only cleanup route if no players are on the route AND no players are inside houses on this route
        if (playersOnRoute === 0 && playersInRouteInteriors === 0) {
          if (!this.mapEmptyTime.has(mapId)) {
            this.mapEmptyTime.set(mapId, now);
          } else {
            const emptySince = this.mapEmptyTime.get(mapId)!;
            // 45 seconds reset timer
            if (now - emptySince >= 45000) {
              console.log(`[GameState] Destroying empty route: ${mapId}`);
              this.maps.delete(mapId);
              this.mapEmptyTime.delete(mapId);
            }
          }
        } else {
          // Reset timer if someone joined or is inside a house on this route
          this.mapEmptyTime.delete(mapId);
        }
      }
    }
  }

  public getMap(id: string): MapInstance | undefined {
    return this.maps.get(id);
  }

  public getBattleEnvironmentData(mapId: string, x: number, y: number): BattleEnvironmentData {
    const gx = Math.floor(x / 16);
    const gy = Math.floor(y / 16);
    const map = this.getMap(mapId);
    const seed = map ? map.seed : getRouteSeed(mapId);
    const isInterior = mapId.includes('interior');

    const biome = getBiomeAt(gx, gy, seed, mapId);
    const groundTile = rawTerrainTile(gx, gy, seed, mapId);

    const uptimeMs = Date.now() - this.serverStartTime;
    const uptimeMinutes = (uptimeMs / 1000 * 60) / 60;
    const inGameMinutes = (8 * 60 + uptimeMinutes) % (24 * 60);
    const hours = Math.floor(inGameMinutes / 60);

    let timeOfDay: 'morning' | 'day' | 'evening' | 'night' = 'day';
    if (hours >= 5 && hours < 10) timeOfDay = 'morning';
    else if (hours >= 10 && hours < 17) timeOfDay = 'day';
    else if (hours >= 17 && hours < 20) timeOfDay = 'evening';
    else timeOfDay = 'night';

    let weather: 'clear' | 'rain' | 'storm' | 'snow' | 'fog' | 'cloudy' = 'clear';
    if (biome.id === 'ice_peak' || biome.id === 'tundra') {
      weather = 'snow';
    } else if (biome.id === 'lake' || mapId.includes('route_3')) {
      const wHash = Math.sin(seed * 17 + hours) * 0.5 + 0.5;
      if (wHash > 0.7) weather = 'rain';
      else if (wHash > 0.5) weather = 'fog';
      else if (wHash > 0.3) weather = 'cloudy';
    } else if (biome.id === 'forest') {
      const wHash = Math.sin(seed * 31 + hours) * 0.5 + 0.5;
      if (wHash > 0.8) weather = 'storm';
      else if (wHash > 0.6) weather = 'rain';
      else if (wHash > 0.4) weather = 'cloudy';
    }

    const nearbyObjects: string[] = [];
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        const nx = gx + dx;
        const ny = gy + dy;
        const t = rawTerrainTile(nx, ny, seed, mapId);
        if (t === 5) nearbyObjects.push('tree');
        else if (t === 9) nearbyObjects.push('tall_grass');
        else if (t === 3) nearbyObjects.push('water');
        else if (t === 4) nearbyObjects.push('cliff');
      }
    }

    return {
      mapId,
      x,
      y,
      seed,
      biomeId: biome.id,
      biomeName: biome.name,
      weather,
      timeOfDay,
      isInterior,
      groundTile,
      nearbyObjects: Array.from(new Set(nearbyObjects))
    };
  }

  public createRouteMap(id: string): MapInstance {
    const seed = getRouteSeed(id);
    const map: MapInstance = {
      id,
      seed,
      type: 'route',
      players: new Set(),
    };
    this.maps.set(id, map);
    return map;
  }

  public createInteriorMap(id: string): MapInstance {
    let parentMapId: string | undefined;
    let seed = 0;
    if (id.includes(':')) {
      parentMapId = id.split(':')[0];
      const parent = this.maps.get(parentMapId);
      if (parent) {
        seed = parent.seed;
      } else if (parentMapId.startsWith('route_')) {
        seed = getRouteSeed(parentMapId);
      }
    }

    const map: MapInstance = {
      id,
      seed,
      type: 'interior',
      parentMapId,
      players: new Set(),
    };
    this.maps.set(id, map);
    return map;
  }

  public addClient(ws: WebSocket): ClientState {
    const playerId = `player_${this.nextId++}`;
    const cityMap = this.maps.get('city')!;
    const client: ClientState = {
      ws,
      id: playerId,
      username: 'Unknown',
      position: findSafeSpawn(cityMap.seed, 128 * 16, 128 * 16),
      direction: 'down',
      inputSeq: 0,
      lastInputSeq: -1,
      mapInstanceId: 'city', // default spawn
    };
    this.clients.set(playerId, client);
    this.maps.get('city')!.players.add(playerId);
    return client;
  }

  public getClientByWs(ws: WebSocket): ClientState | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) {
        return client;
      }
    }
    return undefined;
  }

  public updateClientId(oldId: string, newId: string): void {
    const client = this.clients.get(oldId);
    if (!client) return;
    
    // Check if newId already in map (edge case cleanup)
    const existing = this.clients.get(newId);
    if (existing && existing !== client) {
       this.removeClient(newId);
    }

    const map = this.maps.get(client.mapInstanceId);
    if (map) {
      map.players.delete(oldId);
      map.players.add(newId);
    }
    this.clients.delete(oldId);
    client.id = newId;
    this.clients.set(newId, client);
  }

  public markClientDisconnected(playerId: string): void {
    const client = this.clients.get(playerId);
    if (!client) return;
    
    // Clear ws to allow reconnect
    client.ws = null;
    
    // 15 seconds grace period
    client.disconnectTimer = setTimeout(() => {
      this.removeClient(playerId);
      this.broadcastToMap(client.mapInstanceId, {
        type: 11, // PacketType.PlayerLeave
        playerId: client.id,
        timestamp: Date.now(),
      });
      console.log(`[-] ${client.id} session expired`);
    }, 15000);
  }

  public removeClient(playerId: string, temporary: boolean = false): void {
    this.battleManager.handleClientDisconnect(playerId);
    this.tradeManager.handleClientDisconnect(playerId);
    const client = this.clients.get(playerId);
    if (client) {
      if (client.disconnectTimer) {
        clearTimeout(client.disconnectTimer);
      }
      const map = this.maps.get(client.mapInstanceId);
      if (map) {
        map.players.delete(playerId);
      }
    }
    this.clients.delete(playerId);
  }

  public getClient(playerId: string): ClientState | undefined {
    return this.clients.get(playerId);
  }

  public getAllClients(): ClientState[] {
    return Array.from(this.clients.values());
  }

  public getClientsInMap(mapId: string): ClientState[] {
    const map = this.maps.get(mapId);
    if (!map) return [];
    const result: ClientState[] = [];
    for (const pid of map.players) {
      const c = this.clients.get(pid);
      if (c) result.push(c);
    }
    return result;
  }

  public send(client: ClientState, packet: AnyPacket): void {
    if (client.ws && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(JSON.stringify(packet));
    }
  }

  public broadcastToMap(mapId: string, packet: AnyPacket, excludeId?: string): void {
    const data = JSON.stringify(packet);
    const map = this.maps.get(mapId);
    if (!map) return;
    
    for (const id of map.players) {
      if (excludeId && id === excludeId) continue;
      const client = this.clients.get(id);
      if (client && client.ws && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }

  public broadcast(packet: AnyPacket, excludeId?: string): void {
    const data = JSON.stringify(packet);
    for (const [id, client] of this.clients) {
      if (excludeId && id === excludeId) continue;
      if (client.ws && client.ws.readyState === 1) { // WebSocket.OPEN
        client.ws.send(data);
      }
    }
  }
}