import {
  OVERWORLD_MAP, TILE_SIZE, TILE_COLORS,
  MAP_COLS, MAP_ROWS, ENCOUNTER_RATE, ENCOUNTER_RATE_DEEP,
  ENCOUNTER_RATE_FARM, ENCOUNTER_RATE_FOREST, ENCOUNTER_RATE_DEEP_FOREST, ENCOUNTER_RATE_MT_PASS,
  ENCOUNTER_RATE_ROAD, ENCOUNTER_RATE_COAST,
} from '../data/maps.js';
import { ENCOUNTER_TABLE, ENCOUNTER_TABLES, createEnemy } from '../data/characters.js';
import { serializeGameState, saveToSlot, loadFromSlot, autoSave, getSlotSummaries } from '../data/saveManager.js';
import { isTouchDevice } from '../utils/touchDetect.js';
import {
  getTrackedQuest, getActiveQuests,
  findDefeatEnemyObjectives, findDefeatCountObjectives, findTalkNPCObjectives,
  checkReachLocationObjectives, progressObjective, completeQuest,
  acceptQuest, isQuestActive,
  LOCATION_COORDS, getActiveQuestLocations,
} from '../utils/QuestManager.js';
import { QUEST_DEFS } from '../data/quests.js';

const PLAYER_SPEED = 160;

