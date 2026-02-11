import { ABILITIES } from '../data/abilities.js';
import { getEquipmentBonus } from '../data/characters.js';
import { SUBCLASSES } from '../data/subclasses.js';

// Party management screen — view roster, set active party members
// Metz is always active (cannot be benched). Up to 3 additional companions.

const MAX_ACTIVE = 4; // Metz + 3 companions
const CARD_H = 210;   // card height including button area
const ROW_GAP = 20;   // space between rows
const ROW_STEP = CARD_H + ROW_GAP;  // total vertical step per row
const COLS = 3;
const VISIBLE_TOP = 80;    // top of the scrollable viewport
const VISIBLE_BOTTOM = 575; // bottom of the scrollable viewport
const SCROLL_SPEED = 12;   // pixels per scroll tick (keyboard)

export class PartyScene extends Phaser.Scene {
  constructor() {
    super('Party');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    const roster = this.registry.get('roster');
    this.rosterList = Object.values(roster).filter(c => c.recruited);

    // Dark overlay background (fixed)
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.95).setDepth(0);

    // Title (fixed)
    this.add.text(400, 16, 'PARTY MANAGEMENT', {
      fontSize: '18px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(400, 40, 'Select up to 3 companions. Metz is always active.', {
      fontSize: '11px', color: '#888877',
    }).setOrigin(0.5).setDepth(50);

    // Active count (fixed)
    this.activeCountText = this.add.text(400, 58, '', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);
    this.updateActiveCount();

    // ── Scrollable content container ──
    this.scrollContainer = this.add.container(0, 0).setDepth(1);

    // Calculate content height
    const totalRows = Math.ceil(this.rosterList.length / COLS);
    // Cards are placed starting at y=100 inside the container, each row offset by ROW_STEP
    // The bottom of the last card is approximately: 100 + (totalRows-1)*ROW_STEP + CARD_H
    this.contentHeight = 130 + (totalRows - 1) * ROW_STEP + CARD_H + 20;
    this.scrollY = 0;
    this.maxScroll = Math.max(0, this.contentHeight - (VISIBLE_BOTTOM - VISIBLE_TOP));

    // Draw character cards into the container
    this.cards = [];
    this.rosterList.forEach((char, i) => {
      this.drawCard(char, i);
    });

