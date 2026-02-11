import { getSlotSummaries, getAutoSaveSummary, loadFromSlot, loadAutoSave } from '../data/saveManager.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a12);

    // Decorative border lines
    this.add.rectangle(width / 2, 2, width - 40, 2, 0x8866aa, 0.3);
    this.add.rectangle(width / 2, height - 2, width - 40, 2, 0x8866aa, 0.3);

    // Title
    this.add.text(width / 2, 100, 'DEFENSE OF RHAUD', {
      fontSize: '36px', color: '#ffddaa', fontStyle: 'bold',
      stroke: '#442200', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width / 2, 145, 'Eastern Frontier, 250 B.C.E.', {
      fontSize: '14px', color: '#886644',
    }).setOrigin(0.5);

    // Build menu
    const autoSummary = getAutoSaveSummary();
    const slotSummaries = getSlotSummaries();
    let yPos = 220;

    // NEW GAME button
    this.createButton(width / 2, yPos, 'NEW GAME', '[N]', () => {
      this.scene.start('Boot');
    });
    yPos += 55;

    // CONTINUE button (auto-save)
    if (autoSummary.exists) {
      const autoLabel = this.formatSummary('CONTINUE', autoSummary);
      this.createButton(width / 2, yPos, autoLabel, '[C]', () => {
        const data = loadAutoSave();
        if (data) this.scene.start('Boot', { loadData: data });
      });
      yPos += 55;
    }

    // Separator
    yPos += 10;
    this.add.text(width / 2, yPos, '- Load Saved Game -', {
      fontSize: '12px', color: '#555555',
    }).setOrigin(0.5);
    yPos += 30;

    // 3 Save Slots
    for (let i = 0; i < 3; i++) {
      const slotNum = i + 1;
      const summary = slotSummaries[i];
      const label = summary.exists
        ? this.formatSummary(`Slot ${slotNum}`, summary)
        : `Slot ${slotNum}  —  Empty`;
      const color = summary.exists ? '#ccbbaa' : '#555555';

      this.createButton(width / 2, yPos, label, `[${slotNum}]`, () => {
        if (!summary.exists) return;
        const data = loadFromSlot(slotNum);
        if (data) this.scene.start('Boot', { loadData: data });
      }, color);
      yPos += 50;
    }

    // Footer
    this.add.text(width / 2, height - 30, 'N: New Game   C: Continue   1-3: Load Slot', {
      fontSize: '10px', color: '#444444',
    }).setOrigin(0.5);

    // Keyboard shortcuts
    this.input.keyboard.on('keydown-N', () => {
      this.scene.start('Boot');
    });

    if (autoSummary.exists) {
      this.input.keyboard.on('keydown-C', () => {
        const data = loadAutoSave();
        if (data) this.scene.start('Boot', { loadData: data });
      });
    }

    for (let i = 1; i <= 3; i++) {
      const slotNum = i;
      this.input.keyboard.on(`keydown-${i}`, () => {
        if (!slotSummaries[slotNum - 1].exists) return;
        const data = loadFromSlot(slotNum);
        if (data) this.scene.start('Boot', { loadData: data });
      });
    }
  }

  formatSummary(prefix, summary) {
    const time = new Date(summary.saveTime);
    const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${prefix}  —  Lv.${summary.level}  Gold: ${summary.gold}  Party: ${summary.recruited}  (${timeStr})`;
  }

  createButton(x, y, label, hint, onClick, textColor = '#ffddaa') {
    const bg = this.add.rectangle(x, y, 600, 40, 0x1a1a2e)
      .setStrokeStyle(1, 0x4a3a6a, 0.6)
      .setInteractive({ useHandCursor: true });

    const text = this.add.text(x - 260, y, label, {
      fontSize: '14px', color: textColor,
    }).setOrigin(0, 0.5);

    const hintText = this.add.text(x + 270, y, hint, {
      fontSize: '11px', color: '#666666',
    }).setOrigin(1, 0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x2a2a4e);
      bg.setStrokeStyle(1, 0x8866aa, 0.9);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x1a1a2e);
      bg.setStrokeStyle(1, 0x4a3a6a, 0.6);
    });
    bg.on('pointerdown', onClick);

    return { bg, text, hintText };
  }
}
