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

  preload() {
    this.load.image('3cut1', 'assets/cutscenes/3CUT1.png');
    this.load.image('3cut2', 'assets/cutscenes/3CUT2.png');
    this.load.image('3cut3', 'assets/cutscenes/3CUT3.png');
    this.load.image('3cut4', 'assets/cutscenes/3CUT4.png');
    this.load.image('3cut5', 'assets/cutscenes/3CUT5.png');
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    // Black background (behind everything)
    const blackBg = this.add.rectangle(400, 320, 800, 640, 0x000000);

    // Each line maps to an image key (or null for black bg)
    const lines = [
      // Transition: black screen beat after battle
      { text: '', image: null },
      // Scene 1: Battlefield standoff (3CUT1)
      { text: 'Metz and Alan fought against the Dark Knight tirelessly, exchanging blow for blow.', image: '3cut1' },
      { text: 'Against the waning sunlight of late afternoon, the three combatants stood silently staring across the field at each other.', image: '3cut1' },
      { text: 'The eerie silence was broken by the Dark Knight\'s wretched voice, "You protect the weak, Captain. Admirable... but inefficient."', image: '3cut1' },
      { text: '"Then I will be inefficient," Metz replied. "You mistake cruelty for strength."', image: '3cut1' },
      // Scene 2: Dagvar closeup (3CUT2)
      { text: '"You call it cruelty because you cannot bear the cost. I call it correction."', image: '3cut2' },
      { text: '"Besides, if I were cruel... you would already be fighting alone."', image: '3cut2' },
      // Scene 3: Metz closeup (3CUT3)
      { text: 'For all of Metz\'s training, he had never seen a knight like this before. Where had this man come from?', image: '3cut3' },
      { text: '"Whose correction? Yours or someone else\'s?"', image: '3cut3' },
      // Scene 4: Black — Dagvar's final retort
      { text: '"Does it matter? In the end you will all kneel."', image: '3cut4' },
      // Scene 5: Black — Dark Knight attacks
      { text: 'The Dark Knight lifted his cursed blade, and from it issued a terrifying bolt of dark magic aimed at the farmer\'s family.', image: '3cut5' },
      { text: 'If he was not to have today\'s victory - no one would.', image: '3cut5' },
      { text: 'But few things command a man\'s heart more than family. It was at the last that Farmer Alan threw his body in desperate love to protect those for whom he had lived and died.', image: null },
      { text: 'Though a man may have no martial prowess, it is the strength of his spirit that commands bravery. And so the farmer absorbed the terrible magic for the sake of his wife and children.', image: null },
      // Scene 8: Alan death — black background
      { text: '"Daddy!"', image: null },
      { text: '"Papa!"', image: null },
      { text: '"Alan!"', image: null },
      { text: 'The Dark Knight grunted in both surprise and displeasure, momentarily stunned by the farmer\'s final display of valor.', image: null },
      { text: 'Metz sprung into action and charged, raising his sword for a crippling blow.', image: null },
      { text: 'Within three lunging strides, he closed the distance and brought both steel and vengeance crashing against the Dark Knight.', image: null },
      { text: '"Argh!!" Dagvar fell to the ground with a curse, aware even in that moment he had been bested.', image: null },
      { text: 'It was as Metz roared and brought his sword downward for a second and final strike, that the hooded reaper simply vanished in a plume of dark smoke; steel tasting nothing but in trodden soil.', image: null },
    ];

    // Cutscene image display (swapped per-line)
    const cutsceneImage = this.add.image(400, 320, '3cut1');
    this._scaleCover(cutsceneImage);
    cutsceneImage.setAlpha(0);
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
        this.registry.set('tutorialComplete', true);
        this.cameras.main.fadeOut(600, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('Overworld', { playerPos: { x: 5 * 32 + 16, y: 190 * 32 + 16 } });
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
