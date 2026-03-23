import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { metaState } from '@/state/MetaStateManager';
import { BattleManager, type BattleResult } from '@/systems/BattleManager';
import { PvpManager, type PvpSnapshot } from '@/systems/PvpManager';
import { AudioManager } from '@/systems/AudioManager';
import { SaveManager } from '@/utils/SaveManager';
import { fadeIn } from '@/ui/SceneTransition';
import type { UnitConfig } from '@/types';

export class PvpBattleScene extends Phaser.Scene {
  private opponent!: PvpSnapshot;
  private heatBet = false;
  private result!: BattleResult;
  private turnIndex = 0;
  private logText!: Phaser.GameObjects.Text;

  constructor() {
    super('PvpBattle');
  }

  init(data: { opponent: PvpSnapshot; heatBet: boolean }): void {
    this.opponent = data.opponent;
    this.heatBet = data.heatBet;
    this.turnIndex = 0;
  }

  create(): void {
    AudioManager.setMode('boss');
    fadeIn(this);

    const cx = GAME_WIDTH / 2;

    // Get player units — use active run or fall back to last snapshot
    let playerUnits: UnitConfig[];
    if (runState.get().active) {
      playerUnits = runState.get().units.filter(u => u.alive).map(u => ({
        ...u,
        stats: { ...u.stats },
        statusEffects: [],
      }));
    } else {
      // Use player's latest snapshot
      const snaps = PvpManager.getSnapshots();
      if (snaps.length > 0) {
        playerUnits = PvpManager.snapshotToUnits(snaps[snaps.length - 1]);
      } else {
        this.add.text(cx, GAME_HEIGHT / 2, 'No team available. Start a run first.', {
          fontFamily: 'monospace', fontSize: '11px', color: '#c0432e',
        }).setOrigin(0.5);
        this.time.delayedCall(2000, () => this.scene.start('PvpMenu'));
        return;
      }
    }

    const enemyUnits = PvpManager.snapshotToUnits(this.opponent);

    // Apply heat bet
    if (this.heatBet) {
      PvpManager.applyHeatBet(playerUnits);
    }

    // Header
    this.add.text(cx, 16, '// PROTOCOL WAR //', {
      fontFamily: 'monospace', fontSize: '10px', color: '#f0a84a', letterSpacing: 3,
    }).setOrigin(0.5);

    if (this.heatBet) {
      this.add.text(cx, 34, 'HEAT BET ACTIVE — Starting at 80% HEAT', {
        fontFamily: 'monospace', fontSize: '8px', color: '#c0432e', letterSpacing: 2,
      }).setOrigin(0.5);
    }

    // Player side
    this.add.text(40, 55, 'YOUR SQUAD', {
      fontFamily: 'monospace', fontSize: '9px', color: '#4cae6e', letterSpacing: 2,
    });
    let py = 75;
    for (const u of playerUnits) {
      this.add.text(40, py, `${u.name} Lv.${u.level} [${u.powerSource.toUpperCase()}]`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
      });
      py += 18;
    }

    // Enemy side
    this.add.text(GAME_WIDTH - 40, 55, `VS ${this.opponent.name}`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#c0432e', letterSpacing: 2,
    }).setOrigin(1, 0);
    let ey = 75;
    for (const u of enemyUnits) {
      this.add.text(GAME_WIDTH - 40, ey, `${u.name} Lv.${u.level} [${u.powerSource.toUpperCase()}]`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#c0432e',
      }).setOrigin(1, 0);
      ey += 18;
    }

    // Run simulation
    this.result = BattleManager.simulate(playerUnits, enemyUnits, 'battle');

    // Battle log
    this.add.rectangle(cx, GAME_HEIGHT - 150, GAME_WIDTH - 60, 240, COLORS.surface, 0.85)
      .setStrokeStyle(1, COLORS.border);

    this.logText = this.add.text(50, GAME_HEIGHT - 265, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
      lineSpacing: 3, wordWrap: { width: GAME_WIDTH - 100 },
    });

    this.playTurns();
  }

  private playTurns(): void {
    if (this.turnIndex >= this.result.turns.length) {
      this.showResult();
      return;
    }

    const turn = this.result.turns[this.turnIndex];
    const lines: string[] = [`--- TURN ${turn.turnNumber} ---`];

    for (const log of turn.statusLogs) lines.push(`  [STATUS] ${log}`);
    for (const act of turn.actions) {
      const sp = act.special ? ` [${act.special}]` : '';
      lines.push(`  ${act.actorName} -> ${act.targetName}: ${act.damage} DMG${sp}`);
    }
    for (const evt of turn.overloadEvents) lines.push(`  [OVERLOAD] ${evt}`);

    const current = this.logText.text;
    const all = current ? current.split('\n').concat(lines) : lines;
    this.logText.setText(all.slice(-14).join('\n'));

    this.turnIndex++;
    const delay = Math.max(250, 700 - this.turnIndex * 25);
    this.time.delayedCall(delay, () => this.playTurns());
  }

  private showResult(): void {
    const won = this.result.won;
    const cx = GAME_WIDTH / 2;

    AudioManager.setMode('none');
    if (won) AudioManager.playVictory(); else AudioManager.playDefeat();

    // Rating change
    const delta = PvpManager.updateRating(won, this.opponent.rating);
    const newRating = metaState.get().pvpRating;

    // Record to leaderboard
    PvpManager.recordToLeaderboard('AXIOM-0', newRating, won);
    SaveManager.saveMeta();

    // Bonus for heat bet
    let betBonus = '';
    if (this.heatBet) {
      const extra = won ? Math.round(Math.abs(delta) * 0.5) : Math.round(Math.abs(delta) * 0.3);
      if (won) {
        metaState.updatePvpRating(extra);
        betBonus = ` (+${extra} HEAT BET BONUS)`;
      } else {
        metaState.updatePvpRating(-extra);
        betBonus = ` (-${extra} HEAT BET PENALTY)`;
      }
      SaveManager.saveMeta();
    }

    this.add.text(cx, GAME_HEIGHT / 2 - 80, won ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'monospace', fontSize: '24px',
      color: won ? '#4cae6e' : '#c0432e', letterSpacing: 6,
    }).setOrigin(0.5);

    const sign = delta >= 0 ? '+' : '';
    this.add.text(cx, GAME_HEIGHT / 2 - 50,
      `Rating: ${sign}${delta}${betBonus} → ${metaState.get().pvpRating}`, {
      fontFamily: 'monospace', fontSize: '10px',
      color: delta >= 0 ? '#4cae6e' : '#c0432e', letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.text(cx, GAME_HEIGHT / 2 - 30,
      `${this.result.totalTurns} turns`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a',
    }).setOrigin(0.5);

    this.time.delayedCall(2500, () => {
      this.add.text(cx, GAME_HEIGHT / 2 + 10, '[ RETURN TO PVP MENU ]', {
        fontFamily: 'monospace', fontSize: '11px', color: '#e0d4bc', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.scene.start('PvpMenu'));
    });
  }
}
