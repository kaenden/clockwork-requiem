import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { MapGenerator } from '@/systems/MapGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { createButton, drawHeatMeter, FONT, powerColor } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
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
      fontFamily: 'monospace', fontSize: '8px', color: '#7a6e5a', letterSpacing: 2,
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
        fontFamily: 'monospace', fontSize: '6px', color: pcStr,
      }).setOrigin(0.5);

      // Mini HP bar
      const hpPct = u.stats.hp / u.stats.maxHp;
      this.add.rectangle(hx - 20, 26, 30, 2, COLORS.border);
      this.add.rectangle(hx - 35, 26, 30 * hpPct, 2, COLORS.safe).setOrigin(0, 0.5);

      hx -= 44;
    }

    // ── Draw map ──
    this.drawMap(runState.get().map, zoneColor);

    // ── Team button ──
    createButton(this, mob ? GAME_WIDTH / 2 : GAME_WIDTH - 80, GAME_HEIGHT - 28, 'TEAM', () => {
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
        fontFamily: 'monospace', fontSize: '6px', color: '#7a6e5a', letterSpacing: 1,
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
          })
          .on('pointerout', () => {
            ring.clear();
            ring.fillStyle(COLORS.surface, 1);
            ring.fillCircle(0, 0, radius);
            ring.lineStyle(2, roomInfo.color, 1);
            ring.strokeCircle(0, 0, radius);
            icon.setScale(1);
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
