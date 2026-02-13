// Quest definitions — Defense of Rhaud
// Static quest data. Runtime state lives in registry 'questState'.

export const QUEST_DEFS = {
  // ──── Act I Main Quests ────

  act1_secure_farmlands: {
    id: 'act1_secure_farmlands',
    name: 'Secure the Asvam Farmlands',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Captain Metz',
    description: 'The farmlands south of Bracken are overrun. Push into the area, find the ranger Lyla, and destroy the Bone Reaper terrorizing the settlers.',
    objectives: [
      { id: 'reach_farmlands', type: 'reach_location', target: 'asvam_farmlands', description: 'Reach the Asvam Farmlands', required: 1 },
      { id: 'talk_lyla', type: 'talk_npc', target: 'lyla', description: 'Speak with Lyla', required: 1 },
      { id: 'defeat_bone_reaper', type: 'defeat_enemy', target: 'bone_reaper', description: 'Defeat the Bone Reaper', required: 1 },
    ],
    prereqs: [],
    rewards: { gold: 80, xp: 50, items: [], unlocks: [] },
    acceptDialogue: ['The farmlands to the south are crawling with undead. We need to secure the area and find any survivors.'],
    completeDialogue: ['The farmlands are secured. Lyla\'s knowledge of the frontier will prove invaluable.'],
    tracked: true,
    sortOrder: 100,
  },

  act1_secure_bracken: {
    id: 'act1_secure_bracken',
    name: 'Secure Fort Bracken',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Captain Metz',
    description: 'Fort Bracken was once a stronghold of the Eastern Watch. Reclaim it, recruit the sellsword Rivin, and defeat the Skeletal Captain holding the gate.',
    objectives: [
      { id: 'reach_bracken', type: 'reach_location', target: 'bracken', description: 'Reach Fort Bracken', required: 1 },
      { id: 'talk_rivin', type: 'talk_npc', target: 'rivin', description: 'Speak with Rivin', required: 1 },
      { id: 'defeat_skeletal_captain', type: 'defeat_enemy', target: 'skeletal_captain', description: 'Defeat the Skeletal Captain', required: 1 },
    ],
    prereqs: ['act1_secure_farmlands'],
    rewards: { gold: 120, xp: 80, items: [], unlocks: [] },
    acceptDialogue: ['Fort Bracken lies to the north. If we can take it back, we\'ll have a base of operations.'],
    completeDialogue: ['Fort Bracken is ours again. Rivin\'s blade will strengthen our ranks.'],
    tracked: true,
    sortOrder: 200,
  },

  act1_liberate_catacombs: {
    id: 'act1_liberate_catacombs',
    name: 'Liberate the Catacombs',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Captain Metz',
    description: 'The ancient catacombs northeast of Bracken are a source of Atikesh\'s power. Delve in, find the wizard Rickets, and destroy the Wight Commander.',
    objectives: [
      { id: 'reach_catacombs', type: 'reach_location', target: 'catacombs', description: 'Enter the Catacombs', required: 1 },
      { id: 'talk_rickets', type: 'talk_npc', target: 'rickets', description: 'Speak with Rickets', required: 1 },
      { id: 'defeat_wight_commander', type: 'defeat_enemy', target: 'wight_commander', description: 'Defeat the Wight Commander', required: 1 },
    ],
    prereqs: ['act1_secure_bracken'],
    rewards: { gold: 150, xp: 100, items: [], unlocks: [] },
    acceptDialogue: ['The catacombs are the heart of the corruption in this region. We go in and cut it out.'],
    completeDialogue: ['The Wight Commander is destroyed. The catacombs grow quiet — for now.'],
    tracked: true,
    sortOrder: 300,
  },

  act1_running_from_fate: {
    id: 'act1_running_from_fate',
    name: 'Running from Fate',
    act: 1,
    type: 'main',
    giver: 'auto',
    giverName: 'Captain Metz',
    description: 'Rumors speak of a scholar named Tertullian who knows the source of Atikesh\'s power, and a deserter called Sivin who may know a path through the cursed lands.',
    objectives: [
      { id: 'talk_tertullian', type: 'talk_npc', target: 'tertullian', description: 'Speak with Tertullian', required: 1 },
      { id: 'talk_sivin', type: 'talk_npc', target: 'sivin', description: 'Speak with Sivin', required: 1 },
      { id: 'reach_dungeon', type: 'reach_location', target: 'dungeon', description: 'Enter the dungeon', required: 1 },
    ],
    prereqs: ['act1_liberate_catacombs'],
    rewards: { gold: 100, xp: 80, items: [], unlocks: [] },
    acceptDialogue: ['We need answers. There are people out there who know more about this curse than we do.'],
    completeDialogue: ['The path forward is clear. The real fight begins now.'],
    tracked: true,
    sortOrder: 400,
  },

  // ──── Act I Side Quests ────

  act1_thin_the_horde: {
    id: 'act1_thin_the_horde',
    name: 'Thin the Horde',
    act: 1,
    type: 'side',
    giver: 'auto',
    giverName: 'Eastern Watch',
    description: 'The skeleton patrols grow bolder each day. Thin their numbers to slow Atikesh\'s advance.',
    objectives: [
      { id: 'kill_skeletons', type: 'defeat_count', target: 'skeleton', description: 'Defeat skeletons', required: 10 },
    ],
    prereqs: [],
    rewards: { gold: 100, xp: 60, items: [], unlocks: [] },
    acceptDialogue: ['Skeleton patrols are everywhere. Every one you destroy buys the frontier more time.'],
    completeDialogue: ['Ten skeletons felled. The cursed lands are quieter... for now.'],
    tracked: true,
    sortOrder: 500,
  },

  act1_wolves_at_the_door: {
    id: 'act1_wolves_at_the_door',
    name: 'Wolves at the Door',
    act: 1,
    type: 'side',
    giver: 'auto',
    giverName: 'Eastern Watch',
    description: 'Corrupted dire wolves are terrorizing the frontier roads. Put them down before they claim more lives.',
    objectives: [
      { id: 'kill_wolves', type: 'defeat_count', target: 'dire_wolf', description: 'Defeat dire wolves', required: 8 },
    ],
    prereqs: [],
    rewards: { gold: 80, xp: 50, items: [], unlocks: [] },
    acceptDialogue: ['Dire wolves haunt the roads and farmlands. They need to be culled.'],
    completeDialogue: ['Eight dire wolves slain. The roads are safer — for now.'],
    tracked: true,
    sortOrder: 600,
  },
};
