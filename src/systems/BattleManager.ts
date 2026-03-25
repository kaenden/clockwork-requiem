import type { UnitConfig, RoomType, UnitStats } from '@/types';
import { HeatManager } from '@/systems/HeatManager';
import { SynergyEngine } from '@/systems/SynergyEngine';
import { StatusEffectProcessor } from '@/systems/StatusEffectProcessor';
import { AbilityProcessor } from '@/systems/AbilityProcessor';
import { KeepsakeEngine } from '@/systems/KeepsakeEngine';
import { EnemyFactory } from '@/entities/EnemyFactory';
import { eventBus } from '@/utils/EventBus';
import { runState } from '@/state/RunStateManager';

export interface BattleAction {
  actorId: string;
  actorName: string;
  targetId: string;
  targetName: string;
  damage: number;
  heatGenerated: number;
  special: string | null;
}

export interface UnitSnapshot {
  id: string;
  hp: number;
  maxHp: number;
  heat: number;
  thresh: number;
  alive: boolean;
}

export interface BattleTurn {
  turnNumber: number;
  actions: BattleAction[];
  statusLogs: string[];
  overloadEvents: string[];
  allySnapshots: UnitSnapshot[];
  enemySnapshots: UnitSnapshot[];
}

export interface BattleResult {
  won: boolean;
  turns: BattleTurn[];
  survivingAllies: UnitConfig[];
  defeatedEnemies: UnitConfig[];
  totalTurns: number;
  xpEarned: number;
}

// Snapshot stats before synergy buffs so we can revert
interface StatSnapshot {
  id: string;
  thresh: number;
  def: number;
  atk: number;
}

