// Experience & Talent management screen — Defense of Rhaud
// Left panel: character info, stats, XP progress
// Right panel: subclass choice, talent tree, ability loadout
// Top: character selector tabs

import { ABILITIES } from '../data/abilities.js';
import { SUBCLASSES } from '../data/subclasses.js';
import { getAllTalents, purchaseTalent } from '../data/talents.js';
import { getEquipmentBonus, chooseSubclass, setActiveAbility } from '../data/characters.js';

export class ExperienceScene extends Phaser.Scene {
  constructor() {
    super('Experience');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    this.roster = this.registry.get('roster');
    this.rosterList = Object.values(this.roster).filter(c => c.recruited);
    this.selectedCharIdx = 0;
    this.modalOpen = false;
    this.talentScrollY = 0;
    this.talentMaxScroll = 0;

    // Background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.97).setDepth(0);

    // Title
    this.add.text(400, 14, 'EXPERIENCE & TALENTS', {
      fontSize: '16px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Character tabs
    this.drawCharTabs();

    // Content containers
    this.leftContainer = this.add.container(0, 0).setDepth(1);
    this.rightContainer = this.add.container(0, 0).setDepth(1);
    this.loadoutContainer = this.add.container(0, 0).setDepth(1);

    this.drawLeftPanel();
    this.drawRightPanel();
    this.drawLoadoutPanel();

    // Close button
    const closeBtn = this.add.rectangle(400, 618, 120, 28, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);
    this.add.text(400, 618, 'CLOSE [X]', {
      fontSize: '11px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // Input
    this.closeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Mouse wheel scroll for talent list
    this.input.on('wheel', (_pointer, _gos, _dx, dy) => {
      if (!this.modalOpen) this.scrollTalents(dy * 0.5);
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
        this.scrollTalents(delta);
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
      const hasTalentPts = char.talentPoints > 0;

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

      // Gold dot for unspent talent points
      if (hasTalentPts && !isSelected) {
        const dot = this.add.circle(x + 40, 34, 3, 0xffcc44);
        this.tabContainer.add(dot);
      }
    });
  }

  // ──── Left Panel — Character Info ────

  drawLeftPanel() {
    this.leftContainer.removeAll(true);
    const char = this.getSelectedChar();

    // Panel background
    const panelBg = this.add.rectangle(155, 270, 290, 380, 0x111118, 0.8)
      .setStrokeStyle(1, 0x333333);
    this.leftContainer.add(panelBg);

    // Avatar
    const avatar = this.add.rectangle(50, 110, 40, 52, char.color)
      .setStrokeStyle(1, 0xffffff, 0.3);
    this.leftContainer.add(avatar);

    // Name
    const nameText = this.add.text(80, 90, char.name, {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold',
    });
    this.leftContainer.add(nameText);

    // Class + Subclass
    let classStr = char.cls;
    if (char.subclass) {
      const subData = this.getSubclassData(char);
      if (subData) classStr += ` — ${subData.name}`;
    }
    const clsText = this.add.text(80, 110, classStr, {
      fontSize: '10px', color: '#aaaaaa',
    });
    this.leftContainer.add(clsText);

    // Level
    const lvlText = this.add.text(80, 126, `Level ${char.level}`, {
      fontSize: '10px', color: '#cccccc',
    });
    this.leftContainer.add(lvlText);

    // XP progress bar
    const xpLabel = this.add.text(20, 150, 'XP', {
      fontSize: '9px', color: '#ccaa44', fontStyle: 'bold',
    });
    this.leftContainer.add(xpLabel);

    const xpRatio = char.xpToNext > 0 ? char.xp / char.xpToNext : 0;
    const barX = 50;
    const barW = 220;
    const barBg = this.add.rectangle(barX + barW / 2, 153, barW, 10, 0x222222)
      .setStrokeStyle(1, 0x444444);
    this.leftContainer.add(barBg);

    if (xpRatio > 0) {
      const fillW = barW * xpRatio;
      const fill = this.add.rectangle(barX + fillW / 2, 153, fillW, 8, 0xccaa44);
      this.leftContainer.add(fill);
    }

    const xpText = this.add.text(barX + barW + 6, 148, `${char.xp}/${char.xpToNext}`, {
      fontSize: '8px', color: '#aa9944',
    });
    this.leftContainer.add(xpText);

    // Talent points
    const tpColor = char.talentPoints > 0 ? '#ffcc44' : '#666666';
    const tpText = this.add.text(20, 172, `Talent Points: ${char.talentPoints}`, {
      fontSize: '12px', color: tpColor, fontStyle: 'bold',
    });
    this.leftContainer.add(tpText);

    if (char.talentPoints > 0) {
      // Pulsing indicator
      this.tweens.add({
        targets: tpText, alpha: 0.5,
        duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // Stats summary
    const statsY = 200;
    const statsTitle = this.add.text(20, statsY, 'STATS', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    });
    this.leftContainer.add(statsTitle);

    const statLines = [
      { label: 'HP', value: `${char.hp}/${char.maxHp}`, bonus: getEquipmentBonus(char, 'hp') },
      { label: 'MP', value: `${char.mp}/${char.maxMp}`, bonus: getEquipmentBonus(char, 'mp') },
      { label: 'ATK', value: `${char.atk}`, bonus: getEquipmentBonus(char, 'atk') },
      { label: 'DEF', value: `${char.def}`, bonus: getEquipmentBonus(char, 'def') },
      { label: 'SPD', value: `${char.spd}`, bonus: getEquipmentBonus(char, 'spd') },
    ];

    statLines.forEach((s, i) => {
      const y = statsY + 18 + i * 16;
      const bonusStr = s.bonus > 0 ? ` (+${s.bonus})` : '';
      const color = s.bonus > 0 ? '#44cc44' : '#bbbbbb';
      const line = this.add.text(30, y, `${s.label}  ${s.value}${bonusStr}`, {
        fontSize: '10px', color,
      });
      this.leftContainer.add(line);
    });

    // Learned abilities count
    const learnedY = statsY + 18 + statLines.length * 16 + 10;
    const learnedTitle = this.add.text(20, learnedY, 'LEARNED ABILITIES', {
      fontSize: '9px', color: '#ccaa44', fontStyle: 'bold',
    });
    this.leftContainer.add(learnedTitle);

    char.learnedAbilities.forEach((key, i) => {
      const ab = ABILITIES[key];
      if (!ab) return;
      const y = learnedY + 16 + i * 13;
      if (y > 450) return; // don't overflow panel
      const isActive = char.activeAbilities.includes(key);
      const color = isActive ? '#ffffff' : '#777777';
      const prefix = isActive ? '\u2605 ' : '  ';
      const abText = this.add.text(30, y, `${prefix}${ab.name}`, {
        fontSize: '8px', color,
      });
      this.leftContainer.add(abText);
    });
  }

  // ──── Right Panel — Subclass + Talents ────

  drawRightPanel() {
    this.rightContainer.removeAll(true);
    const char = this.getSelectedChar();

    // Panel background
    const panelBg = this.add.rectangle(555, 230, 470, 310, 0x111118, 0.8)
      .setStrokeStyle(1, 0x333333);
    this.rightContainer.add(panelBg);

    let contentY = 82;

    // Subclass section
    if (char.level >= 5 && !char.subclass) {
      // Show subclass choice
      this.drawSubclassChoice(char, contentY);
      contentY += 130;
    } else if (char.level < 5) {
      const lockText = this.add.text(555, contentY + 10, 'Subclass available at Level 5', {
        fontSize: '10px', color: '#555555',
      }).setOrigin(0.5);
      this.rightContainer.add(lockText);
      contentY += 30;
    } else {
      // Show chosen subclass
      const subData = this.getSubclassData(char);
      if (subData) {
        const subLabel = this.add.text(330, contentY, `Subclass: ${subData.name}`, {
          fontSize: '11px', color: '#ccaa44', fontStyle: 'bold',
        });
        this.rightContainer.add(subLabel);

        const subDesc = this.add.text(330, contentY + 16, subData.desc, {
          fontSize: '8px', color: '#888888', wordWrap: { width: 440 },
        });
        this.rightContainer.add(subDesc);
        contentY += 44;
      }
    }

    // Talent section header
    const talentHeader = this.add.text(330, contentY, 'TALENT TREE', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    });
    this.rightContainer.add(talentHeader);
    contentY += 18;

    // Create scrollable talent list container
    if (this.talentListContainer) this.talentListContainer.destroy();
    this.talentListContainer = this.add.container(0, 0).setDepth(2);

    const { shared, subclass } = getAllTalents(char);
    let listY = contentY;
    const startY = listY;

    // Shared class talents
    const sharedLabel = this.add.text(335, listY, `${char.cls} Talents`, {
      fontSize: '9px', color: '#aa8855', fontStyle: 'bold',
    });
    this.talentListContainer.add(sharedLabel);
    listY += 16;

    for (const talent of shared) {
      listY = this.drawTalentRow(char, talent, listY);
    }

    // Subclass talents
    if (subclass.length > 0) {
      listY += 6;
      const subData = this.getSubclassData(char);
      const subTalentLabel = this.add.text(335, listY, `${subData ? subData.name : 'Subclass'} Talents`, {
        fontSize: '9px', color: '#aa8855', fontStyle: 'bold',
      });
      this.talentListContainer.add(subTalentLabel);
      listY += 16;

      for (const talent of subclass) {
        listY = this.drawTalentRow(char, talent, listY);
      }
    }

    // Set up mask for scrollable talent area
    const visibleTop = startY;
    const visibleBottom = 385;
    const contentHeight = listY - startY;
    this.talentMaxScroll = Math.max(0, contentHeight - (visibleBottom - visibleTop));
    this.talentScrollY = 0;

    if (this.talentMaxScroll > 0) {
      const maskShape = this.make.graphics({ x: 0, y: 0 });
      maskShape.fillStyle(0xffffff);
      maskShape.fillRect(320, visibleTop, 470, visibleBottom - visibleTop);
      const mask = maskShape.createGeometryMask();
      this.talentListContainer.setMask(mask);

      const hint = this.add.text(555, visibleBottom + 2, 'Scroll for more talents', {
        fontSize: '8px', color: '#555544',
      }).setOrigin(0.5).setDepth(3);
      this.rightContainer.add(hint);
    }
  }

  drawTalentRow(char, talent, y) {
    const purchased = char.talentsPurchased.includes(talent.id);
    const meetsLevel = char.level >= talent.levelReq;
    const canAfford = char.talentPoints >= talent.cost;
    const available = !purchased && meetsLevel && canAfford;

    // Row background
    const rowBg = this.add.rectangle(555, y + 12, 440, 26, purchased ? 0x1a1a10 : 0x111118)
      .setStrokeStyle(1, purchased ? 0x887733 : 0x333333);
    this.talentListContainer.add(rowBg);

    // Purchased indicator
    const indicatorColor = purchased ? 0xccaa44 : (meetsLevel ? 0x444444 : 0x222222);
    const indicator = this.add.rectangle(340, y + 12, 10, 10, indicatorColor)
      .setStrokeStyle(1, purchased ? 0xffcc44 : 0x555555);
    this.talentListContainer.add(indicator);

    // Talent name
    let nameColor = '#555555';
    if (purchased) nameColor = '#ccaa44';
    else if (available) nameColor = '#ffffff';
    else if (meetsLevel) nameColor = '#888888';

    const nameText = this.add.text(356, y + 4, talent.name, {
      fontSize: '9px', color: nameColor, fontStyle: purchased || available ? 'bold' : 'normal',
    });
    this.talentListContainer.add(nameText);

    // Description
    const descColor = purchased ? '#998844' : (meetsLevel ? '#777777' : '#444444');
    const descText = this.add.text(356, y + 16, talent.desc, {
      fontSize: '7px', color: descColor,
    });
    this.talentListContainer.add(descText);

    // Level requirement
    if (!meetsLevel) {
      const reqText = this.add.text(700, y + 4, `Lv.${talent.levelReq}`, {
        fontSize: '8px', color: '#663333',
      });
      this.talentListContainer.add(reqText);
    }

    // Learn button (if available and not purchased)
    if (available) {
      const learnBtn = this.add.rectangle(740, y + 12, 50, 20, 0x224433)
        .setStrokeStyle(1, 0x44aa66)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => learnBtn.setFillStyle(0x335544))
        .on('pointerout', () => learnBtn.setFillStyle(0x224433))
        .on('pointerdown', () => {
          purchaseTalent(char, talent.id);
          this.refresh();
        });
      this.talentListContainer.add(learnBtn);

      const learnText = this.add.text(740, y + 12, 'LEARN', {
        fontSize: '8px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.talentListContainer.add(learnText);
    } else if (purchased) {
      const doneText = this.add.text(740, y + 12, 'Learned', {
        fontSize: '8px', color: '#887744',
      }).setOrigin(0.5);
      this.talentListContainer.add(doneText);
    }

    return y + 30;
  }

  drawSubclassChoice(char, startY) {
    const classSubclasses = SUBCLASSES[char.cls];
    if (!classSubclasses) return;

    const keys = Object.keys(classSubclasses);
    const headerText = this.add.text(555, startY, 'Choose Your Subclass', {
      fontSize: '12px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.rightContainer.add(headerText);

    keys.forEach((key, i) => {
      const sub = classSubclasses[key];
      const cx = 435 + i * 240;
      const cy = startY + 65;

      // Card background
      const cardBg = this.add.rectangle(cx, cy, 220, 100, 0x1a1a2e)
        .setStrokeStyle(2, 0x886633)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => cardBg.setStrokeStyle(2, 0xccaa44))
        .on('pointerout', () => cardBg.setStrokeStyle(2, 0x886633))
        .on('pointerdown', () => this.confirmSubclass(char, key, sub));
      this.rightContainer.add(cardBg);

      // Subclass name
      const nameText = this.add.text(cx, cy - 38, sub.name, {
        fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      this.rightContainer.add(nameText);

      // Description
      const descText = this.add.text(cx, cy - 18, sub.desc, {
        fontSize: '7px', color: '#aaaaaa', wordWrap: { width: 200 },
      }).setOrigin(0.5, 0);
      this.rightContainer.add(descText);

      // Abilities preview
      const abilitiesStr = sub.abilities.map(k => {
        const ab = ABILITIES[k];
        return ab ? ab.name : k;
      }).join(', ');
      const abText = this.add.text(cx, cy + 30, `Abilities: ${abilitiesStr}`, {
        fontSize: '7px', color: '#ccaa44', wordWrap: { width: 200 },
      }).setOrigin(0.5, 0);
      this.rightContainer.add(abText);
    });
  }

  confirmSubclass(char, subclassKey, subData) {
    if (this.modalOpen) return;
    this.modalOpen = true;

    this.modalContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.rectangle(400, 320, 800, 640, 0x000000, 0.7)
      .setInteractive();
    this.modalContainer.add(overlay);

    const modalBg = this.add.rectangle(400, 300, 350, 160, 0x111122)
      .setStrokeStyle(2, 0xccaa44);
    this.modalContainer.add(modalBg);

    const title = this.add.text(400, 240, `Become a ${subData.name}?`, {
      fontSize: '14px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add(title);

    const desc = this.add.text(400, 270, subData.desc, {
      fontSize: '9px', color: '#aaaaaa', wordWrap: { width: 300 },
    }).setOrigin(0.5, 0);
    this.modalContainer.add(desc);

    const note = this.add.text(400, 310, 'This choice is permanent!', {
      fontSize: '9px', color: '#cc6644', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add(note);

    // Confirm button
    const confirmBtn = this.add.rectangle(340, 350, 90, 28, 0x224433)
      .setStrokeStyle(1, 0x44aa66)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => confirmBtn.setFillStyle(0x335544))
      .on('pointerout', () => confirmBtn.setFillStyle(0x224433))
      .on('pointerdown', () => {
        chooseSubclass(char, subclassKey);
        this.closeModal();
        this.refresh();
      });
    this.modalContainer.add(confirmBtn);
    this.modalContainer.add(
      this.add.text(340, 350, 'CONFIRM', {
        fontSize: '10px', color: '#aaffaa', fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Cancel button
    const cancelBtn = this.add.rectangle(460, 350, 90, 28, 0x443322)
      .setStrokeStyle(1, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => cancelBtn.setFillStyle(0x554433))
      .on('pointerout', () => cancelBtn.setFillStyle(0x443322))
      .on('pointerdown', () => this.closeModal());
    this.modalContainer.add(cancelBtn);
    this.modalContainer.add(
      this.add.text(460, 350, 'Cancel', {
        fontSize: '10px', color: '#ddccaa',
      }).setOrigin(0.5)
    );
  }

  // ──── Bottom Panel — Active Loadout ────

  drawLoadoutPanel() {
    this.loadoutContainer.removeAll(true);
    const char = this.getSelectedChar();

    // Panel background
    const panelBg = this.add.rectangle(555, 500, 470, 180, 0x111118, 0.8)
      .setStrokeStyle(1, 0x333333);
    this.loadoutContainer.add(panelBg);

    const loadoutTitle = this.add.text(555, 418, 'ACTIVE LOADOUT (4 Ability Slots)', {
      fontSize: '10px', color: '#ccaa44', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.loadoutContainer.add(loadoutTitle);

    // 2x2 grid of ability slots
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const sx = 420 + col * 200;
      const sy = 450 + row * 50;

      const abilityKey = char.activeAbilities[i];
      const ability = abilityKey ? ABILITIES[abilityKey] : null;

      // Slot background
      const slotBg = this.add.rectangle(sx + 80, sy + 15, 180, 38, ability ? 0x1a1a2e : 0x111118)
        .setStrokeStyle(1, ability ? 0x555577 : 0x333333)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => slotBg.setFillStyle(0x222244))
        .on('pointerout', () => slotBg.setFillStyle(ability ? 0x1a1a2e : 0x111118))
        .on('pointerdown', () => this.openLoadoutModal(i));
      this.loadoutContainer.add(slotBg);

      // Slot number
      const numText = this.add.text(sx + 4, sy + 7, `${i + 1}.`, {
        fontSize: '10px', color: '#666666', fontStyle: 'bold',
      });
      this.loadoutContainer.add(numText);

      if (ability) {
        // Ability name
        const abName = this.add.text(sx + 20, sy + 4, ability.name, {
          fontSize: '10px', color: '#ffffff', fontStyle: 'bold',
        });
        this.loadoutContainer.add(abName);

        // MP cost
        const costStr = ability.mpCost > 0 ? `${ability.mpCost} MP` : 'Free';
        const costColor = ability.mpCost > 0 ? '#6688cc' : '#669966';
        const costText = this.add.text(sx + 20, sy + 18, costStr, {
          fontSize: '8px', color: costColor,
        });
        this.loadoutContainer.add(costText);

        // Type indicator
        const typeText = this.add.text(sx + 142, sy + 18, ability.type, {
          fontSize: '7px', color: '#555555',
        });
        this.loadoutContainer.add(typeText);
      } else {
        const emptyText = this.add.text(sx + 80, sy + 15, '(empty)', {
          fontSize: '9px', color: '#444444',
        }).setOrigin(0.5);
        this.loadoutContainer.add(emptyText);
      }
    }
  }

  openLoadoutModal(slotIndex) {
    if (this.modalOpen) return;
    this.modalOpen = true;

    const char = this.getSelectedChar();

    this.modalContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.rectangle(400, 320, 800, 640, 0x000000, 0.7)
      .setInteractive();
    this.modalContainer.add(overlay);

    // Modal box
    const modalW = 380;
    const modalH = Math.min(450, 80 + char.learnedAbilities.length * 40);
    const mx = 400;
    const my = 300;

    const modalBg = this.add.rectangle(mx, my, modalW, modalH, 0x111122)
      .setStrokeStyle(2, 0xccaa44);
    this.modalContainer.add(modalBg);

    const title = this.add.text(mx, my - modalH / 2 + 18, `Slot ${slotIndex + 1} — Choose Ability`, {
      fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.modalContainer.add(title);

    // List all learned abilities
    let listY = my - modalH / 2 + 42;

    // Get abilities in other slots (so we can show which are already equipped)
    const otherSlots = char.activeAbilities.filter((_, idx) => idx !== slotIndex);

    for (const abilityKey of char.learnedAbilities) {
      const ability = ABILITIES[abilityKey];
      if (!ability) continue;

      const isInOtherSlot = otherSlots.includes(abilityKey);
      const isCurrent = char.activeAbilities[slotIndex] === abilityKey;

      const rowBg = this.add.rectangle(mx, listY + 13, modalW - 20, 34, isCurrent ? 0x222244 : 0x1a1a1a)
        .setStrokeStyle(1, isCurrent ? 0x886633 : 0x333333);
      this.modalContainer.add(rowBg);

      const nameColor = isInOtherSlot ? '#555555' : (isCurrent ? '#ffcc44' : '#ffffff');
      const nameText = this.add.text(mx - modalW / 2 + 20, listY + 3, ability.name, {
        fontSize: '10px', color: nameColor, fontStyle: 'bold',
      });
      this.modalContainer.add(nameText);

      const costStr = ability.mpCost > 0 ? `${ability.mpCost} MP` : 'Free';
      const costText = this.add.text(mx - modalW / 2 + 20, listY + 17, `${costStr} — ${ability.desc}`, {
        fontSize: '7px', color: '#777777', wordWrap: { width: 260 },
      });
      this.modalContainer.add(costText);

      if (isInOtherSlot) {
        const usedText = this.add.text(mx + modalW / 2 - 20, listY + 13, 'In Use', {
          fontSize: '8px', color: '#555555',
        }).setOrigin(1, 0.5);
        this.modalContainer.add(usedText);
      } else if (isCurrent) {
        const curText = this.add.text(mx + modalW / 2 - 20, listY + 13, 'Current', {
          fontSize: '8px', color: '#ccaa44',
        }).setOrigin(1, 0.5);
        this.modalContainer.add(curText);
      } else {
        // Equip button
        const eqBtn = this.add.rectangle(mx + modalW / 2 - 40, listY + 13, 56, 22, 0x224433)
          .setStrokeStyle(1, 0x44aa66)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => eqBtn.setFillStyle(0x335544))
          .on('pointerout', () => eqBtn.setFillStyle(0x224433))
          .on('pointerdown', () => {
            setActiveAbility(char, slotIndex, abilityKey);
            this.closeModal();
            this.refresh();
          });
        this.modalContainer.add(eqBtn);

        const eqText = this.add.text(mx + modalW / 2 - 40, listY + 13, 'Equip', {
          fontSize: '9px', color: '#aaffaa', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.modalContainer.add(eqText);
      }

      listY += 38;
    }

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

  // ──── Helpers ────

  getSubclassData(char) {
    if (!char.subclass) return null;
    const classSubs = SUBCLASSES[char.cls];
    if (!classSubs) return null;
    return classSubs[char.subclass] || null;
  }

  scrollTalents(delta) {
    if (this.talentMaxScroll <= 0 || !this.talentListContainer) return;
    this.talentScrollY = Phaser.Math.Clamp(this.talentScrollY + delta, 0, this.talentMaxScroll);
    this.talentListContainer.y = -this.talentScrollY;
  }

  closeModal() {
    if (this.modalContainer) {
      this.modalContainer.destroy();
      this.modalContainer = null;
    }
    this.modalOpen = false;
  }

  refresh() {
    this.drawCharTabs();
    this.drawLeftPanel();
    this.drawRightPanel();
    this.drawLoadoutPanel();
  }
}
