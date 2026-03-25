import type { Keepsake, KeepsakeRarity } from '@/types';

// ── Keepsake Pool ──
// Keepsakes are team-wide relics. Max 3 per run.
// Offered after boss kills and occasionally from terminal events.

export const KEEPSAKE_POOL: Keepsake[] = [
  // ── Bronze (common, small bonuses) ──
  {
    id: 'k_iron_cog', name: 'Iron Cog', icon: '⚙',
    description: 'A simple but reliable cog. The team hits a bit harder.',
    rarity: 'bronze',
    effects: [{ type: 'team_atk', value: 5 }],
  },
  {
    id: 'k_copper_plate', name: 'Copper Plating', icon: '🛡',
    description: 'Thin copper sheets layered over joints. Slightly tougher.',
    rarity: 'bronze',
    effects: [{ type: 'team_def', value: 4 }],
  },
  {
    id: 'k_oil_flask', name: 'Lubricant Flask', icon: '🧴',
    description: 'Keeps gears spinning freely. Everyone moves a bit faster.',
    rarity: 'bronze',
    effects: [{ type: 'team_spd', value: 5 }],
  },
  {
    id: 'k_coolant_drip', name: 'Coolant Drip', icon: '💧',
    description: 'A slow drip of coolant. Reduces heat after every fight.',
    rarity: 'bronze',
    effects: [{ type: 'heat_reduce', value: 5 }],
  },
  {
    id: 'k_scrap_magnet', name: 'Scrap Magnet', icon: '🧲',
    description: 'Attracts useful debris. One extra part from salvage.',
    rarity: 'bronze',
    effects: [{ type: 'salvage_extra', value: 1 }],
  },
  {
    id: 'k_memory_shard', name: 'Memory Shard', icon: '💎',
    description: 'A fragment of stored experience. Slightly more XP gained.',
    rarity: 'bronze',
    effects: [{ type: 'xp_bonus_pct', value: 10 }],
  },
  {
    id: 'k_patched_hull', name: 'Patched Hull', icon: '🩹',
    description: 'Quick battlefield repairs. Heal a little after each fight.',
    rarity: 'bronze',
    effects: [{ type: 'heal_per_battle', value: 8 }],
  },
  {
    id: 'k_signal_booster', name: 'Signal Booster', icon: '📡',
    description: 'Better consciousness reception. +2 consciousness per battle.',
    rarity: 'bronze',
    effects: [{ type: 'consciousness_bonus', value: 2 }],
  },

  // ── Silver (mid-tier, stronger bonuses) ──
  {
    id: 'k_war_drum', name: 'War Drum Module', icon: '🥁',
    description: 'A rhythmic pulse that drives the team into a frenzy.',
    rarity: 'silver',
    effects: [{ type: 'team_atk_pct', value: 10 }],
  },
  {
    id: 'k_shield_gen', name: 'Shield Generator', icon: '🔰',
    description: 'Projects a thin energy barrier around the squad.',
    rarity: 'silver',
    effects: [{ type: 'team_def_pct', value: 12 }],
  },
  {
    id: 'k_heat_sink', name: 'Massive Heat Sink', icon: '❄',
    description: 'Industrial-grade cooling for the whole squad.',
    rarity: 'silver',
    effects: [{ type: 'team_thresh', value: 15 }, { type: 'heat_reduce', value: 8 }],
  },
  {
    id: 'k_field_medic', name: 'Field Medic Protocol', icon: '➕',
    description: 'Automated repair nanobots. Significant post-battle healing.',
    rarity: 'silver',
    effects: [{ type: 'heal_per_battle', value: 20 }, { type: 'team_hp', value: 10 }],
  },
  {
    id: 'k_data_core', name: 'Data Core', icon: '💾',
    description: 'Accelerated learning algorithms. Much more XP gained.',
    rarity: 'silver',
    effects: [{ type: 'xp_bonus_pct', value: 25 }],
  },
  {
    id: 'k_anti_virus', name: 'Anti-Virus Module', icon: '🛡',
    description: 'Kenet resistance protocols. Drastically reduces virus risk.',
    rarity: 'silver',
    effects: [{ type: 'virus_resist', value: 50 }],
  },
  {
    id: 'k_battle_scanner', name: 'Battle Scanner', icon: '🎯',
    description: 'Identifies weak points. Increased chance of critical hits.',
    rarity: 'silver',
    effects: [{ type: 'crit_chance', value: 12 }],
  },
  {
    id: 'k_pre_cool', name: 'Pre-Cooled Chambers', icon: '🧊',
    description: 'Start battles with cooler systems. Lower initial heat.',
    rarity: 'silver',
    effects: [{ type: 'start_heat_reduce', value: 10 }],
  },

  // ── Gold (rare, game-changing) ──
  {
    id: 'k_axiom_echo', name: 'AXIOM Echo Core', icon: '✦',
    description: 'A resonance of AXIOM-0\'s original consciousness. Everything improves.',
    rarity: 'gold',
    effects: [
      { type: 'team_atk_pct', value: 8 },
      { type: 'team_def_pct', value: 8 },
      { type: 'team_hp', value: 15 },
      { type: 'team_thresh', value: 10 },
    ],
  },
  {
    id: 'k_overcharge', name: 'Overcharge Regulator', icon: '⚡',
    description: 'Channels heat into raw power. The hotter you burn, the harder you hit.',
    rarity: 'gold',
    effects: [
      { type: 'team_atk_pct', value: 15 },
      { type: 'team_thresh', value: 20 },
      { type: 'heat_reduce', value: 12 },
    ],
  },
  {
    id: 'k_soul_anchor', name: 'Soul Anchor', icon: '🌀',
    description: 'Tethers consciousness to the material plane. Massive healing + virus immunity.',
    rarity: 'gold',
    effects: [
      { type: 'heal_per_battle', value: 35 },
      { type: 'virus_resist', value: 100 },
      { type: 'team_hp', value: 20 },
    ],
  },
  {
    id: 'k_forge_heart', name: 'Forge Heart', icon: '🔥',
    description: 'The heart of an ancient factory. Tremendous offensive boost.',
    rarity: 'gold',
    effects: [
      { type: 'team_atk', value: 15 },
      { type: 'team_atk_pct', value: 12 },
      { type: 'crit_chance', value: 10 },
    ],
  },
];

