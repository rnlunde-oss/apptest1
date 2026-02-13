// Save/Load system for Defense of Rhaud
// Handles serialization, deserialization, and localStorage persistence

import { PARTY_DEFS, createCharacter } from './characters.js';

const SAVE_KEY_PREFIX = 'rpg_save_';
const AUTOSAVE_KEY = 'rpg_autosave';
const SAVE_VERSION = 1;

// Fields safe to copy onto a reconstructed character (excludes getter properties)
const SERIALIZABLE_FIELDS = [
  'id', 'name', 'cls', 'color', 'level', 'xp', 'xpToNext',
  'hp', 'maxHp', 'baseMaxHp', 'mp', 'maxMp', 'baseMaxMp',
  'baseAtk', 'baseDef', 'baseSpd',
  'learnedAbilities', 'activeAbilities',
  'subclass', 'talentPoints', 'talentsPurchased',
  'equipment', 'alwaysActive', 'active', 'recruited',
];

/**
 * Extract all game state from registry into a serializable plain object.
 */
export function serializeGameState(registry, playerPos) {
  const roster = registry.get('roster');
  const serializedRoster = {};

  for (const [key, char] of Object.entries(roster)) {
    const data = {};
    for (const field of SERIALIZABLE_FIELDS) {
      const val = char[field];
      // Deep-copy arrays and objects so JSON.stringify works cleanly
      if (Array.isArray(val)) {
        data[field] = [...val];
      } else if (val && typeof val === 'object') {
        data[field] = { ...val };
      } else {
        data[field] = val;
      }
    }
    serializedRoster[key] = data;
  }

  return {
    roster: serializedRoster,
    inventory: [...(registry.get('inventory') || [])],
    gold: registry.get('gold') || 0,
    bossDefeated: registry.get('bossDefeated') || false,
    tutorialComplete: registry.get('tutorialComplete') || false,
    collectedItems: { ...(registry.get('collectedItems') || {}) },
    defeatedOverworldEnemies: { ...(registry.get('defeatedOverworldEnemies') || {}) },
    partyOrder: [...(registry.get('partyOrder') || [])],
    questState: JSON.parse(JSON.stringify(registry.get('questState') || { active: {}, completed: [], trackedQuestId: null })),
    playerPos: { x: playerPos.x, y: playerPos.y },
    saveTime: new Date().toISOString(),
    version: SAVE_VERSION,
  };
}

/**
 * Rebuild roster from saved data. Creates fresh characters with working
 * getters, then overlays saved state (excluding getter fields).
 */
export function deserializeRoster(savedRoster) {
  const roster = {};
  for (const [key, savedChar] of Object.entries(savedRoster)) {
    const def = PARTY_DEFS[key];
    if (!def) continue;

    // Create fresh character with working getters
    const char = createCharacter(def, 1);

    // Overlay saved fields (skip getter properties: atk, def, spd, abilities)
    for (const field of SERIALIZABLE_FIELDS) {
      if (savedChar[field] !== undefined) {
        const val = savedChar[field];
        if (Array.isArray(val)) {
          char[field] = [...val];
        } else if (val && typeof val === 'object') {
          char[field] = { ...val };
        } else {
          char[field] = val;
        }
      }
    }

    roster[key] = char;
  }
  return roster;
}

/**
 * Save game state to a numbered slot (1-3).
 */
export function saveToSlot(slotNum, gameState) {
  try {
    localStorage.setItem(SAVE_KEY_PREFIX + slotNum, JSON.stringify(gameState));
    return true;
  } catch (e) {
    console.error('Failed to save to slot', slotNum, e);
    return false;
  }
}

/**
 * Load game state from a numbered slot. Returns null if missing/corrupt.
 */
export function loadFromSlot(slotNum) {
  try {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotNum);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load slot', slotNum, e);
    return null;
  }
}

/**
 * Auto-save game state.
 */
export function autoSave(gameState) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(gameState));
    return true;
  } catch (e) {
    console.error('Auto-save failed', e);
    return false;
  }
}

/**
 * Load auto-save. Returns null if missing/corrupt.
 */
export function loadAutoSave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load auto-save', e);
    return null;
  }
}

/**
 * Get summaries for all save slots (3 manual + 1 auto) for title screen.
 * Returns array of { exists, saveTime, gold, level, recruited } objects.
 */
export function getSlotSummaries() {
  const summaries = [];

  // Slots 1-3
  for (let i = 1; i <= 3; i++) {
    const data = loadFromSlot(i);
    summaries.push(buildSummary(data));
  }

  return summaries;
}

/**
 * Get auto-save summary.
 */
export function getAutoSaveSummary() {
  const data = loadAutoSave();
  return buildSummary(data);
}

function buildSummary(data) {
  if (!data) return { exists: false };

  const roster = data.roster || {};
  const recruited = Object.values(roster).filter(c => c.recruited).length;
  // Find highest level among recruited characters
  const maxLevel = Object.values(roster)
    .filter(c => c.recruited)
    .reduce((max, c) => Math.max(max, c.level || 1), 1);

  return {
    exists: true,
    saveTime: data.saveTime || 'Unknown',
    gold: data.gold || 0,
    level: maxLevel,
    recruited,
  };
}

/**
 * Delete a save slot.
 */
export function deleteSave(slotNum) {
  localStorage.removeItem(SAVE_KEY_PREFIX + slotNum);
}
