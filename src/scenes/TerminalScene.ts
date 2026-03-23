import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';

export class TerminalScene extends Phaser.Scene {
  constructor() {
    super('Terminal');
  }

  create(): void {
    this.add.text(GAME_WIDTH / 2, 40, 'DATA TERMINAL', {
      fontFamily: 'monospace', fontSize: '14px', color: '#2aa8d4', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 70, 'Decrypted protocol fragment — choose wisely', {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5);

    // Lore text
    this.add.text(GAME_WIDTH / 2, 160, '"The machines never stopped working.\nThey simply forgot why they started."', {
      fontFamily: 'serif', fontSize: '14px', color: '#b8a888',
      fontStyle: 'italic', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    // Choice: Buff or Risk
    const choice1 = this.add.text(GAME_WIDTH / 2 - 160, 300, '[ SAFE PROTOCOL ]\n+5 THRESH to all units', {
      fontFamily: 'monospace', fontSize: '10px', color: '#4cae6e',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        for (const u of runState.get().units) u.stats.thresh += 5;
        this.exitTerminal();
      });

    const choice2 = this.add.text(GAME_WIDTH / 2 + 160, 300, '[ RISKY DECRYPT ]\n+15 ATK to AXIOM, +10 HEAT', {
      fontFamily: 'monospace', fontSize: '10px', color: '#c0432e',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const axiom = runState.get().units.find(u => u.isAxiom);
        if (axiom) {
          axiom.stats.atk += 15;
          axiom.stats.heat += 10;
        }
        this.exitTerminal();
      });
  }

  private exitTerminal(): void {
    runState.clearCurrentRoom();
    this.scene.start('Map');
  }
}
