import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';

export class MarketScene extends Phaser.Scene {
  constructor() {
    super('Market');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 40, 'PARTS MARKET', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9b52d4', letterSpacing: 4,
    }).setOrigin(0.5);

    const score = runState.get().consciousnessScore;
    this.add.text(GAME_WIDTH / 2, 70, `CONSCIOUSNESS: ${score}`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);

    // TODO: Part shop with consciousness currency
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Market inventory coming soon...', {
      fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '[ RETURN TO MAP ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        runState.clearCurrentRoom();
        this.scene.start('Map');
      });
  }
}
