import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { SaveManager } from '@/utils/SaveManager';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { AudioManager } from '@/systems/AudioManager';
import { isMobile } from '@/utils/Mobile';
import { createButton, drawDivider, FONT } from '@/ui/UIKit';
import { fadeIn } from '@/ui/SceneTransition';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    SaveManager.loadAll();
    AudioManager.setMode('menu');
    fadeIn(this, 500);

    const cx = GAME_WIDTH / 2;
    const mob = isMobile();

    // ── Background decoration ──
    // Gear decorations
    if (this.textures.exists('gear_deco')) {
      this.add.image(120, 150, 'gear_deco').setAlpha(0.06).setScale(2);
      this.add.image(GAME_WIDTH - 120, GAME_HEIGHT - 150, 'gear_deco').setAlpha(0.04).setScale(3);
      this.add.image(GAME_WIDTH - 80, 100, 'gear_deco').setAlpha(0.03).setScale(1.5).setAngle(45);
    }

    // Subtle gradient overlay at top
    const topGrad = this.add.rectangle(cx, 0, GAME_WIDTH, 200, COLORS.copper, 0.02).setOrigin(0.5, 0);

    // ── Title ──
    const titleSize = mob ? '30px' : '44px';
    const titleY = mob ? 100 : 130;

    const title1 = this.add.text(cx, titleY, 'CLOCKWORK', {
      fontFamily: 'monospace', fontSize: titleSize, color: '#f0a84a', letterSpacing: mob ? 4 : 10,
    }).setOrigin(0.5);

    const title2 = this.add.text(cx, titleY + (mob ? 40 : 55), 'REQUIEM', {
      fontFamily: 'monospace', fontSize: titleSize, color: '#f0a84a', letterSpacing: mob ? 4 : 10,
    }).setOrigin(0.5);

    // Title glow animation
    this.tweens.add({
      targets: [title1, title2],
      alpha: { from: 0.85, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle
    const subY = titleY + (mob ? 80 : 115);
    this.add.text(cx, subY, 'ROGUELITE  AUTOBATTLER', {
      fontFamily: 'monospace', fontSize: mob ? '8px' : '10px',
      color: '#c8b89a', letterSpacing: mob ? 3 : 6,
    }).setOrigin(0.5);

    // Divider
    drawDivider(this, subY + 20, mob ? GAME_WIDTH - 40 : 400);

    // ── Menu buttons ──
    const hasRun = runState.get().active;
    const btnStartY = subY + (mob ? 50 : 55);
    const btnGap = mob ? 48 : 44;

    const buttons = [
      { label: 'NEW RUN',        cb: () => this.scene.start('RunStart'),   color: COLORS.safe },
      { label: 'CONTINUE',       cb: () => this.continueRun(),             color: COLORS.copper3, disabled: !hasRun },
      { label: 'PROTOCOL WARS',  cb: () => this.scene.start('PvpMenu'),    color: COLORS.rust2 },
      { label: 'SCHEMA BOOK',    cb: () => this.scene.start('SchemaBook'), color: COLORS.elec2 },
      { label: 'ARCHIVES',       cb: () => this.scene.start('Archive'),    color: COLORS.soul2 },
    ];

    buttons.forEach((def, i) => {
      createButton(this, cx, btnStartY + i * btnGap, def.label, def.cb, {
        color: def.color,
        width: mob ? GAME_WIDTH - 60 : 260,
        disabled: def.disabled,
      });
    });

    // ── Meta summary ──
    const meta = metaState.get();
    if (meta.totalRuns > 0) {
      const metaY = GAME_HEIGHT - (mob ? 70 : 80);
      drawDivider(this, metaY - 12, mob ? GAME_WIDTH - 40 : 400);
      this.add.text(cx, metaY, `RUNS ${meta.totalRuns}  |  WINS ${meta.totalWins}  |  ASC ${meta.ascensionLevel}  |  PARTS ${meta.schemaBook.length}`, {
        fontFamily: 'monospace', fontSize: mob ? '7px' : '8px', color: '#6a5e50', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    // ── Sound toggle ──
    const soundBtn = this.add.text(GAME_WIDTH - 16, 16, 'SND', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a',
      backgroundColor: '#1a1815', padding: { x: 6, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', function(this: Phaser.GameObjects.Text) {
        const muted = AudioManager.toggleMute();
        this.setColor(muted ? '#4a4236' : '#7a6e5a');
      });

    // ── Tagline ──
    this.add.text(cx, GAME_HEIGHT - 28, '"The clock always demands a price."', {
      fontFamily: 'serif', fontSize: mob ? '10px' : '12px', color: '#6a5e50',
      fontStyle: 'italic',
    }).setOrigin(0.5);
  }

  private continueRun(): void {
    if (runState.get().active) this.scene.start('Map');
  }
}
