import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';

export class RepairScene extends Phaser.Scene {
  constructor() {
    super('Repair');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 40, 'REPAIR STATION', {
      fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 70, 'Restore HP and reset Heat — costs time', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5);

    const units = runState.get().units.filter(u => u.alive);
    let y = 140;

    for (const unit of units) {
      this.add.text(100, y, unit.name, {
        fontFamily: 'monospace', fontSize: '15px', color: '#e8dcc8',
      });

      // HP
      const hpPct = unit.stats.hp / unit.stats.maxHp;
      this.add.text(300, y, `HP: ${unit.stats.hp}/${unit.stats.maxHp}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a',
      });
      this.add.rectangle(300, y + 16, 120, 3, COLORS.border).setOrigin(0, 0.5);
      this.add.rectangle(300, y + 16, 120 * hpPct, 3, COLORS.safe).setOrigin(0, 0.5);

      // Heat
      const heatPct = unit.stats.thresh > 0 ? unit.stats.heat / unit.stats.thresh : 0;
      this.add.text(500, y, `HEAT: ${unit.stats.heat}/${unit.stats.thresh}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a',
      });
      this.add.rectangle(500, y + 16, 120, 3, COLORS.border).setOrigin(0, 0.5);
      this.add.rectangle(500, y + 16, 120 * heatPct, 3, COLORS.warning).setOrigin(0, 0.5);

      // Repair button
      const btn = this.add.text(700, y + 4, '[ REPAIR ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 1,
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          unit.stats.hp = unit.stats.maxHp;
          unit.stats.heat = 0;
          btn.setText('REPAIRED').setColor('#c8b89a').removeInteractive();
        });

      y += 60;
    }

    // Return
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '[ RETURN TO MAP ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        runState.clearCurrentRoom();
        this.scene.start('Map');
      });
  }
}
