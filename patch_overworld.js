const fs = require('fs');
let code = fs.readFileSync('client/src/game/scenes/OverworldScene.ts', 'utf8');

// Add getOtherPlayerInFront
const getNPCInFrontIdx = code.indexOf('private getNPCInFront()');
const insertGetOtherPlayer = `
  private getOtherPlayerInFront(): any | null {
    const px = this.player.x;
    const py = this.player.y;
    
    for (const [id, op] of this.otherPlayers) {
      const dx = op.position.x - px;
      const dy = op.position.y - py;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 24) {
        const dir = this.player.direction;
        if (dir.includes('up') && dy < -4) return { id, ...op };
        if (dir.includes('down') && dy > 4) return { id, ...op };
        if (dir.includes('left') && dx < -4) return { id, ...op };
        if (dir.includes('right') && dx > 4) return { id, ...op };
      }
    }
    return null;
  }
`;

code = code.slice(0, getNPCInFrontIdx) + insertGetOtherPlayer + code.slice(getNPCInFrontIdx);

const interactionIdx = code.indexOf(`const npc = this.getNPCInFront();`);
const insertPlayerInteraction = `
        const op = this.getOtherPlayerInFront();
        if (op) {
          if (this.networkClient) {
            this.networkClient.send({
              type: 34, // BattleChallengeRequest
              targetPlayerId: op.id
            } as any);
            this.controlsHUD.showToast(\`Sent battle request to \${op.username}!\`, '⚔️', 3.0);
          }
          return;
        }
        
`;
code = code.slice(0, interactionIdx) + insertPlayerInteraction + code.slice(interactionIdx);

// Add network hooks
const initHooksIdx = code.indexOf(`this.networkClient.on(PacketType.Welcome`);
const insertHooks = `
      this.networkClient.on(35 /* BattleChallengeResponse */, (p: any) => {
        this.menuManager.openMenu(new (require('../ui/menus/BattleRequestMenu.js').BattleRequestMenu)(p.challengerId, p.challengerName, this.networkClient!, () => {
          this.menuManager.closeMenu();
        }));
      });
      this.networkClient.on(37 /* BattleChallengeResult */, (p: any) => {
        if (!p.accepted) {
           this.controlsHUD.showToast(p.message || 'Battle request declined.', '❌', 3.0);
        }
      });
      this.networkClient.on(30 /* BattleStart */, (p: any) => {
        const game = (window as any).__game;
        const BattleScene = require('./BattleScene.js').BattleScene;
        game.sceneManager.push(new BattleScene(this.renderer, this.inputManager, this.networkClient!, this.audioManager, p));
      });
`;
code = code.slice(0, initHooksIdx) + insertHooks + code.slice(initHooksIdx);

fs.writeFileSync('client/src/game/scenes/OverworldScene.ts', code);
