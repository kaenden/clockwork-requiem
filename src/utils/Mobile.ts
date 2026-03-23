import { GAME_WIDTH, GAME_HEIGHT } from '@/data/constants';

export const isMobile = (): boolean =>
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  || (window.innerWidth <= 800 && 'ontouchstart' in window);

// Responsive font size — smaller on mobile
export const fontSize = (desktop: number): string =>
  `${isMobile() ? Math.max(8, Math.round(desktop * 0.75)) : desktop}px`;

// Responsive padding
export const pad = (desktop: number): number =>
  isMobile() ? Math.round(desktop * 0.6) : desktop;

// Button hit area — bigger on mobile for touch
export const btnPad = (): { x: number; y: number } =>
  isMobile() ? { x: 16, y: 12 } : { x: 8, y: 6 };

// Scroll speed — faster on mobile (touch swipe feels slow otherwise)
export const scrollSpeed = (): number => isMobile() ? 1.5 : 0.5;

// Add touch drag scroll to a container
export function addTouchScroll(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  maxScroll: number
): { getScroll: () => number } {
  let scrollY = 0;
  let dragging = false;
  let lastY = 0;

  // Mouse wheel
  scene.input.on('wheel', (_pointer: any, _over: any, _dx: number, dy: number) => {
    scrollY = Phaser.Math.Clamp(scrollY + dy * scrollSpeed(), 0, maxScroll);
    container.y = -scrollY;
  });

  // Touch drag
  scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    dragging = true;
    lastY = pointer.y;
  });

  scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (!dragging) return;
    const dy = lastY - pointer.y;
    lastY = pointer.y;
    scrollY = Phaser.Math.Clamp(scrollY + dy, 0, maxScroll);
    container.y = -scrollY;
  });

  scene.input.on('pointerup', () => { dragging = false; });

  return { getScroll: () => scrollY };
}
