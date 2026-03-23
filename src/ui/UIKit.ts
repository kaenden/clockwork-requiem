import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '@/data/constants';
import { isMobile } from '@/utils/Mobile';

// ── Consistent font config ──
const mob = () => isMobile();

export const FONT = {
  title:   (s?: Phaser.Scene) => ({ fontFamily: 'monospace', fontSize: mob() ? '28px' : '40px', color: '#f0a84a', letterSpacing: mob() ? 4 : 8 }),
  heading: () => ({ fontFamily: 'monospace', fontSize: mob() ? '12px' : '14px', color: '#f0a84a', letterSpacing: 4 }),
  sub:     () => ({ fontFamily: 'monospace', fontSize: mob() ? '8px'  : '10px', color: '#7a6e5a', letterSpacing: 2 }),
  body:    () => ({ fontFamily: 'monospace', fontSize: mob() ? '9px'  : '11px', color: '#b8a888', letterSpacing: 1 }),
  small:   () => ({ fontFamily: 'monospace', fontSize: mob() ? '7px'  : '9px',  color: '#7a6e5a', letterSpacing: 1 }),
  label:   () => ({ fontFamily: 'monospace', fontSize: mob() ? '7px'  : '8px',  color: '#7a6e5a', letterSpacing: 2 }),
  value:   () => ({ fontFamily: 'monospace', fontSize: mob() ? '8px'  : '9px',  color: '#b8a888' }),
};

// ── Panel (dark card with accent border) ──
export function drawPanel(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  accentColor = COLORS.copper
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  // Shadow
  const shadow = scene.add.rectangle(2, 2, w, h, 0x000000, 0.3);
  c.add(shadow);

  // Background
  const bg = scene.add.rectangle(0, 0, w, h, COLORS.surface);
  bg.setStrokeStyle(1, COLORS.border);
  c.add(bg);

  // Top accent line
  const accent = scene.add.rectangle(0, -h / 2 + 1, w, 2, accentColor);
  c.add(accent);

  // Corner dots (industrial feel)
  const dotSize = 3;
  const margin = 6;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const dot = scene.add.rectangle(
      dx * (w / 2 - margin), dy * (h / 2 - margin),
      dotSize, dotSize, accentColor, 0.3
    );
    c.add(dot);
  }

  return c;
}

// ── Stat Bar ──
export function drawStatBar(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string, value: string,
  pct: number, barColor: number,
  barWidth = 120
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  c.add(scene.add.text(-barWidth / 2, -6, label, FONT.label()));
  c.add(scene.add.text(barWidth / 2, -6, value, { ...FONT.value(), }).setOrigin(1, 0));

  // Track
  const track = scene.add.rectangle(0, 8, barWidth, 4, COLORS.border);
  c.add(track);

  // Fill
  const fillW = barWidth * Phaser.Math.Clamp(pct, 0, 1);
  if (fillW > 0) {
    const fill = scene.add.rectangle(-barWidth / 2 + fillW / 2, 8, fillW, 4, barColor);
    c.add(fill);
  }

  // Glow on high values
  if (pct > 0.8) {
    const glow = scene.add.rectangle(-barWidth / 2 + fillW / 2, 8, fillW, 6, barColor, 0.15);
    c.add(glow);
  }

  return c;
}

