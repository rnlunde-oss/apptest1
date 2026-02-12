// Inventory & Equipment management screen
// Left panel: paper-doll equipment slots around character avatar
// Right panel: scrollable shared inventory list
// Top: character selector tabs

import { EQUIPMENT, EQUIPMENT_SLOTS, CONSUMABLES, lookupItem } from '../data/equipment.js';
import { equipItem, unequipItem, getEquipmentBonus } from '../data/characters.js';
import { CharacterPortrait } from '../ui/CharacterPortrait.js';

const SLOT_LABELS = {
  helmet: 'Helmet',
  shoulderpads: 'Shoulders',
  gloves: 'Gloves',
  breastplate: 'Chest',
  greaves: 'Greaves',
  boots: 'Boots',
  belt: 'Belt',
  rightHand: 'R.Hand',
  leftHand: 'L.Hand',
};

// Paper-doll layout positions (relative to avatar center at 200, 300)
const SLOT_POSITIONS = {
  helmet:       { x: 200, y: 170 },
  shoulderpads: { x: 120, y: 220 },
  breastplate:  { x: 200, y: 260 },
  gloves:       { x: 280, y: 220 },
  belt:         { x: 200, y: 320 },
  greaves:      { x: 200, y: 370 },
  boots:        { x: 200, y: 420 },
  rightHand:    { x: 120, y: 310 },
  leftHand:     { x: 280, y: 310 },
};

const RARITY_COLORS = {
  Common: '#aaaaaa',
  Uncommon: '#44bb44',
  Rare: '#4488ff',
};

