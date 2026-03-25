import type { Part, Rarity, Zone, RoomType, PowerSource, Keepsake } from '@/types';
import { RARITY_WEIGHTS, SALVAGE_NORMAL_COUNT, SALVAGE_ELITE_COUNT, SALVAGE_BOSS_COUNT } from '@/data/constants';
import { PART_POOL } from '@/data/parts';

let partIdCounter = 0;

function weightedRandom(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const ZONE_POWER: Record<Zone, PowerSource | 'mixed'> = {
  boiler_works: 'steam',
  voltage_archives: 'electric',
  soul_labs: 'soul',
  kenet_heart: 'mixed',
};

// ── Drop chance per room type ──
// Not every battle guarantees loot!
const DROP_CHANCE: Record<RoomType, number> = {
  battle:   0.60,  // 60% — normal fights don't always drop
  elite:    0.90,  // 90% — elites almost always drop
  boss:     1.00,  // 100% — bosses always drop
  repair:   0,
  terminal: 0,
  market:   0,
};

export interface LootResult {
  parts: Part[];
  dropped: boolean;  // did anything drop at all?
}

export const LootGenerator = {
  /**
   * Roll for loot after a battle.
   * Returns parts array (possibly empty if drop chance fails).
   * keepsakes can boost drop count via salvage_extra effect.
   */
  roll(zone: Zone, roomType: RoomType, keepsakes: Keepsake[] = []): LootResult {
    const chance = DROP_CHANCE[roomType] ?? 0;
    if (Math.random() > chance) {
      return { parts: [], dropped: false };
    }

    // Base count by room type
    let count = roomType === 'boss'
      ? rng(SALVAGE_BOSS_COUNT.min, SALVAGE_BOSS_COUNT.max)
      : roomType === 'elite'
        ? rng(SALVAGE_ELITE_COUNT.min, SALVAGE_ELITE_COUNT.max)
        : rng(SALVAGE_NORMAL_COUNT.min, SALVAGE_NORMAL_COUNT.max);

    // Keepsake bonus
    const extraSalvage = keepsakes.reduce((sum, k) =>
      sum + k.effects.filter(e => e.type === 'salvage_extra').reduce((s, e) => s + e.value, 0), 0);
    count += extraSalvage;

    // Adjust rarity weights for room type
    const weights = { ...RARITY_WEIGHTS };
    if (roomType === 'elite') {
      weights.rare += 10;
      weights.epic += 5;
    }
    if (roomType === 'boss') {
      weights.rare += 15;
      weights.epic += 10;
      weights.legendary += 3;
      weights.kenet += 2;
    }

    const zonePower = ZONE_POWER[zone];
    const parts: Part[] = [];

    for (let i = 0; i < count; i++) {
      const rarity = weightedRandom(weights) as Rarity;

      let pool = PART_POOL.filter(p => p.rarity === rarity);
      if (pool.length === 0) pool = PART_POOL.filter(p => p.rarity === 'common');

      // 70% zone power bias
      let finalPool = pool;
      if (zonePower !== 'mixed') {
        const zonePool = pool.filter(p => p.powerSource === zonePower);
        const useZone = Math.random() < 0.7 && zonePool.length > 0;
        finalPool = useZone ? zonePool : pool;
      }

      const template = finalPool[Math.floor(Math.random() * finalPool.length)];
      parts.push({
        ...template,
        id: `part_${++partIdCounter}`,
      });
    }

    return { parts, dropped: true };
  },

  /** Legacy compat — returns parts directly */
  generate(zone: Zone, roomType: RoomType): Part[] {
    return this.roll(zone, roomType).parts;
  },
};
