import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { metaState } from '@/state/MetaStateManager';
import { LORE_ENTRIES } from '@/data/lore';
import { createButton } from '@/ui/UIKit';
import { addTouchScroll } from '@/utils/Mobile';
import { isMobile } from '@/utils/Mobile';

export class JournalScene extends Phaser.Scene {
  constructor() {
    super('Journal');
  }

  create(): void {
    const mob = isMobile();
    const cx = GAME_WIDTH / 2;
    const unlocked = metaState.get().axiomJournals;

    this.add.text(cx, 24, 'AXIOM JOURNALS', {
      fontFamily: 'monospace', fontSize: '16px', color: '#f5c563', letterSpacing: 4,
    }).setOrigin(0.5);

    this.add.text(cx, 48, `${unlocked.length} / ${LORE_ENTRIES.length} entries unlocked`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#a89878',
    }).setOrigin(0.5);

    const container = this.add.container(0, 0);
    let y = 76;
    const cardW = mob ? GAME_WIDTH - 30 : GAME_WIDTH - 100;

    for (const entry of LORE_ENTRIES) {
      const found = unlocked.includes(entry.id);

      container.add(this.add.rectangle(cx, y + 36, cardW, 68, COLORS.surface)
        .setStrokeStyle(1, found ? COLORS.copper : COLORS.border, found ? 0.5 : 0.2));

      if (found) {
        container.add(this.add.text(cx - cardW / 2 + 12, y + 8, entry.title, {
          fontFamily: 'monospace', fontSize: '12px', color: '#f5c563', letterSpacing: 2,
        }));

        container.add(this.add.text(cx - cardW / 2 + 12, y + 26, entry.text, {
          fontFamily: 'serif', fontSize: '11px', color: '#e8dcc8',
          fontStyle: 'italic', wordWrap: { width: cardW - 24 }, lineSpacing: 3,
        }));

        container.add(this.add.text(cx + cardW / 2 - 12, y + 8, entry.zone.replace(/_/g, ' ').toUpperCase(), {
          fontFamily: 'monospace', fontSize: '8px', color: '#a89878',
        }).setOrigin(1, 0));
      } else {
        container.add(this.add.text(cx, y + 36, '[ LOCKED ]', {
          fontFamily: 'monospace', fontSize: '12px', color: '#6a5e50',
        }).setOrigin(0.5));
      }

      y += 78;
    }

    const maxScroll = Math.max(0, y - GAME_HEIGHT + 60);
    addTouchScroll(this, container, maxScroll);

    createButton(this, cx, GAME_HEIGHT - 28, 'BACK', () => {
      this.scene.start('Menu');
    }, { color: COLORS.copper, width: mob ? GAME_WIDTH - 40 : 200 });
  }
}
