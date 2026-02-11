import { ABILITIES } from '../data/abilities.js';
import { CONSUMABLES } from '../data/equipment.js';

export class BattleUIScene extends Phaser.Scene {
  constructor() {
    super('BattleUI');
  }

  init(data) {
    this.battleScene = data.battleScene;
    this.party = data.party;
    this.enemies = data.enemies;
    this.inventory = data.inventory;
    this.activeCharacter = null;
    this.menuVisible = false;
    this.returnToMenu = null;
  }

  create() {
    this.sfx = this.registry.get('soundManager');
    this.drawTurnOrderBar();
    this.drawPartyPanel();
    this.drawEnemyPanel();
    this.createAbilityMenu();
    this.createTargetMenu();

    const enemyNames = [...new Set(this.enemies.map(e => e.name))];
    const label = enemyNames.length === 1 && this.enemies.length > 1
      ? `${this.enemies.length} ${enemyNames[0]}s`
      : enemyNames.join(' and ');

    this.showMessage(`${label} emerged from the cursed ground!`, () => {
      this.battleScene.buildTurnQueue();
    });
  }

  // ──── Turn Order Bar (top center) ────

  drawTurnOrderBar() {
    this.turnOrderContainer = this.add.container(200, 4).setDepth(80);
    this.turnOrderContainer.add(
      this.add.rectangle(200, 14, 400, 24, 0x000000, 0.7)
        .setStrokeStyle(1, 0x555555)
    );
    this.turnOrderContainer.add(
      this.add.text(6, 4, 'TURN ORDER:', { fontSize: '9px', color: '#888888', fontStyle: 'bold' })
    );
    this.turnOrderIcons = [];
  }

  updateTurnOrder() {
    // Clear old icons
    for (const icon of this.turnOrderIcons) { icon.bg.destroy(); icon.txt.destroy(); }
    this.turnOrderIcons = [];

    const queue = this.battleScene.turnQueue;
    const currentIdx = this.battleScene.currentTurnIndex;

    queue.forEach((turn, i) => {
      if (turn.character.hp <= 0) return;
      const xOff = 90 + i * 38;
      const isActive = (i === currentIdx);
      const color = turn.side === 'party' ? 0x224466 : 0x442222;
      const borderColor = isActive ? 0xffcc00 : 0x555555;

      const bg = this.add.rectangle(xOff, 14, 34, 18, color)
        .setStrokeStyle(isActive ? 2 : 1, borderColor);
      const txt = this.add.text(xOff, 14, turn.character.name.slice(0, 5), {
        fontSize: '8px', color: isActive ? '#ffcc00' : '#cccccc',
        fontStyle: isActive ? 'bold' : 'normal',
      }).setOrigin(0.5);

      this.turnOrderContainer.add([bg, txt]);
      this.turnOrderIcons.push({ bg, txt });
    });
  }

  highlightTurn(turn) {
    this.updateTurnOrder();
  }

  // ──── Party Panel (bottom-left) ────

