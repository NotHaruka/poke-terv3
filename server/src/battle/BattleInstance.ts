import { ClientState } from '../types.js';
import { 
  BattleActionData, BattleEvent, MonsterSnapshot, 
  PacketType, BattleResultPacket, BattleEndPacket,
  MonsterInstance, MoveData, getMoveData, getDefaultMovesForSpecies,
  MonsterStats, StatusEffect, getMonsterSpecies, getTypeEffectiveness,
  MoveCategory
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
    
    // Ensure parties have moves
    if (this.p1.playerData?.party) {
      for (const m of this.p1.playerData.party) {
        if (!m.moves || m.moves.length === 0) {
          m.moves = getDefaultMovesForSpecies(m.speciesId);
        }
      }
    }
    if (this.p2?.playerData?.party) {
      for (const m of this.p2.playerData.party) {
        if (!m.moves || m.moves.length === 0) {
          m.moves = getDefaultMovesForSpecies(m.speciesId);
        }
      }
    }

    // Init active monster indices (find first alive)
    this.p1ActiveIndex = this.getFirstAlive(this.p1.playerData!.party);
    if (this.p2 && this.p2.playerData) {
      this.p2ActiveIndex = this.getFirstAlive(this.p2.playerData.party);
    }
  }

  getFirstAlive(party: MonsterInstance[]): number {
    const idx = party.findIndex(m => m.currentHp > 0);
    return Math.max(0, idx);
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
    }
  }

  resolveRound() {
    const p1Party = this.p1.playerData!.party;
    const p2Party = this.p2!.playerData!.party;
    let p1Mon = p1Party[this.p1ActiveIndex];
    let p2Mon = p2Party[this.p2ActiveIndex];
    
    const events: BattleEvent[] = [];

    const finishRound = () => {
      this.p1Action = undefined;
      this.p2Action = undefined;

      const p1Alive = p1Party.some(m => m.currentHp > 0);
      const p2Alive = p2Party.some(m => m.currentHp > 0);
      let battleOver = !p1Alive || !p2Alive;
      let winner = battleOver ? (!p1Alive ? this.p2?.username : this.p1.username) : undefined;

      const res1: BattleResultPacket = {
        type: PacketType.BattleResult,
        battleId: this.id,
        events,
        turnReady: true,
        battleOver,
        winner
      };
      
      this.server.send(this.p1, res1);
      if (this.p2) {
        const eventsP2: BattleEvent[] = events.map(ev => {
          if (ev.type === 'damage' || ev.type === 'heal' || ev.type === 'status' || ev.type === 'faint' || ev.type === 'switch') {
            return {
              ...ev,
              target: ev.target === 'player' ? 'opponent' : 'player'
            } as BattleEvent;
          } else if (ev.type === 'action') {
            return {
              ...ev,
              source: ev.source === 'player' ? 'opponent' : 'player'
            } as BattleEvent;
          }
          return ev;
        });

        const res2: BattleResultPacket = {
          ...res1,
          events: eventsP2
        };
        this.server.send(this.p2, res2);
      }

      if (battleOver) {
        this.server.battleManager.endBattle(this.id, "KO");
      }
    };

    let p1First = p1Mon.stats.speed >= p2Mon.stats.speed;

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
      if (exec.m.currentHp <= 0 && exec.action.kind !== 'switch') continue;

      const enemyExec = order.find(e => e.p !== exec.p)!;

      if (exec.action.kind === 'switch') {
        if (exec.p === 1) this.p1ActiveIndex = exec.action.slot;
        else this.p2ActiveIndex = exec.action.slot;
        
        const newMon = exec.party[exec.action.slot];
        exec.m = newMon;
        
        const speciesName = newMon.nickname || getMonsterSpecies(newMon.speciesId)?.name || 'Monster';
        events.push({
          type: 'message', text: `${exec.c.username} sent out ${speciesName}!`
        });
        events.push({
          type: 'switch', target: exec.p === 1 ? 'player' : 'opponent', monster: this.toSnapshot(newMon)
        });
      }
      else if (exec.action.kind === 'attack') {
        if (!exec.m.moves || exec.m.moves.length === 0) {
          exec.m.moves = getDefaultMovesForSpecies(exec.m.speciesId);
        }
        const moveId = exec.m.moves[exec.action.moveIndex] || exec.m.moves[0] || 1;
        const moveData = getMoveData(moveId);
        const attackerName = exec.m.nickname || getMonsterSpecies(exec.m.speciesId)?.name || 'Monster';
        const defenderName = enemyExec.m.nickname || getMonsterSpecies(enemyExec.m.speciesId)?.name || 'Monster';
        const defenderSpecies = getMonsterSpecies(enemyExec.m.speciesId);

        events.push({
          type: 'action',
          source: exec.p === 1 ? 'player' : 'opponent',
          action: exec.action,
          moveName: moveData.name
        });

        events.push({
          type: 'message',
          text: `${attackerName} used ${moveData.name}!`
        });

        // Damage calculation
        const levelFactor = Math.floor((2 * exec.m.level) / 5) + 2;
        const isSpecial = moveData.category === MoveCategory.Special;
        const atk = isSpecial ? exec.m.stats.spAttack : exec.m.stats.attack;
        const def = isSpecial ? enemyExec.m.stats.spDefense : enemyExec.m.stats.defense;
        
        let baseDmg = Math.floor((levelFactor * moveData.power * (atk / Math.max(1, def))) / 50) + 2;
        
        const isCrit = Math.random() < 0.0625;
        const critMult = isCrit ? 1.5 : 1.0;
        
        const types: [number, number | null] = defenderSpecies ? defenderSpecies.types : [0, null];
        const effectiveness = getTypeEffectiveness(moveData.type, types);
        
        const randomMult = 0.85 + Math.random() * 0.15;
        const finalDmg = Math.max(1, Math.floor(baseDmg * critMult * effectiveness * randomMult));

        enemyExec.m.currentHp = Math.max(0, enemyExec.m.currentHp - finalDmg);

        events.push({
          type: 'damage',
          target: exec.p === 1 ? 'opponent' : 'player',
          amount: finalDmg,
          isCrit,
          effectiveness
        });

        if (isCrit) {
          events.push({ type: 'message', text: 'A critical hit!' });
        }
        if (effectiveness >= 2.0) {
          events.push({ type: 'message', text: "It's super effective!" });
        } else if (effectiveness > 0 && effectiveness < 1.0) {
          events.push({ type: 'message', text: "It's not very effective..." });
        } else if (effectiveness === 0) {
          events.push({ type: 'message', text: 'It had no effect...' });
        }

        if (enemyExec.m.currentHp === 0) {
          events.push({ type: 'message', text: `${defenderName} fainted!` });
          events.push({ type: 'faint', target: exec.p === 1 ? 'opponent' : 'player' });
        }
      }
    }

    finishRound();
  }
}
