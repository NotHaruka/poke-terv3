import { ClientState } from '../types.js';
import { 
  PacketType, BattleChallengeRequestPacket, BattleChallengeResponsePacket, 
  BattleChallengeAnswerPacket, BattleChallengeResultPacket, BattleStartPacket,
  BattleActionPacket
} from 'poke-ter-shared';
import { GameState } from '../game.js';
import { BattleInstance } from './BattleInstance.ts';

export class BattleManager {
  server: GameState;
  battles: Map<string, BattleInstance> = new Map();
  // challengerId -> targetId
  pendingChallenges: Map<string, { targetId: string, timeout: NodeJS.Timeout }> = new Map();
  
  constructor(server: GameState) {
    this.server = server;
  }

  handlePacket(client: ClientState, packet: any) {
    switch (packet.type) {
      case PacketType.BattleChallengeRequest:
        this.handleChallengeRequest(client, packet as BattleChallengeRequestPacket);
        break;
      case PacketType.BattleChallengeAnswer:
        this.handleChallengeAnswer(client, packet as BattleChallengeAnswerPacket);
        break;
      case PacketType.BattleAction:
        this.handleBattleAction(client, packet as BattleActionPacket);
        break;
    }
  }

  handleChallengeRequest(challenger: ClientState, packet: BattleChallengeRequestPacket) {
    const target = this.server.getClient(packet.targetPlayerId);
    if (!target) return;

    if (this.pendingChallenges.has(challenger.id)) return; // Already challenging

    // Verify distance (optional)

    const timeout = setTimeout(() => {
      this.pendingChallenges.delete(challenger.id);
      this.server.send(challenger, {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "The battle request timed out."
      } as BattleChallengeResultPacket);
    }, 30000);

    this.pendingChallenges.set(challenger.id, { targetId: target.id, timeout });

    this.server.send(target, {
      type: PacketType.BattleChallengeResponse,
      challengerId: challenger.id,
      challengerName: challenger.username
    } as BattleChallengeResponsePacket);
  }

  handleChallengeAnswer(target: ClientState, packet: BattleChallengeAnswerPacket) {
    const challenge = this.pendingChallenges.get(packet.challengerId);
    if (!challenge || challenge.targetId !== target.id) return; // Invalid

    clearTimeout(challenge.timeout);
    this.pendingChallenges.delete(packet.challengerId);

    const challenger = this.server.getClient(packet.challengerId);
    if (!challenger) return;

    this.server.send(challenger, {
      type: PacketType.BattleChallengeResult,
      accepted: packet.accept
    } as BattleChallengeResultPacket);

    if (packet.accept) {
      this.startPvPBattle(challenger, target);
    }
  }

  startPvPBattle(p1: ClientState, p2: ClientState) {
    const battleId = Math.random().toString(36).substr(2, 9);
    const instance = new BattleInstance(battleId, this.server, p1, p2);
    this.battles.set(battleId, instance);

    // Send BattleStart to p1
    this.server.send(p1, {
      type: PacketType.BattleStart,
      battleId,
      isPvP: true,
      opponentName: p2.username,
      opponentId: p2.id,
      playerMonsters: p1.playerData!.party.map(m => instance.toSnapshot(m)),
      opponentMonsters: p2.playerData!.party.map(m => instance.toSnapshot(m))
    } as BattleStartPacket);

    // Send BattleStart to p2
    this.server.send(p2, {
      type: PacketType.BattleStart,
      battleId,
      isPvP: true,
      opponentName: p1.username,
      opponentId: p1.id,
      playerMonsters: p2.playerData!.party.map(m => instance.toSnapshot(m)),
      opponentMonsters: p1.playerData!.party.map(m => instance.toSnapshot(m))
    } as BattleStartPacket);
  }

  handleBattleAction(client: ClientState, packet: BattleActionPacket) {
    const battle = this.battles.get(packet.battleId);
    if (!battle) return;

    battle.handleAction(client, packet.action);
  }

  endBattle(battleId: string, reason: string) {
    const battle = this.battles.get(battleId);
    if (battle) {
      // Clean up states
      this.battles.delete(battleId);
    }
  }
}
