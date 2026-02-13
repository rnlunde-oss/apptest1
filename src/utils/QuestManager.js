// Quest Manager — Defense of Rhaud
// Pure functions for quest state management (no class — matches formation.js pattern)

import { QUEST_DEFS } from '../data/quests.js';
import { awardXP } from '../data/characters.js';

// ──── Initialization ────

/**
 * Set up fresh questState in registry for new games.
 * Also auto-accepts any quests with giver: 'auto' and no prereqs.
 */
export function initQuestState(registry) {
  const questState = {
    active: {},      // questId -> { objectiveProgress: { objId: number }, tracked: bool }
    completed: [],   // questId[]
    trackedQuestId: null,
  };
  registry.set('questState', questState);

  // Auto-accept quests with giver: 'auto' and no prereqs
  for (const def of Object.values(QUEST_DEFS)) {
    if (def.giver === 'auto' && def.prereqs.length === 0) {
      acceptQuest(registry, def.id);
    }
  }
}

// ──── Accept / Progress / Complete ────

/**
 * Accept a quest. Validates prereqs and creates runtime state.
 * Returns true if accepted, false if prereqs not met or already active/completed.
 */
export function acceptQuest(registry, questId) {
  const def = QUEST_DEFS[questId];
  if (!def) return false;

  const qs = registry.get('questState');
  if (!qs) return false;

  // Already active or completed
  if (qs.active[questId] || qs.completed.includes(questId)) return false;

  // Check prereqs
  for (const prereq of def.prereqs) {
    if (!qs.completed.includes(prereq)) return false;
  }

  // Create runtime state
  const objectiveProgress = {};
  for (const obj of def.objectives) {
    objectiveProgress[obj.id] = 0;
  }

  qs.active[questId] = {
    objectiveProgress,
    tracked: def.tracked,
  };

  // Set as tracked if nothing else is tracked
  if (!qs.trackedQuestId) {
    qs.trackedQuestId = questId;
  }

  return true;
}

/**
 * Progress an objective by amount. Returns result object.
 * @returns {{ questComplete, objectiveMet, newValue, required } | null} null if quest/obj not found
 */
export function progressObjective(registry, questId, objectiveId, amount = 1) {
  const def = QUEST_DEFS[questId];
  if (!def) return null;

  const qs = registry.get('questState');
  if (!qs || !qs.active[questId]) return null;

  const state = qs.active[questId];
  const objDef = def.objectives.find(o => o.id === objectiveId);
  if (!objDef) return null;

  // Already at required? Don't over-increment
  if (state.objectiveProgress[objectiveId] >= objDef.required) {
    return { questComplete: false, objectiveMet: true, newValue: objDef.required, required: objDef.required };
  }

  state.objectiveProgress[objectiveId] = Math.min(
    (state.objectiveProgress[objectiveId] || 0) + amount,
    objDef.required
  );

  const newValue = state.objectiveProgress[objectiveId];
  const objectiveMet = newValue >= objDef.required;

  // Check if all objectives are met
  const questComplete = def.objectives.every(
    o => state.objectiveProgress[o.id] >= o.required
  );

  return { questComplete, objectiveMet, newValue, required: objDef.required };
}

/**
 * Complete a quest: award rewards, unlock next quests, auto-accept giver:'auto' quests.
 * @returns {{ gold, xp, items } | null} rewards given, or null if not completable
 */
export function completeQuest(registry, questId) {
  const def = QUEST_DEFS[questId];
  if (!def) return null;

  const qs = registry.get('questState');
  if (!qs || !qs.active[questId]) return null;

  // Verify all objectives met
  const state = qs.active[questId];
  const allMet = def.objectives.every(
    o => state.objectiveProgress[o.id] >= o.required
  );
  if (!allMet) return null;

  // Remove from active, add to completed
  delete qs.active[questId];
  qs.completed.push(questId);

  // If this was the tracked quest, pick next active
  if (qs.trackedQuestId === questId) {
    const activeIds = Object.keys(qs.active);
    qs.trackedQuestId = activeIds.length > 0 ? activeIds[0] : null;
  }

  // Award rewards
  const rewards = def.rewards || {};
  if (rewards.gold) {
    const gold = registry.get('gold') || 0;
    registry.set('gold', gold + rewards.gold);
  }
  if (rewards.xp) {
    const roster = registry.get('roster');
    for (const char of Object.values(roster)) {
      if (char.recruited) awardXP(char, rewards.xp);
    }
  }
  if (rewards.items && rewards.items.length > 0) {
    const inventory = registry.get('inventory') || [];
    for (const itemId of rewards.items) {
      inventory.push(itemId);
    }
  }

  // Auto-accept quests that are now available (prereqs met, giver: 'auto')
  for (const nextDef of Object.values(QUEST_DEFS)) {
    if (nextDef.giver !== 'auto') continue;
    if (qs.active[nextDef.id] || qs.completed.includes(nextDef.id)) continue;
    const prereqsMet = nextDef.prereqs.every(p => qs.completed.includes(p));
    if (prereqsMet) {
      acceptQuest(registry, nextDef.id);
    }
  }

  return { gold: rewards.gold || 0, xp: rewards.xp || 0, items: rewards.items || [] };
}

