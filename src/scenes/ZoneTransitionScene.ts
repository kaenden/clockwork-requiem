import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, MAX_TEAM_SIZE } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { SaveManager } from '@/utils/SaveManager';
import type { Zone } from '@/types';

const ZONE_NAMES: Record<Zone, string> = {
  boiler_works: 'BOILER WORKS',
  voltage_archives: 'VOLTAGE ARCHIVES',
  soul_labs: 'SOUL LABORATORIES',
  kenet_heart: 'KENET HEART',
};

const ZONE_COLORS: Record<Zone, string> = {
  boiler_works: '#e8913a',
  voltage_archives: '#2aa8d4',
  soul_labs: '#9b52d4',
  kenet_heart: '#c0432e',
};

export class ZoneTransitionScene extends Phaser.Scene {
  constructor() {
    super('ZoneTransition');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const state = runState.get();
    const prevZone = state.zone;

    // Advance zone
    runState.advanceZone();
    const newState = runState.get();
    const newZone = newState.zone;

    SaveManager.saveAll();

    // Zone cleared text
    this.add.text(cx, 140, 'ZONE CLEARED', {
      fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 180, ZONE_NAMES[prevZone], {
      fontFamily: 'monospace', fontSize: '14px',
      color: ZONE_COLORS[prevZone], letterSpacing: 4,
    }).setOrigin(0.5);

    // Arrow
    this.add.text(cx, 240, '▼', {
      fontFamily: 'monospace', fontSize: '28px', color: '#c8b89a',
    }).setOrigin(0.5);

    // New zone
    this.add.text(cx, 290, 'ENTERING', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 330, ZONE_NAMES[newZone], {
      fontFamily: 'monospace', fontSize: '28px',
      color: ZONE_COLORS[newZone], letterSpacing: 6,
    }).setOrigin(0.5);

    // Recruit option if team is not full
    const canRecruit = state.units.filter(u => u.alive).length < MAX_TEAM_SIZE;
    if (canRecruit) {
      this.add.text(cx, 420, 'A damaged automaton joins your squad.', {
        fontFamily: 'monospace', fontSize: '14px', color: '#e8dcc8', letterSpacing: 1,
      }).setOrigin(0.5);

      this.add.text(cx, 450, '[ RECRUIT NEW UNIT ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('Recruit', { zone: newZone }));
    }

    // Continue button
    this.add.text(cx, canRecruit ? 510 : 450, '[ CONTINUE TO MAP ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f0e8d8', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', function(this: Phaser.GameObjects.Text) { this.setColor('#f0a84a'); })
      .on('pointerout', function(this: Phaser.GameObjects.Text) { this.setColor('#f0e8d8'); })
      .on('pointerdown', () => this.scene.start('Map'));
  }
}
