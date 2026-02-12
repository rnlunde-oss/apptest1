import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { BootScene } from './scenes/BootScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { TutorialBattleScene } from './scenes/TutorialBattleScene.js';
import { PostTutorialCutscene, PostTutorialVictory, PostTutorialDefeat } from './scenes/PostTutorialCutscene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { BattleUIScene } from './scenes/BattleUIScene.js';
import { PartyScene } from './scenes/PartyScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { InnScene } from './scenes/InnScene.js';
import { ExperienceScene } from './scenes/ExperienceScene.js';
import { TouchControlsScene } from './scenes/TouchControlsScene.js';
import { SoundManager } from './utils/SoundManager.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 640,
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scene: [TitleScene, BootScene, CutsceneScene, TutorialBattleScene, PostTutorialCutscene, PostTutorialVictory, PostTutorialDefeat, OverworldScene, BattleScene, BattleUIScene, PartyScene, InventoryScene, ShopScene, InnScene, ExperienceScene, TouchControlsScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

const soundManager = new SoundManager();
game.registry.set('soundManager', soundManager);
