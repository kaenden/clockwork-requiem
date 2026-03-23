import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // Minimal assets for loading screen
  }

  create(): void {
    // Show tutorial on first launch
    const tutorialSeen = localStorage.getItem('cr_tutorial_seen');
    if (!tutorialSeen) {
      this.scene.start('Preload', { firstLaunch: true });
    } else {
      this.scene.start('Preload');
    }
  }
}
