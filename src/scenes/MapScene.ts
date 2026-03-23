import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { MapGenerator } from '@/systems/MapGenerator';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import type { MapNode } from '@/types';

export class MapScene extends Phaser.Scene {
  private nodeSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super('Map');
  }

  create(): void {
    AudioManager.setMode('map');
    fadeIn(this);
    this.nodeSprites.clear();
    const state = runState.get();

    // Generate map if empty
    if (state.map.length === 0) {
      const map = MapGenerator.generate(state.zone, state.zoneIndex);
      runState.setMap(map);
    }

    // Zone title
    const zoneNames: Record<string, string> = {
      boiler_works: 'BOILER WORKS',
      voltage_archives: 'VOLTAGE ARCHIVES',
      soul_labs: 'SOUL LABORATORIES',
      kenet_heart: 'KENET HEART',
    };

    this.add.text(GAME_WIDTH / 2, 30, zoneNames[state.zone] ?? state.zone, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f0a84a',
      letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 52, `FLOOR ${state.floor} — ASCENSION ${state.ascension}`, {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#7a6e5a',
      letterSpacing: 2,
    }).setOrigin(0.5);

    // Draw map
    this.drawMap(runState.get().map);

    // Team button
    this.add.text(GAME_WIDTH - 20, GAME_HEIGHT - 30, '[ TEAM ]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8a888',
      letterSpacing: 2,
    }).setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Team'));
  }

  private drawMap(nodes: MapNode[]): void {
    const gfx = this.add.graphics();

    // Draw connections
    gfx.lineStyle(1, COLORS.border, 0.6);
    for (const node of nodes) {
      for (const connId of node.connections) {
        const target = nodes.find(n => n.id === connId);
        if (target) {
          gfx.lineBetween(node.x, node.y, target.x, target.y);
        }
      }
    }

    // Draw nodes
    for (const node of nodes) {
      const container = this.add.container(node.x, node.y);

      const textureKey = `room_${node.type}`;
      const hasTexture = this.textures.exists(textureKey);

      // Background circle
      const bg = this.add.graphics();
      const isAccessible = this.isNodeAccessible(node);
      const alpha = node.visited ? 0.4 : isAccessible ? 1 : 0.3;

      bg.fillStyle(node.cleared ? COLORS.safe : COLORS.surface, alpha);
      bg.fillCircle(0, 0, 18);
      bg.lineStyle(1, isAccessible ? COLORS.copper : COLORS.border, alpha);
      bg.strokeCircle(0, 0, 18);
      container.add(bg);

      if (hasTexture) {
        const icon = this.add.image(0, 0, textureKey).setAlpha(alpha);
        container.add(icon);
      }

      // Label
      const label = this.add.text(0, 26, node.type.toUpperCase(), {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#7a6e5a',
        letterSpacing: 1,
      }).setOrigin(0.5).setAlpha(alpha);
      container.add(label);

      // Current node indicator
      if (node.id === runState.get().currentNodeId) {
        const marker = this.add.graphics();
        marker.lineStyle(2, COLORS.copper3);
        marker.strokeCircle(0, 0, 22);
        container.add(marker);
      }

      // Interaction
      if (isAccessible && !node.cleared) {
        container.setSize(40, 40);
        container.setInteractive({ useHandCursor: true })
          .on('pointerover', () => bg.clear().fillStyle(COLORS.copper, 0.3).fillCircle(0, 0, 18).lineStyle(2, COLORS.copper3).strokeCircle(0, 0, 18))
          .on('pointerout', () => bg.clear().fillStyle(COLORS.surface, 1).fillCircle(0, 0, 18).lineStyle(1, COLORS.copper).strokeCircle(0, 0, 18))
          .on('pointerdown', () => this.enterRoom(node));
      }

      this.nodeSprites.set(node.id, container);
    }
  }

  private isNodeAccessible(node: MapNode): boolean {
    const currentId = runState.get().currentNodeId;
    if (!currentId) {
      // First entry — find the minimum y (first layer) and allow those nodes
      const nodes = runState.get().map;
      const minY = Math.min(...nodes.map(n => n.y));
      return node.y <= minY + 10;
    }
    const current = runState.get().map.find(n => n.id === currentId);
    return current?.connections.includes(node.id) ?? false;
  }

  private enterRoom(node: MapNode): void {
    runState.moveTo(node.id);
    switch (node.type) {
      case 'battle':
      case 'elite':
      case 'boss':
        this.scene.start('Battle', { roomType: node.type });
        break;
      case 'repair':
        this.scene.start('Repair');
        break;
      case 'terminal':
        this.scene.start('Terminal');
        break;
      case 'market':
        this.scene.start('Market');
        break;
    }
  }
}
