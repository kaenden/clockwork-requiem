import Phaser from 'phaser';
import { GAME_WIDTH, COLORS } from '@/data/constants';
import type { Zone, RoomType } from '@/types';

/**
 * Procedural industrial arena backgrounds per zone.
 * All drawn with Phaser Graphics — no external assets needed.
 */

const ZONE_PALETTE: Record<Zone, { primary: number; secondary: number; accent: number; fog: number }> = {
  boiler_works:     { primary: 0xc0732a, secondary: 0x8b3a2a, accent: 0xe8913a, fog: 0x1a0f08 },
  voltage_archives: { primary: 0x1a7a9e, secondary: 0x0d4a6e, accent: 0x2aa8d4, fog: 0x081218 },
  soul_labs:        { primary: 0x6b2fa0, secondary: 0x3a1860, accent: 0x9b52d4, fog: 0x0e0818 },
  kenet_heart:      { primary: 0xc0432e, secondary: 0x6a1a1a, accent: 0xff4040, fog: 0x180808 },
};

export function drawArenaBackground(
  scene: Phaser.Scene,
  zone: Zone,
  roomType: RoomType,
  arenaTop: number,
  arenaBot: number,
): void {
  const g = scene.add.graphics();
  const cx = GAME_WIDTH / 2;
  const arenaH = arenaBot - arenaTop;
  const pal = ZONE_PALETTE[zone] ?? ZONE_PALETTE.boiler_works;

  // ── Base gradient (dark to darker) ──
  const gradSteps = 12;
  for (let i = 0; i < gradSteps; i++) {
    const t = i / gradSteps;
    const y = arenaTop + arenaH * t;
    const h = arenaH / gradSteps + 1;
    const alpha = 0.3 + t * 0.2;
    g.fillStyle(pal.fog, alpha);
    g.fillRect(0, y, GAME_WIDTH, h);
  }

  // ── Floor / Ground line ──
  const floorY = arenaBot - 20;
  g.fillStyle(pal.secondary, 0.25);
  g.fillRect(0, floorY, GAME_WIDTH, 20);
  g.lineStyle(1, pal.primary, 0.4);
  g.lineBetween(0, floorY, GAME_WIDTH, floorY);

  // Floor tiles
  for (let x = 0; x < GAME_WIDTH; x += 40) {
    g.lineStyle(1, pal.primary, 0.08);
    g.lineBetween(x, floorY, x, arenaBot);
  }

  // ── Zone-specific elements ──
  switch (zone) {
    case 'boiler_works':
      drawBoilerWorks(scene, g, pal, arenaTop, arenaBot, cx, roomType);
      break;
    case 'voltage_archives':
      drawVoltageArchives(scene, g, pal, arenaTop, arenaBot, cx, roomType);
      break;
    case 'soul_labs':
      drawSoulLabs(scene, g, pal, arenaTop, arenaBot, cx, roomType);
      break;
    case 'kenet_heart':
      drawKenetHeart(scene, g, pal, arenaTop, arenaBot, cx, roomType);
      break;
  }

  // ── Atmospheric particles (floating dust/sparks) ──
  drawParticles(scene, pal, arenaTop, arenaBot);

  // ── Center divider (subtle) ──
  g.lineStyle(1, pal.primary, 0.12);
  for (let y = arenaTop + 10; y < arenaBot; y += 8) {
    g.lineBetween(cx, y, cx, y + 3); // Dashed line
  }

  // ── Vignette overlay ──
  g.fillStyle(0x000000, 0.15);
  g.fillRect(0, arenaTop, 60, arenaH);
  g.fillRect(GAME_WIDTH - 60, arenaTop, 60, arenaH);
  g.fillStyle(0x000000, 0.1);
  g.fillRect(0, arenaTop, GAME_WIDTH, 20);
}

