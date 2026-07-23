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

    if (!challenger.playerData || !challenger.playerData.party || challenger.playerData.party.length === 0) {
      this.server.send(challenger, {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "You need a monster to battle!"
      } as BattleChallengeResultPacket);
      return;
    }

    if (!target.playerData || !target.playerData.party || target.playerData.party.length === 0) {
      this.server.send(challenger, {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "That player has no monsters to battle."
      } as BattleChallengeResultPacket);
      return;
    }

    if (this.pendingChallenges.has(challenger.id)) {
      this.server.send(challenger, {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "You already have a pending battle request."
      } as BattleChallengeResultPacket);
      return;
    }

    // Check if target is already being challenged
    for (const [cId, challenge] of this.pendingChallenges.entries()) {
      if (challenge.targetId === target.id) {
        this.server.send(challenger, {
          type: PacketType.BattleChallengeResult,
          accepted: false,
          message: "That player is currently processing another request."
        } as BattleChallengeResultPacket);
        return;
      }
    }

    const timeout = setTimeout(() => {
      this.pendingChallenges.delete(challenger.id);
      const timeoutMsg: BattleChallengeResultPacket = {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "The battle request timed out."
      };
      this.server.send(challenger, timeoutMsg);
      this.server.send(target, timeoutMsg);
    }, 30000);

    this.pendingChallenges.set(challenger.id, { targetId: target.id, timeout });

    this.server.send(target, {
      type: PacketType.BattleChallengeResponse,
      challengerId: challenger.id,
      challengerName: challenger.username
    } as BattleChallengeResponsePacket);
  }

  handleChallengeAnswer(sender: ClientState, packet: BattleChallengeAnswerPacket) {
    // Check if sender is challenger cancelling or target answering
    let challengerId = packet.challengerId;
    if (sender.id === packet.challengerId) {
      // Challenger is cancelling
      const challenge = this.pendingChallenges.get(sender.id);
      if (!challenge) return;

      clearTimeout(challenge.timeout);
      this.pendingChallenges.delete(sender.id);

      const target = this.server.getClient(challenge.targetId);
      const cancelMsg: BattleChallengeResultPacket = {
        type: PacketType.BattleChallengeResult,
        accepted: false,
        message: "Battle request cancelled."
      };

      this.server.send(sender, cancelMsg);
      if (target) {
        this.server.send(target, cancelMsg);
      }
      return;
    }

    // Sender is target answering
    const challenge = this.pendingChallenges.get(challengerId);
    if (!challenge || challenge.targetId !== sender.id) return;

    clearTimeout(challenge.timeout);
    this.pendingChallenges.delete(challengerId);

    const challenger = this.server.getClient(challengerId);
    const target = sender;

    const resultMsg: BattleChallengeResultPacket = {
      type: PacketType.BattleChallengeResult,
      accepted: packet.accept,
      message: packet.accept ? undefined : `${target.username} declined the challenge.`
    };

    if (challenger) this.server.send(challenger, resultMsg);
    this.server.send(target, resultMsg);

    if (packet.accept && challenger) {
      this.startPvPBattle(challenger, target);
    }
  }

  handleClientDisconnect(clientId: string) {
    for (const [challengerId, challenge] of this.pendingChallenges.entries()) {
      if (challengerId === clientId || challenge.targetId === clientId) {
        clearTimeout(challenge.timeout);
        this.pendingChallenges.delete(challengerId);

        const otherId = challengerId === clientId ? challenge.targetId : challengerId;
        const otherClient = this.server.getClient(otherId);
        if (otherClient) {
          this.server.send(otherClient, {
            type: PacketType.BattleChallengeResult,
            accepted: false,
            message: "The other player disconnected."
          } as BattleChallengeResultPacket);
        }
      }
    }
  }

  startPvPBattle(p1: ClientState, p2: ClientState) {
    const battleId = Math.random().toString(36).substr(2, 9);
    const instance = new BattleInstance(battleId, this.server, p1, p2);
    this.battles.set(battleId, instance);

    const env = this.server.getBattleEnvironmentData(p1.mapInstanceId, p1.position.x, p1.position.y);

    // Send BattleStart to p1
    this.server.send(p1, {
      type: PacketType.BattleStart,
      battleId,
      isPvP: true,
      opponentName: p2.username,
      opponentId: p2.id,
      playerMonsters: p1.playerData!.party.map(m => instance.toSnapshot(m)),
      opponentMonsters: p2.playerData!.party.map(m => instance.toSnapshot(m)),
      env
    } as BattleStartPacket);

    // Send BattleStart to p2
    this.server.send(p2, {
      type: PacketType.BattleStart,
      battleId,
      isPvP: true,
      opponentName: p1.username,
      opponentId: p1.id,
      playerMonsters: p2.playerData!.party.map(m => instance.toSnapshot(m)),
      opponentMonsters: p1.playerData!.party.map(m => instance.toSnapshot(m)),
      env
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
      battle.clearTurnTimer();
      // Clean up states
      this.battles.delete(battleId);
    }
  }
}
