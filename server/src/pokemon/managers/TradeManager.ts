import { GameState } from './game.js';
import { ClientState } from '../../types.js';
import {
  PacketType, AnyPacket, TradeRequestPacket, TradeResponsePacket,
  TradeOfferUpdatePacket, TradeConfirmPacket, TradeCompletePacket,
  MonsterSnapshot
} from 'poke-ter-shared';
import { savePlayerData } from './SaveManager.js';

export interface TradeSession {
  id: string;
  p1: ClientState;
  p2: ClientState;
  p1Slot: number; // -1 if none
  p2Slot: number; // -1 if none
  p1Confirmed: boolean;
  p2Confirmed: boolean;
}

export class TradeManager {
  private server: GameState;
  private sessions: Map<string, TradeSession> = new Map();
  private pendingRequests: Map<string, { targetId: string; timeout: NodeJS.Timeout }> = new Map();

  constructor(server: GameState) {
    this.server = server;
  }

  public handlePacket(client: ClientState, packet: AnyPacket): void {
    switch (packet.type) {
      case PacketType.TradeRequest:
        this.handleTradeRequest(client, packet as TradeRequestPacket);
        break;
      case PacketType.TradeResponse:
        this.handleTradeResponse(client, packet as TradeResponsePacket);
        break;
      case PacketType.TradeOfferUpdate:
        this.handleTradeOfferUpdate(client, packet as TradeOfferUpdatePacket);
        break;
      case PacketType.TradeConfirm:
        this.handleTradeConfirm(client, packet as TradeConfirmPacket);
        break;
    }
  }

  private handleTradeRequest(client: ClientState, packet: TradeRequestPacket): void {
    const target = this.server.getClient(packet.targetPlayerId);
    if (!target) {
      this.server.send(client, {
        type: PacketType.TradeComplete,
        tradeId: 'none',
        success: false
      } as TradeCompletePacket);
      return;
    }

    // Cancel any existing pending trade requests from this client
    const existing = this.pendingRequests.get(client.id);
    if (existing) {
      clearTimeout(existing.timeout);
      this.pendingRequests.delete(client.id);
    }

    // Set 30s timeout for trade request
    const timeout = setTimeout(() => {
      this.pendingRequests.delete(client.id);
      this.server.send(client, {
        type: PacketType.TradeResponse,
        senderId: target.id,
        senderName: target.username,
        accept: false
      } as TradeResponsePacket);
    }, 30000);

    this.pendingRequests.set(client.id, { targetId: target.id, timeout });

    // Send TradeRequest to target
    this.server.send(target, {
      type: PacketType.TradeRequest,
      targetPlayerId: client.id,
      senderName: client.username
    } as TradeRequestPacket);
  }

  private handleTradeResponse(client: ClientState, packet: TradeResponsePacket): void {
    const challenger = this.server.getClient(packet.senderId);
    if (!challenger) return;

    const req = this.pendingRequests.get(challenger.id);
    if (!req || req.targetId !== client.id) return;

    clearTimeout(req.timeout);
    this.pendingRequests.delete(challenger.id);

    if (packet.accept) {
      const tradeId = `trade_${Date.now()}_${challenger.id}_${client.id}`;
      const session: TradeSession = {
        id: tradeId,
        p1: challenger,
        p2: client,
        p1Slot: -1,
        p2Slot: -1,
        p1Confirmed: false,
        p2Confirmed: false
      };

      this.sessions.set(tradeId, session);

      // Tell both players the trade has accepted and begun
      const welcomeTrade: TradeResponsePacket = {
        type: PacketType.TradeResponse,
        senderId: challenger.id,
        senderName: challenger.username,
        accept: true,
        seq: 1 // signify trade starts
      } as any;

      this.server.send(challenger, {
        ...welcomeTrade,
        senderId: client.id,
        senderName: client.username
      });
      this.server.send(client, welcomeTrade);
    } else {
      // Decline trade
      this.server.send(challenger, {
        type: PacketType.TradeResponse,
        senderId: client.id,
        senderName: client.username,
        accept: false
      } as TradeResponsePacket);
    }
  }

