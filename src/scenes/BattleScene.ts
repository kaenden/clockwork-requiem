import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { BattleManager, type BattleResult, type UnitSnapshot } from '@/systems/BattleManager';
import { EnemyFactory } from '@/entities/EnemyFactory';
import { SynergyEngine } from '@/systems/SynergyEngine';
import { checkLevelUp } from '@/systems/StatEngine';
import { metaState } from '@/state/MetaStateManager';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import type { RoomType, UnitConfig } from '@/types';

function deepCloneUnits(units: UnitConfig[]): UnitConfig[] {
  return units.map(u => ({
    ...u,
    stats: { ...u.stats },
    parts: [...u.parts],
    statusEffects: u.statusEffects.map(e => ({ ...e })),
  }));
}

export class BattleScene extends Phaser.Scene {
  private roomType: RoomType = 'battle';
  private result!: BattleResult;
  private enemies: UnitConfig[] = [];
  private turnIndex = 0;
  private logText!: Phaser.GameObjects.Text;
  private allyCards: Map<string, { hpBar: Phaser.GameObjects.Rectangle; heatBar: Phaser.GameObjects.Rectangle; nameText: Phaser.GameObjects.Text }> = new Map();
  private enemyCards: Map<string, { hpBar: Phaser.GameObjects.Rectangle; nameText: Phaser.GameObjects.Text }> = new Map();

  constructor() {
    super('Battle');
  }

  init(data: { roomType: RoomType }): void {
    this.roomType = data.roomType ?? 'battle';
    this.turnIndex = 0;
    this.allyCards.clear();
    this.enemyCards.clear();
  }

  create(): void {
    AudioManager.setMode(this.roomType === 'boss' ? 'boss' : 'battle');
    fadeIn(this);
    const state = runState.get();
    const realAllies = state.units.filter(u => u.alive);

    // Generate enemies
    this.enemies = EnemyFactory.generateEnemies(state.zone, state.zoneIndex, this.roomType);

    // Deep clone for simulation — real units stay untouched until result
    const simAllies = deepCloneUnits(realAllies);
    const simEnemies = deepCloneUnits(this.enemies);
    this.result = BattleManager.simulate(simAllies, simEnemies, this.roomType);

    // ── UI Layout ──
    const label = this.roomType === 'boss' ? 'BOSS ENCOUNTER' :
                  this.roomType === 'elite' ? 'ELITE COMBAT' : 'COMBAT';

    this.add.text(GAME_WIDTH / 2, 16, `// ${label} //`, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c0432e', letterSpacing: 3,
    }).setOrigin(0.5);