    // Mask to clip the scrollable area
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, VISIBLE_TOP, 800, VISIBLE_BOTTOM - VISIBLE_TOP);
    const mask = maskShape.createGeometryMask();
    this.scrollContainer.setMask(mask);

    // ── Scroll indicator (fixed) ──
    this.scrollTrack = null;
    this.scrollThumb = null;
    if (this.maxScroll > 0) {
      const trackX = 780;
      const trackTop = VISIBLE_TOP + 10;
      const trackH = VISIBLE_BOTTOM - VISIBLE_TOP - 20;
      this.scrollTrack = this.add.rectangle(trackX, trackTop + trackH / 2, 4, trackH, 0x333333)
        .setDepth(50);
      const thumbH = Math.max(20, (trackH * trackH) / this.contentHeight);
      this.scrollThumb = this.add.rectangle(trackX, trackTop + thumbH / 2, 4, thumbH, 0x886633)
        .setDepth(51);
      this.scrollTrackTop = trackTop;
      this.scrollTrackH = trackH;
      this.scrollThumbH = thumbH;
    }

    // ── Scroll hints (fixed) ──
    if (this.maxScroll > 0) {
      this.scrollHint = this.add.text(400, VISIBLE_BOTTOM + 2, 'Scroll: Mouse Wheel / Arrow Keys', {
        fontSize: '9px', color: '#666655',
      }).setOrigin(0.5, 0).setDepth(50);
    }

    // ── Close button (fixed) ──
    const closeBtn = this.add.rectangle(400, 608, 120, 34, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);

    this.add.text(400, 608, 'CLOSE [P]', {
      fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // ── Input ──
    this.closeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    // Mouse wheel scroll
    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      this.scroll(dy * 0.5);
    });

    // Drag-to-scroll (touch)
    this._dragStartY = 0;
    this._dragLastY = 0;
    this._dragActive = false;
    this.input.on('pointerdown', (pointer) => {
      this._dragStartY = pointer.y;
      this._dragLastY = pointer.y;
      this._dragActive = false;
    });
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      const dy = pointer.y - this._dragStartY;
      if (!this._dragActive && Math.abs(dy) > 5) this._dragActive = true;
      if (this._dragActive) {
        const delta = this._dragLastY - pointer.y;
        this._dragLastY = pointer.y;
        this.scroll(delta);
      }
    });
    this.input.on('pointerup', () => { this._dragActive = false; });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.closeKey) ||
        Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.onClose();
    }

    // Keyboard scrolling (held keys)
    if (this.upKey.isDown || this.wKey.isDown) {
      this.scroll(-SCROLL_SPEED);
    }
    if (this.downKey.isDown || this.sKey.isDown) {
      this.scroll(SCROLL_SPEED);
    }
  }

  scroll(delta) {
    if (this.maxScroll <= 0) return;
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.scrollContainer.y = -this.scrollY;

    // Update scroll thumb position
    if (this.scrollThumb) {
      const pct = this.scrollY / this.maxScroll;
      const range = this.scrollTrackH - this.scrollThumbH;
      this.scrollThumb.y = this.scrollTrackTop + this.scrollThumbH / 2 + pct * range;
    }
  }

  drawCard(char, index) {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    const cx = 160 + col * 240;
    const cy = 130 + row * ROW_STEP;

    const isActive = char.active;
    const isMetz = char.alwaysActive;
    const borderColor = isActive ? 0xccaa44 : 0x444444;
    const bgColor = isActive ? 0x1a1a2e : 0x111118;

    // Card background
    const card = this.add.rectangle(cx, cy + 50, 210, CARD_H, bgColor)
      .setStrokeStyle(2, borderColor);
    this.scrollContainer.add(card);

    // Active badge
    const badge = this.add.text(cx + 90, cy - 42, isActive ? 'ACTIVE' : '', {
      fontSize: '8px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.scrollContainer.add(badge);

    // Character color avatar
    const avatar = this.add.rectangle(cx - 70, cy + 10, 36, 46, char.color)
      .setStrokeStyle(1, 0xffffff, 0.3);
    this.scrollContainer.add(avatar);

    // Name
    const nameText = this.add.text(cx - 44, cy - 40, char.name, {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    });
    this.scrollContainer.add(nameText);

    // Class + Subclass + Level
    let classLabel = char.cls;
    if (char.subclass) {
      const classSubs = SUBCLASSES[char.cls];
      if (classSubs && classSubs[char.subclass]) {
        classLabel += ` — ${classSubs[char.subclass].name}`;
      }
    }
    const clsText = this.add.text(cx - 44, cy - 22, `${classLabel}  Level ${char.level}`, {
      fontSize: '10px', color: '#aaaaaa',
    });
    this.scrollContainer.add(clsText);

    // Stats with equipment bonuses
    const atkBonus = getEquipmentBonus(char, 'atk');
    const defBonus = getEquipmentBonus(char, 'def');
    const spdBonus = getEquipmentBonus(char, 'spd');
    const atkStr = atkBonus ? `ATK ${char.atk} (+${atkBonus})` : `ATK ${char.baseAtk}`;
    const defStr = defBonus ? `DEF ${char.def} (+${defBonus})` : `DEF ${char.baseDef}`;
    const spdStr = spdBonus ? `SPD ${char.spd} (+${spdBonus})` : `SPD ${char.baseSpd}`;
    const stats = [
      `HP  ${char.hp}/${char.maxHp}`,
      `MP  ${char.mp}/${char.maxMp}`,
      `${atkStr}  ${defStr}  ${spdStr}`,
      `XP  ${char.xp}/${char.xpToNext}`,
    ];
    stats.forEach((line, si) => {
      const st = this.add.text(cx - 44, cy - 4 + si * 14, line, {
        fontSize: '9px', color: '#bbbbbb',
      });
      this.scrollContainer.add(st);
    });

    // Abilities list
    const abTitle = this.add.text(cx - 90, cy + 62, 'Abilities:', {
      fontSize: '9px', color: '#aa8855', fontStyle: 'bold',
    });
    this.scrollContainer.add(abTitle);

    char.abilities.forEach((key, ai) => {
      const ab = ABILITIES[key];
      if (!ab) return;
      const costStr = ab.mpCost > 0 ? ` (${ab.mpCost} MP)` : '';
      const abText = this.add.text(cx - 82, cy + 76 + ai * 12, `${ai + 1}. ${ab.name}${costStr}`, {
        fontSize: '8px', color: '#cccccc',
      });
      this.scrollContainer.add(abText);
    });

    // Toggle button (not for Metz)
    if (!isMetz) {
      const btnLabel = isActive ? 'BENCH' : 'ACTIVATE';
      const btnColor = isActive ? 0x443322 : 0x224433;

      const btn = this.add.rectangle(cx, cy + 138, 120, 24, btnColor)
        .setStrokeStyle(1, 0x666666)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btn.setFillStyle(isActive ? 0x554433 : 0x335544))
        .on('pointerout', () => btn.setFillStyle(btnColor))
        .on('pointerdown', () => {
          this.toggleActive(char);
        });
      this.scrollContainer.add(btn);

      const btnText = this.add.text(cx, cy + 138, btnLabel, {
        fontSize: '10px', color: '#dddddd', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add(btnText);
    } else {
      const alwaysText = this.add.text(cx, cy + 138, '(Always Active)', {
        fontSize: '9px', color: '#666655',
      }).setOrigin(0.5);
      this.scrollContainer.add(alwaysText);
    }

    this.cards.push({ card, badge, char });
  }

  toggleActive(char) {
    const activeCount = this.rosterList.filter(c => c.active).length;

    if (char.active) {
      char.active = false;
    } else {
      if (activeCount >= MAX_ACTIVE) {
        this.showToast(`Party full! Bench someone first. (Max ${MAX_ACTIVE})`);
        return;
      }
      char.active = true;
    }

    // Redraw the entire scene
    this.scene.restart({ onClose: this.onClose });
  }

  updateActiveCount() {
    const count = this.rosterList.filter(c => c.active).length;
    this.activeCountText.setText(`Active: ${count}/${MAX_ACTIVE}`);
  }

  showToast(msg) {
    const toast = this.add.text(400, 560, msg, {
      fontSize: '11px', color: '#ff8844',
      backgroundColor: '#00000099', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: toast, alpha: 0, delay: 2000, duration: 500,
      onComplete: () => toast.destroy(),
    });
  }
}
