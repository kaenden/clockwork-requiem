import type { PowerSource, UnitStats } from '@/types';

// ── Game Dimensions ──
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// ── Heat / Overload Thresholds ──
export const HEAT_PHASE = {
  SAFE_MAX: 40,        // 0-40%
  WARNING_MAX: 70,     // 40-70%
  CRITICAL_MAX: 90,    // 70-90%
  // 90%+ = meltdown
} as const;

export const HEAT_CRITICAL_PER_TURN = 2;
export const HEAT_CRITICAL_DAMAGE_BONUS = 0.5;   // +50%
export const HEAT_CRITICAL_HEAT_PENALTY = 0.4;    // +40%

// ── Compatibility Heat Multipliers ──
export const COMPAT_HEAT = {
  full: 1.0,
  partial: 1.2,    // +20%
  conflict: 1.5,   // +50%
} as const;

// ── AXIOM-0 Limits ──
export const AXIOM_MAX_FOREIGN_PARTS = 2;

// ── Level Splits ──
export const BODY_SPLIT_LEVEL = 10;
export const WEAPON_SPLIT_LEVEL = 20;

// ── Team ──
export const MAX_TEAM_SIZE = 5;  // AXIOM + 4

// ── Zone Config ──
export const ZONE_ROOMS_MIN = 6;
export const ZONE_ROOMS_MAX = 9;

// ── Rarity Drop Weights ──
export const RARITY_WEIGHTS = {
  common:    40,
  uncommon:  28,
  rare:      18,
  epic:       9,
  legendary:  4,
  kenet:      1,
} as const;

// ── Rarity Heat Cost Multipliers ──
export const RARITY_HEAT_MULT = {
  common:    1.0,
  uncommon:  1.3,
  rare:      1.8,
  epic:      2.5,
  legendary: 4.0,
  kenet:     3.5,
} as const;

// ── Base Stats per Power Source ──
export const BASE_STATS: Record<PowerSource, UnitStats> = {
  steam: {
    hp: 95, maxHp: 95,
    atk: 70, def: 60, spd: 35,
    heat: 0, thresh: 100, syn: 10,
  },
  electric: {
    hp: 45, maxHp: 45,
    atk: 85, def: 25, spd: 95,
    heat: 0, thresh: 60, syn: 20,
  },
  soul: {
    hp: 60, maxHp: 60,
    atk: 90, def: 35, spd: 65,
    heat: 0, thresh: 75, syn: 80,
  },
};

// ── Level Scaling ──
export const XP_PER_LEVEL = 100;
export const STAT_GROWTH_PER_LEVEL: Record<PowerSource, Partial<UnitStats>> = {
  steam:    { hp: 8, maxHp: 8, atk: 4, def: 5, spd: 1 },
  electric: { hp: 3, maxHp: 3, atk: 6, def: 1, spd: 5 },
  soul:     { hp: 5, maxHp: 5, atk: 7, def: 2, spd: 3 },
};

// ── Salvage ──
export const SALVAGE_NORMAL_COUNT = { min: 1, max: 2 };
export const SALVAGE_ELITE_COUNT = { min: 2, max: 3 };
export const SALVAGE_BOSS_COUNT = { min: 3, max: 4 };

// ── Colors (for UI) ──
export const COLORS = {
  bg:      0x0d0c0b,
  surface: 0x1a1815,
  border:  0x2a2620,

  copper:  0xb87333,
  copper2: 0xd4893a,
  copper3: 0xf0a84a,
  rust:    0x8b3a2a,
  rust2:   0xc0432e,

  steam:   0xc0732a,
  steam2:  0xe8913a,
  elec:    0x1a7a9e,
  elec2:   0x2aa8d4,
  soul:    0x6b2fa0,
  soul2:   0x9b52d4,

  text:    0xf0e8d8,
  text2:   0xe0d4bc,
  text3:   0xa89878,

  safe:    0x4cae6e,
  warning: 0xd4a82a,
  critical:0xc0432e,
  meltdown:0xff6b4a,
} as const;
