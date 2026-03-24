import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { computeStats, canEquipPart, effectiveHeatCost, getCompatibility } from '@/systems/StatEngine';
import { BODY_BONUSES } from '@/data/classTree';
import { WEAPON_BONUSES } from '@/data/classTree';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, drawPanel, drawStatBar, drawHeatMeter, rarityColor, rarityColorNum, powerColor, powerColorStr, FONT } from '@/ui/UIKit';
import { isMobile, addTouchScroll } from '@/utils/Mobile';
import type { Part, UnitConfig, PartCategory } from '@/types';

// Equipment slot layout for the robot silhouette
const SLOT_DEFS: { category: PartCategory; label: string; icon: string; dx: number; dy: number }[] = [
  { category: 'power_core',    label: 'CORE',    icon: '⚙', dx: 0,    dy: -40 },
  { category: 'armor_plate',   label: 'ARMOR',   icon: '🛡', dx: -55,  dy: 0 },
  { category: 'movement',      label: 'MOVE',    icon: '⚡', dx: 55,   dy: 0 },
  { category: 'cooling',       label: 'COOL',    icon: '❄', dx: 0,    dy: 40 },
  { category: 'protocol_chip', label: 'CHIP',    icon: '◈', dx: -55,  dy: 40 },
  { category: 'kenet_part',    label: 'KENET',   icon: '☣', dx: 55,   dy: 40 },
];

type ViewMode = 'overview' | 'unit_detail';

export class InventoryScene extends Phaser.Scene {
  private selectedPart: Part | null = null;
  private selectedUnit: UnitConfig | null = null;
  private viewMode: ViewMode = 'overview';
  private stashScroll = 0;

  constructor() {
    super('Inventory');
  }

  init(): void {
    // Preserve selections across restarts if possible
  }

  create(): void {
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const state = runState.get();
    const units = state.units.filter(u => u.alive);
    const inventory = runState.getInventory();

    // ═══════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════
    this.add.rectangle(cx, 0, GAME_WIDTH, 50, COLORS.surface).setOrigin(0.5, 0);
    this.add.rectangle(cx, 50, GAME_WIDTH, 2, COLORS.copper, 0.4).setOrigin(0.5, 0.5);
    this.add.text(cx, 16, 'EQUIPMENT MANAGEMENT', FONT.heading()).setOrigin(0.5);
    this.add.text(cx, 36, `${units.length} UNITS  |  ${inventory.length} PARTS IN STASH`, FONT.small()).setOrigin(0.5);

    if (this.viewMode === 'overview') {
      this.drawOverview(units, inventory, mob, cx);
    } else if (this.selectedUnit) {
      this.drawUnitDetail(this.selectedUnit, inventory, mob, cx);
    }

    // ═══════════════════════════════════════════
    // BOTTOM NAV
    // ═══════════════════════════════════════════
    const navY = GAME_HEIGHT - 28;
    if (this.viewMode === 'unit_detail') {
      createButton(this, mob ? cx - 80 : 120, navY, '← BACK', () => {
        this.viewMode = 'overview';
        this.selectedUnit = null;
        this.selectedPart = null;
        this.scene.restart();
      }, { color: COLORS.border, width: mob ? 140 : 180 });
    }

    createButton(this, mob ? (this.viewMode === 'unit_detail' ? cx + 80 : cx) : GAME_WIDTH - 120, navY, 'MAP', () => {
      this.selectedPart = null;
      this.selectedUnit = null;
      this.viewMode = 'overview';
      this.scene.start('Map');
    }, { color: COLORS.copper, width: mob ? 140 : 180 });
  }

