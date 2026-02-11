// Tile types — Eastern Frontier Outpost
// 0 = dirt ground (walkable)
// 1 = stone wall / palisade (impassable)
// 2 = cursed ground (walkable, encounters)
// 3 = stone path (walkable)
// 4 = river (impassable)
// 5 = NPC: Rivin spawn
// 6 = player spawn
// 7 = wooden wall (impassable)
// 8 = campfire (impassable)
// 9 = deep cursed ground (walkable, harder encounters)
// 10 = boss altar (walkable, boss encounter)
// 11 = inn (impassable building)

export const TILE_SIZE = 32;
export const MAP_COLS = 25;
export const MAP_ROWS = 20;

export const OVERWORLD_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,3,3,3,0,0,0,0,0,1,7,7,7,7,1,0,0,2,2,9,9,9,9,1],
  [1,3,0,0,3,0,0,0,0,0,1,7,0,0,7,1,0,0,2,2,9,9,9,9,1],
  [1,3,0,0,3,0,0,0,0,0,1,7,0,5,7,1,0,0,0,2,2,9,10,9,1],
  [1,3,0,0,3,3,3,3,0,0,1,7,7,7,7,1,0,0,0,0,2,9,9,9,1],
  [1,3,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,2,9,9,1],
  [1,3,3,3,3,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,9,1],
  [1,0,0,0,3,0,0,3,3,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,3,0,0,0,0,0,8,0,0,0,0,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,3,0,0,0,0,0,0,0,11,0,0,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,3,0,0,0,6,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,3,0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,2,2,1],
  [1,0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,0,0,0,0,0,2,2,2,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
  [1,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,1],
  [1,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,1],
  [1,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,1],
  [1,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,1],
  [1,4,4,4,4,4,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export const TILE_COLORS = {
  0: 0x6b5b3a,  // dirt
  1: 0x555555,  // stone wall
  2: 0x3a2a3a,  // cursed ground
  3: 0x888070,  // stone path
  4: 0x2244aa,  // river
  5: 0x6b5b3a,  // NPC spot (dirt)
  6: 0x888070,  // player spawn (path)
  7: 0x8b6b3a,  // wood wall
  8: 0x6b5b3a,  // campfire base
  9: 0x2a1a30,  // deep cursed ground
  10: 0x660022, // boss altar
  11: 0x8b6b3a, // inn
};

export const ENCOUNTER_RATE = 0.10;
export const ENCOUNTER_RATE_DEEP = 0.14;
