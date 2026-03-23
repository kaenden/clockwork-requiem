import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { runState } from '@/state/RunStateManager';
import { computeStats } from '@/systems/StatEngine';
import { SaveManager } from '@/utils/SaveManager';
import type { BodyType, WeaponModule, PowerSource } from '@/types';

// ── Split options per power source ──
const BODY_OPTIONS: Record<PowerSource, { type: BodyType; name: string; desc: string }[]> = {
  steam: [
    { type: 'cast',   name: 'CAST FRAME',   desc: 'Piston Fist / Iron Bastion / Steel Storm\nOffensive tank — high ATK & HP' },
    { type: 'armor',  name: 'ARMOR FRAME',   desc: 'Artillery / Barricade / Requisitor\nDefensive wall — highest DEF' },
    { type: 'boiler', name: 'BOILER FRAME',  desc: 'Furnace / Steamer / Pressure Blast\nHeat specialist — uses heat offensively' },
  ],
  electric: [
    { type: 'wire',  name: 'WIRE FRAME',  desc: 'Arc Welder / Chain Lightning / Conductor\nAoE damage — chain attacks' },
    { type: 'lens',  name: 'LENS FRAME',  desc: 'Sharpshooter / Mirror Array / Scorcher\nSingle target burst — highest DPS' },
    { type: 'relay', name: 'RELAY FRAME', desc: 'Support Net / Amplifier / Circuit Breaker\nSupport — buffs allies, debuffs enemies' },
  ],
  soul: [
    { type: 'cage',      name: 'CAGE FRAME',      desc: 'Phantom / Absorber / Binder\nDrain specialist — steals stats' },
    { type: 'resonance', name: 'RESONANCE FRAME', desc: 'Scream / Wave / Harmony\nAoE soul damage — affects consciousness' },
    { type: 'echo',      name: 'ECHO FRAME',      desc: 'Echo Strike / Shadow / Reflection\nCopy specialist — mirrors abilities' },
  ],
};

const WEAPON_OPTIONS: Record<BodyType, { type: WeaponModule; name: string; desc: string }[]> = {
  // Steam
  cast:   [
    { type: 'piston_fist',   name: 'PISTON FIST',   desc: 'Massive single-hit damage' },
    { type: 'iron_bastion',  name: 'IRON BASTION',   desc: 'Counter-attack on hit' },
    { type: 'steel_storm',   name: 'STEEL STORM',    desc: 'Multi-hit flurry' },
  ],
  armor:  [
    { type: 'artillery',     name: 'ARTILLERY',      desc: 'Long range siege damage' },
    { type: 'barricade',     name: 'BARRICADE',      desc: 'Taunt + damage reduction' },
    { type: 'requisitor',    name: 'REQUISITOR',     desc: 'Steal enemy DEF' },
  ],
  boiler: [
    { type: 'furnace',       name: 'FURNACE',        desc: 'Convert heat to damage' },
    { type: 'steamer',       name: 'STEAMER',        desc: 'AoE burn + heat debuff' },
    { type: 'pressure_blast',name: 'PRESSURE BLAST', desc: 'Explosion on overload (safe)' },
  ],
  // Electric
  wire:   [
    { type: 'arc_welder',    name: 'ARC WELDER',     desc: 'Chain damage + stun' },
    { type: 'chain_lightning',name:'CHAIN LIGHTNING', desc: 'Hit all enemies (diminishing)' },
    { type: 'conductor',     name: 'CONDUCTOR',      desc: 'Amplify ally electric damage' },
  ],
  lens:   [
    { type: 'sharpshooter',  name: 'SHARPSHOOTER',   desc: 'Crit chance + armor pen' },
    { type: 'mirror_array',  name: 'MIRROR ARRAY',   desc: 'Reflect damage back' },
    { type: 'scorcher',      name: 'SCORCHER',       desc: 'Burn through DEF' },
  ],
  relay:  [
    { type: 'support_net',   name: 'SUPPORT NET',    desc: 'Heal allies each turn' },
    { type: 'amplifier',     name: 'AMPLIFIER',      desc: 'Boost team ATK' },
    { type: 'circuit_breaker',name:'CIRCUIT BREAKER', desc: 'Disable enemy abilities' },
  ],
  // Soul
  cage:   [
    { type: 'phantom',       name: 'PHANTOM',        desc: 'Phase through DEF' },
    { type: 'absorber',      name: 'ABSORBER',       desc: 'Drain HP on hit' },
    { type: 'binder',        name: 'BINDER',         desc: 'Root enemy in place' },
  ],
  resonance: [
    { type: 'scream',        name: 'SCREAM',         desc: 'AoE consciousness damage' },
    { type: 'wave',          name: 'WAVE',           desc: 'Push enemies + damage' },
    { type: 'harmony',       name: 'HARMONY',        desc: 'Sync team soul bonuses' },
  ],
  echo:   [
    { type: 'echo_strike',   name: 'ECHO STRIKE',    desc: 'Repeat last attack' },
    { type: 'shadow',        name: 'SHADOW',         desc: 'Clone self temporarily' },
    { type: 'reflection',    name: 'REFLECTION',     desc: 'Copy enemy ability' },
  ],
};

