const fs = require('fs');
let code = fs.readFileSync('client/src/game/scenes/BattleScene.ts', 'utf8');

code = code.replace(/this\.audioManager\.playBGM\('battle', true\);/g, "this.audioManager.playMusic('/battle.mp3');");
code = code.replace(/this\.audioManager\.playBGM\('overworld', true\);/g, "this.audioManager.playMusic('/sunlit_safari.mp3');");

fs.writeFileSync('client/src/game/scenes/BattleScene.ts', code);