// ════════════════════════════════════════
// BOILER WORKS — Steam pipes, furnaces, gears
// ════════════════════════════════════════
function drawBoilerWorks(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics,
  pal: typeof ZONE_PALETTE.boiler_works,
  top: number, bot: number, cx: number, roomType: RoomType,
): void {
  const h = bot - top;

  // Large pipes (horizontal, background)
  const pipes = [
    { y: top + 30, w: 16 },
    { y: top + h * 0.4, w: 12 },
    { y: bot - 60, w: 14 },
  ];
  for (const pipe of pipes) {
    g.fillStyle(0x2a2018, 0.6);
    g.fillRect(0, pipe.y, GAME_WIDTH, pipe.w);
    g.lineStyle(1, pal.primary, 0.2);
    g.lineBetween(0, pipe.y, GAME_WIDTH, pipe.y);
    g.lineBetween(0, pipe.y + pipe.w, GAME_WIDTH, pipe.y + pipe.w);

    // Pipe joints
    for (let x = 80; x < GAME_WIDTH; x += 160 + Math.random() * 80) {
      g.fillStyle(pal.secondary, 0.4);
      g.fillRect(x - 4, pipe.y - 2, 8, pipe.w + 4);
    }
  }

  // Vertical pipes (left/right walls)
  for (const x of [30, 60, GAME_WIDTH - 30, GAME_WIDTH - 60]) {
    g.fillStyle(0x201810, 0.5);
    g.fillRect(x - 5, top, 10, h);
    g.lineStyle(1, pal.primary, 0.15);
    g.lineBetween(x - 5, top, x - 5, bot);
    g.lineBetween(x + 5, top, x + 5, bot);
  }

  // Gears (decorative circles)
  const gears = [
    { x: 90, y: top + 70, r: 20 },
    { x: GAME_WIDTH - 90, y: top + 90, r: 16 },
    { x: 120, y: bot - 80, r: 14 },
    { x: GAME_WIDTH - 130, y: bot - 70, r: 18 },
  ];
  for (const gear of gears) {
    g.lineStyle(2, pal.primary, 0.2);
    g.strokeCircle(gear.x, gear.y, gear.r);
    g.lineStyle(1, pal.primary, 0.1);
    g.strokeCircle(gear.x, gear.y, gear.r * 0.5);
    // Gear teeth
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      const ox = Math.cos(a) * gear.r;
      const oy = Math.sin(a) * gear.r;
      g.lineBetween(gear.x + ox * 0.8, gear.y + oy * 0.8, gear.x + ox * 1.15, gear.y + oy * 1.15);
    }
  }

  // Furnace glow (bottom center)
  if (roomType === 'boss') {
    g.fillStyle(pal.accent, 0.06);
    g.fillCircle(cx, bot - 30, 120);
    g.fillStyle(pal.accent, 0.03);
    g.fillCircle(cx, bot - 30, 200);
  }

  // Steam vents (small horizontal lines with glow)
  for (let i = 0; i < 5; i++) {
    const vx = 100 + Math.random() * (GAME_WIDTH - 200);
    const vy = top + 20 + Math.random() * (h - 60);
    g.fillStyle(0xffffff, 0.02);
    g.fillRect(vx, vy, 30 + Math.random() * 20, 2);
  }
}

// ════════════════════════════════════════
// VOLTAGE ARCHIVES — Cables, monitors, electricity
// ════════════════════════════════════════
function drawVoltageArchives(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics,
  pal: typeof ZONE_PALETTE.boiler_works,
  top: number, bot: number, cx: number, roomType: RoomType,
): void {
  const h = bot - top;

  // Data streams (vertical lines with glow)
  for (let x = 50; x < GAME_WIDTH; x += 70 + Math.random() * 40) {
    const streamAlpha = 0.05 + Math.random() * 0.08;
    g.lineStyle(1, pal.accent, streamAlpha);
    g.lineBetween(x, top, x, bot);

    // Data nodes on streams
    for (let y = top + 40; y < bot; y += 60 + Math.random() * 50) {
      g.fillStyle(pal.accent, streamAlpha * 2);
      g.fillRect(x - 2, y, 4, 4);
    }
  }

  // Server racks (left/right walls)
  for (const baseX of [10, 50, GAME_WIDTH - 50, GAME_WIDTH - 10]) {
    g.fillStyle(0x0d1a20, 0.6);
    g.fillRect(baseX - 15, top + 10, 30, h - 30);
    g.lineStyle(1, pal.primary, 0.2);
    g.strokeRect(baseX - 15, top + 10, 30, h - 30);

    // Blinking lights
    for (let y = top + 20; y < bot - 20; y += 12) {
      const color = Math.random() > 0.3 ? pal.accent : pal.primary;
      g.fillStyle(color, 0.15 + Math.random() * 0.2);
      g.fillRect(baseX - 8, y, 3, 2);
      g.fillRect(baseX + 2, y, 3, 2);
    }
  }

  // Horizontal cable bundles
  const cables = [top + 50, top + h * 0.35, bot - 50];
  for (const cy of cables) {
    for (let c = 0; c < 3; c++) {
      g.lineStyle(1, pal.primary, 0.08 + c * 0.03);
      const sag = 5 + c * 3;
      g.beginPath();
      g.moveTo(0, cy + c * 3);
      for (let x = 0; x <= GAME_WIDTH; x += 20) {
        const wave = Math.sin(x * 0.01 + c) * sag;
        g.lineTo(x, cy + c * 3 + wave);
      }
      g.strokePath();
    }
  }

  // Electric arcs (boss room only)
  if (roomType === 'boss') {
    for (let i = 0; i < 3; i++) {
      drawLightningBolt(g, pal.accent,
        100 + Math.random() * (GAME_WIDTH - 200), top + 20,
        100 + Math.random() * (GAME_WIDTH - 200), bot - 20,
        0.04
      );
    }
  }

  // Monitor screens
  const monitors = [
    { x: 140, y: top + 60 }, { x: GAME_WIDTH - 140, y: top + 80 },
    { x: 160, y: bot - 80 }, { x: GAME_WIDTH - 160, y: bot - 90 },
  ];
  for (const m of monitors) {
    g.fillStyle(0x0a1520, 0.7);
    g.fillRect(m.x - 16, m.y - 10, 32, 20);
    g.lineStyle(1, pal.accent, 0.2);
    g.strokeRect(m.x - 16, m.y - 10, 32, 20);
    // Screen content (horizontal lines)
    for (let ly = m.y - 6; ly < m.y + 8; ly += 3) {
      g.lineStyle(1, pal.accent, 0.1);
      g.lineBetween(m.x - 12, ly, m.x - 12 + Math.random() * 20, ly);
    }
  }
}

