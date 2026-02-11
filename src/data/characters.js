// Character definitions — Defense of Rhaud
// All 7 roster members and enemy templates

import { EQUIPMENT } from './equipment.js';
import { SUBCLASS_GAINS } from './subclasses.js';

export const PARTY_DEFS = {
  metz: {
    id: 'metz',
    name: 'Cpt. Metz',
    title: 'Commander of the Eastern Watch',
    cls: 'Commander',
    color: 0xcc2222,
    maxHp: 70,
    maxMp: 30,
    atk: 15,
    def: 14,
    spd: 11,
    abilities: ['metz_attack', 'rallying_cry', 'defensive_stance', 'tactical_strike'],
    desc: 'A seasoned officer sworn to defend the Kingdom of Rhaud.',
    alwaysActive: true,    // Metz can never be benched
    recruited: true,       // starts in party
  },
  rivin: {
    id: 'rivin',
    name: 'Rivin',
    title: 'Sellsword of the Border',
    cls: 'Warrior',
    color: 0xbb6622,
    maxHp: 80,
    maxMp: 20,
    atk: 18,
    def: 15,
    spd: 8,
    abilities: ['rivin_attack', 'heavy_slash', 'block', 'charge'],
    desc: 'A grizzled mercenary who fights for coin — and survival.',
    alwaysActive: false,
    recruited: false,
  },
  lyra: {
    id: 'lyra',
    name: 'Lyra',
    title: 'Frontier Ranger',
    cls: 'Ranger',
    color: 0x228833,
    maxHp: 55,
    maxMp: 35,
    atk: 14,
    def: 9,
    spd: 16,
    abilities: ['bow_shot', 'poison_arrow', 'evasive_roll', 'herb_remedy'],
    desc: 'A sharp-eyed ranger who knows the wilds.',
    alwaysActive: false,
    recruited: false,
  },
  fenton: {
    id: 'fenton',
    name: 'Fenton',
    title: 'Tracker of the March',
    cls: 'Ranger',
    color: 0x557733,
    maxHp: 58,
    maxMp: 30,
    atk: 13,
    def: 10,
    spd: 14,
    abilities: ['hunting_knife', 'snare_trap', 'mark_prey', 'double_shot'],
    desc: 'A quiet hunter who reads trails like scripture.',
    alwaysActive: false,
    recruited: false,
  },
  rickets: {
    id: 'rickets',
    name: 'Rickets',
    title: 'Itinerant Wizard',
    cls: 'Wizard',
    color: 0x5544aa,
    maxHp: 40,
    maxMp: 50,
    atk: 17,
    def: 6,
    spd: 12,
    abilities: ['arcane_bolt', 'fireball', 'wildfire', 'mana_shield'],
    desc: 'An eccentric mage with volatile spells.',
    alwaysActive: false,
    recruited: false,
  },
  hyla: {
    id: 'hyla',
    name: 'Hyla',
    title: 'War Mage',
    cls: 'Wizard',
    color: 0x8844cc,
    maxHp: 42,
    maxMp: 48,
    atk: 16,
    def: 7,
    spd: 13,
    abilities: ['frost_spike', 'thunder_strike', 'frozen_chains', 'war_barrier'],
    desc: 'Trained in the Danath war-colleges. Precise and lethal.',
    alwaysActive: false,
    recruited: false,
  },
  anuel: {
    id: 'anuel',
    name: 'Anuel',
    title: 'Wandering Priestess',
    cls: 'Priest',
    color: 0xddddaa,
    maxHp: 48,
    maxMp: 45,
    atk: 10,
    def: 11,
    spd: 10,
    abilities: ['holy_strike', 'heal', 'blessing', 'smite'],
    desc: 'A healer who follows the old light. Soft-spoken, iron-willed.',
    alwaysActive: false,
    recruited: false,
  },
};

