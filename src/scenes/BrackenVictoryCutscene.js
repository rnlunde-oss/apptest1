// Bracken Victory Cutscene — triggered after defeating the Skeletal Captain
// Uses black placeholder images (to be replaced with art later)

export class BrackenVictoryCutscene extends Phaser.Scene {
  constructor() {
    super('BrackenVictoryCutscene');
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    // Black background
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const lines = [
      { text: 'As Metz and his band struck down the skeletal forces, a horn was blown from the fort and the gates were opened.', image: null },
      { text: 'The remaining forces of Fort Bracken poured out and flanked the besiegers, cutting down the dead for a final burial.', image: null },
      { text: 'When the din of swords and shields finally died with the skeletons. A cheer rang out from both inside and outside the small keep.', image: null },
    ];

    // Cutscene image (hidden when null — black bg shows through)
    const cutsceneImage = this.add.image(400, 320, '__DEFAULT').setVisible(false);
    let currentImageKey = null;

    let idx = 0;
    let ready = false;
    let transitioning = false;

    const textBg = this.add.rectangle(400, 520, 760, 80, 0x000000, 0.85)
      .setStrokeStyle(1, 0x886633);
    const dialogueText = this.add.text(400, 510, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffe8cc',
      align: 'center', wordWrap: { width: 700 }, lineSpacing: 4,
    }).setOrigin(0.5);
    const hint = this.add.text(400, 550, '[ Press E / Space / Click ]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#887755',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    const setTextVisible = (visible) => {
      textBg.setVisible(visible);
      dialogueText.setVisible(visible);
      hint.setVisible(visible);
    };

    const applyLine = (line) => {
      if (line.text) {
        setTextVisible(true);
        dialogueText.setText(line.text);
      } else {
        setTextVisible(false);
      }
      idx++;
    };

    const showLine = () => {
      if (idx >= lines.length) {
        this.input.keyboard.off('keydown-E', advance);
        this.input.keyboard.off('keydown-SPACE', advance);
        this.input.off('pointerdown', advance);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          const savedPos = this.registry.get('brackenVictoryPlayerPos');
          this.scene.start('Overworld', { fromBrackenVictory: true, playerPos: savedPos });
        });
        return;
      }

      const line = lines[idx];
      const needsImageChange = line.image !== currentImageKey;

      if (needsImageChange) {
        transitioning = true;
        this.tweens.add({
          targets: cutsceneImage,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            currentImageKey = line.image;
            if (line.image) {
              cutsceneImage.setTexture(line.image);
              this._scaleCover(cutsceneImage);
              cutsceneImage.setVisible(true);
              this.tweens.add({
                targets: cutsceneImage,
                alpha: 1,
                duration: 400,
                onComplete: () => {
                  applyLine(line);
                  transitioning = false;
                },
              });
            } else {
              cutsceneImage.setVisible(false);
              applyLine(line);
              transitioning = false;
            }
          },
        });
        return;
      }

      applyLine(line);
    };
    showLine();

    const advance = () => {
      if (!ready || transitioning) return;
      if (this.sfx) this.sfx.playDialogueAdvance();
      showLine();
    };

    this.time.delayedCall(200, () => {
      ready = true;
      this.input.keyboard.on('keydown-E', advance);
      this.input.keyboard.on('keydown-SPACE', advance);
      this.input.on('pointerdown', advance);
    });
  }

  _scaleCover(image) {
    const scaleX = 800 / image.width;
    const scaleY = 640 / image.height;
    image.setScale(Math.max(scaleX, scaleY));
  }
}