// ════════════════════════════════════════
// SOUL LABS — Floating orbs, ritual circles, mist
// ════════════════════════════════════════
function drawSoulLabs(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics,
  pal: typeof ZONE_PALETTE.boiler_works,
  top: number, bot: number, cx: number, roomType: RoomType,
): void {
  const h = bot - top;

  // Ritual circles on floor
  const circles = [
    { x: cx - 180, y: bot - 40, r: 50 },
    { x: cx + 180, y: bot - 35, r: 45 },
  ];
  if (roomType === 'boss') {
    circles.push({ x: cx, y: bot - 45, r: 70 });
  }
  for (const c of circles) {
    g.lineStyle(1, pal.accent, 0.1);
    g.strokeCircle(c.x, c.y, c.r);
    g.lineStyle(1, pal.primary, 0.07);
    g.strokeCircle(c.x, c.y, c.r * 0.6);
    // Inner runes (small marks around circle)
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      const rx = c.x + Math.cos(a) * c.r * 0.8;
      const ry = c.y + Math.sin(a) * c.r * 0.8;
      g.fillStyle(pal.accent, 0.08);
      g.fillRect(rx - 1, ry - 1, 3, 3);
    }
  }

  // Floating soul orbs (concentric circles with glow)
  const orbs = [
    { x: 100, y: top + 80, r: 8 },
    { x: GAME_WIDTH - 120, y: top + 100, r: 6 },
    { x: 200, y: top + h * 0.5, r: 10 },
    { x: GAME_WIDTH - 200, y: top + h * 0.45, r: 7 },
    { x: cx - 80, y: top + 60, r: 5 },
    { x: cx + 100, y: top + 70, r: 6 },
  ];
  for (const orb of orbs) {
    g.fillStyle(pal.accent, 0.04);
    g.fillCircle(orb.x, orb.y, orb.r * 3);
    g.fillStyle(pal.accent, 0.08);
    g.fillCircle(orb.x, orb.y, orb.r * 1.5);
    g.fillStyle(pal.accent, 0.15);
    g.fillCircle(orb.x, orb.y, orb.r);
    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(orb.x, orb.y, orb.r * 0.3);
  }

  // Containment tubes (vertical glass cylinders)
  for (const x of [70, GAME_WIDTH - 70]) {
    g.fillStyle(pal.secondary, 0.15);
    g.fillRect(x - 10, top + 20, 20, h - 50);
    g.lineStyle(1, pal.accent, 0.15);
    g.lineBetween(x - 10, top + 20, x - 10, bot - 30);
    g.lineBetween(x + 10, top + 20, x + 10, bot - 30);
    // Liquid inside
    g.fillStyle(pal.accent, 0.05);
    g.fillRect(x - 8, top + h * 0.4, 16, h * 0.4);
  }

  // Misty wisps (horizontal streaks)
  for (let i = 0; i < 8; i++) {
    const wy = top + 30 + Math.random() * (h - 60);
    const wx = Math.random() * GAME_WIDTH;
    const ww = 40 + Math.random() * 80;
    g.fillStyle(pal.accent, 0.02 + Math.random() * 0.02);
    g.fillEllipse(wx, wy, ww, 4 + Math.random() * 4);
  }
}