export const ENEMY_DEFS = {
  skeleton: {
    id: 'skeleton',
    name: 'Skeleton',
    cls: 'Undead',
    color: 0xccccaa,
    maxHp: 40,
    maxMp: 0,
    atk: 12,
    def: 8,
    spd: 9,
    abilities: ['bone_claw', 'bone_shield', 'bone_rattle'],
    // AI weights: index corresponds to ability, higher = more likely
    aiWeights: [50, 25, 25],
    desc: 'Reanimated bones held together by dark magic.',
  },
  zombie: {
    id: 'zombie',
    name: 'Zombie',
    cls: 'Undead',
    color: 0x556644,
    maxHp: 60,
    maxMp: 0,
    atk: 14,
    def: 6,
    spd: 4,
    abilities: ['slam', 'rotting_grasp', 'zombie_bite'],
    aiWeights: [35, 40, 25],
    desc: 'A shambling corpse driven by necromantic will.',
  },
  wraith: {
    id: 'wraith',
    name: 'Wraith',
    cls: 'Spirit',
    color: 0x8866cc,
    maxHp: 50,
    maxMp: 20,
    atk: 16,
    def: 7,
    spd: 14,
    abilities: ['spectral_slash', 'soul_drain', 'wail'],
    aiWeights: [40, 35, 25],
    desc: 'A vengeful spirit bound to the cursed lands.',
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    cls: 'Caster',
    color: 0x442266,
    maxHp: 45,
    maxMp: 40,
    atk: 14,
    def: 8,
    spd: 10,
    abilities: ['dark_bolt', 'raise_dead', 'dark_pact'],
    aiWeights: [40, 30, 30],
    desc: 'A dark mage who commands the dead.',
  },
  dark_knight: {
    id: 'dark_knight',
    name: 'Dark Knight',
    cls: 'Armored',
    color: 0x334455,
    maxHp: 75,
    maxMp: 10,
    atk: 20,
    def: 16,
    spd: 6,
    abilities: ['cursed_blade', 'shadow_guard', 'dark_charge'],
    aiWeights: [50, 25, 25],
    desc: 'A heavily armored warrior corrupted by dark magic.',
  },
  cursed_archer: {
    id: 'cursed_archer',
    name: 'Cursed Archer',
    cls: 'Ranged',
    color: 0x665544,
    maxHp: 48,
    maxMp: 15,
    atk: 15,
    def: 8,
    spd: 13,
    abilities: ['cursed_arrow', 'volley', 'crippling_shot'],
    aiWeights: [40, 30, 30],
    desc: 'A sharpshooter wielding cursed ammunition.',
  },
  atikesh: {
    id: 'atikesh',
    name: 'Atikesh',
    cls: 'Boss',
    color: 0x880044,
    maxHp: 250,
    maxMp: 80,
    atk: 22,
    def: 18,
    spd: 12,
    abilities: ['necrotic_blast', 'life_siphon', 'summon_shield'],
    aiWeights: [40, 35, 25],
    isBoss: true,
    phase2Abilities: ['dark_wave', 'doom_curse', 'undying_will'],
    desc: 'The Necromancer Lord. Master of the cursed lands.',
  },
};

// ──── Equipment helpers ────

export function getEquipmentBonus(character, stat) {
  if (!character.equipment) return 0;
  let total = 0;
  for (const slot of Object.keys(character.equipment)) {
    const itemId = character.equipment[slot];
    if (!itemId) continue;
    const item = EQUIPMENT[itemId];
    if (!item) continue;
    // Base item stats
    total += item.stats[stat] || 0;
    // Class bonus
    if (item.classBonus && item.classBonus[character.cls]) {
      total += item.classBonus[character.cls][stat] || 0;
    }
  }
  return total;
}

export function equipItem(character, itemId, inventory) {
  const item = EQUIPMENT[itemId];
  if (!item) return;

  const slot = item.slot;
  const oldItemId = character.equipment[slot];

  // Remove item from inventory
  const idx = inventory.indexOf(itemId);
  if (idx === -1) return;
  inventory.splice(idx, 1);

  // If there's already something equipped, return it to inventory
  if (oldItemId) {
    inventory.push(oldItemId);
  }

  // Equip the new item
  character.equipment[slot] = itemId;

  // Recalculate maxHp/maxMp from equipment
  recalcMaxHpMp(character);
}

