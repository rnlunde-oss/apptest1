// Talent tree definitions — Defense of Rhaud
// Each class has shared class talents + subclass-specific talents
// Talent node: { id, type: 'passive'|'ability', stat?, amount?, abilityKey?, cost: 1, levelReq, name, desc }
// Characters earn 1 talent point per level starting at level 2

import { ABILITIES } from './abilities.js';
import { SUBCLASSES } from './subclasses.js';

export const TALENT_TREES = {
  Commander: {
    shared: [
      { id: 'cmd_hp1', type: 'passive', stat: 'hp', amount: 8, cost: 1, levelReq: 2, name: 'Vitality I', desc: '+8 Max HP' },
      { id: 'cmd_atk1', type: 'passive', stat: 'atk', amount: 2, cost: 1, levelReq: 2, name: 'Authority I', desc: '+2 ATK' },
      { id: 'cmd_def1', type: 'passive', stat: 'def', amount: 2, cost: 1, levelReq: 3, name: 'Fortitude I', desc: '+2 DEF' },
      { id: 'cmd_mp1', type: 'passive', stat: 'mp', amount: 5, cost: 1, levelReq: 3, name: 'Willpower I', desc: '+5 Max MP' },
      { id: 'cmd_spd1', type: 'passive', stat: 'spd', amount: 2, cost: 1, levelReq: 4, name: 'Decisive I', desc: '+2 SPD' },
      { id: 'cmd_hp2', type: 'passive', stat: 'hp', amount: 12, cost: 1, levelReq: 6, name: 'Vitality II', desc: '+12 Max HP' },
      { id: 'cmd_atk2', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 7, name: 'Authority II', desc: '+3 ATK' },
    ],
    warlord: [
      { id: 'wl_ab1', type: 'ability', abilityKey: 'warlord_warcry', cost: 1, levelReq: 5, name: 'War Cry', desc: 'Learn War Cry — Boosts party ATK and SPD.' },
      { id: 'wl_atk1', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 6, name: 'Aggression', desc: '+3 ATK' },
      { id: 'wl_ab2', type: 'ability', abilityKey: 'warlord_onslaught', cost: 1, levelReq: 7, name: 'Onslaught', desc: 'Learn Onslaught — Furious all-out assault.' },
      { id: 'wl_spd1', type: 'passive', stat: 'spd', amount: 3, cost: 1, levelReq: 8, name: 'Momentum', desc: '+3 SPD' },
      { id: 'wl_ab3', type: 'ability', abilityKey: 'warlord_inspire', cost: 1, levelReq: 9, name: 'Inspire', desc: 'Learn Inspire — Boosts party SPD.' },
    ],
    tactician: [
      { id: 'tac_ab1', type: 'ability', abilityKey: 'tactician_expose', cost: 1, levelReq: 5, name: 'Expose Weakness', desc: 'Learn Expose Weakness — Lowers enemy stats.' },
      { id: 'tac_def1', type: 'passive', stat: 'def', amount: 3, cost: 1, levelReq: 6, name: 'Reinforcement', desc: '+3 DEF' },
      { id: 'tac_ab2', type: 'ability', abilityKey: 'tactician_bulwark', cost: 1, levelReq: 7, name: 'Bulwark', desc: 'Learn Bulwark — Shields the entire party.' },
      { id: 'tac_mp1', type: 'passive', stat: 'mp', amount: 8, cost: 1, levelReq: 8, name: 'Strategic Mind', desc: '+8 Max MP' },
      { id: 'tac_ab3', type: 'ability', abilityKey: 'tactician_outmaneuver', cost: 1, levelReq: 9, name: 'Outmaneuver', desc: 'Learn Outmaneuver — Slows the enemy.' },
    ],
  },

  Warrior: {
    shared: [
      { id: 'war_hp1', type: 'passive', stat: 'hp', amount: 10, cost: 1, levelReq: 2, name: 'Toughness I', desc: '+10 Max HP' },
      { id: 'war_atk1', type: 'passive', stat: 'atk', amount: 2, cost: 1, levelReq: 2, name: 'Strength I', desc: '+2 ATK' },
      { id: 'war_def1', type: 'passive', stat: 'def', amount: 2, cost: 1, levelReq: 3, name: 'Armor I', desc: '+2 DEF' },
      { id: 'war_hp2', type: 'passive', stat: 'hp', amount: 10, cost: 1, levelReq: 4, name: 'Toughness II', desc: '+10 Max HP' },
      { id: 'war_spd1', type: 'passive', stat: 'spd', amount: 1, cost: 1, levelReq: 4, name: 'Footwork', desc: '+1 SPD' },
      { id: 'war_atk2', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 6, name: 'Strength II', desc: '+3 ATK' },
      { id: 'war_def2', type: 'passive', stat: 'def', amount: 3, cost: 1, levelReq: 7, name: 'Armor II', desc: '+3 DEF' },
    ],
    berserker: [
      { id: 'ber_ab1', type: 'ability', abilityKey: 'berserker_cleave', cost: 1, levelReq: 5, name: 'Cleave', desc: 'Learn Cleave — Hits all enemies.' },
      { id: 'ber_atk1', type: 'passive', stat: 'atk', amount: 4, cost: 1, levelReq: 6, name: 'Fury', desc: '+4 ATK' },
      { id: 'ber_ab2', type: 'ability', abilityKey: 'berserker_frenzy', cost: 1, levelReq: 7, name: 'Frenzy', desc: 'Learn Frenzy — Greatly boosts own ATK.' },
      { id: 'ber_hp1', type: 'passive', stat: 'hp', amount: 15, cost: 1, levelReq: 8, name: 'Thick Skin', desc: '+15 Max HP' },
      { id: 'ber_ab3', type: 'ability', abilityKey: 'berserker_bloodlust', cost: 1, levelReq: 9, name: 'Bloodlust', desc: 'Learn Bloodlust — Massive reckless damage.' },
    ],
    guardian: [
      { id: 'grd_ab1', type: 'ability', abilityKey: 'guardian_shieldwall', cost: 1, levelReq: 5, name: 'Shield Wall', desc: 'Learn Shield Wall — Boosts party DEF.' },
      { id: 'grd_def1', type: 'passive', stat: 'def', amount: 4, cost: 1, levelReq: 6, name: 'Ironhide', desc: '+4 DEF' },
      { id: 'grd_ab2', type: 'ability', abilityKey: 'guardian_taunt', cost: 1, levelReq: 7, name: 'Taunt', desc: 'Learn Taunt — Provokes and weakens enemy ATK.' },
      { id: 'grd_hp1', type: 'passive', stat: 'hp', amount: 20, cost: 1, levelReq: 8, name: 'Unbreakable', desc: '+20 Max HP' },
      { id: 'grd_ab3', type: 'ability', abilityKey: 'guardian_fortify', cost: 1, levelReq: 9, name: 'Fortify', desc: 'Learn Fortify — Massively boosts own DEF.' },
    ],
  },

  Ranger: {
    shared: [
      { id: 'rng_spd1', type: 'passive', stat: 'spd', amount: 2, cost: 1, levelReq: 2, name: 'Swiftness I', desc: '+2 SPD' },
      { id: 'rng_atk1', type: 'passive', stat: 'atk', amount: 2, cost: 1, levelReq: 2, name: 'Precision I', desc: '+2 ATK' },
      { id: 'rng_hp1', type: 'passive', stat: 'hp', amount: 6, cost: 1, levelReq: 3, name: 'Endurance I', desc: '+6 Max HP' },
      { id: 'rng_mp1', type: 'passive', stat: 'mp', amount: 4, cost: 1, levelReq: 3, name: 'Focus I', desc: '+4 Max MP' },
      { id: 'rng_spd2', type: 'passive', stat: 'spd', amount: 2, cost: 1, levelReq: 4, name: 'Swiftness II', desc: '+2 SPD' },
      { id: 'rng_atk2', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 6, name: 'Precision II', desc: '+3 ATK' },
      { id: 'rng_def1', type: 'passive', stat: 'def', amount: 2, cost: 1, levelReq: 7, name: 'Evasion', desc: '+2 DEF' },
    ],
    sharpshooter: [
      { id: 'ss_ab1', type: 'ability', abilityKey: 'sharp_headshot', cost: 1, levelReq: 5, name: 'Headshot', desc: 'Learn Headshot — Massive single-target damage.' },
      { id: 'ss_atk1', type: 'passive', stat: 'atk', amount: 4, cost: 1, levelReq: 6, name: 'Lethal Aim', desc: '+4 ATK' },
      { id: 'ss_ab2', type: 'ability', abilityKey: 'sharp_barrage', cost: 1, levelReq: 7, name: 'Arrow Barrage', desc: 'Learn Arrow Barrage — Hits all enemies.' },
      { id: 'ss_spd1', type: 'passive', stat: 'spd', amount: 3, cost: 1, levelReq: 8, name: 'Quick Draw', desc: '+3 SPD' },
      { id: 'ss_ab3', type: 'ability', abilityKey: 'sharp_piercing', cost: 1, levelReq: 9, name: 'Piercing Shot', desc: 'Learn Piercing Shot — Pierces armor.' },
    ],
    survivalist: [
      { id: 'sv_ab1', type: 'ability', abilityKey: 'surv_fieldmed', cost: 1, levelReq: 5, name: 'Field Medicine', desc: 'Learn Field Medicine — Heals 40 HP.' },
      { id: 'sv_hp1', type: 'passive', stat: 'hp', amount: 10, cost: 1, levelReq: 6, name: 'Hardy', desc: '+10 Max HP' },
      { id: 'sv_ab2', type: 'ability', abilityKey: 'surv_caltrops', cost: 1, levelReq: 7, name: 'Caltrops', desc: 'Learn Caltrops — Damages and slows all enemies.' },
      { id: 'sv_spd1', type: 'passive', stat: 'spd', amount: 3, cost: 1, levelReq: 8, name: 'Trail Runner', desc: '+3 SPD' },
      { id: 'sv_ab3', type: 'ability', abilityKey: 'surv_quickstep', cost: 1, levelReq: 9, name: 'Quickstep', desc: 'Learn Quickstep — Boosts party SPD.' },
    ],
  },

  Wizard: {
    shared: [
      { id: 'wiz_mp1', type: 'passive', stat: 'mp', amount: 6, cost: 1, levelReq: 2, name: 'Arcana I', desc: '+6 Max MP' },
      { id: 'wiz_atk1', type: 'passive', stat: 'atk', amount: 2, cost: 1, levelReq: 2, name: 'Intellect I', desc: '+2 ATK' },
      { id: 'wiz_hp1', type: 'passive', stat: 'hp', amount: 5, cost: 1, levelReq: 3, name: 'Constitution I', desc: '+5 Max HP' },
      { id: 'wiz_mp2', type: 'passive', stat: 'mp', amount: 6, cost: 1, levelReq: 3, name: 'Arcana II', desc: '+6 Max MP' },
      { id: 'wiz_atk2', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 4, name: 'Intellect II', desc: '+3 ATK' },
      { id: 'wiz_spd1', type: 'passive', stat: 'spd', amount: 2, cost: 1, levelReq: 6, name: 'Quick Cast', desc: '+2 SPD' },
      { id: 'wiz_def1', type: 'passive', stat: 'def', amount: 2, cost: 1, levelReq: 7, name: 'Warding', desc: '+2 DEF' },
    ],
    archmage: [
      { id: 'am_ab1', type: 'ability', abilityKey: 'arch_meteor', cost: 1, levelReq: 5, name: 'Meteor', desc: 'Learn Meteor — AoE magic damage to all enemies.' },
      { id: 'am_atk1', type: 'passive', stat: 'atk', amount: 4, cost: 1, levelReq: 6, name: 'Arcane Mastery', desc: '+4 ATK' },
      { id: 'am_ab2', type: 'ability', abilityKey: 'arch_arcaneblast', cost: 1, levelReq: 7, name: 'Arcane Blast', desc: 'Learn Arcane Blast — Concentrated beam of energy.' },
      { id: 'am_mp1', type: 'passive', stat: 'mp', amount: 10, cost: 1, levelReq: 8, name: 'Mana Well', desc: '+10 Max MP' },
      { id: 'am_ab3', type: 'ability', abilityKey: 'arch_manaburn', cost: 1, levelReq: 9, name: 'Mana Burn', desc: 'Learn Mana Burn — Magic damage + DOT.' },
    ],
    battlemage: [
      { id: 'bm_ab1', type: 'ability', abilityKey: 'bmage_spellblade', cost: 1, levelReq: 5, name: 'Spellblade', desc: 'Learn Spellblade — Magic-enhanced melee strike.' },
      { id: 'bm_def1', type: 'passive', stat: 'def', amount: 3, cost: 1, levelReq: 6, name: 'Battle Ward', desc: '+3 DEF' },
      { id: 'bm_ab2', type: 'ability', abilityKey: 'bmage_barrier', cost: 1, levelReq: 7, name: 'Arcane Barrier', desc: 'Learn Arcane Barrier — Boosts party DEF.' },
      { id: 'bm_hp1', type: 'passive', stat: 'hp', amount: 10, cost: 1, levelReq: 8, name: 'War Mage\'s Vigor', desc: '+10 Max HP' },
      { id: 'bm_ab3', type: 'ability', abilityKey: 'bmage_drainlife', cost: 1, levelReq: 9, name: 'Drain Life', desc: 'Learn Drain Life — Deals damage and heals self.' },
    ],
  },

  Priest: {
    shared: [
      { id: 'prs_mp1', type: 'passive', stat: 'mp', amount: 6, cost: 1, levelReq: 2, name: 'Devotion I', desc: '+6 Max MP' },
      { id: 'prs_hp1', type: 'passive', stat: 'hp', amount: 6, cost: 1, levelReq: 2, name: 'Grace I', desc: '+6 Max HP' },
      { id: 'prs_def1', type: 'passive', stat: 'def', amount: 2, cost: 1, levelReq: 3, name: 'Resilience I', desc: '+2 DEF' },
      { id: 'prs_mp2', type: 'passive', stat: 'mp', amount: 6, cost: 1, levelReq: 3, name: 'Devotion II', desc: '+6 Max MP' },
      { id: 'prs_atk1', type: 'passive', stat: 'atk', amount: 2, cost: 1, levelReq: 4, name: 'Holy Power', desc: '+2 ATK' },
      { id: 'prs_hp2', type: 'passive', stat: 'hp', amount: 8, cost: 1, levelReq: 6, name: 'Grace II', desc: '+8 Max HP' },
      { id: 'prs_spd1', type: 'passive', stat: 'spd', amount: 2, cost: 1, levelReq: 7, name: 'Alacrity', desc: '+2 SPD' },
    ],
    oracle: [
      { id: 'or_ab1', type: 'ability', abilityKey: 'oracle_divheal', cost: 1, levelReq: 5, name: 'Divine Heal', desc: 'Learn Divine Heal — Restores 50 HP.' },
      { id: 'or_mp1', type: 'passive', stat: 'mp', amount: 8, cost: 1, levelReq: 6, name: 'Inner Light', desc: '+8 Max MP' },
      { id: 'or_ab2', type: 'ability', abilityKey: 'oracle_radiance', cost: 1, levelReq: 7, name: 'Radiance', desc: 'Learn Radiance — Heals entire party.' },
      { id: 'or_hp1', type: 'passive', stat: 'hp', amount: 10, cost: 1, levelReq: 8, name: 'Blessed Body', desc: '+10 Max HP' },
      { id: 'or_ab3', type: 'ability', abilityKey: 'oracle_revive', cost: 1, levelReq: 9, name: 'Revive', desc: 'Learn Revive — Brings a fallen ally back.' },
    ],
    inquisitor: [
      { id: 'iq_ab1', type: 'ability', abilityKey: 'inq_holyfire', cost: 1, levelReq: 5, name: 'Holy Fire', desc: 'Learn Holy Fire — AoE holy damage.' },
      { id: 'iq_atk1', type: 'passive', stat: 'atk', amount: 3, cost: 1, levelReq: 6, name: 'Zealotry', desc: '+3 ATK' },
      { id: 'iq_ab2', type: 'ability', abilityKey: 'inq_judgment', cost: 1, levelReq: 7, name: 'Judgment', desc: 'Learn Judgment — Heavy single-target holy damage.' },
      { id: 'iq_spd1', type: 'passive', stat: 'spd', amount: 3, cost: 1, levelReq: 8, name: 'Righteous Haste', desc: '+3 SPD' },
      { id: 'iq_ab3', type: 'ability', abilityKey: 'inq_purge', cost: 1, levelReq: 9, name: 'Purge', desc: 'Learn Purge — Holy damage + ATK debuff.' },
    ],
  },
};

