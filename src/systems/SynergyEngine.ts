import type { UnitConfig, ActiveSynergy, SynergyType } from '@/types';

export const SynergyEngine = {
  // Evaluate active synergies for the current team
  evaluate(units: UnitConfig[]): ActiveSynergy[] {
    const alive = units.filter(u => u.alive);
    const synergies: ActiveSynergy[] = [];

    const steamCount = alive.filter(u => u.powerSource === 'steam').length;
    const elecCount = alive.filter(u => u.powerSource === 'electric').length;
    const soulCount = alive.filter(u => u.powerSource === 'soul').length;

    // 2+ Steam: Shared Heat Pool
    if (steamCount >= 2) {
      synergies.push({
        type: 'shared_heat_pool',
        description: 'Steam units share a combined overload threshold (+15% each)',
      });
    }

    // 2+ Electric: Chain Transmission
    if (elecCount >= 2) {
      synergies.push({
        type: 'chain_transmission',
        description: 'Electric attacks chain to nearby enemies (30% splash)',
      });
    }

    // Steam + Soul: Steam Soul Shield
    if (steamCount >= 1 && soulCount >= 1) {
      synergies.push({
        type: 'soul_steam_shield',
        description: 'Soul units gain +20 DEF from steam protection',
      });
    }

    // All different: Chaotic Synergy
    if (steamCount >= 1 && elecCount >= 1 && soulCount >= 1) {
      synergies.push({
        type: 'chaotic_synergy',
        description: 'Random powerful effect each turn (high variance)',
      });
    }

    return synergies;
  },

  // Apply synergy stat bonuses before battle
  applyPreBattle(units: UnitConfig[], synergies: ActiveSynergy[]): void {
    for (const syn of synergies) {
      switch (syn.type) {
        case 'shared_heat_pool': {
          const steamUnits = units.filter(u => u.alive && u.powerSource === 'steam');
          for (const u of steamUnits) {
            u.stats.thresh = Math.round(u.stats.thresh * 1.15);
          }
          break;
        }
        case 'soul_steam_shield': {
          const soulUnits = units.filter(u => u.alive && u.powerSource === 'soul');
          for (const u of soulUnits) {
            u.stats.def += 20;
          }
          break;
        }
      }
    }
  },

  // Check for anti-synergy risks
  checkAntiSynergies(units: UnitConfig[]): string[] {
    const alive = units.filter(u => u.alive);
    const warnings: string[] = [];

    const soulCount = alive.filter(u => u.powerSource === 'soul').length;
    if (soulCount >= 3) {
      warnings.push('CONSCIOUSNESS COLLAPSE RISK: 3+ Soul units may lose control');
    }

    const soulWithKenet = alive.filter(
      u => u.powerSource === 'soul' && u.parts.some(p => p.category === 'kenet_part')
    );
    if (soulWithKenet.length > 0) {
      warnings.push('VIRUS SPREAD RISK: Soul unit carrying Kenet parts');
    }

    const allElec = alive.every(u => u.powerSource === 'electric');
    if (allElec && alive.length >= 3) {
      warnings.push('CHAIN MELTDOWN RISK: All-electric team — one overload may cascade');
    }

    return warnings;
  },
};
