export enum BattleState {
  INTRO_SLIDE = 'INTRO_SLIDE',
  INTRO_TEXT = 'INTRO_TEXT',
  INTRO_SEND_OUT = 'INTRO_SEND_OUT',
  MAIN_MENU = 'MAIN_MENU',
  MOVE_MENU = 'MOVE_MENU',
  PARTY_MENU = 'PARTY_MENU',
  BAG_MENU = 'BAG_MENU',
  WAITING_FOR_SERVER = 'WAITING_FOR_SERVER',
  ANIMATING_ROUND = 'ANIMATING_ROUND',
  CHECK_FAINT = 'CHECK_FAINT',
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  OUTRO = 'OUTRO',
}

export class BattleStateMachine {
  private currentState: BattleState = BattleState.INTRO_SLIDE;
  private stateTime: number = 0;
  private onStateChange?: (newState: BattleState, oldState: BattleState) => void;

  constructor(initialState: BattleState = BattleState.INTRO_SLIDE) {
    this.currentState = initialState;
  }

  public getState(): BattleState {
    return this.currentState;
  }

  public getStateTime(): number {
    return this.stateTime;
  }

  public setState(newState: BattleState): void {
    if (this.currentState === newState) return;
    const oldState = this.currentState;
    this.currentState = newState;
    this.stateTime = 0;

    if (this.onStateChange) {
      this.onStateChange(newState, oldState);
    }
  }

  public setOnStateChange(cb: (newState: BattleState, oldState: BattleState) => void): void {
    this.onStateChange = cb;
  }

  public update(dt: number): void {
    this.stateTime += dt / 1000;
  }
}
