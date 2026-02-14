// BrackenScene — Instanced town map for Bracken (40×40)
// Full quest support: NPCs, dialogue, skeleton encounters, boss battle, quest integration
import { BRACKEN_MAP, BRACKEN_COLS, BRACKEN_ROWS, BRACKEN_TILE_SIZE, BRACKEN_SPAWNS } from '../data/brackenMap.js';
import { TILE_COLORS } from '../data/maps.js';
import { createEnemy } from '../data/characters.js';
import { QUEST_DEFS } from '../data/quests.js';
import { serializeGameState, autoSave, saveToSlot } from '../data/saveManager.js';
import {
  findDefeatEnemyObjectives, findDefeatCountObjectives, findTalkNPCObjectives,
  progressObjective, completeQuest, isQuestActive, isQuestComplete,
} from '../utils/QuestManager.js';

const PLAYER_SPEED = 140;
const IMPASSABLE = new Set([1, 4, 7, 8, 11, 14, 21]);

// Overworld spawn positions when exiting each gate (one tile outside the gate)
const OVERWORLD_EXIT = {
  north: { x: 79 * 32 + 16, y: 110 * 32 + 16 },
  west:  { x: 76 * 32 + 16, y: 115 * 32 + 16 },
  east:  { x: 86 * 32 + 16, y: 116 * 32 + 16 },
};

