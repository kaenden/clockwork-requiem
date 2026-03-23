import type { Part, PowerSource, PartCategory, Rarity } from '@/types';

// ── Part template pool ──
// These are templates; actual drops get a unique ID at runtime

const p = (
  name: string, cat: PartCategory, rarity: Rarity, source: PowerSource,
  heatCost: number, mods: Part['statMods'], virusChance?: number
): Omit<Part, 'id'> => ({
  name, category: cat, rarity, powerSource: source,
  heatCost, statMods: mods, virusChance,
});

export const PART_POOL: Omit<Part, 'id'>[] = [
  // ═══ STEAM PARTS ═══
  // Power Cores
  p('Piston Driver',    'power_core', 'common',    'steam', 3,  [{ stat: 'atk', value: 5 }]),
  p('Forge Hammer',     'power_core', 'uncommon',  'steam', 5,  [{ stat: 'atk', value: 10 }]),
  p('Pressure Cannon',  'power_core', 'rare',      'steam', 8,  [{ stat: 'atk', value: 18 }, { stat: 'spd', value: -5 }]),
  p('Titan Engine',     'power_core', 'epic',      'steam', 14, [{ stat: 'atk', value: 28 }, { stat: 'def', value: 10 }]),
  p('Inferno Core',     'power_core', 'legendary', 'steam', 40, [{ stat: 'atk', value: 45 }, { stat: 'def', value: 20 }, { stat: 'spd', value: -10 }]),

  // Armor Plates
  p('Iron Plating',     'armor_plate', 'common',   'steam', 2,  [{ stat: 'def', value: 5 }, { stat: 'hp', value: 8 }, { stat: 'maxHp', value: 8 }]),
  p('Reinforced Hull',  'armor_plate', 'uncommon', 'steam', 3,  [{ stat: 'def', value: 10 }, { stat: 'hp', value: 15 }, { stat: 'maxHp', value: 15 }]),
  p('Blast Shield',     'armor_plate', 'rare',     'steam', 5,  [{ stat: 'def', value: 20 }, { stat: 'hp', value: 25 }, { stat: 'maxHp', value: 25 }]),

  // Movement
  p('Steam Pistons',    'movement', 'common',      'steam', 3,  [{ stat: 'spd', value: 5 }]),
  p('Hydraulic Legs',   'movement', 'rare',        'steam', 6,  [{ stat: 'spd', value: 15 }, { stat: 'def', value: 5 }]),

  // Cooling
  p('Vent Array',       'cooling', 'uncommon',     'steam', -5, []),  // negative = raises thresh
  p('Pressure Relief',  'cooling', 'rare',         'steam', -10,[]),
  p('Boiler Regulator', 'cooling', 'epic',         'steam', -18,[{ stat: 'def', value: 5 }]),

  // Protocol
  p('Momentum Drive',   'protocol_chip', 'rare',   'steam', 5,  [{ stat: 'atk', value: 3 }]),

  // ═══ ELECTRIC PARTS ═══
  // Power Cores
  p('Spark Coil',       'power_core', 'common',    'electric', 4,  [{ stat: 'atk', value: 7 }]),
  p('Arc Emitter',      'power_core', 'uncommon',  'electric', 6,  [{ stat: 'atk', value: 14 }]),
  p('Tesla Array',      'power_core', 'rare',      'electric', 10, [{ stat: 'atk', value: 22 }, { stat: 'spd', value: 8 }]),
  p('Lightning Heart',  'power_core', 'epic',      'electric', 16, [{ stat: 'atk', value: 35 }, { stat: 'spd', value: 12 }]),
  p('Storm Nexus',      'power_core', 'legendary', 'electric', 35, [{ stat: 'atk', value: 50 }, { stat: 'spd', value: 20 }]),

  // Armor
  p('Insulated Shell',  'armor_plate', 'common',   'electric', 2,  [{ stat: 'def', value: 3 }, { stat: 'hp', value: 5 }, { stat: 'maxHp', value: 5 }]),
  p('Faraday Cage',     'armor_plate', 'rare',     'electric', 5,  [{ stat: 'def', value: 12 }, { stat: 'hp', value: 15 }, { stat: 'maxHp', value: 15 }]),

  // Movement
  p('Mag-Lev Coils',    'movement', 'common',      'electric', 3,  [{ stat: 'spd', value: 10 }]),
  p('Surge Accelerator','movement', 'rare',        'electric', 7,  [{ stat: 'spd', value: 25 }]),
  p('Flash Drive',      'movement', 'epic',        'electric', 12, [{ stat: 'spd', value: 35 }, { stat: 'atk', value: 5 }]),

  // Cooling
  p('Heat Sink',        'cooling', 'uncommon',     'electric', -6, []),
  p('Cryo Circuit',     'cooling', 'rare',         'electric', -12,[]),
  p('Absolute Zero',    'cooling', 'epic',         'electric', -20,[{ stat: 'spd', value: -5 }]),

  // Protocol
  p('Overclock Chip',   'protocol_chip', 'rare',   'electric', 6,  [{ stat: 'spd', value: 8 }, { stat: 'atk', value: 5 }]),

  // ═══ SOUL PARTS ═══
  // Power Cores
  p('Whisper Shard',    'power_core', 'common',    'soul', 4,  [{ stat: 'atk', value: 8 }, { stat: 'syn', value: 5 }]),
  p('Echo Lens',        'power_core', 'uncommon',  'soul', 7,  [{ stat: 'atk', value: 15 }, { stat: 'syn', value: 10 }]),
  p('Resonance Chamber','power_core', 'rare',      'soul', 11, [{ stat: 'atk', value: 25 }, { stat: 'syn', value: 15 }]),
  p('Void Conduit',     'power_core', 'epic',      'soul', 18, [{ stat: 'atk', value: 38 }, { stat: 'syn', value: 25 }]),
  p('Consciousness Core','power_core','legendary', 'soul', 38, [{ stat: 'atk', value: 55 }, { stat: 'syn', value: 40 }]),

  // Armor
  p('Spectral Shroud',  'armor_plate', 'common',   'soul', 2,  [{ stat: 'def', value: 4 }, { stat: 'hp', value: 6 }, { stat: 'maxHp', value: 6 }]),
  p('Memory Barrier',   'armor_plate', 'rare',     'soul', 6,  [{ stat: 'def', value: 15 }, { stat: 'hp', value: 20 }, { stat: 'maxHp', value: 20 }, { stat: 'syn', value: 8 }]),

  // Movement
  p('Phase Shifter',    'movement', 'common',      'soul', 3,  [{ stat: 'spd', value: 8 }, { stat: 'syn', value: 3 }]),
  p('Blink Module',     'movement', 'rare',        'soul', 8,  [{ stat: 'spd', value: 20 }, { stat: 'syn', value: 10 }]),

  // Cooling
  p('Soul Anchor',      'cooling', 'uncommon',     'soul', -5, [{ stat: 'syn', value: 5 }]),
  p('Void Coolant',     'cooling', 'rare',         'soul', -12,[{ stat: 'syn', value: 8 }]),
  p('Equilibrium Matrix','cooling', 'epic',        'soul', -22,[{ stat: 'syn', value: 15 }]),

  // Protocol
  p('Empathy Link',     'protocol_chip', 'rare',   'soul', 6,  [{ stat: 'syn', value: 15 }]),

  // ═══ KENET PARTS (enemy drops — high power, virus risk) ═══
  p('Kenet Claw',       'kenet_part', 'kenet',     'steam',    10, [{ stat: 'atk', value: 30 }], 0.15),
  p('Kenet Relay',      'kenet_part', 'kenet',     'electric', 10, [{ stat: 'atk', value: 25 }, { stat: 'spd', value: 15 }], 0.2),
  p('Kenet Whisper',    'kenet_part', 'kenet',     'soul',     10, [{ stat: 'atk', value: 28 }, { stat: 'syn', value: 20 }], 0.25),
  p('Kenet Plating',    'kenet_part', 'kenet',     'steam',    8,  [{ stat: 'def', value: 25 }, { stat: 'hp', value: 30 }, { stat: 'maxHp', value: 30 }], 0.1),
];