export const BattleManager = {
  simulate(
    allies: UnitConfig[],
    enemies: UnitConfig[],
    roomType: RoomType
  ): BattleResult {
    const turns: BattleTurn[] = [];
    let turnNumber = 0;
    const maxTurns = 50;

    // Snapshot stats before synergy buffs
    const snapshots: StatSnapshot[] = allies.map(u => ({
      id: u.id, thresh: u.stats.thresh, def: u.stats.def, atk: u.stats.atk,
    }));

    // Evaluate synergies and apply pre-battle bonuses
    const synergies = SynergyEngine.evaluate(allies);
    SynergyEngine.applyPreBattle(allies, synergies);

    // Apply keepsake buffs
    const keepsakes = runState.getKeepsakes();
    KeepsakeEngine.applyPreBattle(allies, keepsakes);

    eventBus.emit('battle:start', { allies, enemies, synergies });

    while (turnNumber < maxTurns) {
      turnNumber++;
      const allAlive = [...allies.filter(u => u.alive), ...enemies.filter(u => u.alive)];

      if (allies.every(u => !u.alive) || enemies.every(u => !u.alive)) break;

      // Sort by effective speed (descending)
      const turnOrder = allAlive
        .map(u => ({ unit: u, spd: StatusEffectProcessor.getEffectiveSpd(u) }))
        .sort((a, b) => b.spd - a.spd)
        .map(o => o.unit);

      const actions: BattleAction[] = [];
      const statusLogs: string[] = [];
      const overloadEvents: string[] = [];

      for (const actor of turnOrder) {
        if (!actor.alive) continue;

        // Process status effects at turn start
        const logs = StatusEffectProcessor.processStartOfTurn(actor);
        statusLogs.push(...logs);

        if (!actor.alive) continue;

        // Body passive at turn start
        const isAllyForPassive = allies.includes(actor);
        const passiveLogs = AbilityProcessor.processBodyPassive(
          actor,
          isAllyForPassive ? allies : enemies,
          isAllyForPassive ? enemies : allies,
        );
        statusLogs.push(...passiveLogs);

        if (!actor.alive) continue;

        // Check if can act
        if (!StatusEffectProcessor.canAct(actor)) {
          statusLogs.push(`${actor.name} cannot act this turn`);
          continue;
        }

        // Determine target
        const isAlly = allies.includes(actor);
        const targetPool = isAlly
          ? enemies.filter(u => u.alive)
          : allies.filter(u => u.alive);

        if (targetPool.length === 0) continue;

        const target = this.selectTarget(actor, targetPool);

        // Process weapon ability
        const atkMod = StatusEffectProcessor.getAtkModifier(actor);
        const heatDmgMult = HeatManager.getAbilityDamageMultiplier(actor);
        const rawDamage = Math.round(actor.stats.atk * atkMod * heatDmgMult);

        const abilityResult = AbilityProcessor.processWeaponAbility(
          actor, target, rawDamage,
          isAlly ? allies : enemies,
          isAlly ? enemies : allies,
        );

        // Apply DEF with ability-based ignore
        const effectiveDef = Math.round(target.stats.def * (1 - abilityResult.defIgnored));
        const damage = Math.max(1, rawDamage + abilityResult.extraDamage - effectiveDef);

        // Apply damage
        target.stats.hp = Math.max(0, target.stats.hp - damage);
        if (target.stats.hp <= 0) target.alive = false;

        // Self-heal (life drain etc.)
        if (abilityResult.selfHeal > 0) {
          actor.stats.hp = Math.min(actor.stats.maxHp, actor.stats.hp + abilityResult.selfHeal);
        }

        // Heat generation
        const baseHeat = 2;
        const heatMult = HeatManager.getAbilityHeatMultiplier(actor);
        const heatGen = Math.round(baseHeat * heatMult);
        HeatManager.addHeat(actor, heatGen);

        if (target.alive && damage > 20) HeatManager.addHeat(target, 1);

        // On-hit reactions (counter, reflect)
        const onHit = AbilityProcessor.processOnHit(target, actor, damage);
        if (onHit.counterDamage > 0 && actor.alive) {
          actor.stats.hp = Math.max(0, actor.stats.hp - onHit.counterDamage);
          if (actor.stats.hp <= 0) actor.alive = false;
        }
        if (onHit.reflectDamage > 0 && actor.alive) {
          actor.stats.hp = Math.max(0, actor.stats.hp - onHit.reflectDamage);
          if (actor.stats.hp <= 0) actor.alive = false;
        }

        const special = abilityResult.log.length > 0 ? abilityResult.log.join(' ') : null;
        actions.push({
          actorId: actor.id, actorName: actor.name,
          targetId: target.id, targetName: target.name,
          damage, heatGenerated: heatGen, special,
        });

        // Apply splash damage from abilities
        for (const splash of abilityResult.splashTargets) {
          const st = [...allies, ...enemies].find(u => u.id === splash.id);
          if (st && st.alive) {
            st.stats.hp = Math.max(0, st.stats.hp - splash.damage);
            if (st.stats.hp <= 0) st.alive = false;
            actions.push({
              actorId: actor.id, actorName: actor.name,
              targetId: st.id, targetName: st.name,
              damage: splash.damage, heatGenerated: 0,
              special: 'AoE',
            });
          }
        }
        statusLogs.push(...abilityResult.log);
        statusLogs.push(...onHit.log);

        // Repeat attack (echo strike)
        if (abilityResult.repeatAttack && target.alive && actor.alive) {
          const repeatDmg = Math.max(1, Math.round(rawDamage * 0.7) - effectiveDef);
          target.stats.hp = Math.max(0, target.stats.hp - repeatDmg);
          if (target.stats.hp <= 0) target.alive = false;
          actions.push({
            actorId: actor.id, actorName: actor.name,
            targetId: target.id, targetName: target.name,
            damage: repeatDmg, heatGenerated: 0, special: 'ECHO',
          });
        }

        // Synergy: Chain Transmission (electric splash)
        if (isAlly && synergies.some(s => s.type === 'chain_transmission') && actor.powerSource === 'electric') {
          const splashTargets = targetPool.filter(u => u.alive && u.id !== target.id);
          if (splashTargets.length > 0) {
            const splashTarget = splashTargets[0];
            const splashDmg = Math.max(1, Math.round(damage * 0.3));
            splashTarget.stats.hp = Math.max(0, splashTarget.stats.hp - splashDmg);
            if (splashTarget.stats.hp <= 0) splashTarget.alive = false;
            actions.push({
              actorId: actor.id,
              actorName: actor.name,
              targetId: splashTarget.id,
              targetName: splashTarget.name,
              damage: splashDmg,
              heatGenerated: 0,
              special: 'CHAIN LIGHTNING',
            });
          }
        }

        // Synergy: Chaotic Synergy — temporary per-battle buff (tracked via snapshot revert)
        if (isAlly && synergies.some(s => s.type === 'chaotic_synergy') && Math.random() < 0.15) {
          const chaosEffects = [
            () => {
              actor.stats.atk += 10;
              return `${actor.name}: Chaos ATK +10 (this battle)`;
            },
            () => {
              HeatManager.removeHeat(actor, 10);
              return `${actor.name}: Chaos cooled -10 HEAT`;
            },
            () => {
              HeatManager.addHeat(actor, 8);
              return `${actor.name}: Chaos heated +8 HEAT`;
            },
          ];
          const fx = chaosEffects[Math.floor(Math.random() * chaosEffects.length)]();
          overloadEvents.push(fx);
        }
      }

      // End-of-turn: process overload for all alive units
      for (const unit of [...allies, ...enemies]) {
        if (!unit.alive) continue;
        const result = HeatManager.processTurnHeat(unit);
        if (result.exploded) {
          overloadEvents.push(`${unit.name} OVERLOADED — ${result.aoeDamage} AoE damage!`);
          const sameTeam = allies.includes(unit) ? allies : enemies;
          const oppositeTeam = allies.includes(unit) ? enemies : allies;
          for (const u of [...sameTeam, ...oppositeTeam]) {
            if (u.alive && u.id !== unit.id) {
              u.stats.hp = Math.max(0, u.stats.hp - result.aoeDamage);
              if (u.stats.hp <= 0) u.alive = false;
            }
          }
        }
      }

      // Capture per-turn snapshots for UI animation
      const snap = (u: UnitConfig): UnitSnapshot => ({
        id: u.id, hp: u.stats.hp, maxHp: u.stats.maxHp,
        heat: u.stats.heat, thresh: u.stats.thresh, alive: u.alive,
      });
      turns.push({
        turnNumber, actions, statusLogs, overloadEvents,
        allySnapshots: allies.map(snap),
        enemySnapshots: enemies.map(snap),
      });

      if (allies.every(u => !u.alive) || enemies.every(u => !u.alive)) break;
    }

    const won = allies.some(u => u.alive);

    // Revert synergy & chaos stat mutations on surviving allies
    for (const snap of snapshots) {
      const unit = allies.find(u => u.id === snap.id);
      if (unit) {
        unit.stats.thresh = snap.thresh;
        unit.stats.def = snap.def;
        unit.stats.atk = snap.atk;
      }
    }

    // Post-battle keepsake effects (healing, heat reduction)
    if (won) {
      KeepsakeEngine.applyPostBattle(allies, keepsakes);
    }

    // XP uses EnemyFactory formula (accounts for room type multiplier) + keepsake bonus
    const xpBonusPct = KeepsakeEngine.getXpBonusPct(keepsakes);
    const baseXp = won ? EnemyFactory.getXpReward(enemies, roomType) : 0;
    const xpEarned = Math.round(baseXp * (1 + xpBonusPct / 100));

    const result: BattleResult = {
      won,
      turns,
      survivingAllies: allies.filter(u => u.alive),
      defeatedEnemies: enemies.filter(u => !u.alive),
      totalTurns: turnNumber,
      xpEarned,
    };

    eventBus.emit('battle:end', result);
    return result;
  },

  selectTarget(actor: UnitConfig, targets: UnitConfig[]): UnitConfig {
    switch (actor.directive) {
      case 'attack':
        return [...targets].sort((a, b) => a.stats.hp - b.stats.hp)[0];
      case 'defend':
        return [...targets].sort((a, b) => b.stats.atk - a.stats.atk)[0];
      case 'target': {
        const samePower = targets.filter(t => t.powerSource === actor.powerSource);
        return samePower.length > 0 ? samePower[0] : targets[0];
      }
      case 'conserve':
        return [...targets].sort((a, b) => a.stats.def - b.stats.def)[0];
      case 'berserker':
        return targets[Math.floor(Math.random() * targets.length)];
      default:
        return targets[0];
    }
  },
};
