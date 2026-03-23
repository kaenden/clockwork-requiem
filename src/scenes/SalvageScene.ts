import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, COMPAT_HEAT } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { LootGenerator } from '@/systems/LootGenerator';
import { getCompatibility, effectiveHeatCost, canEquipPart, computeStats } from '@/systems/StatEngine';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import type { Part, RoomType, Zone, UnitConfig } from '@/types';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#4cae6e',
  rare: '#2aa8d4',
  epic: '#9b52d4',
  legendary: '#f0a84a',
  kenet: '#c0432e',
};

export class SalvageScene extends Phaser.Scene {
  private loot: Part[] = [];
  private selectedUnit: UnitConfig | null = null;
  private sceneData: {
    roomType: RoomType;
    zone: Zone;
    splitPending?: { unitId: string; splitType: 'body' | 'weapon' } | null;
    nextScene?: string;
  } = { roomType: 'battle', zone: 'boiler_works' };

  constructor() {
    super('Salvage');
  }

  init(data: { roomType: RoomType; zone?: Zone; splitPending?: any; nextScene?: string }): void {
    const zone = (data.zone ?? runState.get().zone) as Zone;
    this.sceneData = {
      roomType: data.roomType,
      zone,
      splitPending: data.splitPending ?? null,
      nextScene: data.nextScene,
    };
    // Only generate loot once (not on unit switch restart)
    if (this.loot.length === 0 || !data.roomType) {
      this.loot = LootGenerator.generate(zone, data.roomType);
    }
    this.selectedUnit = null;
  }

