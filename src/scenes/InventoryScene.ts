import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { computeStats, canEquipPart, getCompatibility } from '@/systems/StatEngine';
import { BODY_BONUSES } from '@/data/classTree';
import { WEAPON_BONUSES } from '@/data/classTree';
import { getComboAbility } from '@/data/comboAbilities';
import { keepsakeRarityColor, keepsakeRarityNum } from '@/data/keepsakes';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, drawPanel, drawStatBar, drawHeatMeter, rarityColor, rarityColorNum, powerColor, FONT } from '@/ui/UIKit';
import { isMobile, addTouchScroll } from '@/utils/Mobile';
import type { Part, UnitConfig, PartCategory, Keepsake } from '@/types';

type Tab = 'team' | 'stash' | 'keepsakes';

const SLOT_META: { cat: PartCategory; label: string; icon: string }[] = [
  { cat: 'power_core',    label: 'CORE',  icon: '⚙' },
  { cat: 'armor_plate',   label: 'ARMOR', icon: '🛡' },
  { cat: 'movement',      label: 'MOVE',  icon: '⚡' },
  { cat: 'cooling',       label: 'COOL',  icon: '❄' },
  { cat: 'protocol_chip', label: 'CHIP',  icon: '◈' },
  { cat: 'kenet_part',    label: 'KENET', icon: '☣' },
];

export class InventoryScene extends Phaser.Scene {
  private tab: Tab = 'team';
  private selectedUnitIdx = 0;
  private selectedPart: Part | null = null;
  private equipSlotFilter: PartCategory | null = null;

  constructor() { super('Inventory'); }

