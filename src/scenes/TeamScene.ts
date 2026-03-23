import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { computeStats, getOverloadPhase } from '@/systems/StatEngine';
import { SaveManager } from '@/utils/SaveManager';
import type { Directive, PowerSource, UnitConfig } from '@/types';

const DIRECTIVES: { key: Directive; label: string; desc: string }[] = [
  { key: 'attack',    label: 'ATK',  desc: 'Focus lowest HP' },
  { key: 'defend',    label: 'DEF',  desc: 'Target threats' },
  { key: 'target',    label: 'TGT',  desc: 'Same power type' },
  { key: 'conserve',  label: 'CON',  desc: 'Low DEF kills' },
  { key: 'berserker', label: 'BRK',  desc: 'Random + max power' },
];

const SRC_COLORS: Record<PowerSource, number> = {
  steam: COLORS.steam2, electric: COLORS.elec2, soul: COLORS.soul2,
};

const PHASE_COLORS: Record<string, string> = {
  safe: '#4cae6e', warning: '#d4a82a', critical: '#c0432e', meltdown: '#ff6b4a',
};

export class TeamScene extends Phaser.Scene {
  constructor() {
    super('Team');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 24, 'TEAM CONFIGURATION', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    const units = runState.get().units;
    const cardW = Math.min(230, (GAME_WIDTH - 60 - (units.length - 1) * 12) / units.length);
    const totalW = units.length * cardW + (units.length - 1) * 12;
    let x = GAME_WIDTH / 2 - totalW / 2 + cardW / 2;

    for (const unit of units) {
      this.drawUnitCard(unit, x, cardW);
      x += cardW + 12;
    }

    // Back button
    this.add.text(40, GAME_HEIGHT - 28, '[ BACK TO MAP ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        SaveManager.saveAll();
        this.scene.start('Map');
      });
  }

  private drawUnitCard(unit: UnitConfig, x: number, cardW: number): void {
    const y = 340;
    const accentColor = SRC_COLORS[unit.powerSource] ?? COLORS.copper;
    const accentStr = '#' + accentColor.toString(16).padStart(6, '0');

    // Card
    this.add.rectangle(x, y, cardW, 540, COLORS.surface)
      .setStrokeStyle(1, unit.alive ? COLORS.border : COLORS.rust);
    this.add.rectangle(x - cardW / 2 + 2, y, 3, 540, unit.alive ? accentColor : COLORS.rust);

    // Name
    const nameColor = !unit.alive ? '#4a4236' : unit.isAxiom ? '#f0a84a' : '#b8a888';
    this.add.text(x, y - 250, unit.name, {
      fontFamily: 'monospace', fontSize: '15px', color: nameColor, letterSpacing: 2,
    }).setOrigin(0.5);

    // Level + source + body + weapon
    const classLine = [
      `Lv.${unit.level}`,
      unit.powerSource.toUpperCase(),
      unit.bodyType?.toUpperCase() ?? '---',
      unit.weaponModule?.replace(/_/g, ' ').toUpperCase() ?? '---',
    ].join(' | ');

    this.add.text(x, y - 230, classLine, {
      fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a', letterSpacing: 1,
    }).setOrigin(0.5);

    if (!unit.alive) {
      this.add.text(x, y, 'DESTROYED', {
        fontFamily: 'monospace', fontSize: '14px', color: '#c0432e', letterSpacing: 3,
      }).setOrigin(0.5);
      return;
    }

    // Stats
    const phase = getOverloadPhase(unit);
    const heatPct = unit.stats.thresh > 0 ? Math.round((unit.stats.heat / unit.stats.thresh) * 100) : 0;
    const stats = [
      { label: 'HP',    val: `${unit.stats.hp}/${unit.stats.maxHp}`, pct: unit.stats.hp / unit.stats.maxHp, color: COLORS.safe },
      { label: 'ATK',   val: String(unit.stats.atk), pct: unit.stats.atk / 150, color: accentColor },
      { label: 'DEF',   val: String(unit.stats.def), pct: unit.stats.def / 100, color: accentColor },
      { label: 'SPD',   val: String(unit.stats.spd), pct: unit.stats.spd / 100, color: accentColor },
      { label: 'HEAT',  val: `${heatPct}% [${phase.toUpperCase()}]`, pct: heatPct / 100, color: parseInt(PHASE_COLORS[phase].replace('#', ''), 16) },
      { label: 'THRESH',val: String(unit.stats.thresh), pct: unit.stats.thresh / 120, color: COLORS.copper },
      { label: 'SYN',   val: String(unit.stats.syn), pct: unit.stats.syn / 100, color: COLORS.soul2 },
    ];

    let sy = y - 200;
    const barW = cardW - 60;
    for (const s of stats) {
      this.add.text(x - cardW / 2 + 12, sy, s.label, {
        fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a',
      });
      this.add.text(x + cardW / 2 - 12, sy, s.val, {
        fontFamily: 'monospace', fontSize: '15px', color: '#e8dcc8',
      }).setOrigin(1, 0);

      this.add.rectangle(x, sy + 12, barW, 2, COLORS.border);
      this.add.rectangle(x - barW / 2, sy + 12, barW * Math.min(1, s.pct), 2, s.color).setOrigin(0, 0.5);
      sy += 22;
    }

    // Parts
    sy += 4;
    this.add.text(x, sy, 'PARTS', {
      fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);
    sy += 14;

    if (unit.parts.length === 0) {
      this.add.text(x, sy, '-- empty --', {
        fontFamily: 'monospace', fontSize: '14px', color: '#6a5e50',
      }).setOrigin(0.5);
      sy += 14;
    } else {
      for (const part of unit.parts) {
        const rarColor: Record<string, string> = {
          common: '#aaa', uncommon: '#4cae6e', rare: '#2aa8d4',
          epic: '#9b52d4', legendary: '#f0a84a', kenet: '#c0432e',
        };
        this.add.text(x - cardW / 2 + 12, sy, part.name, {
          fontFamily: 'monospace', fontSize: '14px', color: rarColor[part.rarity] ?? '#aaa',
        });

        // Remove button
        this.add.text(x + cardW / 2 - 12, sy, 'X', {
          fontFamily: 'monospace', fontSize: '14px', color: '#c0432e',
        }).setOrigin(1, 0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            unit.parts = unit.parts.filter(p => p.id !== part.id);
            const newStats = computeStats(unit);
            const heat = unit.stats.heat;
            unit.stats = { ...newStats, heat: Math.min(heat, newStats.thresh) };
            this.scene.restart();
          });

        sy += 14;
      }
    }

    // Directive selector
    sy = y + 220;
    this.add.text(x, sy, 'DIRECTIVE', {
      fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);
    sy += 16;

    const btnW = (cardW - 20) / DIRECTIVES.length;
    let bx = x - cardW / 2 + 10 + btnW / 2;
    for (const dir of DIRECTIVES) {
      const isActive = unit.directive === dir.key;
      const btn = this.add.text(bx, sy, dir.label, {
        fontFamily: 'monospace', fontSize: '14px',
        color: isActive ? accentStr : '#4a4236',
        letterSpacing: 1,
        backgroundColor: isActive ? '#2a2620' : undefined,
        padding: { x: 2, y: 2 },
      }).setOrigin(0.5);

      if (!isActive) {
        btn.setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            runState.setDirective(unit.id, dir.key);
            this.scene.restart();
          });
      }

      bx += btnW;
    }
  }
}
