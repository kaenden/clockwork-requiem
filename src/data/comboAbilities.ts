import type { BodyType, WeaponModule, ComboAbility } from '@/types';

// ── 27 Combo Abilities ──
// Unlocked when a unit has BOTH a body type AND a weapon module.
// Each combo creates a unique passive or triggered ability.

export const COMBO_ABILITIES: ComboAbility[] = [
  // ═══ STEAM → CAST (3 combos) ═══
  { bodyType: 'cast', weaponModule: 'piston_fist',  name: 'METEOR FIST',       icon: '☄', description: 'First hit each battle deals 300% damage' },
  { bodyType: 'cast', weaponModule: 'iron_bastion',  name: 'IMMOVABLE OBJECT',  icon: '🗿', description: 'Cannot be killed in one hit. Survive with 1 HP once per battle' },
  { bodyType: 'cast', weaponModule: 'steel_storm',   name: 'IRON TORNADO',      icon: '🌀', description: 'Multi-hit now strikes ALL enemies once at 40% damage' },

  // ═══ STEAM → ARMOR (3 combos) ═══
  { bodyType: 'armor', weaponModule: 'artillery',    name: 'FORTRESS CANNON',   icon: '💥', description: 'If HP > 80%, ATK doubles for that turn' },
  { bodyType: 'armor', weaponModule: 'barricade',    name: 'UNBREAKABLE WALL',  icon: '🧱', description: 'Taunt + DEF increases by 20% each turn taunting' },
  { bodyType: 'armor', weaponModule: 'requisitor',   name: 'IRON TAX',          icon: '⚖', description: 'Steal 10% of ALL enemies\' DEF at battle start' },

  // ═══ STEAM → BOILER (3 combos) ═══
  { bodyType: 'boiler', weaponModule: 'furnace',     name: 'MELTDOWN ENGINE',   icon: '🔥', description: 'At 80%+ heat: ATK x2 and attacks burn all enemies' },
  { bodyType: 'boiler', weaponModule: 'steamer',     name: 'STEAM ERUPTION',    icon: '♨', description: 'AoE attacks now reduce enemy THRESH by 10' },
  { bodyType: 'boiler', weaponModule: 'pressure_blast', name: 'NOVA CORE',      icon: '💫', description: 'Controlled explosion also heals allies for 20% of damage dealt' },

  // ═══ ELECTRIC → WIRE (3 combos) ═══
  { bodyType: 'wire', weaponModule: 'arc_welder',    name: 'TESLA CHAINS',      icon: '⚡', description: 'Stun chains to adjacent enemy (50% chance)' },
  { bodyType: 'wire', weaponModule: 'chain_lightning', name: 'STORM CONDUCTOR', icon: '🌩', description: 'Chain hits no longer diminish — all targets take full damage' },
  { bodyType: 'wire', weaponModule: 'conductor',     name: 'SURGE NETWORK',     icon: '📡', description: 'All electric allies attack 20% faster' },

  // ═══ ELECTRIC → LENS (3 combos) ═══
  { bodyType: 'lens', weaponModule: 'sharpshooter',  name: 'PERFECT SHOT',      icon: '🎯', description: '50% crit chance. Crits ignore 100% DEF' },
  { bodyType: 'lens', weaponModule: 'mirror_array',  name: 'PRISM SHIELD',      icon: '🔮', description: 'Reflected damage is doubled and applied as AoE' },
  { bodyType: 'lens', weaponModule: 'scorcher',      name: 'FOCUSED BEAM',      icon: '🔆', description: 'Attacks deal bonus damage equal to 30% of target\'s max HP' },

  // ═══ ELECTRIC → RELAY (3 combos) ═══
  { bodyType: 'relay', weaponModule: 'support_net',  name: 'REPAIR ARRAY',      icon: '💚', description: 'Healing is doubled. Overheal becomes temporary shield' },
  { bodyType: 'relay', weaponModule: 'amplifier',    name: 'POWER GRID',        icon: '🔋', description: 'Team ATK boost stacks each turn (5% cumulative)' },
  { bodyType: 'relay', weaponModule: 'circuit_breaker', name: 'EMP BURST',      icon: '💫', description: 'Freeze now affects ALL enemies (1 turn, once per battle)' },

  // ═══ SOUL → CAGE (3 combos) ═══
  { bodyType: 'cage', weaponModule: 'phantom',       name: 'SOUL REAPER',       icon: '💀', description: 'Kills fully restore HP and reduce heat by 20' },
  { bodyType: 'cage', weaponModule: 'absorber',      name: 'VOID DRAIN',        icon: '🕳', description: 'Life drain also steals 1 random stat point permanently' },
  { bodyType: 'cage', weaponModule: 'binder',        name: 'SOUL PRISON',       icon: '⛓', description: 'Root lasts 3 turns. Rooted enemies take 30% more damage' },

  // ═══ SOUL → RESONANCE (3 combos) ═══
  { bodyType: 'resonance', weaponModule: 'scream',   name: 'DEATH HOWL',        icon: '📢', description: 'When ally dies, AoE SYN damage x3 to all enemies' },
  { bodyType: 'resonance', weaponModule: 'wave',     name: 'TREMOR PULSE',      icon: '〰', description: 'SPD reduction is permanent. Stacks across turns' },
  { bodyType: 'resonance', weaponModule: 'harmony',  name: 'SOUL SYMPHONY',     icon: '🎵', description: 'All soul allies share highest SYN + heal 5% HP/turn' },

  // ═══ SOUL → ECHO (3 combos) ═══
  { bodyType: 'echo', weaponModule: 'echo_strike',   name: 'INFINITE ECHO',     icon: '∞', description: 'Echo attacks can trigger more echoes (30% chain)' },
  { bodyType: 'echo', weaponModule: 'shadow',        name: 'DOPPELGANGER',      icon: '👤', description: 'Shadow clone persists for 3 turns as independent attacker' },
  { bodyType: 'echo', weaponModule: 'reflection',    name: 'MIRROR SOUL',       icon: '🪞', description: 'Copy enemy ability permanently for the rest of battle' },
];

// ── Lookup helper ──
export function getComboAbility(bodyType: BodyType | null, weaponModule: WeaponModule | null): ComboAbility | null {
  if (!bodyType || !weaponModule) return null;
  return COMBO_ABILITIES.find(c => c.bodyType === bodyType && c.weaponModule === weaponModule) ?? null;
}
