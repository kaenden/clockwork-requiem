import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { computeStats, canEquipPart, effectiveHeatCost, getCompatibility } from '@/systems/StatEngine';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, rarityColor, powerColor } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
import type { Part, UnitConfig } from '@/types';

export class InventoryScene extends Phaser.Scene {
  private selectedPart: Part | null = null;
  private selectedUnit: UnitConfig | null = null;

  constructor() {
    super('Inventory');
  }

  create(): void {
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const units = runState.get().units.filter(u => u.alive);
    const inventory = runState.getInventory();

    // Header
    this.add.rectangle(cx, 0, GAME_WIDTH, 44, COLORS.elec2, 0.06).setOrigin(0.5, 0);
    this.add.text(cx, 14, 'INVENTORY & EQUIPMENT', {
      fontFamily: 'monospace', fontSize: '16px', color: '#2aa8d4', letterSpacing: 4,
    }).setOrigin(0.5);

    // Layout: left = inventory stash, right = unit slots
    const divX = mob ? GAME_WIDTH : Math.round(GAME_WIDTH * 0.45);

    // ═══ LEFT: INVENTORY STASH ═══
    this.add.text(16, 50, `STASH (${inventory.length})`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#2aa8d4', letterSpacing: 3,
    });
    this.add.rectangle(divX / 2, 62, divX - 20, 1, COLORS.elec2, 0.3);

