import type { UnitConfig } from '@/types';
import { BODY_BONUSES } from '@/data/classTree';
import { WEAPON_BONUSES, type WeaponAbilityType } from '@/data/classTree';
import { HeatManager } from '@/systems/HeatManager';
import { StatusEffectProcessor } from '@/systems/StatusEffectProcessor';

export interface AbilityResult {
  extraDamage: number;          // bonus damage to primary target
  splashTargets: { id: string; damage: number }[];  // AoE hits
  healed: { id: string; amount: number }[];          // healing done
  statusApplied: { targetId: string; type: string }[];
  log: string[];               // action log lines
  defIgnored: number;          // portion of DEF to ignore (0-1)
  repeatAttack: boolean;       // should this attack repeat
  selfHeal: number;            // HP healed to attacker
}

const EMPTY: AbilityResult = {
  extraDamage: 0, splashTargets: [], healed: [], statusApplied: [],
  log: [], defIgnored: 0, repeatAttack: false, selfHeal: 0,
};

export const AbilityProcessor = {
  // Process body passive at start of each turn
  processBodyPassive(
    actor: UnitConfig,
    allies: UnitConfig[],
    enemies: UnitConfig[]
  ): string[] {
    const logs: string[] = [];
    if (!actor.bodyType || !actor.alive) return logs;

    const bonus = BODY_BONUSES[actor.bodyType];
    if (!bonus) return logs;

    switch (actor.bodyType) {
      case 'boiler': {
        // Heat Convert: gain ATK = 10% current heat
        const bonusAtk = Math.round(actor.stats.heat * 0.1);
        if (bonusAtk > 0) {
          actor.stats.atk += bonusAtk;
          logs.push(`${actor.name}: Heat Convert +${bonusAtk} ATK`);
        }
        break;
      }
      case 'relay': {
        // Amplify: nearby allies +10% ATK
        const allyTeam = allies.filter(u => u.alive && u.id !== actor.id);
        for (const a of allyTeam) {
          const boost = Math.round(a.stats.atk * 0.1);
          a.stats.atk += boost;
        }
        if (allyTeam.length > 0) logs.push(`${actor.name}: Amplify +10% ATK to allies`);
        break;
      }
      case 'resonance': {
        // Echo Pulse: deal SYN/4 damage to all enemies
        const pulseDmg = Math.round(actor.stats.syn / 4);
        if (pulseDmg > 0) {
          for (const e of enemies.filter(u => u.alive)) {
            e.stats.hp = Math.max(0, e.stats.hp - pulseDmg);
            if (e.stats.hp <= 0) e.alive = false;
          }
          logs.push(`${actor.name}: Echo Pulse ${pulseDmg} SYN damage to all`);
        }
        break;
      }
    }

    return logs;
  },

  // Process weapon ability during attack
  processWeaponAbility(
    actor: UnitConfig,
    target: UnitConfig,
    baseDamage: number,
    allies: UnitConfig[],
    enemies: UnitConfig[],
  ): AbilityResult {
    if (!actor.weaponModule) return { ...EMPTY };

    const weaponData = WEAPON_BONUSES[actor.weaponModule];
    if (!weaponData) return { ...EMPTY };

    const result: AbilityResult = {
      extraDamage: 0, splashTargets: [], healed: [], statusApplied: [],
      log: [], defIgnored: 0, repeatAttack: false, selfHeal: 0,
    };

    const ability = weaponData.abilityType;
    const heatCost = 3; // weapon abilities generate extra heat

    switch (ability) {
      case 'heavy_hit':
        result.extraDamage = baseDamage; // 200% total
        result.log.push(`[${weaponData.abilityName}] 200% damage!`);
        HeatManager.addHeat(actor, heatCost);
        break;

      case 'counter':
        // Counter is handled separately (on_hit), just log
        result.log.push(`[${weaponData.abilityName}] Counter-attack ready`);
        break;

      case 'multi_hit': {
        // 3 hits at 60% each = 180% total, but applies 3 separate times vs DEF
        const hitDmg = Math.round(baseDamage * 0.6);
        result.extraDamage = hitDmg * 2; // 2 extra hits (base attack is first)
        result.log.push(`[${weaponData.abilityName}] 3x strikes!`);
        HeatManager.addHeat(actor, heatCost);
        break;
      }

      case 'siege': {
        const targetHpPct = target.stats.hp / target.stats.maxHp;
        if (targetHpPct > 0.5) {
          result.extraDamage = Math.round(baseDamage * 0.5);
          result.log.push(`[${weaponData.abilityName}] Siege bonus vs high HP!`);
        }
        break;
      }

      case 'taunt':
        // Mark self — handled in selectTarget override
        result.log.push(`[${weaponData.abilityName}] Taunting enemies`);
        break;

      case 'def_steal': {
        const stolen = Math.round(target.stats.def * 0.3);
        target.stats.def -= stolen;
        actor.stats.def += stolen;
        result.log.push(`[${weaponData.abilityName}] Stole ${stolen} DEF`);
        break;
      }

      case 'heat_convert': {
        const bonus = Math.round(actor.stats.heat * 0.5);
        result.extraDamage = bonus;
        result.log.push(`[${weaponData.abilityName}] ${bonus} bonus heat damage!`);
        HeatManager.addHeat(actor, Math.round(heatCost * 1.5));
        break;
      }

      case 'aoe_burn': {
        const aoeTargets = enemies.filter(u => u.alive && u.id !== target.id);
        const aoeDmg = Math.round(baseDamage * 0.4);
        for (const t of aoeTargets) {
          result.splashTargets.push({ id: t.id, damage: aoeDmg });
          StatusEffectProcessor.apply(t, { type: 'overheat', duration: 2, potency: 1, sourceId: actor.id });
          result.statusApplied.push({ targetId: t.id, type: 'overheat' });
        }
        result.log.push(`[${weaponData.abilityName}] AoE burn!`);
        HeatManager.addHeat(actor, heatCost * 2);
        break;
      }

      case 'safe_explode': {
        if (actor.stats.heat > actor.stats.thresh * 0.6) {
          const explodeDmg = Math.round(actor.stats.heat * 0.8);
          for (const e of enemies.filter(u => u.alive)) {
            result.splashTargets.push({ id: e.id, damage: explodeDmg });
          }
          actor.stats.heat = 0; // vent all heat
          result.log.push(`[${weaponData.abilityName}] Controlled explosion! ${explodeDmg} AoE`);
        }
        break;
      }

      case 'chain_stun':
        StatusEffectProcessor.apply(target, { type: 'short_circuit', duration: 1, potency: 1, sourceId: actor.id });
        result.statusApplied.push({ targetId: target.id, type: 'short_circuit' });
        result.log.push(`[${weaponData.abilityName}] Target short-circuited!`);
        HeatManager.addHeat(actor, heatCost);
        break;

      case 'chain_all': {
        let dmgMult = 0.8;
        const targets = enemies.filter(u => u.alive && u.id !== target.id);
        for (const t of targets) {
          const chainDmg = Math.round(baseDamage * dmgMult);
          result.splashTargets.push({ id: t.id, damage: chainDmg });
          dmgMult *= 0.7; // diminishing
        }
        result.log.push(`[${weaponData.abilityName}] Chain to ${targets.length} targets!`);
        HeatManager.addHeat(actor, heatCost);
        break;
      }

      case 'crit_pen':
        result.defIgnored = 0.5;
        if (Math.random() < 0.25) {
          result.extraDamage = Math.round(baseDamage * 0.8);
          result.log.push(`[${weaponData.abilityName}] CRITICAL HIT!`);
        }
        break;

      case 'reflect':
        // Handled on_hit — attacker receives 40% damage back
        result.log.push(`[${weaponData.abilityName}] Damage reflection active`);
        break;

      case 'burn_def':
        result.defIgnored = 0.7;
        result.log.push(`[${weaponData.abilityName}] Burning through defenses!`);
        break;

      case 'heal_allies': {
        for (const a of allies.filter(u => u.alive)) {
          const heal = Math.round(a.stats.maxHp * 0.1);
          a.stats.hp = Math.min(a.stats.maxHp, a.stats.hp + heal);
          result.healed.push({ id: a.id, amount: heal });
        }
        result.log.push(`[${weaponData.abilityName}] Team healed!`);
        break;
      }

      case 'team_atk': {
        for (const a of allies.filter(u => u.alive && u.id !== actor.id)) {
          const boost = Math.round(a.stats.atk * 0.15);
          a.stats.atk += boost;
        }
        result.log.push(`[${weaponData.abilityName}] Team ATK +15%!`);
        break;
      }

      case 'disable':
        StatusEffectProcessor.apply(target, { type: 'freeze', duration: 1, potency: 1, sourceId: actor.id });
        result.statusApplied.push({ targetId: target.id, type: 'freeze' });
        result.log.push(`[${weaponData.abilityName}] Target frozen!`);
        break;

      case 'phase_through':
        result.defIgnored = 1.0; // 100% DEF ignore
        result.log.push(`[${weaponData.abilityName}] Phased through defenses!`);
        break;

      case 'life_drain': {
        result.selfHeal = Math.round(baseDamage * 0.25);
        result.log.push(`[${weaponData.abilityName}] Drained ${result.selfHeal} HP`);
        break;
      }

      case 'root':
        StatusEffectProcessor.apply(target, { type: 'freeze', duration: 2, potency: 1, sourceId: actor.id });
        result.statusApplied.push({ targetId: target.id, type: 'freeze' });
        result.log.push(`[${weaponData.abilityName}] Target rooted!`);
        break;

      case 'aoe_syn': {
        const synDmg = Math.round(actor.stats.syn * 0.6);
        for (const e of enemies.filter(u => u.alive)) {
          result.splashTargets.push({ id: e.id, damage: synDmg });
        }
        result.log.push(`[${weaponData.abilityName}] SYN blast ${synDmg} to all!`);
        HeatManager.addHeat(actor, heatCost);
        break;
      }

      case 'knockback': {
        const spdReduction = Math.round(target.stats.spd * 0.5);
        target.stats.spd -= spdReduction;
        result.log.push(`[${weaponData.abilityName}] Target SPD -${spdReduction}`);
        break;
      }

      case 'sync_team': {
        const soulAllies = allies.filter(u => u.alive && u.powerSource === 'soul' && u.id !== actor.id);
        for (const a of soulAllies) {
          a.stats.syn = Math.max(a.stats.syn, actor.stats.syn);
        }
        if (soulAllies.length > 0) result.log.push(`[${weaponData.abilityName}] SYN synced to ${actor.stats.syn}`);
        break;
      }

      case 'repeat_attack':
        result.repeatAttack = Math.random() < 0.7;
        if (result.repeatAttack) result.log.push(`[${weaponData.abilityName}] Echo attack!`);
        break;

      case 'clone': {
        const cloneDmg = Math.round(baseDamage * 0.5);
        result.extraDamage = cloneDmg;
        result.log.push(`[${weaponData.abilityName}] Shadow strike!`);
        break;
      }

      case 'copy_ability':
        // Copy target's weapon for extra damage
        if (target.weaponModule) {
          result.extraDamage = Math.round(baseDamage * 0.4);
          result.log.push(`[${weaponData.abilityName}] Copied enemy ability!`);
        }
        break;

      case 'buff_allies': {
        const elecAllies = allies.filter(u => u.alive && u.powerSource === 'electric' && u.id !== actor.id);
        for (const a of elecAllies) {
          a.stats.atk += Math.round(a.stats.atk * 0.3);
        }
        if (elecAllies.length > 0) result.log.push(`[${weaponData.abilityName}] Electric allies +30% ATK!`);
        break;
      }
    }

    return result;
  },

  // Process body passive on being hit (counter, reflect)
  processOnHit(
    defender: UnitConfig,
    attacker: UnitConfig,
    damageTaken: number,
  ): { counterDamage: number; reflectDamage: number; log: string[] } {
    const log: string[] = [];
    let counterDamage = 0;
    let reflectDamage = 0;

    if (!defender.alive) return { counterDamage, reflectDamage, log };

    // Iron Bastion counter
    if (defender.weaponModule === 'iron_bastion' && defender.alive) {
      counterDamage = Math.round(defender.stats.atk * 0.5);
      log.push(`${defender.name} counter-attacks for ${counterDamage}!`);
    }

    // Mirror Array reflect
    if (defender.weaponModule === 'mirror_array' && defender.alive) {
      reflectDamage = Math.round(damageTaken * 0.4);
      log.push(`${defender.name} reflects ${reflectDamage} damage!`);
    }

    // Cage body passive: drain
    if (defender.bodyType === 'cage' && defender.alive) {
      const healAmt = Math.round(damageTaken * 0.15);
      defender.stats.hp = Math.min(defender.stats.maxHp, defender.stats.hp + healAmt);
    }

    return { counterDamage, reflectDamage, log };
  },
};
