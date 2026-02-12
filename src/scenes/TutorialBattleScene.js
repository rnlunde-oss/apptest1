export class TutorialBattleScene extends Phaser.Scene {
  constructor() {
    super('TutorialBattle');
  }

  init(data) {
    this.postBattle = data?.postBattle || false;
  }

  create() {
    this.sfx = this.registry.get('soundManager');

    if (this.postBattle) {
      this.showPostBattle();
      return;
    }

    this.showPreBattle();
  }

  showPostBattle() {
    this.showDialogue([
      'The last skeleton crumbles to dust.',
      'Farmer Alan: "Thank you, Captain. I owe you my life."',
      'Alan returns to tend his farm. The road east awaits.',
    ], () => {
      this.registry.set('tutorialComplete', true);
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('Overworld');
      });
    });
  }

  showPreBattle() {
    const roster = this.registry.get('roster');
    const metz = roster.metz;

    // Reset battle state
    metz.hp = metz.maxHp;
    metz.mp = metz.maxMp;
    metz.isDefending = false;
    metz.isCharged = false;
    metz.statusEffects = [];

    // Create 4 weakened tutorial skeletons
    const enemies = [];
    for (let i = 0; i < 4; i++) {
      enemies.push(this.createTutorialSkeleton(i));
    }

    // Define Farmer Alan (temporary NPC — not in PARTY_DEFS)
    const farmerAlan = this.createFarmerAlan();

    const tutorialCallbacks = {
      onFirstEnemyKill: (battleScene) => {
        const uiScene = battleScene.scene.get('BattleUI');
        uiScene.showMessage('Farmer Alan: "I won\'t let these bones take my farm!"', () => {
          battleScene.addAllyMidBattle(farmerAlan);
        });
      },
    };

    this.showDialogue([
      'Skeletons rise from the earth around Verlan Farmstead...',
      'Captain Metz draws his sword. There is no retreat.',
    ], () => {
      this.scene.start('Battle', {
        party: [metz],
        enemies,
        xpReward: 25,
        goldReward: 20,
        enemyTypes: ['skeleton', 'skeleton', 'skeleton', 'skeleton'],
        roster: Object.values(roster),
        zone: 'farmland',
        isTutorial: true,
        tutorialCallbacks,
        onBattleEnd: (result) => this.onBattleEnd(result),
      });
    });
  }

  onBattleEnd(result) {
    const sceneManager = this.scene;
    sceneManager.stop('Battle');
    sceneManager.stop('BattleUI');
    if (result === 'win') {
      sceneManager.start('TutorialBattle', { postBattle: true });
    } else {
      // On defeat, restart the tutorial
      sceneManager.start('TutorialBattle');
    }
  }

  createTutorialSkeleton(index) {
    return {
      id: 'tut_skeleton_' + index,
      name: 'Skeleton',
      cls: 'Undead',
      color: 0xccccaa,
      maxHp: 25,
      hp: 25,
      maxMp: 0,
      mp: 0,
      baseAtk: 8,
      baseDef: 5,
      baseSpd: 6,
      get atk() { return this.baseAtk; },
      get def() { return this.baseDef; },
      get spd() { return this.baseSpd; },
      abilities: ['bone_claw', 'bone_shield'],
      aiWeights: [70, 30],
      isBoss: false,
      phase2Abilities: null,
      phase2Active: false,
      isDefending: false,
      isCharged: false,
      statusEffects: [],
    };
  }

  createFarmerAlan() {
    return {
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
  }

  showDialogue(lines, callback) {
    this.add.rectangle(400, 320, 800, 640, 0x000000);

    const textBg = this.add.rectangle(400, 520, 760, 80, 0x000000, 0.85)
      .setStrokeStyle(1, 0x886633);

    const text = this.add.text(400, 510, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffe8cc',
      align: 'center',
      wordWrap: { width: 700 },
      lineSpacing: 4,
    }).setOrigin(0.5);

    const hint = this.add.text(400, 550, '[ Press E / Space / Click ]', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#887755',
    }).setOrigin(0.5);
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });

    let idx = 0;
    let ready = false;

    const showLine = () => {
      if (idx >= lines.length) {
        // Clean up listeners before callback
        this.input.keyboard.off('keydown-E', advance);
        this.input.keyboard.off('keydown-SPACE', advance);
        this.input.off('pointerdown', advance);
        callback();
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
