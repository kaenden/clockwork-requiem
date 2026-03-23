import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';

export function fadeIn(scene: Phaser.Scene, duration = 300): void {
  const overlay = scene.add.rectangle(
    GAME_WIDTH / 2, GAME_HEIGHT / 2,
    GAME_WIDTH, GAME_HEIGHT,
    COLORS.bg, 1
  ).setDepth(9999);

  scene.tweens.add({
    targets: overlay,
    alpha: 0,
    duration,
    onComplete: () => overlay.destroy(),
  });
}

export function fadeOut(scene: Phaser.Scene, duration = 300): Promise<void> {
  return new Promise(resolve => {
    const overlay = scene.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      COLORS.bg, 0
    ).setDepth(9999);

    scene.tweens.add({
      targets: overlay,
      alpha: 1,
      duration,
      onComplete: () => resolve(),
    });
  });
}
