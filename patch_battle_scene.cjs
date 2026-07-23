const fs = require('fs');
let code = fs.readFileSync('client/src/game/scenes/BattleScene.ts', 'utf8');

// replace the constructor logic
const consMatch = `this.p1Active = this.p1Monsters.find(m => m.currentHp > 0) || this.p1Monsters[0];
    this.p2Active = this.p2Monsters.find(m => m.currentHp > 0) || this.p2Monsters[0];`;
const consRepl = `this.p1Active = this.p1Monsters?.find(m => m.currentHp > 0) || this.p1Monsters?.[0];
    this.p2Active = this.p2Monsters?.find(m => m.currentHp > 0) || this.p2Monsters?.[0];`;
code = code.replace(consMatch, consRepl);

// replace render logic
const drawOppMatch = `ctx.fillText(\`\${getMonsterSpecies(this.p2Active.speciesId)?.name} Lvl \${this.p2Active.level}\`, w - 160, 30);
    ctx.fillStyle = 'red';
    ctx.fillRect(w - 160, 40, 100, 10);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(w - 160, 40, 100 * (this.p2Active.currentHp / this.p2Active.maxHp), 10);`;
const drawOppRepl = `if (this.p2Active) {
      ctx.fillText(\`\${getMonsterSpecies(this.p2Active.speciesId)?.name || 'Unknown'} Lvl \${this.p2Active.level}\`, w - 160, 30);
      ctx.fillStyle = 'red';
      ctx.fillRect(w - 160, 40, 100, 10);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(w - 160, 40, 100 * (this.p2Active.currentHp / this.p2Active.maxHp), 10);
    }`;
code = code.replace(drawOppMatch, drawOppRepl);

const drawPlyMatch = `ctx.fillText(\`\${getMonsterSpecies(this.p1Active.speciesId)?.name} Lvl \${this.p1Active.level}\`, 20, h - 80);
    ctx.fillStyle = 'red';
    ctx.fillRect(20, h - 70, 100, 10);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(20, h - 70, 100 * (this.p1Active.currentHp / this.p1Active.maxHp), 10);`;
const drawPlyRepl = `if (this.p1Active) {
      ctx.fillText(\`\${getMonsterSpecies(this.p1Active.speciesId)?.name || 'Unknown'} Lvl \${this.p1Active.level}\`, 20, h - 80);
      ctx.fillStyle = 'red';
      ctx.fillRect(20, h - 70, 100, 10);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(20, h - 70, 100 * (this.p1Active.currentHp / this.p1Active.maxHp), 10);
    }`;
code = code.replace(drawPlyMatch, drawPlyRepl);

fs.writeFileSync('client/src/game/scenes/BattleScene.ts', code);
