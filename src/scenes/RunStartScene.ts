import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BASE_STATS } from '@/data/constants';
import type { PowerSource } from '@/types';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { UnitFactory } from '@/entities/UnitFactory';

export class RunStartScene extends Phaser.Scene {
  constructor() {
    super('RunStart');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 60, 'SELECT POWER SOURCE', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f0a84a',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 90, 'This choice defines your run', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#7a6e5a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const sources: { key: PowerSource; label: string; desc: string; color: number }[] = [
      { key: 'steam',    label: 'STEAM',    desc: 'Heavy, durable, heat-resistant.\nSlow but explosive power.', color: COLORS.steam2 },
      { key: 'electric', label: 'ELECTRIC', desc: 'Fast, precise, fragile.\nVery heat-sensitive.', color: COLORS.elec2 },
      { key: 'soul',     label: 'SOUL',     desc: 'Unpredictable, powerful.\nHighest ceiling — highest risk.', color: COLORS.soul2 },
    ];

    const cardW = 280;
    const gap = 30;
    const totalW = sources.length * cardW + (sources.length - 1) * gap;
    let startX = cx - totalW / 2 + cardW / 2;

    for (const src of sources) {
      const x = startX;
      const y = 340;

      // Card background
      const card = this.add.rectangle(x, y, cardW, 360, COLORS.surface)
        .setStrokeStyle(1, COLORS.border);

      // Color accent bar
      this.add.rectangle(x - cardW / 2 + 2, y, 3, 360, src.color);

      // Title
      this.add.text(x, y - 140, src.label, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#' + src.color.toString(16).padStart(6, '0'),
        letterSpacing: 4,
      }).setOrigin(0.5);

      // Description
      this.add.text(x, y - 80, src.desc, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#b8a888',
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
          fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a',
        });
        this.add.text(x + 100, sy, String(s.val), {
          fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
        }).setOrigin(1, 0);

        // Bar
        const barW = 140;
        this.add.rectangle(x - 10, sy + 6, barW, 3, COLORS.border).setOrigin(0, 0.5);
        this.add.rectangle(x - 10, sy + 6, barW * (s.val / 100), 3, src.color).setOrigin(0, 0.5);
        sy += 28;
      }

      // Select button
      const btn = this.add.text(x, y + 140, '[ SELECT ]', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#e0d4bc',
        letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          btn.setColor('#' + src.color.toString(16).padStart(6, '0'));
          card.setStrokeStyle(2, src.color);
        })
        .on('pointerout', () => {
          btn.setColor('#e0d4bc');
          card.setStrokeStyle(1, COLORS.border);
        })
        .on('pointerdown', () => this.selectPower(src.key));

      startX += cardW + gap;
    }
  }

  private selectPower(source: PowerSource): void {
    runState.start('boiler_works', metaState.get().ascensionLevel);
    const axiom = UnitFactory.createAxiom(source);
    runState.addUnit(axiom);
    this.scene.start('Map');
  }
}
