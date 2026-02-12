import { ABILITIES } from '../data/abilities.js';
import { getEquipmentBonus } from '../data/characters.js';
import { SUBCLASSES } from '../data/subclasses.js';
import { getPositionLabel } from '../utils/formation.js';

// Party management screen — formation ordering + bench management
// Metz can be reordered but not benched (alwaysActive).

const MAX_ACTIVE = 4;
const VISIBLE_TOP = 70;
const VISIBLE_BOTTOM = 575;
const SCROLL_SPEED = 12;

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

    // Ensure partyOrder exists and is synced
    this.partyOrder = [...(this.registry.get('partyOrder') || [])];
    this.syncPartyOrder();

    // Dark overlay background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.95).setDepth(0);

    // Title
    this.add.text(400, 14, 'PARTY FORMATION', {
      fontSize: '18px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(400, 36, 'Reorder active members for battle formation. Front takes full damage, rear is protected.', {
      fontSize: '10px', color: '#888877',
    }).setOrigin(0.5).setDepth(50);

    // Active count
    this.activeCountText = this.add.text(400, 52, '', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Scrollable container
    this.scrollContainer = this.add.container(0, 0).setDepth(1);

    this.drawFormation();

    // Mask
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, VISIBLE_TOP, 800, VISIBLE_BOTTOM - VISIBLE_TOP);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Scroll setup
    this.scrollY = 0;
    this.updateContentHeight();

    // Scroll indicator
    this.scrollTrack = null;
    this.scrollThumb = null;
    this.updateScrollBar();

    // Close button
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

    // Input
    this.closeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);

    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      this.scroll(dy * 0.5);
    });

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
    if (this.upKey.isDown || this.wKey.isDown) this.scroll(-SCROLL_SPEED);
    if (this.downKey.isDown || this.sKey.isDown) this.scroll(SCROLL_SPEED);
  }

  scroll(delta) {
    if (this.maxScroll <= 0) return;
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.scrollContainer.y = -this.scrollY;
    if (this.scrollThumb) {
      const pct = this.scrollY / this.maxScroll;
      const range = this.scrollTrackH - this.scrollThumbH;
      this.scrollThumb.y = this.scrollTrackTop + this.scrollThumbH / 2 + pct * range;
    }
  }

  updateContentHeight() {
    const activeCount = this.getActiveMembers().length;
    const benchCount = this.getBenchMembers().length;
    // Active rows: each 80px, bench section header + rows: each 62px
    this.contentHeight = 100 + activeCount * 80 + 50 + benchCount * 62 + 40;
    this.maxScroll = Math.max(0, this.contentHeight - (VISIBLE_BOTTOM - VISIBLE_TOP));
  }

  updateScrollBar() {
    if (this.scrollTrack) this.scrollTrack.destroy();
    if (this.scrollThumb) this.scrollThumb.destroy();
    this.scrollTrack = null;
    this.scrollThumb = null;

    if (this.maxScroll > 0) {
      const trackX = 780;
      const trackTop = VISIBLE_TOP + 10;
      const trackH = VISIBLE_BOTTOM - VISIBLE_TOP - 20;
      this.scrollTrack = this.add.rectangle(trackX, trackTop + trackH / 2, 4, trackH, 0x333333).setDepth(50);
      const thumbH = Math.max(20, (trackH * trackH) / this.contentHeight);
      this.scrollThumb = this.add.rectangle(trackX, trackTop + thumbH / 2, 4, thumbH, 0x886633).setDepth(51);
      this.scrollTrackTop = trackTop;
      this.scrollTrackH = trackH;
      this.scrollThumbH = thumbH;
    }
  }

  // ── Party order management ──

  syncPartyOrder() {
    const roster = this.registry.get('roster');
    // Remove IDs that are no longer recruited or active
    this.partyOrder = this.partyOrder.filter(id => {
      const c = roster[id];
      return c && c.recruited && c.active;
    });
    // Add active members not yet in partyOrder
    for (const c of this.rosterList) {
      if (c.active && !this.partyOrder.includes(c.id)) {
        this.partyOrder.push(c.id);
      }
    }
    this.registry.set('partyOrder', [...this.partyOrder]);
  }

  getActiveMembers() {
    const roster = this.registry.get('roster');
    return this.partyOrder
      .map(id => roster[id])
      .filter(c => c && c.active);
  }

  getBenchMembers() {
    return this.rosterList.filter(c => !c.active);
  }

  savePartyOrder() {
    this.registry.set('partyOrder', [...this.partyOrder]);
  }

  // ── Drawing ──

  drawFormation() {
    // Clear scroll container
    this.scrollContainer.removeAll(true);

    const active = this.getActiveMembers();
    const bench = this.getBenchMembers();

    this.updateActiveCount(active.length);

    // ── Active Formation Section ──
    const sectionTitle = this.add.text(400, 80, 'ACTIVE FORMATION', {
      fontSize: '13px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(sectionTitle);

    const drLabels = ['0% DR (Tank)', '25% DR (if Front alive)', '25% DR (if Front alive)', '90/50/25% DR'];

    active.forEach((char, i) => {
      const yy = 110 + i * 80;
      this.drawActiveRow(char, i, yy, active.length);
    });

    // ── Bench Section ──
    const benchY = 110 + active.length * 80 + 20;

    if (bench.length > 0) {
      const benchTitle = this.add.text(400, benchY, 'BENCH', {
        fontSize: '13px', color: '#666655', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add(benchTitle);

      bench.forEach((char, i) => {
        const yy = benchY + 30 + i * 62;
        this.drawBenchRow(char, yy);
      });
    }

    this.updateContentHeight();
    this.updateScrollBar();
  }

  drawActiveRow(char, index, yy, totalActive) {
    const posLabel = getPositionLabel(index, totalActive);
    const isMetz = char.alwaysActive;

    // Row background
    const rowBg = this.add.rectangle(400, yy + 24, 720, 70, 0x1a1a2e)
      .setStrokeStyle(2, 0xccaa44, 0.6);
    this.scrollContainer.add(rowBg);

    // Position number + label
    const posText = this.add.text(56, yy + 4, `${index + 1}`, {
      fontSize: '22px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(posText);

    const posLabelText = this.add.text(56, yy + 22, posLabel, {
      fontSize: '8px', color: '#998855',
    }).setOrigin(0.5);
    this.scrollContainer.add(posLabelText);

    // DR info
    const drInfo = this.getDRDescription(index, totalActive);
    const drText = this.add.text(56, yy + 34, drInfo, {
      fontSize: '7px', color: index === 0 ? '#cc6644' : '#44aa88',
    }).setOrigin(0.5);
    this.scrollContainer.add(drText);

    // Character avatar
    const avatar = this.add.rectangle(100, yy + 20, 30, 38, char.color)
      .setStrokeStyle(1, 0xffffff, 0.3);
    this.scrollContainer.add(avatar);

    // Name + class
    const nameText = this.add.text(124, yy + 4, char.name, {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    });
    this.scrollContainer.add(nameText);

    let classLabel = char.cls;
    if (char.subclass) {
      const classSubs = SUBCLASSES[char.cls];
      if (classSubs && classSubs[char.subclass]) {
        classLabel += ` - ${classSubs[char.subclass].name}`;
      }
    }
    const clsText = this.add.text(124, yy + 20, `${classLabel}  Lv.${char.level}`, {
      fontSize: '9px', color: '#aaaaaa',
    });
    this.scrollContainer.add(clsText);

    // Stats
    const atkBonus = getEquipmentBonus(char, 'atk');
    const defBonus = getEquipmentBonus(char, 'def');
    const spdBonus = getEquipmentBonus(char, 'spd');
    const atkStr = atkBonus ? `ATK ${char.atk}(+${atkBonus})` : `ATK ${char.baseAtk}`;
    const defStr = defBonus ? `DEF ${char.def}(+${defBonus})` : `DEF ${char.baseDef}`;
    const spdStr = spdBonus ? `SPD ${char.spd}(+${spdBonus})` : `SPD ${char.baseSpd}`;
    const statText = this.add.text(124, yy + 35, `HP ${char.hp}/${char.maxHp}  MP ${char.mp}/${char.maxMp}  ${atkStr}  ${defStr}  ${spdStr}`, {
      fontSize: '8px', color: '#999999',
    });
    this.scrollContainer.add(statText);

    // Abilities (compact)
    const abStr = char.abilities
      .map(k => ABILITIES[k]?.name)
      .filter(Boolean)
      .join(', ');
    if (abStr) {
      const abText = this.add.text(124, yy + 48, abStr, {
        fontSize: '7px', color: '#777766',
      });
      this.scrollContainer.add(abText);
    }

    // Up/Down reorder buttons (right side)
    const btnX = 700;

    if (index > 0) {
      const upBtn = this.add.rectangle(btnX, yy + 12, 40, 22, 0x334433)
        .setStrokeStyle(1, 0x55aa55, 0.6)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => upBtn.setFillStyle(0x445544))
        .on('pointerout', () => upBtn.setFillStyle(0x334433))
        .on('pointerdown', () => this.moveUp(index));
      this.scrollContainer.add(upBtn);
      const upLabel = this.add.text(btnX, yy + 12, 'UP', {
        fontSize: '9px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add(upLabel);
    }

    if (index < totalActive - 1) {
      const downBtn = this.add.rectangle(btnX, yy + 38, 40, 22, 0x334433)
        .setStrokeStyle(1, 0x55aa55, 0.6)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => downBtn.setFillStyle(0x445544))
        .on('pointerout', () => downBtn.setFillStyle(0x334433))
        .on('pointerdown', () => this.moveDown(index));
      this.scrollContainer.add(downBtn);
      const downLabel = this.add.text(btnX, yy + 38, 'DOWN', {
        fontSize: '9px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add(downLabel);
    }

    // Bench button (not for alwaysActive characters)
    if (!isMetz) {
      const benchBtn = this.add.rectangle(640, yy + 24, 56, 22, 0x443322)
        .setStrokeStyle(1, 0xaa6633, 0.6)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => benchBtn.setFillStyle(0x554433))
        .on('pointerout', () => benchBtn.setFillStyle(0x443322))
        .on('pointerdown', () => this.benchChar(char));
      this.scrollContainer.add(benchBtn);
      const benchLabel = this.add.text(640, yy + 24, 'BENCH', {
        fontSize: '8px', color: '#ffaa66', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.scrollContainer.add(benchLabel);
    }
  }

  drawBenchRow(char, yy) {
    // Row background
    const rowBg = this.add.rectangle(400, yy + 18, 720, 52, 0x111118)
      .setStrokeStyle(1, 0x444444, 0.5);
    this.scrollContainer.add(rowBg);

    // Avatar
    const avatar = this.add.rectangle(56, yy + 14, 26, 32, char.color)
      .setStrokeStyle(1, 0xffffff, 0.2);
    this.scrollContainer.add(avatar);

    // Name + class
    const nameText = this.add.text(80, yy + 4, char.name, {
      fontSize: '12px', color: '#999999', fontStyle: 'bold',
    });
    this.scrollContainer.add(nameText);

    let classLabel = char.cls;
    if (char.subclass) {
      const classSubs = SUBCLASSES[char.cls];
      if (classSubs && classSubs[char.subclass]) {
        classLabel += ` - ${classSubs[char.subclass].name}`;
      }
    }
    const clsText = this.add.text(80, yy + 19, `${classLabel}  Lv.${char.level}`, {
      fontSize: '9px', color: '#777777',
    });
    this.scrollContainer.add(clsText);

    // Stats
    const statText = this.add.text(80, yy + 32, `HP ${char.hp}/${char.maxHp}  MP ${char.mp}/${char.maxMp}  ATK ${char.baseAtk}  DEF ${char.baseDef}  SPD ${char.baseSpd}`, {
      fontSize: '7px', color: '#666666',
    });
    this.scrollContainer.add(statText);

    // Activate button
    const activeCount = this.getActiveMembers().length;
    const canActivate = activeCount < MAX_ACTIVE;
    const btnColor = canActivate ? 0x224433 : 0x222222;
    const actBtn = this.add.rectangle(690, yy + 18, 70, 26, btnColor)
      .setStrokeStyle(1, canActivate ? 0x44aa66 : 0x444444, 0.6)
      .setInteractive({ useHandCursor: canActivate })
      .on('pointerover', () => { if (canActivate) actBtn.setFillStyle(0x335544); })
      .on('pointerout', () => actBtn.setFillStyle(btnColor))
      .on('pointerdown', () => {
        if (canActivate) this.activateChar(char);
        else this.showToast(`Party full! (Max ${MAX_ACTIVE})`);
      });
    this.scrollContainer.add(actBtn);
    const actLabel = this.add.text(690, yy + 18, 'ACTIVATE', {
      fontSize: '9px', color: canActivate ? '#aaffaa' : '#555555', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.scrollContainer.add(actLabel);
  }

  getDRDescription(index, groupSize) {
    if (index === 0) return '0% DR';
    if (groupSize <= 2 && index === 1) return '25% DR';
    if (index === 1 || index === 2) return '25% DR';
    if (index === 3) return 'Up to 90% DR';
    return '0% DR';
  }

  // ── Actions ──

  moveUp(index) {
    if (index <= 0) return;
    this.registry.get('soundManager').playButtonClick();
    const temp = this.partyOrder[index];
    this.partyOrder[index] = this.partyOrder[index - 1];
    this.partyOrder[index - 1] = temp;
    this.savePartyOrder();
    this.drawFormation();
  }

  moveDown(index) {
    if (index >= this.partyOrder.length - 1) return;
    this.registry.get('soundManager').playButtonClick();
    const temp = this.partyOrder[index];
    this.partyOrder[index] = this.partyOrder[index + 1];
    this.partyOrder[index + 1] = temp;
    this.savePartyOrder();
    this.drawFormation();
  }

  benchChar(char) {
    this.registry.get('soundManager').playButtonClick();
    char.active = false;
    this.partyOrder = this.partyOrder.filter(id => id !== char.id);
    this.savePartyOrder();
    this.drawFormation();
  }

  activateChar(char) {
    this.registry.get('soundManager').playButtonClick();
    const activeCount = this.getActiveMembers().length;
    if (activeCount >= MAX_ACTIVE) {
      this.showToast(`Party full! Bench someone first. (Max ${MAX_ACTIVE})`);
      return;
    }
    char.active = true;
    this.partyOrder.push(char.id);
    this.savePartyOrder();
    this.drawFormation();
  }

  updateActiveCount(count) {
    if (count === undefined) count = this.getActiveMembers().length;
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
