import { PARTY_DEFS, createCharacter } from '../data/characters.js';
import { deserializeRoster } from '../data/saveManager.js';

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
      this.registry.set('collectedItems', { ...(this.loadData.collectedItems || {}) });
      this.registry.set('defeatedOverworldEnemies', { ...(this.loadData.defeatedOverworldEnemies || {}) });
      this.registry.set('activeSlot', this.loadData.activeSlot || null);

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
      this.registry.set('collectedItems', {});
      this.registry.set('defeatedOverworldEnemies', {});
      this.registry.set('activeSlot', null);

      this.scene.start('Cutscene');
    }
  }
}