export function unequipItem(character, slot, inventory) {
  const itemId = character.equipment[slot];
  if (!itemId) return;

  inventory.push(itemId);
  character.equipment[slot] = null;

  // Recalculate maxHp/maxMp from equipment
  recalcMaxHpMp(character);
}

function recalcMaxHpMp(character) {
  // Store base values on first call
  if (character.baseMaxHp == null) {
    character.baseMaxHp = character.maxHp;
  }
  if (character.baseMaxMp == null) {
    character.baseMaxMp = character.maxMp;
  }
  const hpBonus = getEquipmentBonus(character, 'hp');
  const mpBonus = getEquipmentBonus(character, 'mp');
  character.maxHp = character.baseMaxHp + hpBonus;
  character.maxMp = character.baseMaxMp + mpBonus;
  // Clamp current values
  if (character.hp > character.maxHp) character.hp = character.maxHp;
  if (character.mp > character.maxMp) character.mp = character.maxMp;
}

// Create a battle-ready character instance from a definition
export function createCharacter(def, level = 1) {
  const scale = 1 + (level - 1) * 0.08;
  const maxHp = Math.floor(def.maxHp * scale);
  const maxMp = Math.floor(def.maxMp * scale);

  return {
    id: def.id,
    name: def.name,
    cls: def.cls,
    color: def.color,
    level,
    xp: 0,
    xpToNext: getXPForLevel(level + 1),
    maxHp,
    hp: maxHp,
    maxMp,
    mp: maxMp,
    baseMaxHp: maxHp,
    baseMaxMp: maxMp,
    baseAtk: Math.floor(def.atk * scale),
    baseDef: Math.floor(def.def * scale),
    baseSpd: Math.floor(def.spd * scale),
    get atk() { return this.baseAtk + getEquipmentBonus(this, 'atk'); },
    get def() { return this.baseDef + getEquipmentBonus(this, 'def'); },
    get spd() { return this.baseSpd + getEquipmentBonus(this, 'spd'); },
    // Ability system — activeAbilities is what's used in battle
    learnedAbilities: [...def.abilities],
    activeAbilities: [...def.abilities],
    get abilities() { return this.activeAbilities; },
    // Subclass & talent system
    subclass: null,
    talentPoints: 0,
    talentsPurchased: [],
    alwaysActive: def.alwaysActive || false,
    active: def.alwaysActive || false,   // whether in the active battle party
    recruited: def.recruited || false,
    // Equipment slots
    equipment: {
      helmet: null,
      shoulderpads: null,
      gloves: null,
      breastplate: null,
      greaves: null,
      boots: null,
      belt: null,
      rightHand: null,
      leftHand: null,
    },
    // Battle state (reset each battle)
    isDefending: false,
    isCharged: false,
    statusEffects: [],   // { type, stat, amount, turnsLeft, label }
  };
}

// Create an enemy instance (no XP/level concerns)
export function createEnemy(defKey) {
  const def = ENEMY_DEFS[defKey];
  if (!def) throw new Error(`Unknown enemy: ${defKey}`);
  return {
    id: def.id + '_' + Math.random().toString(36).slice(2, 6),
    name: def.name,
    cls: def.cls,
    color: def.color,
    maxHp: def.maxHp,
    hp: def.maxHp,
    maxMp: def.maxMp,
    mp: def.maxMp,
    baseAtk: def.atk,
    baseDef: def.def,
    baseSpd: def.spd,
    get atk() { return this.baseAtk; },
    get def() { return this.baseDef; },
    get spd() { return this.baseSpd; },
    abilities: [...def.abilities],
    aiWeights: def.aiWeights ? [...def.aiWeights] : null,
    isBoss: def.isBoss || false,
    phase2Abilities: def.phase2Abilities ? [...def.phase2Abilities] : null,
    phase2Active: false,
    isDefending: false,
    isCharged: false,
    statusEffects: [],
  };
}

// ──── XP / Leveling ────

function getXPForLevel(level) {
  // XP needed to reach this level: 30 * level^1.5
  return Math.floor(30 * Math.pow(level, 1.5));
}

