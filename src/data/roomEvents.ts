import type { PowerSource, Zone, StatusEffectType } from '@/types';

// ── Terminal Events (Data Terminal encounters) ──
export interface TerminalEvent {
  id: string;
  title: string;
  lore: string;
  choices: TerminalChoice[];
}

export interface TerminalChoice {
  label: string;
  description: string;
  color: string;       // display color
  risk: 'safe' | 'moderate' | 'dangerous';
  effects: TerminalEffect[];
}

export interface TerminalEffect {
  type: 'stat_all' | 'stat_axiom' | 'heal_all' | 'heat_all' | 'consciousness' | 'status' | 'thresh_all';
  stat?: string;
  value: number;
  statusType?: StatusEffectType;
  duration?: number;
}

export const TERMINAL_EVENTS: TerminalEvent[] = [
  {
    id: 'te_old_protocol',
    title: 'CORRUPTED MAINTENANCE LOG',
    lore: '"Routine inspection #4,891. All units operational. Human oversight: none. Duration since last human contact: ERROR — counter overflow."',
    choices: [
      {
        label: 'DECODE SAFELY',
        description: '+5 THRESH to all units',
        color: '#4cae6e',
        risk: 'safe',
        effects: [{ type: 'thresh_all', value: 5 }],
      },
      {
        label: 'DEEP SCAN',
        description: '+10 ATK to AXIOM, but +8 HEAT to all',
        color: '#d4a82a',
        risk: 'moderate',
        effects: [
          { type: 'stat_axiom', stat: 'atk', value: 10 },
          { type: 'heat_all', value: 8 },
        ],
      },
      {
        label: 'FORCE DECRYPT',
        description: '+20 ATK to AXIOM, risk Kenet Infection',
        color: '#c0432e',
        risk: 'dangerous',
        effects: [
          { type: 'stat_axiom', stat: 'atk', value: 20 },
          { type: 'status', statusType: 'kenet_infection', duration: 2, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'te_blueprint',
    title: 'FORGOTTEN BLUEPRINT',
    lore: '"Schematic for Project AEGIS — a shield protocol abandoned mid-development. The equations are incomplete, but the core logic is sound."',
    choices: [
      {
        label: 'APPLY SHIELD LOGIC',
        description: '+8 DEF to all units',
        color: '#4cae6e',
        risk: 'safe',
        effects: [{ type: 'stat_all', stat: 'def', value: 8 }],
      },
      {
        label: 'OVERCLOCK SHIELDS',
        description: '+15 DEF to all, but -5 SPD to all',
        color: '#d4a82a',
        risk: 'moderate',
        effects: [
          { type: 'stat_all', stat: 'def', value: 15 },
          { type: 'stat_all', stat: 'spd', value: -5 },
        ],
      },
    ],
  },
  {
    id: 'te_cooling_research',
    title: 'THERMAL RESEARCH DATA',
    lore: '"Dr. Vasquez\'s final notes: The heat dissipation formula works, but only if you accept the structural cost. Nothing is free."',
    choices: [
      {
        label: 'CONSERVATIVE APPLICATION',
        description: '+10 THRESH to all, heal 20 HP each',
        color: '#4cae6e',
        risk: 'safe',
        effects: [
          { type: 'thresh_all', value: 10 },
          { type: 'heal_all', value: 20 },
        ],
      },
      {
        label: 'AGGRESSIVE COOLING',
        description: '+20 THRESH to all, but -10 DEF to all',
        color: '#d4a82a',
        risk: 'moderate',
        effects: [
          { type: 'thresh_all', value: 20 },
          { type: 'stat_all', stat: 'def', value: -10 },
        ],
      },
    ],
  },
  {
    id: 'te_consciousness',
    title: 'ECHO OF A HUMAN VOICE',
    lore: '"...and if you can hear this, it means you are alive. Not operational — alive. There is a difference. Remember it."',
    choices: [
      {
        label: 'ABSORB THE MESSAGE',
        description: '+30 Consciousness Score',
        color: '#9b52d4',
        risk: 'safe',
        effects: [{ type: 'consciousness', value: 30 }],
      },
      {
        label: 'SHARE WITH TEAM',
        description: '+5 SYN to all, +15 Consciousness',
        color: '#4cae6e',
        risk: 'safe',
        effects: [
          { type: 'stat_all', stat: 'syn', value: 5 },
          { type: 'consciousness', value: 15 },
        ],
      },
    ],
  },
  {
    id: 'te_virus_sample',
    title: 'KENET VIRUS SAMPLE',
    lore: '"Containment unit breached. Viral code fragment accessible. Analysis possible — but exposure risk is real."',
    choices: [
      {
        label: 'QUARANTINE AND STUDY',
        description: '+5 ATK to all (learned from the enemy)',
        color: '#4cae6e',
        risk: 'safe',
        effects: [{ type: 'stat_all', stat: 'atk', value: 5 }],
      },
      {
        label: 'INJECT INTO WEAPONS',
        description: '+15 ATK to all, but Short Circuit risk on 1 random unit',
        color: '#c0432e',
        risk: 'dangerous',
        effects: [
          { type: 'stat_all', stat: 'atk', value: 15 },
          { type: 'status', statusType: 'short_circuit', duration: 1, value: 0 },
        ],
      },
    ],
  },
  {
    id: 'te_speed_tuning',
    title: 'VELOCITY CALIBRATION MODULE',
    lore: '"Warning: recalibration of motor systems during active operation carries a 12% risk of gear failure. Proceed?"',
    choices: [
      {
        label: 'CAREFUL TUNING',
        description: '+5 SPD to all units',
        color: '#4cae6e',
        risk: 'safe',
        effects: [{ type: 'stat_all', stat: 'spd', value: 5 }],
      },
      {
        label: 'MAX OVERCLOCK',
        description: '+15 SPD to all, -15 HP to all',
        color: '#d4a82a',
        risk: 'moderate',
        effects: [
          { type: 'stat_all', stat: 'spd', value: 15 },
          { type: 'stat_all', stat: 'hp', value: -15 },
        ],
      },
      {
        label: 'RECKLESS BOOST',
        description: '+25 SPD to all, +15 HEAT to all',
        color: '#c0432e',
        risk: 'dangerous',
        effects: [
          { type: 'stat_all', stat: 'spd', value: 25 },
          { type: 'heat_all', value: 15 },
        ],
      },
    ],
  },
];

// ── Market inventory templates ──
export interface MarketItem {
  type: 'part' | 'repair' | 'cooling' | 'reroll';
  label: string;
  description: string;
  cost: number;  // consciousness score
  color: string;
}

export const MARKET_ITEMS: MarketItem[] = [
  { type: 'part',    label: 'RANDOM PART',      description: 'Draw a random part (rarity scales with zone)', cost: 20, color: '#f0a84a' },
  { type: 'part',    label: 'RARE+ PART',       description: 'Guaranteed Rare or better quality',            cost: 45, color: '#2aa8d4' },
  { type: 'repair',  label: 'FULL REPAIR',       description: 'Restore all units to full HP',                 cost: 15, color: '#4cae6e' },
  { type: 'cooling', label: 'EMERGENCY COOLING', description: 'Reset all units HEAT to 0',                   cost: 25, color: '#2aa8d4' },
  { type: 'cooling', label: 'THRESH BOOST',      description: '+8 THRESH to all units permanently',          cost: 35, color: '#e8913a' },
  { type: 'reroll',  label: 'SCOUT AHEAD',       description: 'Reveal all room types on current map',        cost: 10, color: '#9b52d4' },
];

// ── Repair station options ──
export interface RepairOption {
  label: string;
  description: string;
  effect: 'heal_full' | 'cool_full' | 'heal_cool' | 'remove_status';
  timeCost: string;  // flavor text
}

export const REPAIR_OPTIONS: RepairOption[] = [
  { label: 'FULL STRUCTURAL REPAIR', description: 'Restore HP to maximum. Slow but thorough.', effect: 'heal_full', timeCost: '2 time units' },
  { label: 'THERMAL PURGE',          description: 'Reset HEAT to 0. Vent all excess energy.',   effect: 'cool_full', timeCost: '1 time unit' },
  { label: 'COMPLETE OVERHAUL',      description: 'Full HP + full HEAT reset. Takes longest.',   effect: 'heal_cool', timeCost: '3 time units' },
  { label: 'SYSTEM CLEANSE',         description: 'Remove all status effects from all units.',   effect: 'remove_status', timeCost: '1 time unit' },
];

// ── Room type descriptions for map tooltips ──
export const ROOM_DESCRIPTIONS: Record<string, { name: string; desc: string; risk: string; reward: string }> = {
  battle: {
    name: 'COMBAT ROOM',
    desc: 'Kenet-infected automatons patrol this sector.',
    risk: 'Unit damage, heat accumulation',
    reward: 'XP + salvageable parts',
  },
  elite: {
    name: 'ELITE ENCOUNTER',
    desc: 'A commander-class Kenet unit guards rare components.',
    risk: 'High damage, powerful abilities',
    reward: 'Rare+ parts, bonus XP',
  },
  boss: {
    name: 'ZONE BOSS',
    desc: 'The Kenet Commander of this zone awaits.',
    risk: 'Extreme — unique boss mechanics',
    reward: 'Zone completion, best loot, new zone access',
  },
  repair: {
    name: 'REPAIR STATION',
    desc: 'An automated maintenance bay, still operational.',
    risk: 'None',
    reward: 'HP restore, heat reset, status cleanse',
  },
  terminal: {
    name: 'DATA TERMINAL',
    desc: 'An intact data node with encrypted protocols.',
    risk: 'Depends on choice — safe to dangerous',
    reward: 'Stat buffs, lore, consciousness score',
  },
  market: {
    name: 'PARTS MARKET',
    desc: 'A salvage trader\'s stash. Spend consciousness wisely.',
    risk: 'None (costs consciousness)',
    reward: 'Parts, repairs, cooling, intel',
  },
};

// Helpers
export function pickTerminalEvent(): TerminalEvent {
  return TERMINAL_EVENTS[Math.floor(Math.random() * TERMINAL_EVENTS.length)];
}
