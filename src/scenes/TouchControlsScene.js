// Touch Controls overlay scene — virtual joystick, interact button, menu popup
// Runs parallel to OverworldScene on touch devices. All elements at depth 150.

export class TouchControlsScene extends Phaser.Scene {
  constructor() {
    super('TouchControls');
  }

  create() {
    // ── Joystick state ──
    this.joystickVector = { x: 0, y: 0 };
    this.joystickPointerId = null;

    // ── Interact button state ──
    this.interactPressed = false;

    // ── Menu popup state ──
    this.menuOpen = false;
    this.menuElements = [];

    const DEPTH = 150;
    const JOYSTICK_X = 120;
    const JOYSTICK_Y = 520;
    const JOYSTICK_RADIUS = 60;
    const THUMB_RADIUS = 28;
    const DEAD_ZONE = 8;

    // ── Virtual Joystick (left side) ──
    this.joystickBase = this.add.circle(JOYSTICK_X, JOYSTICK_Y, JOYSTICK_RADIUS, 0x000000, 0.3)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setScrollFactor(0).setDepth(DEPTH);

    this.joystickThumb = this.add.circle(JOYSTICK_X, JOYSTICK_Y, THUMB_RADIUS, 0xffffff, 0.4)
      .setScrollFactor(0).setDepth(DEPTH + 1);

    // Store constants for use in handlers
    this._jx = JOYSTICK_X;
    this._jy = JOYSTICK_Y;
    this._jRadius = JOYSTICK_RADIUS;
    this._deadZone = DEAD_ZONE;

    // ── Interact Button (right side) ──
    this.interactBtn = this.add.circle(700, 530, 25, 0x44aa44, 0.5)
      .setStrokeStyle(2, 0x66cc66, 0.6)
      .setScrollFactor(0).setDepth(DEPTH);
    this.interactLabel = this.add.text(700, 530, 'E', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 1);

    this.interactBtn.setInteractive();
    this.interactBtn.on('pointerdown', () => {
      this.interactPressed = true;
      this.interactBtn.setFillStyle(0x66cc66, 0.7);
    });
    this.interactBtn.on('pointerup', () => {
      this.interactBtn.setFillStyle(0x44aa44, 0.5);
    });
    this.interactBtn.on('pointerout', () => {
      this.interactBtn.setFillStyle(0x44aa44, 0.5);
    });

    // ── Menu Button (right side, above interact) ──
    this.menuBtn = this.add.circle(700, 450, 22, 0x665533, 0.5)
      .setStrokeStyle(2, 0x887755, 0.6)
      .setScrollFactor(0).setDepth(DEPTH);

    // Hamburger icon (three lines)
    const menuIconLines = [];
    for (let i = -1; i <= 1; i++) {
      const line = this.add.rectangle(700, 450 + i * 6, 16, 2, 0xffffff, 0.8)
        .setScrollFactor(0).setDepth(DEPTH + 1);
      menuIconLines.push(line);
    }
    this.menuIconLines = menuIconLines;

    this.menuBtn.setInteractive();
    this.menuBtn.on('pointerdown', () => {
      if (this.menuOpen) {
        this.closeMenuPopup();
      } else {
        this.openMenuPopup();
      }
    });

    // ── Scene-level pointer events for joystick ──
    this.input.on('pointerdown', (pointer) => {
      // Only claim pointer if it's on the left side and no joystick pointer yet
      if (this.joystickPointerId !== null) return;
      if (pointer.x > 300) return; // left half only

      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, this._jx, this._jy);
      if (dist <= this._jRadius + 30) { // generous touch area
        this.joystickPointerId = pointer.id;
        this._updateJoystick(pointer.x, pointer.y);
      }
    });

    this.input.on('pointermove', (pointer) => {
      if (pointer.id !== this.joystickPointerId) return;
      this._updateJoystick(pointer.x, pointer.y);
    });

    this.input.on('pointerup', (pointer) => {
      if (pointer.id !== this.joystickPointerId) return;
      this.joystickPointerId = null;
      this.joystickThumb.setPosition(this._jx, this._jy);
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
    });

    // Store all control elements for visibility toggling
    this.controlElements = [
      this.joystickBase, this.joystickThumb,
      this.interactBtn, this.interactLabel,
      this.menuBtn, ...menuIconLines,
    ];
  }

  _updateJoystick(px, py) {
    let dx = px - this._jx;
    let dy = py - this._jy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp to joystick radius
    if (dist > this._jRadius) {
      dx = (dx / dist) * this._jRadius;
      dy = (dy / dist) * this._jRadius;
    }

    this.joystickThumb.setPosition(this._jx + dx, this._jy + dy);

    // Dead zone
    if (dist < this._deadZone) {
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
    } else {
      // Normalize to -1..1
      this.joystickVector.x = Phaser.Math.Clamp(dx / this._jRadius, -1, 1);
      this.joystickVector.y = Phaser.Math.Clamp(dy / this._jRadius, -1, 1);
    }
  }

  // ── Menu Popup ──

  openMenuPopup() {
    this.menuOpen = true;
    const DEPTH = 152;
    const baseX = 620;
    const baseY = 380;

    // Popup background
    const bg = this.add.rectangle(baseX, baseY, 140, 170, 0x000000, 0.85)
      .setStrokeStyle(1, 0x887755)
      .setScrollFactor(0).setDepth(DEPTH);
    this.menuElements.push(bg);

    const buttons = [
      { label: 'Party', event: 'menu-party' },
      { label: 'Inventory', event: 'menu-inv' },
      { label: 'Experience', event: 'menu-exp' },
      { label: 'Save', event: 'menu-save' },
    ];

    buttons.forEach((btn, i) => {
      const y = baseY - 60 + i * 38;
      const btnBg = this.add.rectangle(baseX, y, 120, 30, 0x333322)
        .setStrokeStyle(1, 0x666644)
        .setScrollFactor(0).setDepth(DEPTH + 1)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => btnBg.setFillStyle(0x444433))
        .on('pointerout', () => btnBg.setFillStyle(0x333322))
        .on('pointerdown', () => {
          this.events.emit(btn.event);
          this.closeMenuPopup();
        });
      this.menuElements.push(btnBg);

      const label = this.add.text(baseX, y, btn.label, {
        fontSize: '12px', color: '#ddccaa', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH + 2);
      this.menuElements.push(label);
    });
  }

  closeMenuPopup() {
    for (const el of this.menuElements) el.destroy();
    this.menuElements = [];
    this.menuOpen = false;
  }

  // ── Visibility API ──

  setControlsVisible(visible) {
    for (const el of this.controlElements) {
      el.setVisible(visible);
    }
    if (!visible) {
      // Reset joystick
      this.joystickPointerId = null;
      this.joystickThumb.setPosition(this._jx, this._jy);
      this.joystickVector.x = 0;
      this.joystickVector.y = 0;
      // Close menu popup if open
      if (this.menuOpen) this.closeMenuPopup();
    }
  }
}
