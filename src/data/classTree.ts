import type { BodyType, WeaponModule, UnitStats } from '@/types';

// ── Body Type stat bonuses (applied at Lv.10 split) ──
export interface BodyBonus {
  stats: Partial<UnitStats>;
  passive: string; // description for UI
}

export const BODY_BONUSES: Record<BodyType, BodyBonus> = {
  // Steam bodies
  cast:      { stats: { atk: 15, hp: 20, maxHp: 20, def: 5 },          passive: 'Heavy Strikes: +15% base ATK damage' },
  armor:     { stats: { def: 25, hp: 30, maxHp: 30, spd: -5 },         passive: 'Fortified: -20% incoming damage' },
  boiler:    { stats: { atk: 10, thresh: 15 },                          passive: 'Heat Convert: gain ATK equal to 10% of current HEAT' },
  // Electric bodies
  wire:      { stats: { atk: 10, spd: 15 },                            passive: 'Chain Arc: attacks splash 20% to one adjacent enemy' },
  lens:      { stats: { atk: 20, spd: 10, def: -5 },                   passive: 'Precision: 25% chance to ignore DEF' },
  relay:     { stats: { spd: 10, def: 5, thresh: 10 },                 passive: 'Amplify: nearby allies gain +10% ATK' },
  // Soul bodies
  cage:      { stats: { atk: 12, syn: 20 },                            passive: 'Drain: heal 15% of damage dealt' },
  resonance: { stats: { atk: 8, syn: 25, hp: 10, maxHp: 10 },         passive: 'Echo Pulse: deal bonus SYN-based damage each turn' },
  echo:      { stats: { spd: 20, syn: 15 },                            passive: 'Mirror: 20% chance to repeat last attack' },
};

// ── Weapon Module stat bonuses + ability (applied at Lv.20 split) ──
export interface WeaponBonus {
  stats: Partial<UnitStats>;
  abilityName: string;
  abilityDesc: string;
  abilityType: WeaponAbilityType;
}

export type WeaponAbilityType =
  | 'heavy_hit'        // massive single damage
  | 'counter'          // counter on being hit
  | 'multi_hit'        // hit 3 times (reduced damage)
  | 'siege'            // bonus damage to high-HP targets
  | 'taunt'            // force enemies to target this unit
  | 'def_steal'        // steal DEF from target
  | 'heat_convert'     // convert heat to damage
  | 'aoe_burn'         // AoE + apply overheat
  | 'safe_explode'     // controlled explosion (no self-death)
  | 'chain_stun'       // chain damage + short circuit
  | 'chain_all'        // hit ALL enemies (diminishing)
  | 'buff_allies'      // boost ally electric damage
  | 'crit_pen'         // armor penetration + crit
  | 'reflect'          // reflect damage back
  | 'burn_def'         // ignore portion of DEF
  | 'heal_allies'      // heal allies each turn
  | 'team_atk'         // boost team ATK
  | 'disable'          // apply freeze to target
  | 'phase_through'    // ignore DEF entirely
  | 'life_drain'       // steal HP
  | 'root'             // prevent target from acting
  | 'aoe_syn'          // AoE based on SYN
  | 'knockback'        // damage + reduce SPD
  | 'sync_team'        // share SYN bonuses
  | 'repeat_attack'    // repeat previous attack
  | 'clone'            // bonus phantom attack
  | 'copy_ability';    // copy target's weapon ability

