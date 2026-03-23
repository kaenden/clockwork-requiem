import Phaser from 'phaser';
import { COLORS } from '@/data/constants';
import type { UnitConfig, PowerSource, BodyType, OverloadPhase } from '@/types';
import { getOverloadPhase } from '@/systems/StatEngine';

// ── Color palettes per power source ──
const PALETTES: Record<PowerSource, { body: number; dark: number; eye: number; accent: number; glow: number }> = {
  steam:    { body: 0xc0732a, dark: 0x8b5420, eye: 0xffd060, accent: 0xe8913a, glow: 0xff9940 },
  electric: { body: 0x1a7a9e, dark: 0x135a72, eye: 0x60e0ff, accent: 0x2aa8d4, glow: 0x40d0ff },
  soul:     { body: 0x6b2fa0, dark: 0x4a1f70, eye: 0xd080ff, accent: 0x9b52d4, glow: 0xc060ff },
};

const KENET_PALETTE = { body: 0x8b2020, dark: 0x501010, eye: 0xff3030, accent: 0xc0432e, glow: 0xff6040 };

// ── Phase eye colors ──
const PHASE_EYES: Record<OverloadPhase, number> = {
  safe: 0x60ff90,
  warning: 0xffd040,
  critical: 0xff5030,
  meltdown: 0xff2020,
};

// ── Body shape modifiers per body type ──
interface BodyShape {
  shoulderW: number;  // extra shoulder width
  torsoH: number;     // torso height multiplier
  legW: number;       // leg width
  headH: number;      // head height
  armor: boolean;     // draw armor plates
  slender: boolean;   // thin/fast look
}

const BODY_SHAPES: Record<string, BodyShape> = {
  // Steam bodies — bulky
  cast:      { shoulderW: 8, torsoH: 1.2, legW: 10, headH: 12, armor: true,  slender: false },
  armor:     { shoulderW: 10, torsoH: 1.3, legW: 12, headH: 10, armor: true,  slender: false },
  boiler:    { shoulderW: 6, torsoH: 1.4, legW: 8,  headH: 14, armor: false, slender: false },
  // Electric bodies — slender
  wire:      { shoulderW: 4, torsoH: 0.9, legW: 6,  headH: 10, armor: false, slender: true },
  lens:      { shoulderW: 3, torsoH: 0.85, legW: 5, headH: 14, armor: false, slender: true },
  relay:     { shoulderW: 5, torsoH: 0.95, legW: 7, headH: 12, armor: false, slender: true },
  // Soul bodies — ethereal
  cage:      { shoulderW: 6, torsoH: 1.0, legW: 6,  headH: 12, armor: false, slender: false },
  resonance: { shoulderW: 4, torsoH: 1.1, legW: 5,  headH: 16, armor: false, slender: false },
  echo:      { shoulderW: 3, torsoH: 0.9, legW: 4,  headH: 14, armor: false, slender: true },
};

const DEFAULT_SHAPE: BodyShape = { shoulderW: 5, torsoH: 1.0, legW: 7, headH: 12, armor: false, slender: false };

