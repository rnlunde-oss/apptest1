import { ABILITIES } from '../data/abilities.js';
import { awardXP } from '../data/characters.js';
import { rollLoot, EQUIPMENT, lookupItem, CONSUMABLES } from '../data/equipment.js';
import { applyFormationDR, getFormationDR, getPartyFormationPositions, getEnemyFormationPositions } from '../utils/formation.js';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.party = data.party;         // active party members (up to 4)
    this.enemies = data.enemies;     // enemy instances (up to 4)
    this.xpReward = data.xpReward;   // XP for winning
    this.goldReward = data.goldReward || 0;
    this.enemyTypes = data.enemyTypes || []; // original enemy type keys for loot
    this.fullRoster = data.roster;   // all recruited characters (for shared XP)
    this.onBattleEnd = data.onBattleEnd;
    this.isBossEncounter = data.isBossEncounter || false;
    this.zone = data.zone || 'deep';
    this.battleOver = false;
    this.turnQueue = [];
    this.currentTurnIndex = -1;
    this.roundNumber = 0;

    // Tutorial support
    this.isTutorial = data.isTutorial || false;
    this.tutorialCallbacks = data.tutorialCallbacks || {};
    this.firstKillFired = false;
    this.tutorialFirstTurnShown = false;
  }

  preload() {
    const backgrounds = {
      cursed: 'bg_cursed',
      deep: 'bg_forest',
      boss: 'bg_cave',
      farmland: 'bg_farmland',
      mountain_pass: 'bg_mountain_pass',
      mountain: 'bg_mountain',
      forest: 'bg_forest',
      dungeon: 'bg_cave',
    };
    const paths = {
      bg_cursed: 'assets/backgrounds/cursed.png',
      bg_farmland: 'assets/backgrounds/farmland.png',
      bg_forest: 'assets/backgrounds/forest.png',
      bg_cave: 'assets/backgrounds/cave.png',
      bg_mountain_pass: 'assets/backgrounds/mountain_pass.png',
      bg_mountain: 'assets/backgrounds/mountain.png',
    };
    const key = backgrounds[this.zone];
    if (key && !this.textures.exists(key)) {
      this.load.image(key, paths[key]);
    }

    // Character battle sprites
    if (!this.textures.exists('metz_walk')) {
      this.load.spritesheet('metz_walk', 'assets/sprites/metz_spritesheet.png', {
        frameWidth: 48, frameHeight: 48,
      });
    }
    if (!this.textures.exists('spr_farmer_alan')) {
      this.load.image('spr_farmer_alan', 'assets/sprites/alan_battle.png');
    }
    if (!this.textures.exists('spr_skeleton')) {
      this.load.image('spr_skeleton', 'assets/sprites/skeleton_battle.png');
    }
    if (!this.textures.exists('spr_dagvar')) {
      this.load.image('spr_dagvar', 'assets/sprites/dagvar_battle.png');
    }
    if (!this.textures.exists('spr_havrifyn')) {
      this.load.image('spr_havrifyn', 'assets/sprites/havrifyn_battle.png');
    }
    if (!this.textures.exists('spr_zombie')) {
      this.load.image('spr_zombie', 'assets/sprites/zombie_battle.png');
    }
    if (!this.textures.exists('spr_dire_wolf')) {
      this.load.image('spr_dire_wolf', 'assets/sprites/dire_wolf_battle.png');
    }
    if (!this.textures.exists('spr_plague_rat')) {
      this.load.image('spr_plague_rat', 'assets/sprites/plague_rat_battle.png');
    }
    if (!this.textures.exists('spr_corrupted_treant')) {
      this.load.image('spr_corrupted_treant', 'assets/sprites/corrupted_treant_battle.png');
    }
    if (!this.textures.exists('spr_bandit_thief')) {
      this.load.image('spr_bandit_thief', 'assets/sprites/bandit_thief_battle.png');
    }
    if (!this.textures.exists('spr_bandit_henchman')) {
      this.load.image('spr_bandit_henchman', 'assets/sprites/bandit_henchman_battle.png');
    }
    if (!this.textures.exists('spr_bandit_chief')) {
      this.load.image('spr_bandit_chief', 'assets/sprites/bandit_chief_battle.png');
    }
    if (!this.textures.exists('spr_shadow_fiend')) {
      this.load.image('spr_shadow_fiend', 'assets/sprites/shadow_fiend_battle.png');
    }
    if (!this.textures.exists('spr_bone_reaper')) {
      this.load.image('spr_bone_reaper', 'assets/sprites/bone_reaper_battle.png');
    }
    if (!this.textures.exists('spr_skeletal_captain')) {
      this.load.image('spr_skeletal_captain', 'assets/sprites/skeletal_captain_battle.png');
    }
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    this._generateAtikeshTexture();
    this._generateDagvarTexture();
    this._removeWhiteBackgrounds();

    // Battlefield background
    const bgKeys = {
      cursed: 'bg_cursed', deep: 'bg_forest', boss: 'bg_cave',
      farmland: 'bg_farmland', mountain_pass: 'bg_mountain_pass', mountain: 'bg_mountain',
      forest: 'bg_forest', dungeon: 'bg_cave',
    };
    const bgKey = bgKeys[this.zone];
    if (bgKey && this.textures.exists(bgKey)) {
      const bg = this.add.image(400, 320, bgKey);
      const scaleX = 800 / bg.width;
      const scaleY = 640 / bg.height;
      bg.setScale(Math.max(scaleX, scaleY));
    } else {
      this.add.rectangle(400, 320, 800, 640, 0x111118);
    }
    this.add.ellipse(400, 420, 760, 200, 0x1a1a28, 0.5).setDepth(0);
    this.add.rectangle(400, 300, 800, 2, 0x332244, 0.2).setDepth(0);

    this.drawCombatants();

    // Launch UI — it calls buildTurnQueue via callback when ready
    this.scene.launch('BattleUI', {
      battleScene: this,
      party: this.party,
      enemies: this.enemies,
      inventory: this.registry.get('inventory'),
    });
  }

  drawCombatants() {
    this.partySprites = [];
    this.enemySprites = [];
    this.formationOverlays = [];

    // Depth layering per position for 3D perspective
    // Party: pos 0 (front) = bottom layer, pos 3 (rear) = top layer
    const partyDepth = [10, 14, 14, 18];
    // Enemy: pos 0 (front) = top layer, pos 3 (rear) = bottom layer
    const enemyDepth = [18, 14, 14, 10];

    // Party — diamond/wedge formation
    const partyPositions = getPartyFormationPositions(this.party.length);

    this.party.forEach((member, i) => {
      if (member.hp <= 0) return;
      const pos = partyPositions[i] || partyPositions[0];
      const x = pos.x;
      const y = pos.y;
      const baseD = partyDepth[i] || 10;

      this.add.ellipse(x, y + 54, 96, 28, 0x000000, 0.3).setDepth(baseD - 2);

      // Use character sprite if available, otherwise fallback to colored rectangle
      const spriteKey = this.getCharSpriteKey(member);
      let sprite;
      if (spriteKey && this.textures.exists(spriteKey)) {
        if (spriteKey === 'metz_walk') {
          sprite = this.add.sprite(x, y, 'metz_walk', 0).setDepth(baseD);
        } else {
          sprite = this.add.image(x, y, spriteKey).setDepth(baseD);
        }
        const targetH = spriteKey === 'metz_walk' ? 147 : 128;
        const scale = targetH / sprite.height;
        sprite.setScale(scale);
        sprite.setOrigin(0.5, 0.5);
      } else {
        sprite = this.add.rectangle(x, y, 76, 100, member.color).setDepth(baseD);
        this.add.rectangle(x, y, 76, 100).setStrokeStyle(1, 0xffffff, 0.25).setDepth(baseD + 1);

        // Class icon
        const iconMap = {
          Commander: { shape: 'star', color: 0xffcc44 },
          Warrior: { shape: 'square', color: 0xbb6622 },
          Ranger: { shape: 'triangle', color: 0x44aa44 },
          Wizard: { shape: 'circle', color: 0x6644cc },
          Priest: { shape: 'circle', color: 0xddddaa },
        };
        const icon = iconMap[member.cls] || iconMap.Warrior;
        this.add.circle(x, y - 40, 8, icon.color, 0.8).setDepth(baseD + 2);
      }

      // Name under sprite
      this.add.text(x, y + 58, member.name, {
        fontSize: '11px', color: '#cccccc',
      }).setOrigin(0.5).setDepth(baseD + 2);

      this.tweens.add({
        targets: sprite, y: y - 5,
        duration: 900 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.partySprites.push({ sprite, character: member, baseX: x, baseY: y });
    });

    // Enemies — mirrored diamond/wedge formation
    const enemyPositions = getEnemyFormationPositions(this.enemies.length);

    this.enemies.forEach((enemy, i) => {
      const pos = enemyPositions[i] || enemyPositions[0];
      const x = pos.x;
      const y = pos.y;
      const baseD = enemyDepth[i] || 10;

      // Boss enemies get larger sprites
      const spriteW = enemy.isBoss ? 100 : 76;
      const spriteH = enemy.isBoss ? 130 : 100;

      this.add.ellipse(x, y + spriteH / 2 + 2, spriteW + 20, 28, 0x000000, 0.3).setDepth(baseD - 2);

      let sprite;
      const enemySpriteKey = this.getCharSpriteKey(enemy);

      if (enemySpriteKey && this.textures.exists(enemySpriteKey)) {
        sprite = this.add.image(x, y, enemySpriteKey).setDepth(baseD);
        const targetH = enemySpriteKey === 'spr_dagvar' ? 320 : enemySpriteKey === 'spr_havrifyn' ? 280 : enemySpriteKey === 'spr_bone_reaper' ? 260 : enemySpriteKey === 'spr_skeleton' ? 218 : (enemy.isBoss ? 160 : 128);
        const scale = targetH / sprite.height;
        sprite.setScale(scale);
        sprite.setOrigin(0.5, 0.5);
        if (enemy.cls === 'Spirit') sprite.setAlpha(0.7);
        if (enemy.isBoss) {
          const glow = this.add.ellipse(x, y, spriteW + 32, spriteH + 32, enemy.color, 0.15).setDepth(baseD - 1);
          this.tweens.add({
            targets: glow, scaleX: 1.2, scaleY: 1.2, alpha: 0.05,
            duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        }
      } else if (enemy.isBoss) {
        // Boss glow
        const glow = this.add.ellipse(x, y, spriteW + 32, spriteH + 32, enemy.color, 0.15).setDepth(baseD - 1);
        this.tweens.add({
          targets: glow, scaleX: 1.2, scaleY: 1.2, alpha: 0.05,
          duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });

        // Use boss-specific procedural texture
        const baseId = enemy.id.replace(/_[a-z0-9]{4}$/, '');
        const bossTexKey = baseId + '_boss';
        sprite = this.add.image(x, y, this.textures.exists(bossTexKey) ? bossTexKey : 'atikesh_boss').setDepth(baseD);
      } else {
        // Fallback: colored rectangle
        const spriteAlpha = enemy.cls === 'Spirit' ? 0.7 : 1;
        sprite = this.add.rectangle(x, y, spriteW, spriteH, enemy.color).setDepth(baseD).setAlpha(spriteAlpha);
        const strokeColor = 0xff4444;
        const strokeAlpha = 0.2;
        this.add.rectangle(x, y, spriteW, spriteH).setStrokeStyle(1, strokeColor, strokeAlpha).setDepth(baseD + 1);
      }

      // Class-based visual icons (skip for boss and image sprites)
      if (!enemySpriteKey || !this.textures.exists(enemySpriteKey)) {
        if (enemy.cls === 'Undead') {
          this.add.circle(x, y - 32, 10, 0xddddaa, 0.5).setDepth(baseD + 2);
          this.add.circle(x - 4, y - 34, 3, 0x220000).setDepth(baseD + 3);
          this.add.circle(x + 4, y - 34, 3, 0x220000).setDepth(baseD + 3);
        } else if (enemy.cls === 'Spirit') {
          this.add.circle(x - 6, y - 36, 4, 0xccaaff, 0.6).setDepth(baseD + 2);
          this.add.circle(x + 6, y - 36, 4, 0xccaaff, 0.6).setDepth(baseD + 2);
        } else if (enemy.cls === 'Armored') {
          this.add.rectangle(x, y - 32, 16, 20, 0x888899, 0.7).setDepth(baseD + 2);
          this.add.rectangle(x, y - 32, 16, 20).setStrokeStyle(1, 0xaaaacc, 0.5).setDepth(baseD + 3);
        } else if (enemy.cls === 'Caster') {
          this.add.circle(x, y - 36, 8, 0x8844cc, 0.6).setDepth(baseD + 2);
        } else if (enemy.cls === 'Ranged') {
          this.add.triangle(x, y - 36, 0, 16, 8, 0, 16, 16, 0x998866, 0.7).setDepth(baseD + 2);
        } else if (enemy.cls === 'Beast') {
          const claw = this.add.graphics().setDepth(baseD + 2);
          claw.lineStyle(3, 0xddaa66, 0.8);
          claw.lineBetween(x - 10, y - 44, x - 2, y - 28);
          claw.lineBetween(x + 2, y - 44, x + 10, y - 28);
        } else if (enemy.cls === 'Demon') {
          const horns = this.add.graphics().setDepth(baseD + 2);
          horns.fillStyle(0xcc4422, 0.8);
          horns.fillTriangle(x - 12, y - 28, x - 6, y - 44, x, y - 28);
          horns.fillTriangle(x, y - 28, x + 6, y - 44, x + 12, y - 28);
        } else if (enemy.cls === 'Nature') {
          const leaf = this.add.graphics().setDepth(baseD + 2);
          leaf.fillStyle(0x55aa44, 0.8);
          leaf.fillTriangle(x, y - 44, x - 10, y - 34, x, y - 24);
          leaf.fillTriangle(x, y - 44, x + 10, y - 34, x, y - 24);
          leaf.lineStyle(1, 0x55aa44, 0.6);
          leaf.lineBetween(x, y - 24, x, y - 18);
        }
      }

      this.add.text(x, y + spriteH / 2 + 14, enemy.name, {
        fontSize: '11px', color: enemy.isBoss ? '#ff8888' : '#cc9999',
        fontStyle: enemy.isBoss ? 'bold' : 'normal',
      }).setOrigin(0.5).setDepth(baseD + 2);

      this.tweens.add({
        targets: sprite, y: y - 5,
        duration: 1100 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.enemySprites.push({ sprite, character: enemy, baseX: x, baseY: y });
    });

    // Create formation DR overlays
    this.createFormationOverlays();
  }

  createFormationOverlays() {
    // Clean up old overlays
    if (this.formationOverlays) {
      for (const ov of this.formationOverlays) {
        if (ov.graphic) ov.graphic.destroy();
      }
    }
    this.formationOverlays = [];

    // Party overlays — blue shield glow behind sprites
    const partyDepthMap = [10, 14, 14, 18];
    const enemyDepthMap = [18, 14, 14, 10];
    for (let i = 0; i < this.partySprites.length; i++) {
      const ps = this.partySprites[i];
      const idx = this.party.indexOf(ps.character);
      const dr = getFormationDR(this.party, idx);
      if (dr > 0) {
        const baseD = partyDepthMap[idx] || 10;
        const glow = this.add.ellipse(ps.baseX, ps.baseY, 90, 110, 0x4488ff, dr * 0.3).setDepth(baseD - 1);
        // Sync with idle bobbing
        this.tweens.add({
          targets: glow, y: ps.baseY - 5,
          duration: 900 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.formationOverlays.push({ graphic: glow, side: 'party', index: idx });
      }
    }

    // Enemy overlays — dark semi-transparent overlay on sprites
    for (let i = 0; i < this.enemySprites.length; i++) {
      const es = this.enemySprites[i];
      const idx = this.enemies.indexOf(es.character);
      const dr = getFormationDR(this.enemies, idx);
      if (dr > 0) {
        const baseD = enemyDepthMap[idx] || 10;
        const spriteW = es.character.isBoss ? 100 : 76;
        const spriteH = es.character.isBoss ? 130 : 100;
        const shade = this.add.rectangle(es.baseX, es.baseY, spriteW, spriteH, 0x000000, dr * 0.5).setDepth(baseD + 1);
        // Sync with idle bobbing
        this.tweens.add({
          targets: shade, y: es.baseY - 5,
          duration: 1100 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.formationOverlays.push({ graphic: shade, side: 'enemy', index: idx });
      }
    }
  }

  updateFormationOverlays() {
    // Destroy old overlays and recreate with updated DR values
    if (this.formationOverlays) {
      for (const ov of this.formationOverlays) {
        if (ov.graphic) ov.graphic.destroy();
      }
    }
    this.formationOverlays = [];

    // Party overlays
    const partyDM = [10, 14, 14, 18];
    const enemyDM = [18, 14, 14, 10];
    for (let i = 0; i < this.partySprites.length; i++) {
      const ps = this.partySprites[i];
      if (ps.character.hp <= 0) continue;
      const idx = this.party.indexOf(ps.character);
      const dr = getFormationDR(this.party, idx);
      if (dr > 0) {
        const baseD = partyDM[idx] || 10;
        const glow = this.add.ellipse(ps.sprite.x, ps.sprite.y, 90, 110, 0x4488ff, dr * 0.3).setDepth(baseD - 1);
        this.tweens.add({
          targets: glow, y: ps.baseY - 5,
          duration: 900 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.formationOverlays.push({ graphic: glow, side: 'party', index: idx });
      }
    }

    // Enemy overlays
    for (let i = 0; i < this.enemySprites.length; i++) {
      const es = this.enemySprites[i];
      if (es.character.hp <= 0) continue;
      const idx = this.enemies.indexOf(es.character);
      const dr = getFormationDR(this.enemies, idx);
      if (dr > 0) {
        const baseD = enemyDM[idx] || 10;
        const spriteW = es.character.isBoss ? 100 : 76;
        const spriteH = es.character.isBoss ? 130 : 100;
        const shade = this.add.rectangle(es.sprite.x, es.sprite.y, spriteW, spriteH, 0x000000, dr * 0.5).setDepth(baseD + 1);
        this.tweens.add({
          targets: shade, y: es.baseY - 5,
          duration: 1100 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
        this.formationOverlays.push({ graphic: shade, side: 'enemy', index: idx });
      }
    }
  }

  // ──── Boss Texture Generation ────

  _generateAtikeshTexture() {
    if (this.textures.exists('atikesh_boss')) return;

    const W = 64, H = 80;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // 1. Lower robes — dark trapezoid, wider at bottom
    g.fillStyle(0x1a1018);
    g.fillTriangle(16, 45, 48, 45, 56, 78);
    g.fillTriangle(16, 45, 8, 78, 56, 78);
    // Red trim lines on robe edges
    g.lineStyle(1, 0x8b2020);
    g.lineBetween(10, 76, 16, 45);
    g.lineBetween(54, 76, 48, 45);
    // Horizontal red trim near bottom
    g.lineBetween(12, 70, 52, 70);

    // 2. Arms — dark sleeves extending from shoulders
    // Left arm (dagger side)
    g.fillStyle(0x1a1018);
    g.fillRect(8, 32, 10, 22);
    // Right arm (orb side)
    g.fillRect(46, 32, 10, 22);

    // 3. Upper torso — dark robes with red cross pattern
    g.fillStyle(0x1a1018);
    g.fillRect(18, 24, 28, 24);
    // Red cross pattern on chest
    g.lineStyle(1, 0x8b2020);
    g.lineBetween(32, 26, 32, 46);
    g.lineBetween(22, 36, 42, 36);

    // 4. Belt — brown band with skull decorations
    g.fillStyle(0x4a3828);
    g.fillRect(16, 44, 32, 4);
    // Skull decorations on belt (3 small circles)
    g.fillStyle(0xd4c8a0);
    g.fillCircle(24, 46, 2);
    g.fillCircle(32, 46, 2);
    g.fillCircle(40, 46, 2);
    // Tiny dark dots for skull eyes
    g.fillStyle(0x1a1018);
    g.fillRect(23, 45, 1, 1);
    g.fillRect(25, 45, 1, 1);
    g.fillRect(31, 45, 1, 1);
    g.fillRect(33, 45, 1, 1);
    g.fillRect(39, 45, 1, 1);
    g.fillRect(41, 45, 1, 1);

    // 5. Shoulders — wide dark pads with skull decorations
    g.fillStyle(0x221820);
    g.fillRect(10, 24, 14, 8);
    g.fillRect(40, 24, 14, 8);
    // Skull on left shoulder
    g.fillStyle(0xd4c8a0);
    g.fillCircle(17, 28, 3);
    g.fillStyle(0x1a1018);
    g.fillRect(16, 27, 1, 1);
    g.fillRect(18, 27, 1, 1);
    // Skull on right shoulder
    g.fillStyle(0xd4c8a0);
    g.fillCircle(47, 28, 3);
    g.fillStyle(0x1a1018);
    g.fillRect(46, 27, 1, 1);
    g.fillRect(48, 27, 1, 1);

    // 6. Left arm — blood-red dagger
    // Handle (brown)
    g.fillStyle(0x5a3a1a);
    g.fillRect(10, 48, 3, 6);
    // Guard (dark metal)
    g.fillStyle(0x666666);
    g.fillRect(8, 47, 7, 2);
    // Blade (silver)
    g.fillStyle(0xaabbcc);
    g.fillTriangle(11, 47, 9, 38, 13, 38);
    // Blood drip on blade
    g.fillStyle(0xcc2222);
    g.fillRect(11, 40, 1, 3);
    g.fillRect(10, 42, 1, 2);

    // 7. Right arm — purple magic orb
    // Outer glow
    g.fillStyle(0x7733bb, 0.3);
    g.fillCircle(51, 50, 7);
    // Orb body
    g.fillStyle(0x9944cc);
    g.fillCircle(51, 50, 5);
    // Bright center highlight
    g.fillStyle(0xeeccff);
    g.fillCircle(50, 49, 2);

    // 8. Head — bald pale dome
    // Neck
    g.fillStyle(0xc4a882);
    g.fillRect(28, 18, 8, 8);
    // Head oval (bald)
    g.fillStyle(0xc4a882);
    g.fillCircle(32, 12, 10);
    // Dark eye sockets
    g.fillStyle(0x1a0a10);
    g.fillRect(27, 11, 4, 3);
    g.fillRect(33, 11, 4, 3);
    // Glowing white-blue eyes
    g.fillStyle(0xccddff);
    g.fillRect(28, 11, 2, 2);
    g.fillRect(34, 11, 2, 2);
    // Mouth line
    g.lineStyle(1, 0x2a1a20);
    g.lineBetween(30, 16, 34, 16);

    // 9. Robe hem — jagged bottom edge for flowing effect
    g.fillStyle(0x1a1018);
    g.fillTriangle(8, 76, 12, 80, 16, 76);
    g.fillTriangle(16, 76, 20, 80, 24, 76);
    g.fillTriangle(24, 76, 28, 80, 32, 76);
    g.fillTriangle(32, 76, 36, 80, 40, 76);
    g.fillTriangle(40, 76, 44, 80, 48, 76);
    g.fillTriangle(48, 76, 52, 80, 56, 76);
    // Red trim on hem tips
    g.lineStyle(1, 0x8b2020);
    g.lineBetween(8, 78, 56, 78);

    g.generateTexture('atikesh_boss', W, H);
    g.destroy();
  }

  _generateDagvarTexture() {
    if (this.textures.exists('dagvar_boss')) return;

    const W = 64, H = 80;
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Leg guards — dark plate armor
    g.fillStyle(0x2a2018);
    g.fillRect(20, 52, 10, 26);
    g.fillRect(34, 52, 10, 26);
    // Knee plates
    g.fillStyle(0x3a3028);
    g.fillRect(18, 52, 14, 5);
    g.fillRect(32, 52, 14, 5);
    // Boots
    g.fillStyle(0x1a1510);
    g.fillRect(18, 72, 14, 8);
    g.fillRect(32, 72, 14, 8);

    // Torso — heavy dark breastplate
    g.fillStyle(0x2a2218);
    g.fillRect(16, 28, 32, 24);
    // Chest plate highlight
    g.fillStyle(0x3a3228);
    g.fillRect(20, 30, 24, 8);
    // Dark rune cross on chest
    g.lineStyle(1, 0x662244);
    g.lineBetween(32, 32, 32, 48);
    g.lineBetween(24, 40, 40, 40);

    // Belt with buckle
    g.fillStyle(0x4a3828);
    g.fillRect(16, 48, 32, 4);
    g.fillStyle(0x884422);
    g.fillCircle(32, 50, 2);

    // Shoulder pauldrons — large, spiked
    g.fillStyle(0x332818);
    g.fillRect(6, 24, 14, 10);
    g.fillRect(44, 24, 14, 10);
    // Spikes
    g.fillStyle(0x443828);
    g.fillTriangle(8, 24, 13, 16, 18, 24);
    g.fillTriangle(46, 24, 51, 16, 56, 24);

    // Arms — armored
    g.fillStyle(0x2a2018);
    g.fillRect(6, 32, 10, 18);
    g.fillRect(48, 32, 10, 18);
    // Gauntlets
    g.fillStyle(0x3a3028);
    g.fillRect(4, 48, 12, 6);
    g.fillRect(48, 48, 12, 6);

    // Greatsword — right side, large dark blade
    g.fillStyle(0x4a3020);
    g.fillRect(52, 42, 3, 12);
    // Cross guard
    g.fillStyle(0x555555);
    g.fillRect(48, 40, 11, 3);
    // Blade
    g.fillStyle(0x778899);
    g.fillRect(52, 10, 4, 30);
    g.fillTriangle(52, 10, 54, 4, 56, 10);
    // Dark energy on blade edge
    g.fillStyle(0x662244);
    g.fillRect(53, 14, 2, 22);

    // Helmet — horned dark helm
    g.fillStyle(0x2a2018);
    g.fillCircle(32, 14, 10);
    // Visor slit
    g.fillStyle(0x111008);
    g.fillRect(26, 12, 12, 4);
    // Glowing red eyes through visor
    g.fillStyle(0xcc2222);
    g.fillRect(28, 13, 3, 2);
    g.fillRect(33, 13, 3, 2);
    // Horns curving upward
    g.fillStyle(0x3a3028);
    g.fillTriangle(22, 14, 16, 2, 26, 10);
    g.fillTriangle(42, 14, 48, 2, 38, 10);

    // Dark energy wisps
    g.fillStyle(0x662244, 0.4);
    g.fillCircle(10, 20, 3);
    g.fillCircle(54, 22, 2);
    g.fillCircle(6, 44, 2);
    g.fillCircle(58, 38, 3);

    g.generateTexture('dagvar_boss', W, H);
    g.destroy();
  }

  _removeWhiteBackgrounds() {
    const keys = ['spr_farmer_alan', 'spr_skeleton', 'spr_dagvar', 'spr_havrifyn', 'spr_zombie', 'spr_dire_wolf', 'spr_plague_rat', 'spr_corrupted_treant', 'spr_bandit_thief', 'spr_bandit_henchman', 'spr_bandit_chief', 'spr_shadow_fiend', 'spr_bone_reaper', 'spr_skeletal_captain'];
    for (const key of keys) {
      if (!this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage();
      const canvas = document.createElement('canvas');
      canvas.width = src.width;
      canvas.height = src.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(src, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        // Fully transparent for near-white pixels
        if (r > 240 && g > 240 && b > 240) {
          d[i + 3] = 0;
        // Fade out semi-white pixels for smooth edges
        } else if (r > 220 && g > 220 && b > 220) {
          const avg = (r + g + b) / 3;
          d[i + 3] = Math.floor(255 * (1 - (avg - 220) / 35));
        }
      }
      ctx.putImageData(imageData, 0, 0);
      this.textures.remove(key);
      this.textures.addCanvas(key, canvas);
    }
  }

  // ──── Turn System ────

  buildTurnQueue() {
    this.roundNumber++;
    this.turnQueue = [];

    for (const m of this.party) {
      if (m.hp > 0) this.turnQueue.push({ side: 'party', character: m });
    }
    for (const e of this.enemies) {
      if (e.hp > 0) this.turnQueue.push({ side: 'enemy', character: e });
    }

    // Sort by speed (descending), tie-break: party goes first
    this.turnQueue.sort((a, b) => {
      const spdDiff = this.getEffectiveSpd(b.character) - this.getEffectiveSpd(a.character);
      if (spdDiff !== 0) return spdDiff;
      return a.side === 'party' ? -1 : 1;
    });

    this.currentTurnIndex = -1;

    // Process DOTs at round start (skip round 1)
    if (this.roundNumber > 1) {
      this.processDOTs(() => this.nextTurn());
    } else {
      this.nextTurn();
    }
  }

  getEffectiveSpd(char) {
    // Start from the getter (base + equipment) for party, or baseSpd for enemies
    let spd = char.spd;
    // Status effect percentages scale off baseSpd to prevent equipment amplifying buffs
    for (const eff of char.statusEffects) {
      if (eff.stat === 'spd' && eff.type === 'buff') spd += Math.floor(char.baseSpd * eff.amount);
      if (eff.stat === 'spd' && eff.type === 'debuff') spd -= Math.floor(char.baseSpd * eff.amount);
    }
    return Math.max(1, spd);
  }

  nextTurn() {
    if (this.battleOver) return;

    this.currentTurnIndex++;

    if (this.currentTurnIndex >= this.turnQueue.length) {
      // End of round — tick down status effects, then new round
      this.tickStatusEffects();
      this.buildTurnQueue();
      return;
    }

    const turn = this.turnQueue[this.currentTurnIndex];
    if (turn.character.hp <= 0) {
      this.nextTurn();
      return;
    }

    // Reset defend at start of their turn
    turn.character.isDefending = false;

    const uiScene = this.scene.get('BattleUI');
    uiScene.highlightTurn(turn);

    if (turn.side === 'party') {
      if (this.isTutorial && !this.tutorialFirstTurnShown && this.roundNumber === 1) {
        this.tutorialFirstTurnShown = true;
        uiScene.showMessage('Tip: Use Defend to double your defense for one round, or Charge to double the power of your next attack. Choose wisely!', () => {
          uiScene.startPlayerTurn(turn.character);
        });
      } else {
        uiScene.startPlayerTurn(turn.character);
      }
    } else {
      this.time.delayedCall(400, () => this.doEnemyAI(turn.character));
    }
  }

  // ──── Status Effects ────

  processDOTs(callback) {
    const allChars = [...this.party, ...this.enemies];
    const messages = [];

    for (const char of allChars) {
      if (char.hp <= 0) continue;
      for (const eff of char.statusEffects) {
        if (eff.type === 'dot') {
          const rawDmg = eff.amount;
          const group = this.party.includes(char) ? this.party : this.enemies;
          const charIdx = group.indexOf(char);
          const dmg = applyFormationDR(rawDmg, group, charIdx);
          char.hp = Math.max(0, char.hp - dmg);
          this.sfx.playPoisonTick();
          messages.push({ text: `${char.name} takes ${dmg} poison damage!`, char, dmg });
        }
      }
    }

    if (messages.length === 0) { callback(); return; }

    const uiScene = this.scene.get('BattleUI');
    uiScene.updateHP();

    // Show DOT messages
    const showNext = (idx) => {
      if (idx >= messages.length) {
        if (this.checkAllDeaths()) return;
        callback();
        return;
      }
      // Floating damage on the affected character
      const info = this.findSpriteFor(messages[idx].char);
      if (info) this.showFloatingText(info.sprite, `-${messages[idx].dmg}`, '#aa44cc');

      uiScene.showMessage(messages[idx].text, () => {
        uiScene.updateHP();
        showNext(idx + 1);
      });
    };
    showNext(0);
  }

  tickStatusEffects() {
    const allChars = [...this.party, ...this.enemies];
    for (const char of allChars) {
      for (let i = char.statusEffects.length - 1; i >= 0; i--) {
        char.statusEffects[i].turnsLeft--;
        if (char.statusEffects[i].turnsLeft <= 0) {
          char.statusEffects.splice(i, 1);
        }
      }
      // Clear charge if it expired
      if (char.isCharged && !char.statusEffects.find(e => e.stat === 'charged')) {
        char.isCharged = false;
      }
    }
  }

  getEffectiveAtk(char) {
    // Start from the getter (base + equipment) for party, or baseAtk for enemies
    let atk = char.atk;
    // Status effect percentages scale off baseAtk to prevent equipment amplifying buffs
    for (const eff of char.statusEffects) {
      if (eff.stat === 'atk' && eff.type === 'buff') atk += Math.floor(char.baseAtk * eff.amount);
      if (eff.stat === 'atk' && eff.type === 'debuff') atk -= Math.floor(char.baseAtk * eff.amount);
    }
    return Math.max(1, atk);
  }

  getEffectiveDef(char) {
    // Start from the getter (base + equipment) for party, or baseDef for enemies
    let def = char.def;
    if (char.isDefending) def *= 2;
    // Status effect percentages scale off baseDef to prevent equipment amplifying buffs
    for (const eff of char.statusEffects) {
      if (eff.stat === 'def' && (eff.type === 'buff' || eff.type === 'shield')) {
        def += Math.floor(char.baseDef * eff.amount);
      }
      if (eff.stat === 'def' && eff.type === 'debuff') {
        def -= Math.floor(char.baseDef * eff.amount);
      }
    }
    return Math.max(1, def);
  }

  // ──── Player Actions ────

  executeAbility(abilityKey, user, target) {
    if (this.battleOver) return;

    const ability = ABILITIES[abilityKey];
    if (!ability) return;
    const uiScene = this.scene.get('BattleUI');

    // MP check
    if (user.mp < ability.mpCost) {
      uiScene.showMessage(`${user.name} doesn't have enough MP!`, () => {
        uiScene.startPlayerTurn(user);
      });
      return;
    }
    user.mp -= ability.mpCost;

    // ── Defend ──
    if (ability.type === 'defend') {
      user.isDefending = true;
      this.sfx.playBuff();
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} braces for impact!`, () => this.nextTurn());
      return;
    }

    // ── Charge ──
    if (ability.type === 'charge') {
      user.isCharged = true;
      if (ability.effect) {
        user.statusEffects.push({
          ...ability.effect,
          turnsLeft: ability.effect.turns,
          label: 'Charged',
        });
      }
      this.sfx.playBuff();
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} builds up power!`, () => this.nextTurn());
      return;
    }

    // ── Buff (party-wide or self) ──
    if (ability.type === 'buff') {
      const targets = ability.target === 'party'
        ? this.party.filter(m => m.hp > 0)
        : [user];
      for (const t of targets) {
        if (ability.effect) {
          // Don't stack same buff
          const existing = t.statusEffects.find(e => e.stat === ability.effect.stat && e.type === 'buff');
          if (existing) {
            existing.turnsLeft = ability.effect.turns; // refresh duration
          } else {
            t.statusEffects.push({
              ...ability.effect,
              turnsLeft: ability.effect.turns,
              label: ability.name,
            });
          }
        }
      }
      const targetLabel = ability.target === 'party' ? 'the party' : user.name;
      this.sfx.playBuff();
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} used ${ability.name} on ${targetLabel}!`, () => this.nextTurn());
      return;
    }

    // ── Heal (party-wide or single) ──
    if (ability.type === 'heal') {
      const healTargets = ability.target === 'party'
        ? this.party.filter(m => m.hp > 0)
        : [target];

      // Handle revive — allow targeting dead allies
      if (ability.revive && target && target.hp <= 0) {
        target.hp = Math.min(ability.healAmount, target.maxHp);
        this.sfx.playHeal();
        const info = this.findSpriteFor(target);
        if (info) {
          info.sprite.setAlpha(1);
          this.showFloatingText(info.sprite, `+${target.hp}`, '#44ff44');
        }
        uiScene.updateHP();
        uiScene.showMessage(`${user.name} used ${ability.name}! ${target.name} is revived!`, () => this.nextTurn());
        return;
      }

      for (const t of healTargets) {
        if (t.hp <= 0) continue;
        const heal = ability.healAmount || 0;
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + heal);
        const actual = t.hp - before;
        if (actual > 0) {
          const info = this.findSpriteFor(t);
          if (info) this.showFloatingText(info.sprite, `+${actual}`, '#44ff44');
        }
      }
      this.sfx.playHeal();
      const targetLabel = ability.target === 'party' ? 'the party' : target.name;
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} used ${ability.name} on ${targetLabel}!`, () => this.nextTurn());
      return;
    }

    // ── All Enemies (AoE physical/magic/debuff) ──
    if (ability.target === 'all_enemies') {
      const livingEnemies = this.enemies.filter(e => e.hp > 0);
      if (livingEnemies.length === 0) { this.nextTurn(); return; }

      const messages = [];
      let totalDmg = 0;

      const hitNext = (idx) => {
        if (idx >= livingEnemies.length) {
          // Apply debuff effects to all hit targets
          if (ability.effect) {
            for (const e of livingEnemies) {
              if (e.hp <= 0) continue;
              const existing = e.statusEffects.find(
                s => s.stat === ability.effect.stat && s.type === ability.effect.type
              );
              if (existing) {
                existing.turnsLeft = ability.effect.turns;
              } else {
                e.statusEffects.push({
                  ...ability.effect,
                  turnsLeft: ability.effect.turns,
                  label: ability.name,
                });
              }
            }
          }
          if (ability.effect?.type === 'debuff') this.sfx.playDebuff();
          uiScene.updateHP();
          let msg = `${user.name} used ${ability.name}! Hit ${livingEnemies.length} enemies for ${totalDmg} total damage!`;
          if (ability.effect?.type === 'debuff') msg += ' Debuffed!';
          uiScene.showMessage(msg, () => {
            if (this.checkAllDeaths()) return;
            this.nextTurn();
          });
          return;
        }

        const enemy = livingEnemies[idx];

        // Accuracy check per target
        if (Math.random() * 100 > ability.accuracy) {
          hitNext(idx + 1);
          return;
        }

        // Damage calc
        let atkStat = this.getEffectiveAtk(user);
        let defStat = this.getEffectiveDef(enemy);
        let power = ability.power;
        if (user.isCharged && (ability.type === 'physical' || ability.type === 'debuff')) {
          power *= 2;
          if (idx === 0) {
            user.isCharged = false;
            user.statusEffects = user.statusEffects.filter(e => e.stat !== 'charged');
          }
        }
        const baseDmg = (power * (atkStat / defStat)) * 0.8;
        const randomMod = 0.9 + Math.random() * 0.2;
        const rawDamage = Math.max(1, Math.floor(baseDmg * randomMod));
        const enemyIdx = this.enemies.indexOf(enemy);
        const damage = applyFormationDR(rawDamage, this.enemies, enemyIdx);
        enemy.hp = Math.max(0, enemy.hp - damage);
        totalDmg += damage;
        this.sfx.playAttackHit();

        const info = this.findSpriteFor(enemy);
        if (info) {
          this.flashSprite(info.sprite);
          this.showFloatingText(info.sprite, `-${damage}`, '#ff4444');
        }

        this.time.delayedCall(200, () => hitNext(idx + 1));
      };

      hitNext(0);
      return;
    }

    // ── Debuff (with damage) ──
    if (ability.type === 'debuff') {
      this.doAttack(user, target, ability, () => {
        // Apply debuff effect on hit
        this.sfx.playDebuff();
        if (ability.effect && target.hp > 0) {
          const existing = target.statusEffects.find(e => e.stat === ability.effect.stat && e.type === 'debuff');
          if (existing) {
            existing.turnsLeft = ability.effect.turns;
          } else {
            target.statusEffects.push({
              ...ability.effect,
              turnsLeft: ability.effect.turns,
              label: ability.name,
            });
          }
        }
        if (this.checkAllDeaths()) return;
        this.nextTurn();
      });
      return;
    }

    // ── Physical / Magic attack (with heal-on-hit support for Drain Life) ──
    this.doAttack(user, target, ability, () => {
      // Apply on-hit effects (DOT, etc.)
      if (ability.effect && target.hp > 0) {
        const existing = target.statusEffects.find(
          e => e.type === ability.effect.type && e.stat === ability.effect.stat
        );
        if (existing) {
          existing.turnsLeft = ability.effect.turns;
        } else {
          target.statusEffects.push({
            ...ability.effect,
            turnsLeft: ability.effect.turns,
            label: ability.name,
          });
        }
      }
      // Heal-on-hit (e.g. Drain Life)
      if (ability.healAmount && user.hp > 0) {
        const before = user.hp;
        user.hp = Math.min(user.maxHp, user.hp + ability.healAmount);
        const actual = user.hp - before;
        if (actual > 0) {
          const userInfo = this.findSpriteFor(user);
          if (userInfo) this.showFloatingText(userInfo.sprite, `+${actual}`, '#44ff44');
        }
        uiScene.updateHP();
      }
      if (this.checkAllDeaths()) return;
      this.nextTurn();
    });
  }

  doAttack(attacker, defender, ability, callback) {
    const uiScene = this.scene.get('BattleUI');

    // Accuracy
    if (Math.random() * 100 > ability.accuracy) {
      this.sfx.playMiss();
      uiScene.showMessage(`${attacker.name} used ${ability.name}... but missed!`, callback);
      return;
    }

    // Damage calc
    let atkStat = this.getEffectiveAtk(attacker);
    let defStat = this.getEffectiveDef(defender);

    // Charge doubles attack power
    let power = ability.power;
    if (attacker.isCharged && (ability.type === 'physical' || ability.type === 'debuff')) {
      power *= 2;
      attacker.isCharged = false;
      // Remove charged status
      attacker.statusEffects = attacker.statusEffects.filter(e => e.stat !== 'charged');
    }

    const baseDmg = (power * (atkStat / defStat)) * 0.8;
    const randomMod = 0.9 + Math.random() * 0.2;
    const rawDamage = Math.max(1, Math.floor(baseDmg * randomMod));

    // Apply formation DR
    const defGroup = this.party.includes(defender) ? this.party : this.enemies;
    const defIdx = defGroup.indexOf(defender);
    const damage = applyFormationDR(rawDamage, defGroup, defIdx);

    defender.hp = Math.max(0, defender.hp - damage);
    if (ability.type === 'magic') this.sfx.playSpellCast();
    else this.sfx.playAttackHit();

    const defInfo = this.findSpriteFor(defender);
    if (defInfo) {
      this.flashSprite(defInfo.sprite);
      this.showFloatingText(defInfo.sprite, `-${damage}`, '#ff4444');
    }

    let msg = `${attacker.name} used ${ability.name}! (-${damage} HP)`;
    if (defender.isDefending) msg += ' (Guarded!)';
    if (power > ability.power) msg += ' CHARGED!';
    if (ability.effect?.type === 'dot' && defender.hp > 0) msg += ' Poisoned!';
    if (ability.effect?.type === 'debuff' && defender.hp > 0) msg += ' Defense lowered!';

    uiScene.updateHP();
    uiScene.showMessage(msg, callback);
  }

  // ──── Item Usage ────

  executeItem(itemId, user, target) {
    if (this.battleOver) return;

    const item = CONSUMABLES[itemId];
    if (!item) return;

    const uiScene = this.scene.get('BattleUI');
    const inventory = this.registry.get('inventory');

    // Remove one copy from inventory
    const idx = inventory.indexOf(itemId);
    if (idx === -1) return;
    inventory.splice(idx, 1);

    if (item.type === 'heal_hp') {
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + item.amount);
      const actual = target.hp - before;
      this.sfx.playHeal();
      const info = this.findSpriteFor(target);
      if (info && actual > 0) this.showFloatingText(info.sprite, `+${actual}`, '#44ff44');
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} used ${item.name} on ${target.name}! (+${actual} HP)`, () => this.nextTurn());
      return;
    }

    if (item.type === 'heal_mp') {
      const before = target.mp;
      target.mp = Math.min(target.maxMp, target.mp + item.amount);
      const actual = target.mp - before;
      this.sfx.playHeal();
      const info = this.findSpriteFor(target);
      if (info && actual > 0) this.showFloatingText(info.sprite, `+${actual}`, '#4488ff');
      uiScene.updateHP();
      uiScene.showMessage(`${user.name} used ${item.name} on ${target.name}! (+${actual} MP)`, () => this.nextTurn());
      return;
    }

    if (item.type === 'cleanse') {
      const hadEffects = target.statusEffects.length > 0;
      target.statusEffects = [];
      uiScene.updateHP();
      const msg = hadEffects
        ? `${user.name} used ${item.name} on ${target.name}! Status effects cleared!`
        : `${user.name} used ${item.name} on ${target.name}! No effects to clear.`;
      uiScene.showMessage(msg, () => this.nextTurn());
      return;
    }
  }

  // ──── Enemy AI ────

  doEnemyAI(enemy) {
    if (this.battleOver || enemy.hp <= 0) { this.nextTurn(); return; }

    const uiScene = this.scene.get('BattleUI');

    // Boss Phase 2: add new abilities when below 50% HP
    if (enemy.isBoss && !enemy.phase2Active && enemy.hp < enemy.maxHp * 0.5 && enemy.phase2Abilities) {
      enemy.phase2Active = true;
      for (const abKey of enemy.phase2Abilities) {
        enemy.abilities.push(abKey);
      }
      // Update weights: boost phase 2 abilities
      enemy.aiWeights = enemy.abilities.map((_, idx) => {
        if (idx < enemy.abilities.length - enemy.phase2Abilities.length) return 25;
        return 40; // higher weight for phase 2 abilities
      });
      uiScene.showMessage(`${enemy.name}'s power surges!`, () => this.doEnemyAI_pick(enemy));
      return;
    }

    this.doEnemyAI_pick(enemy);
  }

  doEnemyAI_pick(enemy) {
    if (this.battleOver || enemy.hp <= 0) { this.nextTurn(); return; }

    const uiScene = this.scene.get('BattleUI');

    // Weighted random ability selection
    const weights = enemy.aiWeights || enemy.abilities.map(() => 1);
    const totalW = weights.reduce((s, w) => s + w, 0);
    let roll = Math.random() * totalW;
    let chosenIdx = 0;

    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { chosenIdx = i; break; }
    }

    let abilityKey = enemy.abilities[chosenIdx];
    let ability = ABILITIES[abilityKey];
    if (!ability) { this.nextTurn(); return; }

    // Necromancer AI: if raise_dead chosen but no damaged allies, fall back to dark_bolt
    if (ability.target === 'ally_enemy') {
      const damagedAlly = this.enemies.find(e => e !== enemy && e.hp > 0 && e.hp < e.maxHp);
      if (!damagedAlly) {
        abilityKey = 'dark_bolt';
        ability = ABILITIES[abilityKey];
        if (!ability) { this.nextTurn(); return; }
      }
    }

    enemy.mp -= ability.mpCost;

    // ── Defend ──
    if (ability.type === 'defend') {
      enemy.isDefending = true;
      uiScene.showMessage(`${enemy.name} raises a guard!`, () => this.nextTurn());
      return;
    }

    // ── Charge ──
    if (ability.type === 'charge') {
      enemy.isCharged = true;
      if (ability.effect) {
        enemy.statusEffects.push({
          ...ability.effect,
          turnsLeft: ability.effect.turns,
          label: 'Charged',
        });
      }
      uiScene.showMessage(`${enemy.name} builds up power!`, () => this.nextTurn());
      return;
    }

    // ── Heal ally enemy (Necromancer raise_dead) ──
    if (ability.type === 'heal' && ability.target === 'ally_enemy') {
      const damagedAlly = this.enemies.find(e => e !== enemy && e.hp > 0 && e.hp < e.maxHp);
      if (damagedAlly) {
        const before = damagedAlly.hp;
        damagedAlly.hp = Math.min(damagedAlly.maxHp, damagedAlly.hp + ability.healAmount);
        const actual = damagedAlly.hp - before;
        if (actual > 0) {
          const info = this.findSpriteFor(damagedAlly);
          if (info) this.showFloatingText(info.sprite, `+${actual}`, '#44ff44');
        }
        uiScene.updateHP();
        uiScene.showMessage(`${enemy.name} used ${ability.name} on ${damagedAlly.name}! (+${actual} HP)`, () => this.nextTurn());
        return;
      }
    }

    // ── Buff all enemy allies (Necromancer dark_pact, Atikesh undying_will on self) ──
    if (ability.type === 'buff') {
      let targets;
      if (ability.target === 'all_allies_enemy') {
        targets = this.enemies.filter(e => e.hp > 0);
      } else {
        targets = [enemy];
      }
      for (const t of targets) {
        if (ability.effect) {
          const existing = t.statusEffects.find(e => e.stat === ability.effect.stat && e.type === ability.effect.type);
          if (existing) {
            existing.turnsLeft = ability.effect.turns;
          } else {
            t.statusEffects.push({
              ...ability.effect,
              turnsLeft: ability.effect.turns,
              label: ability.name,
            });
          }
        }
      }
      const targetLabel = ability.target === 'all_allies_enemy' ? 'all allies' : enemy.name;
      uiScene.updateHP();
      uiScene.showMessage(`${enemy.name} used ${ability.name} on ${targetLabel}!`, () => this.nextTurn());
      return;
    }

    // ── AoE vs party (all_enemies from enemy perspective hits party) ──
    if (ability.target === 'all_enemies') {
      const livingParty = this.party.filter(m => m.hp > 0);
      if (livingParty.length === 0) { this.checkAllDeaths(); return; }

      let totalDmg = 0;
      const hitNext = (idx) => {
        if (idx >= livingParty.length) {
          // Apply debuff effects to all hit targets
          if (ability.effect) {
            for (const m of livingParty) {
              if (m.hp <= 0) continue;
              const existing = m.statusEffects.find(
                s => s.stat === ability.effect.stat && s.type === ability.effect.type
              );
              if (existing) {
                existing.turnsLeft = ability.effect.turns;
              } else {
                m.statusEffects.push({
                  ...ability.effect,
                  turnsLeft: ability.effect.turns,
                  label: ability.name,
                });
              }
            }
          }
          uiScene.updateHP();
          let msg = `${enemy.name} used ${ability.name}! Hit ${livingParty.length} targets for ${totalDmg} total damage!`;
          if (ability.effect?.type === 'debuff') msg += ' Debuffed!';
          uiScene.showMessage(msg, () => {
            if (this.checkAllDeaths()) return;
            this.nextTurn();
          });
          return;
        }

        const target = livingParty[idx];

        // Accuracy check
        if (Math.random() * 100 > ability.accuracy) {
          hitNext(idx + 1);
          return;
        }

        let atkStat = this.getEffectiveAtk(enemy);
        let defStat = this.getEffectiveDef(target);
        let power = ability.power;
        if (enemy.isCharged && (ability.type === 'physical' || ability.type === 'debuff')) {
          power *= 2;
          if (idx === 0) {
            enemy.isCharged = false;
            enemy.statusEffects = enemy.statusEffects.filter(e => e.stat !== 'charged');
          }
        }
        const baseDmg = (power * (atkStat / defStat)) * 0.8;
        const randomMod = 0.9 + Math.random() * 0.2;
        const rawDamage = Math.max(1, Math.floor(baseDmg * randomMod));
        const targetIdx = this.party.indexOf(target);
        const damage = applyFormationDR(rawDamage, this.party, targetIdx);
        target.hp = Math.max(0, target.hp - damage);
        totalDmg += damage;

        const info = this.findSpriteFor(target);
        if (info) {
          this.flashSprite(info.sprite);
          this.showFloatingText(info.sprite, `-${damage}`, '#ff4444');
        }

        this.time.delayedCall(200, () => hitNext(idx + 1));
      };

      hitNext(0);
      return;
    }

    // Pick target: random alive party member
    const alive = this.party.filter(m => m.hp > 0);
    if (alive.length === 0) { this.checkAllDeaths(); return; }
    const target = alive[Math.floor(Math.random() * alive.length)];

    // ── Debuff with damage ──
    if (ability.type === 'debuff') {
      this.doAttack(enemy, target, ability, () => {
        if (ability.effect && target.hp > 0) {
          const existing = target.statusEffects.find(e => e.stat === ability.effect.stat && e.type === ability.effect.type);
          if (existing) { existing.turnsLeft = ability.effect.turns; }
          else { target.statusEffects.push({ ...ability.effect, turnsLeft: ability.effect.turns, label: ability.name }); }
        }
        if (this.checkAllDeaths()) return;
        this.nextTurn();
      });
      return;
    }

    // ── Regular attack (physical/magic with on-hit effects) ──
    this.doAttack(enemy, target, ability, () => {
      if (ability.effect && target.hp > 0) {
        const existing = target.statusEffects.find(
          e => e.type === ability.effect.type && e.stat === ability.effect.stat
        );
        if (existing) { existing.turnsLeft = ability.effect.turns; }
        else { target.statusEffects.push({ ...ability.effect, turnsLeft: ability.effect.turns, label: ability.name }); }
      }
      // Heal-on-hit for enemies (e.g. Soul Drain, Life Siphon)
      if (ability.healAmount && enemy.hp > 0) {
        const before = enemy.hp;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + ability.healAmount);
        const actual = enemy.hp - before;
        if (actual > 0) {
          const enemyInfo = this.findSpriteFor(enemy);
          if (enemyInfo) this.showFloatingText(enemyInfo.sprite, `+${actual}`, '#44ff44');
        }
        uiScene.updateHP();
      }
      if (this.checkAllDeaths()) return;
      this.nextTurn();
    });
  }

  // ──── Death & Victory ────

  checkAllDeaths() {
    const uiScene = this.scene.get('BattleUI');

    for (const es of this.enemySprites) {
      if (es.character.hp <= 0 && es.sprite.alpha > 0) {
        this.sfx.playEnemyDeath();
        this.tweens.add({ targets: es.sprite, alpha: 0, x: es.sprite.x + 40, y: es.sprite.y - 20, duration: 500 });
      }
    }
    for (const ps of this.partySprites) {
      if (ps.character.hp <= 0 && ps.sprite.alpha > 0) {
        this.tweens.add({ targets: ps.sprite, alpha: 0, y: ps.sprite.y + 30, duration: 500 });
      }
    }

    // Update formation DR overlays when characters fall
    this.updateFormationOverlays();

    // Tutorial: trigger onFirstEnemyKill when the first enemy dies
    if (this.isTutorial && !this.firstKillFired && this.tutorialCallbacks.onFirstEnemyKill) {
      const anyDead = this.enemies.some(e => e.hp <= 0);
      if (anyDead) {
        this.firstKillFired = true;
        this.tutorialCallbacks.onFirstEnemyKill(this);
        return true; // Pause normal flow — tutorial callback resumes via nextTurn()
      }
    }

    // All enemies dead → victory
    if (this.enemies.every(e => e.hp <= 0)) {
      this.battleOver = true;
      this.handleVictory();
      return true;
    }

    // All party dead → defeat
    if (this.party.every(m => m.hp <= 0)) {
      this.battleOver = true;
      this.sfx.playDefeat();
      uiScene.showMessage('Your party has fallen...', () => {
        this.time.delayedCall(600, () => this.onBattleEnd('lose'));
      });
      return true;
    }

    return false;
  }

  handleVictory() {
    this.sfx.playVictoryFanfare();
    const uiScene = this.scene.get('BattleUI');
    const xp = this.xpReward;
    const gold = this.goldReward;

    // Award XP to ALL recruited roster members (shared progression)
    const levelUps = [];
    for (const char of this.fullRoster) {
      if (!char.recruited) continue;
      const result = awardXP(char, xp);
      if (result.leveled) {
        let msg = `${char.name} reached Level ${result.newLevel}!`;
        if (result.newLevel >= 5 && !char.subclass) {
          msg += ' Subclass available!';
        }
        levelUps.push(msg);
      }
    }

    // Award gold
    const currentGold = this.registry.get('gold') || 0;
    this.registry.set('gold', currentGold + gold);

    // Roll loot for each defeated enemy
    const lootDrops = [];
    const inventory = this.registry.get('inventory') || [];
    for (const enemyType of this.enemyTypes) {
      const itemId = rollLoot(enemyType);
      if (itemId) {
        inventory.push(itemId);
        const result = lookupItem(itemId);
        lootDrops.push(result ? result.item.name : itemId);
      }
    }

    // Build victory message
    let victoryMsg = `Victory! +${xp} XP, +${gold} Gold`;
    if (lootDrops.length > 0) {
      victoryMsg += ` | Loot: ${lootDrops.join(', ')}`;
    }

    uiScene.showMessage(victoryMsg, () => {
      if (levelUps.length > 0) {
        this.showLevelUpMessages(levelUps, 0, () => {
          this.time.delayedCall(400, () => this.onBattleEnd('win'));
        });
      } else {
        this.time.delayedCall(400, () => this.onBattleEnd('win'));
      }
    });
  }

  showLevelUpMessages(messages, idx, callback) {
    if (idx >= messages.length) { callback(); return; }
    const uiScene = this.scene.get('BattleUI');
    this.sfx.playLevelUp();
    uiScene.showMessage(`LEVEL UP! ${messages[idx]}`, () => {
      this.showLevelUpMessages(messages, idx + 1, callback);
    });
  }

  // ──── Run ────

  attemptRun() {
    if (this.battleOver) return;
    const uiScene = this.scene.get('BattleUI');

    if (this.isTutorial) {
      uiScene.showMessage("You can't flee!", () => {
        uiScene.startPlayerTurn(this.turnQueue[this.currentTurnIndex].character);
      });
      return;
    }

    const avgPSpd = this.party.reduce((s, m) => s + this.getEffectiveSpd(m), 0) / this.party.length;
    const avgESpd = this.enemies.reduce((s, e) => s + this.getEffectiveSpd(e), 0) / this.enemies.length;
    const chance = 0.4 + (avgPSpd - avgESpd) * 0.04;

    if (Math.random() < Math.max(0.15, Math.min(0.85, chance))) {
      this.battleOver = true;
      uiScene.showMessage('Your party retreats safely!', () => {
        this.time.delayedCall(300, () => this.onBattleEnd('run'));
      });
    } else {
      uiScene.showMessage("Can't escape!", () => this.nextTurn());
    }
  }

  // ──── Mid-Battle Ally ────

  addAllyMidBattle(allyChar) {
    this.party.push(allyChar);

    // Recalculate formation positions for the new party size
    const i = this.party.length - 1;
    const partyPositions = getPartyFormationPositions(this.party.length);

    // Reposition existing party sprites to new formation positions
    this.partySprites.forEach((ps, idx) => {
      const newPos = partyPositions[idx];
      ps.baseX = newPos.x;
      ps.baseY = newPos.y;
      this.tweens.add({ targets: ps.sprite, x: newPos.x, duration: 400, ease: 'Sine.easeInOut' });
    });

    const pos = partyPositions[i];
    const x = pos.x;
    const y = pos.y;
    const partyDepthMap = [10, 14, 14, 18];
    const baseD = partyDepthMap[i] || 10;

    this.add.ellipse(x, y + 54, 96, 28, 0x000000, 0.3).setDepth(baseD - 2);

    const spriteKey = this.getCharSpriteKey(allyChar);
    let sprite;
    if (spriteKey && this.textures.exists(spriteKey)) {
      if (spriteKey === 'metz_walk') {
        sprite = this.add.sprite(x, y, 'metz_walk', 0).setDepth(baseD);
      } else {
        sprite = this.add.image(x, y, spriteKey).setDepth(baseD);
      }
      const targetH = spriteKey === 'metz_walk' ? 147 : 128;
      const scale = targetH / sprite.height;
      sprite.setScale(scale);
      sprite.setOrigin(0.5, 0.5);
    } else {
      sprite = this.add.rectangle(x, y, 76, 100, allyChar.color).setDepth(baseD);
      this.add.rectangle(x, y, 76, 100).setStrokeStyle(1, 0xffffff, 0.25).setDepth(baseD + 1);

      const iconMap = {
        Commander: { color: 0xffcc44 },
        Warrior: { color: 0xbb6622 },
        Ranger: { color: 0x44aa44 },
        Wizard: { color: 0x6644cc },
        Priest: { color: 0xddddaa },
        Farmer: { color: 0x88aa44 },
      };
      const icon = iconMap[allyChar.cls] || iconMap.Warrior;
      this.add.circle(x, y - 40, 8, icon.color, 0.8).setDepth(baseD + 2);
    }

    this.add.text(x, y + 58, allyChar.name, {
      fontSize: '11px', color: '#cccccc',
    }).setOrigin(0.5).setDepth(baseD + 2);

    // Fade in
    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 600, ease: 'Sine.easeIn' });

    this.tweens.add({
      targets: sprite, y: y - 5,
      duration: 900 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    this.partySprites.push({ sprite, character: allyChar, baseX: x, baseY: y });

    // Rebuild the turn queue to include the new ally
    // (They'll appear in next round's turn order)

    // Tell UI to rebuild party panel
    const uiScene = this.scene.get('BattleUI');
    uiScene.rebuildPartyPanel();

    // Show floating text
    this.showFloatingText(sprite, 'Joins the fight!', '#44ff44');
  }

  // ──── Visual Helpers ────

  getCharSpriteKey(character) {
    const spriteMap = {
      metz: 'metz_walk',
      farmer_alan: 'spr_farmer_alan',
      skeleton: 'spr_skeleton',
      dagvar: 'spr_dagvar',
      havrifyn: 'spr_havrifyn',
      zombie: 'spr_zombie',
      dire_wolf: 'spr_dire_wolf',
      plague_rat: 'spr_plague_rat',
      corrupted_treant: 'spr_corrupted_treant',
      bandit_thief: 'spr_bandit_thief',
      bandit_henchman: 'spr_bandit_henchman',
      bandit_chief: 'spr_bandit_chief',
      shadow_fiend: 'spr_shadow_fiend',
      bone_reaper: 'spr_bone_reaper',
    };
    // Exact match first, then match base id (before '_' suffix for enemies)
    if (spriteMap[character.id]) return spriteMap[character.id];
    const baseId = character.id.replace(/_[a-z0-9]{1,4}$/, '').replace(/^tut_/, '');
    return spriteMap[baseId] || null;
  }

  findSpriteFor(character) {
    for (const ps of this.partySprites) { if (ps.character === character) return ps; }
    for (const es of this.enemySprites) { if (es.character === character) return es; }
    return null;
  }

  flashSprite(sprite) {
    if (sprite.fillColor !== undefined) {
      const orig = sprite.fillColor;
      sprite.setFillStyle(0xffffff);
      this.tweens.add({
        targets: sprite, scaleX: 0.85, scaleY: 0.85,
        duration: 80, yoyo: true,
        onComplete: () => sprite.setFillStyle(orig),
      });
    } else {
      sprite.setTint(0xffffff);
      this.tweens.add({
        targets: sprite, scaleX: 0.85, scaleY: 0.85,
        duration: 80, yoyo: true,
        onComplete: () => sprite.clearTint(),
      });
    }
  }

  showFloatingText(sprite, text, color) {
    const ft = this.add.text(sprite.x, sprite.y - 70, text, {
      fontSize: '22px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: ft, y: ft.y - 30, alpha: 0,
      duration: 1000, onComplete: () => ft.destroy(),
    });
  }
}