export class InventoryScene extends Phaser.Scene {
  constructor() {
    super('Inventory');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    this.roster = this.registry.get('roster');
    this.inventory = this.registry.get('inventory');
    this.rosterList = Object.values(this.roster).filter(c => c.recruited);
    this.selectedCharIdx = 0;
    this.modalOpen = false;
    this.portrait = new CharacterPortrait(64, 80);

    // Background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.97).setDepth(0);

    // Title
    this.add.text(400, 14, 'EQUIPMENT & INVENTORY', {
      fontSize: '16px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Gold display
    this.goldText = this.add.text(700, 14, '', {
      fontSize: '12px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);
    this.updateGoldDisplay();

    // Character tabs
    this.drawCharTabs();

    // Content containers
    this.leftContainer = this.add.container(0, 0).setDepth(1);
    this.rightContainer = this.add.container(0, 0).setDepth(1);

    // Right panel mask for scrolling
    this.scrollY = 0;
    this.maxScroll = 0;

    this.drawEquipment();
    this.drawInventoryPanel();
    this.drawStatSummary();

    // Close button
    const closeBtn = this.add.rectangle(400, 610, 120, 30, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);
    this.add.text(400, 610, 'CLOSE [I]', {
      fontSize: '11px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // Input
    this.closeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Mouse wheel scroll for inventory panel
    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      if (!this.modalOpen) this.scrollInventory(dy * 0.5);
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
      if (!pointer.isDown || this.modalOpen) return;
      const dy = pointer.y - this._dragStartY;
      if (!this._dragActive && Math.abs(dy) > 5) this._dragActive = true;
      if (this._dragActive) {
        const delta = this._dragLastY - pointer.y;
        this._dragLastY = pointer.y;
        this.scrollInventory(delta);
      }
    });
    this.input.on('pointerup', () => { this._dragActive = false; });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.closeKey) ||
        Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.modalOpen) {
        this.closeModal();
      } else {
        this.onClose();
      }
    }
  }

  getSelectedChar() {
    return this.rosterList[this.selectedCharIdx];
  }

  // ──── Character Tabs ────

  drawCharTabs() {
    if (this.tabContainer) this.tabContainer.destroy();
    this.tabContainer = this.add.container(0, 0).setDepth(10);

    const startX = 60;
    this.rosterList.forEach((char, i) => {
      const x = startX + i * 95;
      const isSelected = i === this.selectedCharIdx;
      const bg = this.add.rectangle(x, 42, 88, 22, isSelected ? 0x332211 : 0x1a1a28)
        .setStrokeStyle(1, isSelected ? 0xccaa44 : 0x444444)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.selectedCharIdx = i;
          this.refresh();
        });
      this.tabContainer.add(bg);

      const label = this.add.text(x, 42, char.name, {
        fontSize: '9px', color: isSelected ? '#ffddaa' : '#888888', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tabContainer.add(label);
    });
  }

  // ──── Left Panel — Equipment Slots ────

  drawEquipment() {
    this.leftContainer.removeAll(true);
    const char = this.getSelectedChar();

    // Character portrait
    if (char.id === 'metz' && this.textures.exists('metz_portrait_base')) {
      const avatarImage = this.add.image(200, 260, 'metz_portrait_base');
      const targetH = 120;
      avatarImage.setScale(targetH / avatarImage.height);
      this.leftContainer.add(avatarImage);
    } else {
      const portraitKey = `portrait_${char.id}`;
      this.portrait.renderToTexture(this, portraitKey, char, 'inventory');
      const avatarImage = this.add.image(200, 260, portraitKey);
      this.leftContainer.add(avatarImage);
    }

    // Class label
    const clsLabel = this.add.text(200, 230, char.cls, {
      fontSize: '8px', color: '#888888',
    }).setOrigin(0.5);
    this.leftContainer.add(clsLabel);

    // Name + level
    const nameLabel = this.add.text(200, 135, `${char.name} Lv.${char.level}`, {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.leftContainer.add(nameLabel);

    // Draw slots
    for (const slot of EQUIPMENT_SLOTS) {
      const pos = SLOT_POSITIONS[slot];
      const itemId = char.equipment[slot];
      const item = itemId ? EQUIPMENT[itemId] : null;

      const slotW = 72;
      const slotH = 28;

      // Slot background
      const slotBg = this.add.rectangle(pos.x, pos.y, slotW, slotH, item ? 0x222233 : 0x111118)
        .setStrokeStyle(1, item ? 0x886633 : 0x444444)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => slotBg.setFillStyle(item ? 0x333344 : 0x1a1a28))
        .on('pointerout', () => slotBg.setFillStyle(item ? 0x222233 : 0x111118))
        .on('pointerdown', () => {
          if (item) {
            this.openSlotModal(slot);
          } else {
            this.openSlotModal(slot);
          }
        });
      this.leftContainer.add(slotBg);

      // Slot label or item name
      if (item) {
        const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
        const nameText = this.add.text(pos.x, pos.y - 4, item.name, {
          fontSize: '7px', color: rarityColor, fontStyle: 'bold',
        }).setOrigin(0.5);
        this.leftContainer.add(nameText);

        // Stat hint
        const statParts = [];
        for (const s of ['atk', 'def', 'spd']) {
          let val = item.stats[s] || 0;
          if (item.classBonus && item.classBonus[char.cls]) {
            val += item.classBonus[char.cls][s] || 0;
          }
          if (val !== 0) statParts.push(`${s.toUpperCase()} ${val > 0 ? '+' : ''}${val}`);
        }
        if (statParts.length > 0) {
          const statText = this.add.text(pos.x, pos.y + 7, statParts.join(' '), {
            fontSize: '6px', color: '#aaaaaa',
          }).setOrigin(0.5);
          this.leftContainer.add(statText);
        }
      } else {
        const label = this.add.text(pos.x, pos.y, SLOT_LABELS[slot], {
          fontSize: '7px', color: '#555555',
        }).setOrigin(0.5);
        this.leftContainer.add(label);
      }
    }
  }

  // ──── Right Panel — Inventory List ────

  drawInventoryPanel() {
    this.rightContainer.removeAll(true);
    this.scrollY = 0;

    // Panel header
    const header = this.add.text(565, 65, 'SHARED INVENTORY', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.rightContainer.add(header);

    // Scrollable list container
    this.invListContainer = this.add.container(0, 0);
    this.rightContainer.add(this.invListContainer);

    // Count items and separate equipment vs consumables
    const equipCounts = {};
    const consumCounts = {};
    for (const id of this.inventory) {
      const result = lookupItem(id);
      if (!result) continue;
      if (result.category === 'consumable') {
        consumCounts[id] = (consumCounts[id] || 0) + 1;
      } else {
        equipCounts[id] = (equipCounts[id] || 0) + 1;
      }
    }

    const equipItems = Object.keys(equipCounts);
    const consumItems = Object.keys(consumCounts);
    const startY = 85;
    const rowH = 38;
    let rowIdx = 0;

    // ── Equipment section ──
    equipItems.forEach((itemId) => {
      const item = EQUIPMENT[itemId];
      if (!item) return;
      const count = equipCounts[itemId];
      const y = startY + rowIdx * rowH;

      const rowBg = this.add.rectangle(565, y, 310, rowH - 4, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.invListContainer.add(rowBg);

      const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
      const nameStr = count > 1 ? `${item.name} x${count}` : item.name;
      const nameText = this.add.text(420, y - 8, nameStr, {
        fontSize: '9px', color: rarityColor, fontStyle: 'bold',
      });
      this.invListContainer.add(nameText);

      // Slot type
      const slotLabel = this.add.text(420, y + 4, `[${SLOT_LABELS[item.slot]}]`, {
        fontSize: '7px', color: '#666666',
      });
      this.invListContainer.add(slotLabel);

      // Stats summary
      const statParts = [];
      for (const s of ['atk', 'def', 'spd', 'hp', 'mp']) {
        const val = item.stats[s];
        if (val && val !== 0) statParts.push(`${s.toUpperCase()}${val > 0 ? '+' : ''}${val}`);
      }
      const statText = this.add.text(560, y - 8, statParts.join(' '), {
        fontSize: '7px', color: '#aaaaaa',
      });
      this.invListContainer.add(statText);

      // Class bonus indicator
      const char = this.getSelectedChar();
      if (item.classBonus && item.classBonus[char.cls]) {
        const bonusText = this.add.text(560, y + 4, `+Bonus for ${char.cls}`, {
          fontSize: '7px', color: '#44cc44',
        });
        this.invListContainer.add(bonusText);
      }

      rowIdx++;
    });

    // ── Consumables section ──
    if (consumItems.length > 0) {
      const sepY = startY + rowIdx * rowH;
      const sepText = this.add.text(565, sepY, '--- Consumables ---', {
        fontSize: '9px', color: '#aa8855', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.invListContainer.add(sepText);
      rowIdx++;

      consumItems.forEach((itemId) => {
        const item = CONSUMABLES[itemId];
        if (!item) return;
        const count = consumCounts[itemId];
        const y = startY + rowIdx * rowH;

        const rowBg = this.add.rectangle(565, y, 310, rowH - 4, 0x151520)
          .setStrokeStyle(1, 0x333333);
        this.invListContainer.add(rowBg);

        const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
        const nameStr = count > 1 ? `${item.name} x${count}` : item.name;
        const nameText = this.add.text(420, y - 8, nameStr, {
          fontSize: '9px', color: rarityColor, fontStyle: 'bold',
        });
        this.invListContainer.add(nameText);

        const descText = this.add.text(420, y + 4, item.desc, {
          fontSize: '7px', color: '#888888',
        });
        this.invListContainer.add(descText);

        rowIdx++;
      });
    }

    const totalRows = rowIdx;

    // Calculate scroll bounds
    const contentH = totalRows * rowH + 20;
    const viewH = 520;
    this.maxScroll = Math.max(0, contentH - viewH);

    // Mask for inventory list
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(410, 75, 320, viewH);
    const mask = maskShape.createGeometryMask();
    this.invListContainer.setMask(mask);

    if (equipItems.length === 0 && consumItems.length === 0) {
      const emptyText = this.add.text(565, 120, 'No items', {
        fontSize: '10px', color: '#555555',
      }).setOrigin(0.5);
      this.invListContainer.add(emptyText);
    }
  }

  scrollInventory(delta) {
    if (this.maxScroll <= 0) return;
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, this.maxScroll);
    this.invListContainer.y = -this.scrollY;
  }

  // ──── Stat Summary ────

  drawStatSummary() {
    if (this.statContainer) this.statContainer.destroy();
    this.statContainer = this.add.container(0, 0).setDepth(5);

    const char = this.getSelectedChar();
    const y = 480;

    // Background
    const bg = this.add.rectangle(200, y + 30, 340, 80, 0x111118)
      .setStrokeStyle(1, 0x444444);
    this.statContainer.add(bg);

    const titleText = this.add.text(200, y, 'STATS', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.statContainer.add(titleText);

    const stats = ['atk', 'def', 'spd'];
    stats.forEach((stat, i) => {
      const base = stat === 'atk' ? char.baseAtk : stat === 'def' ? char.baseDef : char.baseSpd;
      const bonus = getEquipmentBonus(char, stat);
      const total = base + bonus;
      const bonusStr = bonus !== 0 ? ` (+${bonus})` : '';
      const label = this.add.text(60, y + 16 + i * 16, `${stat.toUpperCase()} ${total}${bonusStr}`, {
        fontSize: '10px', color: bonus > 0 ? '#44cc44' : '#bbbbbb',
      });
      this.statContainer.add(label);
    });

    // HP/MP with equipment bonuses
    const hpBonus = getEquipmentBonus(char, 'hp');
    const mpBonus = getEquipmentBonus(char, 'mp');
    const hpStr = `HP ${char.hp}/${char.maxHp}${hpBonus ? ` (+${hpBonus})` : ''}`;
    const mpStr = `MP ${char.mp}/${char.maxMp}${mpBonus ? ` (+${mpBonus})` : ''}`;

    const hpText = this.add.text(220, y + 16, hpStr, {
      fontSize: '10px', color: hpBonus > 0 ? '#44cc44' : '#bbbbbb',
    });
    this.statContainer.add(hpText);

    const mpText = this.add.text(220, y + 32, mpStr, {
      fontSize: '10px', color: mpBonus > 0 ? '#44cc44' : '#bbbbbb',
    });
    this.statContainer.add(mpText);
  }

  // ──── Slot Modal ────

  openSlotModal(slot) {
    if (this.modalOpen) return;
    this.modalOpen = true;

    const char = this.getSelectedChar();

    // Darken background
    this.modalContainer = this.add.container(0, 0).setDepth(100);

    const overlay = this.add.rectangle(400, 320, 800, 640, 0x000000, 0.7)
      .setInteractive(); // block clicks through
    this.modalContainer.add(overlay);

    // Modal box
    const modalW = 420;
    const modalH = 400;
    const mx = 400;
    const my = 300;

    const modalBg = this.add.rectangle(mx, my, modalW, modalH, 0x111122)
      .setStrokeStyle(2, 0xccaa44);
    this.modalContainer.add(modalBg);

    // Title
    const slotLabel = SLOT_LABELS[slot];
    const titleText = this.add.text(mx, my - modalH / 2 + 18, `${slotLabel} — ${char.name}`, {
      fontSize: '13px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add(titleText);

    // Currently equipped
    const currentId = char.equipment[slot];
    const currentItem = currentId ? EQUIPMENT[currentId] : null;

    let contentY = my - modalH / 2 + 45;

    if (currentItem) {
      const curLabel = this.add.text(mx - modalW / 2 + 20, contentY, 'Equipped:', {
        fontSize: '9px', color: '#888888',
      });
      this.modalContainer.add(curLabel);

      const curName = this.add.text(mx - modalW / 2 + 80, contentY, currentItem.name, {
        fontSize: '9px', color: RARITY_COLORS[currentItem.rarity] || '#aaaaaa', fontStyle: 'bold',
      });
      this.modalContainer.add(curName);

      // Unequip button
      const unBtn = this.add.rectangle(mx + modalW / 2 - 50, contentY + 5, 70, 18, 0x443322)
        .setStrokeStyle(1, 0x886633)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => unBtn.setFillStyle(0x554433))
        .on('pointerout', () => unBtn.setFillStyle(0x443322))
        .on('pointerdown', () => {
          this.registry.get('soundManager').playButtonClick();
          unequipItem(char, slot, this.inventory);
          this.closeModal();
          this.refresh();
        });
      this.modalContainer.add(unBtn);

      const unText = this.add.text(mx + modalW / 2 - 50, contentY + 5, 'Unequip', {
        fontSize: '8px', color: '#ddccaa',
      }).setOrigin(0.5);
      this.modalContainer.add(unText);

      contentY += 28;
    }

    // Divider
    const divider = this.add.rectangle(mx, contentY + 2, modalW - 40, 1, 0x444444);
    this.modalContainer.add(divider);
    contentY += 12;

    // Available items header
    const availLabel = this.add.text(mx - modalW / 2 + 20, contentY, 'Available Items:', {
      fontSize: '9px', color: '#888888',
    });
    this.modalContainer.add(availLabel);
    contentY += 18;

    // Filter inventory for items that fit this slot
    const compatible = [];
    const seen = {};
    for (let i = 0; i < this.inventory.length; i++) {
      const id = this.inventory[i];
      const item = EQUIPMENT[id];
      if (!item || item.slot !== slot) continue;
      if (!seen[id]) {
        seen[id] = { item, count: 0 };
        compatible.push(seen[id]);
      }
      seen[id].count++;
    }

    if (compatible.length === 0) {
      const noItems = this.add.text(mx, contentY + 20, 'No compatible items in inventory', {
        fontSize: '10px', color: '#555555',
      }).setOrigin(0.5);
      this.modalContainer.add(noItems);
    }

    // Scrollable item list in modal
    const listContainer = this.add.container(0, 0);
    this.modalContainer.add(listContainer);

    compatible.forEach((entry, i) => {
      const { item, count } = entry;
      const iy = contentY + i * 50;

      const rowBg = this.add.rectangle(mx, iy + 16, modalW - 30, 44, 0x1a1a2e)
        .setStrokeStyle(1, 0x333344);
      listContainer.add(rowBg);

      const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
      const nameStr = count > 1 ? `${item.name} x${count}` : item.name;
      const nameText = this.add.text(mx - modalW / 2 + 30, iy + 4, nameStr, {
        fontSize: '10px', color: rarityColor, fontStyle: 'bold',
      });
      listContainer.add(nameText);

      // Stats
      const statParts = [];
      for (const s of ['atk', 'def', 'spd', 'hp', 'mp']) {
        let val = item.stats[s] || 0;
        if (val !== 0) statParts.push(`${s.toUpperCase()}${val > 0 ? '+' : ''}${val}`);
      }
      const statText = this.add.text(mx - modalW / 2 + 30, iy + 18, statParts.join('  '), {
        fontSize: '8px', color: '#aaaaaa',
      });
      listContainer.add(statText);

      // Class bonus
      if (item.classBonus && item.classBonus[char.cls]) {
        const bonusParts = [];
        for (const [s, v] of Object.entries(item.classBonus[char.cls])) {
          bonusParts.push(`${s.toUpperCase()}+${v}`);
        }
        const bonusText = this.add.text(mx + 40, iy + 18, `Class: ${bonusParts.join(' ')}`, {
          fontSize: '8px', color: '#44cc44',
        });
        listContainer.add(bonusText);
      }

      // Equip button
      const eqBtn = this.add.rectangle(mx + modalW / 2 - 50, iy + 14, 60, 22, 0x224433)
        .setStrokeStyle(1, 0x44aa66)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => eqBtn.setFillStyle(0x335544))
        .on('pointerout', () => eqBtn.setFillStyle(0x224433))
        .on('pointerdown', () => {
          this.registry.get('soundManager').playButtonClick();
          equipItem(char, item.id, this.inventory);
          this.closeModal();
          this.refresh();
        });
      listContainer.add(eqBtn);

      const eqText = this.add.text(mx + modalW / 2 - 50, iy + 14, 'Equip', {
        fontSize: '9px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5);
      listContainer.add(eqText);
    });

    // Close modal button
    const closeBtn = this.add.rectangle(mx, my + modalH / 2 - 20, 80, 22, 0x333344)
      .setStrokeStyle(1, 0x666666)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.closeModal());
    this.modalContainer.add(closeBtn);

    const closeText = this.add.text(mx, my + modalH / 2 - 20, 'Cancel', {
      fontSize: '9px', color: '#ddccaa',
    }).setOrigin(0.5);
    this.modalContainer.add(closeText);
  }

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = null;
    }
    this.modalOpen = false;
  }

  // ──── Refresh ────

  refresh() {
    this.drawCharTabs();
    this.drawEquipment();
    this.drawInventoryPanel();
    this.drawStatSummary();
    this.updateGoldDisplay();
  }

  updateGoldDisplay() {
    const gold = this.registry.get('gold') || 0;
    this.goldText.setText(`Gold: ${gold}`);
  }
}