  // ═══════════════════════════════════════════════
  // OVERVIEW: Unit cards + Stash grid
  // ═══════════════════════════════════════════════
  private drawOverview(units: UnitConfig[], inventory: Part[], mob: boolean, cx: number): void {
    const stashX = mob ? 0 : 0;
    const stashW = mob ? GAME_WIDTH : Math.round(GAME_WIDTH * 0.42);
    const unitPanelX = mob ? 0 : stashW;
    const unitPanelW = mob ? GAME_WIDTH : GAME_WIDTH - stashW;

    // ── STASH PANEL ──
    const stashContainer = this.add.container(0, 0);
    this.add.text(stashX + 16, 62, '◈ PARTS STASH', {
      ...FONT.label(), color: '#2aa8d4',
    });

    if (inventory.length === 0) {
      this.add.text(stashX + stashW / 2, 140, 'No parts in stash.\nDefeat enemies and salvage parts.', {
        ...FONT.body(), color: '#6a5e50', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
    } else {
      const cols = mob ? 2 : 3;
      const gap = 6;
      const itemW = (stashW - 30 - (cols - 1) * gap) / cols;
      const itemH = 72;

      inventory.forEach((part, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = stashX + 14 + col * (itemW + gap) + itemW / 2;
        const y = 84 + row * (itemH + gap) + itemH / 2;

        if (!mob && y + itemH / 2 > GAME_HEIGHT - 60) return;

        const isSelected = this.selectedPart?.id === part.id;
        const rc = rarityColor(part.rarity);
        const rcNum = rarityColorNum(part.rarity);

        // Card bg
        const card = this.add.rectangle(x, y, itemW, itemH, isSelected ? 0x252018 : COLORS.surface)
          .setStrokeStyle(isSelected ? 2 : 1, isSelected ? COLORS.copper3 : rcNum, isSelected ? 1 : 0.4);
        stashContainer.add(card);

        // Category icon
        const slotDef = SLOT_DEFS.find(s => s.category === part.category);
        const icon = slotDef?.icon ?? '•';
        stashContainer.add(this.add.text(x - itemW / 2 + 6, y - itemH / 2 + 4, icon, {
          fontFamily: 'monospace', fontSize: '14px',
        }));

        // Part name
        stashContainer.add(this.add.text(x - itemW / 2 + 22, y - itemH / 2 + 4, part.name, {
          ...FONT.small(), color: rc,
        }));

        // Rarity + source badge
        const srcLabel = part.powerSource[0].toUpperCase();
        const srcColor = powerColorStr(part.powerSource);
        stashContainer.add(this.add.text(x + itemW / 2 - 6, y - itemH / 2 + 4, srcLabel, {
          fontFamily: 'monospace', fontSize: '10px', color: srcColor,
          backgroundColor: '#0d0c0b', padding: { x: 3, y: 1 },
        }).setOrigin(1, 0));

        // Stats
        const modStr = part.statMods.map(m => {
          const sign = m.value >= 0 ? '+' : '';
          return `${m.stat.toUpperCase()} ${sign}${m.value}`;
        }).join('  ');
        stashContainer.add(this.add.text(x - itemW / 2 + 6, y + 4, modStr || 'Passive', {
          ...FONT.label(), color: '#c8b89a',
        }));

        // Heat cost
        stashContainer.add(this.add.text(x - itemW / 2 + 6, y + 18, `HEAT -${part.heatCost}T`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#c0432e',
        }));

        // Click
        card.setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.selectedPart = this.selectedPart?.id === part.id ? null : part;
            AudioManager.playTick(0.03);
            this.scene.restart();
          });
      });
    }

    // ── Divider ──
    if (!mob) {
      this.add.rectangle(stashW, GAME_HEIGHT / 2, 2, GAME_HEIGHT - 100, COLORS.border, 0.3);
    }

    // ── UNIT CARDS ──
    const unitStartY = mob ? Math.min(84 + Math.ceil(inventory.length / 2) * 78 + 20, GAME_HEIGHT * 0.55) : 62;

    this.add.text(unitPanelX + 16, unitStartY, '◈ YOUR AUTOMATONS', {
      ...FONT.label(), color: '#f5c563',
    });

    let uy = unitStartY + 22;
    const cardW = mob ? GAME_WIDTH - 30 : unitPanelW - 30;
    const cardH = 90;

