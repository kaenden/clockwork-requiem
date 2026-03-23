import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { metaState } from '@/state/MetaStateManager';
import { PART_POOL } from '@/data/parts';
import { addTouchScroll } from '@/utils/Mobile';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#4cae6e', rare: '#2aa8d4',
  epic: '#9b52d4', legendary: '#f0a84a', kenet: '#c0432e',
};

const SRC_COLORS: Record<string, string> = {
  steam: '#e8913a', electric: '#2aa8d4', soul: '#9b52d4',
};

const CAT_LABELS: Record<string, string> = {
  power_core: 'POWER CORE', movement: 'MOVEMENT', armor_plate: 'ARMOR',
  cooling: 'COOLING', protocol_chip: 'PROTOCOL', kenet_part: 'KENET',
};

export class SchemaBookScene extends Phaser.Scene {
  private scrollY = 0;

  constructor() {
    super('SchemaBook');
  }

  create(): void {
    const discovered = metaState.get().schemaBook;
    const totalParts = PART_POOL.length;
    const pct = totalParts > 0 ? Math.round((discovered.length / totalParts) * 100) : 0;

    this.add.text(GAME_WIDTH / 2, 30, 'SCHEMA BOOK', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f0a84a', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 56, `${discovered.length} / ${totalParts} DISCOVERED (${pct}%)`, {
      fontFamily: 'monospace', fontSize: '9px', color: '#7a6e5a', letterSpacing: 2,
    }).setOrigin(0.5);

    // Progress bar
    this.add.rectangle(GAME_WIDTH / 2, 76, 400, 4, COLORS.border);
    this.add.rectangle(GAME_WIDTH / 2 - 200, 76, 400 * (pct / 100), 4, COLORS.copper3).setOrigin(0, 0.5);

    // Group parts by category
    const categories = ['power_core', 'armor_plate', 'movement', 'cooling', 'protocol_chip', 'kenet_part'];
    const container = this.add.container(0, 0);
    let y = 110;

    for (const cat of categories) {
      const catParts = PART_POOL.filter(p => p.category === cat);
      if (catParts.length === 0) continue;

      container.add(this.add.text(40, y, CAT_LABELS[cat] ?? cat, {
        fontFamily: 'monospace', fontSize: '10px', color: '#d4893a', letterSpacing: 3,
      }));
      y += 24;

      // Grid of parts
      let x = 40;
      for (const part of catParts) {
        const found = discovered.includes(part.name);
        const rarColor = RARITY_COLORS[part.rarity] ?? '#aaa';
        const srcColor = SRC_COLORS[part.powerSource] ?? '#7a6e5a';

        // Card
        const bg = this.add.rectangle(x + 100, y + 30, 200, 56, COLORS.surface)
          .setStrokeStyle(1, found ? parseInt(rarColor.replace('#', ''), 16) : COLORS.border);
        container.add(bg);

        if (found) {
          container.add(this.add.text(x + 10, y + 10, part.name, {
            fontFamily: 'monospace', fontSize: '9px', color: rarColor,
          }));
          container.add(this.add.text(x + 10, y + 26, `${part.rarity.toUpperCase()} | ${part.powerSource.toUpperCase()}`, {
            fontFamily: 'monospace', fontSize: '7px', color: '#7a6e5a', letterSpacing: 1,
          }));

          const modText = part.statMods.map(m => {
            const sign = m.value >= 0 ? '+' : '';
            return `${m.stat.toUpperCase()} ${sign}${m.value}`;
          }).join('  ');
          container.add(this.add.text(x + 10, y + 40, modText || 'Utility', {
            fontFamily: 'monospace', fontSize: '7px', color: '#b8a888',
          }));
        } else {
          container.add(this.add.text(x + 100, y + 30, '? ? ?', {
            fontFamily: 'monospace', fontSize: '11px', color: '#4a4236',
          }).setOrigin(0.5));
        }

        x += 210;
        if (x + 200 > GAME_WIDTH - 20) {
          x = 40;
          y += 66;
        }
      }
      if (x > 40) y += 66; // finish row
      y += 10;
    }

    // Scroll support (mouse wheel + touch drag)
    const maxScroll = Math.max(0, y - GAME_HEIGHT + 60);
    this.scrollY = 0;
    addTouchScroll(this, container, maxScroll);

    // Back
    this.add.text(40, GAME_HEIGHT - 28, '[ BACK TO MENU ]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7a6e5a', letterSpacing: 2,
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Menu'));
  }
}
