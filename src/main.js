import Phaser from 'phaser';
import { TitleScene } from './scenes/TitleScene.js';
import { BootScene } from './scenes/BootScene.js';
import { CutsceneScene } from './scenes/CutsceneScene.js';
import { TutorialBattleScene } from './scenes/TutorialBattleScene.js';
import { PostTutorialCutscene, PostTutorialVictory, PostTutorialDefeat } from './scenes/PostTutorialCutscene.js';
import { FarmlandCutscene } from './scenes/FarmlandCutscene.js';
import { BrackenCutscene } from './scenes/BrackenCutscene.js';
import { RivinRecruitCutscene } from './scenes/RivinRecruitCutscene.js';
import { BrackenVictoryCutscene } from './scenes/BrackenVictoryCutscene.js';
import { CatacombsCutscene } from './scenes/CatacombsCutscene.js';
import { HalVictoryCutscene } from './scenes/HalVictoryCutscene.js';
import { NewsOfAtikeshCutscene } from './scenes/NewsOfAtikeshCutscene.js';
import { CravenForestCutscene } from './scenes/CravenForestCutscene.js';
import { FortRitkerCutscene } from './scenes/FortRitkerCutscene.js';
import { OverworldScene } from './scenes/OverworldScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { BattleUIScene } from './scenes/BattleUIScene.js';
import { PartyScene } from './scenes/PartyScene.js';
import { InventoryScene } from './scenes/InventoryScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { InnScene } from './scenes/InnScene.js';
import { ExperienceScene } from './scenes/ExperienceScene.js';
import { TouchControlsScene } from './scenes/TouchControlsScene.js';
import { QuestLogScene } from './scenes/QuestLogScene.js';
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
  scene: [TitleScene, BootScene, CutsceneScene, TutorialBattleScene, PostTutorialCutscene, PostTutorialVictory, PostTutorialDefeat, FarmlandCutscene, BrackenCutscene, RivinRecruitCutscene, BrackenVictoryCutscene, CatacombsCutscene, HalVictoryCutscene, NewsOfAtikeshCutscene, CravenForestCutscene, FortRitkerCutscene, OverworldScene, BattleScene, BattleUIScene, PartyScene, InventoryScene, ShopScene, InnScene, ExperienceScene, QuestLogScene, TouchControlsScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

const soundManager = new SoundManager();
game.registry.set('soundManager', soundManager);