// ════════════════════════════════════════
// KENET HEART — Corruption, organic/metal fusion, chaos
// ════════════════════════════════════════
function drawKenetHeart(
  scene: Phaser.Scene, g: Phaser.GameObjects.Graphics,
  pal: typeof ZONE_PALETTE.boiler_works,
  top: number, bot: number, cx: number, roomType: RoomType,
): void {
  const h = bot - top;

  // Corruption veins (branching lines from center)
  const veinRoots = [
    { x: cx, y: top + 10 },
    { x: cx - 100, y: bot },
    { x: cx + 100, y: bot },
    { x: 0, y: top + h / 2 },
    { x: GAME_WIDTH, y: top + h / 2 },
  ];
  for (const root of veinRoots) {
    drawVein(g, root.x, root.y, 60 + Math.random() * 40, pal.primary, 0.08);
  }

  // Organic growths on walls
  for (const x of [20, 50, GAME_WIDTH - 20, GAME_WIDTH - 50]) {
    for (let y = top + 30; y < bot; y += 30 + Math.random() * 40) {
      const size = 3 + Math.random() * 8;
      g.fillStyle(pal.secondary, 0.2);
      g.fillCircle(x, y, size);
      g.fillStyle(pal.primary, 0.1);
      g.fillCircle(x, y, size * 0.5);
    }
  }

  // Central corruption mass (boss room)
  if (roomType === 'boss') {
    g.fillStyle(pal.primary, 0.05);
    g.fillCircle(cx, top + h / 2, 150);
    g.fillStyle(pal.accent, 0.03);
    g.fillCircle(cx, top + h / 2, 100);
    g.fillStyle(pal.accent, 0.06);
    g.fillCircle(cx, top + h / 2, 40);

    // Pulsing rings
    for (let r = 30; r < 160; r += 30) {
      g.lineStyle(1, pal.accent, 0.04);
      g.strokeCircle(cx, top + h / 2, r);
    }
  }

  // Broken pipes and debris
  for (let i = 0; i < 6; i++) {
    const dx = 80 + Math.random() * (GAME_WIDTH - 160);
    const dy = top + 30 + Math.random() * (h - 60);
    const dw = 10 + Math.random() * 30;
    const da = Math.random() * Math.PI;
    g.lineStyle(2, COLORS.border, 0.15);
    g.lineBetween(dx, dy, dx + Math.cos(da) * dw, dy + Math.sin(da) * dw);
  }

  // Red mist
  for (let i = 0; i < 6; i++) {
    const mx = Math.random() * GAME_WIDTH;
    const my = top + 20 + Math.random() * (h - 40);
    g.fillStyle(pal.accent, 0.015 + Math.random() * 0.015);
    g.fillEllipse(mx, my, 60 + Math.random() * 80, 10 + Math.random() * 10);
  }

  // Glitch lines (horizontal static)
  for (let i = 0; i < 4; i++) {
    const gy = top + Math.random() * h;
    const gx = Math.random() * GAME_WIDTH * 0.3;
    const gw = 50 + Math.random() * 100;
    g.fillStyle(pal.accent, 0.04);
    g.fillRect(gx, gy, gw, 1);
  }
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════

function drawParticles(scene: Phaser.Scene, pal: typeof ZONE_PALETTE.boiler_works, top: number, bot: number): void {
  const h = bot - top;
  for (let i = 0; i < 15; i++) {
    const px = Math.random() * GAME_WIDTH;
    const py = top + Math.random() * h;
    const size = 1 + Math.random() * 2;
    const color = Math.random() > 0.5 ? pal.accent : pal.primary;
    const particle = scene.add.rectangle(px, py, size, size, color, 0.1 + Math.random() * 0.1);

    // Slow float animation
    scene.tweens.add({
      targets: particle,
      y: py - 15 - Math.random() * 20,
      x: px + (Math.random() - 0.5) * 30,
      alpha: 0,
      duration: 3000 + Math.random() * 4000,
      repeat: -1,
      delay: Math.random() * 3000,
    });
  }
}

function drawLightningBolt(
  g: Phaser.GameObjects.Graphics,
  color: number, x1: number, y1: number, x2: number, y2: number,
  alpha: number,
): void {
  g.lineStyle(1, color, alpha);
  g.beginPath();
  g.moveTo(x1, y1);
  const segments = 8 + Math.floor(Math.random() * 6);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 40;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 10;
    g.lineTo(x, y);
  }
  g.strokePath();
}

function drawVein(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number, length: number,
  color: number, alpha: number, depth = 0,
): void {
  if (depth > 4 || length < 8) return;
  const angle = Math.random() * Math.PI * 2;
  const ex = x + Math.cos(angle) * length;
  const ey = y + Math.sin(angle) * length;
  g.lineStyle(Math.max(1, 3 - depth), color, alpha);
  g.lineBetween(x, y, ex, ey);

  // Branch
  drawVein(g, ex, ey, length * 0.6, color, alpha * 0.8, depth + 1);
  if (Math.random() > 0.4) {
    drawVein(g, ex, ey, length * 0.5, color, alpha * 0.6, depth + 1);
  }
}
