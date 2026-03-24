import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { LootGenerator } from '@/systems/LootGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { SaveManager } from '@/utils/SaveManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, rarityColor } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
import type { Part, RoomType, Zone } from '@/types';

export class SalvageScene extends Phaser.Scene {
  private loot: Part[] = [];
  private collected: Set<string> = new Set();
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
    if (this.loot.length === 0) {
      this.loot = LootGenerator.generate(zone, data.roomType);
    }
    this.collected = new Set();
  }

  create(): void {
    AudioManager.setMode('salvage');
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;

    // Header
    this.add.rectangle(cx, 0, GAME_WIDTH, 50, COLORS.copper, 0.06).setOrigin(0.5, 0);
    this.add.text(cx, 12, 'SALVAGE STATION', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f5c563', letterSpacing: 4,
    }).setOrigin(0.5);
    this.add.text(cx, 34, 'Collect parts to your INVENTORY — equip them from the TEAM screen', {
      fontFamily: 'monospace', fontSize: '10px', color: '#c8b89a',
    }).setOrigin(0.5);

    // Inventory count
    const inv = runState.getInventory();
    this.add.text(GAME_WIDTH - 20, 60, `INVENTORY: ${inv.length} parts`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#a89878',
    }).setOrigin(1, 0);

    // Part cards
    const cardW = mob ? (GAME_WIDTH - 30) / this.loot.length - 4 : Math.min(300, (GAME_WIDTH - 60) / this.loot.length - 8);
    const totalW = this.loot.length * (cardW + 8);
    let px = cx - totalW / 2 + cardW / 2 + 4;

    for (const part of this.loot) {
      const cy = mob ? GAME_HEIGHT / 2 - 30 : GAME_HEIGHT / 2 - 40;
      const cardH = mob ? 320 : 380;
      const rc = rarityColor(part.rarity);
      const rcNum = parseInt(rc.replace('#', ''), 16);
      const already = this.collected.has(part.id);

      // Card bg
      this.add.rectangle(px, cy, cardW, cardH, COLORS.surface)
        .setStrokeStyle(1, already ? COLORS.border : rcNum, already ? 0.3 : 0.6);
      this.add.rectangle(px - cardW / 2 + 2, cy, 3, cardH, already ? COLORS.border : rcNum, already ? 0.3 : 1);

      // Part name
      this.add.text(px, cy - cardH / 2 + 18, part.name, {
        fontFamily: 'monospace', fontSize: '13px', color: already ? '#6a5e50' : rc, letterSpacing: 1,
      }).setOrigin(0.5);

      // Rarity + Category
      this.add.text(px, cy - cardH / 2 + 36, `${part.rarity.toUpperCase()} — ${part.category.replace(/_/g, ' ').toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '9px', color: already ? '#6a5e50' : '#c8b89a', letterSpacing: 1,
      }).setOrigin(0.5);

      // Power source
      const srcColors: Record<string, string> = { steam: '#e8913a', electric: '#2aa8d4', soul: '#9b52d4' };
      this.add.text(px, cy - cardH / 2 + 54, part.powerSource.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '10px',
        color: already ? '#6a5e50' : (srcColors[part.powerSource] ?? '#c8b89a'), letterSpacing: 2,
      }).setOrigin(0.5);

      // Stat mods
      let sy = cy - cardH / 2 + 80;
      for (const mod of part.statMods) {
        const sign = mod.value >= 0 ? '+' : '';
        const color = already ? '#6a5e50' : mod.value >= 0 ? '#4cae6e' : '#c0432e';
        this.add.text(px, sy, `${mod.stat.toUpperCase()} ${sign}${mod.value}`, {
          fontFamily: 'monospace', fontSize: '13px', color, letterSpacing: 1,
        }).setOrigin(0.5);
        sy += 22;
      }

      // Heat cost
      const costColor = part.heatCost > 0 ? '#c0432e' : '#4cae6e';
      this.add.text(px, sy + 8, `HEAT COST: ${part.heatCost > 0 ? '-' : '+'}${Math.abs(part.heatCost)} THRESH`, {
        fontFamily: 'monospace', fontSize: '11px', color: already ? '#6a5e50' : costColor,
      }).setOrigin(0.5);

      // Virus risk
      if (part.virusChance && part.virusChance > 0) {
        this.add.text(px, sy + 28, `VIRUS RISK: ${Math.round(part.virusChance * 100)}%`, {
          fontFamily: 'monospace', fontSize: '10px', color: already ? '#6a5e50' : '#c0432e',
        }).setOrigin(0.5);
      }

      // Collect button
      if (!already) {
        createButton(this, px, cy + cardH / 2 - 28, 'COLLECT', () => {
          this.collectPart(part);
        }, { color: rcNum, width: cardW - 20 });
      } else {
        this.add.text(px, cy + cardH / 2 - 28, 'COLLECTED', {
          fontFamily: 'monospace', fontSize: '11px', color: '#4cae6e', letterSpacing: 2,
        }).setOrigin(0.5);
      }

      px += cardW + 8;
    }

    // Bottom buttons
    const btnY = GAME_HEIGHT - 30;
    createButton(this, mob ? cx : cx - 140, btnY, 'OPEN INVENTORY', () => {
      this.scene.start('Inventory');
    }, { color: COLORS.elec2, width: mob ? GAME_WIDTH / 2 - 20 : 220 });

    createButton(this, mob ? cx : cx + 140, mob ? btnY - 46 : btnY, 'CONTINUE', () => {
      this.loot = [];
      this.returnToMap();
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH / 2 - 20 : 220 });
  }

  private collectPart(part: Part): void {
    AudioManager.playSalvageClick();
    this.collected.add(part.id);
    runState.addToInventory(part);
    metaState.discoverPart(part.name);
    SaveManager.saveAll();
    // Re-render
    this.scene.restart({
      roomType: this.sceneData.roomType,
      zone: this.sceneData.zone,
      splitPending: this.sceneData.splitPending,
      nextScene: this.sceneData.nextScene,
    });
  }

  private returnToMap(): void {
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
