import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BASE_STATS } from '@/data/constants';
import type { PowerSource } from '@/types';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { UnitFactory } from '@/entities/UnitFactory';
import { isMobile } from '@/utils/Mobile';
import { createButton } from '@/ui/UIKit';
import { fadeIn } from '@/ui/SceneTransition';

export class RunStartScene extends Phaser.Scene {
  constructor() {
    super('RunStart');
  }

  create(): void {
    fadeIn(this);
    const cx = GAME_WIDTH / 2;
    const mob = isMobile();

    this.add.text(cx, mob ? 20 : 40, 'SELECT POWER SOURCE', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f5c563', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, mob ? 42 : 65, 'This choice defines your entire run', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8b89a', letterSpacing: 1,
    }).setOrigin(0.5);

    const sources: { key: PowerSource; label: string; desc: string; color: number }[] = [
      { key: 'steam',    label: 'STEAM',    desc: 'Heavy, durable, heat-resistant.\nSlow but explosive power.', color: COLORS.steam2 },
      { key: 'electric', label: 'ELECTRIC', desc: 'Fast, precise, fragile.\nVery heat-sensitive.', color: COLORS.elec2 },
      { key: 'soul',     label: 'SOUL',     desc: 'Unpredictable, powerful.\nHighest ceiling — highest risk.', color: COLORS.soul2 },
    ];

    if (mob) {
      // Mobile: horizontal compact cards
      const cardW = (GAME_WIDTH - 30) / 3 - 4;
      sources.forEach((src, i) => {
        const x = 15 + cardW / 2 + i * (cardW + 6);
        const y = GAME_HEIGHT / 2 - 20;
        const colorStr = '#' + src.color.toString(16).padStart(6, '0');

        this.add.rectangle(x, y, cardW, 340, COLORS.surface).setStrokeStyle(1, COLORS.border);
        this.add.rectangle(x - cardW / 2 + 2, y, 3, 340, src.color);

        this.add.text(x, y - 140, src.label, {
          fontFamily: 'monospace', fontSize: '14px', color: colorStr, letterSpacing: 2,
        }).setOrigin(0.5);

        this.add.text(x, y - 100, src.desc, {
          fontFamily: 'monospace', fontSize: '10px', color: '#e8dcc8',
          align: 'center', lineSpacing: 3, wordWrap: { width: cardW - 16 },
        }).setOrigin(0.5);

        const stats = BASE_STATS[src.key];
        const statList = [
          { l: 'HP', v: stats.hp },
          { l: 'ATK', v: stats.atk },
          { l: 'SPD', v: stats.spd },
          { l: 'THRESH', v: stats.thresh },
        ];
        let sy = y - 40;
        for (const s of statList) {
          this.add.text(x - cardW / 2 + 8, sy, `${s.l}: ${s.v}`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#c8b89a',
          });
          sy += 20;
        }

        createButton(this, x, y + 120, 'SELECT', () => this.selectPower(src.key), {
          color: src.color, width: cardW - 16,
        });
      });
    } else {
      // Desktop: wide cards side by side
      const cardW = 280;
      const gap = 30;
      const totalW = sources.length * cardW + (sources.length - 1) * gap;
      let startX = cx - totalW / 2 + cardW / 2;

      for (const src of sources) {
        const x = startX;
        const y = 340;
        const colorStr = '#' + src.color.toString(16).padStart(6, '0');

        this.add.rectangle(x, y, cardW, 360, COLORS.surface).setStrokeStyle(1, COLORS.border);
        this.add.rectangle(x - cardW / 2 + 2, y, 3, 360, src.color);

        this.add.text(x, y - 140, src.label, {
          fontFamily: 'monospace', fontSize: '18px', color: colorStr, letterSpacing: 4,
        }).setOrigin(0.5);

        this.add.text(x, y - 90, src.desc, {
          fontFamily: 'monospace', fontSize: '12px', color: '#e8dcc8',
          align: 'center', lineSpacing: 4,
        }).setOrigin(0.5);

        const stats = BASE_STATS[src.key];
        const statNames = [
          { l: 'HP', v: stats.hp },
          { l: 'ATK', v: stats.atk },
          { l: 'SPD', v: stats.spd },
          { l: 'HEAT RES', v: stats.thresh },
        ];

        let sy = y - 20;
        for (const s of statNames) {
          this.add.text(x - 100, sy, s.l, {
            fontFamily: 'monospace', fontSize: '11px', color: '#c8b89a',
          });
          this.add.text(x + 100, sy, String(s.v), {
            fontFamily: 'monospace', fontSize: '11px', color: '#e8dcc8',
          }).setOrigin(1, 0);

          const barW = 140;
          this.add.rectangle(x - 10, sy + 7, barW, 3, COLORS.border).setOrigin(0, 0.5);
          this.add.rectangle(x - 10, sy + 7, barW * (s.v / 100), 3, src.color).setOrigin(0, 0.5);
          sy += 28;
        }

        createButton(this, x, y + 140, 'SELECT', () => this.selectPower(src.key), {
          color: src.color, width: 200,
        });

        startX += cardW + gap;
      }
    }
  }

  private selectPower(source: PowerSource): void {
    const ascension = metaState.get().ascensionLevel;
    runState.start('boiler_works', ascension);
    const axiom = UnitFactory.createAxiom(source);

    // Apply ascension penalties to starting unit
    if (ascension > 0) {
      axiom.stats.thresh = Math.max(20, axiom.stats.thresh - ascension * 5);
    }

    runState.addUnit(axiom);
    this.scene.start('Map');
  }
}
