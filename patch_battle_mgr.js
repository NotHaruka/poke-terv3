const fs = require('fs');
let code = fs.readFileSync('server/src/battle/BattleManager.ts', 'utf8');

const targetIdx = code.indexOf('if (!target) return;');
const insertCode = `
    if (!challenger.playerData || !challenger.playerData.party || challenger.playerData.party.length === 0) {
      this.server.send(challenger, {
        type: 37, // BattleChallengeResult
        accepted: false,
        message: "You need a monster to battle!"
      } as any);
      return;
    }

    if (!target.playerData || !target.playerData.party || target.playerData.party.length === 0) {
      this.server.send(challenger, {
        type: 37, // BattleChallengeResult
        accepted: false,
        message: "That player has no monsters to battle."
      } as any);
      return;
    }
`;
code = code.slice(0, targetIdx + 20) + '\n' + insertCode + code.slice(targetIdx + 20);

// Fix the sendTo bug in BattleInstance.ts
let battleInstCode = fs.readFileSync('server/src/battle/BattleInstance.ts', 'utf8');
battleInstCode = battleInstCode.replace('this.server.sendTo(this.p1.id, res);', 'this.server.send(this.p1, res);');
battleInstCode = battleInstCode.replace('if (this.p2) this.server.sendTo(this.p2.id, res);', 'if (this.p2) this.server.send(this.p2, res);');

fs.writeFileSync('server/src/battle/BattleManager.ts', code);
fs.writeFileSync('server/src/battle/BattleInstance.ts', battleInstCode);
