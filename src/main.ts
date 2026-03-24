import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '@/data/constants';
import { BootScene } from '@/scenes/BootScene';
import { PreloadScene } from '@/scenes/PreloadScene';
import { TutorialScene } from '@/scenes/TutorialScene';
import { MenuScene } from '@/scenes/MenuScene';
import { RunStartScene } from '@/scenes/RunStartScene';
import { MapScene } from '@/scenes/MapScene';
import { BattleScene } from '@/scenes/BattleScene';
import { SalvageScene } from '@/scenes/SalvageScene';
import { RepairScene } from '@/scenes/RepairScene';
import { TerminalScene } from '@/scenes/TerminalScene';
import { MarketScene } from '@/scenes/MarketScene';
import { TeamScene } from '@/scenes/TeamScene';
import { GameOverScene } from '@/scenes/GameOverScene';
import { ZoneTransitionScene } from '@/scenes/ZoneTransitionScene';
import { RecruitScene } from '@/scenes/RecruitScene';
import { SplitScene } from '@/scenes/SplitScene';
import { SchemaBookScene } from '@/scenes/SchemaBookScene';
import { ArchiveScene } from '@/scenes/ArchiveScene';
import { PvpMenuScene } from '@/scenes/PvpMenuScene';
import { PvpBattleScene } from '@/scenes/PvpBattleScene';
import { InventoryScene } from '@/scenes/InventoryScene';
import { JournalScene } from '@/scenes/JournalScene';

const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  || (window.innerWidth <= 800 && 'ontouchstart' in window);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.bg,
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    activePointers: 3,
    touch: { capture: true },
  },
  scene: [
    BootScene,
    PreloadScene,
    TutorialScene,
    MenuScene,
    RunStartScene,
    MapScene,
    BattleScene,
    SalvageScene,
    RepairScene,
    TerminalScene,
    MarketScene,
    TeamScene,
    GameOverScene,
    ZoneTransitionScene,
    RecruitScene,
    SplitScene,
    SchemaBookScene,
    ArchiveScene,
    InventoryScene,
    JournalScene,
    PvpMenuScene,
    PvpBattleScene,
  ],
};

const game = new Phaser.Game(config);

// Prevent pull-to-refresh and bounce on mobile
document.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

// Handle orientation / resize
window.addEventListener('resize', () => {
  game.scale.resize(GAME_WIDTH, GAME_HEIGHT);
  game.scale.refresh();
});
