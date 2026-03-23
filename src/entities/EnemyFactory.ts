import type { UnitConfig, PowerSource, Zone, RoomType } from '@/types';

let enemyIdCounter = 0;

const ZONE_POWER: Record<Zone, PowerSource> = {
  boiler_works: 'steam',
  voltage_archives: 'electric',
  soul_labs: 'soul',
  kenet_heart: 'steam', // mixed, but default steam
};

const ENEMY_NAMES: Record<PowerSource, string[]> = {
  steam:    ['Boiler Drone', 'Piston Sentinel', 'Furnace Hulk', 'Valve Breaker', 'Steam Lurker'],
  electric: ['Arc Crawler', 'Spark Swarm', 'Relay Ghost', 'Volt Lancer', 'Wire Wraith'],
  soul:     ['Echo Fragment', 'Cage Howler', 'Resonance Shade', 'Memory Eater', 'Void Husk'],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const EnemyFactory = {
  generateEnemies(zone: Zone, zoneIndex: number, roomType: RoomType): UnitConfig[] {
    const basePower = ZONE_POWER[zone];
    const difficulty = 1 + zoneIndex * 0.4;

    let count: number;
    switch (roomType) {
      case 'elite': count = rng(2, 3); break;
      case 'boss':  count = 1; break;
      default:      count = rng(2, 4); break;
    }

    const enemies: UnitConfig[] = [];
    for (let i = 0; i < count; i++) {
      // Kenet heart has mixed power sources
      const power = zone === 'kenet_heart'
        ? pick<PowerSource>(['steam', 'electric', 'soul'])
        : basePower;

      const isBoss = roomType === 'boss';
      const isElite = roomType === 'elite' && i === 0;
      const name = isBoss
        ? `KENET COMMANDER [${zone.toUpperCase()}]`
        : isElite
          ? `Elite ${pick(ENEMY_NAMES[power])}`
          : pick(ENEMY_NAMES[power]);

      const hpBase = isBoss ? 200 : isElite ? 120 : 60;
      const atkBase = isBoss ? 35 : isElite ? 25 : 15;
      const defBase = isBoss ? 30 : isElite ? 20 : 10;
      const spdBase = power === 'electric' ? 80 : power === 'soul' ? 55 : 30;

      enemies.push({
        id: `enemy_${++enemyIdCounter}`,
        name,
        isAxiom: false,
        powerSource: power,
        bodyType: null,
        weaponModule: null,
        level: Math.round(5 + zoneIndex * 5),
        xp: 0,
        stats: {
          hp: Math.round(hpBase * difficulty),
          maxHp: Math.round(hpBase * difficulty),
          atk: Math.round(atkBase * difficulty),
          def: Math.round(defBase * difficulty),
          spd: Math.round(spdBase * (0.9 + Math.random() * 0.2)),
          heat: 0,
          thresh: 100,
          syn: power === 'soul' ? 60 : 10,
        },
        parts: [],
        directive: 'attack',
        statusEffects: [],
        alive: true,
      });
    }

    return enemies;
  },

  // XP reward for defeating enemies
  getXpReward(enemies: UnitConfig[], roomType: RoomType): number {
    const base = enemies.reduce((sum, e) => sum + e.level * 5, 0);
    const mult = roomType === 'boss' ? 3 : roomType === 'elite' ? 2 : 1;
    return base * mult;
  },
};
