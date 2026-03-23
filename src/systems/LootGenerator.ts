import type { Part, Rarity, Zone, RoomType, PowerSource } from '@/types';
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

export const LootGenerator = {
  // Generate salvage options after a battle
  generate(zone: Zone, roomType: RoomType): Part[] {
    const count = roomType === 'boss'
      ? rng(SALVAGE_BOSS_COUNT.min, SALVAGE_BOSS_COUNT.max)
      : roomType === 'elite'
        ? rng(SALVAGE_ELITE_COUNT.min, SALVAGE_ELITE_COUNT.max)
        : rng(SALVAGE_NORMAL_COUNT.min, SALVAGE_NORMAL_COUNT.max);

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

      // Filter pool by rarity, bias toward zone power source
      let pool = PART_POOL.filter(p => p.rarity === rarity);
      if (pool.length === 0) pool = PART_POOL.filter(p => p.rarity === 'common');

      // 70% chance to match zone power source (mixed = no bias, pick from full pool)
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

    return parts;
  },
};
