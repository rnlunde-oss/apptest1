// News of Atikesh Cutscene — triggered when party returns to Fort Bracken
// after defeating Vampirling Hal to report about Atikesh

export class NewsOfAtikeshCutscene extends Phaser.Scene {
  constructor() {
    super('NewsOfAtikeshCutscene');
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    // Black background
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const lines = [
      { text: 'As the party entered the garrison hall, they beheld the banners of House Savora \u2014 azure and silver \u2014 draped beside the standards of Fort Bracken.', image: null },
      { text: 'Sivin: "Hail, Captain Metz. I am Sivin of House Savora. Captain Tertullian has told me of your efforts in the catacombs."', image: null },
      { text: 'Metz: "Aye, my lord Sivin. The catacombs are cleared. The vampirling who led the incursion will trouble you no longer."', image: null },
      { text: 'Metz threw Hal\'s dismembered head onto the ground for good measure.', image: null },
      { text: 'Captain Tertullian: "A vampire?"', image: null },
      { text: 'Metz: "Indeed. He is to be of no more trouble to you."', image: null },
      { text: 'Sivin: "You have done us a great service, Captain. Fort Bracken is in your debt."', image: null },
      { text: 'Metz: "There is more you should know, my lord."', image: null },
      { text: 'Sivin: "Oh?"', image: null },
      { text: 'Metz: "There is a greater evil at work\u2026 a vampire lord. The creature named his master: Atikesh."', image: null },
      { text: 'Captain Tertullian: "Atikesh?"', image: null },
      { text: 'Metz: "Indeed. Is such a name known to any of you?"', image: null },
      { text: 'Sivin: "To my knowledge\u2026 no. But that does not ease my mind."', image: null },
      { text: 'Captain Tertullian: "We shall search the city records and send word to the capital. If this Atikesh has been heard of before, we will find it."', image: null },
      { text: 'Metz: "Thank you."', image: null },
      { text: 'Sivin: "Captain Metz. Given that you and your party have proven your\u2026 exceptional abilities, I would ask something further of you."', image: null },
      { text: 'Metz: "I speak only for myself but \u2013"', image: null },
      { text: 'Rivin: "Nay, he speaks for us all." Lyra: "Aye." Rickets grunted in agreement.', image: null },
      { text: 'Metz: "\u2026 we would be honored, my lord."', image: null },
      { text: 'Sivin: "Perfect. Captain Tertullian shall instruct you further. Rest well tonight \u2014 I suspect you will need it."', image: null },
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
          const savedPos = this.registry.get('newsOfAtikeshPlayerPos');
          this.scene.start('Overworld', { fromNewsOfAtikesh: true, playerPos: savedPos });
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
