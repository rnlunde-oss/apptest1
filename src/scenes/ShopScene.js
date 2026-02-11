// Campfire Shop — Buy and Sell equipment
// Two columns: BUY (from SHOP_INVENTORY) and SELL (from player inventory)

import { EQUIPMENT, SHOP_INVENTORY, CONSUMABLES, CONSUMABLE_SHOP_INVENTORY, lookupItem } from '../data/equipment.js';

const RARITY_COLORS = {
  Common: '#aaaaaa',
  Uncommon: '#44bb44',
  Rare: '#4488ff',
};

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

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    this.inventory = this.registry.get('inventory');
    this.buyScrollY = 0;
    this.sellScrollY = 0;
    this.buyMaxScroll = 0;
    this.sellMaxScroll = 0;

    // Background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.97).setDepth(0);

    // Title
    this.add.text(400, 16, 'CAMPFIRE SHOP', {
      fontSize: '16px', color: '#ffaa44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Gold display
    this.goldText = this.add.text(400, 40, '', {
      fontSize: '12px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);
    this.updateGoldDisplay();

    // Column headers
    this.add.text(200, 58, 'BUY', {
      fontSize: '13px', color: '#44cc44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    this.add.text(600, 58, 'SELL', {
      fontSize: '13px', color: '#cc8844', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Divider
    this.add.rectangle(400, 340, 2, 520, 0x444444).setDepth(2);

    // Scrollable containers
    this.buyContainer = this.add.container(0, 0).setDepth(1);
    this.sellContainer = this.add.container(0, 0).setDepth(1);

    // Masks
    const buyMask = this.make.graphics({ x: 0, y: 0 });
    buyMask.fillStyle(0xffffff);
    buyMask.fillRect(10, 72, 380, 520);
    this.buyContainer.setMask(buyMask.createGeometryMask());

    const sellMask = this.make.graphics({ x: 0, y: 0 });
    sellMask.fillStyle(0xffffff);
    sellMask.fillRect(410, 72, 380, 520);
    this.sellContainer.setMask(sellMask.createGeometryMask());

    this.drawBuyColumn();
    this.drawSellColumn();

    // Close button
    const closeBtn = this.add.rectangle(400, 610, 120, 30, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);
    this.add.text(400, 610, 'CLOSE [ESC]', {
      fontSize: '11px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // Input
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    // Scroll
    this.input.on('wheel', (pointer, _gos, _dx, dy) => {
      if (pointer.x < 400) {
        this.scrollBuy(dy * 0.5);
      } else {
        this.scrollSell(dy * 0.5);
      }
    });

    // Drag-to-scroll (touch) — column-aware
    this._dragStartY = 0;
    this._dragLastY = 0;
    this._dragActive = false;
    this._dragColumn = null; // 'buy' or 'sell'
    this.input.on('pointerdown', (pointer) => {
      this._dragStartY = pointer.y;
      this._dragLastY = pointer.y;
      this._dragActive = false;
      this._dragColumn = pointer.x < 400 ? 'buy' : 'sell';
    });
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown) return;
      const dy = pointer.y - this._dragStartY;
      if (!this._dragActive && Math.abs(dy) > 5) this._dragActive = true;
      if (this._dragActive) {
        const delta = this._dragLastY - pointer.y;
        this._dragLastY = pointer.y;
        if (this._dragColumn === 'buy') {
          this.scrollBuy(delta);
        } else {
          this.scrollSell(delta);
        }
      }
    });
    this.input.on('pointerup', () => { this._dragActive = false; });
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.onClose();
    }
  }

  // ──── Buy Column ────

  drawBuyColumn() {
    this.buyContainer.removeAll(true);
    this.buyScrollY = 0;

    const rowH = 50;
    let y = 80;

    for (const itemId of SHOP_INVENTORY) {
      const item = EQUIPMENT[itemId];
      if (!item) continue;

      const rowBg = this.add.rectangle(200, y + 16, 360, rowH - 4, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.buyContainer.add(rowBg);

      const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
      const nameText = this.add.text(30, y + 2, item.name, {
        fontSize: '9px', color: rarityColor, fontStyle: 'bold',
      });
      this.buyContainer.add(nameText);

      // Slot
      const slotText = this.add.text(30, y + 14, `[${SLOT_LABELS[item.slot]}]`, {
        fontSize: '7px', color: '#666666',
      });
      this.buyContainer.add(slotText);

      // Stats
      const statParts = [];
      for (const s of ['atk', 'def', 'spd', 'hp', 'mp']) {
        const val = item.stats[s];
        if (val && val !== 0) statParts.push(`${s.toUpperCase()}${val > 0 ? '+' : ''}${val}`);
      }
      const statText = this.add.text(30, y + 26, statParts.join(' '), {
        fontSize: '7px', color: '#aaaaaa',
      });
      this.buyContainer.add(statText);

      // Price
      const priceText = this.add.text(300, y + 4, `${item.buyPrice}g`, {
        fontSize: '10px', color: '#ffcc44', fontStyle: 'bold',
      });
      this.buyContainer.add(priceText);

      // Buy button
      const gold = this.registry.get('gold') || 0;
      const canAfford = gold >= item.buyPrice;
      const btnColor = canAfford ? 0x224433 : 0x222222;

      const buyBtn = this.add.rectangle(340, y + 24, 50, 18, btnColor)
        .setStrokeStyle(1, canAfford ? 0x44aa66 : 0x444444)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => { if (canAfford) buyBtn.setFillStyle(0x335544); })
        .on('pointerout', () => buyBtn.setFillStyle(btnColor))
        .on('pointerdown', () => {
          if (!canAfford) return;
          this.buyItem(item);
        });
      this.buyContainer.add(buyBtn);

      const buyText = this.add.text(340, y + 24, 'Buy', {
        fontSize: '8px', color: canAfford ? '#aaffaa' : '#666666', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.buyContainer.add(buyText);

      y += rowH;
    }

    // ── Consumables section ──
    y += 8;
    const conHeader = this.add.text(200, y + 8, '--- CONSUMABLES ---', {
      fontSize: '9px', color: '#aa8855', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.buyContainer.add(conHeader);
    y += 24;

    for (const itemId of CONSUMABLE_SHOP_INVENTORY) {
      const item = CONSUMABLES[itemId];
      if (!item) continue;

      const rowBg = this.add.rectangle(200, y + 16, 360, rowH - 4, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.buyContainer.add(rowBg);

      const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
      const nameText = this.add.text(30, y + 2, item.name, {
        fontSize: '9px', color: rarityColor, fontStyle: 'bold',
      });
      this.buyContainer.add(nameText);

      const tagText = this.add.text(30, y + 14, '[Consumable]', {
        fontSize: '7px', color: '#aa8855',
      });
      this.buyContainer.add(tagText);

      const descText = this.add.text(30, y + 26, item.desc, {
        fontSize: '7px', color: '#aaaaaa',
      });
      this.buyContainer.add(descText);

      const priceText = this.add.text(300, y + 4, `${item.buyPrice}g`, {
        fontSize: '10px', color: '#ffcc44', fontStyle: 'bold',
      });
      this.buyContainer.add(priceText);

      const gold = this.registry.get('gold') || 0;
      const canAfford = gold >= item.buyPrice;
      const btnColor = canAfford ? 0x224433 : 0x222222;

      const buyBtn = this.add.rectangle(340, y + 24, 50, 18, btnColor)
        .setStrokeStyle(1, canAfford ? 0x44aa66 : 0x444444)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => { if (canAfford) buyBtn.setFillStyle(0x335544); })
        .on('pointerout', () => buyBtn.setFillStyle(btnColor))
        .on('pointerdown', () => {
          if (!canAfford) return;
          this.buyItem(item);
        });
      this.buyContainer.add(buyBtn);

      const buyText = this.add.text(340, y + 24, 'Buy', {
        fontSize: '8px', color: canAfford ? '#aaffaa' : '#666666', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.buyContainer.add(buyText);

      y += rowH;
    }

    this.buyMaxScroll = Math.max(0, y - 560);
  }

  // ──── Sell Column ────

  drawSellColumn() {
    this.sellContainer.removeAll(true);
    this.sellScrollY = 0;

    // Count items
    const itemCounts = {};
    for (const id of this.inventory) {
      itemCounts[id] = (itemCounts[id] || 0) + 1;
    }

    const uniqueItems = Object.keys(itemCounts);
    const rowH = 50;
    let y = 80;

    if (uniqueItems.length === 0) {
      const emptyText = this.add.text(600, 120, 'No items to sell', {
        fontSize: '10px', color: '#555555',
      }).setOrigin(0.5);
      this.sellContainer.add(emptyText);
      return;
    }

    for (const itemId of uniqueItems) {
      const result = lookupItem(itemId);
      if (!result) continue;
      const { item, category } = result;
      const count = itemCounts[itemId];

      const rowBg = this.add.rectangle(600, y + 16, 360, rowH - 4, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.sellContainer.add(rowBg);

      const rarityColor = RARITY_COLORS[item.rarity] || '#aaaaaa';
      const nameStr = count > 1 ? `${item.name} x${count}` : item.name;
      const nameText = this.add.text(430, y + 2, nameStr, {
        fontSize: '9px', color: rarityColor, fontStyle: 'bold',
      });
      this.sellContainer.add(nameText);

      if (category === 'consumable') {
        // Consumable: show tag + description
        const tagText = this.add.text(430, y + 14, '[Consumable]', {
          fontSize: '7px', color: '#aa8855',
        });
        this.sellContainer.add(tagText);
        const descText = this.add.text(430, y + 26, item.desc, {
          fontSize: '7px', color: '#aaaaaa',
        });
        this.sellContainer.add(descText);
      } else {
        // Equipment: show slot + stats
        const slotText = this.add.text(430, y + 14, `[${SLOT_LABELS[item.slot]}]`, {
          fontSize: '7px', color: '#666666',
        });
        this.sellContainer.add(slotText);
        const statParts = [];
        for (const s of ['atk', 'def', 'spd', 'hp', 'mp']) {
          const val = item.stats[s];
          if (val && val !== 0) statParts.push(`${s.toUpperCase()}${val > 0 ? '+' : ''}${val}`);
        }
        const statText = this.add.text(430, y + 26, statParts.join(' '), {
          fontSize: '7px', color: '#aaaaaa',
        });
        this.sellContainer.add(statText);
      }

      // Sell price
      const priceText = this.add.text(700, y + 4, `${item.sellPrice}g`, {
        fontSize: '10px', color: '#cc8844', fontStyle: 'bold',
      });
      this.sellContainer.add(priceText);

      // Sell button
      const sellBtn = this.add.rectangle(740, y + 24, 50, 18, 0x443322)
        .setStrokeStyle(1, 0xaa8844)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => sellBtn.setFillStyle(0x554433))
        .on('pointerout', () => sellBtn.setFillStyle(0x443322))
        .on('pointerdown', () => {
          this.sellItem(itemId);
        });
      this.sellContainer.add(sellBtn);

      const sellBtnText = this.add.text(740, y + 24, 'Sell', {
        fontSize: '8px', color: '#ffddaa', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.sellContainer.add(sellBtnText);

      y += rowH;
    }

    this.sellMaxScroll = Math.max(0, y - 560);
  }

  // ──── Actions ────

  buyItem(item) {
    const gold = this.registry.get('gold') || 0;
    if (gold < item.buyPrice) return;

    this.registry.get('soundManager').playPurchase();
    this.registry.set('gold', gold - item.buyPrice);
    this.inventory.push(item.id);

    this.showToast(`Bought ${item.name} for ${item.buyPrice}g`);
    this.refreshAll();
  }

  sellItem(itemId) {
    const result = lookupItem(itemId);
    if (!result) return;
    const item = result.item;

    const idx = this.inventory.indexOf(itemId);
    if (idx === -1) return;

    this.registry.get('soundManager').playPurchase();
    this.inventory.splice(idx, 1);
    const gold = this.registry.get('gold') || 0;
    this.registry.set('gold', gold + item.sellPrice);

    this.showToast(`Sold ${item.name} for ${item.sellPrice}g`);
    this.refreshAll();
  }

  refreshAll() {
    this.updateGoldDisplay();
    this.drawBuyColumn();
    this.drawSellColumn();
  }

  updateGoldDisplay() {
    const gold = this.registry.get('gold') || 0;
    this.goldText.setText(`Gold: ${gold}`);
  }

  scrollBuy(delta) {
    if (this.buyMaxScroll <= 0) return;
    this.buyScrollY = Phaser.Math.Clamp(this.buyScrollY + delta, 0, this.buyMaxScroll);
    this.buyContainer.y = -this.buyScrollY;
  }

  scrollSell(delta) {
    if (this.sellMaxScroll <= 0) return;
    this.sellScrollY = Phaser.Math.Clamp(this.sellScrollY + delta, 0, this.sellMaxScroll);
    this.sellContainer.y = -this.sellScrollY;
  }

  showToast(msg) {
    const toast = this.add.text(400, 560, msg, {
      fontSize: '11px', color: '#ffcc44',
      backgroundColor: '#00000099', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: toast, alpha: 0, delay: 1500, duration: 500,
      onComplete: () => toast.destroy(),
    });
  }
}
