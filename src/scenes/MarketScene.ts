import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { LootGenerator } from '@/systems/LootGenerator';
import { computeStats, canEquipPart } from '@/systems/StatEngine';
import { MARKET_ITEMS, type MarketItem } from '@/data/roomEvents';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
import type { Part } from '@/types';

export class MarketScene extends Phaser.Scene {
  private boughtPart: Part | null = null;

  constructor() {
    super('Market');
  }

  create(): void {
    fadeIn(this);
    AudioManager.setMode('salvage');
    this.boughtPart = null;
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const state = runState.get();
    const score = state.consciousnessScore;

    // Header
    this.add.rectangle(cx, 0, GAME_WIDTH, 55, COLORS.soul2, 0.06).setOrigin(0.5, 0);
    this.add.text(cx, 14, 'PARTS MARKET', {
      fontFamily: 'monospace', fontSize: '18px', color: '#9b52d4', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 36, 'A salvage trader\'s stash — spend consciousness wisely', {
      fontFamily: 'monospace', fontSize: '12px', color: '#c8b89a',
    }).setOrigin(0.5);

    // Consciousness balance
    this.add.rectangle(cx, 68, 240, 28, COLORS.surface).setStrokeStyle(1, COLORS.soul2, 0.5);
    const balText = this.add.text(cx, 68, `CONSCIOUSNESS: ${score}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#9b52d4', letterSpacing: 2,
    }).setOrigin(0.5);

    // Shop items
    const cardW = mob ? GAME_WIDTH - 40 : 190;
    const gap = 8;
    let startX: number;
    if (mob) {
      startX = cx;
    } else {
      const totalW = MARKET_ITEMS.length * cardW + (MARKET_ITEMS.length - 1) * gap;
      startX = cx - totalW / 2 + cardW / 2;
    }

    MARKET_ITEMS.forEach((item, i) => {
      const x = mob ? startX : startX + i * (cardW + gap);
      const y = mob ? 120 + i * 88 : 220;
      const canAfford = score >= item.cost;

      // Card
      this.add.rectangle(x, y, cardW, mob ? 72 : 180, COLORS.surface)
        .setStrokeStyle(1, canAfford ? parseInt(item.color.replace('#', ''), 16) : COLORS.border, canAfford ? 0.6 : 0.3);

      // Item label
      this.add.text(x, y - (mob ? 26 : 68), item.label, {
        fontFamily: 'monospace', fontSize: '12px', color: canAfford ? item.color : '#6a5e50', letterSpacing: 1,
      }).setOrigin(0.5);

      // Description
      this.add.text(x, y - (mob ? 8 : 38), item.description, {
        fontFamily: 'monospace', fontSize: '10px', color: canAfford ? '#e8dcc8' : '#6a5e50',
        align: 'center', wordWrap: { width: cardW - 20 }, lineSpacing: 2,
      }).setOrigin(0.5);

      // Cost
      this.add.text(x, y + (mob ? 8 : 10), `COST: ${item.cost}`, {
        fontFamily: 'monospace', fontSize: '11px',
        color: canAfford ? '#9b52d4' : '#6a5e50', letterSpacing: 1,
      }).setOrigin(0.5);

      // Buy button
      if (canAfford) {
        createButton(this, x, y + (mob ? 28 : 58), 'BUY', () => {
          this.buyItem(item, balText);
        }, { color: parseInt(item.color.replace('#', ''), 16), width: cardW - 30 });
      }
    });

    // If a part was bought, show integrate prompt
    // (handled via scene restart with data)

    // Leave
    createButton(this, cx, GAME_HEIGHT - 36, 'LEAVE MARKET', () => {
      runState.clearCurrentRoom();
      this.scene.start('Map');
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH - 40 : 260 });
  }

  private buyItem(item: MarketItem, balText: Phaser.GameObjects.Text): void {
    const state = runState.get();
    if (state.consciousnessScore < item.cost) return;

    state.consciousnessScore -= item.cost;
    AudioManager.playSalvageClick();

    const units = state.units.filter(u => u.alive);

    switch (item.type) {
      case 'repair':
        for (const u of units) u.stats.hp = u.stats.maxHp;
        this.showResult('ALL UNITS REPAIRED');
        break;

      case 'cooling':
        if (item.label.includes('THRESH')) {
          for (const u of units) u.stats.thresh += 8;
          this.showResult('THRESH +8 TO ALL UNITS');
        } else {
          for (const u of units) u.stats.heat = 0;
          this.showResult('ALL HEAT PURGED');
        }
        break;

      case 'reroll':
        // Reveal map rooms (mark all as visited for tooltip purposes)
        this.showResult('MAP INTEL ACQUIRED');
        break;

      case 'part': {
        const rarity = item.label.includes('RARE') ? 'rare' : undefined;
        const zone = state.zone;
        const parts = LootGenerator.generate(zone, rarity ? 'elite' : 'battle');
        if (parts.length > 0) {
          const part = parts[0];
          // Auto-equip to AXIOM if possible
          const axiom = units.find(u => u.isAxiom);
          if (axiom && canEquipPart(axiom, part).ok) {
            axiom.parts.push(part);
            const ns = computeStats(axiom);
            const h = axiom.stats.heat;
            axiom.stats = { ...ns, heat: h };
            metaState.discoverPart(part.name);
            this.showResult(`AXIOM-0 equipped: ${part.name}`);
          } else {
            this.showResult(`Part acquired: ${part.name} (no compatible unit)`);
          }
        }
        break;
      }
    }

    balText.setText(`CONSCIOUSNESS: ${state.consciousnessScore}`);
  }

  private showResult(msg: string): void {
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(cx, GAME_HEIGHT / 2, 450, 50, COLORS.surface, 0.95)
      .setStrokeStyle(2, COLORS.soul2).setDepth(200);
    this.add.text(cx, GAME_HEIGHT / 2, msg, {
      fontFamily: 'monospace', fontSize: '13px', color: '#9b52d4', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(201);

    this.time.delayedCall(1200, () => this.scene.restart());
  }
}
