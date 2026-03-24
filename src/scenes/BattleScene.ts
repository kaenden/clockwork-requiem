import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { BattleManager, type BattleResult, type BattleAction, type UnitSnapshot } from '@/systems/BattleManager';
import { EnemyFactory } from '@/entities/EnemyFactory';
import { SynergyEngine } from '@/systems/SynergyEngine';
import { checkLevelUp } from '@/systems/StatEngine';
import { metaState } from '@/state/MetaStateManager';
import { SaveManager } from '@/utils/SaveManager';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';
import { RobotRenderer } from '@/ui/RobotRenderer';
import { powerColor } from '@/ui/UIKit';
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

interface ArenaUnit {
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  hpTrack: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
  id: string;
}

export class BattleScene extends Phaser.Scene {
  private roomType: RoomType = 'battle';
  private result!: BattleResult;
  private enemies: UnitConfig[] = [];
  private realAllies: UnitConfig[] = [];
  private turnIndex = 0;
  private logText!: Phaser.GameObjects.Text;
  private arenaUnits: Map<string, ArenaUnit> = new Map();

  constructor() {
    super('Battle');
  }

  init(data: { roomType: RoomType }): void {
    this.roomType = data.roomType ?? 'battle';
    this.turnIndex = 0;
    this.arenaUnits.clear();
  }

