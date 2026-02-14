// BrackenScene — Instanced town map for Bracken (40×40)
import { BRACKEN_MAP, BRACKEN_COLS, BRACKEN_ROWS, BRACKEN_TILE_SIZE, BRACKEN_SPAWNS } from '../data/brackenMap.js';
import { TILE_COLORS } from '../data/maps.js';

const PLAYER_SPEED = 140;
const IMPASSABLE = new Set([1, 4, 7, 8, 11, 14, 21]);

// Overworld spawn positions when exiting each gate (one tile outside the gate)
const OVERWORLD_EXIT = {
  north: { x: 79 * 32 + 16, y: 110 * 32 + 16 },  // one tile north of Bracken North entrance
  west:  { x: 76 * 32 + 16, y: 115 * 32 + 16 },   // one tile west of Bracken West entrance
  east:  { x: 86 * 32 + 16, y: 116 * 32 + 16 },    // one tile east of Bracken East entrance
};

export class BrackenScene extends Phaser.Scene {
  constructor() {
    super('Bracken');
  }

  init(data) {
    this.entrance = data?.entrance || 'west';
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
    const spawn = BRACKEN_SPAWNS[this.entrance] || BRACKEN_SPAWNS.west;
    this.playerDir = this.entrance === 'west' ? 'right'
                   : this.entrance === 'east' ? 'left'
                   : 'down';

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

    // ─── Camera ───
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(3.35);

    // ─── Input ───
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    this.lastTileX = Math.floor(this.player.x / BRACKEN_TILE_SIZE);
    this.lastTileY = Math.floor(this.player.y / BRACKEN_TILE_SIZE);

    // Fade in
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  update() {
    if (this.transitioning) {
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

    // ─── Gate exit detection ───
    const tx = Math.floor(this.player.x / BRACKEN_TILE_SIZE);
    const ty = Math.floor(this.player.y / BRACKEN_TILE_SIZE);

    if (tx !== this.lastTileX || ty !== this.lastTileY) {
      this.lastTileX = tx;
      this.lastTileY = ty;

      if (tx >= 0 && tx < BRACKEN_COLS && ty >= 0 && ty < BRACKEN_ROWS) {
        const tile = BRACKEN_MAP[ty][tx];
        if (tile === 22) {
          this.exitTown(tx, ty);
        }
      }
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