export class SplitScene extends Phaser.Scene {
  private unitId = '';
  private splitType: 'body' | 'weapon' = 'body';

  constructor() {
    super('Split');
  }

  init(data: { unitId: string; splitType: 'body' | 'weapon' }): void {
    this.unitId = data.unitId;
    this.splitType = data.splitType;
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const unit = runState.getUnit(this.unitId);
    if (!unit) {
      this.scene.start('Map');
      return;
    }

    const isBody = this.splitType === 'body';
    const title = isBody ? 'BODY TYPE SELECTION' : 'WEAPON MODULE SELECTION';
    const subtitle = isBody
      ? `${unit.name} reached Lv.10 — choose a body frame`
      : `${unit.name} reached Lv.20 — choose a weapon module`;

    this.add.text(cx, 50, title, {
      fontFamily: 'monospace', fontSize: '16px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 80, subtitle, {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5);

    const srcColors: Record<PowerSource, number> = {
      steam: COLORS.steam2, electric: COLORS.elec2, soul: COLORS.soul2,
    };
    const accentColor = srcColors[unit.powerSource];
    const accentStr = '#' + accentColor.toString(16).padStart(6, '0');

    let options: { type: string; name: string; desc: string }[];
    if (isBody) {
      options = BODY_OPTIONS[unit.powerSource];
    } else {
      options = unit.bodyType ? (WEAPON_OPTIONS[unit.bodyType] ?? []) : [];
    }

    if (options.length === 0) {
      this.scene.start('Map');
      return;
    }

    const cardW = 300;
    const gap = 24;
    const totalW = options.length * cardW + (options.length - 1) * gap;
    let x = cx - totalW / 2 + cardW / 2;

    for (const opt of options) {
      const y = 350;

      this.add.rectangle(x, y, cardW, 340, COLORS.surface).setStrokeStyle(1, COLORS.border);
      this.add.rectangle(x - cardW / 2 + 2, y, 3, 340, accentColor);

      this.add.text(x, y - 130, opt.name, {
        fontFamily: 'monospace', fontSize: '14px', color: accentStr, letterSpacing: 3,
      }).setOrigin(0.5);

      this.add.text(x, y - 40, opt.desc, {
        fontFamily: 'monospace', fontSize: '10px', color: '#b8a888',
        align: 'center', lineSpacing: 6, wordWrap: { width: cardW - 40 },
      }).setOrigin(0.5);

      const btn = this.add.text(x, y + 130, '[ SELECT ]', {
        fontFamily: 'monospace', fontSize: '12px', color: '#e0d4bc', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setColor(accentStr))
        .on('pointerout', () => btn.setColor('#e0d4bc'))
        .on('pointerdown', () => {
          if (isBody) {
            unit.bodyType = opt.type as BodyType;
          } else {
            unit.weaponModule = opt.type as WeaponModule;
          }
          // Recompute stats
          const newStats = computeStats(unit);
          const heat = unit.stats.heat;
          unit.stats = { ...newStats, heat };

          SaveManager.saveAll();
          this.scene.start('Map');
        });

      x += cardW + gap;
    }
  }
}