  create(): void {
    AudioManager.setMode(this.roomType === 'boss' ? 'boss' : 'battle');
    fadeIn(this);
    const state = runState.get();
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    this.realAllies = state.units.filter(u => u.alive);

    // Generate enemies (with ascension scaling)
    this.enemies = EnemyFactory.generateEnemies(state.zone, state.zoneIndex, this.roomType, state.ascension);

    // Simulate
    const simAllies = deepCloneUnits(this.realAllies);
    const simEnemies = deepCloneUnits(this.enemies);
    this.result = BattleManager.simulate(simAllies, simEnemies, this.roomType);

    // ── Header ──
    const label = this.roomType === 'boss' ? 'BOSS ENCOUNTER' :
                  this.roomType === 'elite' ? 'ELITE COMBAT' : 'COMBAT';
    const labelColor = this.roomType === 'boss' ? COLORS.meltdown : this.roomType === 'elite' ? COLORS.copper3 : COLORS.rust2;

    this.add.rectangle(cx, 0, GAME_WIDTH, 28, labelColor, 0.08).setOrigin(0.5, 0);
    this.add.text(cx, 8, label, {
      fontFamily: 'monospace', fontSize: '11px',
      color: '#' + labelColor.toString(16).padStart(6, '0'), letterSpacing: 4,
    }).setOrigin(0.5);

    // Synergies (compact)
    const synergies = SynergyEngine.evaluate(this.realAllies);
    if (synergies.length > 0) {
      this.add.text(cx, 22, synergies.map(s => s.type.replace(/_/g, ' ')).join(' + '), {
        fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e', letterSpacing: 1,
      }).setOrigin(0.5);
    }

    // ── ARENA (center area) ──
    const arenaTop = 34;
    const arenaBot = mob ? GAME_HEIGHT - 180 : GAME_HEIGHT - 220;
    const arenaH = arenaBot - arenaTop;

    // Arena background (subtle grid)
    this.add.rectangle(cx, arenaTop + arenaH / 2, GAME_WIDTH, arenaH, 0x0f0e0d, 0.5);
    // Grid lines
    const gfx = this.add.graphics();
    gfx.lineStyle(1, COLORS.border, 0.1);
    for (let gy = arenaTop; gy < arenaBot; gy += 40) {
      gfx.lineBetween(0, gy, GAME_WIDTH, gy);
    }
    // Center divider
    gfx.lineStyle(1, COLORS.border, 0.25);
    gfx.lineBetween(cx, arenaTop, cx, arenaBot);
    // VS text
    this.add.text(cx, arenaTop + arenaH / 2, 'VS', {
      fontFamily: 'monospace', fontSize: '20px', color: '#2a2620', letterSpacing: 4,
    }).setOrigin(0.5);

    // ── Place ally sprites (left side) ──
    const allyCount = this.realAllies.length;
    const allySpacing = Math.min(80, (arenaH - 40) / allyCount);
    const allyStartY = arenaTop + arenaH / 2 - (allyCount - 1) * allySpacing / 2;
    const spriteSize = mob ? 40 : 48;

    this.realAllies.forEach((unit, i) => {
      const ux = mob ? cx / 2 - 20 : cx / 2;
      const uy = allyStartY + i * allySpacing;

      // Generate robot texture
      const texKey = RobotRenderer.render(this, unit, spriteSize);
      const sprite = this.add.image(ux, uy, texKey).setScale(mob ? 0.9 : 1);

      // Name label under sprite
      const nameLabel = this.add.text(ux, uy + spriteSize / 2 + 4, unit.name, {
        fontFamily: 'monospace', fontSize: '8px',
        color: unit.isAxiom ? '#f5c563' : '#c8b89a',
      }).setOrigin(0.5);

      // HP bar under name
      const barW = spriteSize + 10;
      const hpTrack = this.add.rectangle(ux, uy + spriteSize / 2 + 16, barW, 4, COLORS.border);
      const hpBar = this.add.rectangle(ux - barW / 2, uy + spriteSize / 2 + 16, barW, 4, COLORS.safe).setOrigin(0, 0.5);

      this.arenaUnits.set(unit.id, { sprite, hpBar, hpTrack, label: nameLabel, baseX: ux, baseY: uy, id: unit.id });
    });

    // ── Place enemy sprites (right side) ──
    const enemyCount = this.enemies.length;
    const enemySpacing = Math.min(80, (arenaH - 40) / enemyCount);
    const enemyStartY = arenaTop + arenaH / 2 - (enemyCount - 1) * enemySpacing / 2;

    this.enemies.forEach((enemy, i) => {
      const ex = mob ? cx + cx / 2 + 20 : cx + cx / 2;
      const ey = enemyStartY + i * enemySpacing;

      const texKey = RobotRenderer.renderEnemy(this, enemy, spriteSize);
      const sprite = this.add.image(ex, ey, texKey).setScale(mob ? 0.9 : 1).setFlipX(true);

      const nameLabel = this.add.text(ex, ey + spriteSize / 2 + 4, enemy.name.substring(0, 16), {
        fontFamily: 'monospace', fontSize: '8px', color: '#c0432e',
      }).setOrigin(0.5);

      const barW = spriteSize + 10;
      const hpTrack = this.add.rectangle(ex, ey + spriteSize / 2 + 16, barW, 4, COLORS.border);
      const hpBar = this.add.rectangle(ex - barW / 2, ey + spriteSize / 2 + 16, barW, 4, COLORS.rust2).setOrigin(0, 0.5);

      this.arenaUnits.set(enemy.id, { sprite, hpBar, hpTrack, label: nameLabel, baseX: ex, baseY: ey, id: enemy.id });
    });

    // ── Battle Log (bottom) ──
    const logH = mob ? 155 : 195;
    const logY = GAME_HEIGHT - logH / 2 - 10;
    this.add.rectangle(cx, logY, GAME_WIDTH - 20, logH, COLORS.surface, 0.92)
      .setStrokeStyle(1, COLORS.border);
    this.add.rectangle(cx, logY - logH / 2, GAME_WIDTH - 20, 2, COLORS.copper, 0.3).setOrigin(0.5, 0);
    this.add.text(cx, logY - logH / 2 + 6, 'BATTLE LOG', {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878', letterSpacing: 3,
    }).setOrigin(0.5);
    this.logText = this.add.text(30, logY - logH / 2 + 20, '', {
      fontFamily: 'monospace', fontSize: mob ? '8px' : '9px', color: '#e8dcc8',
      lineSpacing: 3, wordWrap: { width: GAME_WIDTH - 60 },
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
    for (const log of turn.statusLogs) lines.push(`  ${log}`);
    for (const act of turn.actions) {
      const sp = act.special ? ` [${act.special}]` : '';
      lines.push(`  ${act.actorName} -> ${act.targetName}: ${act.damage} DMG${sp}`);
    }
    for (const evt of turn.overloadEvents) lines.push(`  [!] ${evt}`);

    const currentLog = this.logText.text;
    const allLines = currentLog ? currentLog.split('\n').concat(lines) : lines;
    this.logText.setText(allLines.slice(-12).join('\n'));

    // ── Animate actions ──
    this.animateTurnActions(turn.actions, () => {
      // Update HP bars from snapshots
      this.updateArenaFromSnapshots(turn.allySnapshots, turn.enemySnapshots);

      this.turnIndex++;
      const delay = Math.max(200, 500 - this.turnIndex * 20);
      this.time.delayedCall(delay, () => this.playTurns());
    });
  }

  private animateTurnActions(actions: BattleAction[], onComplete: () => void): void {
    if (actions.length === 0) { onComplete(); return; }

    let idx = 0;
    const next = () => {
      if (idx >= actions.length) { onComplete(); return; }
      const act = actions[idx++];
      this.animateAttack(act, () => {
        this.time.delayedCall(80, next);
      });
    };
    next();
  }

  private animateAttack(act: BattleAction, onDone: () => void): void {
    const attacker = this.arenaUnits.get(act.actorId);
    const target = this.arenaUnits.get(act.targetId);
    if (!attacker || !target) { onDone(); return; }

    const isAlly = this.realAllies.some(u => u.id === act.actorId);

    // Lunge toward target
    const lungeX = isAlly ? attacker.baseX + 30 : attacker.baseX - 30;
    this.tweens.add({
      targets: attacker.sprite,
      x: lungeX,
      duration: 100,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        // Flash target red
        target.sprite.setTint(0xff4444);
        this.time.delayedCall(120, () => target.sprite.clearTint());

        // Damage number
        const dmgColor = act.special ? '#2aa8d4' : '#ff6b4a';
        const dmgText = this.add.text(target.baseX, target.baseY - 30, `-${act.damage}`, {
          fontFamily: 'monospace', fontSize: '14px', color: dmgColor,
          fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(50);

        this.tweens.add({
          targets: dmgText,
          y: dmgText.y - 25,
          alpha: 0,
          duration: 600,
          onComplete: () => dmgText.destroy(),
        });

        // Attack SFX based on power source
        const attackerUnit = [...this.realAllies, ...this.enemies].find(u => u.id === act.actorId);
        if (attackerUnit) {
          switch (attackerUnit.powerSource) {
            case 'steam': AudioManager.playSteamAttack(); break;
            case 'electric': AudioManager.playElectricAttack(); break;
            case 'soul': AudioManager.playSoulAttack(); break;
          }
        }
      },
      onComplete: () => onDone(),
    });
  }

  private updateArenaFromSnapshots(allySnaps: UnitSnapshot[], enemySnaps: UnitSnapshot[]): void {
    const mob = isMobile();
    const barW = (mob ? 40 : 48) + 10;

    for (const snap of [...allySnaps, ...enemySnaps]) {
      const au = this.arenaUnits.get(snap.id);
      if (!au) continue;

      const hpPct = Math.max(0, snap.hp / snap.maxHp);
      au.hpBar.width = barW * hpPct;
      au.hpBar.fillColor = snap.alive ? (hpPct > 0.5 ? COLORS.safe : hpPct > 0.25 ? COLORS.warning : COLORS.critical) : COLORS.rust2;

      if (!snap.alive && au.sprite.alpha > 0.3) {
        // Death animation
        au.sprite.setTint(0xff2020);
        AudioManager.playExplosion();

        // Explosion particles (simple rectangles)
        for (let i = 0; i < 8; i++) {
          const px = au.baseX + (Math.random() - 0.5) * 30;
          const py = au.baseY + (Math.random() - 0.5) * 30;
          const particle = this.add.rectangle(px, py, 4 + Math.random() * 4, 4 + Math.random() * 4,
            Math.random() > 0.5 ? COLORS.meltdown : COLORS.rust2);
          this.tweens.add({
            targets: particle,
            x: px + (Math.random() - 0.5) * 80,
            y: py + (Math.random() - 0.5) * 80,
            alpha: 0,
            angle: Math.random() * 360,
            duration: 400 + Math.random() * 300,
            onComplete: () => particle.destroy(),
          });
        }

        this.tweens.add({
          targets: au.sprite,
          alpha: 0.15,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 400,
        });
        au.label.setColor('#6a5e50');
      }
    }
  }

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
    const cx = GAME_WIDTH / 2;
    AudioManager.setMode('none');
    if (won) AudioManager.playVictory(); else AudioManager.playDefeat();

    // Overlay
    this.add.rectangle(cx, GAME_HEIGHT / 2 - 60, 360, 80, COLORS.surface, 0.95)
      .setStrokeStyle(2, won ? COLORS.safe : COLORS.critical).setDepth(100);

    this.add.text(cx, GAME_HEIGHT / 2 - 80, won ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'monospace', fontSize: '24px',
      color: won ? '#4cae6e' : '#c0432e', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(101);

    this.add.text(cx, GAME_HEIGHT / 2 - 52,
      `${this.result.totalTurns} turns — ${this.result.xpEarned} XP`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c8b89a', letterSpacing: 2,
    }).setOrigin(0.5).setDepth(101);

    // XP + level-ups
    if (won) {
      const aliveUnits = runState.get().units.filter(u => u.alive);
      const xpPer = Math.floor(this.result.xpEarned / aliveUnits.length);
      const levelUps: string[] = [];
      for (const unit of aliveUnits) {
        unit.xp += xpPer;
        let result = checkLevelUp(unit);
        while (result.leveledUp) {
          levelUps.push(`${unit.name} -> Lv.${unit.level}`);
          if (result.splitAvailable) levelUps.push(`  SPLIT: ${result.splitAvailable.toUpperCase()}`);
          result = checkLevelUp(unit);
        }
      }
      runState.addConsciousness(Math.floor(this.result.xpEarned / 10));

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
        this.add.text(cx, GAME_HEIGHT / 2 - 30, levelUps.join(' | '), {
          fontFamily: 'monospace', fontSize: '10px', color: '#f5c563',
        }).setOrigin(0.5).setDepth(101);
      }
      SaveManager.saveAll();
    } else {
      metaState.completeRun(false);
      SaveManager.saveMeta();
    }

    // Next scene routing
    const splitPending = runState.get().units.find(u =>
      u.alive && ((u.level >= 10 && !u.bodyType) || (u.level >= 20 && u.bodyType && !u.weaponModule))
    );

    this.time.delayedCall(2200, () => {
      if (!won) {
        runState.end(false);
        this.scene.start('GameOver', { won: false });
        return;
      }
      runState.clearCurrentRoom();

      if (this.roomType === 'boss') {
        if (runState.get().zoneIndex >= 3) {
          runState.end(true);
          this.scene.start('GameOver', { won: true });
        } else {
          this.scene.start('Salvage', { roomType: this.roomType, zone: runState.get().zone, nextScene: 'ZoneTransition' });
        }
        return;
      }

      this.scene.start('Salvage', {
        roomType: this.roomType,
        zone: runState.get().zone,
        splitPending: splitPending ? {
          unitId: splitPending.id,
          splitType: (splitPending.level >= 10 && !splitPending.bodyType) ? 'body' : 'weapon',
        } : null,
      });
    });
  }
}
