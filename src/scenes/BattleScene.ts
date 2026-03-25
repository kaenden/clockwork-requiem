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
import { powerColor, FONT } from '@/ui/UIKit';
import { Tooltip } from '@/ui/Tooltip';
import { BODY_BONUSES } from '@/data/classTree';
import { WEAPON_BONUSES } from '@/data/classTree';
import { getComboAbility } from '@/data/comboAbilities';
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
  heatBar?: Phaser.GameObjects.Rectangle;
  heatTrack?: Phaser.GameObjects.Rectangle;
  buffContainer?: Phaser.GameObjects.Container;
  label: Phaser.GameObjects.Text;
  baseX: number;
  baseY: number;
  id: string;
}

// Battle stats tracker for post-battle summary
interface BattleStats {
  totalDamageDealt: number;
  totalDamageTaken: number;
  totalHealing: number;
  kills: number;
  abilitiesUsed: number;
  overloads: number;
}

export class BattleScene extends Phaser.Scene {
  private roomType: RoomType = 'battle';
  private result!: BattleResult;
  private enemies: UnitConfig[] = [];
  private realAllies: UnitConfig[] = [];
  private turnIndex = 0;
  private logText!: Phaser.GameObjects.Text;
  private arenaUnits: Map<string, ArenaUnit> = new Map();
  private battleStats: Map<string, BattleStats> = new Map();
  private tooltip!: Tooltip;
  private inspectPopup: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Battle');
  }

  init(data: { roomType: RoomType }): void {
    this.roomType = data.roomType ?? 'battle';
    this.turnIndex = 0;
    this.arenaUnits.clear();
    this.battleStats.clear();
    this.inspectPopup = null;
  }

  create(): void {
    AudioManager.setMode(this.roomType === 'boss' ? 'boss' : 'battle');
    fadeIn(this);
    this.tooltip = new Tooltip(this);
    const state = runState.get();
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    this.realAllies = state.units.filter(u => u.alive);

    // Init battle stats tracking
    for (const u of [...state.units.filter(u => u.alive), ...this.enemies]) {
      this.battleStats.set(u.id, { totalDamageDealt: 0, totalDamageTaken: 0, totalHealing: 0, kills: 0, abilitiesUsed: 0, overloads: 0 });
    }

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
      const barY = uy + spriteSize / 2 + 16;
      const hpTrack = this.add.rectangle(ux, barY, barW, 4, COLORS.border);
      const hpBar = this.add.rectangle(ux - barW / 2, barY, barW, 4, COLORS.safe).setOrigin(0, 0.5);

      // Heat bar (thin orange bar below HP)
      const heatTrack = this.add.rectangle(ux, barY + 6, barW, 2, COLORS.border, 0.4);
      const heatPct = unit.stats.thresh > 0 ? unit.stats.heat / unit.stats.thresh : 0;
      const heatBar = this.add.rectangle(ux - barW / 2, barY + 6, barW * heatPct, 2,
        heatPct > 0.7 ? COLORS.meltdown : COLORS.warning
      ).setOrigin(0, 0.5);

      // Buff/debuff container (icons below bars)
      const buffContainer = this.add.container(ux - barW / 2, barY + 12);

      // Tap-to-inspect: click sprite to show unit detail
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showInspectPopup(unit, ux, uy));

      this.arenaUnits.set(unit.id, { sprite, hpBar, hpTrack, heatBar, heatTrack, buffContainer, label: nameLabel, baseX: ux, baseY: uy, id: unit.id });
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
      const eBarY = ey + spriteSize / 2 + 16;
      const hpTrack = this.add.rectangle(ex, eBarY, barW, 4, COLORS.border);
      const hpBar = this.add.rectangle(ex - barW / 2, eBarY, barW, 4, COLORS.rust2).setOrigin(0, 0.5);

      // Heat bar for enemies
      const heatTrack = this.add.rectangle(ex, eBarY + 6, barW, 2, COLORS.border, 0.4);
      const heatPct = enemy.stats.thresh > 0 ? enemy.stats.heat / enemy.stats.thresh : 0;
      const heatBar = this.add.rectangle(ex - barW / 2, eBarY + 6, barW * heatPct, 2, COLORS.warning).setOrigin(0, 0.5);

      // Buff container
      const buffContainer = this.add.container(ex - barW / 2, eBarY + 12);

      // Tap-to-inspect
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.showInspectPopup(enemy, ex, ey));

      this.arenaUnits.set(enemy.id, { sprite, hpBar, hpTrack, heatBar, heatTrack, buffContainer, label: nameLabel, baseX: ex, baseY: ey, id: enemy.id });
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

    // Track battle stats
    for (const act of turn.actions) {
      const atkStats = this.battleStats.get(act.actorId);
      const defStats = this.battleStats.get(act.targetId);
      if (atkStats) {
        atkStats.totalDamageDealt += act.damage;
        if (act.special) atkStats.abilitiesUsed++;
      }
      if (defStats) defStats.totalDamageTaken += act.damage;
    }
    for (const evt of turn.overloadEvents) {
      for (const [id, stats] of this.battleStats) {
        if (evt.includes(id) || evt.includes('OVERLOADED')) stats.overloads++;
      }
    }

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

      // Update heat bar
      if (au.heatBar) {
        const heatPct = snap.thresh > 0 ? Math.min(snap.heat / snap.thresh, 1) : 0;
        au.heatBar.width = barW * heatPct;
        au.heatBar.fillColor = heatPct > 0.9 ? COLORS.meltdown : heatPct > 0.7 ? COLORS.critical : heatPct > 0.4 ? COLORS.warning : COLORS.safe;
      }

      // Update buff/debuff icons
      if (au.buffContainer && snap.statusEffects) {
        au.buffContainer.removeAll(true);
        let bx = 0;
        for (const eff of snap.statusEffects) {
          const icons: Record<string, { sym: string; col: string }> = {
            rust: { sym: '🔧', col: '#c0732a' },
            short_circuit: { sym: '⚡', col: '#2aa8d4' },
            overheat: { sym: '🔥', col: '#c0432e' },
            freeze: { sym: '❄', col: '#88ccff' },
            kenet_infection: { sym: '☣', col: '#ff2020' },
            resonance: { sym: '🌀', col: '#9b52d4' },
          };
          const icon = icons[eff.type] ?? { sym: '•', col: '#888' };
          au.buffContainer.add(this.add.text(bx, 0, icon.sym, {
            fontFamily: 'monospace', fontSize: '9px', color: icon.col,
          }));
          bx += 14;
        }
      }

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

    // ── Post-battle summary ──
    this.showPostBattleSummary(won, mob, cx);

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
          // Boss kill → Salvage → Keepsake Reward → ZoneTransition
          this.scene.start('Salvage', { roomType: this.roomType, zone: runState.get().zone, nextScene: 'KeepsakeReward' });
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

  // ── Tap-to-inspect: show unit detail popup ──
  private showInspectPopup(unit: UnitConfig, ux: number, uy: number): void {
    // Toggle off if same unit
    if (this.inspectPopup) {
      this.inspectPopup.destroy();
      this.inspectPopup = null;
      return;
    }

    const mob = isMobile();
    const popW = mob ? 220 : 260;
    const popH = 140;
    const pc = powerColor(unit.powerSource);
    const pcStr = '#' + pc.toString(16).padStart(6, '0');
    const isAlly = this.realAllies.some(u => u.id === unit.id);

    // Position popup near the unit but on-screen
    let px = ux + (isAlly ? 60 : -popW - 20);
    let py = uy - popH / 2;
    if (px < 10) px = 10;
    if (px + popW > GAME_WIDTH - 10) px = GAME_WIDTH - popW - 10;
    if (py < 36) py = 36;
    if (py + popH > GAME_HEIGHT - 10) py = GAME_HEIGHT - popH - 10;

    const c = this.add.container(px, py).setDepth(600);

    // Background
    c.add(this.add.rectangle(popW / 2, popH / 2, popW, popH, 0x121110, 0.96)
      .setStrokeStyle(1, pc, 0.7));
    c.add(this.add.rectangle(popW / 2, 1, popW, 2, pc, 0.8));

    // Name + level
    c.add(this.add.text(8, 6, `${unit.name}  Lv.${unit.level}`, {
      fontFamily: 'monospace', fontSize: '11px', color: unit.isAxiom ? '#f5c563' : '#e8dcc8',
    }));
    c.add(this.add.text(8, 22, unit.powerSource.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '9px', color: pcStr,
    }));

    // Stats
    const s = unit.stats;
    const statLines = [
      { label: 'HP', val: `${s.hp}/${s.maxHp}`, color: '#4cae6e' },
      { label: 'ATK', val: `${s.atk}`, color: '#c0432e' },
      { label: 'DEF', val: `${s.def}`, color: '#2aa8d4' },
      { label: 'SPD', val: `${s.spd}`, color: '#f0a84a' },
      { label: 'HEAT', val: `${s.heat}/${s.thresh}`, color: s.heat > s.thresh * 0.7 ? '#c0432e' : '#c0732a' },
      { label: 'SYN', val: `${s.syn}`, color: '#9b52d4' },
    ];

    let sy = 38;
    for (const st of statLines) {
      c.add(this.add.text(8, sy, st.label, { fontFamily: 'monospace', fontSize: '9px', color: '#a89878' }));
      c.add(this.add.text(50, sy, st.val, { fontFamily: 'monospace', fontSize: '9px', color: st.color }));
      sy += 13;
    }

    // Body + weapon + combo (right column)
    let ry = 38;
    if (unit.bodyType) {
      c.add(this.add.text(110, ry, `BODY: ${unit.bodyType.toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#4cae6e',
      }));
      ry += 12;
    }
    if (unit.weaponModule) {
      const wpn = WEAPON_BONUSES[unit.weaponModule];
      c.add(this.add.text(110, ry, `WPN: ${wpn?.abilityName ?? unit.weaponModule}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#2aa8d4',
      }));
      ry += 12;
    }
    const combo = getComboAbility(unit.bodyType, unit.weaponModule);
    if (combo) {
      c.add(this.add.text(110, ry, `${combo.icon} ${combo.name}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#f0a84a',
      }));
      ry += 12;
    }

    // Status effects
    if (unit.statusEffects.length > 0) {
      c.add(this.add.text(110, ry, 'STATUS:', { fontFamily: 'monospace', fontSize: '8px', color: '#a89878' }));
      ry += 12;
      for (const eff of unit.statusEffects) {
        c.add(this.add.text(110, ry, `${eff.type} (${eff.duration}t)`, {
          fontFamily: 'monospace', fontSize: '8px', color: '#c0432e',
        }));
        ry += 11;
      }
    }

    // Directive
    if (isAlly) {
      c.add(this.add.text(8, popH - 18, `DIR: ${unit.directive.toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
      }));
    }

    // Parts count
    c.add(this.add.text(popW - 8, popH - 18, `${unit.parts.length} PARTS`, {
      fontFamily: 'monospace', fontSize: '8px', color: '#6a5e50',
    }).setOrigin(1, 0));

    // Close button
    c.add(this.add.text(popW - 4, 4, '✕', {
      fontFamily: 'monospace', fontSize: '11px', color: '#a89878',
      backgroundColor: '#0d0c0b', padding: { x: 3, y: 0 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        c.destroy();
        this.inspectPopup = null;
      }));

    this.inspectPopup = c;
  }

  // ── Post-battle summary ──
  private showPostBattleSummary(won: boolean, mob: boolean, cx: number): void {
    // Compute per-unit stats from tracked data
    const allUnits = [...this.realAllies, ...this.enemies];
    const allyIds = new Set(this.realAllies.map(u => u.id));

    // Team totals
    let teamDmg = 0, teamTaken = 0, teamKills = 0, teamAbilities = 0;
    for (const u of this.realAllies) {
      const s = this.battleStats.get(u.id);
      if (s) {
        teamDmg += s.totalDamageDealt;
        teamTaken += s.totalDamageTaken;
        teamAbilities += s.abilitiesUsed;
      }
    }
    teamKills = this.enemies.filter(e => !e.alive).length;

    // MVP (highest damage ally)
    let mvpName = '';
    let mvpDmg = 0;
    for (const u of this.realAllies) {
      const s = this.battleStats.get(u.id);
      if (s && s.totalDamageDealt > mvpDmg) {
        mvpDmg = s.totalDamageDealt;
        mvpName = u.name;
      }
    }

    // Summary panel (below the victory/defeat box)
    const sumY = GAME_HEIGHT / 2 - 20;
    const sumW = mob ? GAME_WIDTH - 30 : 420;
    const sumH = 70;

    this.add.rectangle(cx, sumY + sumH / 2, sumW, sumH, COLORS.surface, 0.9)
      .setStrokeStyle(1, COLORS.border).setDepth(100);

    // Title
    this.add.text(cx, sumY + 4, 'BATTLE SUMMARY', {
      fontFamily: 'monospace', fontSize: '9px', color: '#a89878', letterSpacing: 3,
    }).setOrigin(0.5).setDepth(101);

    // Stats row
    const stats = [
      { label: 'DMG DEALT', val: `${teamDmg}`, color: '#c0432e' },
      { label: 'DMG TAKEN', val: `${teamTaken}`, color: '#ff6b4a' },
      { label: 'KILLS', val: `${teamKills}`, color: '#4cae6e' },
      { label: 'ABILITIES', val: `${teamAbilities}`, color: '#2aa8d4' },
      { label: 'TURNS', val: `${this.result.totalTurns}`, color: '#f0a84a' },
    ];

    const colW = sumW / stats.length;
    stats.forEach((s, i) => {
      const sx = cx - sumW / 2 + colW * i + colW / 2;
      this.add.text(sx, sumY + 20, s.val, {
        fontFamily: 'monospace', fontSize: '13px', color: s.color,
      }).setOrigin(0.5).setDepth(101);
      this.add.text(sx, sumY + 36, s.label, {
        fontFamily: 'monospace', fontSize: '7px', color: '#6a5e50', letterSpacing: 1,
      }).setOrigin(0.5).setDepth(101);
    });

    // MVP
    if (mvpName && won) {
      this.add.text(cx, sumY + 54, `MVP: ${mvpName} (${mvpDmg} DMG)`, {
        fontFamily: 'monospace', fontSize: '9px', color: '#f5c563',
      }).setOrigin(0.5).setDepth(101);
    }
  }
}
