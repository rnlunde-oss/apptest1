// Quest definitions — Defense of Rhaud
// Static quest data. Runtime state lives in registry 'questState'.

export const QUEST_DEFS = {
  test_wolfpack: {
    id: 'test_wolfpack',
    name: 'Clear the Wolf Pack',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Eastern Watch',
    description: 'A pack of corrupted dire wolves blocks a key path through the frontier. Defeat them to secure the route.',
    objectives: [
      { id: 'kill_wolves', type: 'defeat_enemy', target: 'ow_wolfpack', description: 'Defeat the Wolf Pack', required: 1 },
    ],
    prereqs: [],
    rewards: { gold: 50, xp: 30, items: [], unlocks: [] },
    acceptDialogue: ['A corrupted wolf pack has been spotted blocking the southern path. Deal with them.'],
    completeDialogue: ['The wolf pack has been cleared. The path is open.'],
    tracked: true,
    sortOrder: 100,
  },

  test_skeleton_hunt: {
    id: 'test_skeleton_hunt',
    name: 'Skeleton Scourge',
    act: 1,
    type: 'side',
    giver: 'auto',
    giverName: 'Eastern Watch',
    description: 'The cursed lands are crawling with skeletons. Thin their numbers to slow Atikesh\'s advance.',
    objectives: [
      { id: 'kill_skeletons', type: 'defeat_count', target: 'skeleton', description: 'Defeat skeletons', required: 5 },
    ],
    prereqs: [],
    rewards: { gold: 80, xp: 50, items: [], unlocks: [] },
    acceptDialogue: ['Skeleton patrols grow bolder by the day. Destroy at least five to slow their advance.'],
    completeDialogue: ['Five skeletons felled. The cursed lands are quieter... for now.'],
    tracked: true,
    sortOrder: 200,
  },

  test_talk_rivin: {
    id: 'test_talk_rivin',
    name: 'Seek the Sellsword',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Eastern Watch',
    description: 'A sellsword named Rivin has been seen near the frontier. Speak with him — his blade could prove useful.',
    objectives: [
      { id: 'find_rivin', type: 'talk_npc', target: 'rivin', description: 'Speak with Rivin', required: 1 },
    ],
    prereqs: [],
    rewards: { gold: 0, xp: 20, items: [], unlocks: [] },
    acceptDialogue: ['A mercenary called Rivin camps near the eastern woods. Seek him out.'],
    completeDialogue: ['You have made contact with Rivin.'],
    tracked: true,
    sortOrder: 50,
  },
};
