import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { getRandomKeepsakes, keepsakeRarityColor, keepsakeRarityNum } from '@/data/keepsakes';
import { runState } from '@/state/RunStateManager';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, FONT } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
import type { Keepsake } from '@/types';

export class KeepsakeRewardScene extends Phaser.Scene {
  private choices: Keepsake[] = [];

  constructor() { super('KeepsakeReward'); }

  create(): void {
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const keepsakes = runState.getKeepsakes();
    const full = keepsakes.length >= 3;

    // Generate 3 choices (exclude already owned)
    this.choices = getRandomKeepsakes(3, keepsakes.map(k => k.id));

    // ── Header ──
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0c0b, 0.95);
    this.add.text(cx, 50, '✦ KEEPSAKE REWARD ✦', {
      ...FONT.heading(), color: '#f0a84a', letterSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 76, full
      ? 'Your keepsake slots are full. Choose one to REPLACE or SKIP.'
      : 'Choose a keepsake to carry with your team.',
      { ...FONT.small(), color: '#a89878' }
    ).setOrigin(0.5);

    // ── Keepsake cards ──
    const cardW = mob ? GAME_WIDTH - 40 : 280;
    const cardH = 160;
    const gap = mob ? 12 : 20;
    const totalW = mob ? cardW : this.choices.length * cardW + (this.choices.length - 1) * gap;
    const startX = mob ? cx : cx - totalW / 2 + cardW / 2;

    this.choices.forEach((k, i) => {
      const kx = mob ? startX : startX + i * (cardW + gap);
      const ky = mob ? 120 + i * (cardH + gap) + cardH / 2 : GAME_HEIGHT / 2 - 20;
      const kc = keepsakeRarityNum(k.rarity);
      const kcStr = keepsakeRarityColor(k.rarity);

      // Card bg
      const card = this.add.rectangle(kx, ky, cardW, cardH, COLORS.surface)
        .setStrokeStyle(2, kc, 0.7);

      // Rarity accents
      this.add.rectangle(kx, ky - cardH / 2 + 0.5, cardW, 3, kc, 0.9);
      this.add.rectangle(kx - cardW / 2 + 1.5, ky, 3, cardH - 4, kc, 0.5);
      this.add.rectangle(kx, ky, cardW - 8, cardH - 8, kc, 0.03);

      // Rarity tag
      this.add.text(kx + cardW / 2 - 8, ky - cardH / 2 + 8, k.rarity.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '9px', color: kcStr,
        backgroundColor: '#0d0c0b', padding: { x: 5, y: 2 },
      }).setOrigin(1, 0);

      // Icon
      this.add.text(kx, ky - cardH / 2 + 20, k.icon, {
        fontFamily: 'monospace', fontSize: '32px',
      }).setOrigin(0.5);

      // Name
      this.add.text(kx, ky - 24, k.name, {
        fontFamily: 'monospace', fontSize: '13px', color: kcStr,
      }).setOrigin(0.5);

      // Description
      this.add.text(kx, ky - 4, k.description, {
        fontFamily: 'monospace', fontSize: '10px', color: '#c8b89a',
        fontStyle: 'italic', wordWrap: { width: cardW - 24 },
        align: 'center', lineSpacing: 3,
      }).setOrigin(0.5, 0);

      // Effects
      let ey = ky + 36;
      for (const eff of k.effects) {
        const label = eff.type.replace(/_/g, ' ').toUpperCase();
        const valueStr = eff.type.endsWith('_pct') ? `+${eff.value}%` : `+${eff.value}`;
        this.add.text(kx, ey, `${label} ${valueStr}`, {
          fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
        }).setOrigin(0.5);
        ey += 14;
      }

      // SELECT button
      card.setInteractive({ useHandCursor: true })
        .on('pointerover', () => card.setStrokeStyle(3, kc, 1))
        .on('pointerout', () => card.setStrokeStyle(2, kc, 0.7))
        .on('pointerdown', () => this.selectKeepsake(k));
    });

    // Skip button
    const skipY = mob ? 120 + this.choices.length * (cardH + gap) + 30 : GAME_HEIGHT - 50;
    createButton(this, cx, skipY, 'SKIP', () => {
      this.scene.start('ZoneTransition');
    }, { color: COLORS.border, width: mob ? GAME_WIDTH - 40 : 180 });
  }

  private selectKeepsake(keepsake: Keepsake): void {
    const keepsakes = runState.getKeepsakes();

    if (keepsakes.length < 3) {
      runState.addKeepsake(keepsake);
      SaveManager.saveAll();
      AudioManager.playSalvageClick();
      this.scene.start('ZoneTransition');
    } else {
      // Replace menu: show current keepsakes to pick which to replace
      this.showReplaceMenu(keepsake);
    }
  }

  private showReplaceMenu(newKeepsake: Keepsake): void {
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const keepsakes = runState.getKeepsakes();

    // Overlay
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0d0c0b, 0.92).setDepth(400);
    this.add.text(cx, 60, 'REPLACE WHICH KEEPSAKE?', {
      ...FONT.heading(), color: '#c0432e',
    }).setOrigin(0.5).setDepth(401);

    keepsakes.forEach((k, i) => {
      const ky = 120 + i * 80;
      const kc = keepsakeRarityNum(k.rarity);
      const kcStr = keepsakeRarityColor(k.rarity);

      const card = this.add.rectangle(cx, ky + 25, mob ? GAME_WIDTH - 40 : 400, 60, COLORS.surface)
        .setStrokeStyle(1, kc, 0.5).setDepth(401);

      this.add.text(cx - 160, ky + 10, `${k.icon} ${k.name}`, {
        fontFamily: 'monospace', fontSize: '12px', color: kcStr,
      }).setDepth(402);

      const effStr = k.effects.map(e => `${e.type.replace(/_/g, ' ')} +${e.value}`).join(' | ');
      this.add.text(cx - 160, ky + 28, effStr, {
        fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
      }).setDepth(402);

      this.add.text(cx + 160, ky + 25, 'REPLACE', {
        fontFamily: 'monospace', fontSize: '11px', color: '#c0432e',
        backgroundColor: '#1a1010', padding: { x: 8, y: 4 },
      }).setOrigin(1, 0.5).setDepth(402)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          runState.removeKeepsake(k.id);
          runState.addKeepsake(newKeepsake);
          SaveManager.saveAll();
          AudioManager.playSalvageClick();
          this.scene.start('ZoneTransition');
        });
    });

    createButton(this, cx, 120 + keepsakes.length * 80 + 30, 'CANCEL', () => {
      this.scene.restart();
    }, { color: COLORS.border, width: 180 });
  }
}