// Get all available talents for a character (shared + subclass if chosen)
export function getAvailableTalents(character) {
  const tree = TALENT_TREES[character.cls];
  if (!tree) return [];

  const shared = tree.shared || [];
  let subclassTalents = [];

  if (character.subclass && tree[character.subclass]) {
    subclassTalents = tree[character.subclass];
  }

  return [...shared, ...subclassTalents].filter(talent => {
    // Must meet level requirement
    if (character.level < talent.levelReq) return false;
    // Must not already be purchased
    if (character.talentsPurchased.includes(talent.id)) return false;
    // Must have enough points
    if (character.talentPoints < talent.cost) return false;
    return true;
  });
}

// Get all talents for display (including locked/purchased)
export function getAllTalents(character) {
  const tree = TALENT_TREES[character.cls];
  if (!tree) return { shared: [], subclass: [] };

  const shared = tree.shared || [];
  let subclassTalents = [];

  if (character.subclass && tree[character.subclass]) {
    subclassTalents = tree[character.subclass];
  }

  return { shared, subclass: subclassTalents };
}

// Purchase a talent for a character
export function purchaseTalent(character, talentId) {
  const tree = TALENT_TREES[character.cls];
  if (!tree) return false;

  // Find the talent in shared or subclass trees
  const allTalents = [
    ...(tree.shared || []),
    ...(character.subclass && tree[character.subclass] ? tree[character.subclass] : []),
  ];

  const talent = allTalents.find(t => t.id === talentId);
  if (!talent) return false;
  if (character.talentPoints < talent.cost) return false;
  if (character.level < talent.levelReq) return false;
  if (character.talentsPurchased.includes(talentId)) return false;

  character.talentPoints -= talent.cost;
  character.talentsPurchased.push(talentId);

  if (talent.type === 'passive') {
    // Apply stat bonus
    switch (talent.stat) {
      case 'hp':
        character.baseMaxHp += talent.amount;
        character.maxHp = character.baseMaxHp + getEquipmentBonusForTalent(character, 'hp');
        character.hp = Math.min(character.hp + talent.amount, character.maxHp);
        break;
      case 'mp':
        character.baseMaxMp += talent.amount;
        character.maxMp = character.baseMaxMp + getEquipmentBonusForTalent(character, 'mp');
        character.mp = Math.min(character.mp + talent.amount, character.maxMp);
        break;
      case 'atk':
        character.baseAtk += talent.amount;
        break;
      case 'def':
        character.baseDef += talent.amount;
        break;
      case 'spd':
        character.baseSpd += talent.amount;
        break;
    }
  } else if (talent.type === 'ability') {
    // Add ability to learned list
    if (!character.learnedAbilities.includes(talent.abilityKey)) {
      character.learnedAbilities.push(talent.abilityKey);
    }
  }

  return true;
}

// Helper to get equipment bonus without circular import
function getEquipmentBonusForTalent(character, stat) {
  // Inline calculation to avoid circular dependency
  if (!character.equipment) return 0;
  // We import equipment data dynamically would be complex, so we use the
  // difference between current max and base to determine equipment bonus
  if (stat === 'hp') return character.maxHp - character.baseMaxHp;
  if (stat === 'mp') return character.maxMp - character.baseMaxMp;
  return 0;
}
