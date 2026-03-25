import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { MapGenerator } from '@/systems/MapGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, FONT, powerColor } from '@/ui/UIKit';
import { isMobile, addTouchScroll } from '@/utils/Mobile';
import { ROOM_DESCRIPTIONS } from '@/data/roomEvents';
import type { MapNode } from '@/types';

const ZONE_NAMES: Record<string, string> = {
  boiler_works: 'BOILER WORKS',
  voltage_archives: 'VOLTAGE ARCHIVES',
  soul_labs: 'SOUL LABORATORIES',
  kenet_heart: 'KENET HEART',
};

const ZONE_COLORS: Record<string, number> = {
  boiler_works: COLORS.steam2,
  voltage_archives: COLORS.elec2,
  soul_labs: COLORS.soul2,
  kenet_heart: COLORS.meltdown,
};

// Room visual config
const ROOM_CFG: Record<string, { icon: string; color: number; label: string; size: number }> = {
  battle:   { icon: '⚔',  color: COLORS.rust2,    label: 'BATTLE',   size: 1 },
  repair:   { icon: '✚',  color: COLORS.safe,     label: 'REPAIR',   size: 1 },
  terminal: { icon: '◈',  color: COLORS.elec2,    label: 'TERMINAL', size: 1 },
  elite:    { icon: '★',  color: COLORS.copper3,  label: 'ELITE',    size: 1.15 },
  boss:     { icon: '☠',  color: COLORS.meltdown, label: 'BOSS',     size: 1.4 },
  market:   { icon: '◉',  color: COLORS.soul2,    label: 'MARKET',   size: 1 },
};

export class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create(): void {
    AudioManager.setMode('map');
    fadeIn(this);
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const state = runState.get();

    if (state.map.length === 0) {
      const map = MapGenerator.generate(state.zone, state.zoneIndex);
      runState.setMap(map);
    }

    const nodes = runState.get().map;
    const zoneColor = ZONE_COLORS[state.zone] ?? COLORS.copper;
    const zcStr = '#' + zoneColor.toString(16).padStart(6, '0');

    this.cameras.main.setBackgroundColor(COLORS.bg);

    // ══════════════════════════════════════
    //  HEADER BAR
    // ══════════════════════════════════════
    this.add.rectangle(cx, 0, GAME_WIDTH, 56, 0x151210).setOrigin(0.5, 0);
    this.add.rectangle(cx, 56, GAME_WIDTH, 1, zoneColor, 0.4);

    this.add.text(mob ? cx : 20, 10, ZONE_NAMES[state.zone] ?? state.zone, {
      fontFamily: 'monospace', fontSize: mob ? '13px' : '16px',
      color: zcStr, letterSpacing: 4,
    }).setOrigin(mob ? 0.5 : 0, 0);