export const WEAPON_BONUSES: Record<WeaponModule, WeaponBonus> = {
  // Steam → Cast
  piston_fist:    { stats: { atk: 20 },                abilityName: 'PISTON FIST',    abilityDesc: 'Deal 200% ATK damage',               abilityType: 'heavy_hit' },
  iron_bastion:   { stats: { def: 15, hp: 15, maxHp: 15 }, abilityName: 'IRON BASTION',  abilityDesc: 'Counter-attack when hit (50% ATK)',  abilityType: 'counter' },
  steel_storm:    { stats: { atk: 8, spd: 8 },         abilityName: 'STEEL STORM',    abilityDesc: 'Strike 3 times at 60% damage each',   abilityType: 'multi_hit' },
  // Steam → Armor
  artillery:      { stats: { atk: 18, spd: -8 },       abilityName: 'ARTILLERY',      abilityDesc: 'Bonus damage to targets above 50% HP', abilityType: 'siege' },
  barricade:      { stats: { def: 20, hp: 25, maxHp: 25 }, abilityName: 'BARRICADE',   abilityDesc: 'Taunt: enemies must target this unit', abilityType: 'taunt' },
  requisitor:     { stats: { atk: 10, def: 10 },       abilityName: 'REQUISITOR',     abilityDesc: 'Steal 30% of target DEF',              abilityType: 'def_steal' },
  // Steam → Boiler
  furnace:        { stats: { atk: 15, thresh: 10 },    abilityName: 'FURNACE',        abilityDesc: 'Convert current HEAT into bonus damage', abilityType: 'heat_convert' },
  steamer:        { stats: { atk: 12 },                abilityName: 'STEAMER',        abilityDesc: 'AoE damage + apply Overheat to enemies', abilityType: 'aoe_burn' },
  pressure_blast: { stats: { atk: 10, thresh: 20 },    abilityName: 'PRESSURE BLAST', abilityDesc: 'Controlled explosion (AoE, no self-death)', abilityType: 'safe_explode' },
  // Electric → Wire
  arc_welder:     { stats: { atk: 14, spd: 5 },        abilityName: 'ARC WELDER',     abilityDesc: 'Chain damage + Short Circuit target',  abilityType: 'chain_stun' },
  chain_lightning:{ stats: { atk: 10, spd: 10 },       abilityName: 'CHAIN LIGHTNING',abilityDesc: 'Hit ALL enemies (80%→60%→40%...)',      abilityType: 'chain_all' },
  conductor:      { stats: { spd: 12, atk: 5 },        abilityName: 'CONDUCTOR',      abilityDesc: 'Amplify ally electric attack +30%',    abilityType: 'buff_allies' },
  // Electric → Lens
  sharpshooter:   { stats: { atk: 18, spd: 8 },        abilityName: 'SHARPSHOOTER',   abilityDesc: 'Crit chance + ignore 50% DEF',         abilityType: 'crit_pen' },
  mirror_array:   { stats: { def: 10, spd: 5 },        abilityName: 'MIRROR ARRAY',   abilityDesc: 'Reflect 40% of received damage back',  abilityType: 'reflect' },
  scorcher:       { stats: { atk: 16, spd: 5 },        abilityName: 'SCORCHER',       abilityDesc: 'Burn through DEF (ignore 70%)',         abilityType: 'burn_def' },
  // Electric → Relay
  support_net:    { stats: { def: 8, spd: 8, syn: 10 },abilityName: 'SUPPORT NET',    abilityDesc: 'Heal all allies 10% maxHP each turn',  abilityType: 'heal_allies' },
  amplifier:      { stats: { atk: 8, spd: 10 },        abilityName: 'AMPLIFIER',      abilityDesc: 'Boost entire team ATK by 15%',         abilityType: 'team_atk' },
  circuit_breaker:{ stats: { spd: 15, def: 5 },        abilityName: 'CIRCUIT BREAKER',abilityDesc: 'Freeze target for 1 turn',              abilityType: 'disable' },
  // Soul → Cage
  phantom:        { stats: { atk: 15, syn: 10 },       abilityName: 'PHANTOM',        abilityDesc: 'Phase through DEF entirely',            abilityType: 'phase_through' },
  absorber:       { stats: { atk: 10, syn: 15 },       abilityName: 'ABSORBER',       abilityDesc: 'Steal 25% of damage dealt as HP',       abilityType: 'life_drain' },
  binder:         { stats: { syn: 20, def: 5 },        abilityName: 'BINDER',         abilityDesc: 'Root: target skips next action',        abilityType: 'root' },
  // Soul → Resonance
  scream:         { stats: { atk: 12, syn: 18 },       abilityName: 'SCREAM',         abilityDesc: 'AoE SYN-based damage to all enemies',   abilityType: 'aoe_syn' },
  wave:           { stats: { atk: 10, spd: 8, syn: 12 }, abilityName: 'WAVE',         abilityDesc: 'Damage + reduce target SPD by 50%',     abilityType: 'knockback' },
  harmony:        { stats: { syn: 25, hp: 10, maxHp: 10 }, abilityName: 'HARMONY',    abilityDesc: 'Sync: all soul allies share SYN bonus',  abilityType: 'sync_team' },
  // Soul → Echo
  echo_strike:    { stats: { atk: 14, spd: 10, syn: 10 }, abilityName: 'ECHO STRIKE', abilityDesc: 'Repeat last attack at 70% power',       abilityType: 'repeat_attack' },
  shadow:         { stats: { atk: 12, syn: 12 },       abilityName: 'SHADOW',         abilityDesc: 'Summon phantom: bonus attack at 50%',    abilityType: 'clone' },
  reflection:     { stats: { syn: 20, spd: 8 },        abilityName: 'REFLECTION',     abilityDesc: 'Copy enemy weapon ability for 1 turn',   abilityType: 'copy_ability' },
};
