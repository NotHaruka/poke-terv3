import { WebSocket } from 'ws';

export interface MapInstance {
  id: string;
  seed: number;
  type: 'city' | 'route';
  players: Set<string>;
}

export interface ClientState {
  ws: WebSocket;
  id: string;
  username: string;
  position: { x: number; y: number };
  direction: string;
  inputSeq: number;
  lastInputSeq: number;
  mapInstanceId: string;
}
