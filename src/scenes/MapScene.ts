import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { MapGenerator } from '@/systems/MapGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, drawHeatMeter, FONT, powerColor } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
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

const ROOM_ICONS: Record<string, { symbol: string; color: number }> = {
  battle:   { symbol: '\u2694', color: COLORS.rust2 },
  repair:   { symbol: '+',      color: COLORS.safe },
  terminal: { symbol: '>_',     color: COLORS.elec2 },
  elite:    { symbol: '!',      color: COLORS.copper3 },
  boss:     { symbol: '\u2620', color: COLORS.meltdown },
  market:   { symbol: '$',      color: COLORS.soul2 },
};

export class MapScene extends Phaser.Scene {
  private nodeSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super('Map');
  }

  create(): void {
    AudioManager.setMode('map');
    fadeIn(this);
    this.nodeSprites.clear();
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const state = runState.get();

    if (state.map.length === 0) {
      const map = MapGenerator.generate(state.zone, state.zoneIndex);
      runState.setMap(map);
    }

    const zoneColor = ZONE_COLORS[state.zone] ?? COLORS.copper;
    const zoneColorStr = '#' + zoneColor.toString(16).padStart(6, '0');

    // ── Zone header ──
    this.add.text(GAME_WIDTH / 2, 18, ZONE_NAMES[state.zone] ?? state.zone, {
      fontFamily: 'monospace', fontSize: mob ? '12px' : '14px',
      color: zoneColorStr, letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 38, `FLOOR ${state.floor}  |  ASCENSION ${state.ascension}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);

    // Zone accent line
    this.add.rectangle(GAME_WIDTH / 2, 52, mob ? GAME_WIDTH - 40 : 500, 1, zoneColor, 0.3);

    // ── Team summary (top-right) ──
    const units = state.units.filter(u => u.alive);
    let hx = GAME_WIDTH - 20;
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      const pc = powerColor(u.powerSource);
      const pcStr = '#' + pc.toString(16).padStart(6, '0');

      // Mini unit indicator
      this.add.rectangle(hx - 20, 20, 36, 20, COLORS.surface).setStrokeStyle(1, pc);
      this.add.text(hx - 20, 14, u.name.substring(0, 5), {
        fontFamily: 'monospace', fontSize: '14px', color: pcStr,
      }).setOrigin(0.5);

      // Mini HP bar
      const hpPct = u.stats.hp / u.stats.maxHp;
      this.add.rectangle(hx - 20, 26, 30, 2, COLORS.border);
      this.add.rectangle(hx - 35, 26, 30 * hpPct, 2, COLORS.safe).setOrigin(0, 0.5);

      hx -= 44;
    }

    // ── Run progress bar ──
    const mapNodes = runState.get().map;
    const cleared = mapNodes.filter(n => n.cleared).length;
    const total = mapNodes.length;
    const progPct = total > 0 ? cleared / total : 0;
    const progW = mob ? GAME_WIDTH - 40 : 300;
    this.add.rectangle(cx, GAME_HEIGHT - 60, progW, 6, COLORS.border);
    this.add.rectangle(cx - progW / 2, GAME_HEIGHT - 60, progW * progPct, 6, zoneColor).setOrigin(0, 0.5);
    this.add.text(cx, GAME_HEIGHT - 72, `PROGRESS: ${cleared}/${total} ROOMS  |  CONSCIOUSNESS: ${state.consciousnessScore}`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c8b89a', letterSpacing: 1,
    }).setOrigin(0.5);

    // ── Room tooltip (shown on hover) ──
    const tooltip = this.add.container(0, 0).setVisible(false).setDepth(500);
    const ttBg = this.add.rectangle(0, 0, 280, 100, 0x121110, 0.95).setStrokeStyle(1, COLORS.border);
    const ttTitle = this.add.text(0, -34, '', { fontFamily: 'monospace', fontSize: '12px', color: '#f5c563', letterSpacing: 2 }).setOrigin(0.5);
    const ttDesc = this.add.text(0, -14, '', { fontFamily: 'monospace', fontSize: '10px', color: '#e8dcc8', align: 'center', wordWrap: { width: 260 } }).setOrigin(0.5);
    const ttRisk = this.add.text(-60, 14, '', { fontFamily: 'monospace', fontSize: '9px', color: '#c0432e' });
    const ttReward = this.add.text(-60, 28, '', { fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e' });
    tooltip.add([ttBg, ttTitle, ttDesc, ttRisk, ttReward]);
    this.data.set('tooltip', tooltip);
    this.data.set('ttTitle', ttTitle);
    this.data.set('ttDesc', ttDesc);
    this.data.set('ttRisk', ttRisk);
    this.data.set('ttReward', ttReward);

    // ── Draw map ──
    this.drawMap(runState.get().map, zoneColor);

    // ── Bottom buttons ──
    const invCount = runState.getInventory().length;
    createButton(this, mob ? GAME_WIDTH / 4 : GAME_WIDTH - 220, GAME_HEIGHT - 28,
      `INVENTORY (${invCount})`, () => {
      this.scene.start('Inventory');
    }, { color: COLORS.elec2, width: mob ? GAME_WIDTH / 2 - 16 : 140 });

    createButton(this, mob ? GAME_WIDTH * 3 / 4 : GAME_WIDTH - 70, GAME_HEIGHT - 28, 'TEAM', () => {
      this.scene.start('Team');
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH - 40 : 120 });
  }

  private drawMap(nodes: MapNode[], zoneColor: number): void {
    const gfx = this.add.graphics();
    const mob = isMobile();

    // ── Draw connections ──
    for (const node of nodes) {
      for (const connId of node.connections) {
        const target = nodes.find(n => n.id === connId);
        if (!target) continue;

        const isAccessible = this.isNodeAccessible(node) || this.isNodeAccessible(target);
        gfx.lineStyle(isAccessible ? 2 : 1, isAccessible ? zoneColor : COLORS.border, isAccessible ? 0.4 : 0.15);
        gfx.lineBetween(node.x, node.y, target.x, target.y);

        // Arrow dot at midpoint
        if (isAccessible) {
          const mx = (node.x + target.x) / 2;
          const my = (node.y + target.y) / 2;
          gfx.fillStyle(zoneColor, 0.3);
          gfx.fillCircle(mx, my, 2);
        }
      }
    }

    // ── Draw nodes ──
    for (const node of nodes) {
      const container = this.add.container(node.x, node.y);
      const isAccessible = this.isNodeAccessible(node);
      const isCurrent = node.id === runState.get().currentNodeId;
      const roomInfo = ROOM_ICONS[node.type] ?? { symbol: '?', color: COLORS.copper };

      const alpha = node.cleared ? 0.35 : isAccessible ? 1 : 0.2;
      const radius = mob ? 16 : 20;

      // Outer ring
      const ring = this.add.graphics();
      if (isCurrent) {
        ring.lineStyle(3, COLORS.copper3, 1);
        ring.strokeCircle(0, 0, radius + 4);
      }
      ring.fillStyle(COLORS.surface, alpha);
      ring.fillCircle(0, 0, radius);
      ring.lineStyle(node.cleared ? 1 : 2, node.cleared ? COLORS.safe : isAccessible ? roomInfo.color : COLORS.border, alpha);
      ring.strokeCircle(0, 0, radius);
      container.add(ring);

      // Inner icon
      const iconColor = node.cleared
        ? '#4cae6e'
        : '#' + roomInfo.color.toString(16).padStart(6, '0');
      const icon = this.add.text(0, -1, roomInfo.symbol, {
        fontFamily: 'monospace', fontSize: mob ? '12px' : '14px',
        color: iconColor,
      }).setOrigin(0.5).setAlpha(alpha);
      container.add(icon);

      // Label below
      const label = this.add.text(0, radius + 6, node.type.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 1,
      }).setOrigin(0.5).setAlpha(alpha * 0.7);
      container.add(label);

      // Interaction
      if (isAccessible && !node.cleared) {
        container.setSize(radius * 2 + 8, radius * 2 + 8);
        container.setInteractive({ useHandCursor: true })
          .on('pointerover', () => {
            ring.clear();
            ring.fillStyle(roomInfo.color, 0.15);
            ring.fillCircle(0, 0, radius);
            ring.lineStyle(2, roomInfo.color, 1);
            ring.strokeCircle(0, 0, radius);
            icon.setScale(1.15);
            // Show tooltip
            const tt = this.data.get('tooltip') as Phaser.GameObjects.Container;
            const info = ROOM_DESCRIPTIONS[node.type];
            if (tt && info) {
              (this.data.get('ttTitle') as Phaser.GameObjects.Text).setText(info.name);
              (this.data.get('ttDesc') as Phaser.GameObjects.Text).setText(info.desc);
              (this.data.get('ttRisk') as Phaser.GameObjects.Text).setText(`RISK: ${info.risk}`);
              (this.data.get('ttReward') as Phaser.GameObjects.Text).setText(`REWARD: ${info.reward}`);
              tt.setPosition(node.x, node.y - radius - 65);
              // Keep tooltip on screen
              if (tt.y < 50) tt.y = node.y + radius + 65;
              if (tt.x < 150) tt.x = 150;
              if (tt.x > GAME_WIDTH - 150) tt.x = GAME_WIDTH - 150;
              tt.setVisible(true);
            }
          })
          .on('pointerout', () => {
            ring.clear();
            ring.fillStyle(COLORS.surface, 1);
            ring.fillCircle(0, 0, radius);
            ring.lineStyle(2, roomInfo.color, 1);
            ring.strokeCircle(0, 0, radius);
            icon.setScale(1);
            const tt = this.data.get('tooltip') as Phaser.GameObjects.Container;
            if (tt) tt.setVisible(false);
          })
          .on('pointerdown', () => this.enterRoom(node));
      }

      this.nodeSprites.set(node.id, container);
    }
  }

  private isNodeAccessible(node: MapNode): boolean {
    const currentId = runState.get().currentNodeId;
    if (!currentId) {
      const nodes = runState.get().map;
      const minY = Math.min(...nodes.map(n => n.y));
      return node.y <= minY + 10;
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
