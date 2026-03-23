import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, BASE_STATS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { UnitFactory } from '@/entities/UnitFactory';
import { SaveManager } from '@/utils/SaveManager';
import type { PowerSource, Zone } from '@/types';

const ZONE_POWER: Record<Zone, PowerSource> = {
  boiler_works: 'steam',
  voltage_archives: 'electric',
  soul_labs: 'soul',
  kenet_heart: 'steam',
};

const UNIT_NAMES: Record<PowerSource, string[]> = {
  steam:    ['Boiler-7', 'Piston-4', 'Furnace-2', 'Anvil-9', 'Valve-3'],
  electric: ['Spark-6', 'Relay-1', 'Arc-5', 'Volt-8', 'Wire-0'],
  soul:     ['Echo-3', 'Shade-7', 'Whisper-2', 'Ghost-5', 'Husk-1'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class RecruitScene extends Phaser.Scene {
  private zone: Zone = 'boiler_works';

  constructor() {
    super('Recruit');
  }

  init(data: { zone: Zone }): void {
    this.zone = data.zone ?? 'boiler_works';
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 50, 'RECRUIT AUTOMATON', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 80, 'Choose a salvaged unit to join your squad', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);

    // Generate 3 recruit options (zone-biased)
    const zonePower = ZONE_POWER[this.zone];
    const options: { name: string; source: PowerSource }[] = [
      { name: pick(UNIT_NAMES[zonePower]), source: zonePower },
      { name: pick(UNIT_NAMES[zonePower]), source: zonePower },
    ];

    // Third option is a different power source
    const others = (['steam', 'electric', 'soul'] as PowerSource[]).filter(s => s !== zonePower);
    const altSource = pick(others);
    options.push({ name: pick(UNIT_NAMES[altSource]), source: altSource });

    const cardW = 280;
    const gap = 24;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    let x = cx - totalW / 2 + cardW / 2;

    const srcColors: Record<PowerSource, number> = {
      steam: COLORS.steam2, electric: COLORS.elec2, soul: COLORS.soul2,
    };

    for (const opt of options) {
      const y = 340;
      const color = srcColors[opt.source];
      const colorStr = '#' + color.toString(16).padStart(6, '0');

      this.add.rectangle(x, y, cardW, 360, COLORS.surface).setStrokeStyle(1, COLORS.border);
      this.add.rectangle(x - cardW / 2 + 2, y, 3, 360, color);

      this.add.text(x, y - 140, opt.name, {
        fontFamily: 'monospace', fontSize: '14px', color: colorStr, letterSpacing: 2,
      }).setOrigin(0.5);

      this.add.text(x, y - 110, opt.source.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 3,
      }).setOrigin(0.5);

      // Stats preview
      const stats = BASE_STATS[opt.source];
      const statList = [
        { label: 'HP', val: stats.hp },
        { label: 'ATK', val: stats.atk },
        { label: 'DEF', val: stats.def },
        { label: 'SPD', val: stats.spd },
        { label: 'THRESH', val: stats.thresh },
      ];

      let sy = y - 60;
      for (const s of statList) {
        this.add.text(x - 90, sy, s.label, {
          fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a',
        });
        this.add.text(x + 90, sy, String(s.val), {
          fontFamily: 'monospace', fontSize: '13px', color: '#e8dcc8',
        }).setOrigin(1, 0);

        const barW = 120;
        this.add.rectangle(x - 20, sy + 6, barW, 3, COLORS.border).setOrigin(0, 0.5);
        this.add.rectangle(x - 20, sy + 6, barW * (s.val / 100), 3, color).setOrigin(0, 0.5);
        sy += 24;
      }

      // Recruit button
      const btn = this.add.text(x, y + 140, '[ RECRUIT ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#f0e8d8', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setColor(colorStr))
        .on('pointerout', () => btn.setColor('#f0e8d8'))
        .on('pointerdown', () => {
          const unit = UnitFactory.createUnit(opt.name, opt.source);
          runState.addUnit(unit);
          SaveManager.saveAll();
          this.scene.start('Map');
        });

      x += cardW + gap;
    }
  }
}