    for (const unit of units) {
      const ux = unitPanelX + (mob ? GAME_WIDTH / 2 : unitPanelW / 2);
      if (uy + cardH > GAME_HEIGHT - 60) break;

      const pc = powerColor(unit.powerSource);
      const pcStr = '#' + pc.toString(16).padStart(6, '0');
      const stats = unit.stats;

      // Card
      const panel = this.add.rectangle(ux, uy + cardH / 2, cardW, cardH, COLORS.surface)
        .setStrokeStyle(1, pc, 0.5);

      // Robot mini silhouette (procedural)
      this.drawMiniRobot(ux - cardW / 2 + 36, uy + cardH / 2, unit);

      // Name + badges
      const nameX = ux - cardW / 2 + 70;
      this.add.text(nameX, uy + 6, unit.name, {
        ...FONT.body(), color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
      });

      this.add.text(nameX, uy + 24, `Lv.${unit.level}  |  ${unit.powerSource.toUpperCase()}`, {
        ...FONT.small(), color: pcStr,
      });

      // Body/Weapon badges
      let badgeX = nameX;
      if (unit.bodyType) {
        const bodyName = BODY_BONUSES[unit.bodyType]?.passive.split(':')[0] ?? unit.bodyType;
        this.add.text(badgeX, uy + 40, `BODY: ${unit.bodyType.toUpperCase()}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e',
          backgroundColor: '#1a2a1a', padding: { x: 3, y: 1 },
        });
        badgeX += 120;
      }
      if (unit.weaponModule) {
        const weapName = WEAPON_BONUSES[unit.weaponModule]?.abilityName ?? unit.weaponModule;
        this.add.text(badgeX, uy + 40, `WPN: ${weapName}`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#2aa8d4',
          backgroundColor: '#1a1a2a', padding: { x: 3, y: 1 },
        });
      }

      // Quick stats (right side)
      const statsX = ux + cardW / 2 - 10;
      const miniBarW = mob ? 80 : 100;

      // HP bar
      this.drawMiniBar(statsX - miniBarW, uy + 8, 'HP', stats.hp, stats.maxHp, COLORS.safe, miniBarW);
      // Heat bar
      this.drawMiniBar(statsX - miniBarW, uy + 24, 'HEAT', stats.heat, stats.thresh, COLORS.critical, miniBarW);
      // ATK/DEF/SPD
      this.add.text(statsX - miniBarW, uy + 42, `ATK ${stats.atk}  DEF ${stats.def}  SPD ${stats.spd}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
      });

      // Parts count
      const partsCount = unit.parts.length;
      this.add.text(statsX, uy + 58, `${partsCount} PARTS`, {
        fontFamily: 'monospace', fontSize: '9px', color: partsCount > 0 ? '#c8b89a' : '#6a5e50',
      }).setOrigin(1, 0);

      // Part dots (mini indicators)
      for (let pi = 0; pi < unit.parts.length && pi < 6; pi++) {
        const dotX = statsX - miniBarW + pi * 12;
        const dotColor = rarityColorNum(unit.parts[pi].rarity);
        this.add.rectangle(dotX, uy + 60, 8, 8, dotColor).setStrokeStyle(1, COLORS.border);
      }

      // Click → detail view
      panel.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedUnit = unit;
          this.viewMode = 'unit_detail';
          AudioManager.playTick(0.04);
          this.scene.restart();
        });

      // Quick equip (if part selected)
      if (this.selectedPart) {
        const equipCheck = canEquipPart(unit, this.selectedPart);
        const compat = unit.isAxiom ? 'full' : getCompatibility(this.selectedPart.powerSource, unit.powerSource);
        const compatColor = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';
        const compatLabel = compat === 'full' ? 'UYUMLU' : compat === 'partial' ? 'KISMİ' : 'ÇAKIŞMA';

        this.add.text(ux + cardW / 2 - 10, uy + cardH / 2, equipCheck.ok ? '▶ EQUIP' : `✕ ${compatLabel}`, {
          fontFamily: 'monospace', fontSize: '11px',
          color: equipCheck.ok ? '#4cae6e' : compatColor,
          backgroundColor: '#0d0c0b', padding: { x: 6, y: 3 },
        }).setOrigin(1, 0.5)
          .setInteractive({ useHandCursor: equipCheck.ok })
          .on('pointerdown', () => {
            if (equipCheck.ok && this.selectedPart) {
              this.equipPart(unit, this.selectedPart);
            }
          });
      }

      uy += cardH + 8;
    }

    // ═══ SELECTED PART DETAIL BAR ═══
    if (this.selectedPart) {
      this.drawPartDetailBar(this.selectedPart, mob);
    }
  }

  // ═══════════════════════════════════════════════
  // UNIT DETAIL: Robot silhouette + equipment slots
  // ═══════════════════════════════════════════════
  private drawUnitDetail(unit: UnitConfig, inventory: Part[], mob: boolean, cx: number): void {
    const pc = powerColor(unit.powerSource);
    const pcStr = '#' + pc.toString(16).padStart(6, '0');

    // ── LEFT: Robot silhouette with equipment slots ──
    const robotCx = mob ? cx : GAME_WIDTH * 0.3;
    const robotCy = mob ? 200 : GAME_HEIGHT * 0.42;

    // Robot body (large procedural)
    this.drawFullRobot(robotCx, robotCy, unit);

    // Unit name plate
    this.add.text(robotCx, 62, unit.name, {
      ...FONT.heading(), color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
    }).setOrigin(0.5);

    this.add.text(robotCx, 82, `Lv.${unit.level}  |  ${unit.powerSource.toUpperCase()}  |  ${unit.directive.toUpperCase()}`, {
      ...FONT.small(), color: pcStr,
    }).setOrigin(0.5);

    // Equipment slots around the robot
    for (const slot of SLOT_DEFS) {
      const sx = robotCx + slot.dx * (mob ? 1.6 : 2.0);
      const sy = robotCy + slot.dy * (mob ? 1.6 : 2.0);
      const slotW = mob ? 72 : 90;
      const slotH = mob ? 42 : 50;

      const equippedPart = unit.parts.find(p => p.category === slot.category);

      // Slot background
      const slotBg = this.add.rectangle(sx, sy, slotW, slotH,
        equippedPart ? 0x1a2018 : 0x151210
      ).setStrokeStyle(1,
        equippedPart ? rarityColorNum(equippedPart.rarity) : COLORS.border,
        equippedPart ? 0.7 : 0.3
      );

      if (equippedPart) {
        // Equipped part info
        this.add.text(sx, sy - 10, equippedPart.name, {
          fontFamily: 'monospace', fontSize: '9px', color: rarityColor(equippedPart.rarity),
        }).setOrigin(0.5);

        const modStr = equippedPart.statMods.map(m => `${m.value >= 0 ? '+' : ''}${m.value}`).join('/');
        this.add.text(sx, sy + 4, modStr, {
          fontFamily: 'monospace', fontSize: '8px', color: '#c8b89a',
        }).setOrigin(0.5);

        // Remove button
        const removeBtn = this.add.text(sx + slotW / 2 - 2, sy - slotH / 2 + 2, '✕', {
          fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
          backgroundColor: '#0d0c0b', padding: { x: 2, y: 0 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            this.unequipPart(unit, equippedPart);
          });
      } else {
        // Empty slot
        this.add.text(sx, sy - 8, slot.icon, {
          fontFamily: 'monospace', fontSize: '16px', color: '#3a3530',
        }).setOrigin(0.5);

        this.add.text(sx, sy + 10, slot.label, {
          fontFamily: 'monospace', fontSize: '8px', color: '#3a3530', letterSpacing: 1,
        }).setOrigin(0.5);
      }

      // Clicking slot highlights compatible parts
      slotBg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (equippedPart) {
            // Select this part for info
            this.selectedPart = equippedPart;
            this.scene.restart();
          }
        });
    }

    // ── Stats panel ──
    const statsX = mob ? cx : GAME_WIDTH * 0.68;
    const statsY = mob ? robotCy + 130 : 90;
    const panelW = mob ? GAME_WIDTH - 30 : 340;

    drawPanel(this, statsX, statsY + 60, panelW, 130, pc);
    const stats = unit.stats;
    const barW = mob ? 120 : 140;
    const lx = statsX - panelW / 2 + 16;

    drawStatBar(this, statsX - 40, statsY + 14, 'HP', `${stats.hp}/${stats.maxHp}`, stats.hp / stats.maxHp, COLORS.safe, barW);
    drawStatBar(this, statsX - 40, statsY + 38, 'ATK', `${stats.atk}`, Math.min(stats.atk / 200, 1), COLORS.rust2, barW);
    drawStatBar(this, statsX - 40, statsY + 62, 'DEF', `${stats.def}`, Math.min(stats.def / 100, 1), COLORS.elec2, barW);
    drawStatBar(this, statsX - 40, statsY + 86, 'SPD', `${stats.spd}`, Math.min(stats.spd / 150, 1), COLORS.copper, barW);
    drawHeatMeter(this, statsX - 40, statsY + 112, stats.heat, stats.thresh, barW);

    this.add.text(statsX + panelW / 2 - 16, statsY + 14, `SYN ${stats.syn}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#9b52d4',
    }).setOrigin(1, 0);

    // Body + weapon info
    if (unit.bodyType) {
      const bonus = BODY_BONUSES[unit.bodyType];
      this.add.text(lx, statsY + 134, `BODY: ${unit.bodyType.toUpperCase()} — ${bonus?.passive ?? ''}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e',
        wordWrap: { width: panelW - 20 },
      });
    }
    if (unit.weaponModule) {
      const bonus = WEAPON_BONUSES[unit.weaponModule];
      this.add.text(lx, statsY + (unit.bodyType ? 150 : 134), `WPN: ${bonus?.abilityName ?? unit.weaponModule} — ${bonus?.abilityDesc ?? ''}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#2aa8d4',
        wordWrap: { width: panelW - 20 },
      });
    }

    // ── Compatible parts from stash ──
    const listY = mob ? statsY + 180 : statsY + 180;
    this.add.text(mob ? 16 : statsX - panelW / 2, listY, '◈ EQUIPPABLE FROM STASH', {
      ...FONT.label(), color: '#2aa8d4',
    });

    const listContainer = this.add.container(0, 0);
    let ly = listY + 18;
    const listW = mob ? GAME_WIDTH - 30 : panelW;
    const listX = mob ? GAME_WIDTH / 2 : statsX;

    for (const part of inventory) {
      if (ly > GAME_HEIGHT - 80) break;

      const equipCheck = canEquipPart(unit, part);
      const compat = unit.isAxiom ? 'full' : getCompatibility(part.powerSource, unit.powerSource);
      const compatColor = compat === 'full' ? 0x1a2a1a : compat === 'partial' ? 0x2a2a1a : 0x2a1a1a;
      const compatStr = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';
      const rc = rarityColor(part.rarity);

      const rowH = 36;
      const row = this.add.rectangle(listX, ly + rowH / 2, listW, rowH, compatColor)
        .setStrokeStyle(1, COLORS.border, 0.3);
      listContainer.add(row);

      // Icon
      const slotDef = SLOT_DEFS.find(s => s.category === part.category);
      listContainer.add(this.add.text(listX - listW / 2 + 8, ly + 4, slotDef?.icon ?? '•', {
        fontFamily: 'monospace', fontSize: '12px',
      }));

      // Name
      listContainer.add(this.add.text(listX - listW / 2 + 26, ly + 4, part.name, {
        ...FONT.small(), color: rc,
      }));

      // Stats
      const modStr = part.statMods.map(m => `${m.stat.toUpperCase()} ${m.value >= 0 ? '+' : ''}${m.value}`).join(' ');
      listContainer.add(this.add.text(listX - listW / 2 + 26, ly + 20, `${modStr}  HEAT -${part.heatCost}T`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
      }));

      // Equip button
      if (equipCheck.ok) {
        const eBtn = this.add.text(listX + listW / 2 - 8, ly + rowH / 2, '▶ EQUIP', {
          fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
          backgroundColor: '#0d0c0b', padding: { x: 6, y: 3 },
        }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.equipPart(unit, part));
        listContainer.add(eBtn);
      } else {
        listContainer.add(this.add.text(listX + listW / 2 - 8, ly + rowH / 2, compatStr === '#c0432e' ? '✕' : '—', {
          fontFamily: 'monospace', fontSize: '10px', color: compatStr,
        }).setOrigin(1, 0.5));
      }

      ly += rowH + 4;
    }

    const maxScroll = Math.max(0, ly - GAME_HEIGHT + 80);
    if (maxScroll > 0) addTouchScroll(this, listContainer, maxScroll);

    // Selected part detail
    if (this.selectedPart) {
      this.drawPartDetailBar(this.selectedPart, mob);
    }
  }

  // ═══════════════════════════════════════════════
  // DRAWING: Mini robot for overview cards
  // ═══════════════════════════════════════════════
  private drawMiniRobot(x: number, y: number, unit: UnitConfig): void {
    const g = this.add.graphics();
    const pc = powerColor(unit.powerSource);

    // Head
    g.fillStyle(COLORS.surface, 1);
    g.fillRoundedRect(x - 10, y - 28, 20, 16, 3);
    g.lineStyle(1, pc, 0.6);
    g.strokeRoundedRect(x - 10, y - 28, 20, 16, 3);

    // Eyes
    g.fillStyle(pc, 0.9);
    g.fillRect(x - 6, y - 23, 4, 3);
    g.fillRect(x + 2, y - 23, 4, 3);

    // Body
    g.fillStyle(COLORS.surface, 1);
    g.fillRoundedRect(x - 14, y - 10, 28, 24, 2);
    g.lineStyle(1, pc, 0.5);
    g.strokeRoundedRect(x - 14, y - 10, 28, 24, 2);

    // Core glow
    g.fillStyle(pc, 0.4);
    g.fillCircle(x, y + 2, 5);

    // Arms
    g.lineStyle(2, COLORS.border, 0.6);
    g.lineBetween(x - 14, y - 6, x - 22, y + 6);
    g.lineBetween(x + 14, y - 6, x + 22, y + 6);

    // Legs
    g.lineBetween(x - 6, y + 14, x - 8, y + 26);
    g.lineBetween(x + 6, y + 14, x + 8, y + 26);

    // Part indicators (small colored dots on body)
    for (let i = 0; i < unit.parts.length && i < 4; i++) {
      const partColor = rarityColorNum(unit.parts[i].rarity);
      const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * 8;
      const py = y + 2 + Math.sin(angle) * 8;
      g.fillStyle(partColor, 0.8);
      g.fillCircle(px, py, 2);
    }
  }

  // ═══════════════════════════════════════════════
  // DRAWING: Full robot silhouette for detail view
  // ═══════════════════════════════════════════════
  private drawFullRobot(x: number, y: number, unit: UnitConfig): void {
    const g = this.add.graphics();
    const pc = powerColor(unit.powerSource);
    const pcStr = '#' + pc.toString(16).padStart(6, '0');

    // Glow aura
    g.fillStyle(pc, 0.04);
    g.fillCircle(x, y, 65);
    g.fillStyle(pc, 0.02);
    g.fillCircle(x, y, 85);

    // Head
    g.fillStyle(0x1a1815, 1);
    g.fillRoundedRect(x - 20, y - 60, 40, 28, 5);
    g.lineStyle(1.5, pc, 0.7);
    g.strokeRoundedRect(x - 20, y - 60, 40, 28, 5);

    // Visor / Eyes
    g.fillStyle(pc, 0.9);
    g.fillRoundedRect(x - 14, y - 52, 10, 6, 2);
    g.fillRoundedRect(x + 4, y - 52, 10, 6, 2);

    // Antenna
    g.lineStyle(1, pc, 0.5);
    g.lineBetween(x, y - 60, x, y - 72);
    g.fillStyle(pc, 0.8);
    g.fillCircle(x, y - 72, 2);

    // Neck
    g.fillStyle(COLORS.border, 0.5);
    g.fillRect(x - 4, y - 32, 8, 6);

    // Torso
    g.fillStyle(0x1a1815, 1);
    g.fillRoundedRect(x - 28, y - 26, 56, 50, 4);
    g.lineStyle(1.5, pc, 0.6);
    g.strokeRoundedRect(x - 28, y - 26, 56, 50, 4);

    // Core crystal
    g.fillStyle(pc, 0.2);
    g.fillCircle(x, y, 12);
    g.fillStyle(pc, 0.5);
    g.fillCircle(x, y, 6);
    g.fillStyle(pc, 0.9);
    g.fillCircle(x, y, 2);

    // Torso detail lines
    g.lineStyle(1, COLORS.border, 0.3);
    g.lineBetween(x - 20, y - 18, x - 20, y + 16);
    g.lineBetween(x + 20, y - 18, x + 20, y + 16);

    // Shoulders
    g.fillStyle(0x1a1815, 1);
    g.fillRoundedRect(x - 38, y - 26, 12, 16, 3);
    g.fillRoundedRect(x + 26, y - 26, 12, 16, 3);
    g.lineStyle(1, pc, 0.5);
    g.strokeRoundedRect(x - 38, y - 26, 12, 16, 3);
    g.strokeRoundedRect(x + 26, y - 26, 12, 16, 3);

    // Arms
    g.lineStyle(3, COLORS.border, 0.6);
    g.lineBetween(x - 32, y - 10, x - 40, y + 18);
    g.lineBetween(x + 32, y - 10, x + 40, y + 18);

    // Hands
    g.fillStyle(pc, 0.3);
    g.fillCircle(x - 40, y + 20, 5);
    g.fillCircle(x + 40, y + 20, 5);

    // Waist
    g.fillStyle(COLORS.border, 0.5);
    g.fillRect(x - 20, y + 24, 40, 6);

    // Legs
    g.lineStyle(3, COLORS.border, 0.6);
    g.lineBetween(x - 12, y + 30, x - 16, y + 60);
    g.lineBetween(x + 12, y + 30, x + 16, y + 60);

    // Feet
    g.fillStyle(0x1a1815, 1);
    g.fillRoundedRect(x - 24, y + 58, 18, 8, 2);
    g.fillRoundedRect(x + 6, y + 58, 18, 8, 2);
    g.lineStyle(1, COLORS.border, 0.4);
    g.strokeRoundedRect(x - 24, y + 58, 18, 8, 2);
    g.strokeRoundedRect(x + 6, y + 58, 18, 8, 2);

    // Equipped parts glow on robot body
    for (const part of unit.parts) {
      const slot = SLOT_DEFS.find(s => s.category === part.category);
      if (!slot) continue;
      const px = x + slot.dx * 0.5;
      const py = y + slot.dy * 0.5;
      const partColor = rarityColorNum(part.rarity);
      g.fillStyle(partColor, 0.3);
      g.fillCircle(px, py, 6);
      g.fillStyle(partColor, 0.7);
      g.fillCircle(px, py, 2);
    }
  }

  // ═══════════════════════════════════════════════
  // DRAWING: Mini stat bar
  // ═══════════════════════════════════════════════
  private drawMiniBar(x: number, y: number, label: string, val: number, max: number, color: number, w: number): void {
    const pct = max > 0 ? val / max : 0;

    this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
    });

    this.add.text(x + w, y, `${val}`, {
      fontFamily: 'monospace', fontSize: '8px', color: '#c8b89a',
    }).setOrigin(1, 0);

    this.add.rectangle(x + 26 + (w - 26) / 2, y + 10, w - 26, 3, COLORS.border);
    const fillW = (w - 26) * Phaser.Math.Clamp(pct, 0, 1);
    if (fillW > 0) {
      this.add.rectangle(x + 26 + fillW / 2, y + 10, fillW, 3, color);
    }
  }

  // ═══════════════════════════════════════════════
  // DRAWING: Selected part detail bar
  // ═══════════════════════════════════════════════
  private drawPartDetailBar(part: Part, mob: boolean): void {
    const cx = GAME_WIDTH / 2;
    const detailY = GAME_HEIGHT - 70;
    const barH = 56;

    this.add.rectangle(cx, detailY + barH / 2, GAME_WIDTH - 10, barH, 0x0d0c0b, 0.95)
      .setStrokeStyle(1, rarityColorNum(part.rarity), 0.7).setDepth(300);

    const slotDef = SLOT_DEFS.find(s => s.category === part.category);
    this.add.text(20, detailY + 4, `${slotDef?.icon ?? '•'} ${part.name}`, {
      ...FONT.body(), color: rarityColor(part.rarity),
    }).setDepth(301);

    this.add.text(20, detailY + 22, `${part.rarity.toUpperCase()} ${part.powerSource.toUpperCase()} ${part.category.replace(/_/g, ' ').toUpperCase()}`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
    }).setDepth(301);

    const modStr = part.statMods.map(m => `${m.stat.toUpperCase()} ${m.value >= 0 ? '+' : ''}${m.value}`).join('  ');
    this.add.text(20, detailY + 36, `${modStr}  |  HEAT COST: ${part.heatCost}`, {
      ...FONT.small(), color: '#c8b89a',
    }).setDepth(301);

    if (part.ability) {
      this.add.text(GAME_WIDTH / 2, detailY + 36, `ABILITY: ${part.ability.name}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#f5c563',
      }).setDepth(301);
    }

    // Discard button
    this.add.text(GAME_WIDTH - 20, detailY + barH / 2, 'DISCARD', {
      fontFamily: 'monospace', fontSize: '11px', color: '#c0432e',
      backgroundColor: '#1a1010', padding: { x: 8, y: 4 },
    }).setOrigin(1, 0.5).setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        runState.removeFromInventory(part.id);
        this.selectedPart = null;
        SaveManager.saveAll();
        AudioManager.playTick(0.04);
        this.scene.restart();
      });

    // Deselect
    this.add.text(GAME_WIDTH - 100, detailY + barH / 2, 'DESELECT', {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
      backgroundColor: '#1a1815', padding: { x: 6, y: 3 },
    }).setOrigin(1, 0.5).setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.selectedPart = null;
        this.scene.restart();
      });
  }

  // ═══════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════
  private equipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playSalvageClick();
    runState.removeFromInventory(part.id);
    unit.parts.push(part);

    const heat = unit.stats.heat;
    const newStats = computeStats(unit);
    unit.stats = { ...newStats, heat };

    if (part.virusChance && Math.random() < part.virusChance) {
      unit.statusEffects.push({ type: 'kenet_infection', duration: 3, potency: 1, sourceId: part.id });
    }

    this.selectedPart = null;
    SaveManager.saveAll();
    this.scene.restart();
  }

  private unequipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playTick(0.04);
    unit.parts = unit.parts.filter(p => p.id !== part.id);

    const heat = unit.stats.heat;
    const newStats = computeStats(unit);
    unit.stats = { ...newStats, heat: Math.min(heat, newStats.thresh) };

    runState.addToInventory(part);
    this.selectedPart = null;
    SaveManager.saveAll();
    this.scene.restart();
  }
}
