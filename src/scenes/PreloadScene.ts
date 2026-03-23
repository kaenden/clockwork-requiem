import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const barW = 320;
    const barH = 8;
    const bg = this.add.rectangle(cx, cy, barW, barH, COLORS.border);
    const fill = this.add.rectangle(cx - barW / 2, cy, 0, barH, COLORS.copper).setOrigin(0, 0.5);

    const label = this.add.text(cx, cy - 30, 'INITIALIZING AXIOM SYSTEMS...', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 3,
    }).setOrigin(0.5);

    this.load.on('progress', (p: number) => { fill.width = barW * p; });
    this.load.on('complete', () => { bg.destroy(); fill.destroy(); label.destroy(); });

    this.generatePlaceholderTextures();
  }

  create(data?: { firstLaunch?: boolean }): void {
    if (data?.firstLaunch) {
      this.scene.start('Tutorial');
    } else {
      this.scene.start('Menu');
    }
  }

  private generatePlaceholderTextures(): void {
    // ── Unit: Steam (amber automaton silhouette) ──
    this.makeUnit('unit_steam', COLORS.steam2, COLORS.steam, 0xe8913a);
    this.makeUnit('unit_electric', COLORS.elec2, COLORS.elec, 0x2aa8d4);
    this.makeUnit('unit_soul', COLORS.soul2, COLORS.soul, 0x9b52d4);
    this.makeUnit('unit_placeholder', COLORS.copper, COLORS.copper2, COLORS.copper3);

    // ── Enemy: Kenet infected (red eyes, distorted) ──
    this.makeEnemy('enemy_normal', COLORS.rust, COLORS.meltdown);
    this.makeEnemy('enemy_elite', COLORS.rust2, 0xff6b4a);
    this.makeEnemy('enemy_boss', 0x8b0000, 0xff4444);
    this.makeEnemy('enemy_placeholder', COLORS.rust2, COLORS.meltdown);

    // ── AXIOM-0 (special golden unit) ──
    const ax = this.add.graphics().setVisible(false);
    ax.fillStyle(0x1a1815, 1);
    ax.fillRect(0, 0, 48, 48);
    // Body
    ax.fillStyle(COLORS.copper3, 1);
    ax.fillRect(8, 8, 32, 36);
    ax.fillStyle(COLORS.copper, 1);
    ax.fillRect(10, 10, 28, 32);
    // Visor
    ax.fillStyle(0x0d0c0b, 1);
    ax.fillRect(14, 14, 20, 8);
    // Eyes (bright copper)
    ax.fillStyle(0xffd700, 1);
    ax.fillRect(16, 16, 5, 4);
    ax.fillRect(27, 16, 5, 4);
    // Chest mark
    ax.fillStyle(COLORS.copper3, 1);
    ax.fillRect(21, 28, 6, 6);
    // Shoulders
    ax.fillStyle(COLORS.copper2, 1);
    ax.fillRect(4, 12, 6, 12);
    ax.fillRect(38, 12, 6, 12);
    ax.generateTexture('unit_axiom', 48, 48);
    ax.destroy();

    // ── Room icons (detailed) ──
    this.makeRoomIcon('room_battle', COLORS.rust2, 'X');
    this.makeRoomIcon('room_repair', COLORS.safe, '+');
    this.makeRoomIcon('room_terminal', COLORS.elec2, '>');
    this.makeRoomIcon('room_elite', COLORS.copper3, '!');
    this.makeRoomIcon('room_boss', COLORS.meltdown, '*');
    this.makeRoomIcon('room_market', COLORS.soul2, '$');

    // ── Overload phase indicators ──
    this.makePhaseIndicator('phase_safe', COLORS.safe);
    this.makePhaseIndicator('phase_warning', COLORS.warning);
    this.makePhaseIndicator('phase_critical', COLORS.critical);
    this.makePhaseIndicator('phase_meltdown', COLORS.meltdown);

    // ── Power source icons ──
    this.makePowerIcon('icon_steam', COLORS.steam2);
    this.makePowerIcon('icon_electric', COLORS.elec2);
    this.makePowerIcon('icon_soul', COLORS.soul2);

    // ── Gear decoration ──
    const gear = this.add.graphics().setVisible(false);
    gear.lineStyle(2, COLORS.copper, 0.3);
    gear.strokeCircle(32, 32, 28);
    gear.strokeCircle(32, 32, 20);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      gear.lineBetween(
        32 + Math.cos(a) * 20, 32 + Math.sin(a) * 20,
        32 + Math.cos(a) * 32, 32 + Math.sin(a) * 32,
      );
    }
    gear.generateTexture('gear_deco', 64, 64);
    gear.destroy();
  }

  private makeUnit(key: string, body: number, dark: number, eye: number): void {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0x1a1815, 1);
    g.fillRect(0, 0, 48, 48);
    // Body shell
    g.fillStyle(body, 1);
    g.fillRect(10, 6, 28, 38);
    g.fillStyle(dark, 1);
    g.fillRect(12, 8, 24, 34);
    // Head
    g.fillStyle(body, 1);
    g.fillRect(14, 4, 20, 14);
    // Eyes
    g.fillStyle(eye, 1);
    g.fillRect(17, 8, 5, 4);
    g.fillRect(26, 8, 5, 4);
    // Arms
    g.fillStyle(dark, 0.7);
    g.fillRect(4, 14, 8, 18);
    g.fillRect(36, 14, 8, 18);
    // Legs
    g.fillRect(14, 40, 8, 8);
    g.fillRect(26, 40, 8, 8);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private makeEnemy(key: string, body: number, eye: number): void {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(0x0d0c0b, 1);
    g.fillRect(0, 0, 48, 48);
    // Distorted body
    g.fillStyle(body, 1);
    g.fillRect(8, 8, 32, 36);
    g.fillStyle(0x1a0505, 1);
    g.fillRect(10, 10, 28, 32);
    // Kenet-infected eyes (red glow)
    g.fillStyle(eye, 1);
    g.fillRect(14, 12, 7, 5);
    g.fillRect(27, 12, 7, 5);
    // Glitch lines
    g.fillStyle(eye, 0.3);
    g.fillRect(6, 20, 36, 1);
    g.fillRect(6, 28, 36, 1);
    g.fillRect(6, 36, 36, 1);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private makeRoomIcon(key: string, color: number, symbol: string): void {
    const g = this.add.graphics().setVisible(false);
    // Outer ring
    g.lineStyle(2, color, 0.8);
    g.strokeCircle(16, 16, 14);
    // Inner fill
    g.fillStyle(color, 0.15);
    g.fillCircle(16, 16, 12);
    // Center dot
    g.fillStyle(color, 0.9);
    g.fillCircle(16, 16, 4);
    g.generateTexture(key, 32, 32);
    g.destroy();
  }

  private makePhaseIndicator(key: string, color: number): void {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(color, 0.8);
    g.fillRect(0, 0, 12, 12);
    g.lineStyle(1, color, 1);
    g.strokeRect(0, 0, 12, 12);
    g.generateTexture(key, 12, 12);
    g.destroy();
  }

  private makePowerIcon(key: string, color: number): void {
    const g = this.add.graphics().setVisible(false);
    g.fillStyle(color, 0.9);
    g.fillCircle(10, 10, 8);
    g.fillStyle(0x0d0c0b, 1);
    g.fillCircle(10, 10, 4);
    g.generateTexture(key, 20, 20);
    g.destroy();
  }
}
