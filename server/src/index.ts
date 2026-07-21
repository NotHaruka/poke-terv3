/** Poke-ter game and asset server */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  PacketType, AnyPacket, PlayerLeavePacket,
} from 'poke-ter-shared';

import { GameState } from './game.js';
import { handlePacket } from './handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Set up WebSocket server multiplexed on the same HTTP server
  const wss = new WebSocketServer({ server });
  console.log(`[Poke-ter Server] WebSocket server mounted on HTTP server`);

  const gameState = new GameState();

  wss.on('connection', (ws: WebSocket) => {
    // Initial assignment
    gameState.addClient(ws);
    console.log(`[+] New connection established`);

    ws.on('message', (data) => {
      try {
        const packet: AnyPacket = JSON.parse(data.toString());
        const client = gameState.getClientByWs(ws);
        if (client) {
          handlePacket(gameState, client, packet);
        }
      } catch (e) {
        console.error(`[!] Invalid packet:`, e);
      }
    });

    ws.on('close', () => {
      const client = gameState.getClientByWs(ws);
      if (client) {
        gameState.markClientDisconnected(client.id);
        console.log(`[-] ${client.id} connection closed (grace period started)`);
      }
    });

    ws.on('error', () => {
      const client = gameState.getClientByWs(ws);
      if (client) {
        gameState.markClientDisconnected(client.id);
      }
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: path.resolve(process.cwd(), 'client'),
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist/client');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Poke-ter Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
