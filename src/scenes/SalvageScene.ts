import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { LootGenerator } from '@/systems/LootGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { SaveManager } from '@/utils/SaveManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, rarityColor, rarityColorNum, FONT } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
import type { Part, RoomType, Zone } from '@/types';

export class SalvageScene extends Phaser.Scene {
  private sceneData: {
    roomType: RoomType; zone: Zone;
    splitPending?: { unitId: string; splitType: 'body' | 'weapon' } | null;
    nextScene?: string;
  } = { roomType: 'battle', zone: 'boiler_works' };

  constructor() {
    super('Salvage');
  }

  init(data: { roomType: RoomType; zone?: Zone; splitPending?: any; nextScene?: string }): void {
    const zone = (data.zone ?? runState.get().zone) as Zone;
    this.sceneData = {
      roomType: data.roomType, zone,
      splitPending: data.splitPending ?? null,
      nextScene: data.nextScene,
    };
  }

  create(): void {
    AudioManager.setMode('salvage');
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;

    // ── Roll for loot ──
    const keepsakes = runState.getKeepsakes();
    const result = LootGenerator.roll(this.sceneData.zone, this.sceneData.roomType, keepsakes);

    // ── Auto-collect all drops ──
    for (const part of result.parts) {
      runState.addToInventory(part);
      metaState.discoverPart(part.name);
    }
    if (result.parts.length > 0) SaveManager.saveAll();

    // ── Header ──
    this.add.rectangle(cx, 0, GAME_WIDTH, 44, COLORS.copper, 0.06).setOrigin(0.5, 0);

    if (!result.dropped) {
      // No loot dropped
      this.add.text(cx, 14, 'NO SALVAGE', {
        ...FONT.heading(), color: '#6a5e50',
      }).setOrigin(0.5);
      this.add.text(cx, 36, 'Nothing useful recovered from this battle.', {
        ...FONT.small(), color: '#4a4030',
      }).setOrigin(0.5);

      // Auto-continue after short delay
      this.time.delayedCall(1200, () => this.proceed());
      return;
    }

    // ── Loot found ──
    this.add.text(cx, 14, `SALVAGE — ${result.parts.length} PART${result.parts.length > 1 ? 'S' : ''} RECOVERED`, {
      ...FONT.heading(), color: '#f5c563',
    }).setOrigin(0.5);

    this.add.text(cx, 36, 'Auto-collected to your inventory', {
      ...FONT.small(), color: '#a89878',
    }).setOrigin(0.5);

    // ── Display loot cards ──
    const maxCols = mob ? 2 : Math.min(result.parts.length, 4);
    const cardW = mob
      ? (GAME_WIDTH - 30) / maxCols - 4
      : Math.min(260, (GAME_WIDTH - 60) / maxCols - 8);
    const cardH = mob ? 140 : 180;
    const rows = Math.ceil(result.parts.length / maxCols);
    const gridStartY = 60;

    result.parts.forEach((part, i) => {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      const px = cx - (maxCols * (cardW + 8)) / 2 + col * (cardW + 8) + cardW / 2 + 4;
      const py = gridStartY + row * (cardH + 8) + cardH / 2;

      if (py + cardH / 2 > GAME_HEIGHT - 80) return; // overflow guard

      this.drawLootCard(px, py, cardW, cardH, part, i);
    });

    // ── Inventory count ──
    const inv = runState.getInventory();
    this.add.text(cx, GAME_HEIGHT - 70, `INVENTORY: ${inv.length} parts`, {
      ...FONT.small(), color: '#a89878',
    }).setOrigin(0.5);

    // ── Bottom buttons ──
    const btnY = GAME_HEIGHT - 34;
    const btnW = mob ? (GAME_WIDTH - 30) / 2 - 4 : 200;

    createButton(this, mob ? cx - btnW / 2 - 4 : cx - 110, btnY, 'INVENTORY', () => {
      this.scene.start('Inventory');
    }, { color: COLORS.elec2, width: btnW });

    createButton(this, mob ? cx + btnW / 2 + 4 : cx + 110, btnY, 'CONTINUE ▶', () => {
      this.proceed();
    }, { color: COLORS.copper, width: btnW });
  }

