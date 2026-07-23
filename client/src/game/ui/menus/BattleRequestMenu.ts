import { Menu } from './Menu.js';
import { NetworkClient } from '../../network/NetworkClient.js';
import { PacketType, BattleChallengeAnswerPacket } from 'poke-ter-shared';

export class BattleRequestMenu implements Menu {
  private networkClient: NetworkClient;
  private challengerId: string;
  private challengerName: string;
  private onComplete: () => void;
  private isClosing = false;
  
  private selectedIndex = 0;
  private options = ['Accept', 'Decline'];

  constructor(challengerId: string, challengerName: string, networkClient: NetworkClient, onComplete: () => void) {
    this.challengerId = challengerId;
    this.challengerName = challengerName;
    this.networkClient = networkClient;
    this.onComplete = onComplete;
  }

  update(dt: number, inputManager: any): void {
    if (this.isClosing) return;

    if (inputManager.justPressed('ArrowUp') || inputManager.justPressed('KeyW')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    }
    if (inputManager.justPressed('ArrowDown') || inputManager.justPressed('KeyS')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
    }
    if (inputManager.justPressed('Space') || inputManager.justPressed('Enter')) {
      this.confirmSelection();
    }
    if (inputManager.justPressed('Escape')) {
      this.selectedIndex = 1;
      this.confirmSelection();
    }
  }

  private confirmSelection() {
    this.isClosing = true;
    const accept = this.options[this.selectedIndex] === 'Accept';
    
    this.networkClient.send({
      type: PacketType.BattleChallengeAnswer,
      challengerId: this.challengerId,
      accept
    } as BattleChallengeAnswerPacket);
    
    this.onComplete();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isClosing) return;
    ctx.save();
    
    const boxW = 180;
    const boxH = 50;
    const boxX = (ctx.canvas.width / 2) - (boxW / 2);
    const boxY = (ctx.canvas.height / 2) - (boxH / 2);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.challengerName} wants to battle!`, boxX + boxW/2, boxY + 16);

    ctx.textAlign = 'left';
    for (let i = 0; i < this.options.length; i++) {
      const textX = boxX + 60;
      const textY = boxY + 32 + (i * 12);
      
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText('▶', textX - 12, textY);
      } else {
        ctx.fillStyle = '#ecf0f1';
      }
      ctx.fillText(this.options[i], textX, textY);
    }
    ctx.restore();
  }
}
