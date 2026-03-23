import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BASE_STATS } from '@/data/constants';
import type { PowerSource } from '@/types';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { UnitFactory } from '@/entities/UnitFactory';
import { isMobile, addTouchScroll } from '@/utils/Mobile';

export class RunStartScene extends Phaser.Scene {
  constructor() {
    super('RunStart');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 60, 'SELECT POWER SOURCE', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f0a84a',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 90, 'This choice defines your run', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#c8b89a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const sources: { key: PowerSource; label: string; desc: string; color: number }[] = [
      { key: 'steam',    label: 'STEAM',    desc: 'Heavy, durable, heat-resistant.\nSlow but explosive power.', color: COLORS.steam2 },
      { key: 'electric', label: 'ELECTRIC', desc: 'Fast, precise, fragile.\nVery heat-sensitive.', color: COLORS.elec2 },
      { key: 'soul',     label: 'SOUL',     desc: 'Unpredictable, powerful.\nHighest ceiling — highest risk.', color: COLORS.soul2 },
    ];

    const mob = isMobile();
    const cardW = mob ? GAME_WIDTH - 60 : 280;
    const gap = mob ? 16 : 30;
    const container = this.add.container(0, 0);

    // Mobile: stack vertically; Desktop: side by side
    let startX: number;
    let startY: number;
    if (mob) {
      startX = cx;
      startY = 130;
    } else {
      const totalW = sources.length * cardW + (sources.length - 1) * gap;
      startX = cx - totalW / 2 + cardW / 2;
      startY = 340;
    }

    let cardIndex = 0;
    for (const src of sources) {
      const x = mob ? startX : startX + cardIndex * (cardW + gap);
      const y = mob ? startY + cardIndex * (260 + gap) : startY;
      cardIndex++;

      const cardH = mob ? 240 : 360;

      // Card background
      const card = this.add.rectangle(x, y, cardW, cardH, COLORS.surface)
        .setStrokeStyle(1, COLORS.border);

      // Color accent bar
      this.add.rectangle(x - cardW / 2 + 2, y, 3, cardH, src.color);

      // Title
      this.add.text(x, y - 140, src.label, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#' + src.color.toString(16).padStart(6, '0'),
        letterSpacing: 4,
      }).setOrigin(0.5);

      // Description
      this.add.text(x, y - 80, src.desc, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#e8dcc8',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);

      // Stats preview
      const stats = BASE_STATS[src.key];
      const statNames: { key: string; label: string; val: number }[] = [
        { key: 'hp', label: 'HP', val: stats.hp },
        { key: 'atk', label: 'ATK', val: stats.atk },
        { key: 'spd', label: 'SPD', val: stats.spd },
        { key: 'thresh', label: 'HEAT RES', val: stats.thresh },
      ];

      let sy = y - 20;
      for (const s of statNames) {
        this.add.text(x - 100, sy, s.label, {
          fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a',
        });
        this.add.text(x + 100, sy, String(s.val), {
          fontFamily: 'monospace', fontSize: '13px', color: '#e8dcc8',
        }).setOrigin(1, 0);

        // Bar
        const barW = 140;
        this.add.rectangle(x - 10, sy + 6, barW, 3, COLORS.border).setOrigin(0, 0.5);
        this.add.rectangle(x - 10, sy + 6, barW * (s.val / 100), 3, src.color).setOrigin(0, 0.5);
        sy += 28;
      }

      // Select button
      const btn = this.add.text(x, y + (mob ? 90 : 140), '[ SELECT ]', {
        fontFamily: 'monospace',
        fontSize: mob ? '14px' : '12px',
        color: '#f0e8d8',
        letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          btn.setColor('#' + src.color.toString(16).padStart(6, '0'));
          card.setStrokeStyle(2, src.color);
        })
        .on('pointerout', () => {
          btn.setColor('#f0e8d8');
          card.setStrokeStyle(1, COLORS.border);
        })
        .on('pointerdown', () => this.selectPower(src.key));
    }

    // Mobile scroll support for vertically stacked cards
    if (mob) {
      const totalH = sources.length * (260 + gap) + 130;
      const maxScroll = Math.max(0, totalH - GAME_HEIGHT);
      if (maxScroll > 0) {
        addTouchScroll(this, container, maxScroll);
      }
    }
  }

  private selectPower(source: PowerSource): void {
    runState.start('boiler_works', metaState.get().ascensionLevel);
    const axiom = UnitFactory.createAxiom(source);
    runState.addUnit(axiom);
    this.scene.start('Map');
  }
}
