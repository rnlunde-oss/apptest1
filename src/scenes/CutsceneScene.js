export class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('Cutscene');
  }

  preload() {
    this.load.image('cut1', 'assets/cutscenes/1CUT1.png');
    this.load.image('cut2', 'assets/cutscenes/1CUT2.png');
    this.load.image('cut3', 'assets/cutscenes/1CUT3.png');
  }

  create() {
    this.slides = [
      {
        imageKey: 'cut1',
        text: 'Captain Metz rode eastwards. Under the command of King Dandaron he had been tasked with the defense of the Eastern frontier. News was spreading of an evil rising, the likes of which had never been seen by the world of men before.',
      },
      {
        imageKey: 'cut2',
        text: 'Casting his eyes upwards toward the horizon, Metz could make out the disaster ahead...',
      },
      {
        imageKey: 'cut3',
        text: '...a hamlet already aflame. Metz hastened towards the disaster.',
      },
    ];
    this.slideIndex = 0;
    this.transitioning = false;

    // Image display (centered, scaled to cover viewport)
    this.slideImage = this.add.image(400, 320, this.slides[0].imageKey);
    this.scaleImageToCover(this.slideImage);

    // Semi-transparent text box at bottom
    this.textBg = this.add.rectangle(400, 580, 760, 90, 0x000000, 0.7);

    this.slideText = this.add.text(400, 580, this.slides[0].text, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 720 },
      lineSpacing: 4,
    }).setOrigin(0.5);

    // Advance prompt
    this.promptText = this.add.text(400, 620, '[ Press E / Space / Click to continue ]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5);

    // Fade in from black
    this.cameras.main.fadeIn(800, 0, 0, 0);

    // Input: advance
    this.input.keyboard.on('keydown-E', this.advance, this);
    this.input.keyboard.on('keydown-SPACE', this.advance, this);
    this.input.on('pointerdown', this.advance, this);

    // Input: skip
    this.input.keyboard.on('keydown-ESC', this.skipToOverworld, this);
  }

  scaleImageToCover(image) {
    const scaleX = 800 / image.width;
    const scaleY = 640 / image.height;
    const scale = Math.max(scaleX, scaleY);
    image.setScale(scale);
  }

  advance() {
    if (this.transitioning) return;

    this.slideIndex++;

    if (this.slideIndex >= this.slides.length) {
      this.goToOverworld();
      return;
    }

    this.transitioning = true;
    this.cameras.main.fadeOut(400, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      const slide = this.slides[this.slideIndex];
      this.slideImage.setTexture(slide.imageKey);
      this.scaleImageToCover(this.slideImage);
      this.slideText.setText(slide.text);

      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.cameras.main.once('camerafadeincomplete', () => {
        this.transitioning = false;
      });
    });
  }

  skipToOverworld() {
    if (this.transitioning) return;
    this.goToOverworld();
  }

  goToOverworld() {
    this.transitioning = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (!this.registry.get('tutorialComplete')) {
        this.scene.start('TutorialBattle');
      } else {
        this.scene.start('Overworld');
      }
    });
  }
}