// ── Heat Meter (4-phase colored bar) ──
export function drawHeatMeter(
  scene: Phaser.Scene,
  x: number, y: number,
  heat: number, thresh: number,
  width = 160
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const pct = thresh > 0 ? heat / thresh : 0;

  // Background zones
  const zones = [
    { w: 0.4, color: COLORS.safe },
    { w: 0.3, color: COLORS.warning },
    { w: 0.2, color: COLORS.critical },
    { w: 0.1, color: COLORS.meltdown },
  ];

  let zx = -width / 2;
  for (const zone of zones) {
    const zw = width * zone.w;
    c.add(scene.add.rectangle(zx + zw / 2, 0, zw, 8, zone.color, 0.12));
    zx += zw;
  }

  // Border
  c.add(scene.add.rectangle(0, 0, width, 8).setStrokeStyle(1, COLORS.border).setFillStyle(0, 0));

  // Needle indicator
  const needleX = -width / 2 + width * Phaser.Math.Clamp(pct, 0, 1);
  const needleColor = pct >= 0.9 ? COLORS.meltdown : pct >= 0.7 ? COLORS.critical : pct >= 0.4 ? COLORS.warning : COLORS.safe;
  c.add(scene.add.rectangle(needleX, 0, 3, 12, needleColor));

  // Label
  const pctText = Math.round(pct * 100);
  c.add(scene.add.text(width / 2 + 8, -4, `${pctText}%`, {
    fontFamily: 'monospace', fontSize: '8px',
    color: '#' + needleColor.toString(16).padStart(6, '0'),
  }));

  return c;
}

// ── Button ──
export function createButton(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  callback: () => void,
  options: { color?: number; width?: number; disabled?: boolean } = {}
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const w = options.width ?? (mob() ? 200 : 180);
  const h = mob() ? 40 : 32;
  const color = options.color ?? COLORS.copper;
  const disabled = options.disabled ?? false;
  const colorStr = '#' + color.toString(16).padStart(6, '0');

  // Background
  const bg = scene.add.rectangle(0, 0, w, h, COLORS.surface)
    .setStrokeStyle(1, disabled ? COLORS.border : color);
  c.add(bg);

  // Text
  const txt = scene.add.text(0, 0, label, {
    fontFamily: 'monospace',
    fontSize: mob() ? '12px' : '11px',
    color: disabled ? '#4a4236' : '#e0d4bc',
    letterSpacing: 2,
  }).setOrigin(0.5);
  c.add(txt);

  if (!disabled) {
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        bg.setStrokeStyle(2, color);
        txt.setColor(colorStr);
      })
      .on('pointerout', () => {
        bg.setStrokeStyle(1, color);
        txt.setColor('#e0d4bc');
      })
      .on('pointerdown', callback);
  }

  return c;
}

// ── Divider line ──
export function drawDivider(scene: Phaser.Scene, y: number, width?: number): Phaser.GameObjects.Rectangle {
  const w = width ?? GAME_WIDTH - 80;
  return scene.add.rectangle(GAME_WIDTH / 2, y, w, 1, COLORS.border, 0.5);
}

// ── Section header ──
export function drawSectionHeader(
  scene: Phaser.Scene,
  x: number, y: number,
  label: string,
  color = COLORS.copper
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const colorStr = '#' + color.toString(16).padStart(6, '0');

  c.add(scene.add.text(0, 0, label, {
    fontFamily: 'monospace',
    fontSize: mob() ? '10px' : '11px',
    color: colorStr,
    letterSpacing: 3,
  }));

  // Line extending right
  c.add(scene.add.rectangle(200, 6, 400, 1, color, 0.3));

  return c;
}

// ── Power source color helper ──
export function powerColor(source: string): number {
  switch (source) {
    case 'steam': return COLORS.steam2;
    case 'electric': return COLORS.elec2;
    case 'soul': return COLORS.soul2;
    default: return COLORS.copper;
  }
}

export function powerColorStr(source: string): string {
  return '#' + powerColor(source).toString(16).padStart(6, '0');
}

// ── Rarity color ──
export function rarityColor(rarity: string): string {
  const map: Record<string, string> = {
    common: '#888888', uncommon: '#4cae6e', rare: '#2aa8d4',
    epic: '#9b52d4', legendary: '#f0a84a', kenet: '#c0432e',
  };
  return map[rarity] ?? '#888888';
}

export function rarityColorNum(rarity: string): number {
  const map: Record<string, number> = {
    common: 0x888888, uncommon: 0x4cae6e, rare: 0x2aa8d4,
    epic: 0x9b52d4, legendary: 0xf0a84a, kenet: 0xc0432e,
  };
  return map[rarity] ?? 0x888888;
}
