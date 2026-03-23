import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { AudioManager } from '@/systems/AudioManager';
import { fadeIn } from '@/ui/SceneTransition';

interface TutorialPage {
  title: string;
  lines: string[];
  accent: number;
}

const PAGES: TutorialPage[] = [
  {
    title: 'WELCOME, AXIOM-0',
    accent: COLORS.copper3,
    lines: [
      'You are the last conscious machine.',
      'The Kenet Virus has infected every automaton.',
      'Your mission: find the source. Destroy it.',
      '',
      'But every part you salvage makes you stronger',
      '...and pushes you closer to OVERLOAD.',
    ],
  },
  {
    title: 'POWER SOURCES',
    accent: COLORS.steam2,
    lines: [
      'Choose one of three power sources for your run:',
      '',
      'STEAM — Heavy, durable, heat-resistant. Slow tank.',
      'ELECTRIC — Fast, precise, fragile. Glass cannon.',
      'SOUL — Unpredictable, powerful. Highest risk/reward.',
      '',
      'This choice defines your entire run strategy.',
    ],
  },
  {
    title: 'THE CORE LOOP',
    accent: COLORS.elec2,
    lines: [
      '1. Navigate the MAP — choose rooms wisely',
      '2. BATTLE is automatic — your prep is the strategy',
      '3. SALVAGE parts from defeated enemies',
      '4. Manage HEAT — every part has a cost',
      '5. Recruit new units between zones',
      '6. Defeat the BOSS to advance',
    ],
  },
  {
    title: 'OVERLOAD — THE HEART OF THE GAME',
    accent: COLORS.meltdown,
    lines: [
      'Every part you add lowers your OVERLOAD THRESHOLD.',
      '',
      'SAFE (0-40%) — Normal operation',
      'WARNING (40-70%) — Strong abilities disabled',
      'CRITICAL (70-90%) — +50% damage but heat spirals',
      'MELTDOWN (90%+) — EXPLOSION. Unit destroyed. AoE damage.',
      '',
      'Expert players use explosions as weapons.',
    ],
  },
  {
    title: 'TEAM & DIRECTIVES',
    accent: COLORS.soul2,
    lines: [
      'Build a team of up to 5 units (AXIOM + 4).',
      'Assign DIRECTIVES to control battle behavior:',
      '',
      'ATK — Focus weakest enemy',
      'DEF — Target biggest threat',
      'TGT — Prioritize same power type',
      'CON — Quick kills, low heat',
      'BRK — Max power, random target',
    ],
  },
  {
    title: 'SPLITS & PROGRESSION',
    accent: COLORS.copper3,
    lines: [
      'At Level 10: Choose a BODY TYPE (3 options)',
      'At Level 20: Choose a WEAPON MODULE (3 options)',
      '',
      '3 Power Sources x 3 Bodies x 3 Weapons = 27 builds',
      '',
      'After each run, your discoveries are saved.',
      'Ascension mode adds new challenges.',
      '',
      'Good luck, AXIOM-0. The clock is ticking.',
    ],
  },
];

export class TutorialScene extends Phaser.Scene {
  private pageIndex = 0;

  constructor() {
    super('Tutorial');
  }

  create(): void {
    fadeIn(this);
    this.pageIndex = 0;
    this.showPage();
  }

  private showPage(): void {
    this.children.removeAll();

    const page = PAGES[this.pageIndex];
    const cx = GAME_WIDTH / 2;
    const accentStr = '#' + page.accent.toString(16).padStart(6, '0');

    // Page indicator
    this.add.text(cx, 30, `${this.pageIndex + 1} / ${PAGES.length}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#6a5e50', letterSpacing: 3,
    }).setOrigin(0.5);

    // Progress bar
    const pct = (this.pageIndex + 1) / PAGES.length;
    this.add.rectangle(cx, 46, 300, 2, COLORS.border);
    this.add.rectangle(cx - 150, 46, 300 * pct, 2, page.accent).setOrigin(0, 0.5);

    // Title
    this.add.text(cx, 90, page.title, {
      fontFamily: 'monospace', fontSize: '14px', color: accentStr, letterSpacing: 5,
    }).setOrigin(0.5);

    // Content
    let y = 160;
    for (const line of page.lines) {
      if (line === '') { y += 12; continue; }

      // Highlight lines that start with keywords
      let color = '#b8a888';
      if (line.startsWith('STEAM') || line.startsWith('ELECTRIC') || line.startsWith('SOUL')) color = accentStr;
      if (line.startsWith('SAFE')) color = '#4cae6e';
      if (line.startsWith('WARNING')) color = '#d4a82a';
      if (line.startsWith('CRITICAL')) color = '#c0432e';
      if (line.startsWith('MELTDOWN')) color = '#ff6b4a';
      if (line.startsWith('ATK') || line.startsWith('DEF') || line.startsWith('TGT') ||
          line.startsWith('CON') || line.startsWith('BRK')) color = '#d4893a';
      if (line.match(/^\d\./)) color = '#e0d4bc';

      this.add.text(cx, y, line, {
        fontFamily: 'monospace', fontSize: '15px', color, letterSpacing: 1,
      }).setOrigin(0.5);
      y += 22;
    }

    // Navigation
    if (this.pageIndex > 0) {
      this.add.text(100, GAME_HEIGHT - 40, '[ BACK ]', {
        fontFamily: 'monospace', fontSize: '15px', color: '#c8b89a', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.pageIndex--; this.showPage(); AudioManager.playTick(0.03); });
    }

    if (this.pageIndex < PAGES.length - 1) {
      this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 40, '[ NEXT ]', {
        fontFamily: 'monospace', fontSize: '15px', color: '#f0a84a', letterSpacing: 2,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => { this.pageIndex++; this.showPage(); AudioManager.playTick(0.03); });
    } else {
      this.add.text(GAME_WIDTH - 100, GAME_HEIGHT - 40, '[ BEGIN ]', {
        fontFamily: 'monospace', fontSize: '14px', color: '#4cae6e', letterSpacing: 3,
      }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          localStorage.setItem('cr_tutorial_seen', '1');
          this.scene.start('Menu');
        });
    }

    // Skip
    this.add.text(cx, GAME_HEIGHT - 40, '[ SKIP ]', {
      fontFamily: 'monospace', fontSize: '13px', color: '#6a5e50', letterSpacing: 2,
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        localStorage.setItem('cr_tutorial_seen', '1');
        this.scene.start('Menu');
      });
  }
}
