import { PARTY_DEFS, createCharacter } from '../data/characters.js';
import { deserializeRoster } from '../data/saveManager.js';
import { initQuestState } from '../utils/QuestManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  init(data) {
    this.loadData = data?.loadData || null;
  }

  create() {
    if (this.loadData) {
      // ── Load saved game ──
      const roster = deserializeRoster(this.loadData.roster);
      this.registry.set('roster', roster);
      this.registry.set('inventory', [...(this.loadData.inventory || [])]);
      this.registry.set('gold', this.loadData.gold || 0);
      this.registry.set('bossDefeated', this.loadData.bossDefeated || false);
      this.registry.set('tutorialComplete', this.loadData.tutorialComplete !== false);
      this.registry.set('collectedItems', { ...(this.loadData.collectedItems || {}) });
      this.registry.set('defeatedOverworldEnemies', { ...(this.loadData.defeatedOverworldEnemies || {}) });
      this.registry.set('activeSlot', this.loadData.activeSlot || null);
      this.registry.set('partyOrder', this.loadData.partyOrder || []);

      this.registry.set('farmlandCutscenePlayed', this.loadData.farmlandCutscenePlayed || false);
      this.registry.set('brackenCutscenePlayed', this.loadData.brackenCutscenePlayed || false);
      this.registry.set('rivinDialoguePlayed', this.loadData.rivinDialoguePlayed || false);
      this.registry.set('rivinRecruitPlayed', this.loadData.rivinRecruitPlayed || false);
      this.registry.set('captainApproachPlayed', this.loadData.captainApproachPlayed || false);
      this.registry.set('ricketsProximityPlayed', this.loadData.ricketsProximityPlayed || false);
      this.registry.set('catacombsCutscenePlayed', this.loadData.catacombsCutscenePlayed || false);
      this.registry.set('halBattleTriggered', this.loadData.halBattleTriggered || false);
      this.registry.set('newsOfAtikeshCutscenePlayed', this.loadData.newsOfAtikeshCutscenePlayed || false);

      // Restore quest state (or init fresh for old saves without it)
      if (this.loadData.questState) {
        this.registry.set('questState', this.loadData.questState);
      } else {
        initQuestState(this.registry);
      }

      this.scene.start('Overworld', { playerPos: this.loadData.playerPos });
    } else {
      // ── New game ──
      const roster = {};
      for (const [key, def] of Object.entries(PARTY_DEFS)) {
        roster[key] = createCharacter(def, 1);
      }
      roster.metz.recruited = true;
      roster.metz.active = true;

      this.registry.set('roster', roster);
      this.registry.set('inventory', ['rusty_sword', 'leather_cap', 'rope_belt', 'worn_boots', 'health_potion', 'health_potion']);
      this.registry.set('gold', 100);
      this.registry.set('bossDefeated', false);
      this.registry.set('tutorialComplete', false);
      this.registry.set('collectedItems', {});
      this.registry.set('defeatedOverworldEnemies', {});
      this.registry.set('activeSlot', null);
      this.registry.set('partyOrder', ['metz']);
      this.registry.set('farmlandCutscenePlayed', false);
      this.registry.set('brackenCutscenePlayed', false);
      this.registry.set('rivinDialoguePlayed', false);
      this.registry.set('rivinRecruitPlayed', false);
      this.registry.set('captainApproachPlayed', false);
      this.registry.set('ricketsProximityPlayed', false);
      this.registry.set('catacombsCutscenePlayed', false);
      this.registry.set('halBattleTriggered', false);
      this.registry.set('newsOfAtikeshCutscenePlayed', false);

      initQuestState(this.registry);

      this.scene.start('Cutscene');
    }
  }
}
