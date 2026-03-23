import type { UnitConfig, PowerSource, Directive } from '@/types';
import { metaState } from '@/state/MetaStateManager';

// ── Saved PvP Configuration (Ghost Snapshot) ──
export interface PvpSnapshot {
  id: string;
  name: string;
  timestamp: number;
  ascension: number;
  units: PvpUnitSnapshot[];
  rating: number;
}

export interface PvpUnitSnapshot {
  name: string;
  powerSource: PowerSource;
  bodyType: string | null;
  weaponModule: string | null;
  level: number;
  stats: { hp: number; maxHp: number; atk: number; def: number; spd: number; thresh: number; syn: number };
  partNames: string[];
  directive: Directive;
}

const STORAGE_KEY = 'cr_pvp_snapshots';
const STORAGE_KEY_LEADERBOARD = 'cr_pvp_leaderboard';

// ── Pre-built ghost opponents for when player has no saves ──
function generateSampleGhosts(): PvpSnapshot[] {
  const makeUnit = (
    name: string, src: PowerSource, lvl: number,
    atk: number, def: number, spd: number, hp: number, thresh: number,
    dir: Directive = 'attack'
  ): PvpUnitSnapshot => ({
    name, powerSource: src, bodyType: null, weaponModule: null, level: lvl,
    stats: { hp, maxHp: hp, atk, def, spd, thresh, syn: src === 'soul' ? 60 : 15 },
    partNames: [], directive: dir,
  });

  return [
    {
      id: 'ghost_iron_wall', name: 'IRON WALL', timestamp: 0, ascension: 0, rating: 1000,
      units: [
        makeUnit('AXIOM-0', 'steam', 8, 85, 70, 38, 160, 90, 'attack'),
        makeUnit('Boiler-7', 'steam', 6, 70, 55, 33, 140, 85, 'defend'),
        makeUnit('Anvil-9', 'steam', 5, 65, 60, 30, 130, 88, 'defend'),
      ],
    },
    {
      id: 'ghost_storm_rush', name: 'STORM RUSH', timestamp: 0, ascension: 0, rating: 1100,
      units: [
        makeUnit('AXIOM-0', 'electric', 10, 110, 28, 105, 65, 55, 'attack'),
        makeUnit('Spark-6', 'electric', 7, 95, 22, 98, 55, 50, 'attack'),
        makeUnit('Arc-5', 'electric', 6, 88, 20, 92, 50, 48, 'berserker'),
      ],
    },
    {
      id: 'ghost_echo_choir', name: 'ECHO CHOIR', timestamp: 0, ascension: 1, rating: 1200,
      units: [
        makeUnit('AXIOM-0', 'soul', 12, 120, 40, 70, 90, 68, 'attack'),
        makeUnit('Echo-3', 'soul', 8, 100, 32, 62, 75, 60, 'target'),
        makeUnit('Shade-7', 'soul', 7, 95, 30, 58, 70, 62, 'attack'),
        makeUnit('Piston-4', 'steam', 6, 72, 55, 34, 130, 85, 'defend'),
      ],
    },
    {
      id: 'ghost_thermal_bomb', name: 'THERMAL BOMB', timestamp: 0, ascension: 2, rating: 1350,
      units: [
        makeUnit('AXIOM-0', 'steam', 15, 95, 75, 40, 180, 95, 'conserve'),
        makeUnit('Volt-8', 'electric', 12, 115, 25, 100, 60, 45, 'berserker'),
        makeUnit('Wire-0', 'electric', 10, 105, 22, 95, 55, 42, 'berserker'),
        makeUnit('Boiler-7', 'steam', 10, 80, 65, 36, 155, 90, 'defend'),
        makeUnit('Furnace-2', 'steam', 8, 75, 60, 32, 145, 88, 'defend'),
      ],
    },
  ];
}

export const PvpManager = {
  // ── Save current team as PvP snapshot ──
  saveSnapshot(units: UnitConfig[], name: string): PvpSnapshot {
    const snapshot: PvpSnapshot = {
      id: `snap_${Date.now()}`,
      name,
      timestamp: Date.now(),
      ascension: metaState.get().ascensionLevel,
      rating: metaState.get().pvpRating,
      units: units.filter(u => u.alive).map(u => ({
        name: u.name,
        powerSource: u.powerSource,
        bodyType: u.bodyType,
        weaponModule: u.weaponModule,
        level: u.level,
        stats: {
          hp: u.stats.maxHp, maxHp: u.stats.maxHp,
          atk: u.stats.atk, def: u.stats.def, spd: u.stats.spd,
          thresh: u.stats.thresh, syn: u.stats.syn,
        },
        partNames: u.parts.map(p => p.name),
        directive: u.directive,
      })),
    };

    const existing = this.getSnapshots();
    existing.push(snapshot);
    // Keep only last 10
    const trimmed = existing.slice(-10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return snapshot;
  },

  // ── Get saved snapshots ──
  getSnapshots(): PvpSnapshot[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  // ── Get opponents (saved + sample ghosts) ──
  getOpponents(): PvpSnapshot[] {
    const saved = this.getSnapshots();
    const samples = generateSampleGhosts();
    // Filter out samples whose rating is too far from player
    const playerRating = metaState.get().pvpRating;
    const relevant = samples.filter(s => Math.abs(s.rating - playerRating) < 500);
    return [...relevant, ...saved].sort((a, b) => a.rating - b.rating);
  },

  // ── Convert snapshot to UnitConfig[] for battle ──
  snapshotToUnits(snapshot: PvpSnapshot): UnitConfig[] {
    let id = 0;
    return snapshot.units.map(s => ({
      id: `ghost_${snapshot.id}_${id++}`,
      name: s.name,
      isAxiom: s.name.includes('AXIOM'),
      powerSource: s.powerSource,
      bodyType: (s.bodyType as any) ?? null,
      weaponModule: (s.weaponModule as any) ?? null,
      level: s.level,
      xp: 0,
      stats: { ...s.stats, heat: 0 },
      parts: [],
      directive: s.directive,
      statusEffects: [],
      alive: true,
    }));
  },

  // ── Rating update after PvP match ──
  updateRating(won: boolean, opponentRating: number): number {
    const playerRating = metaState.get().pvpRating;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    const k = 32;
    const delta = Math.round(k * ((won ? 1 : 0) - expected));
    metaState.updatePvpRating(delta);
    return delta;
  },

  // ── Leaderboard ──
  getLeaderboard(): { name: string; rating: number; wins: number }[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  },

  recordToLeaderboard(name: string, rating: number, won: boolean): void {
    const board = this.getLeaderboard();
    const existing = board.find(e => e.name === name);
    if (existing) {
      existing.rating = rating;
      if (won) existing.wins++;
    } else {
      board.push({ name, rating, wins: won ? 1 : 0 });
    }
    board.sort((a, b) => b.rating - a.rating);
    localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(board.slice(0, 50)));
  },

  // ── Heat Bet: enter at 80% heat for bonus ──
  applyHeatBet(units: UnitConfig[]): void {
    for (const unit of units) {
      unit.stats.heat = Math.round(unit.stats.thresh * 0.8);
    }
  },
};