    this.add.text(mob ? cx : 20, 32, `FLOOR ${state.floor}  ·  ASC ${state.ascension}  ·  ◉ ${state.consciousnessScore}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#a89878', letterSpacing: 1,
    }).setOrigin(mob ? 0.5 : 0, 0);

    // Team HP summary (top-right)
    if (!mob) {
      const units = state.units.filter(u => u.alive);
      let tx = GAME_WIDTH - 16;
      for (let i = units.length - 1; i >= 0; i--) {
        const u = units[i];
        const pc = powerColor(u.powerSource);
        const hpPct = u.stats.hp / u.stats.maxHp;

        // Compact unit badge
        this.add.rectangle(tx - 22, 22, 42, 28, COLORS.surface).setStrokeStyle(1, pc, 0.5);
        this.add.text(tx - 22, 12, u.name.substring(0, 4), {
          fontFamily: 'monospace', fontSize: '9px',
          color: '#' + pc.toString(16).padStart(6, '0'),
        }).setOrigin(0.5);
        this.add.text(tx - 22, 24, `Lv${u.level}`, {
          fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
        }).setOrigin(0.5);
        // HP bar
        this.add.rectangle(tx - 22, 35, 36, 3, COLORS.border);
        if (hpPct > 0) {
          this.add.rectangle(tx - 40, 35, 36 * hpPct, 3,
            hpPct > 0.5 ? COLORS.safe : hpPct > 0.25 ? COLORS.warning : COLORS.critical
          ).setOrigin(0, 0.5);
        }
        tx -= 50;
      }
    }

    // ══════════════════════════════════════
    //  MAP CONTAINER (scrollable)
    // ══════════════════════════════════════
    const mapContainer = this.add.container(0, 0);

    // Background atmosphere
    this.drawMapBackground(mapContainer, zoneColor, nodes);

    // Draw connections first (behind nodes)
    this.drawConnections(mapContainer, nodes, zoneColor);

    // Draw nodes
    this.drawNodes(mapContainer, nodes, zoneColor);

    // ══════════════════════════════════════
    //  PROGRESS BAR
    // ══════════════════════════════════════
    const cleared = nodes.filter(n => n.cleared).length;
    const total = nodes.length;
    const progPct = total > 0 ? cleared / total : 0;
    const progW = mob ? GAME_WIDTH - 30 : 340;
    const progY = GAME_HEIGHT - 68;

    this.add.rectangle(cx, progY, progW, 8, COLORS.surface).setStrokeStyle(1, COLORS.border, 0.3);
    if (progPct > 0) {
      this.add.rectangle(cx - progW / 2 + 1, progY, (progW - 2) * progPct, 6, zoneColor, 0.7).setOrigin(0, 0.5);
    }
    this.add.text(cx, progY - 12, `${cleared} / ${total} ROOMS CLEARED`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#a89878',
    }).setOrigin(0.5);

    // ══════════════════════════════════════
    //  ROOM LEGEND (left side, desktop only)
    // ══════════════════════════════════════
    if (!mob) {
      const legendX = 16;
      let legendY = 72;
      this.add.text(legendX, legendY, 'ROOMS', {
        fontFamily: 'monospace', fontSize: '9px', color: '#6a5e50', letterSpacing: 2,
      });
      legendY += 16;

      for (const [type, cfg] of Object.entries(ROOM_CFG)) {
        const c = '#' + cfg.color.toString(16).padStart(6, '0');
        this.add.text(legendX, legendY, `${cfg.icon} ${cfg.label}`, {
          fontFamily: 'monospace', fontSize: '10px', color: c,
        });
        legendY += 15;
      }
    }

    // ══════════════════════════════════════
    //  TOOLTIP (hover/tap)
    // ══════════════════════════════════════
    this.createTooltip();

    // ══════════════════════════════════════
    //  BOTTOM BUTTONS
    // ══════════════════════════════════════
    const btnY = GAME_HEIGHT - 30;
    const invCount = runState.getInventory().length;
    const kCount = runState.getKeepsakes().length;

    if (mob) {
      createButton(this, cx, btnY, `INVENTORY (${invCount})  ·  TEAM`, () => {
        this.scene.start('Inventory');
      }, { color: COLORS.elec2, width: GAME_WIDTH - 30 });
    } else {
      createButton(this, GAME_WIDTH - 260, btnY, `INVENTORY (${invCount})`, () => {
        this.scene.start('Inventory');
      }, { color: COLORS.elec2, width: 160 });

      createButton(this, GAME_WIDTH - 90, btnY, 'TEAM', () => {
        this.scene.start('Team');
      }, { color: COLORS.copper, width: 120 });
    }
  }

  // ════════════════════════════════════════
  //  Map Background
  // ════════════════════════════════════════
  private drawMapBackground(container: Phaser.GameObjects.Container, zoneColor: number, nodes: MapNode[]): void {
    const g = this.add.graphics();

    // Subtle vertical lane hints
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));

    // Vertical glow lanes (very subtle)
    for (let x = minX - 20; x <= maxX + 20; x += 60) {
      g.fillStyle(zoneColor, 0.015);
      g.fillRect(x - 15, 60, 30, GAME_HEIGHT - 140);
    }

    // Horizontal floor indicator lines
    const floors = new Set(nodes.map(n => n.y));
    for (const fy of floors) {
      g.lineStyle(1, COLORS.border, 0.06);
      g.lineBetween(100, fy, GAME_WIDTH - 100, fy);
    }

    container.add(g);
  }

  // ════════════════════════════════════════
  //  Connections (bezier curves with arrows)
  // ════════════════════════════════════════
  private drawConnections(container: Phaser.GameObjects.Container, nodes: MapNode[], zoneColor: number): void {
    const g = this.add.graphics();

    for (const node of nodes) {
      for (const connId of node.connections) {
        const target = nodes.find(n => n.id === connId);
        if (!target) continue;

        const fromAccessible = this.isNodeAccessible(node);
        const toAccessible = this.isNodeAccessible(target);
        const isPath = fromAccessible || toAccessible;
        const isCleared = node.cleared && target.cleared;
        const isNext = fromAccessible && !target.cleared; // current path

        // Color and style
        let lineColor: number = COLORS.border;
        let lineAlpha = 0.12;
        let lineWidth = 1;

        if (isCleared) {
          lineColor = COLORS.safe;
          lineAlpha = 0.25;
          lineWidth = 2;
        } else if (isNext) {
          lineColor = zoneColor;
          lineAlpha = 0.6;
          lineWidth = 2.5;
        } else if (isPath) {
          lineColor = zoneColor;
          lineAlpha = 0.25;
          lineWidth = 1.5;
        }

        g.lineStyle(lineWidth, lineColor, lineAlpha);

        // Draw smooth curve (segmented bezier approximation)
        const x1 = node.x, y1 = node.y;
        const x2 = target.x, y2 = target.y;
        const midY = (y1 + y2) / 2;

        const segments = 16;
        g.beginPath();
        g.moveTo(x1, y1);
        for (let s = 1; s <= segments; s++) {
          const t = s / segments;
          const it = 1 - t;
          // Cubic bezier: P0=start, P1=(x1,midY), P2=(x2,midY), P3=end
          const bx = it * it * it * x1 + 3 * it * it * t * x1 + 3 * it * t * t * x2 + t * t * t * x2;
          const by = it * it * it * y1 + 3 * it * it * t * midY + 3 * it * t * t * midY + t * t * t * y2;
          g.lineTo(bx, by);
        }
        g.strokePath();

        // Direction arrows on active paths
        if (isNext) {
          const arrowY = midY;
          const arrowX = (x1 + x2) / 2;
          // Small triangle pointing up
          g.fillStyle(zoneColor, 0.5);
          g.fillTriangle(arrowX - 4, arrowY + 3, arrowX + 4, arrowY + 3, arrowX, arrowY - 4);
        }

        // Dotted trail for cleared paths
        if (isCleared) {
          const steps = 6;
          for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const dx = x1 + (x2 - x1) * t;
            const dy = y1 + (y2 - y1) * t;
            g.fillStyle(COLORS.safe, 0.15);
            g.fillCircle(dx, dy, 1.5);
          }
        }
      }
    }

    container.add(g);
  }

  // ════════════════════════════════════════
  //  Node Rendering
  // ════════════════════════════════════════
  private drawNodes(container: Phaser.GameObjects.Container, nodes: MapNode[], zoneColor: number): void {
    const mob = isMobile();

    for (const node of nodes) {
      const cfg = ROOM_CFG[node.type] ?? ROOM_CFG.battle;
      const isAccessible = this.isNodeAccessible(node);
      const isCurrent = node.id === runState.get().currentNodeId;
      const baseR = mob ? 18 : 22;
      const radius = Math.round(baseR * cfg.size);

      const nc = this.add.container(node.x, node.y);

      // ── Node states ──
      if (node.cleared) {
        // Cleared: dimmed, checkmark
        this.drawClearedNode(nc, radius, cfg);
      } else if (isCurrent) {
        // Current position: pulse glow
        this.drawCurrentNode(nc, radius, cfg, zoneColor);
      } else if (isAccessible) {
        // Accessible: bright, interactive
        this.drawAccessibleNode(nc, radius, cfg, node, zoneColor, mob);
      } else {
        // Locked: very dim
        this.drawLockedNode(nc, radius, cfg);
      }

      container.add(nc);
    }
  }

  private drawClearedNode(c: Phaser.GameObjects.Container, r: number, cfg: typeof ROOM_CFG.battle): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.surface, 0.3);
    g.fillCircle(0, 0, r);
    g.lineStyle(1, COLORS.safe, 0.3);
    g.strokeCircle(0, 0, r);
    c.add(g);

    c.add(this.add.text(0, -2, '✓', {
      fontFamily: 'monospace', fontSize: `${r}px`, color: '#4cae6e',
    }).setOrigin(0.5).setAlpha(0.5));

    c.add(this.add.text(0, r + 8, cfg.label, {
      fontFamily: 'monospace', fontSize: '8px', color: '#4a4030', letterSpacing: 1,
    }).setOrigin(0.5));
  }

  private drawCurrentNode(c: Phaser.GameObjects.Container, r: number, cfg: typeof ROOM_CFG.battle, zoneColor: number): void {
    // Pulse ring
    const pulse = this.add.graphics();
    pulse.lineStyle(2, COLORS.copper3, 0.6);
    pulse.strokeCircle(0, 0, r + 6);
    c.add(pulse);
    this.tweens.add({
      targets: pulse, alpha: 0.2, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Filled node
    const g = this.add.graphics();
    g.fillStyle(COLORS.copper3, 0.15);
    g.fillCircle(0, 0, r + 3);
    g.fillStyle(COLORS.surface, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(2, COLORS.copper3, 0.9);
    g.strokeCircle(0, 0, r);
    c.add(g);

    // "YOU" marker
    c.add(this.add.text(0, -r - 14, '▼ YOU', {
      fontFamily: 'monospace', fontSize: '9px', color: '#f5c563', letterSpacing: 1,
    }).setOrigin(0.5));

    const cStr = '#' + cfg.color.toString(16).padStart(6, '0');
    c.add(this.add.text(0, -2, cfg.icon, {
      fontFamily: 'monospace', fontSize: `${Math.round(r * 0.8)}px`, color: cStr,
    }).setOrigin(0.5));

    c.add(this.add.text(0, r + 8, cfg.label, {
      fontFamily: 'monospace', fontSize: '9px', color: '#f5c563', letterSpacing: 1,
    }).setOrigin(0.5));
  }

  private drawAccessibleNode(
    c: Phaser.GameObjects.Container, r: number,
    cfg: typeof ROOM_CFG.battle, node: MapNode,
    zoneColor: number, mob: boolean,
  ): void {
    const cStr = '#' + cfg.color.toString(16).padStart(6, '0');

    // Glow halo
    const halo = this.add.graphics();
    halo.fillStyle(cfg.color, 0.06);
    halo.fillCircle(0, 0, r + 8);
    c.add(halo);

    // Node circle
    const ring = this.add.graphics();
    ring.fillStyle(COLORS.surface, 1);
    ring.fillCircle(0, 0, r);
    ring.lineStyle(2, cfg.color, 0.8);
    ring.strokeCircle(0, 0, r);
    c.add(ring);

    // Icon
    const icon = this.add.text(0, -2, cfg.icon, {
      fontFamily: 'monospace', fontSize: `${Math.round(r * 0.75)}px`, color: cStr,
    }).setOrigin(0.5);
    c.add(icon);

    // Label
    c.add(this.add.text(0, r + 8, cfg.label, {
      fontFamily: 'monospace', fontSize: '9px', color: cStr, letterSpacing: 1,
    }).setOrigin(0.5));

    // Interactive
    c.setSize(r * 2 + 16, r * 2 + 16);
    c.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        ring.clear();
        ring.fillStyle(cfg.color, 0.12);
        ring.fillCircle(0, 0, r);
        ring.lineStyle(3, cfg.color, 1);
        ring.strokeCircle(0, 0, r);
        icon.setScale(1.15);
        halo.clear();
        halo.fillStyle(cfg.color, 0.1);
        halo.fillCircle(0, 0, r + 10);
        this.showTooltip(node);
      })
      .on('pointerout', () => {
        ring.clear();
        ring.fillStyle(COLORS.surface, 1);
        ring.fillCircle(0, 0, r);
        ring.lineStyle(2, cfg.color, 0.8);
        ring.strokeCircle(0, 0, r);
        icon.setScale(1);
        halo.clear();
        halo.fillStyle(cfg.color, 0.06);
        halo.fillCircle(0, 0, r + 8);
        this.hideTooltip();
      })
      .on('pointerdown', () => this.enterRoom(node));
  }

  private drawLockedNode(c: Phaser.GameObjects.Container, r: number, cfg: typeof ROOM_CFG.battle): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.surface, 0.15);
    g.fillCircle(0, 0, r);
    g.lineStyle(1, COLORS.border, 0.15);
    g.strokeCircle(0, 0, r);
    c.add(g);

    c.add(this.add.text(0, -2, cfg.icon, {
      fontFamily: 'monospace', fontSize: `${Math.round(r * 0.6)}px`, color: '#2a2620',
    }).setOrigin(0.5));

    c.add(this.add.text(0, r + 8, cfg.label, {
      fontFamily: 'monospace', fontSize: '8px', color: '#2a2620', letterSpacing: 1,
    }).setOrigin(0.5));
  }

  // ════════════════════════════════════════
  //  Tooltip
  // ════════════════════════════════════════
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private ttTitle!: Phaser.GameObjects.Text;
  private ttDesc!: Phaser.GameObjects.Text;
  private ttRisk!: Phaser.GameObjects.Text;
  private ttReward!: Phaser.GameObjects.Text;

  private createTooltip(): void {
    const c = this.add.container(0, 0).setVisible(false).setDepth(500);
    const w = 300;
    const h = 110;

    // Background with accent
    c.add(this.add.rectangle(0, 0, w, h, 0x121110, 0.97).setStrokeStyle(1, COLORS.copper, 0.5));
    c.add(this.add.rectangle(0, -h / 2 + 1, w, 2, COLORS.copper, 0.7));

    this.ttTitle = this.add.text(0, -38, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#f5c563', letterSpacing: 2,
    }).setOrigin(0.5);
    this.ttDesc = this.add.text(0, -16, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#e8dcc8',
      align: 'center', wordWrap: { width: 270 }, lineSpacing: 2,
    }).setOrigin(0.5);
    this.ttRisk = this.add.text(-130, 16, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
    });
    this.ttReward = this.add.text(-130, 32, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
    });

    c.add([this.ttTitle, this.ttDesc, this.ttRisk, this.ttReward]);
    this.tooltipContainer = c;
  }

  private showTooltip(node: MapNode): void {
    const info = ROOM_DESCRIPTIONS[node.type];
    if (!this.tooltipContainer || !info) return;

    const cfg = ROOM_CFG[node.type];
    const cStr = cfg ? '#' + cfg.color.toString(16).padStart(6, '0') : '#f5c563';
    this.ttTitle.setText(`${cfg?.icon ?? ''} ${info.name}`).setColor(cStr);
    this.ttDesc.setText(info.desc);
    this.ttRisk.setText(`⚠ ${info.risk}`);
    this.ttReward.setText(`★ ${info.reward}`);

    // Position above node
    let tx = node.x;
    let ty = node.y - 80;
    if (ty < 60) ty = node.y + 60;
    if (tx < 160) tx = 160;
    if (tx > GAME_WIDTH - 160) tx = GAME_WIDTH - 160;

    this.tooltipContainer.setPosition(tx, ty).setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltipContainer?.setVisible(false);
  }

  // ════════════════════════════════════════
  //  Navigation
  // ════════════════════════════════════════
  private isNodeAccessible(node: MapNode): boolean {
    const currentId = runState.get().currentNodeId;
    if (!currentId) {
      const nodes = runState.get().map;
      if (nodes.length === 0) return false;
      const maxY = Math.max(...nodes.map(n => n.y)); // bottom = first floor
      return node.y >= maxY - 10;
    }
    const current = runState.get().map.find(n => n.id === currentId);
    return current?.connections.includes(node.id) ?? false;
  }

  private enterRoom(node: MapNode): void {
    runState.moveTo(node.id);
    AudioManager.playTick(0.04, 1200, 0.03);
    switch (node.type) {
      case 'battle': case 'elite': case 'boss':
        this.scene.start('Battle', { roomType: node.type }); break;
      case 'repair':
        this.scene.start('Repair'); break;
      case 'terminal':
        this.scene.start('Terminal'); break;
      case 'market':
        this.scene.start('Market'); break;
    }
  }
}
