import {
  OVERWORLD_MAP, TILE_SIZE, TILE_COLORS,
  MAP_COLS, MAP_ROWS, ENCOUNTER_RATE, ENCOUNTER_RATE_DEEP,
} from '../data/maps.js';
import { ENCOUNTER_TABLE, ENCOUNTER_TABLES, createEnemy } from '../data/characters.js';
import { serializeGameState, saveToSlot, loadFromSlot, autoSave, getSlotSummaries } from '../data/saveManager.js';

const PLAYER_SPEED = 160;

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
  hyla: {
    recruit: [
      'Hyla: "Captain Metz. The Danath war-colleges sent me when they heard about the incursions."',
      'Hyla: "I trained in ice and thunder. Precise. Efficient. No wasted energy."',
      'Hyla: "I can freeze enemies in place, call lightning, and raise barriers for the whole party."',
      'Hyla: "The college wants field data on necromantic magic. I want to stop it. We both benefit."',
      '[ Hyla the War Mage has joined your party! ]',
    ],
    idle: [
      'Hyla: "Atikesh\'s magic is crude but powerful. We must be precise where he is not."',
      'Hyla: "Frozen Chains slows them. Thunder Strike punishes them. Simple formula."',
      'Hyla: "War Barrier protects the whole party. Use it when things get overwhelming."',
      'Hyla: "The college will want a full report when this is over. Assuming we survive."',
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

// World item pickup definitions
const WORLD_ITEMS = [
  { id: 'pickup_1', x: 6, y: 5, itemId: 'iron_helm', label: 'Iron Helm' },
  { id: 'pickup_2', x: 16, y: 7, itemId: 'frontier_blade', label: 'Frontier Blade' },
  { id: 'pickup_3', x: 3, y: 13, itemId: 'scout_boots', label: 'Scout Boots' },
];

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('Overworld');
  }

  init(data) {
    this.loadedPos = data?.playerPos || null;
  }

  create() {
    this.buildMap();
    this.spawnPlayer();
    this.spawnNPC();
    this.spawnWorldItems();
    this.setupCamera();

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

    this.drawPartyHUD();

    // Instructions
    const inst = this.add.text(400, 620,
      'WASD: Move | E: Interact/Shop | P: Party | I: Inv | X: Exp | ESC: Save', {
      fontSize: '11px', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(100);
    this.tweens.add({ targets: inst, alpha: 0, delay: 6000, duration: 1000 });

    // Title
    this.add.text(400, 14, 'Defense of Rhaud — Eastern Frontier, 250 B.C.E.', {
      fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 10, y: 3 },
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
  }

  // ──── Map ────

  buildMap() {
    this.walls = this.physics.add.staticGroup();
    this.campfireTiles = []; // track campfire positions for shop interaction
    this.innTiles = []; // track inn positions for rest interaction

    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = OVERWORLD_MAP[row][col];
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const color = TILE_COLORS[tile] ?? 0x000000;

        this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color).setDepth(0);
        this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE)
          .setStrokeStyle(1, 0x000000, 0.08).setDepth(1);

        if (tile === 1 || tile === 4 || tile === 7 || tile === 11) {
          const wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
          wall.setDepth(0);
        }

        if (tile === 2 && Math.random() < 0.3) {
          const p = this.add.circle(
            x - 8 + Math.random() * 16, y - 8 + Math.random() * 16,
            1.5, 0x9944cc, 0.4
          ).setDepth(2);
          this.tweens.add({
            targets: p, alpha: 0.1, y: p.y - 6,
            duration: 1500 + Math.random() * 1000,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        // Deep cursed ground — more, bigger, faster purple particles
        if (tile === 9 && Math.random() < 0.5) {
          const dp = this.add.circle(
            x - 8 + Math.random() * 16, y - 8 + Math.random() * 16,
            2.5, 0xbb55ee, 0.5
          ).setDepth(2);
          this.tweens.add({
            targets: dp, alpha: 0.1, y: dp.y - 10,
            duration: 1000 + Math.random() * 800,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }

        // Boss altar — pulsing crimson glow
        if (tile === 10) {
          const glow = this.add.circle(x, y, 14, 0xff0033, 0.2).setDepth(2);
          this.tweens.add({
            targets: glow, scaleX: 1.5, scaleY: 1.5, alpha: 0.05,
            duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
          const core = this.add.circle(x, y, 5, 0xff2244, 0.6).setDepth(3);
          this.tweens.add({
            targets: core, alpha: 0.3,
            duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
          this.add.text(x, y + 18, 'Altar of Atikesh', {
            fontSize: '7px', color: '#cc4466',
          }).setOrigin(0.5).setDepth(3);
          this.add.text(x, y + 27, '[E]', {
            fontSize: '7px', color: '#882233',
          }).setOrigin(0.5).setDepth(3);
          this.bossAltarPos = { x, y };
        }

        if (tile === 8) {
          const wall = this.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color);
          this.physics.add.existing(wall, true);
          this.walls.add(wall);
          wall.setDepth(0);
          const fire = this.add.circle(x, y - 4, 6, 0xff6600, 0.9).setDepth(3);
          this.add.circle(x, y - 4, 12, 0xff4400, 0.15).setDepth(2);
          this.tweens.add({
            targets: fire, scaleX: 1.3, scaleY: 1.4, alpha: 0.6,
            duration: 400, yoyo: true, repeat: -1,
          });
          this.add.text(x, y + 18, 'Campfire', {
            fontSize: '8px', color: '#ffaa44',
          }).setOrigin(0.5).setDepth(3);

          // Shop hint
          this.add.text(x, y + 27, '[E] Shop', {
            fontSize: '7px', color: '#886633',
          }).setOrigin(0.5).setDepth(3);

          this.campfireTiles.push({ x, y });
        }

        if (tile === 11) {
          // Warm glow
          const glow = this.add.circle(x, y, 14, 0xffaa44, 0.15).setDepth(2);
          this.tweens.add({
            targets: glow, scaleX: 1.3, scaleY: 1.3, alpha: 0.05,
            duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
          this.add.text(x, y + 18, 'Inn', {
            fontSize: '8px', color: '#ffaa44',
          }).setOrigin(0.5).setDepth(3);
          this.add.text(x, y + 27, '[E] Rest', {
            fontSize: '7px', color: '#886633',
          }).setOrigin(0.5).setDepth(3);
          this.innTiles.push({ x, y });
        }

        if (tile === 6) this.playerSpawn = { x, y };
      }
    }
  }

  // ──── Player ────

  spawnPlayer() {
    const { x, y } = this.loadedPos || this.playerSpawn || { x: 272, y: 336 };
    this.player = this.add.rectangle(x, y, 22, 28, 0xcc2222).setDepth(10);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(20, 24);
    this.playerDetail = this.add.rectangle(x, y - 4, 14, 8, 0xdd6644).setDepth(11);
    this.playerLabel = this.add.text(x, y - 22, 'Cpt. Metz', {
      fontSize: '9px', color: '#ffdddd', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(11);
    this.physics.add.collider(this.player, this.walls);
  }

  // ──── NPCs ────

  spawnNPC() {
    const roster = this.registry.get('roster');

    // NPC placement data: id, pixel position, name color, detail color
    const NPC_DEFS = [
      { id: 'rivin',  x: 13 * TILE_SIZE + 16, y: 3 * TILE_SIZE + 16, nameColor: '#ffcc88', detailColor: 0x885511 },
      { id: 'lyra',   x: 2 * TILE_SIZE + 16,  y: 2 * TILE_SIZE + 16, nameColor: '#aaddaa', detailColor: 0x115522 },
      { id: 'fenton', x: 7 * TILE_SIZE + 16,  y: 13 * TILE_SIZE + 16, nameColor: '#bbcc88', detailColor: 0x3a4422 },
      { id: 'rickets',x: 2 * TILE_SIZE + 16,  y: 8 * TILE_SIZE + 16, nameColor: '#bbaaff', detailColor: 0x332266 },
      { id: 'hyla',   x: 8 * TILE_SIZE + 16,  y: 1 * TILE_SIZE + 16, nameColor: '#ddaaff', detailColor: 0x553388 },
      { id: 'anuel',  x: 13 * TILE_SIZE + 16, y: 9 * TILE_SIZE + 16, nameColor: '#ffffcc', detailColor: 0x888866 },
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

  // ──── Camera ────

  setupCamera() {
    const mapW = MAP_COLS * TILE_SIZE;
    const mapH = MAP_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  // ──── Party HUD (top-left) ────

  drawPartyHUD() {
    if (this.hudContainer) this.hudContainer.destroy();
    this.hudContainer = this.add.container(10, 36).setScrollFactor(0).setDepth(100);

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
      this.add.text(0, activeParty.length * 28 + 4, `Gold: ${gold}  [P] Party  [I] Inv  [X] Exp`, {
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
  }

  // ──── Helpers ────

  getActiveParty() {
    const roster = this.registry.get('roster');
    return Object.values(roster).filter(c => c.recruited && c.active);
  }

  getFullRoster() {
    return Object.values(this.registry.get('roster'));
  }

  // ──── Update ────

  update() {
    if (this.inBattle || this.dialogueActive || this.partyOpen || this.inventoryOpen || this.shopOpen || this.innOpen || this.experienceOpen || this.saveMenuOpen) {
      this.player.body.setVelocity(0);
      return;
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    let vx = 0, vy = 0;
    if (left) vx = -PLAYER_SPEED;
    else if (right) vx = PLAYER_SPEED;
    if (up) vy = -PLAYER_SPEED;
    else if (down) vy = PLAYER_SPEED;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.player.body.setVelocity(vx, vy);

    this.playerDetail.setPosition(this.player.x, this.player.y - 4);
    this.playerLabel.setPosition(this.player.x, this.player.y - 22);

    const tx = Math.floor(this.player.x / TILE_SIZE);
    const ty = Math.floor(this.player.y / TILE_SIZE);
    if (tx !== this.lastTileX || ty !== this.lastTileY) {
      this.lastTileX = tx;
      this.lastTileY = ty;
      this.checkEncounter(tx, ty);
    }

    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
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

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.openSaveMenu();
    }
  }

  // ──── Party Screen ────

  openPartyScreen() {
    this.partyOpen = true;
    this.player.body.setVelocity(0);
    this.scene.launch('Party', {
      onClose: () => {
        this.scene.stop('Party');
        this.time.delayedCall(100, () => {
          this.partyOpen = false;
          this.drawPartyHUD();
        });
      },
    });
  }

  // ──── Experience Screen ────

  openExperienceScreen() {
    this.experienceOpen = true;
    this.player.body.setVelocity(0);
    this.scene.launch('Experience', {
      onClose: () => {
        this.scene.stop('Experience');
        // Short delay so the same X keypress doesn't immediately reopen
        this.time.delayedCall(100, () => {
          this.experienceOpen = false;
          this.drawPartyHUD();
        });
      },
    });
  }

  // ──── Inventory Screen ────

  openInventoryScreen() {
    this.inventoryOpen = true;
    this.player.body.setVelocity(0);
    this.scene.launch('Inventory', {
      onClose: () => {
        this.scene.stop('Inventory');
        this.time.delayedCall(100, () => {
          this.inventoryOpen = false;
          this.drawPartyHUD();
        });
      },
    });
  }

  // ──── Shop Screen ────

  openShopScreen() {
    this.shopOpen = true;
    this.player.body.setVelocity(0);
    this.scene.launch('Shop', {
      onClose: () => {
        this.scene.stop('Shop');
        this.shopOpen = false;
        this.drawPartyHUD();
        this.triggerAutoSave();
      },
    });
  }

  // ──── Inn Screen ────

  openInnScreen() {
    this.innOpen = true;
    this.player.body.setVelocity(0);
    this.scene.launch('Inn', {
      onClose: () => {
        this.scene.stop('Inn');
        this.innOpen = false;
        this.drawPartyHUD();
        this.triggerAutoSave();
      },
    });
  }

  // ──── Encounters ────

  checkEncounter(tx, ty) {
    if (ty < 0 || ty >= MAP_ROWS || tx < 0 || tx >= MAP_COLS) return;
    const tile = OVERWORLD_MAP[ty][tx];
    if (tile === 2) {
      if (Math.random() < ENCOUNTER_RATE) this.startBattle('cursed');
    } else if (tile === 9) {
      if (Math.random() < ENCOUNTER_RATE_DEEP) this.startBattle('deep');
    }
  }

  startBattle(zone) {
    this.inBattle = true;
    this.player.body.setVelocity(0);

    // Pick encounter from zone table
    const table = ENCOUNTER_TABLES[zone] || ENCOUNTER_TABLES.cursed;
    const total = table.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    let picked = table[0];
    for (const enc of table) {
      roll -= enc.weight;
      if (roll <= 0) { picked = enc; break; }
    }

    const enemies = picked.enemies.map(key => createEnemy(key));
    const activeParty = this.getActiveParty();
    const isBossEncounter = zone === 'boss';

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
        onBattleEnd: (result) => {
          this.scene.stop('Battle');
          this.scene.stop('BattleUI');
          this.scene.resume();
          this.inBattle = false;
          this.drawPartyHUD();
          if (result === 'win') {
            this.triggerAutoSave();
            if (isBossEncounter) {
              this.registry.set('bossDefeated', true);
              this.showDialogue(['Atikesh has been vanquished! The eastern frontier is saved!']);
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
    this.playerDetail.setPosition(this.playerSpawn.x, this.playerSpawn.y - 4);
    this.playerLabel.setPosition(this.playerSpawn.x, this.playerSpawn.y - 22);
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

    // 4. Check boss altar interaction
    if (this.bossAltarPos) {
      const altarDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bossAltarPos.x, this.bossAltarPos.y);
      if (altarDist < TILE_SIZE * 2.5) {
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
        // All companions recruited — offer boss fight
        this.showDialogue([
          'The altar pulses with dark energy. Atikesh awaits...',
          'Do you wish to challenge the Necromancer Lord? [E to confirm]',
        ], () => {
          this.startBattle('boss');
        });
        return;
      }
    }

    // 5. Check NPC interaction
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
        char.recruited = true;
        const activeCount = Object.values(roster).filter(c => c.active).length;
        if (activeCount < 4) {
          char.active = true;
        } else {
          char.active = false;
          this.showDialogue([
            `${char.name} has been recruited but your active party is full.`,
            'Press P to manage your party and choose who to bring into battle.',
          ]);
        }
        if (closest.marker) closest.marker.destroy();
        this.drawPartyHUD();
        this.triggerAutoSave();
      });
    } else {
      const lines = NPC_DIALOGUES[closest.id].idle;
      this.showDialogue([lines[Math.floor(Math.random() * lines.length)]]);
    }
  }

  collectWorldItem(wi) {
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
    this.player.body.setVelocity(0);

    const elements = [];
    const { width, height } = this.scale;

    // Overlay background
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85)
      .setScrollFactor(0).setDepth(300);
    elements.push(bg);

    // Title
    const title = this.add.text(width / 2, 80, 'SAVE GAME', {
      fontSize: '24px', color: '#ffddaa', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
    elements.push(title);

    // Current game summary
    const gold = this.registry.get('gold') || 0;
    const roster = this.registry.get('roster');
    const recruited = Object.values(roster).filter(c => c.recruited).length;
    const maxLevel = Object.values(roster)
      .filter(c => c.recruited)
      .reduce((max, c) => Math.max(max, c.level || 1), 1);
    const summary = this.add.text(width / 2, 120, `Current: Lv.${maxLevel}  Gold: ${gold}  Party: ${recruited}`, {
      fontSize: '12px', color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
    elements.push(summary);

    // Save slots
    const slotSummaries = getSlotSummaries();
    const slotY = 180;

    for (let i = 0; i < 3; i++) {
      const slotNum = i + 1;
      const sy = slotY + i * 70;
      const slotData = slotSummaries[i];

      // Slot background
      const slotBg = this.add.rectangle(width / 2, sy, 500, 55, 0x1a1a2e)
        .setStrokeStyle(1, 0x4a3a6a, 0.6)
        .setScrollFactor(0).setDepth(301);
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
      const infoText = this.add.text(width / 2 - 210, sy, infoStr, {
        fontSize: '13px', color: slotData.exists ? '#ccbbaa' : '#555555',
      }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(302);
      elements.push(infoText);

      // Save button
      const btnBg = this.add.rectangle(width / 2 + 200, sy, 70, 30, 0x335533)
        .setStrokeStyle(1, 0x55aa55, 0.7)
        .setScrollFactor(0).setDepth(302)
        .setInteractive({ useHandCursor: true });
      elements.push(btnBg);
      const btnText = this.add.text(width / 2 + 200, sy, 'Save', {
        fontSize: '12px', color: '#aaffaa',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(303);
      elements.push(btnText);

      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0x447744);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0x335533);
      });
      btnBg.on('pointerdown', () => {
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
    const closeHint = this.add.text(width / 2, slotY + 3 * 70 + 20, 'Press ESC or click here to close', {
      fontSize: '11px', color: '#666666',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });
    elements.push(closeHint);

    closeHint.on('pointerdown', () => closeSaveMenu());

    // Keyboard shortcuts for slots
    const keyHandlers = [];
    for (let i = 1; i <= 3; i++) {
      const slotNum = i;
      const handler = (event) => {
        if (event.key === String(slotNum)) {
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
      for (const el of elements) el.destroy();
      // Remove keyboard handlers
      for (const kh of keyHandlers) {
        this.input.keyboard.off(kh.key, kh.handler);
      }
      this.time.delayedCall(100, () => {
        this.saveMenuOpen = false;
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
    const toast = this.add.text(400, 600, message, {
      fontSize: '12px', color: '#aaffaa',
      backgroundColor: '#00000099', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(400);
    this.tweens.add({
      targets: toast, alpha: 0, y: 580,
      delay: 1200, duration: 600,
      onComplete: () => toast.destroy(),
    });
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

    const text = this.dialogueQueue.shift();
    if (this.dBox) this.dBox.destroy();
    if (this.dText) this.dText.destroy();
    if (this.dHint) this.dHint.destroy();

    this.dBox = this.add.rectangle(400, 580, 720, 70, 0x000000, 0.9)
      .setStrokeStyle(2, 0xaa8844).setScrollFactor(0).setDepth(200);
    this.dText = this.add.text(60, 555, text, {
      fontSize: '14px', color: '#ffe8cc',
      wordWrap: { width: 640 }, lineSpacing: 4,
    }).setScrollFactor(0).setDepth(201);
    this.dHint = this.add.text(740, 595, '[E]', {
      fontSize: '10px', color: '#887755',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const handler = this.time.addEvent({
      delay: 80, loop: true,
      callback: () => {
        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
          handler.remove();
          this.dBox.destroy();
          this.dText.destroy();
          this.dHint.destroy();
          this.showNextLine();
        }
      },
    });
  }
}