  private drawLootCard(x: number, y: number, w: number, h: number, part: Part, index: number): void {
    const rc = rarityColor(part.rarity);
    const rcNum = rarityColorNum(part.rarity);

    // Animate card entry (staggered)
    const container = this.add.container(x, y).setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: container,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: 300,
      delay: index * 120,
      ease: 'Back.easeOut',
    });

    // Card background
    container.add(this.add.rectangle(0, 0, w, h, COLORS.surface)
      .setStrokeStyle(1, COLORS.border, 0.4));

    // Rarity accents
    container.add(this.add.rectangle(-w / 2 + 1.5, 0, 3, h - 2, rcNum, 0.9));
    container.add(this.add.rectangle(0, -h / 2 + 0.5, w, 2, rcNum, 0.7));
    container.add(this.add.rectangle(0, 0, w - 6, h - 6, rcNum, 0.03));

    // "NEW" badge
    container.add(this.add.text(w / 2 - 6, -h / 2 + 4, 'NEW', {
      fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e',
      backgroundColor: '#0d1a10', padding: { x: 3, y: 1 },
    }).setOrigin(1, 0));

    // Part name
    container.add(this.add.text(0, -h / 2 + 18, part.name, {
      fontFamily: 'monospace', fontSize: '12px', color: rc, letterSpacing: 1,
    }).setOrigin(0.5));

    // Rarity + Category
    container.add(this.add.text(0, -h / 2 + 34, `${part.rarity.toUpperCase()} | ${part.category.replace(/_/g, ' ').toUpperCase()}`, {
      fontFamily: 'monospace', fontSize: '8px', color: '#a89878', letterSpacing: 1,
    }).setOrigin(0.5));

    // Power source dot + label
    const srcColors: Record<string, number> = { steam: 0xe8913a, electric: 0x2aa8d4, soul: 0x9b52d4 };
    container.add(this.add.rectangle(-20, -h / 2 + 48, 6, 6, srcColors[part.powerSource] ?? COLORS.copper));
    container.add(this.add.text(-12, -h / 2 + 44, part.powerSource.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '9px',
      color: '#' + (srcColors[part.powerSource] ?? COLORS.copper).toString(16).padStart(6, '0'),
    }));

    // Stat mods
    let sy = -h / 2 + 64;
    for (const mod of part.statMods) {
      const sign = mod.value >= 0 ? '+' : '';
      const color = mod.value >= 0 ? '#4cae6e' : '#c0432e';
      container.add(this.add.text(0, sy, `${mod.stat.toUpperCase()} ${sign}${mod.value}`, {
        fontFamily: 'monospace', fontSize: '11px', color, letterSpacing: 1,
      }).setOrigin(0.5));
      sy += 18;
    }

    // Heat cost
    container.add(this.add.text(0, sy + 4, `HEAT -${part.heatCost}T`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
    }).setOrigin(0.5));

    // Virus risk
    if (part.virusChance && part.virusChance > 0) {
      container.add(this.add.text(0, sy + 20, `☣ VIRUS ${Math.round(part.virusChance * 100)}%`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#c0432e',
      }).setOrigin(0.5));
    }

    // Ability hint
    if (part.ability) {
      container.add(this.add.text(0, h / 2 - 14, `⚔ ${part.ability.name}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#f5c563',
      }).setOrigin(0.5));
    }

    // Collect SFX
    this.time.delayedCall(200 + index * 120, () => {
      AudioManager.playSalvageClick();
    });
  }

  private proceed(): void {
    if (this.sceneData.splitPending) {
      this.scene.start('Split', this.sceneData.splitPending);
      return;
    }
    if (this.sceneData.nextScene) {
      this.scene.start(this.sceneData.nextScene);
      return;
    }
    this.scene.start('Map');
  }
}