    // Synergy display
    const synergies = SynergyEngine.evaluate(realAllies);
    if (synergies.length > 0) {
      this.add.text(GAME_WIDTH / 2, 36, synergies.map(s => s.description).join(' | '), {
        fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    const warnings = SynergyEngine.checkAntiSynergies(realAllies);
    if (warnings.length > 0) {
      this.add.text(GAME_WIDTH / 2, 48, warnings[0], {
        fontFamily: 'monospace', fontSize: '8px', color: '#c0432e', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    // ── ALLY SIDE ──
    this.add.text(40, 65, 'AXIOM SQUAD', {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    });

    let py = 90;
    for (const unit of realAllies) {
      const color = unit.isAxiom ? '#f0a84a' : '#b8a888';
      const nameText = this.add.text(40, py, `${unit.name} Lv.${unit.level}`, {
        fontFamily: 'monospace', fontSize: '11px', color,
      });

      this.add.text(40, py + 16, 'HP', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a' });
      this.add.rectangle(60, py + 19, 120, 4, COLORS.border).setOrigin(0, 0.5);
      const hpBar = this.add.rectangle(60, py + 19, 120, 4, COLORS.safe).setOrigin(0, 0.5);

      this.add.text(200, py + 16, 'HEAT', { fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a' });
      this.add.rectangle(230, py + 19, 80, 4, COLORS.border).setOrigin(0, 0.5);
      const heatBar = this.add.rectangle(230, py + 19, 0, 4, COLORS.copper).setOrigin(0, 0.5);

      this.allyCards.set(unit.id, { hpBar, heatBar, nameText });
      py += 44;
    }

    // ── ENEMY SIDE ──
    this.add.text(GAME_WIDTH - 40, 65, 'KENET FORCES', {
      fontFamily: 'monospace', fontSize: '9px', color: '#c0432e', letterSpacing: 2,
    }).setOrigin(1, 0);

    let ey = 90;
    for (const enemy of this.enemies) {
      const nameText = this.add.text(GAME_WIDTH - 40, ey, enemy.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#c0432e',
      }).setOrigin(1, 0);

      this.add.rectangle(GAME_WIDTH - 40, ey + 19, 160, 4, COLORS.border).setOrigin(1, 0.5);
      const hpBar = this.add.rectangle(GAME_WIDTH - 40, ey + 19, 160, 4, COLORS.rust2).setOrigin(1, 0.5);

      this.enemyCards.set(enemy.id, { hpBar, nameText });
      ey += 44;
    }

    // ── Battle Log ──
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 130, GAME_WIDTH - 80, 200, COLORS.surface, 0.8)
      .setStrokeStyle(1, COLORS.border);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 225, '// BATTLE LOG //', {
      fontFamily: 'monospace', fontSize: '8px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5);
    this.logText = this.add.text(60, GAME_HEIGHT - 210, '', {
      fontFamily: 'monospace', fontSize: '9px', color: '#b8a888',
      lineSpacing: 3, wordWrap: { width: GAME_WIDTH - 120 },
    });

    this.playTurns();
  }

  private playTurns(): void {
    if (this.turnIndex >= this.result.turns.length) {
      this.applyFinalState();
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

    const currentLog = this.logText.text;
    const allLines = currentLog ? currentLog.split('\n').concat(lines) : lines;
    this.logText.setText(allLines.slice(-12).join('\n'));

    // Update bars from per-turn snapshots
    this.updateBarsFromSnapshots(turn.allySnapshots, turn.enemySnapshots);

    this.turnIndex++;
    const delay = Math.max(300, 800 - this.turnIndex * 30);
    this.time.delayedCall(delay, () => this.playTurns());
  }

  private updateBarsFromSnapshots(allySnaps: UnitSnapshot[], enemySnaps: UnitSnapshot[]): void {
    for (const snap of allySnaps) {
      const card = this.allyCards.get(snap.id);
      if (!card) continue;
      const hpPct = Math.max(0, snap.hp / snap.maxHp);
      card.hpBar.width = 120 * hpPct;
      card.hpBar.fillColor = snap.alive ? COLORS.safe : COLORS.rust2;

      const heatPct = snap.thresh > 0 ? snap.heat / snap.thresh : 0;
      card.heatBar.width = 80 * heatPct;
      card.heatBar.fillColor = heatPct > 0.9 ? COLORS.meltdown : heatPct > 0.7 ? COLORS.rust2 : heatPct > 0.4 ? COLORS.warning : COLORS.copper;

      if (!snap.alive) {
        card.nameText.setColor('#4a4236');
      }
    }
    for (const snap of enemySnaps) {
      const card = this.enemyCards.get(snap.id);
      if (!card) continue;
      card.hpBar.width = 160 * Math.max(0, snap.hp / snap.maxHp);
      if (!snap.alive) card.nameText.setColor('#4a4236');
    }
  }

  // Apply simulation results to actual runState units
  private applyFinalState(): void {
    const lastTurn = this.result.turns[this.result.turns.length - 1];
    if (!lastTurn) return;

    for (const snap of lastTurn.allySnapshots) {
      const unit = runState.getUnit(snap.id);
      if (unit) {
        unit.stats.hp = snap.hp;
        unit.stats.heat = snap.heat;
        unit.alive = snap.alive;
      }
    }
  }

  private showResult(): void {
    const won = this.result.won;
    AudioManager.setMode('none');
    if (won) AudioManager.playVictory(); else AudioManager.playDefeat();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, won ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'monospace', fontSize: '24px',
      color: won ? '#4cae6e' : '#c0432e', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(100);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20,
      `${this.result.totalTurns} turns — ${this.result.xpEarned} XP earned`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(100);

    // Distribute XP and check level ups
    if (won) {
      const aliveUnits = runState.get().units.filter(u => u.alive);
      const xpPer = Math.floor(this.result.xpEarned / aliveUnits.length);
      const levelUps: string[] = [];

      for (const unit of aliveUnits) {
        unit.xp += xpPer;
        let result = checkLevelUp(unit);
        while (result.leveledUp) {
          levelUps.push(`${unit.name} -> Lv.${unit.level}`);
          if (result.splitAvailable) {
            levelUps.push(`  SPLIT AVAILABLE: ${result.splitAvailable.toUpperCase()}`);
          }
          result = checkLevelUp(unit);
        }
      }

      runState.addConsciousness(Math.floor(this.result.xpEarned / 10));

      // Record explosions
      for (const turn of this.result.turns) {
        for (const evt of turn.overloadEvents) {
          if (evt.includes('OVERLOADED')) {
            metaState.recordExplosion({
              runId: `run_${metaState.get().totalRuns}`,
              unitName: evt.split(' OVERLOADED')[0],
              partThatCaused: 'heat_accumulation',
              zone: runState.get().zone,
              floor: runState.get().floor,
              timestamp: Date.now(),
            });
          }
        }
      }

      if (levelUps.length > 0) {
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, levelUps.join('\n'), {
          fontFamily: 'monospace', fontSize: '9px', color: '#f0a84a',
          align: 'center', lineSpacing: 3,
        }).setOrigin(0.5).setDepth(100);
      }

      SaveManager.saveAll();
    } else {
      metaState.completeRun(false);
      SaveManager.saveMeta();
    }

    // FIX #5+6: Split priority — body before weapon; salvage first, then split
    const splitPending = runState.get().units.find(u =>
      u.alive && ((u.level >= 10 && !u.bodyType) || (u.level >= 20 && u.bodyType && !u.weaponModule))
    );

    this.time.delayedCall(2000, () => {
      if (!won) {
        runState.end(false);
        this.scene.start('GameOver', { won: false });
        return;
      }

      runState.clearCurrentRoom();

      // Boss defeated → zone transition (salvage first for boss loot)
      if (this.roomType === 'boss') {
        const state = runState.get();
        if (state.zoneIndex >= 3) {
          runState.end(true);
          this.scene.start('GameOver', { won: true });
        } else {
          // Boss salvage → zone transition
          this.scene.start('Salvage', {
            roomType: this.roomType,
            zone: runState.get().zone,
            nextScene: 'ZoneTransition',
          });
        }
        return;
      }

      // Normal flow: always go to salvage first
      this.scene.start('Salvage', {
        roomType: this.roomType,
        zone: runState.get().zone,
        splitPending: splitPending ? {
          unitId: splitPending.id,
          // Body split has priority over weapon split
          splitType: (splitPending.level >= 10 && !splitPending.bodyType) ? 'body' : 'weapon',
        } : null,
      });
    });
  }
}