// ──── Queries ────

/**
 * Get all active quests as [{ def, state }] sorted by sortOrder.
 */
export function getActiveQuests(registry) {
  const qs = registry.get('questState');
  if (!qs) return [];

  return Object.keys(qs.active)
    .map(id => ({ def: QUEST_DEFS[id], state: qs.active[id] }))
    .filter(entry => entry.def)
    .sort((a, b) => a.def.sortOrder - b.def.sortOrder);
}

/**
 * Get all completed quests as [{ def }] sorted by sortOrder.
 */
export function getCompletedQuests(registry) {
  const qs = registry.get('questState');
  if (!qs) return [];

  return qs.completed
    .map(id => ({ def: QUEST_DEFS[id] }))
    .filter(entry => entry.def)
    .sort((a, b) => a.def.sortOrder - b.def.sortOrder);
}

/**
 * Get quests with met prereqs that haven't been accepted yet.
 */
export function getAvailableQuests(registry) {
  const qs = registry.get('questState');
  if (!qs) return [];

  const available = [];
  for (const def of Object.values(QUEST_DEFS)) {
    if (qs.active[def.id] || qs.completed.includes(def.id)) continue;
    const prereqsMet = def.prereqs.every(p => qs.completed.includes(p));
    if (prereqsMet) available.push({ def });
  }
  return available.sort((a, b) => a.def.sortOrder - b.def.sortOrder);
}

export function isQuestComplete(registry, questId) {
  const qs = registry.get('questState');
  return qs ? qs.completed.includes(questId) : false;
}

export function isQuestActive(registry, questId) {
  const qs = registry.get('questState');
  return qs ? !!qs.active[questId] : false;
}

/**
 * Get the currently tracked quest for HUD display.
 * @returns {{ def, state } | null}
 */
export function getTrackedQuest(registry) {
  const qs = registry.get('questState');
  if (!qs || !qs.trackedQuestId) return null;

  const def = QUEST_DEFS[qs.trackedQuestId];
  const state = qs.active[qs.trackedQuestId];
  if (!def || !state) return null;

  return { def, state };
}

export function setTrackedQuest(registry, questId) {
  const qs = registry.get('questState');
  if (!qs) return;
  qs.trackedQuestId = questId;
}

// ──── Event Matchers ────
// Find active objectives matching a game event. Returns [{ questId, objectiveId }].

/**
 * Find objectives for defeating a specific overworld enemy (by its ow_ id).
 */
export function findDefeatEnemyObjectives(registry, enemyId) {
  return _findMatchingObjectives(registry, 'defeat_enemy', enemyId);
}

/**
 * Find objectives for defeating enemies of a given type in random encounters.
 */
export function findDefeatCountObjectives(registry, enemyType) {
  return _findMatchingObjectives(registry, 'defeat_count', enemyType);
}

/**
 * Find objectives for collecting an item.
 */
export function findCollectItemObjectives(registry, itemId) {
  return _findMatchingObjectives(registry, 'collect_item', itemId);
}

/**
 * Find objectives for talking to an NPC.
 */
export function findTalkNPCObjectives(registry, npcId) {
  return _findMatchingObjectives(registry, 'talk_npc', npcId);
}

/**
 * Check if stepping on (tileX, tileY) completes any reach_location objectives.
 */
export function checkReachLocationObjectives(registry, tileX, tileY) {
  const qs = registry.get('questState');
  if (!qs) return [];

  const matches = [];
  for (const [questId, state] of Object.entries(qs.active)) {
    const def = QUEST_DEFS[questId];
    if (!def) continue;

    for (const obj of def.objectives) {
      if (obj.type !== 'reach_location') continue;
      if (state.objectiveProgress[obj.id] >= obj.required) continue;

      // target format: "tileX,tileY" or { x, y, radius }
      const target = obj.target;
      if (typeof target === 'string') {
        const [tx, ty] = target.split(',').map(Number);
        if (tileX === tx && tileY === ty) {
          matches.push({ questId, objectiveId: obj.id });
        }
      } else if (target && typeof target === 'object') {
        const dx = tileX - target.x;
        const dy = tileY - target.y;
        const r = target.radius || 0;
        if (dx * dx + dy * dy <= r * r) {
          matches.push({ questId, objectiveId: obj.id });
        }
      }
    }
  }
  return matches;
}

// ──── Internal ────

function _findMatchingObjectives(registry, type, target) {
  const qs = registry.get('questState');
  if (!qs) return [];

  const matches = [];
  for (const [questId, state] of Object.entries(qs.active)) {
    const def = QUEST_DEFS[questId];
    if (!def) continue;

    for (const obj of def.objectives) {
      if (obj.type !== type || obj.target !== target) continue;
      if (state.objectiveProgress[obj.id] >= obj.required) continue;
      matches.push({ questId, objectiveId: obj.id });
    }
  }
  return matches;
}