  create(): void {
    AudioManager.setMode('salvage');
    this.add.text(GAME_WIDTH / 2, 30, 'SALVAGE STATION', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 54, 'Choose parts to integrate — each carries a heat cost', {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Unit selector (top) ──
    const units = runState.get().units.filter(u => u.alive);
    this.add.text(40, 80, 'ASSIGN TO:', {
      fontFamily: 'monospace', fontSize: '8px', color: '#7a6e5a', letterSpacing: 2,
    });

    let ux = 130;
    for (const unit of units) {
      const btn = this.add.text(ux, 80, unit.name, {
        fontFamily: 'monospace', fontSize: '10px',
        color: unit.isAxiom ? '#f0a84a' : '#b8a888',
        letterSpacing: 1,
        backgroundColor: '#1a1815',
        padding: { x: 8, y: 4 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedUnit = unit;
          // Re-render without regenerating loot
          this.scene.restart({
            roomType: this.sceneData.roomType,
            zone: this.sceneData.zone,
            splitPending: this.sceneData.splitPending,
            nextScene: this.sceneData.nextScene,
          });
        });

      if (this.selectedUnit?.id === unit.id) {
        btn.setBackgroundColor('#2a2620');
      }

      ux += btn.width + 16;
    }

    // Default to first unit
    if (!this.selectedUnit && units.length > 0) {
      this.selectedUnit = units[0];
    }

    // Show selected unit stats
    if (this.selectedUnit) {
      const u = this.selectedUnit;
      const heatPct = u.stats.thresh > 0 ? Math.round((u.stats.heat / u.stats.thresh) * 100) : 0;
      this.add.text(40, 108, `${u.name} — HP:${u.stats.hp}/${u.stats.maxHp}  ATK:${u.stats.atk}  DEF:${u.stats.def}  SPD:${u.stats.spd}  HEAT:${heatPct}%  THRESH:${u.stats.thresh}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#b8a888', letterSpacing: 1,
      });
    }

    // ── Part cards ──
    const cardW = Math.min(280, (GAME_WIDTH - 80 - (this.loot.length - 1) * 16) / this.loot.length);
    const totalW = this.loot.length * cardW + (this.loot.length - 1) * 16;
    let px = GAME_WIDTH / 2 - totalW / 2 + cardW / 2;

    for (const part of this.loot) {
      const cy = 340;
      const rarityColor = RARITY_COLORS[part.rarity] ?? '#aaaaaa';

      // Card bg
      this.add.rectangle(px, cy, cardW, 340, COLORS.surface)
        .setStrokeStyle(1, COLORS.border);

      // Rarity accent
      this.add.rectangle(px - cardW / 2 + 2, cy, 3, 340,
        parseInt(rarityColor.replace('#', ''), 16));

      // Part name
      this.add.text(px, cy - 140, part.name, {
        fontFamily: 'monospace', fontSize: '11px', color: rarityColor, letterSpacing: 1,
      }).setOrigin(0.5);

      // Rarity + category
      this.add.text(px, cy - 118, `${part.rarity.toUpperCase()} — ${part.category.replace(/_/g, ' ').toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 1,
      }).setOrigin(0.5);

      // Power source
      const srcColors: Record<string, string> = { steam: '#e8913a', electric: '#2aa8d4', soul: '#9b52d4' };
      this.add.text(px, cy - 98, part.powerSource.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '8px',
        color: srcColors[part.powerSource] ?? '#7a6e5a', letterSpacing: 2,
      }).setOrigin(0.5);

      // Stat mods
      let sy = cy - 70;
      for (const mod of part.statMods) {
        const sign = mod.value >= 0 ? '+' : '';
        const color = mod.value >= 0 ? '#4cae6e' : '#c0432e';
        this.add.text(px, sy, `${mod.stat.toUpperCase()} ${sign}${mod.value}`, {
          fontFamily: 'monospace', fontSize: '10px', color, letterSpacing: 1,
        }).setOrigin(0.5);
        sy += 20;
      }

      // Heat cost display
      if (this.selectedUnit) {
        const cost = effectiveHeatCost(part, this.selectedUnit);
        const compat = this.selectedUnit.isAxiom ? 'full' : getCompatibility(part.powerSource, this.selectedUnit.powerSource);
        const compatLabel = compat === 'full' ? 'FULL MATCH' : compat === 'partial' ? 'PARTIAL (+20%)' : 'CONFLICT (+50%)';
        const compatColor = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';

        this.add.text(px, cy + 60, `HEAT COST: ${cost > 0 ? '-' : '+'}${Math.abs(cost)} THRESH`, {
          fontFamily: 'monospace', fontSize: '9px',
          color: cost > 0 ? '#c0432e' : '#4cae6e',
        }).setOrigin(0.5);

        this.add.text(px, cy + 80, compatLabel, {
          fontFamily: 'monospace', fontSize: '8px', color: compatColor, letterSpacing: 1,
        }).setOrigin(0.5);

        // Virus warning
        if (part.virusChance && part.virusChance > 0) {
          this.add.text(px, cy + 100, `VIRUS RISK: ${Math.round(part.virusChance * 100)}%`, {
            fontFamily: 'monospace', fontSize: '8px', color: '#c0432e', letterSpacing: 1,
          }).setOrigin(0.5);
        }

        // Integrate button
        const equipCheck = canEquipPart(this.selectedUnit, part);
        const btnColor = equipCheck.ok ? '#e0d4bc' : '#4a4236';
        const btn = this.add.text(px, cy + 140, equipCheck.ok ? '[ INTEGRATE ]' : '[ BLOCKED ]', {
          fontFamily: 'monospace', fontSize: '10px', color: btnColor, letterSpacing: 2,
        }).setOrigin(0.5);

        if (equipCheck.ok) {
          btn.setInteractive({ useHandCursor: true })
            .on('pointerover', () => btn.setColor('#f0a84a'))
            .on('pointerout', () => btn.setColor('#e0d4bc'))
            .on('pointerdown', () => this.integratePart(part));
        } else {
          this.add.text(px, cy + 158, equipCheck.reason ?? '', {
            fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a',
          }).setOrigin(0.5);
        }
      }

      px += cardW + 16;
    }

    // Skip button
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '[ SKIP — RETURN TO MAP ]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#b8a888'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#7a6e5a'); })
      .on('pointerdown', () => this.returnToMap());
  }

  private integratePart(part: Part): void {
    if (!this.selectedUnit) return;
    AudioManager.playSalvageClick();

    this.selectedUnit.parts.push(part);

    // Recompute stats
    const newStats = computeStats(this.selectedUnit);
    const currentHeat = this.selectedUnit.stats.heat;
    this.selectedUnit.stats = { ...newStats, heat: currentHeat };

    // Discover in schema book
    metaState.discoverPart(part.name);

    // Virus check for kenet parts
    if (part.virusChance && Math.random() < part.virusChance) {
      // Apply kenet infection
      this.selectedUnit.statusEffects.push({
        type: 'kenet_infection',
        duration: 3,
        potency: 1,
        sourceId: part.id,
      });
    }

    SaveManager.saveAll();
    this.returnToMap();
  }

  private returnToMap(): void {
    this.loot = []; // Reset for next battle

    // Route to split if pending
    if (this.sceneData.splitPending) {
      this.scene.start('Split', this.sceneData.splitPending);
      return;
    }
    // Route to zone transition if boss
    if (this.sceneData.nextScene) {
      this.scene.start(this.sceneData.nextScene);
      return;
    }
    this.scene.start('Map');
  }
}