    if (inventory.length === 0) {
      this.add.text(divX / 2, 120, 'No parts in stash.\nCollect parts from Salvage.', {
        fontFamily: 'monospace', fontSize: '12px', color: '#6a5e50',
        align: 'center', lineSpacing: 4,
      }).setOrigin(0.5);
    } else {
      const cols = mob ? 2 : 3;
      const itemW = (divX - 30) / cols - 4;
      const itemH = 60;

      inventory.forEach((part, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 14 + col * (itemW + 4) + itemW / 2;
        const y = 80 + row * (itemH + 4) + itemH / 2;

        if (y + itemH / 2 > GAME_HEIGHT - 50) return; // overflow guard

        const rc = rarityColor(part.rarity);
        const rcNum = parseInt(rc.replace('#', ''), 16);
        const isSelected = this.selectedPart?.id === part.id;

        // Item card
        const card = this.add.rectangle(x, y, itemW, itemH, COLORS.surface)
          .setStrokeStyle(isSelected ? 2 : 1, isSelected ? COLORS.copper3 : rcNum, isSelected ? 1 : 0.5);

        // Name
        this.add.text(x - itemW / 2 + 6, y - 20, part.name, {
          fontFamily: 'monospace', fontSize: '10px', color: rc,
        });

        // Category + source
        const srcShort = part.powerSource[0].toUpperCase();
        this.add.text(x - itemW / 2 + 6, y - 4, `${part.rarity[0].toUpperCase()} | ${srcShort} | ${part.category.replace(/_/g, ' ')}`, {
          fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
        });

        // Stat preview
        const modStr = part.statMods.map(m => `${m.stat.toUpperCase()} ${m.value >= 0 ? '+' : ''}${m.value}`).join('  ');
        this.add.text(x - itemW / 2 + 6, y + 10, modStr || 'Utility', {
          fontFamily: 'monospace', fontSize: '9px', color: '#c8b89a',
        });

        // Click to select
        card.setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.selectedPart = part;
            this.selectedUnit = null;
            AudioManager.playTick(0.03);
            this.scene.restart();
          });
      });
    }

    // ═══ RIGHT: UNIT SLOTS (or bottom on mobile) ═══
    const unitPanelX = mob ? 0 : divX;
    const unitPanelW = mob ? GAME_WIDTH : GAME_WIDTH - divX;
    const unitStartY = mob ? 400 : 50;

    if (!mob) {
      // Vertical divider
      this.add.rectangle(divX, GAME_HEIGHT / 2, 1, GAME_HEIGHT - 40, COLORS.border, 0.3);
    }

    this.add.text(unitPanelX + 16, unitStartY, 'UNITS', {
      fontFamily: 'monospace', fontSize: '11px', color: '#f5c563', letterSpacing: 3,
    });

    let uy = unitStartY + 22;
    for (const unit of units) {
      const pc = powerColor(unit.powerSource);
      const pcStr = '#' + pc.toString(16).padStart(6, '0');
      const isUnitSelected = this.selectedUnit?.id === unit.id;

      // Unit row
      const rowH = 26 + unit.parts.length * 16 + 20;
      this.add.rectangle(unitPanelX + unitPanelW / 2, uy + rowH / 2 - 4, unitPanelW - 20, rowH, COLORS.surface)
        .setStrokeStyle(1, isUnitSelected ? COLORS.copper3 : COLORS.border);

      // Name + level
      this.add.rectangle(unitPanelX + 14, uy + 4, 6, 6, pc);
      this.add.text(unitPanelX + 24, uy, `${unit.name} Lv.${unit.level}`, {
        fontFamily: 'monospace', fontSize: '11px', color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
      });

      // Equip button (if a part is selected)
      if (this.selectedPart) {
        const equipCheck = canEquipPart(unit, this.selectedPart);
        const cost = effectiveHeatCost(this.selectedPart, unit);
        const compat = unit.isAxiom ? 'full' : getCompatibility(this.selectedPart.powerSource, unit.powerSource);
        const compatLabel = compat === 'full' ? 'OK' : compat === 'partial' ? '+20%' : '+50%';
        const compatColor = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';

        this.add.text(unitPanelX + unitPanelW - 80, uy, `${compatLabel} | -${cost}T`, {
          fontFamily: 'monospace', fontSize: '9px', color: compatColor,
        }).setOrigin(1, 0);

        if (equipCheck.ok) {
          const eBtn = this.add.text(unitPanelX + unitPanelW - 16, uy, 'EQUIP', {
            fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
            backgroundColor: '#1a1815', padding: { x: 6, y: 2 },
          }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.equipPart(unit, this.selectedPart!));
        }
      }

      // Equipped parts
      let py = uy + 20;
      if (unit.parts.length === 0) {
        this.add.text(unitPanelX + 30, py, '-- no parts --', {
          fontFamily: 'monospace', fontSize: '9px', color: '#6a5e50',
        });
        py += 16;
      } else {
        for (const p of unit.parts) {
          const prc = rarityColor(p.rarity);
          this.add.text(unitPanelX + 30, py, p.name, {
            fontFamily: 'monospace', fontSize: '9px', color: prc,
          });

          // Unequip button
          const uBtn = this.add.text(unitPanelX + unitPanelW - 16, py, 'REMOVE', {
            fontFamily: 'monospace', fontSize: '8px', color: '#c0432e',
            backgroundColor: '#1a1815', padding: { x: 4, y: 1 },
          }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.unequipPart(unit, p));

          py += 16;
        }
      }

      uy += rowH + 6;
    }

    // ═══ SELECTED PART DETAIL (bottom bar) ═══
    if (this.selectedPart) {
      const p = this.selectedPart;
      const detailY = mob ? GAME_HEIGHT - 90 : GAME_HEIGHT - 60;
      this.add.rectangle(cx, detailY, GAME_WIDTH - 20, 50, COLORS.surface, 0.95)
        .setStrokeStyle(1, parseInt(rarityColor(p.rarity).replace('#', ''), 16));
      this.add.text(20, detailY - 14, `SELECTED: ${p.name} [${p.rarity.toUpperCase()} ${p.powerSource.toUpperCase()}]`, {
        fontFamily: 'monospace', fontSize: '11px', color: rarityColor(p.rarity),
      });
      const modStr = p.statMods.map(m => `${m.stat.toUpperCase()} ${m.value >= 0 ? '+' : ''}${m.value}`).join('  ');
      this.add.text(20, detailY + 4, `${modStr}  |  HEAT COST: ${p.heatCost}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#e8dcc8',
      });

      // Discard button
      this.add.text(GAME_WIDTH - 20, detailY, 'DISCARD', {
        fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        backgroundColor: '#1a1815', padding: { x: 8, y: 4 },
      }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          runState.removeFromInventory(p.id);
          this.selectedPart = null;
          SaveManager.saveAll();
          this.scene.restart();
        });
    }

    // Back button
    createButton(this, mob ? cx : 100, GAME_HEIGHT - 20, 'BACK', () => {
      this.selectedPart = null;
      this.selectedUnit = null;
      this.scene.start('Map');
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH - 40 : 160 });
  }

  private equipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playSalvageClick();

    // Remove from inventory
    runState.removeFromInventory(part.id);

    // Equip to unit
    unit.parts.push(part);
    const newStats = computeStats(unit);
    const heat = unit.stats.heat;
    unit.stats = { ...newStats, heat };

    // Virus check
    if (part.virusChance && Math.random() < part.virusChance) {
      unit.statusEffects.push({ type: 'kenet_infection', duration: 3, potency: 1, sourceId: part.id });
    }

    this.selectedPart = null;
    SaveManager.saveAll();
    this.scene.restart();
  }

  private unequipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playTick(0.04);

    // Remove from unit
    unit.parts = unit.parts.filter(p => p.id !== part.id);
    const newStats = computeStats(unit);
    const heat = unit.stats.heat;
    unit.stats = { ...newStats, heat: Math.min(heat, newStats.thresh) };

    // Add back to inventory
    runState.addToInventory(part);

    SaveManager.saveAll();
    this.scene.restart();
  }
}
