import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { HeatManager } from '@/systems/HeatManager';
import { StatusEffectProcessor } from '@/systems/StatusEffectProcessor';
import { pickTerminalEvent, type TerminalChoice } from '@/data/roomEvents';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { isMobile } from '@/utils/Mobile';

export class TerminalScene extends Phaser.Scene {
  constructor() {
    super('Terminal');
  }

  create(): void {
    fadeIn(this);
    AudioManager.setMode('salvage');
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const event = pickTerminalEvent();

    // Header
    this.add.rectangle(cx, 0, GAME_WIDTH, 50, COLORS.elec2, 0.06).setOrigin(0.5, 0);
    this.add.text(cx, 14, 'DATA TERMINAL', {
      fontFamily: 'monospace', fontSize: '18px', color: '#2aa8d4', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 36, 'Encrypted protocol fragment detected', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8b89a',
    }).setOrigin(0.5);

    // Event title
    this.add.text(cx, 70, event.title, {
      fontFamily: 'monospace', fontSize: '15px', color: '#2aa8d4', letterSpacing: 2,
    }).setOrigin(0.5);

    // Lore
    this.add.rectangle(cx, 120, GAME_WIDTH - 80, 70, COLORS.surface, 0.7)
      .setStrokeStyle(1, COLORS.elec, 0.3);
    this.add.text(cx, 120, event.lore, {
      fontFamily: 'serif', fontSize: '12px', color: '#e8dcc8',
      fontStyle: 'italic', align: 'center', lineSpacing: 5,
      wordWrap: { width: GAME_WIDTH - 120 },
    }).setOrigin(0.5);

    // Risk legend
    this.add.text(cx, 170, 'SAFE = no downside  |  MODERATE = trade-off  |  DANGEROUS = high risk', {
      fontFamily: 'monospace', fontSize: '10px', color: '#a89878',
    }).setOrigin(0.5);

    // Choice cards
    const cardW = mob ? GAME_WIDTH - 40 : Math.min(320, (GAME_WIDTH - 60) / event.choices.length - 8);

    event.choices.forEach((choice, i) => {
      const x = mob ? cx : cx - ((event.choices.length - 1) * (cardW + 12)) / 2 + i * (cardW + 12);
      const y = mob ? 220 + i * 130 : 310;
      const riskColors: Record<string, number> = { safe: COLORS.safe, moderate: COLORS.warning, dangerous: COLORS.critical };
      const rc = riskColors[choice.risk] ?? COLORS.copper;

      this.add.rectangle(x, y, cardW, mob ? 110 : 180, COLORS.surface).setStrokeStyle(1, rc, 0.5);
      this.add.rectangle(x - cardW / 2 + 2, y, 3, mob ? 110 : 180, rc);

      this.add.text(x + cardW / 2 - 8, y - (mob ? 42 : 76), choice.risk.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '9px',
        color: '#' + rc.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0);

      this.add.text(x, y - (mob ? 28 : 55), choice.label, {
        fontFamily: 'monospace', fontSize: '13px', color: choice.color, letterSpacing: 1,
      }).setOrigin(0.5);

      this.add.text(x, y - (mob ? 6 : 20), choice.description, {
        fontFamily: 'monospace', fontSize: '12px', color: '#e8dcc8',
        align: 'center', wordWrap: { width: cardW - 24 }, lineSpacing: 3,
      }).setOrigin(0.5);

      const btn = this.add.text(x, y + (mob ? 36 : 62), '[ CHOOSE ]', {
        fontFamily: 'monospace', fontSize: '13px', color: '#f0e8d8', letterSpacing: 2,
        backgroundColor: '#1a1815', padding: { x: 16, y: 6 },
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setColor(choice.color))
        .on('pointerout', () => btn.setColor('#f0e8d8'))
        .on('pointerdown', () => this.applyChoice(choice));
    });

    this.add.text(cx, GAME_HEIGHT - 30, '[ SKIP — NO CHANGE ]', {
      fontFamily: 'monospace', fontSize: '11px', color: '#a89878', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { runState.clearCurrentRoom(); this.scene.start('Map'); });
  }

  private applyChoice(choice: TerminalChoice): void {
    AudioManager.playTick(0.05, 1500, 0.05);
    const units = runState.get().units.filter(u => u.alive);
    const axiom = units.find(u => u.isAxiom);
    const results: string[] = [];

    for (const eff of choice.effects) {
      switch (eff.type) {
        case 'stat_all':
          for (const u of units) (u.stats as any)[eff.stat!] += eff.value;
          results.push(`All: ${eff.stat!.toUpperCase()} ${eff.value >= 0 ? '+' : ''}${eff.value}`);
          break;
        case 'stat_axiom':
          if (axiom) (axiom.stats as any)[eff.stat!] += eff.value;
          results.push(`AXIOM: ${eff.stat!.toUpperCase()} ${eff.value >= 0 ? '+' : ''}${eff.value}`);
          break;
        case 'heal_all':
          for (const u of units) u.stats.hp = Math.min(u.stats.hp + eff.value, u.stats.maxHp);
          results.push(`All: +${eff.value} HP`);
          break;
        case 'heat_all':
          for (const u of units) HeatManager.addHeat(u, eff.value);
          results.push(`All: +${eff.value} HEAT`);
          break;
        case 'thresh_all':
          for (const u of units) u.stats.thresh += eff.value;
          results.push(`All: THRESH +${eff.value}`);
          break;
        case 'consciousness':
          runState.addConsciousness(eff.value);
          results.push(`+${eff.value} Consciousness`);
          break;
        case 'status':
          if (eff.statusType) {
            const t = units[Math.floor(Math.random() * units.length)];
            StatusEffectProcessor.apply(t, { type: eff.statusType, duration: eff.duration ?? 2, potency: 1, sourceId: 'terminal' });
            results.push(`${t.name}: ${eff.statusType.replace(/_/g, ' ')}`);
          }
          break;
      }
    }

    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, 450, 60 + results.length * 22, COLORS.surface, 0.95)
      .setStrokeStyle(2, COLORS.elec2).setDepth(200);
    this.add.text(cx, GAME_HEIGHT / 2 - 14 - results.length * 6, 'PROTOCOL APPLIED', {
      fontFamily: 'monospace', fontSize: '14px', color: '#2aa8d4', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(201);

    let ry = GAME_HEIGHT / 2 + 8 - results.length * 4;
    for (const r of results) {
      this.add.text(cx, ry, r, { fontFamily: 'monospace', fontSize: '12px', color: '#e8dcc8' }).setOrigin(0.5).setDepth(201);
      ry += 22;
    }
    metaState.unlockJournal(choice.label);
    this.time.delayedCall(1800, () => { runState.clearCurrentRoom(); this.scene.start('Map'); });
  }
}
