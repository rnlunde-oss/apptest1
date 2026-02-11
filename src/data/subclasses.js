// Subclass definitions — Defense of Rhaud
// 2 subclasses per class, each with stat growth overrides and unlocked abilities

export const SUBCLASSES = {
  Commander: {
    warlord: {
      name: 'Warlord',
      cls: 'Commander',
      desc: 'An aggressive leader who empowers the party with offensive buffs and devastating strikes.',
      abilities: ['warlord_warcry', 'warlord_onslaught', 'warlord_inspire'],
    },
    tactician: {
      name: 'Tactician',
      cls: 'Commander',
      desc: 'A defensive strategist who weakens enemies and shields allies through careful planning.',
      abilities: ['tactician_expose', 'tactician_bulwark', 'tactician_outmaneuver'],
    },
  },
  Warrior: {
    berserker: {
      name: 'Berserker',
      cls: 'Warrior',
      desc: 'A reckless fighter who sacrifices defense for overwhelming offense and self-buffs.',
      abilities: ['berserker_cleave', 'berserker_frenzy', 'berserker_bloodlust'],
    },
    guardian: {
      name: 'Guardian',
      cls: 'Warrior',
      desc: 'An armored protector who shields the party and endures incredible punishment.',
      abilities: ['guardian_shieldwall', 'guardian_taunt', 'guardian_fortify'],
    },
  },
  Ranger: {
    sharpshooter: {
      name: 'Sharpshooter',
      cls: 'Ranger',
      desc: 'A precision marksman who delivers devastating burst damage from range.',
      abilities: ['sharp_headshot', 'sharp_barrage', 'sharp_piercing'],
    },
    survivalist: {
      name: 'Survivalist',
      cls: 'Ranger',
      desc: 'A wilderness expert who heals allies, lays traps, and boosts party speed.',
      abilities: ['surv_fieldmed', 'surv_caltrops', 'surv_quickstep'],
    },
  },
  Wizard: {
    archmage: {
      name: 'Archmage',
      cls: 'Wizard',
      desc: 'A master of raw magic who unleashes devastating area-of-effect spells.',
      abilities: ['arch_meteor', 'arch_arcaneblast', 'arch_manaburn'],
    },
    battlemage: {
      name: 'Battlemage',
      cls: 'Wizard',
      desc: 'A hybrid caster who balances offense and defense with sustained combat magic.',
      abilities: ['bmage_spellblade', 'bmage_barrier', 'bmage_drainlife'],
    },
  },
  Priest: {
    oracle: {
      name: 'Oracle',
      cls: 'Priest',
      desc: 'A divine healer who wields powerful restoration magic and party-wide blessings.',
      abilities: ['oracle_divheal', 'oracle_radiance', 'oracle_revive'],
    },
    inquisitor: {
      name: 'Inquisitor',
      cls: 'Priest',
      desc: 'A holy warrior who channels offensive light magic and debilitating holy debuffs.',
      abilities: ['inq_holyfire', 'inq_judgment', 'inq_purge'],
    },
  },
};

// Stat growth overrides for subclasses (replaces base class gains from level 5+)
export const SUBCLASS_GAINS = {
  warlord:      { hp: 7, mp: 2, atk: 3, def: 1, spd: 2 },
  tactician:    { hp: 6, mp: 4, atk: 1, def: 3, spd: 1 },
  berserker:    { hp: 9, mp: 1, atk: 4, def: 1, spd: 2 },
  guardian:     { hp: 10, mp: 2, atk: 2, def: 3, spd: 0 },
  sharpshooter: { hp: 4, mp: 3, atk: 3, def: 1, spd: 2 },
  survivalist:  { hp: 6, mp: 4, atk: 1, def: 1, spd: 3 },
  archmage:     { hp: 2, mp: 6, atk: 4, def: 0, spd: 1 },
  battlemage:   { hp: 4, mp: 4, atk: 3, def: 2, spd: 1 },
  oracle:       { hp: 5, mp: 6, atk: 1, def: 1, spd: 1 },
  inquisitor:   { hp: 3, mp: 5, atk: 2, def: 1, spd: 2 },
};
