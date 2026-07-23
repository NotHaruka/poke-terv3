import { WebSocket } from 'ws';
import { PlayerProfile, PlayerData } from 'poke-ter-shared';

export interface MapInstance {
  id: string;
  seed: number;
  type: 'city' | 'route' | 'interior';
  parentMapId?: string;
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
  playerData?: PlayerData;
}