// Award XP to a character. Returns { leveled, newLevel } if they leveled up.
export function awardXP(character, amount) {
  character.xp += amount;
  let leveled = false;

  while (character.xp >= character.xpToNext) {
    character.xp -= character.xpToNext;
    character.level++;
    character.xpToNext = getXPForLevel(character.level + 1);
    applyLevelUp(character);
    leveled = true;
  }

  return { leveled, newLevel: character.level };
}

function applyLevelUp(character) {
  // Award 1 talent point per level from level 2+
  character.talentPoints += 1;

  // Use subclass gains if subclass is chosen, otherwise base class gains
  let gains;
  if (character.subclass && SUBCLASS_GAINS[character.subclass]) {
    gains = SUBCLASS_GAINS[character.subclass];
  } else {
    gains = LEVEL_UP_GAINS[character.cls] || LEVEL_UP_GAINS.default;
  }

  character.baseMaxHp += gains.hp;
  character.maxHp = character.baseMaxHp + getEquipmentBonus(character, 'hp');
  character.hp = character.maxHp;   // full heal on level up
  character.baseMaxMp += gains.mp;
  character.maxMp = character.baseMaxMp + getEquipmentBonus(character, 'mp');
  character.mp = character.maxMp;
  character.baseAtk += gains.atk;
  character.baseDef += gains.def;
  character.baseSpd += gains.spd;
}

const LEVEL_UP_GAINS = {
  Commander: { hp: 6, mp: 3, atk: 2, def: 2, spd: 1 },
  Warrior:  { hp: 8, mp: 2, atk: 3, def: 2, spd: 1 },
  Ranger:   { hp: 5, mp: 3, atk: 2, def: 1, spd: 2 },
  Wizard:   { hp: 3, mp: 5, atk: 3, def: 1, spd: 1 },
  Priest:   { hp: 4, mp: 5, atk: 1, def: 1, spd: 1 },
  default:  { hp: 5, mp: 3, atk: 2, def: 1, spd: 1 },
};

// ──── Subclass / Talent / Loadout Helpers ────

export function chooseSubclass(character, subclassKey) {
  character.subclass = subclassKey;
}

export function setActiveAbility(character, slotIndex, abilityKey) {
  if (slotIndex < 0 || slotIndex >= 4) return false;
  if (!character.learnedAbilities.includes(abilityKey)) return false;
  character.activeAbilities[slotIndex] = abilityKey;
  return true;
}

// Zone-based encounter tables
export const ENCOUNTER_TABLES = {
  cursed: [  // tile 2 — existing area
    { enemies: ['skeleton', 'skeleton'], weight: 25, xp: 20, gold: 18 },
    { enemies: ['skeleton', 'skeleton', 'skeleton'], weight: 20, xp: 35, gold: 30 },
    { enemies: ['zombie', 'skeleton'], weight: 20, xp: 30, gold: 25 },
    { enemies: ['zombie'], weight: 15, xp: 18, gold: 15 },
    { enemies: ['zombie', 'zombie'], weight: 10, xp: 40, gold: 35 },
    { enemies: ['skeleton', 'skeleton', 'zombie', 'skeleton'], weight: 10, xp: 50, gold: 40 },
  ],
  deep: [  // tile 9 — harder zone
    { enemies: ['wraith', 'wraith'], weight: 20, xp: 45, gold: 40 },
    { enemies: ['dark_knight', 'cursed_archer'], weight: 20, xp: 50, gold: 45 },
    { enemies: ['necromancer', 'skeleton', 'skeleton'], weight: 15, xp: 55, gold: 50 },
    { enemies: ['wraith', 'cursed_archer', 'skeleton'], weight: 15, xp: 55, gold: 48 },
    { enemies: ['dark_knight', 'necromancer'], weight: 10, xp: 60, gold: 55 },
    { enemies: ['wraith', 'dark_knight', 'cursed_archer', 'necromancer'], weight: 5, xp: 90, gold: 80 },
  ],
  boss: [  // tile 10 — boss fight
    { enemies: ['atikesh', 'dark_knight', 'necromancer'], weight: 100, xp: 200, gold: 300 },
  ],
};

// Backward compat
export const ENCOUNTER_TABLE = ENCOUNTER_TABLES.cursed;
