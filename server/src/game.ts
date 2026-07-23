import { WebSocket } from 'ws';
import { ClientState, MapInstance } from './types.js';
import { AnyPacket, findSafeSpawn, WORLD_SEED } from 'poke-ter-shared';

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

  constructor() {
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