import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { metaState } from '@/state/MetaStateManager';

const ZONE_NAMES: Record<string, string> = {
  boiler_works: 'Boiler Works',
  voltage_archives: 'Voltage Archives',
  soul_labs: 'Soul Labs',
  kenet_heart: 'Kenet Heart',
};

export class ArchiveScene extends Phaser.Scene {
  constructor() {
    super('Archive');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const meta = metaState.get();

    this.add.text(cx, 30, 'AXIOM ARCHIVES', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    // ── Stats Overview ──
    const statsY = 80;
    this.add.rectangle(cx, statsY + 60, 500, 130, COLORS.surface).setStrokeStyle(1, COLORS.border);

    const statLines = [
      ['TOTAL RUNS', String(meta.totalRuns)],
      ['VICTORIES', String(meta.totalWins)],
      ['WIN RATE', meta.totalRuns > 0 ? `${Math.round((meta.totalWins / meta.totalRuns) * 100)}%` : '---'],
      ['ASCENSION LEVEL', String(meta.ascensionLevel)],
      ['PARTS DISCOVERED', `${meta.schemaBook.length}`],
      ['PVP RATING', String(meta.pvpRating)],
    ];

    let sy = statsY + 16;
    for (const [label, value] of statLines) {
      this.add.text(cx - 200, sy, label, {
        fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
      });
      this.add.text(cx + 200, sy, value, {
        fontFamily: 'monospace', fontSize: '9px', color: '#f0a84a', letterSpacing: 1,
      }).setOrigin(1, 0);
      sy += 18;
    }

    // ── Explosion Archive ──
    this.add.text(40, 220, 'EXPLOSION ARCHIVE', {
      fontFamily: 'monospace', fontSize: '10px', color: '#c0432e', letterSpacing: 3,
    });

    const explosions = meta.explosionArchive.slice(-15).reverse();
    if (explosions.length === 0) {
      this.add.text(40, 250, 'No explosions recorded yet.', {
        fontFamily: 'monospace', fontSize: '9px', color: '#4a4236',
      });
    } else {
      // Table header
      let ey = 246;
      this.add.text(40, ey, 'UNIT', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 2 });
      this.add.text(300, ey, 'ZONE', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 2 });
      this.add.text(500, ey, 'FLOOR', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 2 });
      this.add.text(600, ey, 'CAUSE', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 2 });
      ey += 18;

      this.add.rectangle(cx, ey - 4, GAME_WIDTH - 80, 1, COLORS.border);

      for (const exp of explosions) {
        this.add.text(40, ey, exp.unitName, {
          fontFamily: 'monospace', fontSize: '9px', color: '#c0432e',
        });
        this.add.text(300, ey, ZONE_NAMES[exp.zone] ?? exp.zone, {
          fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
        });
        this.add.text(500, ey, `F${exp.floor}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
        });
        this.add.text(600, ey, exp.partThatCaused, {
          fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a',
        });
        ey += 18;
      }
    }

    // ── Ascension Info ──
    this.add.text(40, GAME_HEIGHT - 100, 'ASCENSION PROTOCOL', {
      fontFamily: 'monospace', fontSize: '10px', color: '#9b52d4', letterSpacing: 3,
    });

    const ascLevel = meta.ascensionLevel;
    if (ascLevel === 0) {
      this.add.text(40, GAME_HEIGHT - 74, 'Complete your first run to unlock Ascension.', {
        fontFamily: 'monospace', fontSize: '9px', color: '#4a4236',
      });
    } else {
      const modifiers = [
        `Starting THRESH -${ascLevel * 5}`,
        `Enemy ATK +${ascLevel * 10}%`,
        ascLevel >= 3 ? 'Rare drop rate reduced' : null,
        ascLevel >= 5 ? 'Boss gains extra phase' : null,
      ].filter(Boolean);

      this.add.text(40, GAME_HEIGHT - 74, `Level ${ascLevel}: ${modifiers.join(' | ')}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#9b52d4',
      });
    }

    // Back
    this.add.text(40, GAME_HEIGHT - 28, '[ BACK TO MENU ]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7a6e5a', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));
  }
}
