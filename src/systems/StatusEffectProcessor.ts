import type { UnitConfig, StatusEffect, StatusEffectType } from '@/types';
import { HeatManager } from '@/systems/HeatManager';

export const StatusEffectProcessor = {
  // Apply start-of-turn effects
  processStartOfTurn(unit: UnitConfig): string[] {
    const log: string[] = [];
    const toRemove: number[] = [];

    // Track kenet freeze to apply AFTER iteration (avoid mutation during loop)
    let kenetFrozen = false;

    const effectCount = unit.statusEffects.length;
    for (let i = 0; i < effectCount; i++) {
      const eff = unit.statusEffects[i];

      switch (eff.type) {
        case 'rust':
          unit.stats.def = Math.max(0, unit.stats.def - eff.potency);
          log.push(`${unit.name} loses ${eff.potency} DEF from Rust`);
          break;

        case 'overheat':
          HeatManager.addHeat(unit, 5);
          log.push(`${unit.name} gains +5 HEAT from Overheat`);
          break;

        case 'kenet_infection':
          if (Math.random() < 0.3) {
            log.push(`${unit.name} loses control from Kenet Infection!`);
            kenetFrozen = true;
          }
          break;
      }

      // Tick duration
      if (eff.duration > 0) {
        eff.duration--;
        if (eff.duration <= 0) toRemove.push(i);
      }
    }

    // Remove expired effects (reverse order)
    for (const idx of toRemove.reverse()) {
      unit.statusEffects.splice(idx, 1);
    }

    // Apply kenet freeze AFTER iteration to avoid mutation during loop
    if (kenetFrozen) {
      unit.statusEffects.push({
        type: 'freeze', duration: 1, potency: 0, sourceId: 'kenet',
      });
    }

    return log;
  },

  // Check if unit can act this turn
  canAct(unit: UnitConfig): boolean {
    return !unit.statusEffects.some(e =>
      e.type === 'freeze' || e.type === 'short_circuit'
    );
  },

  // Get ATK modifier from status effects
  getAtkModifier(unit: UnitConfig): number {
    let mod = 1;
    if (unit.statusEffects.some(e => e.type === 'overheat')) {
      mod *= 1.3; // +30% ATK
    }
    return mod;
  },

  // Get SPD for turn order (short_circuit = 0)
  getEffectiveSpd(unit: UnitConfig): number {
    if (unit.statusEffects.some(e => e.type === 'short_circuit')) return 0;
    return unit.stats.spd;
  },

  // Apply a new status effect
  apply(unit: UnitConfig, effect: StatusEffect): void {
    // Check if already has this type — refresh duration
    const existing = unit.statusEffects.find(e => e.type === effect.type);
    if (existing) {
      existing.duration = Math.max(existing.duration, effect.duration);
      existing.potency = Math.max(existing.potency, effect.potency);
    } else {
      unit.statusEffects.push({ ...effect });
    }
  },

  // Clear all effects
  clearAll(unit: UnitConfig): void {
    unit.statusEffects = [];
  },
};
