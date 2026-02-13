export class PostTutorialCutscene extends Phaser.Scene {
  constructor() {
    super('PostTutorialCutscene');
  }

  preload() {
    this.load.image('2cut2', 'assets/cutscenes/2CUT2.png');
    this.load.image('2cut3', 'assets/cutscenes/2CUT3.png');
    this.load.image('2cut4', 'assets/cutscenes/2CUT4.png');
    this.load.image('2cut5', 'assets/cutscenes/2CUT5.png');
    this.load.image('2cut6', 'assets/cutscenes/2CUT6.png');
    this.load.image('2cut7', 'assets/cutscenes/2CUT7.png');
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    this.slides = [
      {
        imageKey: '2cut2',
        text: 'The battle rages on. Metz and Alan fight side by side against the undead horde.',
      },
      {
        imageKey: '2cut3',
        text: "Metz's blade carves through bone and shadow. The skeletons fall, but more keep rising.",
      },
      {
        imageKey: '2cut4',
        text: 'Alan: "My family! They\'re still at the farmhouse!"',
      },
      {
        imageKey: '2cut5',
        text: "Alan's wife and children cower as the undead close in on the burning homestead.",
      },
      {
        imageKey: '2cut6',
        text: 'Alan: "Get behind me! I won\'t let them touch you!"',
      },
      {
        imageKey: '2cut7',
        text: 'A dark figure emerges from the cursed mist. Lieutenant Dagvar, commander of the undead vanguard.',
      },
    ];
    this.slideIndex = 0;
    this.transitioning = false;

    // Image display
    this.slideImage = this.add.image(400, 320, this.slides[0].imageKey);
    this.scaleImageToCover(this.slideImage);

    // Text box
    this.textBg = this.add.rectangle(400, 580, 760, 90, 0x000000, 0.7);
    this.slideText = this.add.text(400, 580, this.slides[0].text, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 720 },
      lineSpacing: 4,
    }).setOrigin(0.5);

    this.promptText = this.add.text(400, 620, '[ Press E / Space / Click to continue ]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#aaaaaa',
      align: 'center',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(800, 0, 0, 0);

    this.input.keyboard.on('keydown-E', this.advance, this);
    this.input.keyboard.on('keydown-SPACE', this.advance, this);
    this.input.on('pointerdown', this.advance, this);
  }

  scaleImageToCover(image) {
    const scaleX = 800 / image.width;
    const scaleY = 640 / image.height;
    image.setScale(Math.max(scaleX, scaleY));
  }

  advance() {
    if (this.transitioning) return;
    if (this.sfx) this.sfx.playDialogueAdvance();

    this.slideIndex++;

    if (this.slideIndex >= this.slides.length) {
      this.startDagvarBattle();
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

  startDagvarBattle() {
    this.transitioning = true;
    this.cameras.main.fadeOut(600, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      const roster = this.registry.get('roster');
      const metz = roster.metz;

      // Reset Metz for the boss fight
      metz.hp = metz.maxHp;
      metz.mp = metz.maxMp;
      metz.isDefending = false;
      metz.isCharged = false;
      metz.statusEffects = [];

      // Create Farmer Alan for the boss fight
      const farmerAlan = {
        id: 'farmer_alan',
        name: 'Farmer Alan',
        cls: 'Farmer',
        color: 0x88aa44,
        level: 2,
        maxHp: 50,
        hp: 50,
        maxMp: 0,
        mp: 0,
        baseMaxHp: 50,
        baseMaxMp: 0,
        baseAtk: 13,
        baseDef: 10,
        baseSpd: 8,
        get atk() { return this.baseAtk; },
        get def() { return this.baseDef; },
        get spd() { return this.baseSpd; },
        learnedAbilities: ['alan_pitchfork', 'alan_defend'],
        activeAbilities: ['alan_pitchfork', 'alan_defend'],
        get abilities() { return this.activeAbilities; },
        equipment: {},
        isDefending: false,
        isCharged: false,
        statusEffects: [],
      };

      // Create Lieutenant Dagvar (weakened tutorial version)
      const dagvar = {
        id: 'dagvar',
        name: 'Lt. Dagvar',
        cls: 'Boss',
        color: 0x553322,
        maxHp: 120,
        hp: 120,
        maxMp: 0,
        mp: 0,
        baseAtk: 14,
        baseDef: 12,
        baseSpd: 8,
        get atk() { return this.baseAtk; },
        get def() { return this.baseDef; },
        get spd() { return this.baseSpd; },
        abilities: ['dagvar_cleave', 'dagvar_crush', 'dagvar_guard'],
        aiWeights: [45, 30, 25],
        isBoss: true,
        phase2Abilities: ['dagvar_darkslash'],
        phase2Active: false,
        isDefending: false,
        isCharged: false,
        statusEffects: [],
      };

      this.scene.start('Battle', {
        party: [metz, farmerAlan],
        enemies: [dagvar],
        xpReward: 60,
        goldReward: 50,
        enemyTypes: ['dagvar'],
        roster: Object.values(roster),
        zone: 'farmland',
        isBossEncounter: true,
        isTutorial: true,
        onBattleEnd: (result) => this.onBattleEnd(result),
      });
    });
  }

  onBattleEnd(result) {
    this.scene.stop('Battle');
    this.scene.stop('BattleUI');

    if (result === 'win') {
      this.scene.start('PostTutorialCutscene_Victory');
    } else {
      // On defeat, restart from the Dagvar battle
      this.scene.start('PostTutorialCutscene_Defeat');
    }
  }
}