// Skeleton encounter table for "Clear the Town" quest
const BRACKEN_SKELETON_TABLE = [
  { enemies: ['skeleton', 'skeleton'], weight: 25, xp: 22, gold: 18 },
  { enemies: ['skeleton', 'skeleton', 'skeleton'], weight: 35, xp: 32, gold: 28 },
  { enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton'], weight: 25, xp: 42, gold: 35 },
  { enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton', 'skeleton'], weight: 15, xp: 52, gold: 42 },
];

const ENCOUNTER_RATE = 0.12;

// Speaker portrait lookup (subset used by town dialogue)
const SPEAKER_PORTRAITS = {
  'Metz': 'metz_portrait_base',
  'Cpt. Metz': 'metz_portrait_base',
  'Rivin': 'rivin_portrait_base',
  'Lyra': 'lyra_portrait_base',
  'Captain Tertullian': null,
  'Jocee': null,
  'Naman': null,
};

export class BrackenScene extends Phaser.Scene {
  constructor() {
    super('Bracken');
  }

  init(data) {
    this.entrance = data?.entrance || 'west';
    this.pendingRivinRecruit = data?.fromRivinRecruit || false;
    this.pendingBrackenVictory = data?.fromBrackenVictory || false;
    this.savedPlayerPos = data?.playerPos || null;
  }

  preload() {
    const dirs = ['down', 'up', 'left', 'right'];
    for (const d of dirs) {
      const key = `player_${d}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/sprites/${key}.png`);
      }
    }
  }

  create() {
    this.sfx = this.registry.get('soundManager');
    this.transitioning = false;
    this.inBattle = false;
    this.dialogueActive = false;
    this.dialogueQueue = [];

    const mapW = BRACKEN_COLS * BRACKEN_TILE_SIZE;
    const mapH = BRACKEN_ROWS * BRACKEN_TILE_SIZE;

    this.physics.world.setBounds(0, 0, mapW, mapH);

    // ─── Render all tiles ───
    this.walls = this.physics.add.staticGroup();

    for (let row = 0; row < BRACKEN_ROWS; row++) {
      for (let col = 0; col < BRACKEN_COLS; col++) {
        const tile = BRACKEN_MAP[row][col];
        const x = col * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
        const y = row * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;

        const color = TILE_COLORS[tile] ?? 0xff00ff;
        const rect = this.add.rectangle(x, y, BRACKEN_TILE_SIZE, BRACKEN_TILE_SIZE, color).setDepth(0);

        if (IMPASSABLE.has(tile)) {
          this.physics.add.existing(rect, true);
          this.walls.add(rect);
        }

        // Gate tiles get a subtle gold glow
        if (tile === 22) {
          const glow = this.add.rectangle(x, y, BRACKEN_TILE_SIZE, BRACKEN_TILE_SIZE, 0xddaa22, 0.3).setDepth(1);
          this.tweens.add({
            targets: glow, alpha: 0.1, duration: 800,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        // Campfire flicker
        if (tile === 8) {
          const flame = this.add.circle(x, y - 4, 5, 0xff6622, 0.8).setDepth(2);
          this.tweens.add({
            targets: flame, scaleX: 1.3, scaleY: 1.3, alpha: 0.4,
            duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
      }
    }

    this.walls.refresh();

    // ─── Player ───
    const spawn = this.savedPlayerPos
      || BRACKEN_SPAWNS[this.entrance]
      || BRACKEN_SPAWNS.west;
    this.playerDir = this.entrance === 'west' ? 'right'
                   : this.entrance === 'east' ? 'left'
                   : 'down';
    if (this.savedPlayerPos) this.playerDir = 'down';

    this.player = this.add.sprite(spawn.x, spawn.y, `player_${this.playerDir}`).setDepth(10);
    const scaleY = 36 / this.player.height;
    this.player.setScale(scaleY);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(this.player.width * 0.55, this.player.height * 0.35);
    this.player.body.setOffset(
      this.player.width * 0.225,
      this.player.height * 0.6
    );

    this.physics.add.collider(this.player, this.walls);

    // ─── Camera (dual camera system for zoomed world + unzoomed UI) ───
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(3.35);

    this.uiCamera = this.cameras.add(0, 0, 800, 640);
    this.children.list.forEach(obj => this.uiCamera.ignore(obj));

    // ─── Input ───
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.lastTileX = Math.floor(this.player.x / BRACKEN_TILE_SIZE);
    this.lastTileY = Math.floor(this.player.y / BRACKEN_TILE_SIZE);

    // ─── NPCs ───
    this.spawnNPCs();

    // ─── Post-cutscene handling ───
    if (this.pendingRivinRecruit) {
      this.pendingRivinRecruit = false;
      this.time.delayedCall(300, () => {
        this.recruitRivin();
      });
    }

    if (this.pendingBrackenVictory) {
      this.pendingBrackenVictory = false;
      this.time.delayedCall(300, () => {
        this.spawnTertullian(19, 5);
        this.triggerTertullianDialogue();
      });
    }

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  // ──── UI Helper (dual camera pattern) ────

  _addUI(obj) {
    this.cameras.main.ignore(obj);
    return obj;
  }

  // ──── NPC System ────

  spawnNPCs() {
    this.townNpcs = [];
    this.rivinNpc = null;
    this.skeletalCaptain = null;
    this.tertullianNpc = null;

    // Rivin — visible when brackenCutscenePlayed && !rivinRecruitPlayed
    if (this.registry.get('brackenCutscenePlayed') && !this.registry.get('rivinRecruitPlayed')) {
      const rx = 20 * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
      const ry = 18 * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;

      const body = this.add.rectangle(rx, ry, 22, 28, 0xbb6622).setDepth(10);
      this.physics.add.existing(body, true);
      this.add.rectangle(rx, ry + 8, 20, 6, 0x885511).setDepth(11);
      this.add.text(rx, ry - 22, 'Rivin', {
        fontSize: '9px', color: '#ffcc88', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);
      this.add.text(rx, ry - 13, 'Warrior', {
        fontSize: '7px', color: '#888888',
      }).setOrigin(0.5).setDepth(11);

      const marker = this.add.text(rx, ry - 32, '!', {
        fontSize: '14px', fontStyle: 'bold', color: '#ffff00',
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: marker, y: ry - 36,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.physics.add.collider(this.player, body);
      this.rivinNpc = { id: 'rivin', body, marker, x: rx, y: ry };
      this.townNpcs.push(this.rivinNpc);

      // Townfolk near Rivin at the town square
      this.spawnTownfolk(18, 17, 'Jocee', 0x886655);
      this.spawnTownfolk(22, 17, 'Naman', 0x665544);
    }

    // Skeletal Captain — visible when act1_retake_bracken is active and not yet defeated
    const defeatedMap = this.registry.get('defeatedOverworldEnemies') || {};
    if (isQuestActive(this.registry, 'act1_retake_bracken') && !defeatedMap['skeletal_captain']) {
      const cx = 19 * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
      const cy = 5 * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;

      const body = this.add.rectangle(cx, cy, 24, 30, 0x998866).setDepth(10);
      this.physics.add.existing(body, true);
      this.add.rectangle(cx, cy + 8, 22, 6, 0x776644).setDepth(11);
      this.add.text(cx, cy - 24, 'Skeletal Captain', {
        fontSize: '8px', color: '#ccaa88', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);

      const marker = this.add.text(cx, cy - 32, '!', {
        fontSize: '14px', fontStyle: 'bold', color: '#ff4444',
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: marker, y: cy - 36,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.physics.add.collider(this.player, body);
      this.skeletalCaptain = { body, marker, x: cx, y: cy, defeated: false };
    }

    // Tertullian — visible after Skeletal Captain is defeated (persistent)
    if (isQuestComplete(this.registry, 'act1_retake_bracken')) {
      this.spawnTertullian(19, 5);
    }
  }

  spawnTownfolk(tileX, tileY, name, color) {
    const px = tileX * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
    const py = tileY * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
    const body = this.add.rectangle(px, py, 18, 24, color).setDepth(10);
    this.physics.add.existing(body, true);
    this.add.text(px, py - 18, name, {
      fontSize: '7px', color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(11);
    this.physics.add.collider(this.player, body);
  }

  spawnTertullian(tileX, tileY) {
    const px = tileX * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
    const py = tileY * BRACKEN_TILE_SIZE + BRACKEN_TILE_SIZE / 2;
    const body = this.add.rectangle(px, py, 22, 28, 0x889999).setDepth(10);
    this.physics.add.existing(body, true);
    this.add.rectangle(px, py + 8, 20, 6, 0x667777).setDepth(11);
    this.add.text(px, py - 22, 'Cpt. Tertullian', {
      fontSize: '8px', color: '#aaccdd', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
    this.add.text(px, py - 13, 'Garrison', {
      fontSize: '7px', color: '#888888',
    }).setOrigin(0.5).setDepth(11);
    this.physics.add.collider(this.player, body);
    this.tertullianNpc = { body, x: px, y: py };
  }

  // ──── Proximity Triggers ────

  checkProximityTriggers() {
    const px = this.player.x;
    const py = this.player.y;
    const ty = Math.floor(py / BRACKEN_TILE_SIZE);

    // 1. Rivin "Die you wretches!" dialogue
    if (this.rivinNpc
        && this.registry.get('brackenCutscenePlayed')
        && !this.registry.get('rivinDialoguePlayed')) {
      const dx = px - this.rivinNpc.x;
      const dy = py - this.rivinNpc.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 2.5 * BRACKEN_TILE_SIZE) {
        this.registry.set('rivinDialoguePlayed', true);
        this.player.body.setVelocity(0);
        this.triggerRivinDialogue();
        return true;
      }
    }

    // 2. Rivin recruit — after clearing skeletons
    if (this.rivinNpc
        && this.registry.get('rivinDialoguePlayed')
        && !this.registry.get('rivinRecruitPlayed')
        && isQuestComplete(this.registry, 'act1_clear_bracken')) {
      const dx = px - this.rivinNpc.x;
      const dy = py - this.rivinNpc.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 2.5 * BRACKEN_TILE_SIZE) {
        this.registry.set('rivinRecruitPlayed', true);
        this.player.body.setVelocity(0);
        this.triggerRivinRecruit();
        return true;
      }
    }

    // 3. Captain approach dialogue — near garrison (north part of town)
    if (this.registry.get('rivinRecruitPlayed')
        && !this.registry.get('captainApproachPlayed')
        && isQuestActive(this.registry, 'act1_retake_bracken')) {
      if (ty <= 10) {
        this.registry.set('captainApproachPlayed', true);
        this.player.body.setVelocity(0);
        this.triggerCaptainApproach();
        return true;
      }
    }

    // 4. Skeletal Captain battle — approach boss
    if (this.skeletalCaptain && !this.skeletalCaptain.defeated
        && this.registry.get('captainApproachPlayed')
        && isQuestActive(this.registry, 'act1_retake_bracken')) {
      const dx = px - this.skeletalCaptain.x;
      const dy = py - this.skeletalCaptain.y;
      if (Math.sqrt(dx * dx + dy * dy) <= 2.5 * BRACKEN_TILE_SIZE) {
        this.startSkeletalCaptainBattle();
        return true;
      }
    }

    return false;
  }

  // ──── Dialogue Triggers ────

  triggerRivinDialogue() {
    this.showDialogue([
      'Rivin: "Die you wretches!"',
      'Jocee: "Praise the dawn, Rivin. We would have died without you."',
      'Rivin: "You won\'t be dyin\' before me, Jocee."',
      'Naman: "Look! Reinforcements have arrived!"',
      'Lyra: "I wouldn\'t oversell it, kid."',
      'Metz: "I am Captain Metz of His Majesty\'s forces. Has the garrison been defeated?"',
      'Rivin: "The town is taken, sir. Few remain to fight. Seems like the mayor and captain are held up in the fort. Elsewise the dead wouldn\'t be banging so loudly against the gate."',
      'Metz: "We\'ll need to fight our way in. If Bracken is taken the entire frontier collapses."',
      'Rivin: "Aye. Clear the town for me and I\'ll join you in that fight, sir."',
    ], () => {
      this.checkQuestNPCTalk('rivin');
      this.triggerAutoSave();
    });
  }

  triggerRivinRecruit() {
    this.registry.set('rivinRecruitFromBracken', true);
    this.registry.set('rivinRecruitPlayerPos', { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('RivinRecruitCutscene');
    });
  }

  recruitRivin() {
    this.sfx.playNPCRecruit();
    const roster = this.registry.get('roster');
    roster.rivin.recruited = true;
    roster.rivin.active = true;

    const partyOrder = this.registry.get('partyOrder') || [];
    if (!partyOrder.includes('rivin')) {
      partyOrder.push('rivin');
      this.registry.set('partyOrder', partyOrder);
    }

    // Remove Rivin NPC marker
    if (this.rivinNpc && this.rivinNpc.marker) {
      this.rivinNpc.marker.destroy();
    }

    this.triggerAutoSave();
  }

  triggerCaptainApproach() {
    this.showDialogue([
      'Rivin: "There it is."',
      'Lyra: "The gate\'s been drawn up."',
      'Rivin: "Aye. Captain Tertullian sounded the retreat to the garrison after the gate was breached."',
      'Metz: "How many men does he have with him?"',
      'Rivin: "Not many. The King don\'t seem to mind the east too much."',
      'Lyra: "If we can break through perhaps we\'ll be able to save the town."',
      'Metz: "Follow me."',
    ], () => {
      this.triggerAutoSave();
    });
  }

  triggerTertullianDialogue() {
    this.showDialogue([
      'Captain Tertullian: "Hail, captain."',
      'Metz: "Hail."',
      'Captain Tertullian: "I am Captain Tertullian, tasked with the garrison of Fort Bracken. By the Song, we are grateful you\'ve come."',
      'Rivin: "And not a moment too soon."',
      'Captain Tertullian: "Do you bring reinforcements with you?"',
      'Metz: "None save for these."',
      'Lyra: "Aren\'t you impressed?"',
      'Captain Tertullian: "Curses! What does His Majesty propose we do with so few?"',
      'Metz: "Send a missive to Izgera. I assure you he has no knowledge of the situation at hand."',
      'Captain Tertullian: "At once. I will dispatch a courier. However, you should know we are scarcely safe still."',
      'Metz: "Are there more forces?"',
      'Captain Tertullian: "Aye. The skeletons stormed the gates from the east. We think they crossed the river crossing from the side of\u2026"',
      'Rivin: "\u2026the Catacombs."',
      'Captain Tertullian: "Aye. \'Tis the only explanation for their numbers."',
      'Lyra: "Then we must secure the Catacombs."',
      'Captain Tertullian: "Indeed. I can scarcely afford a man given our breached defenses. But you\'ve already proven how capable fighters you are. Perhaps you can go on ahead."',
      'Rivin: "Appreciate the confidence, sir."',
      'Captain Tertullian: "Believe me. I wish it were not this way."',
      'Metz: "It will be done."',
    ], () => {
      this.triggerAutoSave();
    });
  }

  // ──── Battle System ────

  startSkeletalCaptainBattle() {
    this.player.body.setVelocity(0);
    this.showDialogue([
      'An armored skeleton stands at the gate of Fort Bracken, its cursed blade drawn and three skeleton soldiers at its side.',
      'The Skeletal Captain will not yield the gate willingly.',
    ], () => {
      this.inBattle = true;
      this.sfx.playEncounterStart();

      const enemies = ['skeletal_captain', 'skeleton', 'skeleton', 'skeleton'].map(key => createEnemy(key));
      const activeParty = this.getActiveParty();
      for (const member of activeParty) {
        member.isDefending = false;
        member.isCharged = false;
        member.statusEffects = [];
      }

      this.cameras.main.flash(400, 100, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.launch('Battle', {
          party: activeParty,
          enemies,
          xpReward: 75,
          goldReward: 65,
          enemyTypes: ['skeletal_captain', 'skeleton', 'skeleton', 'skeleton'],
          roster: this.getFullRoster(),
          isBossEncounter: false,
          zone: 'cursed',
          onBattleEnd: (result) => {
            this.scene.stop('Battle');
            this.scene.stop('BattleUI');
            this.scene.resume();
            this.inBattle = false;

            if (result === 'win') {
              this.skeletalCaptain.defeated = true;
              this.skeletalCaptain.body.destroy();
              this.skeletalCaptain.marker.destroy();

              // Record defeat in registry
              const defeated = this.registry.get('defeatedOverworldEnemies') || {};
              defeated['skeletal_captain'] = true;
              this.registry.set('defeatedOverworldEnemies', defeated);

              this.showDialogue([
                'The Skeletal Captain crumbles, its armor clattering to the ground.',
                'The gate to Fort Bracken is open.',
              ], () => {
                this.checkQuestOverworldEnemyDefeat('skeletal_captain');
                this.checkQuestBattleEnd(['skeletal_captain', 'skeleton', 'skeleton', 'skeleton']);
                this.triggerBrackenVictoryCutscene();
              });
            } else if (result === 'lose') {
              this.handleDefeat();
            }
          },
        });
        this.scene.pause();
      });
    });
  }

  startSkeletonEncounter() {
    this.player.body.setVelocity(0);
    this.inBattle = true;
    this.sfx.playEncounterStart();

    // Pick from encounter table
    const totalWeight = BRACKEN_SKELETON_TABLE.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * totalWeight;
    let picked = BRACKEN_SKELETON_TABLE[0];
    for (const entry of BRACKEN_SKELETON_TABLE) {
      roll -= entry.weight;
      if (roll <= 0) { picked = entry; break; }
    }

    const enemies = picked.enemies.map(key => createEnemy(key));
    const activeParty = this.getActiveParty();
    for (const member of activeParty) {
      member.isDefending = false;
      member.isCharged = false;
      member.statusEffects = [];
    }

    this.cameras.main.flash(400, 100, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.launch('Battle', {
        party: activeParty,
        enemies,
        xpReward: picked.xp,
        goldReward: picked.gold,
        enemyTypes: [...picked.enemies],
        roster: this.getFullRoster(),
        isBossEncounter: false,
        zone: 'cursed',
        onBattleEnd: (result) => {
          this.scene.stop('Battle');
          this.scene.stop('BattleUI');
          this.scene.resume();
          this.inBattle = false;

          if (result === 'win') {
            this.checkQuestBattleEnd(picked.enemies);
            this.triggerAutoSave();
          } else if (result === 'lose') {
            this.handleDefeat();
          }
        },
      });
      this.scene.pause();
    });
  }

  checkEncounter(tx, ty) {
    // Only trigger encounters when act1_clear_bracken is active
    if (!isQuestActive(this.registry, 'act1_clear_bracken')) return;

    // Only on walkable tiles (grass or path)
    const tile = BRACKEN_MAP[ty]?.[tx];
    if (tile !== 0 && tile !== 3) return;

    if (Math.random() < ENCOUNTER_RATE) {
      this.startSkeletonEncounter();
    }
  }

  triggerBrackenVictoryCutscene() {
    this.registry.set('brackenVictoryFromBracken', true);
    this.registry.set('brackenVictoryPlayerPos', { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BrackenVictoryCutscene');
    });
  }

  handleDefeat() {
    this.showDialogue(['You were overwhelmed... Your party retreats and rests.'], () => {
      const roster = this.registry.get('roster');
      for (const char of Object.values(roster)) {
        if (char.recruited) {
          char.hp = char.maxHp;
          char.mp = char.maxMp;
        }
      }
      const exitPos = OVERWORLD_EXIT[this.entrance] || OVERWORLD_EXIT.west;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Overworld', { playerPos: exitPos });
      });
    });
  }

  // ──── Party Helpers ────

  getActiveParty() {
    const roster = this.registry.get('roster');
    const partyOrder = this.registry.get('partyOrder') || [];
    return partyOrder
      .filter(id => roster[id] && roster[id].recruited && roster[id].active)
      .map(id => roster[id]);
  }

  getFullRoster() {
    const roster = this.registry.get('roster');
    return Object.values(roster);
  }

  // ──── Quest Progress ────

  checkQuestNPCTalk(npcId) {
    const matches = findTalkNPCObjectives(this.registry, npcId);
    for (const { questId, objectiveId } of matches) {
      const result = progressObjective(this.registry, questId, objectiveId, 1);
      if (result) {
        this.showQuestProgressToast(questId, result);
        if (result.questComplete) {
          this.autoCompleteQuest(questId);
        }
      }
    }
  }

  checkQuestOverworldEnemyDefeat(overworldEnemyId) {
    const matches = findDefeatEnemyObjectives(this.registry, overworldEnemyId);
    for (const { questId, objectiveId } of matches) {
      const result = progressObjective(this.registry, questId, objectiveId, 1);
      if (result) {
        this.showQuestProgressToast(questId, result);
        if (result.questComplete) {
          this.autoCompleteQuest(questId);
        }
      }
    }
  }

  checkQuestBattleEnd(enemyTypes) {
    const counts = {};
    for (const t of enemyTypes) {
      counts[t] = (counts[t] || 0) + 1;
    }

    for (const [enemyType, count] of Object.entries(counts)) {
      const matches = findDefeatCountObjectives(this.registry, enemyType);
      for (const { questId, objectiveId } of matches) {
        const result = progressObjective(this.registry, questId, objectiveId, count);
        if (result) {
          this.showQuestProgressToast(questId, result);
          if (result.questComplete) {
            this.autoCompleteQuest(questId);
          }
        }
      }
    }

    // Synthetic group counts
    for (const enemyType of Object.keys(counts)) {
      const groupMatches = findDefeatCountObjectives(this.registry, `${enemyType}_group`);
      for (const { questId, objectiveId } of groupMatches) {
        const result = progressObjective(this.registry, questId, objectiveId, 1);
        if (result) {
          this.showQuestProgressToast(questId, result);
          if (result.questComplete) {
            this.autoCompleteQuest(questId);
          }
        }
      }
    }
  }

  autoCompleteQuest(questId) {
    const def = QUEST_DEFS[questId];
    if (!def) return;

    const qs = this.registry.get('questState');
    const activeBefore = qs ? new Set(Object.keys(qs.active)) : new Set();

    const rewards = completeQuest(this.registry, questId);
    if (rewards) {
      this.showQuestCompleteToast(def.name, rewards);

      // Show "New Quest" toast for any quests auto-accepted by completion
      if (qs) {
        for (const newId of Object.keys(qs.active)) {
          if (!activeBefore.has(newId) && QUEST_DEFS[newId]) {
            this.time.delayedCall(1500, () => {
              const toast = this._addUI(this.add.text(400, 560, `New Quest: ${QUEST_DEFS[newId].name}`, {
                fontSize: '12px', color: '#ffdd44', fontStyle: 'bold',
                backgroundColor: '#00000099', padding: { x: 12, y: 5 },
              }).setOrigin(0.5).setScrollFactor(0).setDepth(400));
              this.tweens.add({
                targets: toast, alpha: 0, y: 540,
                delay: 3000, duration: 600,
                onComplete: () => toast.destroy(),
              });
            });
          }
        }
      }
    }
  }

  // ──── Toast Notifications ────

  showQuestProgressToast(questId, result) {
    const def = QUEST_DEFS[questId];
    if (!def) return;

    const objDef = def.objectives.find(o => {
      const qs = this.registry.get('questState');
      const state = qs && qs.active[questId];
      return state && state.objectiveProgress[o.id] === result.newValue;
    });
    const objDesc = objDef ? objDef.description : def.name;

    if (result.objectiveMet) {
      const text = `${objDesc} - Complete!`;
      const toast = this._addUI(this.add.text(400, 560, text, {
        fontSize: '11px', color: '#55cc55',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(400));
      this.tweens.add({
        targets: toast, alpha: 0, y: 540,
        delay: 2000, duration: 600,
        onComplete: () => toast.destroy(),
      });
    } else if (result.required > 1) {
      const text = `${objDesc} (${result.newValue}/${result.required})`;
      const toast = this._addUI(this.add.text(400, 560, text, {
        fontSize: '10px', color: '#aaaaaa',
        backgroundColor: '#00000099', padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(400));
      this.tweens.add({
        targets: toast, alpha: 0, y: 540,
        delay: 1500, duration: 500,
        onComplete: () => toast.destroy(),
      });
    }
  }

  showQuestCompleteToast(questName, rewards) {
    const rewardParts = [];
    if (rewards.gold) rewardParts.push(`+${rewards.gold}g`);
    if (rewards.xp) rewardParts.push(`+${rewards.xp} XP`);
    const rewardStr = rewardParts.length > 0 ? `  ${rewardParts.join('  ')}` : '';

    const toast = this._addUI(this.add.text(400, 540, `Quest Complete: ${questName}${rewardStr}`, {
      fontSize: '13px', color: '#44dd44', fontStyle: 'bold',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400).setAlpha(0));

    this.tweens.add({
      targets: toast, alpha: 1, duration: 300,
    });
    this.tweens.add({
      targets: toast, alpha: 0, y: 520,
      delay: 3000, duration: 600,
      onComplete: () => toast.destroy(),
    });
  }

  // ──── Auto-Save ────

  triggerAutoSave() {
    this.sfx.playSave();
    // Save with overworld position near the entrance gate
    const exitPos = OVERWORLD_EXIT[this.entrance] || OVERWORLD_EXIT.west;
    const state = serializeGameState(this.registry, exitPos);
    autoSave(state);
    const activeSlot = this.registry.get('activeSlot');
    if (activeSlot) {
      state.activeSlot = activeSlot;
      saveToSlot(activeSlot, state);
    }
  }

  // ──── Dialogue System ────

  showDialogue(lines, onComplete) {
    this.dialogueActive = true;
    this.dialogueQueue = [...lines];
    this.dialogueCallback = onComplete || null;
    this.showNextLine();
  }

  showNextLine() {
    if (this.dialogueQueue.length === 0) {
      this.dialogueActive = false;
      if (this.dialogueCallback) this.dialogueCallback();
      return;
    }

    const line = this.dialogueQueue.shift();
    if (this.dBox) this.dBox.destroy();
    if (this.dText) this.dText.destroy();
    if (this.dHint) this.dHint.destroy();
    if (this.dName) { this.dName.destroy(); this.dName = null; }
    if (this.dPortrait) { this.dPortrait.destroy(); this.dPortrait = null; }

    const speakerMatch = line.match(/^(.+?):\s*["']/);

    this.dBox = this._addUI(this.add.rectangle(400, 575, 720, 90, 0x000000, 0.9)
      .setStrokeStyle(2, 0xaa8844).setScrollFactor(0).setDepth(200));

    if (speakerMatch) {
      const speaker = speakerMatch[1];
      const dialogue = line.slice(speakerMatch[0].length - 1);

      const portraitKey = SPEAKER_PORTRAITS[speaker];
      let textWrapWidth = 640;
      if (portraitKey && this.textures.exists(portraitKey)) {
        const tex = this.textures.get(portraitKey).getSourceImage();
        const scale = 80 / tex.height;
        this.dPortrait = this._addUI(this.add.image(720, 575, portraitKey)
          .setOrigin(0.5).setScale(scale)
          .setScrollFactor(0).setDepth(201));
        textWrapWidth = 570;
      }

      this.dName = this._addUI(this.add.text(60, 540, speaker, {
        fontSize: '12px', color: '#ffcc44', fontStyle: 'bold',
      }).setScrollFactor(0).setDepth(201));
      this.dText = this._addUI(this.add.text(60, 558, dialogue, {
        fontSize: '14px', color: '#ffffff',
        wordWrap: { width: textWrapWidth }, lineSpacing: 4,
      }).setScrollFactor(0).setDepth(201));
    } else {
      this.dText = this._addUI(this.add.text(60, 550, line, {
        fontSize: '14px', color: '#ffe8cc',
        wordWrap: { width: 640 }, lineSpacing: 4,
      }).setScrollFactor(0).setDepth(201));
    }

    this.dHint = this._addUI(this.add.text(740, 605, '[E]', {
      fontSize: '10px', color: '#887755',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201));

    // Click-to-advance
    this.dBox.setInteractive();
    let tapReady = false;
    this.time.delayedCall(200, () => { tapReady = true; });
    this.dBox.on('pointerdown', () => {
      if (!tapReady) return;
      advanceLine();
    });

    const advanceLine = () => {
      this.sfx.playDialogueAdvance();
      handler.remove();
      this.dBox.off('pointerdown');
      this.dBox.destroy();
      this.dText.destroy();
      this.dHint.destroy();
      if (this.dName) { this.dName.destroy(); this.dName = null; }
      if (this.dPortrait) { this.dPortrait.destroy(); this.dPortrait = null; }
      this.showNextLine();
    };

    const handler = this.time.addEvent({
      delay: 80, loop: true,
      callback: () => {
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          advanceLine();
        }
      },
    });
  }

  // ──── Update ────

  update() {
    if (this.transitioning || this.inBattle || this.dialogueActive) {
      this.player.body.setVelocity(0);
      return;
    }

    // Movement
    let vx = 0, vy = 0;
    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;
    if (left) vx = -PLAYER_SPEED;
    else if (right) vx = PLAYER_SPEED;
    if (up) vy = -PLAYER_SPEED;
    else if (down) vy = PLAYER_SPEED;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    // Update facing
    if (vx !== 0 || vy !== 0) {
      let newDir;
      if (Math.abs(vy) > Math.abs(vx)) {
        newDir = vy < 0 ? 'up' : 'down';
      } else {
        newDir = vx < 0 ? 'left' : 'right';
      }
      if (newDir !== this.playerDir) {
        this.playerDir = newDir;
        this.player.setTexture(`player_${newDir}`);
        this.player.setScale(36 / this.player.height);
      }
    }

    this.player.body.setVelocity(vx, vy);

    // ─── Tile-step checks ───
    const tx = Math.floor(this.player.x / BRACKEN_TILE_SIZE);
    const ty = Math.floor(this.player.y / BRACKEN_TILE_SIZE);

    if (tx !== this.lastTileX || ty !== this.lastTileY) {
      this.lastTileX = tx;
      this.lastTileY = ty;

      // Gate exit detection
      if (tx >= 0 && tx < BRACKEN_COLS && ty >= 0 && ty < BRACKEN_ROWS) {
        const tile = BRACKEN_MAP[ty][tx];
        if (tile === 22) {
          this.exitTown(tx, ty);
          return;
        }
      }

      // Proximity triggers (Rivin dialogue, recruit, captain approach, boss)
      if (this.checkProximityTriggers()) return;

      // Skeleton encounters
      this.checkEncounter(tx, ty);
    }
  }

  exitTown(tx, ty) {
    // Determine which gate based on position
    let gate;
    if (ty === 0) gate = 'north';
    else if (tx === 0) gate = 'west';
    else if (tx >= BRACKEN_COLS - 1) gate = 'east';
    else return; // not at a boundary gate

    this.transitioning = true;
    this.player.body.setVelocity(0);

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      const pos = OVERWORLD_EXIT[gate];
      this.scene.start('Overworld', {
        playerPos: pos,
        fromBrackenTown: true,
        brackenGate: gate,
      });
    });
  }
}