  drawPartyPanel() {
    this.partyPanel = this.add.container(0, 490).setDepth(50);
    this.partyPanel.add(
      this.add.rectangle(155, 70, 305, 140, 0x000000, 0.85)
        .setStrokeStyle(1, 0x886633)
    );
    this.partyPanel.add(
      this.add.text(8, 4, 'PARTY', { fontSize: '9px', color: '#aa8855', fontStyle: 'bold' })
    );

    this.partyBars = [];

    this.party.forEach((member, i) => {
      const y = 18 + i * 34;
      const el = {};

      this.partyPanel.add(
        this.add.rectangle(14, y + 12, 14, 22, member.color)
          .setStrokeStyle(1, 0xffffff, 0.3)
      );

      el.nameText = this.add.text(26, y, `${member.name}`, {
        fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      });
      this.partyPanel.add(el.nameText);

      el.clsText = this.add.text(26 + el.nameText.width + 4, y + 2, `${member.cls} Lv.${member.level}`, {
        fontSize: '8px', color: '#888888',
      });
      this.partyPanel.add(el.clsText);

      // HP
      this.partyPanel.add(this.add.text(26, y + 14, 'HP', { fontSize: '8px', color: '#cc4444' }));
      this.partyPanel.add(this.add.rectangle(115, y + 17, 140, 7, 0x333333).setStrokeStyle(1, 0x444444));
      el.hpBar = this.add.rectangle(46 + 70 * (member.hp / member.maxHp), y + 17,
        140 * (member.hp / member.maxHp), 5, this.getHPColor(member.hp / member.maxHp));
      this.partyPanel.add(el.hpBar);
      el.hpText = this.add.text(190, y + 12, `${member.hp}/${member.maxHp}`, { fontSize: '8px', color: '#bbbbbb' });
      this.partyPanel.add(el.hpText);

      // MP
      this.partyPanel.add(this.add.text(26, y + 22, 'MP', { fontSize: '8px', color: '#4488cc' }));
      this.partyPanel.add(this.add.rectangle(115, y + 25, 140, 5, 0x222233).setStrokeStyle(1, 0x333344));
      const mpRatio = member.maxMp > 0 ? member.mp / member.maxMp : 0;
      el.mpBar = this.add.rectangle(46 + 70 * mpRatio, y + 25, 140 * mpRatio, 3, 0x4488cc);
      this.partyPanel.add(el.mpBar);
      el.mpText = this.add.text(190, y + 20, `${member.mp}/${member.maxMp}`, { fontSize: '8px', color: '#8899aa' });
      this.partyPanel.add(el.mpText);

      // Status effect icons
      el.statusText = this.add.text(240, y + 6, '', { fontSize: '7px', color: '#ccaa44' });
      this.partyPanel.add(el.statusText);

      // Turn arrow
      el.turnArrow = this.add.text(3, y + 8, '\u25b6', { fontSize: '10px', color: '#ffcc00' });
      el.turnArrow.setVisible(false);
      this.partyPanel.add(el.turnArrow);

      this.partyBars.push({ member, el });
    });
  }

  // ──── Enemy Panel (top-right) ────

  drawEnemyPanel() {
    this.enemyPanel = this.add.container(490, 30).setDepth(50);
    const h = 20 + this.enemies.length * 26;
    this.enemyPanel.add(
      this.add.rectangle(155, h / 2, 300, h, 0x000000, 0.8)
        .setStrokeStyle(1, 0x663333)
    );
    this.enemyPanel.add(
      this.add.text(10, 4, 'ENEMIES', { fontSize: '9px', color: '#cc6655', fontStyle: 'bold' })
    );

    this.enemyBars = [];

    this.enemies.forEach((enemy, i) => {
      const y = 18 + i * 24;
      const el = {};

      this.enemyPanel.add(
        this.add.rectangle(14, y + 8, 10, 14, enemy.color)
          .setStrokeStyle(1, 0xff4444, 0.2)
      );
      el.nameText = this.add.text(24, y, enemy.name, {
        fontSize: '10px', color: '#ffcccc', fontStyle: 'bold',
      });
      this.enemyPanel.add(el.nameText);

      this.enemyPanel.add(this.add.rectangle(170, y + 10, 130, 6, 0x333333).setStrokeStyle(1, 0x444444));
      el.hpBar = this.add.rectangle(106 + 65 * (enemy.hp / enemy.maxHp), y + 10,
        130 * (enemy.hp / enemy.maxHp), 4, this.getHPColor(enemy.hp / enemy.maxHp));
      this.enemyPanel.add(el.hpBar);
      el.hpText = this.add.text(240, y + 4, `${enemy.hp}/${enemy.maxHp}`, { fontSize: '8px', color: '#bbbbbb' });
      this.enemyPanel.add(el.hpText);

      el.statusText = this.add.text(24, y + 12, '', { fontSize: '7px', color: '#aa44cc' });
      this.enemyPanel.add(el.statusText);

      this.enemyBars.push({ enemy, el });
    });
  }

  // ──── Ability Menu ────

