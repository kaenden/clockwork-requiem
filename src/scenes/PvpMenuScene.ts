import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { metaState } from '@/state/MetaStateManager';
import { runState } from '@/state/RunStateManager';
import { PvpManager, type PvpSnapshot } from '@/systems/PvpManager';
import { AudioManager } from '@/systems/AudioManager';
import { addTouchScroll } from '@/utils/Mobile';

export class PvpMenuScene extends Phaser.Scene {
  private scrollY = 0;

  constructor() {
    super('PvpMenu');
  }

  create(): void {
    AudioManager.setMode('menu');
    const cx = GAME_WIDTH / 2;
    const rating = metaState.get().pvpRating;

    this.add.text(cx, 30, 'PROTOCOL WARS — ASYNC PVP', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 56, `YOUR RATING: ${rating}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#d4893a', letterSpacing: 2,
    }).setOrigin(0.5);

    // ── Save current run as PvP config ──
    const hasActiveRun = runState.get().active;
    if (hasActiveRun) {
      this.add.text(cx, 90, '[ SAVE CURRENT CONFIG TO ARCHIVE ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          const units = runState.get().units;
          const name = `CONFIG-${Date.now().toString(36).toUpperCase()}`;
          PvpManager.saveSnapshot(units, name);
          this.scene.restart();
        });
    }

    // ── Opponent List ──
    this.add.text(40, 125, 'AVAILABLE OPPONENTS', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 3,
    });

    const opponents = PvpManager.getOpponents();
    const container = this.add.container(0, 0);
    let y = 155;

    if (opponents.length === 0) {
      container.add(this.add.text(40, y, 'No opponents available. Complete a run first.', {
        fontFamily: 'monospace', fontSize: '13px', color: '#6a5e50',
      }));
    } else {
      for (const opp of opponents) {
        const isGhost = opp.id.startsWith('ghost_');
        const cardH = 70;

        // Card background
        const card = this.add.rectangle(cx, y + cardH / 2, GAME_WIDTH - 80, cardH, COLORS.surface)
          .setStrokeStyle(1, COLORS.border);
        container.add(card);

        // Name
        container.add(this.add.text(60, y + 10, opp.name, {
          fontFamily: 'monospace', fontSize: '14px',
          color: isGhost ? '#c0432e' : '#f0a84a', letterSpacing: 2,
        }));

        // Info line
        const unitSummary = opp.units.map(u => `${u.powerSource[0].toUpperCase()}${u.level}`).join(' ');
        container.add(this.add.text(60, y + 30, `${opp.units.length} units | ${unitSummary} | Rating: ${opp.rating}`, {
          fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 1,
        }));

        if (isGhost) {
          container.add(this.add.text(60, y + 46, 'KENET AI', {
            fontFamily: 'monospace', fontSize: '15px', color: '#c0432e', letterSpacing: 2,
          }));
        }

        // Fight button
        const btn = this.add.text(GAME_WIDTH - 80, y + cardH / 2, '[ FIGHT ]', {
          fontFamily: 'monospace', fontSize: '15px', color: '#f0e8d8', letterSpacing: 2,
        }).setOrigin(1, 0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => btn.setColor('#f0a84a'))
          .on('pointerout', () => btn.setColor('#f0e8d8'))
          .on('pointerdown', () => {
            this.scene.start('PvpBattle', { opponent: opp, heatBet: false });
          });
        container.add(btn);

        // Heat Bet button
        const betBtn = this.add.text(GAME_WIDTH - 200, y + cardH / 2, '[ HEAT BET ]', {
          fontFamily: 'monospace', fontSize: '13px', color: '#c0432e', letterSpacing: 1,
        }).setOrigin(1, 0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => betBtn.setColor('#ff6b4a'))
          .on('pointerout', () => betBtn.setColor('#c0432e'))
          .on('pointerdown', () => {
            this.scene.start('PvpBattle', { opponent: opp, heatBet: true });
          });
        container.add(betBtn);

        y += cardH + 8;
      }
    }

    // Scroll
    const maxScroll = Math.max(0, y - GAME_HEIGHT + 100);
    this.scrollY = 0;
    addTouchScroll(this, container, maxScroll);

    // ── Leaderboard sidebar ──
    this.add.text(GAME_WIDTH - 260, 125, 'LEADERBOARD', {
      fontFamily: 'monospace', fontSize: '13px', color: '#c8b89a', letterSpacing: 3,
    });

    const board = PvpManager.getLeaderboard();
    let ly = 148;
    for (let i = 0; i < Math.min(8, board.length); i++) {
      const entry = board[i];
      this.add.text(GAME_WIDTH - 260, ly, `${i + 1}. ${entry.name}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#e8dcc8',
      });
      this.add.text(GAME_WIDTH - 60, ly, `${entry.rating}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#f0a84a',
      }).setOrigin(1, 0);
      ly += 16;
    }

    // Back
    this.add.text(40, GAME_HEIGHT - 28, '[ BACK TO MENU ]', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c8b89a', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));
  }
}