// ── Keepsake drop helpers ──
const WEIGHTS: Record<KeepsakeRarity, number> = { bronze: 55, silver: 35, gold: 10 };

export function rollKeepsakeRarity(): KeepsakeRarity {
  const roll = Math.random() * 100;
  if (roll < WEIGHTS.gold) return 'gold';
  if (roll < WEIGHTS.gold + WEIGHTS.silver) return 'silver';
  return 'bronze';
}

export function getRandomKeepsakes(count: number, exclude: string[] = []): Keepsake[] {
  const pool = KEEPSAKE_POOL.filter(k => !exclude.includes(k.id));
  const results: Keepsake[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const rarity = rollKeepsakeRarity();
    const candidates = pool.filter(k => k.rarity === rarity);
    if (candidates.length === 0) {
      // Fallback to any available
      const idx = Math.floor(Math.random() * pool.length);
      results.push(pool.splice(idx, 1)[0]);
    } else {
      const idx = Math.floor(Math.random() * candidates.length);
      const picked = candidates[idx];
      pool.splice(pool.indexOf(picked), 1);
      results.push(picked);
    }
  }

  return results;
}

export function keepsakeRarityColor(rarity: KeepsakeRarity): string {
  return rarity === 'gold' ? '#f0a84a' : rarity === 'silver' ? '#c0c0c0' : '#cd7f32';
}

export function keepsakeRarityNum(rarity: KeepsakeRarity): number {
  return rarity === 'gold' ? 0xf0a84a : rarity === 'silver' ? 0xc0c0c0 : 0xcd7f32;
}