  create(): void {
    fadeIn(this);
    const mob = isMobile();
    const state = runState.get();
    const units = state.units.filter(u => u.alive);
    const inventory = runState.getInventory();
    const keepsakes = runState.getKeepsakes();

    // Clamp selection
    if (this.selectedUnitIdx >= units.length) this.selectedUnitIdx = 0;
    const activeUnit = units[this.selectedUnitIdx] ?? null;

    this.cameras.main.setBackgroundColor(COLORS.bg);

    // ══════════════════════════════════════
    //  TOP BAR
    // ══════════════════════════════════════
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 42, 0x151210).setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 42, GAME_WIDTH, 1, COLORS.copper, 0.4);

    // Tab buttons
    const tabs: { id: Tab; label: string; count: string }[] = [
      { id: 'team',      label: 'TEAM',      count: `${units.length}` },
      { id: 'stash',     label: 'STASH',     count: `${inventory.length}` },
      { id: 'keepsakes', label: 'KEEPSAKES', count: `${keepsakes.length}/3` },
    ];

    const tabW = mob ? 100 : 140;
    const tabStartX = mob ? GAME_WIDTH / 2 - tabW * 1.5 + tabW / 2 : 20;

    tabs.forEach((t, i) => {
      const tx = mob ? tabStartX + i * tabW : tabStartX + i * (tabW + 8);
      const isActive = this.tab === t.id;

      const bg = this.add.rectangle(tx + tabW / 2, 20, tabW, 30,
        isActive ? COLORS.surface : 0x0d0c0b
      ).setStrokeStyle(1, isActive ? COLORS.copper : COLORS.border, isActive ? 0.8 : 0.2);

      this.add.text(tx + tabW / 2, 14, t.label, {
        fontFamily: 'monospace', fontSize: '11px',
        color: isActive ? '#f5c563' : '#6a5e50', letterSpacing: 2,
      }).setOrigin(0.5);

      this.add.text(tx + tabW / 2, 26, t.count, {
        fontFamily: 'monospace', fontSize: '9px',
        color: isActive ? '#c8b89a' : '#4a4030',
      }).setOrigin(0.5);

      if (isActive) {
        this.add.rectangle(tx + tabW / 2, 36, tabW - 4, 2, COLORS.copper);
      }

      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.tab !== t.id) {
            this.tab = t.id;
            this.selectedPart = null;
            this.equipSlotFilter = null;
            AudioManager.playTick(0.03);
            this.scene.restart();
          }
        });
    });

    // Map button (top right)
    createButton(this, GAME_WIDTH - (mob ? 60 : 80), 20, 'MAP', () => {
      this.tab = 'team';
      this.selectedPart = null;
      this.scene.start('Map');
    }, { color: COLORS.copper, width: mob ? 90 : 120 });

    // ══════════════════════════════════════
    //  CONTENT AREA
    // ══════════════════════════════════════
    const contentY = 52;

    switch (this.tab) {
      case 'team':
        this.drawTeamTab(units, activeUnit, inventory, mob, contentY);
        break;
      case 'stash':
        this.drawStashTab(units, inventory, mob, contentY);
        break;
      case 'keepsakes':
        this.drawKeepsakesTab(keepsakes, mob, contentY);
        break;
    }
  }

  // ══════════════════════════════════════════════════════
  //  TAB 1: TEAM — Unit selector + equipment slots
  // ══════════════════════════════════════════════════════
  private drawTeamTab(units: UnitConfig[], active: UnitConfig | null, inventory: Part[], mob: boolean, startY: number): void {
    if (!active || units.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No units. Start a run first.', FONT.body()).setOrigin(0.5);
      return;
    }

    // ── Unit selector strip (horizontal) ──
    const stripY = startY + 8;
    const stripH = mob ? 80 : 90;
    this.add.rectangle(GAME_WIDTH / 2, stripY + stripH / 2, GAME_WIDTH - 10, stripH, COLORS.surface)
      .setStrokeStyle(1, COLORS.border, 0.3);

    const cardW = mob ? Math.min((GAME_WIDTH - 30) / units.length, 120) : 200;

    units.forEach((unit, i) => {
      const isActive = i === this.selectedUnitIdx;
      const cx = mob
        ? 14 + i * (cardW + 6) + cardW / 2
        : 14 + i * (cardW + 8) + cardW / 2;
      const cy = stripY + stripH / 2;
      const pc = powerColor(unit.powerSource);
      const pcStr = '#' + pc.toString(16).padStart(6, '0');

      // Card
      const card = this.add.rectangle(cx, cy, cardW - 4, stripH - 12,
        isActive ? 0x201c16 : COLORS.surface
      ).setStrokeStyle(isActive ? 2 : 1, isActive ? pc : COLORS.border, isActive ? 0.9 : 0.3);

      // Robot mini portrait
      this.drawPortrait(cx - cardW / 2 + (mob ? 18 : 26), cy, unit, mob ? 0.6 : 0.8);

      // Name
      const nameX = cx - cardW / 2 + (mob ? 36 : 54);
      this.add.text(nameX, cy - 18, unit.name, {
        fontFamily: 'monospace', fontSize: mob ? '9px' : '12px',
        color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
      });

      // Level + source
      this.add.text(nameX, cy - 4, `Lv.${unit.level} ${unit.powerSource.toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: mob ? '8px' : '10px', color: pcStr,
      });

      // HP bar mini
      const hpPct = unit.stats.hp / unit.stats.maxHp;
      const barW = mob ? 40 : 80;
      this.add.rectangle(nameX + barW / 2, cy + 14, barW, 3, COLORS.border);
      this.add.rectangle(nameX + barW * hpPct / 2, cy + 14, barW * hpPct, 3, COLORS.safe).setOrigin(0, 0.5);
      this.add.text(nameX + barW + 4, cy + 10, `${unit.stats.hp}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e',
      });

      // Parts count badge
      if (!mob) {
        this.add.text(cx + cardW / 2 - 10, cy - stripH / 2 + 12, `${unit.parts.length}P`, {
          fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
          backgroundColor: '#0d0c0b', padding: { x: 3, y: 1 },
        }).setOrigin(1, 0);
      }

      // Selection indicator
      if (isActive) {
        this.add.rectangle(cx, cy + stripH / 2 - 7, cardW - 8, 2, pc);
      }

      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedUnitIdx = i;
          this.selectedPart = null;
          this.equipSlotFilter = null;
          AudioManager.playTick(0.03);
          this.scene.restart();
        });
    });

    // ── Main content: Character sheet ──
    const sheetY = stripY + stripH + 8;
    this.drawCharacterSheet(active, inventory, mob, sheetY);
  }

  // ── Character Sheet (robot + slots + stats + combo) ──
  private drawCharacterSheet(unit: UnitConfig, inventory: Part[], mob: boolean, startY: number): void {
    const pc = powerColor(unit.powerSource);
    const pcStr = '#' + pc.toString(16).padStart(6, '0');

    // Layout columns
    const leftW = mob ? GAME_WIDTH : GAME_WIDTH * 0.48;
    const rightX = mob ? 0 : leftW + 10;
    const rightW = mob ? GAME_WIDTH : GAME_WIDTH - leftW - 10;

    // ══ LEFT: Robot + Equipment Slots ══
    const robotCx = mob ? GAME_WIDTH / 2 : leftW / 2;
    const robotCy = startY + (mob ? 100 : 120);

    // Robot silhouette
    this.drawFullRobot(robotCx, robotCy, unit);

    // Equipment slots in 2x3 grid around robot
    const slotW = mob ? 72 : 88;
    const slotH = mob ? 50 : 56;
    const slotPositions = [
      { dx: -(slotW + 8), dy: -50 },  // CORE (top-left)
      { dx: (slotW + 8),  dy: -50 },  // ARMOR (top-right)
      { dx: -(slotW + 8), dy: 8 },    // MOVE (mid-left)
      { dx: (slotW + 8),  dy: 8 },    // COOL (mid-right)
      { dx: -(slotW + 8), dy: 66 },   // CHIP (bot-left)
      { dx: (slotW + 8),  dy: 66 },   // KENET (bot-right)
    ];

    SLOT_META.forEach((slot, i) => {
      const pos = slotPositions[i];
      const sx = robotCx + pos.dx;
      const sy = robotCy + pos.dy;
      const equipped = unit.parts.find(p => p.category === slot.cat);

      this.drawEquipSlot(sx, sy, slotW, slotH, slot, equipped, unit, inventory);
    });

    // ══ RIGHT: Stats + Abilities ══
    const statsY = mob ? robotCy + 140 : startY;
    const panelX = mob ? GAME_WIDTH / 2 : rightX + rightW / 2;
    const panelW = mob ? GAME_WIDTH - 20 : rightW - 20;

    // === STATS PANEL ===
    drawPanel(this, panelX, statsY + 54, panelW, 100, pc);

    this.add.text(panelX - panelW / 2 + 10, statsY + 10, 'STATS', {
      ...FONT.label(), color: pcStr,
    });

    const barW = mob ? 110 : 130;
    const col1 = panelX - panelW / 4;
    const col2 = panelX + panelW / 4;
    const s = unit.stats;

    drawStatBar(this, col1, statsY + 24, 'HP',  `${s.hp}/${s.maxHp}`, s.hp / s.maxHp, COLORS.safe, barW);
    drawStatBar(this, col1, statsY + 48, 'ATK', `${s.atk}`, Math.min(s.atk / 200, 1), COLORS.rust2, barW);
    drawStatBar(this, col2, statsY + 24, 'DEF', `${s.def}`, Math.min(s.def / 100, 1), COLORS.elec2, barW);
    drawStatBar(this, col2, statsY + 48, 'SPD', `${s.spd}`, Math.min(s.spd / 150, 1), COLORS.copper, barW);
    drawStatBar(this, col1, statsY + 72, 'SYN', `${s.syn}`, Math.min(s.syn / 100, 1), COLORS.soul2, barW);
    drawHeatMeter(this, col2, statsY + 76, s.heat, s.thresh, barW);

    // === CLASS INFO ===
    let classY = statsY + 114;
    drawPanel(this, panelX, classY + 38, panelW, 70, COLORS.copper);

    this.add.text(panelX - panelW / 2 + 10, classY + 8, 'CLASS', {
      ...FONT.label(), color: '#f5c563',
    });

    if (unit.bodyType) {
      const body = BODY_BONUSES[unit.bodyType];
      this.add.text(panelX - panelW / 2 + 10, classY + 22, `▸ BODY: ${unit.bodyType.toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
      });
      this.add.text(panelX - panelW / 2 + 16, classY + 36, body?.passive ?? '', {
        fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
        wordWrap: { width: panelW - 30 },
      });
    } else {
      this.add.text(panelX - panelW / 2 + 10, classY + 24, 'Body unlocks at Lv.10', {
        fontFamily: 'monospace', fontSize: '10px', color: '#4a4030',
      });
    }

    if (unit.weaponModule) {
      const weapon = WEAPON_BONUSES[unit.weaponModule];
      this.add.text(panelX - panelW / 2 + 10, classY + 50, `▸ WEAPON: ${weapon?.abilityName ?? unit.weaponModule}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#2aa8d4',
      });
    } else if (!unit.bodyType) {
      // Already showed body message
    } else {
      this.add.text(panelX - panelW / 2 + 10, classY + 50, 'Weapon unlocks at Lv.20', {
        fontFamily: 'monospace', fontSize: '10px', color: '#4a4030',
      });
    }

    // === COMBO ABILITY ===
    const combo = getComboAbility(unit.bodyType, unit.weaponModule);
    classY += 78;

    if (combo) {
      drawPanel(this, panelX, classY + 28, panelW, 50, 0xf0a84a);
      this.add.text(panelX - panelW / 2 + 10, classY + 8, 'COMBO ABILITY', {
        ...FONT.label(), color: '#f0a84a',
      });
      this.add.text(panelX - panelW / 2 + 10, classY + 22, `${combo.icon} ${combo.name}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#f0a84a',
      });
      this.add.text(panelX - panelW / 2 + 10, classY + 38, combo.description, {
        fontFamily: 'monospace', fontSize: '9px', color: '#c8b89a',
        wordWrap: { width: panelW - 24 },
      });
    }

    // === DIRECTIVE SELECTOR ===
    const dirY = combo ? classY + 60 : classY;
    this.add.text(panelX - panelW / 2 + 10, dirY + 8, 'DIRECTIVE', {
      ...FONT.label(), color: pcStr,
    });

    const directives = ['attack', 'defend', 'target', 'conserve', 'berserker'] as const;
    const dirColors: Record<string, string> = {
      attack: '#c0432e', defend: '#2aa8d4', target: '#f0a84a',
      conserve: '#4cae6e', berserker: '#9b52d4',
    };

    directives.forEach((d, i) => {
      const dx = panelX - panelW / 2 + 10 + i * (mob ? 54 : 64);
      const isActive = unit.directive === d;

      const bg = this.add.rectangle(dx + 24, dirY + 26, mob ? 50 : 58, 20,
        isActive ? 0x201c16 : COLORS.surface
      ).setStrokeStyle(1, isActive ? parseInt(dirColors[d].slice(1), 16) : COLORS.border, isActive ? 0.8 : 0.2);

      this.add.text(dx + 24, dirY + 26, d.slice(0, 3).toUpperCase(), {
        fontFamily: 'monospace', fontSize: '9px',
        color: isActive ? dirColors[d] : '#5a5040',
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          runState.setDirective(unit.id, d);
          SaveManager.saveAll();
          AudioManager.playTick(0.03);
          this.scene.restart();
        });
    });

    // Selected part detail
    if (this.selectedPart) {
      this.drawPartDetailPopup(this.selectedPart, unit, mob);
    }
  }

  // ── Equipment Slot ──
  private drawEquipSlot(
    x: number, y: number, w: number, h: number,
    meta: { cat: PartCategory; label: string; icon: string },
    equipped: Part | undefined,
    unit: UnitConfig,
    inventory: Part[],
  ): void {
    if (equipped) {
      const rc = rarityColorNum(equipped.rarity);
      const rcStr = rarityColor(equipped.rarity);

      // Filled slot
      const bg = this.add.rectangle(x, y, w, h, 0x1a2018)
        .setStrokeStyle(2, rc, 0.8);

      // Rarity accents
      this.add.rectangle(x, y - h / 2 + 0.5, w, 2, rc, 0.8);
      this.add.rectangle(x - w / 2 + 1, y, 2, h - 4, rc, 0.5);
      this.add.rectangle(x, y, w - 6, h - 6, rc, 0.04);

      // Part name
      this.add.text(x, y - 14, equipped.name, {
        fontFamily: 'monospace', fontSize: '9px', color: rcStr,
      }).setOrigin(0.5);

      // Stats
      const stats = equipped.statMods.map(m => {
        const c = m.value >= 0 ? '#4cae6e' : '#c0432e';
        return { txt: `${m.stat[0].toUpperCase()}${m.value >= 0 ? '+' : ''}${m.value}`, c };
      });
      let sx = x - (stats.length - 1) * 16;
      stats.forEach(s => {
        this.add.text(sx, y + 2, s.txt, {
          fontFamily: 'monospace', fontSize: '8px', color: s.c,
        }).setOrigin(0.5);
        sx += 32;
      });

      // Heat cost
      this.add.text(x, y + 14, `HEAT -${equipped.heatCost}T`, {
        fontFamily: 'monospace', fontSize: '7px', color: '#c0432e',
      }).setOrigin(0.5);

      // Remove (✕)
      this.add.text(x + w / 2 - 3, y - h / 2 + 3, '✕', {
        fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        backgroundColor: '#0d0c0b', padding: { x: 2, y: 0 },
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.unequipPart(unit, equipped));

      // Click for detail
      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedPart = equipped;
          this.scene.restart();
        });
    } else {
      // Empty slot
      const isHighlit = this.equipSlotFilter === meta.cat;
      const bg = this.add.rectangle(x, y, w, h, isHighlit ? 0x1a1a10 : 0x121110)
        .setStrokeStyle(1, isHighlit ? COLORS.copper : COLORS.border, isHighlit ? 0.6 : 0.2);

      // Corner brackets
      const g = this.add.graphics();
      g.lineStyle(1, COLORS.border, 0.2);
      const m = 4, dl = 10;
      [[x-w/2+m, y-h/2+m, 1, 0], [x-w/2+m, y-h/2+m, 0, 1],
       [x+w/2-m, y-h/2+m, -1, 0], [x+w/2-m, y-h/2+m, 0, 1],
       [x-w/2+m, y+h/2-m, 1, 0], [x-w/2+m, y+h/2-m, 0, -1],
       [x+w/2-m, y+h/2-m, -1, 0], [x+w/2-m, y+h/2-m, 0, -1],
      ].forEach(([fx, fy, ddx, ddy]) => {
        g.lineBetween(fx as number, fy as number, (fx as number) + (ddx as number) * dl, (fy as number) + (ddy as number) * dl);
      });

      this.add.text(x, y - 8, meta.icon, {
        fontFamily: 'monospace', fontSize: '16px', color: '#2a2620',
      }).setOrigin(0.5);

      this.add.text(x, y + 10, meta.label, {
        fontFamily: 'monospace', fontSize: '8px', color: '#2a2620', letterSpacing: 2,
      }).setOrigin(0.5);

      // Compatible part count
      const compatible = inventory.filter(p =>
        p.category === meta.cat && canEquipPart(unit, p).ok
      );
      if (compatible.length > 0) {
        this.add.text(x + w / 2 - 3, y - h / 2 + 3, `${compatible.length}`, {
          fontFamily: 'monospace', fontSize: '8px', color: '#f5c563',
          backgroundColor: '#0d0c0b', padding: { x: 3, y: 1 },
        }).setOrigin(1, 0);
      }

      // Click to filter stash
      bg.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.equipSlotFilter = this.equipSlotFilter === meta.cat ? null : meta.cat;
          this.tab = 'stash';
          AudioManager.playTick(0.03);
          this.scene.restart();
        });
    }
  }

  // ══════════════════════════════════════════════════════
  //  TAB 2: STASH — Part grid with filters
  // ══════════════════════════════════════════════════════
  private drawStashTab(units: UnitConfig[], inventory: Part[], mob: boolean, startY: number): void {
    const unit = units[this.selectedUnitIdx] ?? null;
    const cx = GAME_WIDTH / 2;

    // Filter bar
    const filterY = startY + 4;
    this.add.text(12, filterY, 'FILTER:', {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
    });

    let fx = 60;
    const allCats: (PartCategory | null)[] = [null, ...SLOT_META.map(s => s.cat)];
    allCats.forEach(cat => {
      const label = cat ? (SLOT_META.find(s => s.cat === cat)?.icon ?? '?') : 'ALL';
      const isActive = this.equipSlotFilter === cat;
      const count = cat ? inventory.filter(p => p.category === cat).length : inventory.length;

      this.add.text(fx, filterY, `${label} ${count}`, {
        fontFamily: 'monospace', fontSize: '9px',
        color: isActive ? '#f5c563' : '#6a5e50',
        backgroundColor: isActive ? '#201c16' : '#0d0c0b',
        padding: { x: 5, y: 3 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.equipSlotFilter = cat;
          AudioManager.playTick(0.02);
          this.scene.restart();
        });

      fx += (label.length + String(count).length + 1) * 7 + 16;
    });

    // Filtered inventory
    const filtered = this.equipSlotFilter
      ? inventory.filter(p => p.category === this.equipSlotFilter)
      : inventory;

    const gridY = filterY + 24;
    const container = this.add.container(0, 0);

    if (filtered.length === 0) {
      container.add(this.add.text(cx, gridY + 40, this.equipSlotFilter
        ? `No ${this.equipSlotFilter.replace(/_/g, ' ')} parts in stash.`
        : 'Stash is empty. Salvage parts from battles!',
        { ...FONT.body(), color: '#6a5e50' }
      ).setOrigin(0.5));
    }

    const cols = mob ? 2 : 4;
    const gap = 6;
    const cardW = (GAME_WIDTH - 20 - (cols - 1) * gap) / cols;
    const cardH = 82;

    filtered.forEach((part, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = 10 + col * (cardW + gap) + cardW / 2;
      const py = gridY + row * (cardH + gap) + cardH / 2;

      const isSelected = this.selectedPart?.id === part.id;
      const rc = rarityColor(part.rarity);
      const rcNum = rarityColorNum(part.rarity);
      const slotDef = SLOT_META.find(s => s.cat === part.category);

      // Card
      const card = this.add.rectangle(px, py, cardW, cardH,
        isSelected ? 0x252018 : COLORS.surface
      ).setStrokeStyle(1, COLORS.border, 0.3);
      container.add(card);

      // Rarity left stripe + top line
      container.add(this.add.rectangle(px - cardW / 2 + 1.5, py, 3, cardH - 2, rcNum, 0.9));
      container.add(this.add.rectangle(px, py - cardH / 2 + 0.5, cardW, 1, rcNum, 0.6));

      // Icon + Name
      container.add(this.add.text(px - cardW / 2 + 10, py - cardH / 2 + 5, slotDef?.icon ?? '•', {
        fontFamily: 'monospace', fontSize: '13px',
      }));
      container.add(this.add.text(px - cardW / 2 + 26, py - cardH / 2 + 6, part.name, {
        fontFamily: 'monospace', fontSize: '10px', color: rc,
      }));

      // Rarity + source badge
      container.add(this.add.text(px + cardW / 2 - 6, py - cardH / 2 + 4, `${part.rarity[0].toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '8px', color: rc,
        backgroundColor: '#0d0c0b', padding: { x: 2, y: 1 },
      }).setOrigin(1, 0));

      // Stats with color
      let statX = px - cardW / 2 + 10;
      for (const m of part.statMods) {
        const sign = m.value >= 0 ? '+' : '';
        const statColor = m.value >= 0 ? '#4cae6e' : '#c0432e';
        const txt = `${m.stat.toUpperCase()} ${sign}${m.value}`;
        container.add(this.add.text(statX, py + 4, txt, {
          fontFamily: 'monospace', fontSize: '9px', color: statColor,
        }));
        statX += txt.length * 6.5 + 6;
      }

      // Heat cost
      container.add(this.add.text(px - cardW / 2 + 10, py + 20, `HEAT -${part.heatCost}T`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#c0432e',
      }));

      // Compatibility indicator if unit selected
      if (unit) {
        const equipCheck = canEquipPart(unit, part);
        const compat = unit.isAxiom ? 'full' : getCompatibility(part.powerSource, unit.powerSource);
        const compatColor = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';

        if (equipCheck.ok) {
          const eBtn = this.add.text(px + cardW / 2 - 6, py + 18, '▶ EQUIP', {
            fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e',
            backgroundColor: '#0d0c0b', padding: { x: 4, y: 2 },
          }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.equipPart(unit, part));
          container.add(eBtn);
        } else {
          container.add(this.add.text(px + cardW / 2 - 6, py + 20, '✕', {
            fontFamily: 'monospace', fontSize: '9px', color: compatColor,
          }).setOrigin(1, 0));
        }
      }

      // Ability hint
      if (part.ability) {
        container.add(this.add.text(px + cardW / 2 - 6, py + 4, `⚔ ${part.ability.name}`, {
          fontFamily: 'monospace', fontSize: '7px', color: '#f5c563',
        }).setOrigin(1, 0));
      }

      // Source power dot
      const srcCol = powerColor(part.powerSource);
      container.add(this.add.rectangle(px - cardW / 2 + 10, py - cardH / 2 + 22, 4, 4, srcCol));

      card.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedPart = this.selectedPart?.id === part.id ? null : part;
          AudioManager.playTick(0.03);
          this.scene.restart();
        });
    });

    const maxScroll = Math.max(0, Math.ceil(filtered.length / cols) * (cardH + gap) + gridY - GAME_HEIGHT + 20);
    if (maxScroll > 0) addTouchScroll(this, container, maxScroll);

    // Detail popup
    if (this.selectedPart && unit) {
      this.drawPartDetailPopup(this.selectedPart, unit, mob);
    }
  }

  // ══════════════════════════════════════════════════════
  //  TAB 3: KEEPSAKES
  // ══════════════════════════════════════════════════════
  private drawKeepsakesTab(keepsakes: Keepsake[], mob: boolean, startY: number): void {
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, startY + 10, 'TEAM RELICS', {
      ...FONT.heading(), color: '#f0a84a',
    }).setOrigin(0.5);
    this.add.text(cx, startY + 32, 'Keepsakes buff your entire squad. Max 3 per run.', {
      ...FONT.small(), color: '#a89878',
    }).setOrigin(0.5);

    // 3 keepsake slots
    const slotW = mob ? GAME_WIDTH - 40 : 300;
    const slotH = 90;
    const slotGap = 12;

    for (let i = 0; i < 3; i++) {
      const sx = cx;
      const sy = startY + 64 + i * (slotH + slotGap) + slotH / 2;
      const keepsake = keepsakes[i];

      if (keepsake) {
        const kc = keepsakeRarityNum(keepsake.rarity);
        const kcStr = keepsakeRarityColor(keepsake.rarity);

        // Filled keepsake card
        this.add.rectangle(sx, sy, slotW, slotH, 0x1a1815)
          .setStrokeStyle(2, kc, 0.8);
        this.add.rectangle(sx, sy - slotH / 2 + 0.5, slotW, 2, kc, 0.9);
        this.add.rectangle(sx - slotW / 2 + 1.5, sy, 3, slotH - 4, kc, 0.6);

        // Icon + name
        this.add.text(sx - slotW / 2 + 14, sy - 28, keepsake.icon, {
          fontFamily: 'monospace', fontSize: '24px',
        });
        this.add.text(sx - slotW / 2 + 46, sy - 28, keepsake.name, {
          fontFamily: 'monospace', fontSize: '13px', color: kcStr,
        });

        // Rarity tag
        this.add.text(sx + slotW / 2 - 8, sy - 28, keepsake.rarity.toUpperCase(), {
          fontFamily: 'monospace', fontSize: '9px', color: kcStr,
          backgroundColor: '#0d0c0b', padding: { x: 4, y: 2 },
        }).setOrigin(1, 0);

        // Description
        this.add.text(sx - slotW / 2 + 14, sy - 4, keepsake.description, {
          fontFamily: 'monospace', fontSize: '10px', color: '#c8b89a',
          fontStyle: 'italic', wordWrap: { width: slotW - 28 },
        });

        // Effects
        const effectStr = keepsake.effects.map(e => {
          const label = e.type.replace(/_/g, ' ').toUpperCase();
          return `${label} +${e.value}`;
        }).join('  |  ');
        this.add.text(sx - slotW / 2 + 14, sy + 22, effectStr, {
          fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e',
        });

        // Remove button
        this.add.text(sx + slotW / 2 - 8, sy + 22, 'REMOVE', {
          fontFamily: 'monospace', fontSize: '9px', color: '#c0432e',
          backgroundColor: '#0d0c0b', padding: { x: 4, y: 2 },
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            runState.removeKeepsake(keepsake.id);
            SaveManager.saveAll();
            this.scene.restart();
          });
      } else {
        // Empty slot
        this.add.rectangle(sx, sy, slotW, slotH, 0x121110)
          .setStrokeStyle(1, COLORS.border, 0.2);

        this.add.text(sx, sy - 8, `SLOT ${i + 1}`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#2a2620',
        }).setOrigin(0.5);

        this.add.text(sx, sy + 10, 'Defeat a boss to earn a keepsake', {
          fontFamily: 'monospace', fontSize: '9px', color: '#2a2620',
        }).setOrigin(0.5);
      }
    }
  }

  // ══════════════════════════════════════════════════════
  //  Part Detail Popup
  // ══════════════════════════════════════════════════════
  private drawPartDetailPopup(part: Part, unit: UnitConfig, _mob: boolean): void {
    const cx = GAME_WIDTH / 2;
    const popH = 80;
    const popY = GAME_HEIGHT - popH - 4;
    const rc = rarityColor(part.rarity);
    const rcNum = rarityColorNum(part.rarity);

    // Background
    this.add.rectangle(cx, popY + popH / 2, GAME_WIDTH - 10, popH, 0x0d0c0b, 0.97)
      .setStrokeStyle(1, COLORS.border, 0.5).setDepth(300);
    this.add.rectangle(cx, popY, GAME_WIDTH - 12, 2, rcNum, 0.8).setDepth(301);
    this.add.rectangle(8, popY + popH / 2, 3, popH - 4, rcNum, 0.9).setDepth(301);

    const slotDef = SLOT_META.find(s => s.cat === part.category);

    // Row 1: Name + rarity + category
    this.add.text(18, popY + 6, `${slotDef?.icon ?? '•'} ${part.name}`, {
      ...FONT.body(), color: rc,
    }).setDepth(301);
    this.add.text(18 + (part.name.length + 3) * 9, popY + 7, part.rarity.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '9px', color: rc,
      backgroundColor: '#151210', padding: { x: 4, y: 1 },
    }).setDepth(301);

    // Row 2: Stats
    let sx = 18;
    for (const m of part.statMods) {
      const sign = m.value >= 0 ? '+' : '';
      const col = m.value >= 0 ? '#4cae6e' : '#c0432e';
      this.add.text(sx, popY + 28, `${m.stat.toUpperCase()} ${sign}${m.value}`, {
        fontFamily: 'monospace', fontSize: '11px', color: col,
      }).setDepth(301);
      sx += (m.stat.length + String(m.value).length + 2) * 7 + 10;
    }
    this.add.text(sx, popY + 28, `HEAT -${part.heatCost}T`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c0432e',
    }).setDepth(301);

    // Row 3: Ability + virus
    if (part.ability) {
      this.add.text(18, popY + 48, `⚔ ${part.ability.name}: ${part.ability.description}`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#f5c563',
        wordWrap: { width: GAME_WIDTH * 0.6 },
      }).setDepth(301);
    }
    if (part.virusChance && part.virusChance > 0) {
      this.add.text(GAME_WIDTH / 2, popY + 48, `☣ VIRUS: ${Math.round(part.virusChance * 100)}%`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        backgroundColor: '#2a1010', padding: { x: 4, y: 1 },
      }).setDepth(301);
    }

    // Compat with selected unit
    const compat = unit.isAxiom ? 'full' : getCompatibility(part.powerSource, unit.powerSource);
    const compatColor = compat === 'full' ? '#4cae6e' : compat === 'partial' ? '#d4a82a' : '#c0432e';
    const compatLabel = compat === 'full' ? 'COMPATIBLE' : compat === 'partial' ? 'PARTIAL +20%' : 'CONFLICT +50%';
    this.add.text(18, popY + 62, `${unit.name}: ${compatLabel}`, {
      fontFamily: 'monospace', fontSize: '9px', color: compatColor,
    }).setDepth(301);

    // Buttons
    const btnX = GAME_WIDTH - 16;
    // Equip (if in stash)
    const inStash = runState.getInventory().some(p => p.id === part.id);
    if (inStash) {
      const check = canEquipPart(unit, part);
      if (check.ok) {
        this.add.text(btnX, popY + 14, '▶ EQUIP', {
          fontFamily: 'monospace', fontSize: '12px', color: '#4cae6e',
          backgroundColor: '#0d0c0b', padding: { x: 8, y: 4 },
        }).setOrigin(1, 0).setDepth(301)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.equipPart(unit, part));
      }

      this.add.text(btnX, popY + 40, 'DISCARD', {
        fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        backgroundColor: '#1a1010', padding: { x: 6, y: 3 },
      }).setOrigin(1, 0).setDepth(301)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          runState.removeFromInventory(part.id);
          this.selectedPart = null;
          SaveManager.saveAll();
          this.scene.restart();
        });
    } else {
      // It's equipped — show REMOVE
      this.add.text(btnX, popY + 14, 'REMOVE', {
        fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
        backgroundColor: '#1a1010', padding: { x: 6, y: 3 },
      }).setOrigin(1, 0).setDepth(301)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.unequipPart(unit, part));
    }

    this.add.text(btnX, popY + 60, '✕ CLOSE', {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878',
      backgroundColor: '#1a1815', padding: { x: 6, y: 2 },
    }).setOrigin(1, 0).setDepth(301)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.selectedPart = null;
        this.scene.restart();
      });
  }

  // ══════════════════════════════════════════════════════
  //  Robot Drawing
  // ══════════════════════════════════════════════════════
  private drawPortrait(x: number, y: number, unit: UnitConfig, scale = 1): void {
    const g = this.add.graphics();
    const pc = powerColor(unit.powerSource);
    const s = scale;

    // Head
    g.fillStyle(COLORS.surface);
    g.fillRoundedRect(x - 10 * s, y - 26 * s, 20 * s, 16 * s, 3 * s);
    g.lineStyle(1, pc, 0.6);
    g.strokeRoundedRect(x - 10 * s, y - 26 * s, 20 * s, 16 * s, 3 * s);
    g.fillStyle(pc, 0.9);
    g.fillRect(x - 6 * s, y - 21 * s, 4 * s, 3 * s);
    g.fillRect(x + 2 * s, y - 21 * s, 4 * s, 3 * s);

    // Body
    g.fillStyle(COLORS.surface);
    g.fillRoundedRect(x - 13 * s, y - 8 * s, 26 * s, 22 * s, 2 * s);
    g.lineStyle(1, pc, 0.5);
    g.strokeRoundedRect(x - 13 * s, y - 8 * s, 26 * s, 22 * s, 2 * s);

    // Core
    g.fillStyle(pc, 0.5);
    g.fillCircle(x, y + 3 * s, 4 * s);

    // Parts
    unit.parts.forEach((p, i) => {
      const a = (i / Math.max(unit.parts.length, 1)) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(rarityColorNum(p.rarity), 0.8);
      g.fillCircle(x + Math.cos(a) * 7 * s, y + 3 * s + Math.sin(a) * 7 * s, 2 * s);
    });
  }

  private drawFullRobot(x: number, y: number, unit: UnitConfig): void {
    const g = this.add.graphics();
    const pc = powerColor(unit.powerSource);

    // Aura
    g.fillStyle(pc, 0.03); g.fillCircle(x, y, 60);
    g.fillStyle(pc, 0.015); g.fillCircle(x, y, 80);

    // Head
    g.fillStyle(0x1a1815); g.fillRoundedRect(x - 18, y - 55, 36, 24, 4);
    g.lineStyle(1.5, pc, 0.7); g.strokeRoundedRect(x - 18, y - 55, 36, 24, 4);
    g.fillStyle(pc, 0.9);
    g.fillRoundedRect(x - 12, y - 48, 8, 5, 2);
    g.fillRoundedRect(x + 4, y - 48, 8, 5, 2);
    g.lineStyle(1, pc, 0.5); g.lineBetween(x, y - 55, x, y - 66);
    g.fillStyle(pc, 0.8); g.fillCircle(x, y - 66, 2);

    // Neck
    g.fillStyle(COLORS.border, 0.5); g.fillRect(x - 3, y - 31, 6, 5);

    // Torso
    g.fillStyle(0x1a1815); g.fillRoundedRect(x - 24, y - 24, 48, 44, 3);
    g.lineStyle(1.5, pc, 0.6); g.strokeRoundedRect(x - 24, y - 24, 48, 44, 3);

    // Core
    g.fillStyle(pc, 0.15); g.fillCircle(x, y, 10);
    g.fillStyle(pc, 0.4); g.fillCircle(x, y, 5);
    g.fillStyle(pc, 0.9); g.fillCircle(x, y, 2);

    // Shoulders + arms
    g.fillStyle(0x1a1815);
    g.fillRoundedRect(x - 34, y - 24, 10, 14, 2);
    g.fillRoundedRect(x + 24, y - 24, 10, 14, 2);
    g.lineStyle(1, pc, 0.4);
    g.strokeRoundedRect(x - 34, y - 24, 10, 14, 2);
    g.strokeRoundedRect(x + 24, y - 24, 10, 14, 2);
    g.lineStyle(2.5, COLORS.border, 0.6);
    g.lineBetween(x - 28, y - 8, x - 36, y + 16);
    g.lineBetween(x + 28, y - 8, x + 36, y + 16);
    g.fillStyle(pc, 0.3);
    g.fillCircle(x - 36, y + 18, 4);
    g.fillCircle(x + 36, y + 18, 4);

    // Legs
    g.fillStyle(COLORS.border, 0.5); g.fillRect(x - 18, y + 20, 36, 5);
    g.lineStyle(2.5, COLORS.border, 0.6);
    g.lineBetween(x - 10, y + 25, x - 14, y + 52);
    g.lineBetween(x + 10, y + 25, x + 14, y + 52);
    g.fillStyle(0x1a1815);
    g.fillRoundedRect(x - 22, y + 50, 16, 7, 2);
    g.fillRoundedRect(x + 6, y + 50, 16, 7, 2);

    // Part glow on body
    const slotPositions = [
      { dx: 0, dy: -40 }, { dx: -18, dy: 0 }, { dx: 18, dy: 0 },
      { dx: 0, dy: 30 }, { dx: -18, dy: 30 }, { dx: 18, dy: 30 },
    ];
    unit.parts.forEach((p, i) => {
      const pos = slotPositions[SLOT_META.findIndex(s => s.cat === p.category)] ?? slotPositions[i % 6];
      if (!pos) return;
      const partColor = rarityColorNum(p.rarity);
      g.fillStyle(partColor, 0.25); g.fillCircle(x + pos.dx * 0.5, y + pos.dy * 0.5, 5);
      g.fillStyle(partColor, 0.7); g.fillCircle(x + pos.dx * 0.5, y + pos.dy * 0.5, 2);
    });
  }

  // ══════════════════════════════════════════════════════
  //  ACTIONS
  // ══════════════════════════════════════════════════════
  private equipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playSalvageClick();
    runState.removeFromInventory(part.id);
    unit.parts.push(part);
    const heat = unit.stats.heat;
    unit.stats = { ...computeStats(unit), heat };

    if (part.virusChance && Math.random() < part.virusChance) {
      // Check keepsake virus resist
      const keepsakes = runState.getKeepsakes();
      const resist = keepsakes.reduce((acc, k) =>
        acc + k.effects.filter(e => e.type === 'virus_resist').reduce((s, e) => s + e.value, 0), 0);
      const finalChance = Math.max(0, part.virusChance - resist / 100);
      if (Math.random() < finalChance) {
        unit.statusEffects.push({ type: 'kenet_infection', duration: 3, potency: 1, sourceId: part.id });
      }
    }

    this.selectedPart = null;
    SaveManager.saveAll();
    this.scene.restart();
  }

  private unequipPart(unit: UnitConfig, part: Part): void {
    AudioManager.playTick(0.04);
    unit.parts = unit.parts.filter(p => p.id !== part.id);
    const heat = unit.stats.heat;
    unit.stats = { ...computeStats(unit), heat: Math.min(heat, computeStats(unit).thresh) };
    runState.addToInventory(part);
    this.selectedPart = null;
    SaveManager.saveAll();
    this.scene.restart();
  }
}