export const RobotRenderer = {
  // Generate a unique texture key for this unit config
  getTextureKey(unit: UnitConfig): string {
    return `robot_${unit.powerSource}_${unit.bodyType ?? 'base'}_${unit.id}`;
  },

  // Render a robot sprite for a unit and return the texture key
  render(scene: Phaser.Scene, unit: UnitConfig, size = 64): string {
    const key = this.getTextureKey(unit);
    if (scene.textures.exists(key)) return key;

    const pal = PALETTES[unit.powerSource];
    const shape = unit.bodyType ? (BODY_SHAPES[unit.bodyType] ?? DEFAULT_SHAPE) : DEFAULT_SHAPE;
    const phase = getOverloadPhase(unit);
    const eyeColor = PHASE_EYES[phase];
    const isAxiom = unit.isAxiom;

    const g = scene.add.graphics().setVisible(false);
    const cx = size / 2;
    const cy = size / 2;

    // ── Background clear ──
    g.fillStyle(0x000000, 0);
    g.fillRect(0, 0, size, size);

    // ── Glow aura (overload phases) ──
    if (phase === 'critical' || phase === 'meltdown') {
      g.fillStyle(phase === 'meltdown' ? 0xff2020 : 0xff6030, phase === 'meltdown' ? 0.15 : 0.08);
      g.fillCircle(cx, cy, size / 2 - 2);
    }

    const bodyW = shape.slender ? 18 : 24;
    const torsoH = Math.round(22 * shape.torsoH);
    const headW = bodyW - 2;
    const headH = shape.headH;

    // ── Legs ──
    g.fillStyle(pal.dark, 1);
    g.fillRect(cx - bodyW / 2 + 2, cy + torsoH / 2, shape.legW, 10);
    g.fillRect(cx + bodyW / 2 - shape.legW - 2, cy + torsoH / 2, shape.legW, 10);

    // Feet
    g.fillStyle(pal.body, 0.7);
    g.fillRect(cx - bodyW / 2, cy + torsoH / 2 + 8, shape.legW + 2, 4);
    g.fillRect(cx + bodyW / 2 - shape.legW - 2, cy + torsoH / 2 + 8, shape.legW + 2, 4);

    // ── Torso ──
    g.fillStyle(pal.dark, 1);
    g.fillRect(cx - bodyW / 2, cy - torsoH / 2 + 4, bodyW, torsoH);

    g.fillStyle(pal.body, 1);
    g.fillRect(cx - bodyW / 2 + 2, cy - torsoH / 2 + 6, bodyW - 4, torsoH - 4);

    // Chest core (power indicator)
    g.fillStyle(pal.accent, 0.9);
    g.fillRect(cx - 3, cy, 6, 6);
    // Core glow
    g.fillStyle(pal.glow, 0.3);
    g.fillRect(cx - 4, cy - 1, 8, 8);

    // ── Armor plates (steam body types) ──
    if (shape.armor) {
      g.fillStyle(pal.body, 0.6);
      g.fillRect(cx - bodyW / 2 - 2, cy - torsoH / 4, 3, torsoH / 2);
      g.fillRect(cx + bodyW / 2 - 1, cy - torsoH / 4, 3, torsoH / 2);
    }

    // ── Arms / Shoulders ──
    g.fillStyle(pal.body, 0.85);
    g.fillRect(cx - bodyW / 2 - shape.shoulderW, cy - torsoH / 2 + 8, shape.shoulderW, torsoH - 12);
    g.fillRect(cx + bodyW / 2, cy - torsoH / 2 + 8, shape.shoulderW, torsoH - 12);

    // Shoulder caps
    g.fillStyle(pal.accent, 0.7);
    g.fillRect(cx - bodyW / 2 - shape.shoulderW, cy - torsoH / 2 + 6, shape.shoulderW, 4);
    g.fillRect(cx + bodyW / 2, cy - torsoH / 2 + 6, shape.shoulderW, 4);

    // ── Head ──
    const headY = cy - torsoH / 2 - headH + 6;
    g.fillStyle(pal.body, 1);
    g.fillRect(cx - headW / 2, headY, headW, headH);

    // Visor (eye strip)
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(cx - headW / 2 + 2, headY + 3, headW - 4, 6);

    // Eyes
    const eyeW = shape.slender ? 4 : 5;
    const eyeH = 4;
    const eyeGap = shape.slender ? 6 : 8;
    g.fillStyle(eyeColor, 1);
    g.fillRect(cx - eyeGap / 2 - eyeW, headY + 4, eyeW, eyeH);
    g.fillRect(cx + eyeGap / 2, headY + 4, eyeW, eyeH);

    // Eye glow
    g.fillStyle(eyeColor, 0.3);
    g.fillRect(cx - eyeGap / 2 - eyeW - 1, headY + 3, eyeW + 2, eyeH + 2);
    g.fillRect(cx + eyeGap / 2 - 1, headY + 3, eyeW + 2, eyeH + 2);

    // ── AXIOM special: golden crown ──
    if (isAxiom) {
      g.fillStyle(0xffd700, 0.9);
      g.fillRect(cx - headW / 2 + 1, headY - 3, headW - 2, 3);
      // Crown tips
      g.fillRect(cx - headW / 2 + 2, headY - 5, 3, 2);
      g.fillRect(cx + headW / 2 - 5, headY - 5, 3, 2);
      g.fillRect(cx - 1, headY - 6, 3, 3);
    }

    // ── Parts visual: weapon module indicator ──
    if (unit.weaponModule) {
      g.fillStyle(pal.glow, 0.6);
      // Right arm weapon attachment
      g.fillRect(cx + bodyW / 2 + shape.shoulderW - 2, cy - 4, 6, 8);
      g.fillRect(cx + bodyW / 2 + shape.shoulderW + 2, cy - 2, 4, 4);
    }

    // ── Equipped parts count indicator (dots at bottom) ──
    const partCount = Math.min(unit.parts.length, 6);
    for (let i = 0; i < partCount; i++) {
      g.fillStyle(pal.accent, 0.7);
      g.fillRect(cx - partCount * 3 + i * 6, cy + torsoH / 2 + 14, 4, 2);
    }

    // ── Overload effects ──
    if (phase === 'warning') {
      // Small steam vents
      g.fillStyle(0xffd040, 0.2);
      g.fillRect(cx - bodyW / 2 - 2, cy - 4, 2, 8);
      g.fillRect(cx + bodyW / 2, cy - 4, 2, 8);
    }
    if (phase === 'critical') {
      // Sparks
      g.fillStyle(0xff4020, 0.4);
      g.fillRect(cx - bodyW / 2 - 4, cy - 8, 2, 2);
      g.fillRect(cx + bodyW / 2 + 2, cy + 4, 2, 2);
      g.fillRect(cx - 2, headY - 2, 2, 2);
    }
    if (phase === 'meltdown') {
      // Cracks
      g.lineStyle(1, 0xff3020, 0.5);
      g.lineBetween(cx - 4, cy - 6, cx + 2, cy + 8);
      g.lineBetween(cx + 3, cy - 4, cx - 1, cy + 6);
    }

    g.generateTexture(key, size, size);
    g.destroy();

    return key;
  },

  // Render an enemy robot (kenet-infected look)
  renderEnemy(scene: Phaser.Scene, unit: UnitConfig, size = 64): string {
    const key = `enemy_${unit.id}`;
    if (scene.textures.exists(key)) return key;

    const pal = KENET_PALETTE;
    const g = scene.add.graphics().setVisible(false);
    const cx = size / 2;
    const cy = size / 2;

    // Distortion aura
    g.fillStyle(0xff2020, 0.06);
    g.fillCircle(cx, cy, size / 2 - 2);

    const bodyW = 22;
    const torsoH = 24;

    // Legs (asymmetric — infected look)
    g.fillStyle(pal.dark, 1);
    g.fillRect(cx - 9, cy + 10, 8, 12);
    g.fillRect(cx + 3, cy + 10, 7, 11);

    // Torso
    g.fillStyle(pal.dark, 1);
    g.fillRect(cx - bodyW / 2, cy - 8, bodyW, torsoH);
    g.fillStyle(pal.body, 0.9);
    g.fillRect(cx - bodyW / 2 + 2, cy - 6, bodyW - 4, torsoH - 4);

    // Kenet virus lines
    g.fillStyle(0xff3030, 0.25);
    g.fillRect(cx - bodyW / 2, cy - 2, bodyW, 1);
    g.fillRect(cx - bodyW / 2, cy + 6, bodyW, 1);
    g.fillRect(cx - bodyW / 2, cy + 14, bodyW, 1);

    // Arms
    g.fillStyle(pal.body, 0.7);
    g.fillRect(cx - bodyW / 2 - 6, cy - 4, 6, 16);
    g.fillRect(cx + bodyW / 2, cy - 4, 6, 16);

    // Head
    g.fillStyle(pal.body, 1);
    g.fillRect(cx - 10, cy - 18, 20, 12);

    // Kenet eyes (red, glowing, menacing)
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(cx - 8, cy - 15, 16, 6);

    g.fillStyle(pal.eye, 1);
    g.fillRect(cx - 7, cy - 14, 6, 4);
    g.fillRect(cx + 1, cy - 14, 6, 4);

    // Red eye glow
    g.fillStyle(pal.eye, 0.3);
    g.fillRect(cx - 8, cy - 15, 7, 6);
    g.fillRect(cx, cy - 15, 7, 6);

    // Kenet infection mark on chest
    g.fillStyle(0xff2020, 0.6);
    g.fillRect(cx - 3, cy + 2, 6, 6);

    g.generateTexture(key, size, size);
    g.destroy();

    return key;
  },
};
