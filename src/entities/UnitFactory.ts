import type { UnitConfig, PowerSource } from '@/types';
import { BASE_STATS } from '@/data/constants';

let unitIdCounter = 0;

export const UnitFactory = {
  createAxiom(powerSource: PowerSource): UnitConfig {
    const base = BASE_STATS[powerSource];
    return {
      id: `axiom_${++unitIdCounter}`,
      name: 'AXIOM-0',
      isAxiom: true,
      powerSource,
      bodyType: null,
      weaponModule: null,
      level: 1,
      xp: 0,
      stats: { ...base, heat: 0 },
      parts: [],
      directive: 'attack',
      statusEffects: [],
      alive: true,
    };
  },

  createUnit(name: string, powerSource: PowerSource): UnitConfig {
    const base = BASE_STATS[powerSource];
    return {
      id: `unit_${++unitIdCounter}`,
      name,
      isAxiom: false,
      powerSource,
      bodyType: null,
      weaponModule: null,
      level: 1,
      xp: 0,
      stats: { ...base, heat: 0 },
      parts: [],
      directive: 'attack',
      statusEffects: [],
      alive: true,
    };
  },
};
