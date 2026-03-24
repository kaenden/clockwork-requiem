import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { REPAIR_OPTIONS, type RepairOption } from '@/data/roomEvents';
import { StatusEffectProcessor } from '@/systems/StatusEffectProcessor';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';

export class RepairScene extends Phaser.Scene {
  private repairUsed = false;

  constructor() {
    super('Repair');
  }

  create(): void {
    fadeIn(this);
    AudioManager.setMode('salvage');
    this.repairUsed = false;
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;

    // Header
    this.add.rectangle(cx, 0, GAME_WIDTH, 55, COLORS.safe, 0.06).setOrigin(0.5, 0);
    this.add.text(cx, 16, 'REPAIR STATION', {
      fontFamily: 'monospace', fontSize: '18px', color: '#4cae6e', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 38, 'Automated maintenance bay — choose one service', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8b89a', letterSpacing: 1,
    }).setOrigin(0.5);

    // Squad status
    this.add.text(40, 68, 'SQUAD STATUS', {
      fontFamily: 'monospace', fontSize: '11px', color: '#c8b89a', letterSpacing: 3,
    });

    const units = runState.get().units.filter(u => u.alive);
    let uy = 88;
    for (const unit of units) {
      const hpPct = unit.stats.hp / unit.stats.maxHp;
      const heatPct = unit.stats.thresh > 0 ? unit.stats.heat / unit.stats.thresh : 0;
      this.add.text(50, uy, unit.name, {
        fontFamily: 'monospace', fontSize: '13px', color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
      });
      this.add.text(240, uy, `HP ${unit.stats.hp}/${unit.stats.maxHp}`, {
        fontFamily: 'monospace', fontSize: '11px', color: hpPct > 0.6 ? '#4cae6e' : '#d4a82a',
      });
      this.add.text(420, uy, `HEAT ${Math.round(heatPct * 100)}%`, {
        fontFamily: 'monospace', fontSize: '11px', color: heatPct > 0.4 ? '#d4a82a' : '#c8b89a',
      });
      if (unit.statusEffects.length > 0) {
        this.add.text(560, uy, unit.statusEffects.map(e => e.type.replace(/_/g, ' ')).join(', '), {
          fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        });
      }
      uy += 26;
    }

    // Repair options
    this.add.rectangle(cx, uy + 8, GAME_WIDTH - 60, 1, COLORS.safe, 0.3);
    this.add.text(40, uy + 18, 'SERVICES', {
      fontFamily: 'monospace', fontSize: '11px', color: '#c8b89a', letterSpacing: 3,
    });

    const startY = uy + 42;
    const cardW = mob ? GAME_WIDTH - 40 : (GAME_WIDTH - 100) / REPAIR_OPTIONS.length;

    REPAIR_OPTIONS.forEach((opt, i) => {
      const x = mob ? cx : 60 + cardW / 2 + i * (cardW + 4);
      const y = mob ? startY + i * 90 : startY + 60;

      this.add.rectangle(x, y, cardW - 8, mob ? 72 : 100, COLORS.surface)
        .setStrokeStyle(1, COLORS.border);
      this.add.rectangle(x - (cardW - 8) / 2 + 2, y, 2, mob ? 72 : 100, COLORS.safe);

      this.add.text(x, y - (mob ? 24 : 36), opt.label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#4cae6e', letterSpacing: 1,
      }).setOrigin(0.5);
      this.add.text(x, y - (mob ? 8 : 16), opt.description, {
        fontFamily: 'monospace', fontSize: '10px', color: '#e8dcc8',
        wordWrap: { width: cardW - 30 }, align: 'center',
      }).setOrigin(0.5);
      this.add.text(x, y + (mob ? 6 : 4), opt.timeCost, {
        fontFamily: 'monospace', fontSize: '10px', color: '#a89878',
      }).setOrigin(0.5);

      createButton(this, x, y + (mob ? 26 : 32), 'APPLY', () => {
        if (this.repairUsed) return;
        this.applyRepair(opt);
      }, { color: COLORS.safe, width: cardW - 40 });
    });

    // Leave
    createButton(this, cx, GAME_HEIGHT - 36, 'LEAVE STATION', () => {
      runState.clearCurrentRoom();
      this.scene.start('Map');
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH - 40 : 260 });
  }

  private applyRepair(opt: RepairOption): void {
    this.repairUsed = true;
    AudioManager.playSalvageClick();
    const units = runState.get().units.filter(u => u.alive);
    for (const unit of units) {
      if (opt.effect === 'heal_full' || opt.effect === 'heal_cool') unit.stats.hp = unit.stats.maxHp;
      if (opt.effect === 'cool_full' || opt.effect === 'heal_cool') unit.stats.heat = 0;
      if (opt.effect === 'remove_status') StatusEffectProcessor.clearAll(unit);
    }
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, 400, 50, COLORS.surface, 0.95)
      .setStrokeStyle(2, COLORS.safe).setDepth(200);
    this.add.text(cx, GAME_HEIGHT / 2, `${opt.label} — COMPLETE`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(201);
    this.time.delayedCall(1200, () => { runState.clearCurrentRoom(); this.scene.start('Map'); });
  }
}
