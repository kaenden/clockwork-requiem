import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { SaveManager } from '@/utils/SaveManager';
import { metaState } from '@/state/MetaStateManager';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data: { won: boolean }): void {
    this.data.set('won', data.won ?? false);
  }

  create(): void {
    const won = this.data.get('won') as boolean;
    const cx = GAME_WIDTH / 2;

    // Record completion in meta (victory path — defeat is recorded in BattleScene)
    if (won) {
      metaState.completeRun(true);
    }

    SaveManager.clearRun();
    SaveManager.saveMeta();

    const meta = metaState.get();

    this.add.text(cx, 180, won ? 'MISSION COMPLETE' : 'SYSTEM FAILURE', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: won ? '#4cae6e' : '#c0432e',
      letterSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 230, won
      ? 'The Kenet source has been neutralized.'
      : 'AXIOM-0 has been destroyed. The clock stops.', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#7a6e5a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Run summary
    this.add.text(cx, 300, [
      `TOTAL RUNS: ${meta.totalRuns}`,
      `WINS: ${meta.totalWins}`,
      `ASCENSION: ${meta.ascensionLevel}`,
      `PARTS DISCOVERED: ${meta.schemaBook.length}`,
      `EXPLOSIONS RECORDED: ${meta.explosionArchive.length}`,
    ].join('\n'), {
      fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 440, '[ RETURN TO MENU ]', {
      fontFamily: 'monospace', fontSize: '12px', color: '#e0d4bc', letterSpacing: 3,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#f0a84a'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#e0d4bc'); })
      .on('pointerdown', () => this.scene.start('Menu'));
  }
}
