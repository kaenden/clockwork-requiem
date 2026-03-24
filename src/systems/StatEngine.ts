import type { UnitConfig, UnitStats, Part, PowerSource, Compatibility, OverloadPhase } from '@/types';
import {
  BASE_STATS, STAT_GROWTH_PER_LEVEL, COMPAT_HEAT,
  HEAT_PHASE, BODY_SPLIT_LEVEL, WEAPON_SPLIT_LEVEL,
  XP_PER_LEVEL, AXIOM_MAX_FOREIGN_PARTS,
} from '@/data/constants';
import { BODY_BONUSES } from '@/data/classTree';
import { WEAPON_BONUSES } from '@/data/classTree';

// ── Compatibility check ──
export function getCompatibility(partSource: PowerSource, unitSource: PowerSource): Compatibility {
  if (partSource === unitSource) return 'full';
  const conflicts: [PowerSource, PowerSource][] = [['soul', 'electric'], ['electric', 'soul']];
  if (conflicts.some(([a, b]) => a === partSource && b === unitSource)) return 'conflict';
  return 'partial';
}

// ── Effective heat cost of a part on a unit ──
export function effectiveHeatCost(part: Part, unit: UnitConfig): number {
  const compat = unit.isAxiom ? 'full' : getCompatibility(part.powerSource, unit.powerSource);
  return Math.round(part.heatCost * COMPAT_HEAT[compat]);
}

// ── Compute final stats from base + level + parts ──
export function computeStats(unit: UnitConfig): UnitStats {
  const base = { ...BASE_STATS[unit.powerSource] };

  // Level growth
  const growth = STAT_GROWTH_PER_LEVEL[unit.powerSource];
  for (const [key, val] of Object.entries(growth)) {
    if (key in base && typeof val === 'number') {
      (base as any)[key] += val * (unit.level - 1);
    }
  }

  // Body type bonuses (Lv.10 split)
  if (unit.bodyType && unit.bodyType in BODY_BONUSES) {
    const bonus = BODY_BONUSES[unit.bodyType];
    for (const [key, val] of Object.entries(bonus.stats)) {
      if (key in base && typeof val === 'number') {
        (base as any)[key] += val;
      }
    }
  }

  // Weapon module bonuses (Lv.20 split)
  if (unit.weaponModule && unit.weaponModule in WEAPON_BONUSES) {
    const bonus = WEAPON_BONUSES[unit.weaponModule];
    for (const [key, val] of Object.entries(bonus.stats)) {
      if (key in base && typeof val === 'number') {
        (base as any)[key] += val;
      }
    }
  }

  // Part stat mods
  for (const part of unit.parts) {
    for (const mod of part.statMods) {
      if (mod.stat in base) {
        (base as any)[mod.stat] += mod.value;
        if (mod.percent) {
          (base as any)[mod.stat] = Math.round((base as any)[mod.stat] * (1 + mod.percent / 100));
        }
      }
    }
    // Parts lower the overload threshold
    base.thresh -= effectiveHeatCost(part, unit);
  }

  // Ensure minimums
  base.thresh = Math.max(base.thresh, 10);
  base.hp = Math.min(base.hp, base.maxHp);

  return base;
}

// ── Overload phase from heat percentage ──
export function getOverloadPhase(unit: UnitConfig): OverloadPhase {
  const pct = (unit.stats.heat / unit.stats.thresh) * 100;
  if (pct >= HEAT_PHASE.CRITICAL_MAX) return 'meltdown';
  if (pct >= HEAT_PHASE.WARNING_MAX) return 'critical';
  if (pct >= HEAT_PHASE.SAFE_MAX) return 'warning';
  return 'safe';
}

// ── Can this unit equip a part? ──
export function canEquipPart(unit: UnitConfig, part: Part): { ok: boolean; reason?: string } {
  // AXIOM foreign part limit
  if (unit.isAxiom) {
    const foreignCount = unit.parts.filter(p => p.powerSource !== unit.powerSource).length;
    const isNewForeign = part.powerSource !== unit.powerSource;
    if (isNewForeign && foreignCount >= AXIOM_MAX_FOREIGN_PARTS) {
      return { ok: false, reason: `AXIOM-0 can only carry ${AXIOM_MAX_FOREIGN_PARTS} foreign parts` };
    }
  }

  // Simulate what thresh would be after adding this part (compute from scratch)
  const simUnit = { ...unit, parts: [...unit.parts, part] };
  const simStats = computeStats(simUnit);
  if (simStats.thresh < 10) {
    return { ok: false, reason: 'Threshold would drop below minimum (10)' };
  }

  return { ok: true };
}

// ── Level up check (call repeatedly until no more level-ups) ──
export function checkLevelUp(unit: UnitConfig): {
  leveledUp: boolean;
  splitAvailable: 'body' | 'weapon' | null;
} {
  const xpNeeded = XP_PER_LEVEL * unit.level;
  if (unit.xp < xpNeeded) return { leveledUp: false, splitAvailable: null };

  unit.xp -= xpNeeded;
  unit.level++;

  let splitAvailable: 'body' | 'weapon' | null = null;
  if (unit.level === BODY_SPLIT_LEVEL && !unit.bodyType) {
    splitAvailable = 'body';
  } else if (unit.level === WEAPON_SPLIT_LEVEL && !unit.weaponModule) {
    splitAvailable = 'weapon';
  }

  // Recompute stats
  const newStats = computeStats(unit);
  const currentHeat = unit.stats.heat;
  unit.stats = { ...newStats, heat: currentHeat };

  return { leveledUp: true, splitAvailable };
}
