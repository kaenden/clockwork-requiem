// ── Power Sources ──
export type PowerSource = 'steam' | 'electric' | 'soul';

// ── Body Types (Lv.10 split) ──
export type SteamBody = 'cast' | 'armor' | 'boiler';        // Dokme, Zirh, Kazan
export type ElectricBody = 'wire' | 'lens' | 'relay';       // Tel, Lens, Role
export type SoulBody = 'cage' | 'resonance' | 'echo';       // Kafes, Rezonans, Yanki
export type BodyType = SteamBody | ElectricBody | SoulBody;

// ── Weapon Modules (Lv.20 split) ──
// Steam → Cast
export type CastWeapon = 'piston_fist' | 'iron_bastion' | 'steel_storm';
// Steam → Armor
export type ArmorWeapon = 'artillery' | 'barricade' | 'requisitor';
// Steam → Boiler
export type BoilerWeapon = 'furnace' | 'steamer' | 'pressure_blast';
// Electric → Wire
export type WireWeapon = 'arc_welder' | 'chain_lightning' | 'conductor';
// Electric → Lens
export type LensWeapon = 'sharpshooter' | 'mirror_array' | 'scorcher';
// Electric → Relay
export type RelayWeapon = 'support_net' | 'amplifier' | 'circuit_breaker';
// Soul → Cage
export type CageWeapon = 'phantom' | 'absorber' | 'binder';
// Soul → Resonance
export type ResonanceWeapon = 'scream' | 'wave' | 'harmony';
// Soul → Echo
export type EchoWeapon = 'echo_strike' | 'shadow' | 'reflection';

export type WeaponModule =
  | CastWeapon | ArmorWeapon | BoilerWeapon
  | WireWeapon | LensWeapon | RelayWeapon
  | CageWeapon | ResonanceWeapon | EchoWeapon;

// ── Stats ──
export interface UnitStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  heat: number;
  thresh: number;  // overload threshold
  syn: number;     // consciousness score (soul critical)
}

// ── Rarity ──
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'kenet';

// ── Part Categories ──
export type PartCategory =
  | 'power_core'      // ATK boost, high heat
  | 'movement'        // SPD + positioning, mid heat
  | 'armor_plate'     // DEF + HP, low heat
  | 'cooling'         // THRESH boost (raises overload ceiling)
  | 'protocol_chip'   // passive ability
  | 'kenet_part';     // enemy part — very powerful, virus risk

// ── Stat Modifier ──
export interface StatMod {
  stat: keyof UnitStats;
  value: number;       // flat change
  percent?: number;    // percentage change
}

// ── Part ──
export interface Part {
  id: string;
  name: string;
  category: PartCategory;
  rarity: Rarity;
  powerSource: PowerSource;
  statMods: StatMod[];
  heatCost: number;         // how much it lowers thresh
  ability?: AbilityDef;
  virusChance?: number;     // kenet parts only (0-1)
}

// ── Ability ──
export type AbilityTrigger = 'on_attack' | 'on_hit' | 'on_turn_start' | 'on_turn_end' | 'on_kill' | 'on_overload' | 'passive';

export interface AbilityDef {
  id: string;
  name: string;
  trigger: AbilityTrigger;
  heatGenerated: number;
  description: string;
}

// ── Status Effects ──
export type StatusEffectType =
  | 'rust'              // DEF erosion, continuous
  | 'short_circuit'     // SPD = 0, 1 turn
  | 'overheat'          // ATK +30% but HEAT +5/turn
  | 'freeze'            // skip action
  | 'kenet_infection'   // temporary control loss
  | 'resonance';        // soul empathy damage

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;      // turns remaining (-1 = until cleared)
  potency: number;       // effect strength
  sourceId: string;
}

// ── Tactical Directives ──
export type Directive = 'attack' | 'defend' | 'target' | 'conserve' | 'berserker';

// ── Overload Phase ──
export type OverloadPhase = 'safe' | 'warning' | 'critical' | 'meltdown';

// ── Unit ──
export interface UnitConfig {
  id: string;
  name: string;
  isAxiom: boolean;
  powerSource: PowerSource;
  bodyType: BodyType | null;       // unlocked at Lv.10
  weaponModule: WeaponModule | null; // unlocked at Lv.20
  level: number;
  xp: number;
  stats: UnitStats;
  parts: Part[];
  directive: Directive;
  statusEffects: StatusEffect[];
  alive: boolean;
}

// ── Room Types ──
export type RoomType = 'battle' | 'repair' | 'terminal' | 'elite' | 'boss' | 'market';

// ── Map Node ──
export interface MapNode {
  id: string;
  type: RoomType;
  x: number;
  y: number;
  connections: string[];  // next node IDs
  visited: boolean;
  cleared: boolean;
}

// ── Zone ──
export type Zone = 'boiler_works' | 'voltage_archives' | 'soul_labs' | 'kenet_heart';

// ── Run State ──
export interface RunState {
  units: UnitConfig[];
  inventory: Part[];           // stash — unequipped parts
  map: MapNode[];
  currentNodeId: string | null;
  zone: Zone;
  zoneIndex: number;       // 0-3
  floor: number;
  ascension: number;
  consciousnessScore: number; // currency for market
  active: boolean;
}

// ── Meta State (persists across runs) ──
export interface MetaState {
  schemaBook: string[];           // discovered part IDs
  axiomJournals: string[];        // unlocked lore entry IDs
  configUnlocks: string[];        // unlocked starting configs
  explosionArchive: ExplosionRecord[];
  ascensionLevel: number;
  totalRuns: number;
  totalWins: number;
  pvpRating: number;
}

export interface ExplosionRecord {
  runId: string;
  unitName: string;
  partThatCaused: string;
  zone: Zone;
  floor: number;
  timestamp: number;
}

// ── Synergy ──
export type SynergyType =
  | 'shared_heat_pool'    // 2+ steam
  | 'chain_transmission'  // 2+ electric
  | 'soul_steam_shield'   // steam + soul
  | 'chaotic_synergy';    // all different

export interface ActiveSynergy {
  type: SynergyType;
  description: string;
}

// ── Compatibility ──
export type Compatibility = 'full' | 'partial' | 'conflict';
