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
    
    const boxW = 200;
    const boxH = 80;
    const boxX = (ctx.canvas.width / 4) - (boxW / 2);
    const boxY = (ctx.canvas.height / 4) - (boxH / 2);
    
    ctx.scale(2, 2);

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#ecf0f1';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.challengerName} wants to battle!`, boxX + boxW/2, boxY + 20);

    ctx.textAlign = 'left';
    for (let i = 0; i < this.options.length; i++) {
      const textX = boxX + 60;
      const textY = boxY + 45 + (i * 20);
      
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#f1c40f';
        ctx.fillText('▶', textX - 15, textY);
      } else {
        ctx.fillStyle = '#ecf0f1';
      }
      ctx.fillText(this.options[i], textX, textY);
    }

    ctx.restore();
  }
}
