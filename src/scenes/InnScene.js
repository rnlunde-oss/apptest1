// Frontier Inn — Rest to restore HP/MP for gold

import { CONSUMABLES, CONSUMABLE_SHOP_INVENTORY } from '../data/equipment.js';

export class InnScene extends Phaser.Scene {
  constructor() {
    super('Inn');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    const roster = this.registry.get('roster');
    this.recruited = Object.values(roster).filter(c => c.recruited);
    this.inventory = this.registry.get('inventory');

    // Background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.97).setDepth(0);

    // Title
    this.add.text(400, 16, 'FRONTIER INN', {
      fontSize: '16px', color: '#ffaa44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Gold display
    this.goldText = this.add.text(400, 40, '', {
      fontSize: '12px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);
    this.updateGoldDisplay();

    // Character list (shifted left)
    this.drawCharacters();

    // Consumable shop (right side)
    this.drawConsumableShop();

    // Rest All button
    const cost = 15 * this.recruited.length;
    this.costText = this.add.text(250, 540, `Rest All — ${cost}g`, {
      fontSize: '13px', color: '#ffddaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    const restBtn = this.add.rectangle(250, 540, 180, 30, 0x335522)
      .setStrokeStyle(2, 0x66aa44)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => restBtn.setFillStyle(0x446633))
      .on('pointerout', () => restBtn.setFillStyle(0x335522))
      .on('pointerdown', () => this.restAll())
      .setDepth(50);

    // Close button
    const closeBtn = this.add.rectangle(400, 590, 120, 30, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);
    this.add.text(400, 590, 'CLOSE [ESC]', {
      fontSize: '11px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // Input
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.escKey) ||
        Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.onClose();
    }
  }

  drawCharacters() {
    if (this.charContainer) this.charContainer.destroy();
    this.charContainer = this.add.container(0, 0).setDepth(1);

    let y = 70;
    const rowH = 60;

    for (const member of this.recruited) {
      const rowBg = this.add.rectangle(250, y + 22, 420, rowH - 4, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.charContainer.add(rowBg);

      // Color swatch
      const swatch = this.add.rectangle(60, y + 22, 20, 20, member.color)
        .setStrokeStyle(1, 0xffffff, 0.5);
      this.charContainer.add(swatch);

      // Name + class
      const hpRatio = member.hp / member.maxHp;
      const nameColor = hpRatio >= 1 ? '#44cc44' : hpRatio > 0.3 ? '#cccc44' : '#cc4444';
      const nameText = this.add.text(80, y + 6, `${member.name}  (${member.cls})`, {
        fontSize: '11px', color: nameColor, fontStyle: 'bold',
      });
      this.charContainer.add(nameText);

      // HP bar
      const hpBarBg = this.add.rectangle(80, y + 26, 200, 8, 0x222222).setOrigin(0, 0.5);
      this.charContainer.add(hpBarBg);
      const hpBarW = Math.max(0, (member.hp / member.maxHp) * 200);
      const hpBarColor = hpRatio > 0.5 ? 0x44aa44 : hpRatio > 0.25 ? 0xaaaa44 : 0xaa4444;
      const hpBar = this.add.rectangle(80, y + 26, hpBarW, 8, hpBarColor).setOrigin(0, 0.5);
      this.charContainer.add(hpBar);
      const hpLabel = this.add.text(285, y + 26, `HP ${member.hp}/${member.maxHp}`, {
        fontSize: '8px', color: '#aaaaaa',
      }).setOrigin(0, 0.5);
      this.charContainer.add(hpLabel);

      // MP bar
      const mpBarBg = this.add.rectangle(80, y + 38, 200, 8, 0x222222).setOrigin(0, 0.5);
      this.charContainer.add(mpBarBg);
      const mpBarW = member.maxMp > 0 ? Math.max(0, (member.mp / member.maxMp) * 200) : 200;
      const mpBar = this.add.rectangle(80, y + 38, mpBarW, 8, 0x4444aa).setOrigin(0, 0.5);
      this.charContainer.add(mpBar);
      const mpLabel = this.add.text(285, y + 38, `MP ${member.mp}/${member.maxMp}`, {
        fontSize: '8px', color: '#aaaaaa',
      }).setOrigin(0, 0.5);
      this.charContainer.add(mpLabel);

      y += rowH;
    }
  }

  restAll() {
    const cost = 15 * this.recruited.length;
    const gold = this.registry.get('gold') || 0;

    if (gold < cost) {
      this.showToast('Not enough gold!');
      return;
    }

    this.registry.set('gold', gold - cost);

    for (const member of this.recruited) {
      member.hp = member.maxHp;
      member.mp = member.maxMp;
      member.statusEffects = [];
    }

    this.updateGoldDisplay();
    this.drawCharacters();
    this.drawConsumableShop();
    this.showToast(`Your party rests... fully restored! (-${cost}g)`);
  }

  drawConsumableShop() {
    if (this.shopContainer) this.shopContainer.destroy();
    this.shopContainer = this.add.container(0, 0).setDepth(1);

    // Panel background
    const panelBg = this.add.rectangle(660, 300, 240, 460, 0x111118)
      .setStrokeStyle(1, 0x886633);
    this.shopContainer.add(panelBg);

    const title = this.add.text(660, 78, 'SUPPLIES', {
      fontSize: '12px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.shopContainer.add(title);

    let y = 100;
    const rowH = 70;

    for (const itemId of CONSUMABLE_SHOP_INVENTORY) {
      const item = CONSUMABLES[itemId];
      if (!item) continue;

      const rowBg = this.add.rectangle(660, y + 26, 220, rowH - 6, 0x151520)
        .setStrokeStyle(1, 0x333333);
      this.shopContainer.add(rowBg);

      const nameText = this.add.text(558, y + 6, item.name, {
        fontSize: '10px', color: '#ddccaa', fontStyle: 'bold',
      });
      this.shopContainer.add(nameText);

      const descText = this.add.text(558, y + 20, item.desc, {
        fontSize: '7px', color: '#888888',
      });
      this.shopContainer.add(descText);

      const priceText = this.add.text(558, y + 34, `${item.buyPrice}g`, {
        fontSize: '9px', color: '#ffcc44', fontStyle: 'bold',
      });
      this.shopContainer.add(priceText);

      const gold = this.registry.get('gold') || 0;
      const canAfford = gold >= item.buyPrice;
      const btnColor = canAfford ? 0x224433 : 0x222222;

      const buyBtn = this.add.rectangle(730, y + 34, 50, 18, btnColor)
        .setStrokeStyle(1, canAfford ? 0x44aa66 : 0x444444)
        .setInteractive({ useHandCursor: canAfford })
        .on('pointerover', () => { if (canAfford) buyBtn.setFillStyle(0x335544); })
        .on('pointerout', () => buyBtn.setFillStyle(btnColor))
        .on('pointerdown', () => {
          if (!canAfford) return;
          this.buyConsumable(item);
        });
      this.shopContainer.add(buyBtn);

      const buyText = this.add.text(730, y + 34, 'Buy', {
        fontSize: '8px', color: canAfford ? '#aaffaa' : '#666666', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.shopContainer.add(buyText);

      y += rowH;
    }
  }

  buyConsumable(item) {
    const gold = this.registry.get('gold') || 0;
    if (gold < item.buyPrice) return;

    this.registry.set('gold', gold - item.buyPrice);
    this.inventory.push(item.id);

    this.updateGoldDisplay();
    this.drawConsumableShop();
    this.showToast(`Bought ${item.name} for ${item.buyPrice}g`);
  }

  updateGoldDisplay() {
    const gold = this.registry.get('gold') || 0;
    this.goldText.setText(`Gold: ${gold}`);
  }

  showToast(msg) {
    const toast = this.add.text(400, 500, msg, {
      fontSize: '11px', color: '#ffcc44',
      backgroundColor: '#00000099', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: toast, alpha: 0, delay: 1500, duration: 500,
      onComplete: () => toast.destroy(),
    });
  }
}
