import type { UnitConfig, RoomType, UnitStats } from '@/types';
import { HeatManager } from '@/systems/HeatManager';
import { SynergyEngine } from '@/systems/SynergyEngine';
import { StatusEffectProcessor } from '@/systems/StatusEffectProcessor';
import { EnemyFactory } from '@/entities/EnemyFactory';
import { eventBus } from '@/utils/EventBus';

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

        // Calculate damage
        const atkMod = StatusEffectProcessor.getAtkModifier(actor);
        const heatDmgMult = HeatManager.getAbilityDamageMultiplier(actor);
        const rawDamage = Math.round(actor.stats.atk * atkMod * heatDmgMult);
        const defense = target.stats.def;
        const damage = Math.max(1, rawDamage - defense);

        // Apply damage
        target.stats.hp = Math.max(0, target.stats.hp - damage);
        if (target.stats.hp <= 0) {
          target.alive = false;
        }

        // Heat generation from attack
        const baseHeat = 2;
        const heatMult = HeatManager.getAbilityHeatMultiplier(actor);
        const heatGen = Math.round(baseHeat * heatMult);
        HeatManager.addHeat(actor, heatGen);

        // Small heat from taking damage (only if target still alive)
        if (target.alive && damage > 20) {
          HeatManager.addHeat(target, 1);
        }

        actions.push({
          actorId: actor.id,
          actorName: actor.name,
          targetId: target.id,
          targetName: target.name,
          damage,
          heatGenerated: heatGen,
          special: null,
        });

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

    // XP uses EnemyFactory formula (accounts for room type multiplier)
    const xpEarned = won ? EnemyFactory.getXpReward(enemies, roomType) : 0;

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
