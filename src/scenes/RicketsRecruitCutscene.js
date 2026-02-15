// Rickets Recruit Cutscene — triggered after winning the skeleton battle at Rickets' hut
// Party meets Rickets properly and he joins

export class RicketsRecruitCutscene extends Phaser.Scene {
  constructor() {
    super('RicketsRecruitCutscene');
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    // Black background
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const lines = [
      { text: 'Rickets: "Huh? You\'re not dead\u2026"', image: null },
      { text: 'Rivin: "Not yet, anyways."', image: null },
      { text: 'Rickets: "Coulda sworn everything living this side of the river was gone."', image: null },
      { text: 'Metz: "Just about. You\'re the only one we\'ve found still breathing."', image: null },
      { text: 'Rickets: "And breathe I will! I may be old, but I ain\'t dead!"', image: null },
      { text: 'Lyra: "Who are you?"', image: null },
      { text: 'Rivin: "It\'s Rickets! The crazy old loon."', image: null },
      { text: 'Rickets: "Loon?! Respect your elders, young man."', image: null },
      { text: 'Metz: "You\'re a trained wizard, sir."', image: null },
      { text: 'Rickets: "Aye. Though not well-liked. I\'ve been on my own for decades ever since that damned Academy discredited my work."', image: null },
      { text: 'Metz: "I see\u2026 I\'m guessing this is your work?"', image: null },
      { text: 'Rickets: "Part of it, anyways."\nRickets smirks.', image: null },
      { text: 'Metz: "You\'d be welcome to join us. I am Captain Metz."', image: null },
      { text: 'Lyra: "And I\'m Lyra."', image: null },
      { text: 'Rivin: "And I\'m your mother\'s lover!"', image: null },
      { text: 'Rickets: "Why I oughtta!"', image: null },
      { text: '[ Rickets the Wizard has joined your party! ]', image: null },
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
          const savedPos = this.registry.get('ricketsRecruitPlayerPos');
          this.scene.start('Overworld', { fromRicketsRecruit: true, playerPos: savedPos });
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