  createAbilityMenu() {
    this.abilityContainer = this.add.container(320, 490).setDepth(60);
    this.abilityContainer.setVisible(false);

    this.abilityMenuBg = this.add.rectangle(140, 72, 290, 148, 0x111122, 0.95)
      .setStrokeStyle(2, 0x886633);
    this.abilityContainer.add(this.abilityMenuBg);

    this.abilityTitle = this.add.text(140, 4, 'ACTIONS', {
      fontSize: '10px', color: '#ffcc66', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.abilityContainer.add(this.abilityTitle);

    this.abilityButtons = [];

    // Items button (left of RUN)
    this.itemsBtnBg = this.add.rectangle(95, 130, 100, 22, 0x332244, 0.8)
      .setStrokeStyle(1, 0x554488)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.itemsBtnBg.setFillStyle(0x443366))
      .on('pointerout', () => this.itemsBtnBg.setFillStyle(0x332244, 0.8))
      .on('pointerdown', () => { if (this.menuVisible) this.showItemMenu(this.activeCharacter); });
    this.abilityContainer.add(this.itemsBtnBg);
    this.itemsBtnText = this.add.text(95, 130, 'Items [5]', {
      fontSize: '9px', color: '#bb99ff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.abilityContainer.add(this.itemsBtnText);

    // Run button (right of Items)
    const runBtn = this.add.rectangle(195, 130, 90, 22, 0x442222, 0.8)
      .setStrokeStyle(1, 0x664444)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => runBtn.setFillStyle(0x663333))
      .on('pointerout', () => runBtn.setFillStyle(0x442222, 0.8))
      .on('pointerdown', () => this.onRun());
    this.abilityContainer.add(runBtn);
    this.abilityContainer.add(
      this.add.text(195, 130, 'RUN [R]', {
        fontSize: '9px', color: '#cc6666', fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    this.input.keyboard.on('keydown-R', () => {
      if (this.menuVisible) this.onRun();
    });
  }

  showAbilityMenu(character) {
    for (const btn of this.abilityButtons) {
      btn.bg.destroy(); btn.label.destroy(); btn.cost.destroy(); btn.hint.destroy();
    }
    this.abilityButtons = [];

    this.abilityTitle.setText(`${character.name}'s Turn`);

    character.abilities.forEach((key, i) => {
      const ability = ABILITIES[key];
      if (!ability) return;

      const col = i % 2;
      const row = Math.floor(i / 2);
      const bx = 20 + col * 145;
      const by = 22 + row * 36;

      const canAfford = character.mp >= ability.mpCost;
      const baseColor = canAfford ? 0x222244 : 0x1a1a1a;
      const textColor = canAfford ? '#ffffff' : '#555555';

      const bg = this.add.rectangle(bx + 65, by + 12, 130, 28, baseColor, 0.9)
        .setStrokeStyle(1, canAfford ? 0x555577 : 0x333333);

      if (canAfford) {
        bg.setInteractive({ useHandCursor: true })
          .on('pointerover', () => bg.setFillStyle(0x333366))
          .on('pointerout', () => bg.setFillStyle(baseColor, 0.9))
          .on('pointerdown', () => this.onAbilitySelect(key, character));
      }

      const label = this.add.text(bx + 14, by + 3, ability.name, {
        fontSize: '10px', color: textColor, fontStyle: 'bold',
      });
      const costStr = ability.mpCost > 0 ? `${ability.mpCost} MP` : 'Free';
      const cost = this.add.text(bx + 14, by + 15, costStr, {
        fontSize: '7px', color: ability.mpCost > 0 ? '#6688cc' : '#669966',
      });
      const hint = this.add.text(bx + 118, by + 12, `[${i + 1}]`, {
        fontSize: '7px', color: '#555555',
      }).setOrigin(0.5);

      this.abilityContainer.add([bg, label, cost, hint]);
      this.abilityButtons.push({ bg, label, cost, hint, key });
    });

    // Update items button count
    const consumableCount = this.inventory.filter(id => CONSUMABLES[id]).length;
    this.itemsBtnText.setText(`Items [5] (${consumableCount})`);
    if (consumableCount === 0) {
      this.itemsBtnBg.setFillStyle(0x1a1a1a, 0.8).setStrokeStyle(1, 0x333333);
      this.itemsBtnText.setColor('#555555');
    } else {
      this.itemsBtnBg.setFillStyle(0x332244, 0.8).setStrokeStyle(1, 0x554488);
      this.itemsBtnText.setColor('#bb99ff');
    }

    this.abilityKeyHandler = (event) => {
      if (!this.menuVisible) return;
      const num = parseInt(event.key);
      if (num >= 1 && num <= character.abilities.length) {
        this.onAbilitySelect(character.abilities[num - 1], character);
      }
      if (num === 5 && consumableCount > 0) {
        this.showItemMenu(character);
      }
    };
    this.input.keyboard.on('keydown', this.abilityKeyHandler);

    this.abilityContainer.setVisible(true);
    this.menuVisible = true;
  }

  // ──── Target Selection ────

  createTargetMenu() {
    this.targetContainer = this.add.container(320, 495).setDepth(65);
    this.targetContainer.setVisible(false);
    this.targetButtons = [];
  }

  showTargetMenu(targets, label, callback) {
    for (const btn of this.targetButtons) { btn.bg.destroy(); btn.label.destroy(); btn.hint.destroy(); }
    this.targetButtons = [];
    this.targetContainer.removeAll();

    const w = Math.min(targets.length * 100 + 40, 380);
    this.targetContainer.add(
      this.add.rectangle(140, 40, w, 70, 0x111122, 0.95)
        .setStrokeStyle(2, 0x886633)
    );
    this.targetContainer.add(
      this.add.text(140, 10, label, { fontSize: '10px', color: '#ffcc66', fontStyle: 'bold' }).setOrigin(0.5, 0)
    );

    targets.forEach((target, i) => {
      const bx = 140 - (targets.length - 1) * 45 + i * 90;
      const by = 35;

      const bg = this.add.rectangle(bx, by + 10, 82, 28, 0x222244, 0.9)
        .setStrokeStyle(1, 0x555577)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x333366))
        .on('pointerout', () => bg.setFillStyle(0x222244, 0.9))
        .on('pointerdown', () => { this.sfx.playButtonClick(); this.hideTargetMenu(); callback(target); });

      const label2 = this.add.text(bx, by + 4, target.name, {
        fontSize: '9px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      const hint = this.add.text(bx, by + 16, `HP ${target.hp}/${target.maxHp}`, {
        fontSize: '7px', color: '#aaaaaa',
      }).setOrigin(0.5, 0);

      this.targetContainer.add([bg, label2, hint]);
      this.targetButtons.push({ bg, label: label2, hint });
    });

    this.targetKeyHandler = (event) => {
      const num = parseInt(event.key);
      if (num >= 1 && num <= targets.length) {
        this.hideTargetMenu(); callback(targets[num - 1]);
      }
      if (event.code === 'Escape') {
        this.hideTargetMenu();
        if (this.returnToMenu) {
          this.returnToMenu(this.activeCharacter);
        } else {
          this.showAbilityMenu(this.activeCharacter);
        }
      }
    };
    this.input.keyboard.on('keydown', this.targetKeyHandler);
    this.targetContainer.setVisible(true);
  }

  hideTargetMenu() {
    this.targetContainer.setVisible(false);
    if (this.targetKeyHandler) this.input.keyboard.off('keydown', this.targetKeyHandler);
  }

  // ──── Turn Flow ────

  startPlayerTurn(character) {
    this.activeCharacter = character;
    for (const pb of this.partyBars) {
      pb.el.turnArrow.setVisible(pb.member === character);
    }
    this.showAbilityMenu(character);
  }

  onAbilitySelect(abilityKey, character) {
    const ability = ABILITIES[abilityKey];
    if (!ability || character.mp < ability.mpCost) return;
    this.sfx.playButtonClick();
    this.hideAbilityMenu();
    this.returnToMenu = (ch) => this.showAbilityMenu(ch);

    // Self-target abilities
    if (ability.type === 'defend' || ability.type === 'charge') {
      this.battleScene.executeAbility(abilityKey, character, character);
      return;
    }

    // Buff — party-wide or self
    if (ability.type === 'buff') {
      this.battleScene.executeAbility(abilityKey, character, character);
      return;
    }

    // Attack / debuff → pick enemy target
    if (ability.target === 'enemy') {
      const alive = this.enemies.filter(e => e.hp > 0);
      if (alive.length === 1) {
        this.battleScene.executeAbility(abilityKey, character, alive[0]);
      } else {
        this.showTargetMenu(alive, 'Choose target:', (t) => {
          this.battleScene.executeAbility(abilityKey, character, t);
        });
      }
      return;
    }

    // AoE — all enemies, skip target selection
    if (ability.target === 'all_enemies') {
      this.battleScene.executeAbility(abilityKey, character, null);
      return;
    }

    // Party-wide heal — no target selection needed
    if (ability.type === 'heal' && ability.target === 'party') {
      this.battleScene.executeAbility(abilityKey, character, character);
      return;
    }

    // Ally target (heal, etc.)
    if (ability.target === 'ally') {
      // For revive abilities, show dead allies instead
      const candidates = ability.revive
        ? this.party.filter(m => m.hp <= 0)
        : this.party.filter(m => m.hp > 0);
      if (candidates.length === 0) {
        // No valid targets — return to ability menu (MP not yet deducted)
        this.showAbilityMenu(character);
        return;
      }
      if (candidates.length === 1) {
        this.battleScene.executeAbility(abilityKey, character, candidates[0]);
      } else {
        const label = ability.revive ? 'Revive who?' : 'Choose ally:';
        this.showTargetMenu(candidates, label, (t) => {
          this.battleScene.executeAbility(abilityKey, character, t);
        });
      }
      return;
    }

    // Fallback
    this.battleScene.executeAbility(abilityKey, character, character);
  }

  // ──── Item Menu ────

  showItemMenu(character) {
    this.hideAbilityMenu();

    // Count unique consumables in inventory
    const consumCounts = {};
    for (const id of this.inventory) {
      if (CONSUMABLES[id]) consumCounts[id] = (consumCounts[id] || 0) + 1;
    }
    const uniqueItems = Object.keys(consumCounts);
    if (uniqueItems.length === 0) {
      this.showAbilityMenu(character);
      return;
    }

    this.itemMenuContainer = this.add.container(320, 490).setDepth(65);

    const h = 30 + uniqueItems.length * 30;
    this.itemMenuContainer.add(
      this.add.rectangle(140, h / 2 + 4, 290, h, 0x111122, 0.95)
        .setStrokeStyle(2, 0x886633)
    );
    this.itemMenuContainer.add(
      this.add.text(140, 6, 'USE ITEM', { fontSize: '10px', color: '#bb99ff', fontStyle: 'bold' }).setOrigin(0.5, 0)
    );

    this.itemMenuButtons = [];
    uniqueItems.forEach((itemId, i) => {
      const item = CONSUMABLES[itemId];
      const count = consumCounts[itemId];
      const y = 24 + i * 30;

      const bg = this.add.rectangle(140, y + 10, 268, 24, 0x222244, 0.9)
        .setStrokeStyle(1, 0x555577)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => bg.setFillStyle(0x333366))
        .on('pointerout', () => bg.setFillStyle(0x222244, 0.9))
        .on('pointerdown', () => this.onItemSelect(itemId, character));

      const label = this.add.text(14, y + 2, `${item.name} x${count}`, {
        fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
      });
      const desc = this.add.text(160, y + 4, item.desc, {
        fontSize: '7px', color: '#aaaaaa',
      });
      const hint = this.add.text(262, y + 10, `[${i + 1}]`, {
        fontSize: '7px', color: '#555555',
      }).setOrigin(0.5);

      this.itemMenuContainer.add([bg, label, desc, hint]);
      this.itemMenuButtons.push({ bg, label, desc, hint });
    });

    this.itemKeyHandler = (event) => {
      const num = parseInt(event.key);
      if (num >= 1 && num <= uniqueItems.length) {
        this.onItemSelect(uniqueItems[num - 1], character);
      }
      if (event.code === 'Escape') {
        this.hideItemMenu();
        this.showAbilityMenu(character);
      }
    };
    this.input.keyboard.on('keydown', this.itemKeyHandler);
  }

  onItemSelect(itemId, character) {
    this.sfx.playButtonClick();
    this.hideItemMenu();
    this.returnToMenu = (ch) => this.showItemMenu(ch);

    const candidates = this.party.filter(m => m.hp > 0);
    if (candidates.length === 1) {
      this.battleScene.executeItem(itemId, character, candidates[0]);
    } else {
      this.showTargetMenu(candidates, 'Use on:', (t) => {
        this.battleScene.executeItem(itemId, character, t);
      });
    }
  }

  hideItemMenu() {
    if (this.itemMenuContainer) {
      this.itemMenuContainer.destroy();
      this.itemMenuContainer = null;
    }
    if (this.itemKeyHandler) {
      this.input.keyboard.off('keydown', this.itemKeyHandler);
      this.itemKeyHandler = null;
    }
    this.itemMenuButtons = [];
  }

  onRun() {
    if (!this.menuVisible) return;
    this.sfx.playButtonClick();
    this.hideAbilityMenu();
    this.battleScene.attemptRun();
  }

  hideAbilityMenu() {
    this.abilityContainer.setVisible(false);
    this.menuVisible = false;
    if (this.abilityKeyHandler) this.input.keyboard.off('keydown', this.abilityKeyHandler);
  }

  // ──── HP/MP + Status Updates ────

  updateHP() {
    for (const pb of this.partyBars) {
      const m = pb.member;
      const hpR = m.hp / m.maxHp;
      const mpR = m.maxMp > 0 ? m.mp / m.maxMp : 0;

      this.tweens.add({
        targets: pb.el.hpBar, displayWidth: Math.max(0, 140 * hpR), duration: 300,
        onUpdate: () => pb.el.hpBar.setFillStyle(this.getHPColor(hpR)),
      });
      pb.el.hpText.setText(`${Math.max(0, m.hp)}/${m.maxHp}`);
      this.tweens.add({ targets: pb.el.mpBar, displayWidth: Math.max(0, 140 * mpR), duration: 300 });
      pb.el.mpText.setText(`${Math.max(0, m.mp)}/${m.maxMp}`);
      pb.el.nameText.setColor(m.hp > 0 ? '#ffffff' : '#555555');

      // Status effect labels
      const statuses = m.statusEffects.map(e => {
        if (e.type === 'buff') return `\u2191${e.stat}`;
        if (e.type === 'debuff') return `\u2193${e.stat}`;
        if (e.type === 'dot') return 'PSN';
        if (e.type === 'shield') return 'DEF+';
        if (e.stat === 'charged') return 'CHG';
        return '?';
      });
      if (m.isDefending) statuses.unshift('BLK');
      if (m.isCharged) statuses.unshift('CHG');
      pb.el.statusText.setText(statuses.join(' '));
    }

    for (const eb of this.enemyBars) {
      const e = eb.enemy;
      const r = e.hp / e.maxHp;
      this.tweens.add({
        targets: eb.el.hpBar, displayWidth: Math.max(0, 130 * r), duration: 300,
        onUpdate: () => eb.el.hpBar.setFillStyle(this.getHPColor(r)),
      });
      eb.el.hpText.setText(`${Math.max(0, e.hp)}/${e.maxHp}`);
      eb.el.nameText.setColor(e.hp > 0 ? '#ffcccc' : '#555555');

      const statuses = e.statusEffects.map(eff => {
        if (eff.type === 'debuff') return `\u2193${eff.stat}`;
        if (eff.type === 'dot') return 'PSN';
        return '';
      }).filter(Boolean);
      if (e.isDefending) statuses.unshift('BLK');
      eb.el.statusText.setText(statuses.join(' '));
    }
  }

  getHPColor(ratio) {
    if (ratio > 0.5) return 0x33cc33;
    if (ratio > 0.25) return 0xcccc33;
    return 0xcc3333;
  }

  // ──── Message Box ────

  showMessage(text, callback) {
    if (this.msgBox) this.msgBox.destroy();
    if (this.msgText) this.msgText.destroy();
    if (this.msgHint) this.msgHint.destroy();

    this.hideAbilityMenu();
    this.hideTargetMenu();
    this.hideItemMenu();

    this.msgBox = this.add.rectangle(400, 478, 780, 36, 0x000000, 0.92)
      .setStrokeStyle(1, 0x886633).setDepth(70);
    this.msgText = this.add.text(18, 466, text, {
      fontSize: '12px', color: '#ffe8cc', wordWrap: { width: 720 },
    }).setDepth(71);
    this.msgHint = this.add.text(780, 478, '\u25b6', {
      fontSize: '10px', color: '#887755',
    }).setOrigin(0.5).setDepth(71);
    this.tweens.add({ targets: this.msgHint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    const advance = () => {
      this.sfx.playDialogueAdvance();
      if (this.msgBox) this.msgBox.destroy();
      if (this.msgText) this.msgText.destroy();
      if (this.msgHint) this.msgHint.destroy();
      this.msgBox = null;
      this.input.keyboard.off('keydown', advKey);
      if (callback) callback();
    };

    const advKey = (event) => {
      if (['Space', 'Enter', 'KeyE'].includes(event.code)) advance();
    };

    this.time.delayedCall(200, () => {
      this.input.keyboard.on('keydown', advKey);
      if (this.msgBox) this.msgBox.setInteractive().on('pointerdown', advance);
    });
  }
}
