import type { UnitConfig, PowerSource, Zone, RoomType, WeaponModule, BodyType } from '@/types';

let enemyIdCounter = 0;

const ZONE_POWER: Record<Zone, PowerSource> = {
  boiler_works: 'steam',
  voltage_archives: 'electric',
  soul_labs: 'soul',
  kenet_heart: 'steam',
};

const ENEMY_NAMES: Record<PowerSource, string[]> = {
  steam:    ['Boiler Drone', 'Piston Sentinel', 'Furnace Hulk', 'Valve Breaker', 'Steam Lurker'],
  electric: ['Arc Crawler', 'Spark Swarm', 'Relay Ghost', 'Volt Lancer', 'Wire Wraith'],
  soul:     ['Echo Fragment', 'Cage Howler', 'Resonance Shade', 'Memory Eater', 'Void Husk'],
};

// Boss configurations per zone
const BOSS_CONFIG: Record<Zone, { name: string; power: PowerSource; body: BodyType; weapon: WeaponModule; hpMult: number; atkMult: number }> = {
  boiler_works: {
    name: 'KAZAN KOMUTANI',
    power: 'steam', body: 'boiler', weapon: 'furnace',
    hpMult: 3.0, atkMult: 2.0,
  },
  voltage_archives: {
    name: 'VOLTAJ ARSIVCI',
    power: 'electric', body: 'wire', weapon: 'chain_lightning',
    hpMult: 2.5, atkMult: 2.5,
  },
  soul_labs: {
    name: 'RUH DENEYCI',
    power: 'soul', body: 'resonance', weapon: 'scream',
    hpMult: 2.8, atkMult: 2.2,
  },
  kenet_heart: {
    name: 'KENET KALBI',
    power: 'soul', body: 'cage', weapon: 'absorber',
    hpMult: 4.0, atkMult: 3.0,
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const EnemyFactory = {
  generateEnemies(zone: Zone, zoneIndex: number, roomType: RoomType, ascension = 0): UnitConfig[] {
    const basePower = ZONE_POWER[zone];
    const difficulty = 1 + zoneIndex * 0.4;
    // Ascension scaling
    const ascMult = 1 + ascension * 0.1; // +10% stats per ascension

    let count: number;
    switch (roomType) {
      case 'elite': count = rng(2, 3); break;
      case 'boss':  count = 1; break;
      default:      count = rng(2, 4); break;
    }

    const enemies: UnitConfig[] = [];

    // Boss — unique per zone
    if (roomType === 'boss') {
      const boss = BOSS_CONFIG[zone] ?? BOSS_CONFIG.boiler_works;
      const hpBase = Math.round(200 * boss.hpMult * difficulty * ascMult);
      const atkBase = Math.round(35 * boss.atkMult * difficulty * ascMult);

      enemies.push({
        id: `enemy_${++enemyIdCounter}`,
        name: boss.name,
        isAxiom: false,
        powerSource: boss.power,
        bodyType: boss.body,
        weaponModule: boss.weapon,
        level: Math.round(10 + zoneIndex * 5),
        xp: 0,
        stats: {
          hp: hpBase, maxHp: hpBase,
          atk: atkBase,
          def: Math.round(30 * difficulty * ascMult),
          spd: boss.power === 'electric' ? 70 : boss.power === 'soul' ? 55 : 35,
          heat: 0, thresh: 150,
          syn: boss.power === 'soul' ? 80 : 15,
        },
        parts: [],
        directive: 'attack',
        statusEffects: [],
        alive: true,
      });

      // Boss adds 1-2 minions on higher ascension
      if (ascension >= 2) {
        const minionCount = ascension >= 5 ? 2 : 1;
        for (let m = 0; m < minionCount; m++) {
          enemies.push(this.createMinion(basePower, difficulty * 0.6, ascMult));
        }
      }

      return enemies;
    }

    // Normal / Elite enemies
    for (let i = 0; i < count; i++) {
      const power = zone === 'kenet_heart'
        ? pick<PowerSource>(['steam', 'electric', 'soul'])
        : basePower;

      const isElite = roomType === 'elite' && i === 0;
      const name = isElite
        ? `Elite ${pick(ENEMY_NAMES[power])}`
        : pick(ENEMY_NAMES[power]);

      const hpBase = isElite ? 120 : 60;
      const atkBase = isElite ? 25 : 15;
      const defBase = isElite ? 20 : 10;
      const spdBase = power === 'electric' ? 80 : power === 'soul' ? 55 : 30;

      // Elites get a weapon module for abilities
      const eliteWeapons: Record<PowerSource, WeaponModule> = {
        steam: pick<WeaponModule>(['piston_fist', 'artillery', 'steamer']),
        electric: pick<WeaponModule>(['arc_welder', 'sharpshooter', 'circuit_breaker']),
        soul: pick<WeaponModule>(['phantom', 'binder', 'wave']),
      };

      enemies.push({
        id: `enemy_${++enemyIdCounter}`,
        name,
        isAxiom: false,
        powerSource: power,
        bodyType: null,
        weaponModule: isElite ? eliteWeapons[power] : null,
        level: Math.round(5 + zoneIndex * 5),
        xp: 0,
        stats: {
          hp: Math.round(hpBase * difficulty * ascMult),
          maxHp: Math.round(hpBase * difficulty * ascMult),
          atk: Math.round(atkBase * difficulty * ascMult),
          def: Math.round(defBase * difficulty * ascMult),
          spd: Math.round(spdBase * (0.9 + Math.random() * 0.2)),
          heat: 0, thresh: 100,
          syn: power === 'soul' ? 60 : 10,
        },
        parts: [],
        directive: isElite ? 'attack' : pick<any>(['attack', 'attack', 'defend']),
        statusEffects: [],
        alive: true,
      });
    }

    return enemies;
  },

  createMinion(power: PowerSource, difficulty: number, ascMult: number): UnitConfig {
    return {
      id: `enemy_${++enemyIdCounter}`,
      name: `Kenet ${pick(ENEMY_NAMES[power])}`,
      isAxiom: false,
      powerSource: power,
      bodyType: null, weaponModule: null,
      level: 5, xp: 0,
      stats: {
        hp: Math.round(40 * difficulty * ascMult),
        maxHp: Math.round(40 * difficulty * ascMult),
        atk: Math.round(12 * difficulty * ascMult),
        def: Math.round(8 * difficulty * ascMult),
        spd: 40, heat: 0, thresh: 80, syn: 10,
      },
      parts: [], directive: 'attack', statusEffects: [], alive: true,
    };
  },

  getXpReward(enemies: UnitConfig[], roomType: RoomType): number {
    const base = enemies.reduce((sum, e) => sum + e.level * 5, 0);
    const mult = roomType === 'boss' ? 3 : roomType === 'elite' ? 2 : 1;
    return base * mult;
  },
};
