/** WebSocket network client */

import {
  PacketType, AnyPacket, HelloPacket, WelcomePacket,
  PlayerInputPacket, PlayerMovePacket, ChunkRequestPacket, ChunkDataPacket,
  PlayerJoinPacket, PlayerLeavePacket, PingPacket, PongPacket,
  SERVER_PORT,
} from 'poke-ter-shared';

export type MessageHandler = (packet: AnyPacket) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private playerId: string = '';
  private inputSeq = 0;
  private ping = 0;
  private handlers = new Map<PacketType, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private url: string;
  private username: string;
  private version: string;

  constructor(username: string, version: string = '0.1.0', host?: string, port?: number) {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      this.url = `${protocol}//${window.location.host}`;
    } else {
      this.url = `ws://${host || 'localhost'}:${port || SERVER_PORT}`;
    }
    this.username = username;
    this.version = version;
  }

  /** Connect to the server */
  connect(): void {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.sendHello();
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: AnyPacket = JSON.parse(event.data);
          this.dispatch(packet);
        } catch (e) {
          console.error('Failed to parse packet:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.connected = false;
      };
    } catch (e) {
      console.error('Failed to connect:', e);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from the server */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }

  /** Send a packet */
  send(packet: AnyPacket): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(packet));
  }

  /** Send player input to server */
  sendInput(keys: Record<string, boolean>, direction: string, position?: { x: number; y: number }): void {
    const packet: PlayerInputPacket = {
      type: PacketType.PlayerInput,
      inputSeq: this.inputSeq++,
      keys,
      direction,
      position,
      timestamp: Date.now(),
    };
    this.send(packet);
  }

  /** Request chunks from server */
  requestChunks(chunks: { cx: number; cy: number }[]): void {
    const packet: ChunkRequestPacket = {
      type: PacketType.ChunkRequest,
      chunks,
      timestamp: Date.now(),
    };
    this.send(packet);
  }

  /** Register a packet handler */
  on(type: PacketType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.add(handler);
    } else {
      this.handlers.set(type, new Set([handler]));
    }
  }

  /** Remove a packet handler */
  off(type: PacketType, handler: MessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /** Check connection status */
  isConnected(): boolean {
    return this.connected;
  }

  /** Reconnect with a new profile */
  setProfile(username: string): void {
    this.username = username;
    if (this.connected) {
      this.sendHello();
    }
  }

  /** Get player ID */
  getPlayerId(): string {
    return this.playerId;
  }

  getId(): string {
    return this.playerId;
  }

  /** Get ping in ms */
  getPing(): number {
    return this.ping;
  }

  private sendHello(): void {
    let savedSessionId = this.playerId;
    if (!savedSessionId) {
      try { savedSessionId = sessionStorage.getItem('poke_ter_session_id') || ''; } catch (e) {}
    }
    
    let profile = undefined;
    try {
      const profileStr = localStorage.getItem('poketer_player_profile');
      if (profileStr) {
        profile = JSON.parse(profileStr);
      }
    } catch(e) {}
    
    const packet: HelloPacket = {
      type: PacketType.Hello,
      username: this.username,
      version: this.version,
      sessionId: savedSessionId || undefined,
      profile: profile,
      timestamp: Date.now(),
    };
    this.send(packet);
  }

  private dispatch(packet: AnyPacket): void {
    const handlers = this.handlers.get(packet.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(packet);
      }
    }

    // Handle specific packets
    switch (packet.type) {
      case PacketType.Welcome:
        const welcome = packet as WelcomePacket;
        this.playerId = welcome.playerId;
        try { sessionStorage.setItem('poke_ter_session_id', this.playerId); } catch (e) {}
        break;
      case PacketType.Pong:
        const pong = packet as PongPacket;
        this.ping = Date.now() - pong.clientTime;
        break;
    }
  }

  private startPing(): void {
    setInterval(() => {
      if (!this.connected) return;
      this.send({
        type: PacketType.Ping,
        clientTime: Date.now(),
        timestamp: Date.now(),
      } as PingPacket);
    }, 5000);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }
}