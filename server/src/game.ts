import { WebSocket } from 'ws';
import { ClientState, MapInstance } from './types.js';
import { AnyPacket, findSafeSpawn } from 'poke-ter-shared';

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
        if (map.players.size === 0) {
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
          // Reset timer if someone joined
          this.mapEmptyTime.delete(mapId);
        }
      }
    }
  }

  public getMap(id: string): MapInstance | undefined {
    return this.maps.get(id);
  }

  public createRouteMap(id: string): MapInstance {
    const seed = Math.floor(Math.random() * 2147483647);
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
    const map: MapInstance = {
      id,
      seed: 0,
      type: 'interior',
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
