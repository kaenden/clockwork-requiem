import type { UnitConfig, Keepsake } from '@/types';

export const KeepsakeEngine = {
  // Apply keepsake buffs to all allies at battle start
  applyPreBattle(allies: UnitConfig[], keepsakes: Keepsake[]): string[] {
    const logs: string[] = [];

    for (const k of keepsakes) {
      for (const eff of k.effects) {
        switch (eff.type) {
          case 'team_atk':
            for (const u of allies) u.stats.atk += eff.value;
            logs.push(`${k.icon} ${k.name}: ALL ATK +${eff.value}`);
            break;
          case 'team_def':
            for (const u of allies) u.stats.def += eff.value;
            logs.push(`${k.icon} ${k.name}: ALL DEF +${eff.value}`);
            break;
          case 'team_spd':
            for (const u of allies) u.stats.spd += eff.value;
            logs.push(`${k.icon} ${k.name}: ALL SPD +${eff.value}`);
            break;
          case 'team_hp':
            for (const u of allies) {
              u.stats.maxHp += eff.value;
              u.stats.hp += eff.value;
            }
            logs.push(`${k.icon} ${k.name}: ALL HP +${eff.value}`);
            break;
          case 'team_thresh':
            for (const u of allies) u.stats.thresh += eff.value;
            logs.push(`${k.icon} ${k.name}: ALL THRESH +${eff.value}`);
            break;
          case 'team_atk_pct':
            for (const u of allies) u.stats.atk = Math.round(u.stats.atk * (1 + eff.value / 100));
            logs.push(`${k.icon} ${k.name}: ALL ATK +${eff.value}%`);
            break;
          case 'team_def_pct':
            for (const u of allies) u.stats.def = Math.round(u.stats.def * (1 + eff.value / 100));
            logs.push(`${k.icon} ${k.name}: ALL DEF +${eff.value}%`);
            break;
          case 'start_heat_reduce':
            for (const u of allies) u.stats.heat = Math.max(0, u.stats.heat - eff.value);
            logs.push(`${k.icon} ${k.name}: ALL HEAT -${eff.value}`);
            break;
        }
      }
    }

    return logs;
  },

  // Apply post-battle keepsake effects
  applyPostBattle(allies: UnitConfig[], keepsakes: Keepsake[]): string[] {
    const logs: string[] = [];

    for (const k of keepsakes) {
      for (const eff of k.effects) {
        switch (eff.type) {
          case 'heal_per_battle':
            for (const u of allies.filter(u => u.alive)) {
              const healed = Math.min(eff.value, u.stats.maxHp - u.stats.hp);
              u.stats.hp += healed;
            }
            if (eff.value > 0) logs.push(`${k.icon} ${k.name}: Healed ${eff.value} HP`);
            break;
          case 'heat_reduce':
            for (const u of allies.filter(u => u.alive)) {
              u.stats.heat = Math.max(0, u.stats.heat - eff.value);
            }
            if (eff.value > 0) logs.push(`${k.icon} ${k.name}: Heat -${eff.value}`);
            break;
        }
      }
    }

    return logs;
  },

  // Get total XP bonus percentage from keepsakes
  getXpBonusPct(keepsakes: Keepsake[]): number {
    return keepsakes.reduce((sum, k) =>
      sum + k.effects.filter(e => e.type === 'xp_bonus_pct').reduce((s, e) => s + e.value, 0), 0);
  },

  // Get extra salvage count from keepsakes
  getExtraSalvage(keepsakes: Keepsake[]): number {
    return keepsakes.reduce((sum, k) =>
      sum + k.effects.filter(e => e.type === 'salvage_extra').reduce((s, e) => s + e.value, 0), 0);
  },

  // Get extra consciousness from keepsakes
  getExtraConsciousness(keepsakes: Keepsake[]): number {
    return keepsakes.reduce((sum, k) =>
      sum + k.effects.filter(e => e.type === 'consciousness_bonus').reduce((s, e) => s + e.value, 0), 0);
  },

  // Get global crit chance from keepsakes
  getCritBonus(keepsakes: Keepsake[]): number {
    return keepsakes.reduce((sum, k) =>
      sum + k.effects.filter(e => e.type === 'crit_chance').reduce((s, e) => s + e.value, 0), 0);
  },
};