// Skeleton-only encounter table for "Defend the Frontier" quest
const FARMLAND_SKELETON_TABLE = [
  { enemies: ['skeleton'], weight: 20, xp: 15, gold: 12 },
  { enemies: ['skeleton', 'skeleton'], weight: 35, xp: 22, gold: 18 },
  { enemies: ['skeleton', 'skeleton', 'skeleton'], weight: 30, xp: 32, gold: 28 },
  { enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton'], weight: 15, xp: 42, gold: 35 },
];

// Skeleton-only encounter table for "Clear the Town" quest (Bracken)
const BRACKEN_SKELETON_TABLE = [
  { enemies: ['skeleton', 'skeleton'], weight: 25, xp: 22, gold: 18 },
  { enemies: ['skeleton', 'skeleton', 'skeleton'], weight: 35, xp: 32, gold: 28 },
  { enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton'], weight: 25, xp: 42, gold: 35 },
  { enemies: ['skeleton', 'skeleton', 'skeleton', 'skeleton', 'skeleton'], weight: 15, xp: 52, gold: 42 },
];
const VIEWPORT_BUFFER = 3;        // extra tiles beyond camera edge
const VIEWPORT_UPDATE_THRESHOLD = 2; // tiles moved before re-eval

const LOCATION_LABELS = [
  { name: 'Bracken',           tileX: 55, tileY: 87, color: '#ccaa44' },
  { name: 'Asvam Farmlands',   tileX: 18, tileY: 188, color: '#88aa66' },
  { name: 'The Catacombs',     tileX: 83, tileY: 73, color: '#9977bb' },
  { name: 'Verlan Farmstead',  tileX: 40, tileY: 82, color: '#88aa66' },
];

const NPC_DIALOGUES = {
  rivin: {
    recruit: [
      'Rivin: "Captain Metz, is it? Word travels. The dead walk the eastern woods."',
      'Rivin: "I\'ve fought in three border wars. My axe is sharp, and I need the coin."',
      'Rivin: "Give me a cut of whatever we loot, and I\'ll hold the line beside you."',
      '[ Rivin the Warrior has joined your party! ]',
    ],
    idle: [
      'Rivin: "The cursed ground reeks of Atikesh\'s magic. Stay on guard."',
      'Rivin: "I\'ve seen these skeletons before. Hit them hard — they don\'t feel pain."',
      'Rivin: "Zombies are slow but tough. Don\'t let them grab you — the rot spreads."',
      'Rivin: "Press P to manage the party. Might come in handy later."',
    ],
  },
  lyra: {
    recruit: [
      'Lyra: "Hold. You walk loudly for a soldier, Captain."',
      'Lyra: "I\'ve been tracking the undead incursions from the tree line. They\'re getting bolder."',
      'Lyra: "My bow is quick, and I know herbs that can mend wounds in a pinch."',
      'Lyra: "If you\'re heading into those cursed lands, I\'d rather go with you than wait for them to come to me."',
      '[ Lyra the Ranger has joined your party! ]',
    ],
    idle: [
      'Lyra: "Listen — the forest has gone quiet. That\'s never a good sign."',
      'Lyra: "My Poison Arrows slow them down. Gives us time to finish the job."',
      'Lyra: "I can patch up wounds with Herb Remedy. Won\'t match a priest, but it\'ll keep you standing."',
      'Lyra: "I\'ve got eyes on the perimeter. Nothing gets past without me knowing."',
    ],
  },
  fenton: {
    recruit: [
      'Fenton: "...you almost stepped in my snare."',
      'Fenton: "Name\'s Fenton. I track things. Lately, all my trails lead to the same place — the dead lands."',
      'Fenton: "I can lay traps, mark weak spots, put two arrows in a target before it blinks."',
      'Fenton: "Could use someone watching my back for once. I\'ll join you."',
      '[ Fenton the Ranger has joined your party! ]',
    ],
    idle: [
      'Fenton: "Tracks everywhere. The undead don\'t try to hide their movements."',
      'Fenton: "Mark Prey lets me find the cracks in their armor. Makes everyone\'s job easier."',
      'Fenton: "Double Shot costs me, but when something needs to die fast, it\'s worth it."',
      'Fenton: "Stay quiet. Move slow. That\'s how you survive out here."',
    ],
  },
  rickets: {
    recruit: [
      'Rickets: "Ah! Don\'t sneak up on a man holding volatile arcane energy!"',
      'Rickets: "They call me Rickets. Long story. Involves a cursed chair."',
      'Rickets: "I can throw fireballs, set things ablaze, and shield myself with raw mana. Mostly without exploding."',
      'Rickets: "Look — I need protection, you need firepower. Simple arrangement."',
      '[ Rickets the Wizard has joined your party! ]',
    ],
    idle: [
      'Rickets: "The arcane currents here are... agitated. Atikesh is drawing power from somewhere deep."',
      'Rickets: "Fireball is my specialty. Stand well back when I cast it."',
      'Rickets: "Wildfire burns them over time. Very satisfying against undead."',
      'Rickets: "My Mana Shield won\'t last long, but it\'s saved my life more times than I can count."',
    ],
  },
  hela: {
    recruit: [
      'Hela: "Captain Metz. The Danath war-colleges sent me when they heard about the incursions."',
      'Hela: "I trained in ice and thunder. Precise. Efficient. No wasted energy."',
      'Hela: "I can freeze enemies in place, call lightning, and raise barriers for the whole party."',
      'Hela: "The college wants field data on necromantic magic. I want to stop it. We both benefit."',
      '[ Hela the War Mage has joined your party! ]',
    ],
    idle: [
      'Hela: "Atikesh\'s magic is crude but powerful. We must be precise where he is not."',
      'Hela: "Frozen Chains slows them. Thunder Strike punishes them. Simple formula."',
      'Hela: "War Barrier protects the whole party. Use it when things get overwhelming."',
      'Hela: "The college will want a full report when this is over. Assuming we survive."',
    ],
  },
  anuel: {
    recruit: [
      'Anuel: "Blessings upon you, Captain. I\'ve been praying at this frontier for days."',
      'Anuel: "The old light still burns in these lands, but it grows dim against Atikesh\'s shadow."',
      'Anuel: "I can heal the wounded, bless your weapons, and call down divine wrath on the unholy."',
      'Anuel: "Let me walk with you. The light is strongest when it stands beside the brave."',
      '[ Anuel the Priestess has joined your party! ]',
    ],
    idle: [
      'Anuel: "The light protects, but it demands courage in return."',
      'Anuel: "My Heal can mend grievous wounds. Don\'t hesitate to call on me."',
      'Anuel: "Blessing strengthens the whole party\'s strikes. Use it before a hard fight."',
      'Anuel: "Smite burns brightest against the undead. Atikesh\'s minions will learn to fear it."',
    ],
  },
};

const SPEAKER_PORTRAITS = {
  'Metz': 'metz_portrait_base',
  'Cpt. Metz': 'metz_portrait_base',
  'Rivin': 'rivin_portrait_base',
  'Lyra': 'lyra_portrait_base',
  'Fenton': 'fenton_portrait_base',
  'Rickets': 'rickets_portrait_base',
  'Hela': 'hela_portrait_base',
  'Anuel': 'anuel_portrait_base',
  // NPC-only speakers — add portrait keys here when assets are added:
  // 'Vivian': 'vivian_portrait_base',
  // 'Makar': 'makar_portrait_base',
  // 'Kelea': 'kelea_portrait_base',
  // 'Farmer': 'farmer_portrait_base',
};

// World item pickup definitions
const WORLD_ITEMS = [
  { id: 'pickup_1', x: 25, y: 177, itemId: 'iron_helm', label: 'Iron Helm' },
  { id: 'pickup_2', x: 55, y: 80, itemId: 'frontier_blade', label: 'Frontier Blade' },
  { id: 'pickup_3', x: 30, y: 147, itemId: 'scout_boots', label: 'Scout Boots' },
];

// Overworld-visible enemy encounters
const OVERWORLD_ENEMIES = [
  {
    id: 'ow_wolfpack',
    tileX: 75, tileY: 150,
    name: 'Wolf Pack',
    enemies: ['dire_wolf', 'dire_wolf', 'dire_wolf'],
    xp: 40, gold: 35,
    color: 0x8b7355,
    preDialogue: ['Three dire wolves block the path, their eyes glowing with corruption.'],
    postDialogue: ['The wolf pack has been slain. The path is clear.'],
  },
  {
    id: 'ow_treant',
    tileX: 88, tileY: 80,
    name: 'Corrupted Treant',
    enemies: ['corrupted_treant', 'fell_spider', 'fell_spider'],
    xp: 55, gold: 45,
    color: 0x3a5a2a,
    preDialogue: ['A massive corrupted treant blocks the way, spiders nesting in its branches.'],
    postDialogue: ['The corrupted treant crumbles. Its spider guardians scatter.'],
  },
  {
    id: 'ow_skeleton_patrol',
    tileX: 125, tileY: 33,
    name: 'Skeleton Patrol',
    enemies: ['skeleton', 'skeleton', 'cursed_archer'],
    xp: 50, gold: 40,
    color: 0xccccaa,
    preDialogue: ['A patrol of undead soldiers blocks the cursed path ahead.'],
    postDialogue: ['The skeleton patrol crumbles to dust.'],
  },
  {
    id: 'ow_mountain_bandits',
    tileX: 63, tileY: 33,
    name: 'Mountain Bandits',
    enemies: ['dark_knight', 'skeleton', 'skeleton'],
    xp: 55, gold: 50,
    color: 0x334455,
    preDialogue: ['A dark knight and his skeletal minions guard the mountain pass.'],
    postDialogue: ['The mountain bandits have been defeated. The pass is clear.'],
  },
  {
    id: 'ow_bone_reaper',
    tileX: 20, tileY: 185,
    name: 'Bone Reaper',
    enemies: ['bone_reaper'],
    xp: 60, gold: 50,
    color: 0xccccaa,
    preDialogue: [
      'A towering undead figure rises from the scorched earth, a bone-forged axe dragging behind it.',
      'The Bone Reaper has claimed these farmlands. It will not yield them willingly.',
    ],
    postDialogue: [
      'The Bone Reaper collapses, its axe shattering into dust.',
      'The farmlands are free of its terror — for now.',
      'Lyra: "You fight well, sir. What\'s your name?"',
      'Metz: "Metz. I serve as Captain at His Majesty\'s pleasure."',
      'Lyra: "I am Lyra, a ranger of these lands."',
      'Metz: "What news can you tell me of Bracken?"',
      'Lyra: "Reports come in that the undead have already overwhelmed the town. Beyond that I cannot say."',
      'Metz: "Then we make for Bracken!"',
    ],
  },
  {
    id: 'skeletal_captain',
    tileX: 55, tileY: 83,
    name: 'Skeletal Captain',
    enemies: ['skeletal_captain', 'skeleton', 'skeleton', 'skeleton'],
    xp: 75, gold: 65,
    color: 0x998866,
    preDialogue: [
      'An armored skeleton stands at the gate of Fort Bracken, its cursed blade drawn and three skeleton soldiers at its side.',
      'The Skeletal Captain will not yield the gate willingly.',
    ],
    postDialogue: [
      'The Skeletal Captain crumbles, its armor clattering to the ground.',
      'The gate to Fort Bracken is open.',
      'Rivin: "Well fought, Captain. A deal\'s a deal — my axe is yours."',
      '[ Rivin the Warrior has joined your party! ]',
    ],
  },
];

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('Overworld');
  }

  init(data) {
    this.loadedPos = data?.playerPos || null;
    this.pendingPostCutscene = data?.postCutsceneDialogue || false;
    this.pendingFarmlandReturn = data?.fromFarmlandCutscene || false;
  }

  preload() {
    if (!this.textures.exists('grassland_tileset')) {
      this.load.image('grassland_tileset', 'assets/tilesets/grassland_tileset.png');
    }
    const dirs = ['down', 'up', 'left', 'right'];
    for (const d of dirs) {
      const key = `player_${d}`;
      if (!this.textures.exists(key)) {
        this.load.image(key, `assets/sprites/${key}.png`);
      }
    }
    if (!this.textures.exists('metz_portrait_base')) {
      this.load.image('metz_portrait_base', 'assets/sprites/metz_portrait_base.png');
    }
    if (!this.textures.exists('rivin_portrait_base')) {
      this.load.image('rivin_portrait_base', 'assets/sprites/rivin_portrait_base.png');
    }
    if (!this.textures.exists('lyra_portrait_base')) {
      this.load.image('lyra_portrait_base', 'assets/sprites/lyra_portrait_base.png');
    }
    if (!this.textures.exists('hela_portrait_base')) {
      this.load.image('hela_portrait_base', 'assets/sprites/hela_portrait_base.png');
    }
    if (!this.textures.exists('fenton_portrait_base')) {
      this.load.image('fenton_portrait_base', 'assets/sprites/fenton_portrait_base.png');
    }
    if (!this.textures.exists('rickets_portrait_base')) {
      this.load.image('rickets_portrait_base', 'assets/sprites/rickets_portrait_base.png');
    }
    if (!this.textures.exists('anuel_portrait_base')) {
      this.load.image('anuel_portrait_base', 'assets/sprites/anuel_portrait_base.png');
    }
  }

  create() {
    this.sfx = this.registry.get('soundManager');
    this._buildGrassTileTextures();
    this.buildMap();
    this.spawnPlayer();
    this.spawnNPC();
    this.spawnWorldItems();
    this.spawnOverworldEnemies();
    this.setupCamera();
    this.drawLocationLabels();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.partyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.experienceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.muteKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.mapKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.N);
    this.questKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    this.lastTileX = Math.floor(this.player.x / TILE_SIZE);
    this.lastTileY = Math.floor(this.player.y / TILE_SIZE);
    this.inBattle = false;
    this.dialogueActive = false;
    this.dialogueQueue = [];
    this.partyOpen = false;
    this.inventoryOpen = false;
    this.shopOpen = false;
    this.innOpen = false;
    this.experienceOpen = false;
    this.saveMenuOpen = false;
    this.questLogOpen = false;

    this.drawPartyHUD();
    this.buildMiniMap();

    // Instructions
    const inst = this._addUI(this.add.text(400, 620,
      'WASD: Move | E: Interact | P: Party | I: Inv | X: Exp | Q: Quests | N: Map | ESC: Save', {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100));
    this.tweens.add({ targets: inst, alpha: 0, delay: 6000, duration: 1000 });

    // ── Touch Controls ──
    this.touchControls = null;
    if (isTouchDevice()) {
      this.scene.launch('TouchControls');
      this.touchControls = this.scene.get('TouchControls');
      this.touchControls.events.on('menu-party', () => this.openPartyScreen());
      this.touchControls.events.on('menu-inv', () => this.openInventoryScreen());
      this.touchControls.events.on('menu-exp', () => this.openExperienceScreen());
      this.touchControls.events.on('menu-save', () => this.openSaveMenu());
    }

    // Title
    this._addUI(this.add.text(400, 14, 'Defense of Rhaud — Eastern Frontier, 250 B.C.E.', {
      fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 10, y: 3 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100));

    // Post-cutscene dialogue after Dagvar battle / Alan's death
    if (this.pendingPostCutscene) {
      this.pendingPostCutscene = false;
      this.time.delayedCall(500, () => {
        this.showDialogue([
          'Vivian: "Alan no!!"',
          'She weeps uncontrollably.',
          'Makar: "Daddy!!"',
          'Kelea: "Papa!!"',
          'Metz: "I - I am sorry\u2026"',
          'Farmer: "Pray tell, sir! The country is aflame! The undead rise everywhere!"',
          'Metz: "Where have they come from?"',
          'Farmer: "None can tell, only that they began the attack this morning. They say Bracken is already burning\u2026"',
          'Metz: "Then I must make for Fort Bracken at once! Attend to this family for me."',
          'Farmer: "It will be done, sir! For Alan and for us all\u2026"',
          'Metz mounts his horse.',
          'Makar: "S-sir\u2026? Please don\'t leave\u2026"',
          'Farmer: "Son, he fights for us all. He is needed ahead."',
          'Metz: "What\'s your name, son?"',
          'Makar: "Makar."',
          'Metz: "Your father was a valiant man, Makar. Your mother and sister need you to be the same for them now."',
          'Makar sniffles but hesitantly nods his head.',
          'Metz: "I promise you, Makar, your father\'s sacrifice will not be for nothing. I will bring justice to the one who did this to you."',
          'Makar: "Then go, sir\u2026 Though I do not know your name."',
          'Metz: "Metz."',
          'Makar: "Metz."',
        ], () => {
          acceptQuest(this.registry, 'act1_defend_frontier');
          const toast = this._addUI(this.add.text(400, 560, 'New Quest: Defend the Frontier', {
            fontSize: '12px', color: '#ffdd44', fontStyle: 'bold',
            backgroundColor: '#00000099', padding: { x: 12, y: 5 },
          }).setOrigin(0.5).setScrollFactor(0).setDepth(400));
          this.tweens.add({
            targets: toast, alpha: 0, y: 540,
            delay: 3000, duration: 600,
            onComplete: () => toast.destroy(),
          });
        });
      });
    }

    // Return from Farmland cutscene — recruit Lyra, progress quests
    if (this.pendingFarmlandReturn) {
      this.pendingFarmlandReturn = false;
      this.time.delayedCall(300, () => {
        this.sfx.playNPCRecruit();
        const roster = this.registry.get('roster');
        roster.lyra.recruited = true;
        roster.lyra.active = true;

        const partyOrder = this.registry.get('partyOrder') || [];
        if (!partyOrder.includes('lyra')) {
          partyOrder.push('lyra');
          this.registry.set('partyOrder', partyOrder);
        }

        this.drawPartyHUD();
        this.checkQuestNPCTalk('lyra');

        const tx = Math.floor(this.player.x / TILE_SIZE);
        const ty = Math.floor(this.player.y / TILE_SIZE);
        this.checkLocationObjectives(tx, ty);

        this.triggerAutoSave();
      });
    }
  }

  // ──── Map ────

  buildMap() {
    this.walls = this.physics.add.staticGroup();
    this.renderedTiles = new Map();
    this.renderedRange = null;

    this.prescanSpecialTiles();

    const spawn = this.loadedPos || this.playerSpawn || { x: 272, y: 336 };
    this.updateViewportTiles(spawn.x, spawn.y, true);
  }

  prescanSpecialTiles() {
    this.campfireTiles = [];
    this.innTiles = [];
    this.bossAltarPositions = [];
    this.dungeonEntrances = [];
    this.playerSpawn = null;
    this.bossAltarPos = null;

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = OVERWORLD_MAP[row][col];
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;

        if (tile === 8) {
          this.campfireTiles.push({ x, y });
        }

        if (tile === 11) {
          this.innTiles.push({ x, y });
        }

        if (tile === 10) {
          const isVranekSpire = col <= 50 && row <= 33;
          const altarName = isVranekSpire ? 'Vranek Spire' : 'Altar of Atikesh';
          const bossKey = isVranekSpire ? 'vranek' : 'atikesh';
          this.bossAltarPositions.push({ x, y, bossKey, name: altarName });
          if (!isVranekSpire) this.bossAltarPos = { x, y };
        }

        if (tile === 18) {
          const entranceName = col <= 120 ? 'The Reliquary' : 'Dungeon';
          this.dungeonEntrances.push({ x, y, name: entranceName });
        }

        if (tile === 6) {
          this.playerSpawn = { x, y };
        }
      }
    }
  }

  _tileRandom(col, row, seed) {
    let h = (col * 374761393 + row * 668265263 + seed * 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1103515245) | 0;
    return ((h & 0x7fffffff) % 10000) / 10000;
  }

  _buildGrassTileTextures() {
    if (this.textures.exists('grass_0')) return; // already built
    if (!this.textures.exists('grassland_tileset')) return; // tileset not loaded

    const src = this.textures.get('grassland_tileset').getSourceImage();
    const cellW = src.width / 4;   // 256 per cell
    const cellH = src.height / 4;  // 256 per cell

    // Usable region within each cell: skip ~8px margin sides, ~48px earth edge at bottom
    const marginX = 8;
    const marginTop = 8;
    const usableW = cellW - marginX * 2;   // ~240
    const usableH = cellH - marginTop - 48; // ~192

    const FRAME_MAP = [
      // Row 1: Pure grass variants (interior)
      { frame: 'grass_0', col: 0, row: 0 },
      { frame: 'grass_1', col: 1, row: 0 },
      { frame: 'grass_2', col: 2, row: 0 },
      { frame: 'grass_3', col: 3, row: 0 },
      // Row 2: Transition tiles
      { frame: 'grass_4', col: 0, row: 1 },  // dirt from NW
      { frame: 'grass_5', col: 1, row: 1 },  // diagonal dirt
      { frame: 'grass_6', col: 2, row: 1 },  // dirt from NE
      { frame: 'grass_7', col: 3, row: 1 },  // dirt on top
      // Row 3: More transitions
      { frame: 'grass_8', col: 0, row: 2 },  // mostly dirt
      { frame: 'grass_9', col: 1, row: 2 },  // dirt with grass left border
      { frame: 'grass_10', col: 2, row: 2 }, // round dirt clearing
      { frame: 'grass_11', col: 3, row: 2 }, // small round dirt clearing
      // Row 4: Inner corners + flower decorations
      { frame: 'grass_12', col: 0, row: 3 },  // inner corner BL
      { frame: 'grass_13', col: 1, row: 3 },  // inner corner BR
      { frame: 'grass_deco_flower1', col: 2, row: 3, isDeco: true },
      { frame: 'grass_deco_flower2', col: 3, row: 3, isDeco: true },
    ];

    const outSize = 32; // target texture size

    for (const entry of FRAME_MAP) {
      const canvas = document.createElement('canvas');
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext('2d');

      const sx = entry.col * cellW + marginX;
      const sy = entry.row * cellH + marginTop;

      ctx.drawImage(src, sx, sy, usableW, usableH, 0, 0, outSize, outSize);

      // For decoration textures, remove dark background pixels (RGB < 30 → transparent)
      if (entry.isDeco) {
        const imgData = ctx.getImageData(0, 0, outSize, outSize);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 30 && d[i + 1] < 30 && d[i + 2] < 30) {
            d[i + 3] = 0;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      }

      this.textures.addCanvas(entry.frame, canvas);
    }
  }

  _getGrassAutotileMask(col, row) {
    // Returns 4-bit mask: N=1, E=2, S=4, W=8; bit SET if neighbor is also tile 12
    let mask = 0;
    const n = row > 0 ? OVERWORLD_MAP[row - 1][col] : -1;
    const e = col < MAP_COLS - 1 ? OVERWORLD_MAP[row][col + 1] : -1;
    const s = row < MAP_ROWS - 1 ? OVERWORLD_MAP[row + 1][col] : -1;
    const w = col > 0 ? OVERWORLD_MAP[row][col - 1] : -1;
    if (n === 12) mask |= 1;
    if (e === 12) mask |= 2;
    if (s === 12) mask |= 4;
    if (w === 12) mask |= 8;
    return mask;
  }

  _getGrassFrame(col, row) {
    const mask = this._getGrassAutotileMask(col, row);
    // mask bits: N=1, E=2, S=4, W=8
    switch (mask) {
      case 0b1111: { // all grass neighbors — pick random interior variant
        const variant = Math.floor(this._tileRandom(col, row, 42) * 4);
        return { key: `grass_${variant}`, flipX: false, flipY: false };
      }
      case 0b1110: // N missing (E+S+W present) — dirt on top
        return { key: 'grass_7', flipX: false, flipY: false };
      case 0b1101: // E missing (N+S+W present) — dirt on right (flip grass_9)
        return { key: 'grass_9', flipX: true, flipY: false };
      case 0b1011: // S missing (N+E+W present) — dirt on bottom (flip grass_7)
        return { key: 'grass_7', flipX: false, flipY: true };
      case 0b0111: // W missing (N+E+S present) — dirt on left
        return { key: 'grass_9', flipX: false, flipY: false };
      case 0b1100: // N+E missing (S+W present) — dirt from NE
        return { key: 'grass_6', flipX: false, flipY: false };
      case 0b0110: // N+W missing (E+S present) — dirt from NW
        return { key: 'grass_4', flipX: false, flipY: false };
      case 0b0011: // S+E missing (N+W present) — inner corner BL
        return { key: 'grass_12', flipX: false, flipY: false };
      case 0b1001: // S+W missing (N+E present) — inner corner BR
        return { key: 'grass_13', flipX: false, flipY: false };
      case 0b1010: // N+S missing (E+W present) — corridor horizontal
        return { key: 'grass_5', flipX: false, flipY: false };
      case 0b0101: // E+W missing (N+S present) — corridor vertical
        return { key: 'grass_5', flipX: false, flipY: true };
      case 0b0000: // isolated — small clearing
        return { key: 'grass_11', flipX: false, flipY: false };
      default: {
        // 1 neighbor (mask = 1,2,4,8) or 3 missing — clearing
        const popcount = (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1) + ((mask >> 3) & 1);
        if (popcount <= 1) {
          return { key: 'grass_10', flipX: false, flipY: false };
        }
        // Fallback for any remaining 2-neighbor combos not explicitly handled
        return { key: 'grass_8', flipX: false, flipY: false };
      }
    }
  }

  renderTile(col, row) {
    const key = `${col},${row}`;
    if (this.renderedTiles.has(key)) return;

    const tile = OVERWORLD_MAP[row][col];
    const x = col * TILE_SIZE + TILE_SIZE / 2;
    const y = row * TILE_SIZE + TILE_SIZE / 2;
    const color = TILE_COLORS[tile] ?? 0x000000;

    const objects = [];
    const tweens = [];
    let wall = null;

    // Base tile
    if (tile === 12 && this.textures.exists('grass_0')) {
      const { key, flipX, flipY } = this._getGrassFrame(col, row);
      const grassImg = this.add.image(x, y, key)
        .setDisplaySize(TILE_SIZE, TILE_SIZE)
        .setFlipX(flipX).setFlipY(flipY)
        .setDepth(0);
      objects.push(grassImg);
      objects.push(this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE)
        .setStrokeStyle(1, 0x000000, 0.04).setDepth(1));
    } else {
      objects.push(this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color).setDepth(0));
      objects.push(this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE)
        .setStrokeStyle(1, 0x000000, 0.08).setDepth(1));
    }

    // Impassable tiles
    if (tile === 1 || tile === 4 || tile === 7 || tile === 11 || tile === 14 || tile === 21) {
      wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
      wall.setDepth(0);
      objects.push(wall);
    }

    // Deterministic random values for decorations
    const r0 = this._tileRandom(col, row, 0);
    const r1 = this._tileRandom(col, row, 1);
    const r2 = this._tileRandom(col, row, 2);
    const r3 = this._tileRandom(col, row, 3);

    // Cursed ground particles
    if (tile === 2 && r0 < 0.3) {
      const p = this.add.circle(
        x - 8 + r1 * 16, y - 8 + r2 * 16,
        1.5, 0x9944cc, 0.4
      ).setDepth(2);
      objects.push(p);
      tweens.push(this.tweens.add({
        targets: p, alpha: 0.1, y: p.y - 6,
        duration: 1500 + r3 * 1000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
    }

    // Deep cursed ground
    if (tile === 9 && r0 < 0.5) {
      const dp = this.add.circle(
        x - 8 + r1 * 16, y - 8 + r2 * 16,
        2.5, 0xbb55ee, 0.5
      ).setDepth(2);
      objects.push(dp);
      tweens.push(this.tweens.add({
        targets: dp, alpha: 0.1, y: dp.y - 10,
        duration: 1000 + r3 * 800,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
    }

    // Farmland — flower decorations from tileset
    if (tile === 12 && r0 < 0.12 && this.textures.exists('grass_deco_flower1')) {
      const decoKey = r1 < 0.5 ? 'grass_deco_flower1' : 'grass_deco_flower2';
      const deco = this.add.image(
        x - 6 + r1 * 12, y - 6 + r2 * 12, decoKey
      ).setDisplaySize(10, 10).setAlpha(0.7).setDepth(2);
      objects.push(deco);
    } else if (tile === 12 && r0 < 0.15) {
      // Fallback wheat tufts if tileset not loaded
      if (!this.textures.exists('grass_0')) {
        objects.push(this.add.circle(
          x - 6 + r1 * 12, y - 6 + r2 * 12,
          2, 0xccaa44, 0.5
        ).setDepth(2));
      }
    }

    // Forest — tree sprites
    if (tile === 13 && r0 < 0.3) {
      const tx = x - 6 + r1 * 12;
      const ty = y - 6 + r2 * 12;
      objects.push(this.add.circle(tx, ty - 4, 5, 0x227722, 0.6).setDepth(2));
      objects.push(this.add.rectangle(tx, ty + 2, 2, 6, 0x553311, 0.5).setDepth(2));
    }

    // Deep forest — denser decorations
    if (tile === 17 && r0 < 0.4) {
      const tx = x - 6 + r1 * 12;
      const ty = y - 6 + r2 * 12;
      objects.push(this.add.circle(tx, ty - 4, 6, 0x114411, 0.7).setDepth(2));
      objects.push(this.add.rectangle(tx, ty + 3, 2, 7, 0x442200, 0.5).setDepth(2));
    }

    // Mountain pass — rock particles
    if (tile === 15 && r0 < 0.15) {
      objects.push(this.add.rectangle(
        x - 8 + r1 * 16, y - 8 + r2 * 16,
        3, 2, 0x777766, 0.4
      ).setDepth(2));
    }

    // Bridge — wood plank lines
    if (tile === 19) {
      objects.push(this.add.rectangle(x, y - 4, TILE_SIZE - 4, 2, 0x664422, 0.4).setDepth(2));
      objects.push(this.add.rectangle(x, y + 4, TILE_SIZE - 4, 2, 0x664422, 0.4).setDepth(2));
    }

    // Boss altar
    if (tile === 10) {
      const glow = this.add.circle(x, y, 14, 0xff0033, 0.2).setDepth(2);
      objects.push(glow);
      tweens.push(this.tweens.add({
        targets: glow, scaleX: 1.5, scaleY: 1.5, alpha: 0.05,
        duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
      const core = this.add.circle(x, y, 5, 0xff2244, 0.6).setDepth(3);
      objects.push(core);
      tweens.push(this.tweens.add({
        targets: core, alpha: 0.3,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));

      const isVranekSpire = col <= 50 && row <= 33;
      const altarName = isVranekSpire ? 'Vranek Spire' : 'Altar of Atikesh';

      objects.push(this.add.text(x, y + 18, altarName, {
        fontSize: '7px', color: '#cc4466',
      }).setOrigin(0.5).setDepth(3));
      objects.push(this.add.text(x, y + 27, '[E]', {
        fontSize: '7px', color: '#882233',
      }).setOrigin(0.5).setDepth(3));
    }

    // Dungeon entrance — purple glow
    if (tile === 18) {
      const glow = this.add.circle(x, y, 12, 0x6622aa, 0.2).setDepth(2);
      objects.push(glow);
      tweens.push(this.tweens.add({
        targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.05,
        duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
      const core = this.add.circle(x, y, 4, 0x8833cc, 0.5).setDepth(3);
      objects.push(core);
      tweens.push(this.tweens.add({
        targets: core, alpha: 0.2,
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));

      const entranceName = col <= 120 ? 'The Reliquary' : 'Dungeon';
      objects.push(this.add.text(x, y + 18, entranceName, {
        fontSize: '7px', color: '#8844cc',
      }).setOrigin(0.5).setDepth(3));
      objects.push(this.add.text(x, y + 27, '[E]', {
        fontSize: '7px', color: '#553388',
      }).setOrigin(0.5).setDepth(3));
    }

    // Campfire / shop
    if (tile === 8) {
      wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);
      this.physics.add.existing(wall, true);
      this.walls.add(wall);
      wall.setDepth(0);
      objects.push(wall);

      const fire = this.add.circle(x, y - 4, 6, 0xff6600, 0.9).setDepth(3);
      objects.push(fire);
      objects.push(this.add.circle(x, y - 4, 12, 0xff4400, 0.15).setDepth(2));
      tweens.push(this.tweens.add({
        targets: fire, scaleX: 1.3, scaleY: 1.4, alpha: 0.6,
        duration: 400, yoyo: true, repeat: -1,
      }));
      objects.push(this.add.text(x, y + 18, 'Shop', {
        fontSize: '8px', color: '#ffaa44',
      }).setOrigin(0.5).setDepth(3));
      objects.push(this.add.text(x, y + 27, '[E]', {
        fontSize: '7px', color: '#886633',
      }).setOrigin(0.5).setDepth(3));
    }

    // Inn
    if (tile === 11) {
      const glow = this.add.circle(x, y, 14, 0xffaa44, 0.15).setDepth(2);
      objects.push(glow);
      tweens.push(this.tweens.add({
        targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: 0.05,
        duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      }));
      objects.push(this.add.text(x, y + 18, 'Inn', {
        fontSize: '8px', color: '#ffaa44',
      }).setOrigin(0.5).setDepth(3));
      objects.push(this.add.text(x, y + 27, '[E] Rest', {
        fontSize: '7px', color: '#886633',
      }).setOrigin(0.5).setDepth(3));
    }

    // Hide dynamically created world objects from the UI camera
    if (this.uiCamera) {
      for (const obj of objects) this.uiCamera.ignore(obj);
    }

    this.renderedTiles.set(key, { objects, tweens, wall });
  }

  destroyTile(col, row) {
    const key = `${col},${row}`;
    const entry = this.renderedTiles.get(key);
    if (!entry) return;

    for (const tw of entry.tweens) {
      tw.stop();
      tw.remove();
    }

    if (entry.wall) {
      this.walls.remove(entry.wall);
    }

    for (const obj of entry.objects) {
      obj.destroy();
    }

    this.renderedTiles.delete(key);
  }

  getVisibleRange(centerX, centerY) {
    const cam = this.cameras.main;
    const halfW = cam.width / 2;
    const halfH = cam.height / 2;

    return {
      minCol: Math.max(0, Math.floor((centerX - halfW) / TILE_SIZE) - VIEWPORT_BUFFER),
      maxCol: Math.min(MAP_COLS - 1, Math.ceil((centerX + halfW) / TILE_SIZE) + VIEWPORT_BUFFER),
      minRow: Math.max(0, Math.floor((centerY - halfH) / TILE_SIZE) - VIEWPORT_BUFFER),
      maxRow: Math.min(MAP_ROWS - 1, Math.ceil((centerY + halfH) / TILE_SIZE) + VIEWPORT_BUFFER),
    };
  }

  updateViewportTiles(centerX, centerY, force = false) {
    const newRange = this.getVisibleRange(centerX, centerY);
    const old = this.renderedRange;

    if (!force && old &&
        Math.abs(newRange.minCol - old.minCol) < VIEWPORT_UPDATE_THRESHOLD &&
        Math.abs(newRange.maxCol - old.maxCol) < VIEWPORT_UPDATE_THRESHOLD &&
        Math.abs(newRange.minRow - old.minRow) < VIEWPORT_UPDATE_THRESHOLD &&
        Math.abs(newRange.maxRow - old.maxRow) < VIEWPORT_UPDATE_THRESHOLD) {
      return;
    }

    let changed = false;

    // Destroy tiles that left the range
    if (old) {
      for (let row = old.minRow; row <= old.maxRow; row++) {
        for (let col = old.minCol; col <= old.maxCol; col++) {
          if (row >= newRange.minRow && row <= newRange.maxRow &&
              col >= newRange.minCol && col <= newRange.maxCol) continue;
          if (this.renderedTiles.has(`${col},${row}`)) {
            this.destroyTile(col, row);
            changed = true;
          }
        }
      }
    }

    // Create tiles that entered the range
    for (let row = newRange.minRow; row <= newRange.maxRow; row++) {
      for (let col = newRange.minCol; col <= newRange.maxCol; col++) {
        if (old && row >= old.minRow && row <= old.maxRow &&
            col >= old.minCol && col <= old.maxCol) continue;
        this.renderTile(col, row);
        changed = true;
      }
    }

    if (changed) {
      this.walls.refresh();
    }

    this.renderedRange = newRange;
  }

  // ──── Player ────

  spawnPlayer() {
    const { x, y } = this.loadedPos || this.playerSpawn || { x: 272, y: 336 };

    // Sprite-based player with directional textures
    this.playerDir = 'down';
    const SPRITE_DISPLAY_H = 36;
    this.player = this.add.sprite(x, y, 'player_down').setDepth(10);
    const scaleY = SPRITE_DISPLAY_H / this.player.height;
    this.player.setScale(scaleY);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(
      this.player.width * 0.55,
      this.player.height * 0.35,
    );
    this.player.body.setOffset(
      this.player.width * 0.22,
      this.player.height * 0.62,
    );

    this.physics.add.collider(this.player, this.walls);
  }

  // ──── NPCs ────

  spawnNPC() {
    const roster = this.registry.get('roster');

    // NPC placement data: id, pixel position, name color, detail color
    const NPC_DEFS = [
      { id: 'rivin',  x: 55 * TILE_SIZE + 16, y: 87 * TILE_SIZE + 16, nameColor: '#ffcc88', detailColor: 0x885511 },
      { id: 'fenton', x: 35 * TILE_SIZE + 16, y: 137 * TILE_SIZE + 16, nameColor: '#bbcc88', detailColor: 0x3a4422 },
      { id: 'rickets',x: 83 * TILE_SIZE + 16, y: 73 * TILE_SIZE + 16, nameColor: '#bbaaff', detailColor: 0x332266 },
      { id: 'hela',   x: 163 * TILE_SIZE + 16, y: 117 * TILE_SIZE + 16, nameColor: '#ddaaff', detailColor: 0x553388 },
      { id: 'anuel',  x: 168 * TILE_SIZE + 16, y: 33 * TILE_SIZE + 16, nameColor: '#ffffcc', detailColor: 0x888866 },
    ];

    this.npcs = [];

    for (const def of NPC_DEFS) {
      const char = roster[def.id];
      const { x, y } = def;

      const body = this.add.rectangle(x, y, 22, 28, char.color).setDepth(10);
      this.physics.add.existing(body, true);
      this.add.rectangle(x, y + 8, 20, 6, def.detailColor).setDepth(11);
      this.add.text(x, y - 22, char.name, {
        fontSize: '9px', color: def.nameColor, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(11);

      // Class label
      this.add.text(x, y - 13, char.cls, {
        fontSize: '7px', color: '#888888',
      }).setOrigin(0.5).setDepth(11);

      let marker = null;
      if (!char.recruited) {
        marker = this.add.text(x, y - 32, '!', {
          fontSize: '14px', fontStyle: 'bold', color: '#ffff00',
        }).setOrigin(0.5).setDepth(12);
        this.tweens.add({
          targets: marker, y: y - 36,
          duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      }

      this.physics.add.collider(this.player, body);
      this.npcs.push({ id: def.id, body, marker, x, y });
    }
  }

  // ──── World Item Pickups ────

  spawnWorldItems() {
    this.worldItems = [];
    const collected = this.registry.get('collectedItems') || {};

    for (const def of WORLD_ITEMS) {
      if (collected[def.id]) continue; // already collected

      const px = def.x * TILE_SIZE + TILE_SIZE / 2;
      const py = def.y * TILE_SIZE + TILE_SIZE / 2;

      // Glowing circle
      const glow = this.add.circle(px, py, 10, 0xffcc44, 0.3).setDepth(3);
      const core = this.add.circle(px, py, 5, 0xffdd66, 0.7).setDepth(4);
      const label = this.add.text(px, py + 16, 'Item', {
        fontSize: '7px', color: '#ffcc44',
      }).setOrigin(0.5).setDepth(4);

      // Pulse animation
      this.tweens.add({
        targets: glow, scaleX: 1.4, scaleY: 1.4, alpha: 0.1,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: core, alpha: 0.4,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.worldItems.push({
        id: def.id,
        itemId: def.itemId,
        itemLabel: def.label,
        x: px,
        y: py,
        glow,
        core,
        label,
        collected: false,
      });
    }
  }

  // ──── Overworld Enemies ────

  spawnOverworldEnemies() {
    this.overworldEnemies = [];
    const defeated = this.registry.get('defeatedOverworldEnemies') || {};

    for (const def of OVERWORLD_ENEMIES) {
      if (defeated[def.id]) continue; // already defeated

      const px = def.tileX * TILE_SIZE + TILE_SIZE / 2;
      const py = def.tileY * TILE_SIZE + TILE_SIZE / 2;

      // Colored rectangle sprite
      const sprite = this.add.rectangle(px, py, 26, 32, def.color).setDepth(10);
      this.add.rectangle(px, py, 26, 32).setStrokeStyle(1, 0xff4444, 0.4).setDepth(11);

      // Red !! marker
      const marker = this.add.text(px, py - 26, '!!', {
        fontSize: '12px', fontStyle: 'bold', color: '#ff4444',
      }).setOrigin(0.5).setDepth(12);
      this.tweens.add({
        targets: marker, y: py - 30,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // [E] hint
      this.add.text(px, py + 22, '[E]', {
        fontSize: '7px', color: '#cc6666',
      }).setOrigin(0.5).setDepth(11);

      // Name label
      this.add.text(px, py + 30, def.name, {
        fontSize: '7px', color: '#cc9999',
      }).setOrigin(0.5).setDepth(11);

      // Idle breathing animation
      this.tweens.add({
        targets: sprite, scaleY: 1.05, scaleX: 0.97,
        duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // Physics collider
      this.physics.add.existing(sprite, true);
      this.physics.add.collider(this.player, sprite);

      this.overworldEnemies.push({
        id: def.id,
        def,
        x: px,
        y: py,
        sprite,
        marker,
        defeated: false,
      });
    }
  }

  startOverworldEnemyBattle(oe) {
    this.showDialogue(oe.def.preDialogue, () => {
      this.inBattle = true;
      this.sfx.playEncounterStart();
      this.player.body.setVelocity(0);
      this._hideTouchControls();

      const enemies = oe.def.enemies.map(key => createEnemy(key));
      const activeParty = this.getActiveParty();

      for (const member of activeParty) {
        member.isDefending = false;
        member.isCharged = false;
        member.statusEffects = [];
      }

      this.cameras.main.flash(400, 100, 0, 0);
      this.time.delayedCall(500, () => {
        const tile = OVERWORLD_MAP[oe.def.tileY]?.[oe.def.tileX];
        const zoneTable = { 2: 'cursed', 9: 'deep', 12: 'farmland', 13: 'forest', 15: 'mountain_pass', 17: 'forest' };
        const oeZone = zoneTable[tile] || 'cursed';
        this.scene.launch('Battle', {
          party: activeParty,
          enemies,
          xpReward: oe.def.xp,
          goldReward: oe.def.gold,
          enemyTypes: [...oe.def.enemies],
          roster: this.getFullRoster(),
          isBossEncounter: false,
          zone: oeZone,
          onBattleEnd: (result) => {
            this.scene.stop('Battle');
            this.scene.stop('BattleUI');
            this.scene.resume();
            this.inBattle = false;
            this.drawPartyHUD();
            this._showTouchControls();
            if (result === 'win') {
              oe.defeated = true;
              oe.sprite.destroy();
              oe.marker.destroy();

              // Record to registry
              const defeatedMap = this.registry.get('defeatedOverworldEnemies') || {};
              defeatedMap[oe.id] = true;
              this.registry.set('defeatedOverworldEnemies', defeatedMap);

              this.showDialogue(oe.def.postDialogue, () => {
                // Special: recruit Rivin after Skeletal Captain defeat
                if (oe.id === 'skeletal_captain') {
                  this.recruitAfterBoss('rivin');
                }
              });
              this.checkQuestOverworldEnemyDefeat(oe.id);
              this.checkQuestBattleEnd(oe.def.enemies);
              this.triggerAutoSave();
            } else if (result === 'lose') {
              this.handleDefeat();
            }
            // 'run' leaves the enemy intact — nothing to do
          },
        });
        this.scene.pause();
      });
    });
  }

  // ──── Camera ────

  setupCamera() {
    const mapW = MAP_COLS * TILE_SIZE;
    const mapH = MAP_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(3.35);

    // UI camera — zoom 1, no scroll. Renders only UI objects.
    this.uiCamera = this.cameras.add(0, 0, 800, 640);

    // Hide every existing world object from the UI camera
    this.children.list.forEach(obj => this.uiCamera.ignore(obj));
  }

  /** Mark a game object as UI-only (visible on uiCamera, hidden from main). */
  _addUI(obj) {
    this.cameras.main.ignore(obj);
    return obj;
  }

  // ──── Location Labels ────

  drawLocationLabels() {
    for (const loc of LOCATION_LABELS) {
      const worldX = loc.tileX * TILE_SIZE + TILE_SIZE / 2;
      const worldY = loc.tileY * TILE_SIZE + TILE_SIZE / 2;
      const label = this.add.text(worldX, worldY, loc.name, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: loc.color,
        align: 'center',
      }).setOrigin(0.5).setAlpha(0.45).setDepth(5);
      this.uiCamera.ignore(label);
    }
  }

  // ──── Party HUD (top-left) ────

  drawPartyHUD() {
    if (this.hudContainer) this.hudContainer.destroy();
    this.hudContainer = this.add.container(10, 36).setScrollFactor(0).setDepth(100);
    this._addUI(this.hudContainer);

    const roster = this.registry.get('roster');
    const activeParty = this.getActiveParty();

    activeParty.forEach((member, i) => {
      const yy = i * 28;
      this.hudContainer.add(
        this.add.rectangle(12, yy + 10, 20, 20, member.color)
          .setStrokeStyle(1, 0xffffff, 0.5)
      );
      this.hudContainer.add(
        this.add.text(26, yy + 1, `${member.name} Lv.${member.level}`, {
          fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        })
      );
      this.hudContainer.add(
        this.add.text(26, yy + 13, `HP ${member.hp}/${member.maxHp}  MP ${member.mp}/${member.maxMp}`, {
          fontSize: '8px', color: '#aaaaaa',
        })
      );
    });

    // Gold display
    const gold = this.registry.get('gold') || 0;
    const allRoster = Object.values(roster).filter(c => c.recruited);
    const unspentPts = allRoster.some(c => c.talentPoints > 0);
    const ptIndicator = unspentPts ? '  \u2605 Talent Pts!' : '';
    this.hudContainer.add(
      this.add.text(0, activeParty.length * 28 + 4, `Gold: ${gold}  [P] Party  [I] Inv  [X] Exp  [Q] Quest`, {
        fontSize: '8px', color: '#666666',
      })
    );
    if (unspentPts) {
      this.hudContainer.add(
        this.add.text(0, activeParty.length * 28 + 16, `${ptIndicator}`, {
          fontSize: '8px', color: '#ffcc44', fontStyle: 'bold',
        })
      );
    }

    // Quest tracker
    const tracked = getTrackedQuest(this.registry);
    if (tracked) {
      const qY = activeParty.length * 28 + (unspentPts ? 30 : 18);
      this.hudContainer.add(
        this.add.text(0, qY, tracked.def.name, {
          fontSize: '9px', color: '#ccaa44', fontStyle: 'bold',
        })
      );
      // Show first incomplete objective
      for (const obj of tracked.def.objectives) {
        const progress = tracked.state.objectiveProgress[obj.id] || 0;
        if (progress < obj.required) {
          const progressStr = obj.required > 1 ? ` (${progress}/${obj.required})` : '';
          this.hudContainer.add(
            this.add.text(6, qY + 13, `${obj.description}${progressStr}`, {
              fontSize: '8px', color: '#888877',
            })
          );
          break;
        }
      }
    }
  }

  // ──── Mini-Map ────

  buildMiniMap() {
    const MINI_SCALE = 1;
    const mapW = MAP_COLS * MINI_SCALE; // 200
    const mapH = MAP_ROWS * MINI_SCALE; // 200

    this.minimapContainer = this.add.container(590, 36).setScrollFactor(0).setDepth(150);
    this._addUI(this.minimapContainer);
    this.minimapVisible = true;

    // Semi-transparent background with border
    const bg = this.add.rectangle(mapW / 2, mapH / 2, mapW + 6, mapH + 6, 0x000000, 0.6)
      .setStrokeStyle(1, 0xaaaaaa, 0.4);
    this.minimapContainer.add(bg);

    // Draw tile grid
    const gfx = this.add.graphics();
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = OVERWORLD_MAP[row][col];
        const color = TILE_COLORS[tile] ?? 0x000000;
        gfx.fillStyle(color, 1);
        gfx.fillRect(col * MINI_SCALE, row * MINI_SCALE, MINI_SCALE, MINI_SCALE);
      }
    }
    this.minimapContainer.add(gfx);

    // Campfire dots (orange)
    for (const cf of this.campfireTiles) {
      const dot = this.add.rectangle(
        (cf.x / TILE_SIZE) * MINI_SCALE,
        (cf.y / TILE_SIZE) * MINI_SCALE,
        3, 3, 0xff6600
      );
      this.minimapContainer.add(dot);
    }

    // Inn dots (yellow-orange)
    for (const inn of this.innTiles) {
      const dot = this.add.rectangle(
        (inn.x / TILE_SIZE) * MINI_SCALE,
        (inn.y / TILE_SIZE) * MINI_SCALE,
        3, 3, 0xddaa44
      );
      this.minimapContainer.add(dot);
    }

    // Boss altar dot (pulsing red)
    if (this.bossAltarPos) {
      const bx = (this.bossAltarPos.x / TILE_SIZE) * MINI_SCALE;
      const by = (this.bossAltarPos.y / TILE_SIZE) * MINI_SCALE;
      const bossDot = this.add.circle(bx, by, 2.5, 0xff2244);
      this.minimapContainer.add(bossDot);
      this.tweens.add({
        targets: bossDot, alpha: 0.3,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // NPC dots (yellow = unrecruited, green = recruited)
    this.minimapNPCDots = [];
    const roster = this.registry.get('roster');
    for (const npc of this.npcs) {
      const char = roster[npc.id];
      const dotColor = char.recruited ? 0x44ff44 : 0xffff00;
      const dot = this.add.circle(
        (npc.x / TILE_SIZE) * MINI_SCALE,
        (npc.y / TILE_SIZE) * MINI_SCALE,
        2, dotColor
      );
      this.minimapContainer.add(dot);
      this.minimapNPCDots.push({ dot, id: npc.id });
    }

    // Overworld enemy dots (red, only if not defeated)
    this.minimapEnemyDots = [];
    for (const oe of this.overworldEnemies) {
      if (oe.defeated) continue;
      const dot = this.add.circle(
        (oe.x / TILE_SIZE) * MINI_SCALE,
        (oe.y / TILE_SIZE) * MINI_SCALE,
        2, 0xff4444
      );
      this.minimapContainer.add(dot);
      this.minimapEnemyDots.push({ dot, id: oe.id });
    }

    // Quest objective markers (pulsing cyan, initially hidden)
    this.minimapQuestMarkers = [];
    for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
      const dot = this.add.circle(
        coords.x * MINI_SCALE,
        coords.y * MINI_SCALE,
        3, 0x44ddff
      ).setVisible(false);
      this.minimapContainer.add(dot);
      this.tweens.add({
        targets: dot, alpha: 0.3,
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.minimapQuestMarkers.push({ dot, locationKey: key });
    }

    // Player dot (blinking white)
    this.minimapPlayerDot = this.add.circle(
      (this.player.x / TILE_SIZE) * MINI_SCALE,
      (this.player.y / TILE_SIZE) * MINI_SCALE,
      2, 0xffffff
    );
    this.minimapContainer.add(this.minimapPlayerDot);
    this.tweens.add({
      targets: this.minimapPlayerDot, alpha: 0.3,
      duration: 400, yoyo: true, repeat: -1,
    });

    // "N" key label below map
    const label = this.add.text(mapW / 2, mapH + 8, 'N: Map', {
      fontSize: '7px', color: '#666666',
    }).setOrigin(0.5, 0);
    this.minimapContainer.add(label);

    // Touch: tap map label to toggle
    if (isTouchDevice()) {
      label.setText('Map').setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => {
        this.minimapVisible = !this.minimapVisible;
        this.minimapContainer.setVisible(this.minimapVisible);
      });
    }
  }

  updateMiniMap() {
    if (!this.minimapVisible) return;

    const MINI_SCALE = 1;

    // Update player dot position
    this.minimapPlayerDot.setPosition(
      (this.player.x / TILE_SIZE) * MINI_SCALE,
      (this.player.y / TILE_SIZE) * MINI_SCALE
    );

    // Update NPC dot colors based on recruited status
    const roster = this.registry.get('roster');
    for (const nd of this.minimapNPCDots) {
      const char = roster[nd.id];
      nd.dot.setFillStyle(char.recruited ? 0x44ff44 : 0xffff00);
    }

    // Hide defeated enemy dots
    for (const ed of this.minimapEnemyDots) {
      const oe = this.overworldEnemies.find(e => e.id === ed.id);
      if (oe && oe.defeated) ed.dot.setVisible(false);
    }

    // Show/hide quest objective markers
    const activeLocations = getActiveQuestLocations(this.registry);
    const activeKeys = new Set(activeLocations.map(l => l.locationKey));
    for (const qm of this.minimapQuestMarkers) {
      qm.dot.setVisible(activeKeys.has(qm.locationKey));
    }
  }

  // ──── Helpers ────

  getActiveParty() {
    const roster = this.registry.get('roster');
    const active = Object.values(roster).filter(c => c.recruited && c.active);
    const partyOrder = this.registry.get('partyOrder') || [];
    // Sort active members by their position in partyOrder
    active.sort((a, b) => {
      const ai = partyOrder.indexOf(a.id);
      const bi = partyOrder.indexOf(b.id);
      // Characters not in partyOrder go to the end
      const aIdx = ai === -1 ? 999 : ai;
      const bIdx = bi === -1 ? 999 : bi;
      return aIdx - bIdx;
    });
    return active;
  }

  getFullRoster() {
    return Object.values(this.registry.get('roster'));
  }

  // ──── Update ────

  update() {
    if (this.inBattle || this.dialogueActive || this.partyOpen || this.inventoryOpen || this.shopOpen || this.innOpen || this.experienceOpen || this.saveMenuOpen || this.questLogOpen) {
      this.player.body.setVelocity(0);
      return;
    }

    // Joystick movement (touch) or keyboard movement
    let vx = 0, vy = 0;
    const jv = this.touchControls ? this.touchControls.joystickVector : null;
    if (jv && (jv.x !== 0 || jv.y !== 0)) {
      vx = jv.x * PLAYER_SPEED;
      vy = jv.y * PLAYER_SPEED;
    } else {
      const left = this.cursors.left.isDown || this.wasd.left.isDown;
      const right = this.cursors.right.isDown || this.wasd.right.isDown;
      const up = this.cursors.up.isDown || this.wasd.up.isDown;
      const down = this.cursors.down.isDown || this.wasd.down.isDown;
      if (left) vx = -PLAYER_SPEED;
      else if (right) vx = PLAYER_SPEED;
      if (up) vy = -PLAYER_SPEED;
      else if (down) vy = PLAYER_SPEED;
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    }
    // Update facing direction based on movement
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
        const scaleY = 36 / this.player.height;
        this.player.setScale(scaleY);
      }
    }

    this.player.body.setVelocity(vx, vy);
    this.updateViewportTiles(this.player.x, this.player.y);



    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    if (tx !== this.lastTileX || ty !== this.lastTileY) {
      this.lastTileX = tx;
      this.lastTileY = ty;
      this.checkEncounter(tx, ty);
      this.checkLocationObjectives(tx, ty);

      if (!this.registry.get('farmlandCutscenePlayed')) {
        const dx = tx - 18, dy = ty - 188;
        if (Math.sqrt(dx * dx + dy * dy) <= 5) {
          this.registry.set('farmlandCutscenePlayed', true);
          this.player.body.setVelocity(0);
          this.triggerFarmlandCutscene();
        }
      }

      if (!this.registry.get('brackenCutscenePlayed')) {
        const dx = tx - 55, dy = ty - 87;
        if (Math.sqrt(dx * dx + dy * dy) <= 50) {
          this.registry.set('brackenCutscenePlayed', true);
          this.player.body.setVelocity(0);
          this.triggerBrackenCutscene();
        }
      }

      if (this.registry.get('brackenCutscenePlayed') && !this.registry.get('rivinDialoguePlayed')) {
        const dx = tx - 55, dy = ty - 87;
        if (Math.sqrt(dx * dx + dy * dy) <= 5) {
          this.registry.set('rivinDialoguePlayed', true);
          this.player.body.setVelocity(0);
          this.triggerRivinDialogue();
        }
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteract();
    } else if (this.touchControls && this.touchControls.interactPressed) {
      this.touchControls.interactPressed = false;
      this.tryInteract();
    }

    if (Phaser.Input.Keyboard.JustDown(this.partyKey)) {
      this.openPartyScreen();
    }

    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.openInventoryScreen();
    }

    if (Phaser.Input.Keyboard.JustDown(this.experienceKey)) {
      this.openExperienceScreen();
    }

    if (Phaser.Input.Keyboard.JustDown(this.questKey)) {
      this.openQuestLog();
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.openSaveMenu();
    }

    if (Phaser.Input.Keyboard.JustDown(this.muteKey)) {
      const muted = this.sfx.toggleMute();
      this.showSaveToast(muted ? 'Sound OFF' : 'Sound ON');
    }

    if (Phaser.Input.Keyboard.JustDown(this.mapKey)) {
      this.minimapVisible = !this.minimapVisible;
      this.minimapContainer.setVisible(this.minimapVisible);
    }

    this.updateMiniMap();
  }

  // ──── Touch Controls Visibility ────

  _hideTouchControls() {
    if (this.touchControls) this.touchControls.setControlsVisible(false);
  }

  _showTouchControls() {
    if (this.touchControls) this.touchControls.setControlsVisible(true);
  }

  // ──── Party Screen ────

  openPartyScreen() {
    this.partyOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('Party', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('Party');
        this.time.delayedCall(100, () => {
          this.partyOpen = false;
          this.drawPartyHUD();
          this._showTouchControls();
        });
      },
    });
  }

  // ──── Experience Screen ────

  openExperienceScreen() {
    this.experienceOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('Experience', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('Experience');
        this.time.delayedCall(100, () => {
          this.experienceOpen = false;
          this.drawPartyHUD();
          this._showTouchControls();
        });
      },
    });
  }

  // ──── Inventory Screen ────

  openInventoryScreen() {
    this.inventoryOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('Inventory', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('Inventory');
        this.time.delayedCall(100, () => {
          this.inventoryOpen = false;
          this.drawPartyHUD();
          this._showTouchControls();
        });
      },
    });
  }

  // ──── Shop Screen ────

  openShopScreen() {
    this.shopOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('Shop', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('Shop');
        this.shopOpen = false;
        this.drawPartyHUD();
        this.triggerAutoSave();
        this._showTouchControls();
      },
    });
  }

  // ──── Inn Screen ────

  openInnScreen() {
    this.innOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('Inn', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('Inn');
        this.innOpen = false;
        this.drawPartyHUD();
        this.triggerAutoSave();
        this._showTouchControls();
      },
    });
  }

  // ──── Quest Log ────

  openQuestLog() {
    this.questLogOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();
    this.scene.launch('QuestLog', {
      onClose: () => {
        this.sfx.playMenuClose();
        this.scene.stop('QuestLog');
        this.time.delayedCall(100, () => {
          this.questLogOpen = false;
          this.drawPartyHUD();
          this._showTouchControls();
        });
      },
    });
  }

  // ──── Quest Hooks ────

  /**
   * After winning a random encounter, check defeat_count objectives for each enemy type killed.
   * @param {string[]} enemyTypes - array of enemy def keys (e.g. ['skeleton','skeleton','zombie'])
   */
  checkQuestBattleEnd(enemyTypes) {
    // Count each type
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

    // Synthetic group counts — for each unique enemy type present, progress {type}_group by 1
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

  /**
   * After winning an overworld enemy battle, check defeat_enemy objectives.
   * @param {string} overworldEnemyId - the OVERWORLD_ENEMIES id (e.g. 'ow_wolfpack')
   */
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

  /**
   * When player steps on a new tile, check reach_location objectives.
   */
  checkLocationObjectives(tx, ty) {
    const matches = checkReachLocationObjectives(this.registry, tx, ty);
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

  /**
   * When player talks to an NPC, check talk_npc objectives.
   * @param {string} npcId - the character id (e.g. 'rivin')
   */
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

  /**
   * Auto-complete a quest (for quests with giver: 'auto').
   * NPC-giver quests would be turned in via dialogue instead.
   */
  autoCompleteQuest(questId) {
    const def = QUEST_DEFS[questId];
    if (!def) return;

    // Snapshot active quests before completion (to detect newly accepted quests)
    const qs = this.registry.get('questState');
    const activeBefore = qs ? new Set(Object.keys(qs.active)) : new Set();

    const rewards = completeQuest(this.registry, questId);
    if (rewards) {
      this.showQuestCompleteToast(def.name, rewards);
      this.drawPartyHUD();

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

  // ──── Quest Toast Notifications ────

  showQuestProgressToast(questId, result) {
    const def = QUEST_DEFS[questId];
    if (!def) return;

    // Find the objective that just progressed
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

  // ──── Encounters ────

  checkEncounter(tx, ty) {
    if (ty < 0 || ty >= MAP_ROWS || tx < 0 || tx >= MAP_COLS) return;
    const tile = OVERWORLD_MAP[ty][tx];

    const ZONE_MAP = {
      2:  { zone: 'cursed', rate: ENCOUNTER_RATE },
      3:  { zone: 'road', rate: ENCOUNTER_RATE_ROAD },
      9:  { zone: 'deep', rate: ENCOUNTER_RATE_DEEP },
      12: { zone: 'farmland', rate: ENCOUNTER_RATE_FARM },
      13: { zone: 'forest', rate: ENCOUNTER_RATE_FOREST },
      15: { zone: 'mountain_pass', rate: ENCOUNTER_RATE_MT_PASS },
      16: { zone: 'coastline', rate: ENCOUNTER_RATE_COAST },
      17: { zone: 'forest', rate: ENCOUNTER_RATE_DEEP_FOREST },
    };

    // During "Clear the Town" quest, Bracken area spawns only skeletons on any walkable tile
    if (isQuestActive(this.registry, 'act1_clear_bracken')) {
      const dx = tx - 55, dy = ty - 87;
      if (dx * dx + dy * dy <= 20 * 20 && tile !== 1 && tile !== 8 && tile !== 11) {
        if (Math.random() < 0.30) {
          this.startBattle('bracken_skeleton');
        }
        return;
      }
    }

    const entry = ZONE_MAP[tile];
    if (!entry) return;

    let zone = entry.zone;
    let rate = entry.rate;

    // During "Defend the Frontier" quest, farmland spawns only skeletons at higher rate
    if (tile === 12 && isQuestActive(this.registry, 'act1_defend_frontier')) {
      zone = 'farmland_skeleton';
      rate = 0.20;
    }

    if (Math.random() < rate) {
      this.startBattle(zone);
    }
  }

  startBattle(zone) {
    this.inBattle = true;
    this.sfx.playEncounterStart();
    this.player.body.setVelocity(0);
    this._hideTouchControls();

    // Pick encounter from zone table
    const table = zone === 'farmland_skeleton'
      ? FARMLAND_SKELETON_TABLE
      : zone === 'bracken_skeleton'
        ? BRACKEN_SKELETON_TABLE
        : (ENCOUNTER_TABLES[zone] || ENCOUNTER_TABLES.cursed);
    const total = table.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    let picked = table[0];
    for (const enc of table) {
      roll -= enc.weight;
      if (roll <= 0) { picked = enc; break; }
    }

    const enemies = picked.enemies.map(key => createEnemy(key));
    const activeParty = this.getActiveParty();
    const isBossEncounter = zone === 'boss' || zone === 'vranek';

    // Reset battle state on party members
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
        enemyTypes: [...picked.enemies], // pass original keys for loot rolling
        roster: this.getFullRoster(),
        isBossEncounter,
        zone,
        onBattleEnd: (result) => {
          this.scene.stop('Battle');
          this.scene.stop('BattleUI');
          this.scene.resume();
          this.inBattle = false;
          this.drawPartyHUD();
          this._showTouchControls();
          if (result === 'win') {
            this.triggerAutoSave();
            this.checkQuestBattleEnd(picked.enemies);
            if (isBossEncounter) {
              if (zone === 'vranek') {
                this.registry.set('vranekDefeated', true);
                this.showDialogue(['The dark forces of Vranek Spire have been vanquished! The mountain pass is safe.']);
              } else {
                this.registry.set('bossDefeated', true);
                this.showDialogue(['Atikesh has been vanquished! The eastern frontier is saved!']);
              }
            }
          } else if (result === 'lose') {
            this.handleDefeat();
          }
        },
      });
      this.scene.pause();
    });
  }

  handleDefeat() {
    const roster = this.registry.get('roster');
    for (const c of Object.values(roster)) {
      if (c.recruited) { c.hp = c.maxHp; c.mp = c.maxMp; }
    }
    this.player.setPosition(this.playerSpawn.x, this.playerSpawn.y);

    this.updateViewportTiles(this.playerSpawn.x, this.playerSpawn.y, true);
    this.drawPartyHUD();
    this.showDialogue(['You were overwhelmed... Your party retreats to camp and rests.']);
  }

  // ──── Interaction ────

  tryInteract() {
    // 1. Check inn proximity for rest
    for (const inn of this.innTiles) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, inn.x, inn.y);
      if (dist < TILE_SIZE * 2.5) {
        this.openInnScreen();
        return;
      }
    }

    // 2. Check campfire proximity for shop
    for (const cf of this.campfireTiles) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cf.x, cf.y);
      if (dist < TILE_SIZE * 2.5) {
        this.openShopScreen();
        return;
      }
    }

    // 3. Check world item pickups
    for (const wi of this.worldItems) {
      if (wi.collected) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, wi.x, wi.y);
      if (dist < TILE_SIZE * 2) {
        this.collectWorldItem(wi);
        return;
      }
    }

    // 4. Check overworld enemy interaction
    for (const oe of this.overworldEnemies) {
      if (oe.defeated) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, oe.x, oe.y);
      if (dist < TILE_SIZE * 2.5) {
        this.startOverworldEnemyBattle(oe);
        return;
      }
    }

    // 5. Check dungeon entrance interaction
    for (const de of this.dungeonEntrances) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, de.x, de.y);
      if (dist < TILE_SIZE * 2.5) {
        this.showDialogue([
          `You stand before ${de.name}. Dark energy seeps from within.`,
          'The dungeon is sealed for now... perhaps in time it will open.',
        ]);
        return;
      }
    }

    // 6. Check boss altar interaction
    for (const altar of this.bossAltarPositions) {
      const altarDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, altar.x, altar.y);
      if (altarDist < TILE_SIZE * 2.5) {
        if (altar.bossKey === 'vranek') {
          // Vranek Spire boss
          const vranekDefeated = this.registry.get('vranekDefeated');
          if (vranekDefeated) {
            this.showDialogue(['The spire is quiet. The dark knight\'s forces have been routed.']);
            return;
          }
          const roster = this.registry.get('roster');
          const recruitedCount = Object.values(roster).filter(c => c.recruited).length;
          if (recruitedCount < 4) { // Metz + 3 companions
            this.showDialogue([
              'Dark energy radiates from the spire. You need more allies before facing this threat.',
              `Companions recruited: ${recruitedCount - 1}/6`,
            ]);
            return;
          }
          this.showDialogue([
            'Vranek Spire pulses with necromantic power. A dark knight commands the dead within.',
            'Do you wish to challenge the spire\'s guardians? [E to confirm]',
          ], () => {
            this.startBattle('vranek');
          });
          return;
        } else {
          // Atikesh altar
          const bossDefeated = this.registry.get('bossDefeated');
          if (bossDefeated) {
            this.showDialogue(['The altar lies silent. Atikesh\'s power has been broken.']);
            return;
          }
          const roster = this.registry.get('roster');
          const recruitedCount = Object.values(roster).filter(c => c.recruited).length;
          if (recruitedCount < 7) { // Metz + 6 companions
            this.showDialogue([
              'The altar is dormant. You sense a powerful presence, but it requires more allies to face this threat.',
              `Companions recruited: ${recruitedCount - 1}/6`,
            ]);
            return;
          }
          this.showDialogue([
            'The altar pulses with dark energy. Atikesh awaits...',
            'Do you wish to challenge the Necromancer Lord? [E to confirm]',
          ], () => {
            this.startBattle('boss');
          });
          return;
        }
      }
    }

    // 7. Check NPC interaction
    let closest = null;
    let closestDist = Infinity;

    for (const npc of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, npc.x, npc.y
      );
      if (dist < closestDist) {
        closestDist = dist;
        closest = npc;
      }
    }

    if (!closest || closestDist > TILE_SIZE * 2.5) return;

    const roster = this.registry.get('roster');
    const char = roster[closest.id];

    if (!char.recruited) {
      const dialogue = NPC_DIALOGUES[closest.id];
      this.showDialogue(dialogue.recruit, () => {
        this.sfx.playNPCRecruit();
        char.recruited = true;
        const activeCount = Object.values(roster).filter(c => c.active).length;
        if (activeCount < 4) {
          char.active = true;
          // Add to partyOrder
          const partyOrder = this.registry.get('partyOrder') || [];
          if (!partyOrder.includes(char.id)) {
            partyOrder.push(char.id);
            this.registry.set('partyOrder', partyOrder);
          }
        } else {
          char.active = false;
          this.showDialogue([
            `${char.name} has been recruited but your active party is full.`,
            'Press P to manage your party and choose who to bring into battle.',
          ]);
        }
        if (closest.marker) closest.marker.destroy();
        this.drawPartyHUD();
        this.checkQuestNPCTalk(closest.id);
        this.triggerAutoSave();
      });
    } else {
      const lines = NPC_DIALOGUES[closest.id].idle;
      this.showDialogue([lines[Math.floor(Math.random() * lines.length)]]);
      this.checkQuestNPCTalk(closest.id);
    }
  }

  triggerFarmlandCutscene() {
    // Save player position so we can return to it
    this.registry.set('farmlandCutscenePlayerPos', { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('FarmlandCutscene');
    });
  }

  recruitAfterBoss(charId) {
    this.sfx.playNPCRecruit();
    const roster = this.registry.get('roster');
    roster[charId].recruited = true;
    roster[charId].active = true;

    const partyOrder = this.registry.get('partyOrder') || [];
    if (!partyOrder.includes(charId)) {
      partyOrder.push(charId);
      this.registry.set('partyOrder', partyOrder);
    }

    // Remove NPC marker if exists
    const npc = this.npcs.find(n => n.id === charId);
    if (npc && npc.marker) npc.marker.destroy();

    this.drawPartyHUD();
    this.triggerAutoSave();
  }

  triggerBrackenCutscene() {
    this.registry.set('brackenCutscenePlayerPos', { x: this.player.x, y: this.player.y });
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BrackenCutscene');
    });
  }

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
      this.checkLocationObjectives(
        Math.floor(this.player.x / TILE_SIZE),
        Math.floor(this.player.y / TILE_SIZE)
      );
      this.triggerAutoSave();
    });
  }

  collectWorldItem(wi) {
    this.sfx.playItemPickup();
    wi.collected = true;
    wi.glow.destroy();
    wi.core.destroy();
    wi.label.destroy();

    // Add to inventory
    const inventory = this.registry.get('inventory');
    inventory.push(wi.itemId);

    // Track as collected
    let collected = this.registry.get('collectedItems');
    if (!collected) {
      collected = {};
      this.registry.set('collectedItems', collected);
    }
    collected[wi.id] = true;

    this.showDialogue([`Found ${wi.itemLabel}! Added to inventory.`]);
  }

  // ──── Save System ────

  triggerAutoSave() {
    this.sfx.playSave();
    const state = serializeGameState(this.registry, { x: this.player.x, y: this.player.y });
    autoSave(state);
    // Also save to active slot if one is set
    const activeSlot = this.registry.get('activeSlot');
    if (activeSlot) {
      state.activeSlot = activeSlot;
      saveToSlot(activeSlot, state);
    }
    this.showSaveToast('Auto-saved');
  }

  openSaveMenu() {
    this.saveMenuOpen = true;
    this.sfx.playMenuOpen();
    this.player.body.setVelocity(0);
    this._hideTouchControls();

    const elements = [];
    const { width, height } = this.scale;

    // Overlay background
    const bg = this._addUI(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(300));
    elements.push(bg);

    // Title
    const title = this._addUI(this.add.text(width / 2, 80, 'SAVE GAME', {
      fontSize: '24px', color: '#ffddaa', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301));
    elements.push(title);

    // Current game summary
    const gold = this.registry.get('gold') || 0;
    const roster = this.registry.get('roster');
    const recruited = Object.values(roster).filter(c => c.recruited).length;
    const maxLevel = Object.values(roster)
      .filter(c => c.recruited)
      .reduce((max, c) => Math.max(max, c.level || 1), 1);
    const summary = this._addUI(this.add.text(width / 2, 120, `Current: Lv.${maxLevel}  Gold: ${gold}  Party: ${recruited}`, {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301));
    elements.push(summary);

    // Save slots
    const slotSummaries = getSlotSummaries();
    const slotY = 180;

    for (let i = 0; i < 3; i++) {
      const slotNum = i + 1;
      const sy = slotY + i * 70;
      const slotData = slotSummaries[i];

      // Slot background
      const slotBg = this._addUI(this.add.rectangle(width / 2, sy, 500, 55, 0x1a1a2e)
        .setStrokeStyle(1, 0x4a3a6a, 0.6)
        .setScrollFactor(0).setDepth(301));
      elements.push(slotBg);

      // Slot info
      let infoStr;
      if (slotData.exists) {
        const time = new Date(slotData.saveTime);
        const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        infoStr = `Slot ${slotNum}  —  Lv.${slotData.level}  Gold: ${slotData.gold}  Party: ${slotData.recruited}  (${timeStr})`;
      } else {
        infoStr = `Slot ${slotNum}  —  Empty`;
      }
      const infoText = this._addUI(this.add.text(width / 2 - 210, sy, infoStr, {
        fontSize: '13px', color: slotData.exists ? '#ccbbaa' : '#555555',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(302));
      elements.push(infoText);

      // Save button
      const btnBg = this._addUI(this.add.rectangle(width / 2 + 200, sy, 70, 30, 0x335533)
        .setStrokeStyle(1, 0x55aa55, 0.7)
        .setScrollFactor(0).setDepth(302)
        .setInteractive({ useHandCursor: true }));
      elements.push(btnBg);
      const btnText = this._addUI(this.add.text(width / 2 + 200, sy, 'Save', {
        fontSize: '12px', color: '#aaffaa',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(303));
      elements.push(btnText);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x447744);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x335533);
      });
      btnBg.on('pointerdown', () => {
        this.sfx.playSave();
        const state = serializeGameState(this.registry, { x: this.player.x, y: this.player.y });
        state.activeSlot = slotNum;
        saveToSlot(slotNum, state);
        autoSave(state);
        this.registry.set('activeSlot', slotNum);
        closeSaveMenu();
        this.showSaveToast(`Saved to Slot ${slotNum}`);
      });
    }

    // Close button / hint
    const closeHint = this._addUI(this.add.text(width / 2, slotY + 3 * 70 + 20, 'Press ESC or click here to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true }));
    elements.push(closeHint);

    closeHint.on('pointerdown', () => closeSaveMenu());

    // Keyboard shortcuts for slots
    const keyHandlers = [];
    for (let i = 1; i <= 3; i++) {
      const slotNum = i;
      const handler = (event) => {
        if (event.key === String(slotNum)) {
          this.sfx.playSave();
          const state = serializeGameState(this.registry, { x: this.player.x, y: this.player.y });
          state.activeSlot = slotNum;
          saveToSlot(slotNum, state);
          autoSave(state);
          this.registry.set('activeSlot', slotNum);
          closeSaveMenu();
          this.showSaveToast(`Saved to Slot ${slotNum}`);
        }
      };
      this.input.keyboard.on(`keydown-${i}`, handler);
      keyHandlers.push({ key: `keydown-${i}`, handler });
    }

    // ESC to close
    const escHandler = () => closeSaveMenu();

    const closeSaveMenu = () => {
      this.sfx.playMenuClose();
      for (const el of elements) el.destroy();
      // Remove keyboard handlers
      for (const kh of keyHandlers) {
        this.input.keyboard.off(kh.key, kh.handler);
      }
      this.time.delayedCall(100, () => {
        this.saveMenuOpen = false;
        this._showTouchControls();
      });
    };

    // Delay ESC listener slightly so the opening ESC press doesn't close it
    this.time.delayedCall(200, () => {
      if (!this.saveMenuOpen) return;
      const escOnce = () => {
        if (this.saveMenuOpen) {
          closeSaveMenu();
          this.input.keyboard.off('keydown-ESC', escOnce);
        }
      };
      this.input.keyboard.on('keydown-ESC', escOnce);
      // Store for cleanup
      keyHandlers.push({ key: 'keydown-ESC', handler: escOnce });
    });
  }

  showSaveToast(message) {
    const toast = this._addUI(this.add.text(400, 600, message, {
      fontSize: '12px', color: '#aaffaa',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400));
    this.tweens.add({
      targets: toast, alpha: 0, y: 580,
      delay: 1200, duration: 600,
      onComplete: () => toast.destroy(),
    });
  }

  // ──── Dialogue System ────

  showDialogue(lines, onComplete) {
    this.dialogueActive = true;
    this._hideTouchControls();
    this.dialogueQueue = [...lines];
    this.dialogueCallback = onComplete || null;
    this.showNextLine();
  }

  showNextLine() {
    if (this.dialogueQueue.length === 0) {
      this.dialogueActive = false;
      this._showTouchControls();
      if (this.dialogueCallback) this.dialogueCallback();
      return;
    }

    const line = this.dialogueQueue.shift();
    if (this.dBox) this.dBox.destroy();
    if (this.dText) this.dText.destroy();
    if (this.dHint) this.dHint.destroy();
    if (this.dName) { this.dName.destroy(); this.dName = null; }
    if (this.dPortrait) { this.dPortrait.destroy(); this.dPortrait = null; }

    const hintStr = this.touchControls ? '[Tap]' : '[E]';
    const speakerMatch = line.match(/^(.+?):\s*["']/);

    this.dBox = this._addUI(this.add.rectangle(400, 575, 720, 90, 0x000000, 0.9)
      .setStrokeStyle(2, 0xaa8844).setScrollFactor(0).setDepth(200));

    if (speakerMatch) {
      const speaker = speakerMatch[1];
      const dialogue = line.slice(speakerMatch[0].length - 1);

      // Show portrait if texture exists for this speaker
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

    this.dHint = this._addUI(this.add.text(740, 605, hintStr, {
      fontSize: '10px', color: '#887755',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201));

    // Tap-to-advance: make dialogue box interactive for touch
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
        } else if (this.touchControls && this.touchControls.interactPressed) {
          this.touchControls.interactPressed = false;
          advanceLine();
        }
      },
    });
  }
}
