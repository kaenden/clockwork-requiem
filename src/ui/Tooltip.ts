import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { isMobile } from '@/utils/Mobile';

/**
 * Global Tooltip system. One instance per scene.
 *
 * Usage:
 *   const tip = new Tooltip(scene);
 *   tip.attach(gameObject, 'Title', 'Description text here');
 *   // or with rich content:
 *   tip.attachRich(gameObject, { title, lines, accent });
 *   // cleanup is automatic on scene shutdown
 */

export interface TooltipContent {
  title: string;
  lines: { text: string; color?: string }[];
  accent?: number; // border accent color
  width?: number;
}

export class Tooltip {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private hideTimer: Phaser.Time.TimerEvent | null = null;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.on('shutdown', () => this.destroy());
  }

  /** Simple tooltip: title + single description line */
  attach(
    obj: Phaser.GameObjects.GameObject,
    title: string,
    desc: string,
    accent?: number,
  ): void {
    this.attachRich(obj, {
      title,
      lines: [{ text: desc, color: '#c8b89a' }],
      accent,
    });
  }

  /** Rich tooltip with multiple colored lines */
  attachRich(
    obj: Phaser.GameObjects.GameObject,
    content: TooltipContent,
  ): void {
    const mob = isMobile();

    if (mob) {
      // Mobile: show on pointerdown, hide after 2.5s or next tap
      (obj as any).setInteractive?.({ useHandCursor: false });
      obj.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (this.visible) {
          this.hide();
        } else {
          this.show(ptr.x, ptr.y, content);
          this.autoHide(2500);
        }
      });
    } else {
      // Desktop: show on hover, hide on out
      (obj as any).setInteractive?.({ useHandCursor: false });
      obj.on('pointerover', (ptr: Phaser.Input.Pointer) => {
        this.show(ptr.x, ptr.y, content);
      });
      obj.on('pointermove', (ptr: Phaser.Input.Pointer) => {
        if (this.visible) this.reposition(ptr.x, ptr.y, content.width);
      });
      obj.on('pointerout', () => {
        this.hide();
      });
    }
  }

  private show(px: number, py: number, content: TooltipContent): void {
    this.hide(); // clear previous

    const w = content.width ?? 240;
    const lineH = 16;
    const titleH = 22;
    const pad = 10;
    const totalLines = content.lines.length;
    const h = titleH + totalLines * lineH + pad * 2;
    const accent = content.accent ?? COLORS.copper;

    // Position: avoid going off screen
    let x = px + 12;
    let y = py - h - 8;
    if (x + w > GAME_WIDTH - 10) x = px - w - 12;
    if (y < 10) y = py + 20;
    if (x < 10) x = 10;

    const c = this.scene.add.container(x, y).setDepth(999);

    // Shadow
    c.add(this.scene.add.rectangle(2, 2, w, h, 0x000000, 0.5));

    // Background
    c.add(this.scene.add.rectangle(0, 0, w, h, 0x121110, 0.97)
      .setStrokeStyle(1, accent, 0.7).setOrigin(0, 0));

    // Top accent bar
    c.add(this.scene.add.rectangle(0, 0, w, 2, accent, 0.9).setOrigin(0, 0));

    // Left accent stripe
    c.add(this.scene.add.rectangle(0, 0, 2, h, accent, 0.5).setOrigin(0, 0));

    // Title
    const accentStr = '#' + accent.toString(16).padStart(6, '0');
    c.add(this.scene.add.text(pad, pad - 2, content.title, {
      fontFamily: 'monospace', fontSize: '12px', color: accentStr,
      fontStyle: 'bold',
    }));

    // Separator
    c.add(this.scene.add.rectangle(pad, titleH + pad - 4, w - pad * 2, 1, accent, 0.3).setOrigin(0, 0.5));

    // Lines
    content.lines.forEach((line, i) => {
      c.add(this.scene.add.text(pad, titleH + pad + i * lineH, line.text, {
        fontFamily: 'monospace', fontSize: '10px',
        color: line.color ?? '#c8b89a',
        wordWrap: { width: w - pad * 2 },
      }));
    });

    this.container = c;
    this.visible = true;
  }

  private reposition(px: number, py: number, tipW?: number): void {
    if (!this.container) return;
    const w = tipW ?? 240;
    let x = px + 12;
    let y = py - this.container.getBounds().height - 8;
    if (x + w > GAME_WIDTH - 10) x = px - w - 12;
    if (y < 10) y = py + 20;
    if (x < 10) x = 10;
    this.container.setPosition(x, y);
  }

  private autoHide(ms: number): void {
    this.hideTimer?.destroy();
    this.hideTimer = this.scene.time.delayedCall(ms, () => this.hide());
  }

  hide(): void {
    this.hideTimer?.destroy();
    this.hideTimer = null;
    this.container?.destroy();
    this.container = null;
    this.visible = false;
  }

  destroy(): void {
    this.hide();
  }
}
