import { ClientState } from '../types.js';
import { 
  BattleActionData, BattleEvent, MonsterSnapshot, 
  PacketType, BattleResultPacket, BattleEndPacket,
  MonsterInstance, MoveData, getMoveData,
  MonsterStats, StatusEffect, getMonsterSpecies,
  Stat
} from 'poke-ter-shared';
import { GameState } from '../game.js';

export class BattleInstance {
  id: string;
  p1: ClientState;
  p2?: ClientState; 
  server: GameState;
  
  isPvP: boolean;

  p1Action?: BattleActionData;
  p2Action?: BattleActionData;

  p1ActiveIndex: number = 0;
  p2ActiveIndex: number = 0;

  constructor(id: string, server: GameState, p1: ClientState, p2?: ClientState) {
    this.id = id;
    this.server = server;
    this.p1 = p1;
    this.p2 = p2;
    this.isPvP = !!p2;
    
    // Init active monster indices (find first alive)
    this.p1ActiveIndex = this.getFirstAlive(this.p1.playerData!.party);
    if (this.p2 && this.p2.playerData) {
      this.p2ActiveIndex = this.getFirstAlive(this.p2.playerData.party);
    }
  }

  getFirstAlive(party: MonsterInstance[]): number {
    const idx = party.findIndex(m => m.currentHp > 0);
    return Math.max(0, idx); // Fallback to 0
  }
  
  toSnapshot(monster: MonsterInstance): MonsterSnapshot {
    return {
      speciesId: monster.speciesId,
      level: monster.level,
      currentHp: monster.currentHp,
      maxHp: monster.maxHp,
      stats: monster.stats,
      status: monster.status,
      nickname: monster.nickname
    };
  }

  handleAction(client: ClientState, action: BattleActionData) {
    if (client.id === this.p1.id) {
      this.p1Action = action;
    } else if (this.p2 && client.id === this.p2.id) {
      this.p2Action = action;
    }

    if (this.isPvP) {
      if (this.p1Action && this.p2Action) {
        this.resolveRound();
      }
    } else {
      // PvE
      if (this.p1Action) {
        // AI chooses random move
        const party = this.p2!.playerData!.party; // Assuming wild/NPC is stored in p2 temporarily, or we create a dummy ClientState for PvE.
        // Actually for now we just handle PvP logic properly. 
        // We'll stub PvE logic or wait until we implement wild battles.
      }
    }
  }

  resolveRound() {
    const p1Party = this.p1.playerData!.party;
    const p2Party = this.p2!.playerData!.party;
    const p1Mon = p1Party[this.p1ActiveIndex];
    const p2Mon = p2Party[this.p2ActiveIndex];
    
    const events: BattleEvent[] = [];

    // Helper to send events
    const finishRound = () => {
      this.p1Action = undefined;
      this.p2Action = undefined;

      const p1Alive = p1Party.some(m => m.currentHp > 0);
      const p2Alive = p2Party.some(m => m.currentHp > 0);
      let battleOver = !p1Alive || !p2Alive;
      let winner = battleOver ? (!p1Alive ? this.p2?.username : this.p1.username) : undefined;

      const res: BattleResultPacket = {
        type: PacketType.BattleResult,
        battleId: this.id,
        events,
        turnReady: true,
        battleOver,
        winner
      };
      
      this.server.sendTo(this.p1.id, res);
      if (this.p2) this.server.sendTo(this.p2.id, res);

      if (battleOver) {
        this.server.battleManager.endBattle(this.id, "KO");
      }
    };

    // simplified resolution
    let p1First = p1Mon.stats.speed >= p2Mon.stats.speed; // naive speed check

    // Sort actions
    // Switch > items > run > attack
    const order = [
      { p: 1, c: this.p1, m: p1Mon, action: this.p1Action!, party: p1Party, isFirst: p1First },
      { p: 2, c: this.p2!, m: p2Mon, action: this.p2Action!, party: p2Party, isFirst: !p1First }
    ];

    order.sort((a, b) => {
      const getPrio = (act: BattleActionData) => act.kind === 'switch' ? 3 : act.kind === 'item' ? 2 : act.kind === 'run' ? 1 : 0;
      const prioA = getPrio(a.action);
      const prioB = getPrio(b.action);
      if (prioA !== prioB) return prioB - prioA;
      return a.isFirst ? -1 : 1;
    });

    for (const exec of order) {
      if (exec.m.currentHp <= 0 && exec.action.kind !== 'switch') continue; // Fainted, can't act

      const target = exec.p === 1 ? 'player' : 'opponent';
      const enemyTarget = exec.p === 1 ? 'opponent' : 'player';
      const enemyExec = order.find(e => e.p !== exec.p)!;

      if (exec.action.kind === 'switch') {
        if (exec.p === 1) this.p1ActiveIndex = exec.action.slot;
        else this.p2ActiveIndex = exec.action.slot;
        
        const newMon = exec.party[exec.action.slot];
        exec.m = newMon; // Update local ref
        
        events.push({
          type: 'message', text: `${exec.c.username} sent out ${getMonsterSpecies(newMon.speciesId)?.name}!`
        });
        events.push({
          type: 'switch', target, monster: this.toSnapshot(newMon)
        });
      }
      else if (exec.action.kind === 'attack') {
        const moveId = exec.m.moves[exec.action.moveIndex];
        // Stub move logic
        events.push({ type: 'message', text: `${getMonsterSpecies(exec.m.speciesId)?.name} attacked!` });
        
        let dmg = Math.max(1, Math.floor((exec.m.stats.attack * 10) / enemyExec.m.stats.defense));
        enemyExec.m.currentHp = Math.max(0, enemyExec.m.currentHp - dmg);
        
        events.push({ type: 'damage', target: enemyTarget, amount: dmg, isCrit: false, effectiveness: 1 });
        
        if (enemyExec.m.currentHp === 0) {
          events.push({ type: 'message', text: `${getMonsterSpecies(enemyExec.m.speciesId)?.name} fainted!` });
          events.push({ type: 'faint', target: enemyTarget });
        }
      }
    }

    finishRound();
  }
}