  private handleTradeOfferUpdate(client: ClientState, packet: TradeOfferUpdatePacket): void {
    const session = this.sessions.get(packet.tradeId);
    if (!session) return;

    const isP1 = client.id === session.p1.id;
    const opponent = isP1 ? session.p2 : session.p1;

    if (isP1) {
      session.p1Slot = packet.offeredSlot;
      session.p1Confirmed = false;
      session.p2Confirmed = false; // Reset confirmations
    } else {
      session.p2Slot = packet.offeredSlot;
      session.p1Confirmed = false;
      session.p2Confirmed = false; // Reset confirmations
    }

    // Send update to the opponent
    this.server.send(opponent, {
      type: PacketType.TradeOfferUpdate,
      tradeId: session.id,
      offeredSlot: packet.offeredSlot,
      offeredMonsterSnapshot: packet.offeredMonsterSnapshot
    } as TradeOfferUpdatePacket);
  }

  private handleTradeConfirm(client: ClientState, packet: TradeConfirmPacket): void {
    const session = this.sessions.get(packet.tradeId);
    if (!session) return;

    const isP1 = client.id === session.p1.id;
    const opponent = isP1 ? session.p2 : session.p1;

    if (isP1) {
      session.p1Confirmed = packet.confirmed;
    } else {
      session.p2Confirmed = packet.confirmed;
    }

    // Notify opponent
    this.server.send(opponent, {
      type: PacketType.TradeConfirm,
      tradeId: session.id,
      confirmed: packet.confirmed
    } as TradeConfirmPacket);

    // If both confirmed and slots are valid, execute trade!
    if (session.p1Confirmed && session.p2Confirmed) {
      this.executeTrade(session);
    }
  }

  private executeTrade(session: TradeSession): void {
    const p1Party = session.p1.playerData?.party;
    const p2Party = session.p2.playerData?.party;

    if (
      !p1Party || !p2Party ||
      session.p1Slot < 0 || session.p1Slot >= p1Party.length ||
      session.p2Slot < 0 || session.p2Slot >= p2Party.length
    ) {
      // Invalid slots, trade fails
      const failPacket: TradeCompletePacket = {
        type: PacketType.TradeComplete,
        tradeId: session.id,
        success: false
      };
      this.server.send(session.p1, failPacket);
      this.server.send(session.p2, failPacket);
      this.sessions.delete(session.id);
      return;
    }

    const m1 = p1Party[session.p1Slot];
    const m2 = p2Party[session.p2Slot];

    // Auth swap
    p1Party[session.p1Slot] = m2;
    p2Party[session.p2Slot] = m1;

    // Save player states
    savePlayerData(session.p1.id, session.p1.playerData!);
    savePlayerData(session.p2.id, session.p2.playerData!);

    // Helper snapshots
    const m1Snapshot: MonsterSnapshot = {
      speciesId: m1.speciesId,
      level: m1.level,
      currentHp: m1.currentHp,
      maxHp: m1.maxHp,
      stats: m1.stats,
      status: m1.status,
      nickname: m1.nickname
    };

    const m2Snapshot: MonsterSnapshot = {
      speciesId: m2.speciesId,
      level: m2.level,
      currentHp: m2.currentHp,
      maxHp: m2.maxHp,
      stats: m2.stats,
      status: m2.status,
      nickname: m2.nickname
    };

    // Send complete success
    this.server.send(session.p1, {
      type: PacketType.TradeComplete,
      tradeId: session.id,
      success: true,
      receivedMonster: m2Snapshot
    } as TradeCompletePacket);

    this.server.send(session.p2, {
      type: PacketType.TradeComplete,
      tradeId: session.id,
      success: true,
      receivedMonster: m1Snapshot
    } as TradeCompletePacket);

    this.sessions.delete(session.id);
  }

  public handleClientDisconnect(clientId: string): void {
    // Cancel pending requests involving client
    const req = this.pendingRequests.get(clientId);
    if (req) {
      clearTimeout(req.timeout);
      this.pendingRequests.delete(clientId);
    }

    for (const [challengerId, challenge] of this.pendingRequests.entries()) {
      if (challenge.targetId === clientId) {
        clearTimeout(challenge.timeout);
        this.pendingRequests.delete(challengerId);
      }
    }

    // Abort any active trade session involving this client
    for (const [id, session] of this.sessions.entries()) {
      if (session.p1.id === clientId || session.p2.id === clientId) {
        const opponent = session.p1.id === clientId ? session.p2 : session.p1;
        this.server.send(opponent, {
          type: PacketType.TradeComplete,
          tradeId: id,
          success: false
        } as TradeCompletePacket);
        this.sessions.delete(id);
      }
    }
  }
}
