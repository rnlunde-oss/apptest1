import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { BootScene } from './scenes/BootScene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { BattleUIScene } from './scenes/BattleUIScene.js';
import { PartyScene } from './scenes/PartyScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { InnScene } from './scenes/InnScene.js';
import { ExperienceScene } from './scenes/ExperienceScene.js';

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
  scene: [TitleScene, BootScene, OverworldScene, BattleScene, BattleUIScene, PartyScene, InventoryScene, ShopScene, InnScene, ExperienceScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);
