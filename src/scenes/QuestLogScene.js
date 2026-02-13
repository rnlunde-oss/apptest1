// Quest Log overlay — Defense of Rhaud
// Follows PartyScene / InventoryScene overlay pattern.

import { QUEST_DEFS } from '../data/quests.js';
import {
  getActiveQuests, getCompletedQuests, setTrackedQuest,
} from '../utils/QuestManager.js';

const VISIBLE_TOP = 70;
const VISIBLE_BOTTOM = 575;
const SCROLL_SPEED = 12;

export class QuestLogScene extends Phaser.Scene {
  constructor() {
    super('QuestLog');
  }

  init(data) {
    this.onClose = data.onClose;
  }

  create() {
    this.activeTab = 'active'; // 'active' | 'completed'

    // Dark overlay background
    this.add.rectangle(400, 320, 800, 640, 0x0a0a12, 0.95).setDepth(0);

    // Title
    this.add.text(400, 14, 'QUEST LOG', {
      fontSize: '18px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // Tabs
    this.tabElements = [];
    this.drawTabs();

    // Scrollable container
    this.scrollContainer = this.add.container(0, 0).setDepth(1);

    this.drawQuestList();

    // Mask for scroll area
    const maskShape = this.make.graphics({ x: 0, y: 0 });
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(0, VISIBLE_TOP, 800, VISIBLE_BOTTOM - VISIBLE_TOP);
    this.scrollContainer.setMask(maskShape.createGeometryMask());

    // Scroll setup
    this.scrollY = 0;
    this.maxScroll = 0;
    this.scrollTrack = null;
    this.scrollThumb = null;

    this.updateContentHeight();
    this.updateScrollBar();

    // Close button
    const closeBtn = this.add.rectangle(400, 608, 120, 34, 0x333344)
      .setStrokeStyle(2, 0x886633)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => closeBtn.setFillStyle(0x444466))
      .on('pointerout', () => closeBtn.setFillStyle(0x333344))
      .on('pointerdown', () => this.onClose())
      .setDepth(50);
    this.add.text(400, 608, 'CLOSE [Q]', {
      fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(51);

    // Input
    this.closeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
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

  // ── Tabs ──

  drawTabs() {
    for (const el of this.tabElements) el.destroy();
    this.tabElements = [];

    const tabs = [
      { key: 'active', label: 'ACTIVE', x: 320 },
      { key: 'completed', label: 'COMPLETED', x: 480 },
    ];

    for (const tab of tabs) {
      const isActive = this.activeTab === tab.key;
      const bg = this.add.rectangle(tab.x, 42, 130, 28, isActive ? 0x2a2a3e : 0x15151f)
        .setStrokeStyle(1, isActive ? 0xccaa44 : 0x444444, 0.6)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.activeTab !== tab.key) {
            this.activeTab = tab.key;
            this.scrollY = 0;
            this.drawTabs();
            this.drawQuestList();
          }
        })
        .setDepth(50);
      this.tabElements.push(bg);

      const label = this.add.text(tab.x, 42, tab.label, {
        fontSize: '11px', color: isActive ? '#ccaa44' : '#666655', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(51);
      this.tabElements.push(label);
    }
  }

  // ── Quest List ──

  drawQuestList() {
    this.scrollContainer.removeAll(true);

    const qs = this.registry.get('questState');
    const trackedId = qs ? qs.trackedQuestId : null;

    if (this.activeTab === 'active') {
      this.drawActiveQuests(trackedId);
    } else {
      this.drawCompletedQuests();
    }

    this.updateContentHeight();
    this.updateScrollBar();
  }

  drawActiveQuests(trackedId) {
    const quests = getActiveQuests(this.registry);

    if (quests.length === 0) {
      this.scrollContainer.add(
        this.add.text(400, 140, 'No active quests.', {
          fontSize: '13px', color: '#555555',
        }).setOrigin(0.5)
      );
      this.contentHeight = 200;
      return;
    }

    // Separate main and side quests
    const mainQuests = quests.filter(q => q.def.type === 'main');
    const sideQuests = quests.filter(q => q.def.type === 'side');

    let yy = 80;

    if (mainQuests.length > 0) {
      yy = this.drawQuestSection('MAIN QUESTS', mainQuests, yy, trackedId);
    }
    if (sideQuests.length > 0) {
      yy = this.drawQuestSection('SIDE QUESTS', sideQuests, yy, trackedId);
    }

    this.contentHeight = yy + 40;
  }

  drawCompletedQuests() {
    const quests = getCompletedQuests(this.registry);

    if (quests.length === 0) {
      this.scrollContainer.add(
        this.add.text(400, 140, 'No completed quests.', {
          fontSize: '13px', color: '#555555',
        }).setOrigin(0.5)
      );
      this.contentHeight = 200;
      return;
    }

    const mainQuests = quests.filter(q => q.def.type === 'main');
    const sideQuests = quests.filter(q => q.def.type === 'side');

    let yy = 80;

    if (mainQuests.length > 0) {
      yy = this.drawCompletedSection('MAIN QUESTS', mainQuests, yy);
    }
    if (sideQuests.length > 0) {
      yy = this.drawCompletedSection('SIDE QUESTS', sideQuests, yy);
    }

    this.contentHeight = yy + 40;
  }

  drawQuestSection(sectionLabel, quests, startY, trackedId) {
    let yy = startY;

    // Section header
    this.scrollContainer.add(
      this.add.text(400, yy, sectionLabel, {
        fontSize: '12px', color: '#ccaa44', fontStyle: 'bold',
      }).setOrigin(0.5)
    );
    yy += 22;

    for (const { def, state } of quests) {
      yy = this.drawQuestCard(def, state, yy, trackedId);
    }

    return yy + 10;
  }

  drawCompletedSection(sectionLabel, quests, startY) {
    let yy = startY;

    this.scrollContainer.add(
      this.add.text(400, yy, sectionLabel, {
        fontSize: '12px', color: '#666655', fontStyle: 'bold',
      }).setOrigin(0.5)
    );
    yy += 22;

    for (const { def } of quests) {
      yy = this.drawCompletedCard(def, yy);
    }

    return yy + 10;
  }

  drawQuestCard(def, state, startY, trackedId) {
    let yy = startY;
    const isTracked = trackedId === def.id;

    // Card background
    const cardH = 30 + def.objectives.length * 20 + 20;
    const bg = this.add.rectangle(400, yy + cardH / 2, 700, cardH, isTracked ? 0x1e1e30 : 0x151520)
      .setStrokeStyle(1, isTracked ? 0xccaa44 : 0x333344, 0.6);
    this.scrollContainer.add(bg);

    // Quest name
    const nameColor = isTracked ? '#ffddaa' : '#ccbbaa';
    this.scrollContainer.add(
      this.add.text(70, yy + 8, def.name, {
        fontSize: '13px', color: nameColor, fontStyle: 'bold',
      })
    );

    // Giver
    this.scrollContainer.add(
      this.add.text(70, yy + 24, `From: ${def.giverName}`, {
        fontSize: '8px', color: '#777766',
      })
    );

    // Track button
    if (!isTracked) {
      const trackBtn = this.add.rectangle(680, yy + 16, 60, 22, 0x334433)
        .setStrokeStyle(1, 0x55aa55, 0.6)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => trackBtn.setFillStyle(0x445544))
        .on('pointerout', () => trackBtn.setFillStyle(0x334433))
        .on('pointerdown', () => {
          setTrackedQuest(this.registry, def.id);
          this.scrollY = 0;
          this.drawQuestList();
        });
      this.scrollContainer.add(trackBtn);
      this.scrollContainer.add(
        this.add.text(680, 16 + yy, 'TRACK', {
          fontSize: '9px', color: '#aaffaa', fontStyle: 'bold',
        }).setOrigin(0.5)
      );
    } else {
      this.scrollContainer.add(
        this.add.text(680, yy + 16, 'TRACKED', {
          fontSize: '9px', color: '#ccaa44', fontStyle: 'bold',
        }).setOrigin(0.5)
      );
    }

    // Objectives
    let objY = yy + 38;
    for (const obj of def.objectives) {
      const progress = state.objectiveProgress[obj.id] || 0;
      const done = progress >= obj.required;
      const checkmark = done ? '[x]' : '[ ]';
      const progressStr = obj.required > 1 ? ` (${progress}/${obj.required})` : '';
      const color = done ? '#55aa55' : '#aaaaaa';

      this.scrollContainer.add(
        this.add.text(90, objY, `${checkmark} ${obj.description}${progressStr}`, {
          fontSize: '11px', color,
        })
      );
      objY += 20;
    }

    return yy + cardH + 8;
  }

  drawCompletedCard(def, startY) {
    let yy = startY;

    const cardH = 44;
    const bg = this.add.rectangle(400, yy + cardH / 2, 700, cardH, 0x111118)
      .setStrokeStyle(1, 0x333333, 0.4);
    this.scrollContainer.add(bg);

    // Quest name with checkmark
    this.scrollContainer.add(
      this.add.text(70, yy + 8, `[x] ${def.name}`, {
        fontSize: '13px', color: '#55aa55',
      })
    );

    // Giver + rewards
    const rewardParts = [];
    if (def.rewards.gold) rewardParts.push(`${def.rewards.gold}g`);
    if (def.rewards.xp) rewardParts.push(`${def.rewards.xp} XP`);
    const rewardStr = rewardParts.length > 0 ? `  |  Rewards: ${rewardParts.join(', ')}` : '';

    this.scrollContainer.add(
      this.add.text(70, yy + 26, `From: ${def.giverName}${rewardStr}`, {
        fontSize: '8px', color: '#555544',
      })
    );

    return yy + cardH + 6;
  }

  // ── Scroll ──

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
    if (!this.contentHeight) this.contentHeight = 200;
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
}
