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
import { powerColor, FONT } from '@/ui/UIKit';
import { isMobile } from '@/utils/Mobile';
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
    const mob = isMobile();
    const label = this.roomType === 'boss' ? 'BOSS ENCOUNTER' :
                  this.roomType === 'elite' ? 'ELITE COMBAT' : 'COMBAT';
    const labelColor = this.roomType === 'boss' ? COLORS.meltdown : this.roomType === 'elite' ? COLORS.copper3 : COLORS.rust2;

    // Header bar
    this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 50, labelColor, 0.06).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 14, label, {
      fontFamily: 'monospace', fontSize: mob ? '10px' : '12px',
      color: '#' + labelColor.toString(16).padStart(6, '0'), letterSpacing: 4,
    }).setOrigin(0.5);

    // Synergy display
    const synergies = SynergyEngine.evaluate(realAllies);
    if (synergies.length > 0) {
      this.add.text(GAME_WIDTH / 2, 32, synergies.map(s => s.type.replace(/_/g, ' ').toUpperCase()).join(' + '), {
        fontFamily: 'monospace', fontSize: '7px', color: '#4cae6e', letterSpacing: 2,
      }).setOrigin(0.5);
    }

    const warnings = SynergyEngine.checkAntiSynergies(realAllies);
    if (warnings.length > 0) {
      this.add.text(GAME_WIDTH / 2, 42, warnings[0].substring(0, 60), {
        fontFamily: 'monospace', fontSize: '7px', color: '#c0432e', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    // ── ALLY PANEL (left) ──
    const panelW = mob ? GAME_WIDTH / 2 - 10 : 320;
    this.add.rectangle(panelW / 2 + 8, 55, panelW, 2, COLORS.safe, 0.4).setOrigin(0.5, 0);
    this.add.text(14, 58, 'AXIOM SQUAD', {
      fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e', letterSpacing: 3,
    });

    let py = 78;
    for (const unit of realAllies) {
      const pc = powerColor(unit.powerSource);
      const pcStr = '#' + pc.toString(16).padStart(6, '0');

      // Name with power source dot
      this.add.rectangle(14, py + 4, 6, 6, pc);
      const nameText = this.add.text(24, py, `${unit.name} Lv.${unit.level}`, {
        fontFamily: 'monospace', fontSize: mob ? '9px' : '10px',
        color: unit.isAxiom ? '#f0a84a' : '#b8a888',
      });

      // HP bar
      const barW = mob ? 100 : 130;
      this.add.rectangle(24, py + 17, barW, 4, COLORS.border).setOrigin(0, 0.5);
      const hpBar = this.add.rectangle(24, py + 17, barW, 4, COLORS.safe).setOrigin(0, 0.5);

      // Heat bar
      const heatX = 24 + barW + 10;
      const heatW = mob ? 60 : 80;
      this.add.rectangle(heatX, py + 17, heatW, 4, COLORS.border).setOrigin(0, 0.5);
      const heatBar = this.add.rectangle(heatX, py + 17, 0, 4, COLORS.copper).setOrigin(0, 0.5);

      this.allyCards.set(unit.id, { hpBar, heatBar, nameText });
      py += mob ? 36 : 40;
    }

    // ── ENEMY PANEL (right) ──
    const enemyX = GAME_WIDTH - 14;
    this.add.rectangle(GAME_WIDTH - panelW / 2 - 8, 55, panelW, 2, COLORS.rust2, 0.4).setOrigin(0.5, 0);
    this.add.text(enemyX, 58, 'KENET FORCES', {
      fontFamily: 'monospace', fontSize: '8px', color: '#c0432e', letterSpacing: 3,
    }).setOrigin(1, 0);

    let ey = 78;
    for (const enemy of this.enemies) {
      // Red dot
      this.add.rectangle(enemyX - 6, ey + 4, 6, 6, COLORS.rust2);
      const nameText = this.add.text(enemyX - 12, ey, enemy.name, {
        fontFamily: 'monospace', fontSize: mob ? '9px' : '10px', color: '#c0432e',
      }).setOrigin(1, 0);

      const barW = mob ? 120 : 160;
      this.add.rectangle(enemyX, ey + 17, barW, 4, COLORS.border).setOrigin(1, 0.5);
      const hpBar = this.add.rectangle(enemyX, ey + 17, barW, 4, COLORS.rust2).setOrigin(1, 0.5);

      this.enemyCards.set(enemy.id, { hpBar, nameText });
      ey += mob ? 36 : 40;
    }

    // ── Battle Log ──
    const logH = mob ? 160 : 200;
    const logY = GAME_HEIGHT - logH / 2 - 16;
    this.add.rectangle(GAME_WIDTH / 2, logY, GAME_WIDTH - 40, logH, COLORS.surface, 0.9)
      .setStrokeStyle(1, COLORS.border);
    this.add.rectangle(GAME_WIDTH / 2, logY - logH / 2, GAME_WIDTH - 40, 2, COLORS.copper, 0.3).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, logY - logH / 2 + 6, 'BATTLE LOG', {
      fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 3,
    }).setOrigin(0.5);
    this.logText = this.add.text(40, logY - logH / 2 + 20, '', {
      fontFamily: 'monospace', fontSize: mob ? '8px' : '9px', color: '#b8a888',
      lineSpacing: 3, wordWrap: { width: GAME_WIDTH - 80 },
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
    const mob = isMobile();
    const allyBarW = mob ? 100 : 130;
    const allyHeatW = mob ? 60 : 80;
    const enemyBarW = mob ? 120 : 160;

    for (const snap of allySnaps) {
      const card = this.allyCards.get(snap.id);
      if (!card) continue;
      const hpPct = Math.max(0, snap.hp / snap.maxHp);
      card.hpBar.width = allyBarW * hpPct;
      card.hpBar.fillColor = snap.alive ? COLORS.safe : COLORS.rust2;

      const heatPct = snap.thresh > 0 ? snap.heat / snap.thresh : 0;
      card.heatBar.width = allyHeatW * heatPct;
      card.heatBar.fillColor = heatPct > 0.9 ? COLORS.meltdown : heatPct > 0.7 ? COLORS.rust2 : heatPct > 0.4 ? COLORS.warning : COLORS.copper;

      if (!snap.alive) {
        card.nameText.setColor('#4a4236');
      }
    }
    for (const snap of enemySnaps) {
      const card = this.enemyCards.get(snap.id);
      if (!card) continue;
      card.hpBar.width = enemyBarW * Math.max(0, snap.hp / snap.maxHp);
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