// Small scene for post-Dagvar victory dialogue
export class PostTutorialVictory extends Phaser.Scene {
  constructor() {
    super('PostTutorialCutscene_Victory');
  }

  create() {
    this.sfx = this.registry.get('soundManager');
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const lines = [
      'Dagvar staggers back, his dark armor cracking.',
      'Dagvar: "This... changes nothing. The dead do not rest, Captain."',
      'The lieutenant retreats into the cursed mist.',
      'Alan collapses to his knees. Dark veins spread from a wound in his side.',
      'Metz: "Alan! Stay with me—"',
      'Alan: "It\'s too late, Captain. The poison... from his blade."',
      'A boy runs from the farmhouse. Makar, Alan\'s son.',
      'Makar: "Papa! Papa, get up!"',
      'Alan: "Makar... be brave, son. Be brave for your mother."',
      'Alan: "Captain... promise me. Promise me you\'ll look after him."',
      'Metz: "I swear it, Alan. On my life."',
      'Alan smiles. His hand goes still. Farmer Alan is dead.',
      'Makar sobs against his father\'s chest. Metz kneels beside them.',
      'Metz: "...I won\'t let this be for nothing."',
      'Metz: "The frontier must be secured. There are towns east that still stand."',
      'Metz stands, gripping his sword. The road ahead is long.',
    ];

    let idx = 0;
    let ready = false;

    const textBg = this.add.rectangle(400, 520, 760, 80, 0x000000, 0.85)
      .setStrokeStyle(1, 0x886633);
    const text = this.add.text(400, 510, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffe8cc',
      align: 'center', wordWrap: { width: 700 }, lineSpacing: 4,
    }).setOrigin(0.5);
    const hint = this.add.text(400, 550, '[ Press E / Space / Click ]', {
      fontFamily: 'monospace', fontSize: '10px', color: '#887755',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    const showLine = () => {
      if (idx >= lines.length) {
        this.input.keyboard.off('keydown-E', advance);
        this.input.keyboard.off('keydown-SPACE', advance);
        this.input.off('pointerdown', advance);
        this.registry.set('tutorialComplete', true);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Overworld');
        });
        return;
      }
      text.setText(lines[idx]);
      idx++;
    };
    showLine();

    const advance = () => {
      if (!ready) return;
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
}

// Small scene for retry on defeat
export class PostTutorialDefeat extends Phaser.Scene {
  constructor() {
    super('PostTutorialCutscene_Defeat');
  }

  create() {
    this.sfx = this.registry.get('soundManager');
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const text = this.add.text(400, 300, 'Dagvar proved too strong...', {
      fontFamily: 'monospace', fontSize: '16px', color: '#cc6666',
      align: 'center',
    }).setOrigin(0.5);

    const hint = this.add.text(400, 340, '[ Press any key to retry ]', {
      fontFamily: 'monospace', fontSize: '11px', color: '#887755',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    this.time.delayedCall(500, () => {
      this.input.keyboard.once('keydown', () => {
        this.scene.start('PostTutorialCutscene');
      });
      this.input.once('pointerdown', () => {
        this.scene.start('PostTutorialCutscene');
      });
    });
  }
}
