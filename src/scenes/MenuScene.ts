import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { SaveManager } from '@/utils/SaveManager';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { AudioManager } from '@/systems/AudioManager';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    SaveManager.loadAll();
    AudioManager.setMode('menu');

    const cx = GAME_WIDTH / 2;

    // Title
    this.add.text(cx, 140, 'CLOCKWORK', {
      fontFamily: 'monospace', fontSize: '48px', color: '#f0a84a', letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(cx, 200, 'REQUIEM', {
      fontFamily: 'monospace', fontSize: '48px', color: '#f0a84a', letterSpacing: 8,
    }).setOrigin(0.5);

    this.add.text(cx, 250, 'ROGUELITE  AUTOBATTLER', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7a6e5a', letterSpacing: 5,
    }).setOrigin(0.5);

    // Menu buttons
    const hasRun = runState.get().active;
    const meta = metaState.get();

    const buttonDefs = [
      { label: 'NEW RUN', callback: () => this.scene.start('RunStart') },
      { label: 'CONTINUE', callback: () => this.continueRun(), enabled: hasRun },
      { label: 'PROTOCOL WARS', callback: () => this.scene.start('PvpMenu') },
      { label: 'SCHEMA BOOK', callback: () => this.scene.start('SchemaBook') },
      { label: 'ARCHIVES', callback: () => this.scene.start('Archive') },
    ];

    let y = 300;
    for (const def of buttonDefs) {
      const enabled = def.enabled !== false;
      const btn = this.add.text(cx, y, def.label, {
        fontFamily: 'monospace', fontSize: '14px',
        color: enabled ? '#e0d4bc' : '#4a4236',
        letterSpacing: 4, padding: { x: 20, y: 8 },
      }).setOrigin(0.5);

      if (enabled) {
        btn.setInteractive({ useHandCursor: true })
          .on('pointerover', () => { btn.setColor('#f0a84a'); AudioManager.playTick(0.03); })
          .on('pointerout', () => btn.setColor('#e0d4bc'))
          .on('pointerdown', def.callback);
      }

      y += 44;
    }

    // Meta summary at bottom
    if (meta.totalRuns > 0) {
      this.add.text(cx, GAME_HEIGHT - 80,
        `RUNS: ${meta.totalRuns}  WINS: ${meta.totalWins}  ASCENSION: ${meta.ascensionLevel}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#4a4236', letterSpacing: 2,
      }).setOrigin(0.5);
    }

    // Volume control
    this.add.text(GAME_WIDTH - 20, 20, '[ SOUND ]', {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 1,
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', function(this: Phaser.GameObjects.Text) {
        const muted = AudioManager.toggleMute();
        this.setText(muted ? '[ MUTED ]' : '[ SOUND ]');
      });

    // Tagline
    this.add.text(cx, GAME_HEIGHT - 40, '"Guclu bir parca sokmek seni daha tehlikeli yapar. Ama saat her zaman bir bedel ister."', {
      fontFamily: 'serif', fontSize: '12px', color: '#7a6e5a',
      fontStyle: 'italic', align: 'center',
    }).setOrigin(0.5);
  }

  private continueRun(): void {
    if (runState.get().active) {
      this.scene.start('Map');
    }
  }
}
