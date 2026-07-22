import { WebSocket } from 'ws';
import { PlayerProfile } from 'poke-ter-shared';

export interface MapInstance {
  id: string;
  seed: number;
  type: 'city' | 'route';
  players: Set<string>;
}

export interface ClientState {
  ws: WebSocket | null;
  id: string;
  username: string;
  position: { x: number; y: number };
  direction: string;
  inputSeq: number;
  lastInputSeq: number;
  mapInstanceId: string;
  disconnectTimer?: NodeJS.Timeout;
  profile?: PlayerProfile;
}
