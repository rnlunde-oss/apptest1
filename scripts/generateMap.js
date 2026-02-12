#!/usr/bin/env node
// Map generator for Defense of Rhaud — 200x200 world map
// Run: node scripts/generateMap.js

const COLS = 200;
const ROWS = 200;

// Tile types:
// 0=dirt, 1=wall, 2=cursed, 3=stone path, 4=water, 5=NPC spawn, 6=player spawn
// 7=wood wall, 8=campfire/shop, 9=deep cursed, 10=boss altar, 11=inn
// 12=farmland, 13=forest, 14=mountain rock, 15=mountain pass, 16=sand
// 17=deep forest, 18=dungeon entrance, 19=bridge, 21=shop building

const map = [];
for (let r = 0; r < ROWS; r++) {
  map[r] = new Array(COLS).fill(0);
}

// ── Helper functions ──
function fill(r1, c1, r2, c2, tile) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = tile;
    }
  }
}

function setTile(r, c, tile) {
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) map[r][c] = tile;
}

function hRoad(r, c1, c2) {
  const [start, end] = c1 < c2 ? [c1, c2] : [c2, c1];
  for (let c = start; c <= end; c++) setTile(r, c, 3);
}

function vRoad(c, r1, r2) {
  const [start, end] = r1 < r2 ? [r1, r2] : [r2, r1];
  for (let r = start; r <= end; r++) setTile(r, c, 3);
}

// Wide road helpers for better visibility on larger map
function wideHRoad(r, c1, c2) {
  hRoad(r, c1, c2);
  hRoad(r + 1, c1, c2);
}

function wideVRoad(c, r1, r2) {
  vRoad(c, r1, r2);
  vRoad(c + 1, r1, r2);
}

// ══════════════════════════════════════════════
// Step 1: BASE — fill with dirt
// (already done — all 0)

// ══════════════════════════════════════════════
// Step 2: BORDERS
// Top and bottom walls
for (let c = 0; c < COLS; c++) { map[0][c] = 1; map[ROWS - 1][c] = 1; }
// Left and right walls
for (let r = 0; r < ROWS; r++) { map[r][0] = 1; map[r][COLS - 1] = 1; }

// ══════════════════════════════════════════════
// Step 3: REGIONS

// Asvam Farmlands: cols 5-100, rows 120-190
for (let r = 120; r <= 190; r++) {
  for (let c = 5; c <= 100; c++) {
    map[r][c] = 12; // farmland
    if (Math.random() < 0.08) map[r][c] = 0; // dirt patches
  }
}

// Fartheling Forest: cols 45-120, rows 57-100
for (let r = 57; r <= 100; r++) {
  for (let c = 45; c <= 120; c++) {
    map[r][c] = 13; // forest
    if (Math.random() < 0.15) map[r][c] = 17; // deep forest scatter
  }
}

// Thecundian Mountains: cols 15-120, rows 7-53
for (let r = 7; r <= 53; r++) {
  for (let c = 15; c <= 120; c++) {
    map[r][c] = 14; // mountain rock (impassable)
    if (Math.random() < 0.12) map[r][c] = 15; // mountain pass
  }
}

// Harrowed Woodlands: cols 105-175, rows 7-53
for (let r = 7; r <= 53; r++) {
  for (let c = 105; c <= 175; c++) {
    map[r][c] = 9; // harrowed
    if (Math.random() < 0.2) map[r][c] = 2; // cursed scatter
  }
}

// Coastline: cols 165-195, rows 57-190 — sand and water
for (let r = 57; r <= 190; r++) {
  for (let c = 165; c <= 195; c++) {
    if (c >= 185) map[r][c] = 4; // ocean water
    else if (c >= 178) map[r][c] = 16; // sand
    else if (c >= 170) map[r][c] = 16; // sand near coast
  }
}
// Ocean on left edge (small)
for (let r = 153; r <= 190; r++) {
  for (let c = 1; c <= 8; c++) {
    map[r][c] = 4;
  }
}

// Transition zones: dirt between farmlands and forest
for (let r = 103; r <= 117; r++) {
  for (let c = 5; c <= 120; c++) {
    if (map[r][c] === 0) {
      if (Math.random() < 0.3) map[r][c] = 12;
      else if (Math.random() < 0.2) map[r][c] = 13;
    }
  }
}

// Transition: forest to mountain (rows 50-60)
for (let r = 50; r <= 60; r++) {
  for (let c = 45; c <= 120; c++) {
    if (map[r][c] === 14 && Math.random() < 0.3) map[r][c] = 15;
    if (map[r][c] === 0 && Math.random() < 0.4) map[r][c] = 13;
  }
}

// ══════════════════════════════════════════════
// Step 4: RIVER — Ruah River from ~(col 10, row 107) curving to (col 165, row 113)
// 4-6 tiles wide, gentle curve
const riverPoints = [];
for (let c = 10; c <= 165; c++) {
  // Gentle sine curve
  const t = (c - 10) / (165 - 10);
  const baseRow = 107 + Math.sin(t * Math.PI * 1.5) * 10;
  const r = Math.round(baseRow);
  riverPoints.push({ c, r });
}
for (const { c, r } of riverPoints) {
  setTile(r, c, 4);
  setTile(r + 1, c, 4);
  setTile(r + 2, c, 4);
  setTile(r + 3, c, 4);
  if (Math.random() < 0.4) setTile(r - 1, c, 4);
  if (Math.random() < 0.3) setTile(r + 4, c, 4);
}

// ══════════════════════════════════════════════
// Step 5: MOUNTAIN PASSES — clear walkable corridors

// Main east-west pass through mountains at rows 33-37 (5 wide)
for (let c = 15; c <= 120; c++) {
  for (let r = 33; r <= 37; r++) {
    setTile(r, c, 15);
  }
}
// North-south pass near cols 35-38 (to reach Vranek Spire)
for (let r = 7; r <= 53; r++) {
  for (let c = 35; c <= 38; c++) {
    setTile(r, c, 15);
  }
}
// North-south pass near cols 75-78 (connecting forest to mountains)
for (let r = 7; r <= 60; r++) {
  for (let c = 75; c <= 78; c++) {
    setTile(r, c, 15);
  }
}
// Pass near cols 110-113 connecting to harrowed woodlands
for (let r = 7; r <= 53; r++) {
  for (let c = 110; c <= 113; c++) {
    setTile(r, c, 15);
  }
}

// ══════════════════════════════════════════════
// Step 6: ROADS — stone paths connecting towns

// Verlan Farmstead (20, 177) to Yuelian Hamlet (35, 133)
wideVRoad(20, 133, 177);
wideHRoad(133, 20, 35);

// Yuelian Hamlet (35, 133) to Fort Bracken (50, 87)
wideVRoad(35, 87, 133);
wideHRoad(87, 35, 50);

// Fort Bracken (50, 87) road east to connect
wideHRoad(87, 50, 88);
// Fort Bracken south to farmlands
wideVRoad(50, 87, 120);

// Road from Fort Bracken area to Wenden Cemetery (80, 73)
wideHRoad(73, 50, 80);
wideVRoad(80, 73, 87);

// Wenden Cemetery (80, 73) to The Monastery (165, 33)
wideHRoad(73, 80, 125);
wideVRoad(125, 33, 73);
wideHRoad(33, 125, 165);

// Road to Tavrish (160, 113) from main road
wideVRoad(160, 73, 113);
wideHRoad(113, 125, 160);

// Road from Verlan Farmstead east
wideHRoad(177, 20, 75);

// Main north-south road from forest to mountains
wideVRoad(75, 33, 120);

// Road to Vranek Spire
wideVRoad(35, 13, 60);

// Road to The Reliquary (115, 20)
wideHRoad(20, 75, 115);

// ══════════════════════════════════════════════
// Step 7: BRIDGES — where roads cross river

// Find where roads cross the river and place bridges
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (map[r][c] === 4) {
      // Check if there's road above and below (vertical road crossing)
      const above = r > 0 && map[r - 1][c] === 3;
      const below = r < ROWS - 1 && map[r + 1][c] === 3;
      if (above || below) {
        map[r][c] = 19; // bridge
      }
      // Check if there's road left and right (horizontal road crossing)
      const left = c > 0 && map[r][c - 1] === 3;
      const right = c < COLS - 1 && map[r][c + 1] === 3;
      if (left || right) {
        map[r][c] = 19; // bridge
      }
    }
  }
}

// ══════════════════════════════════════════════
// Step 8: TOWNS

function buildTown(name, cx, cy, w, h, features) {
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);

  // Clear town area to dirt
  fill(cy - halfH, cx - halfW, cy + halfH, cx + halfW, 0);

  // Stone path border
  for (let c = cx - halfW; c <= cx + halfW; c++) {
    setTile(cy - halfH, c, 3);
    setTile(cy + halfH, c, 3);
  }
  for (let r = cy - halfH; r <= cy + halfH; r++) {
    setTile(r, cx - halfW, 3);
    setTile(r, cx + halfW, 3);
  }

  // Internal paths — cross pattern
  hRoad(cy, cx - halfW, cx + halfW);
  vRoad(cx, cy - halfH, cy + halfH);
  // Additional internal paths for larger towns
  if (w >= 14) {
    hRoad(cy - Math.floor(halfH / 2), cx - halfW, cx + halfW);
    hRoad(cy + Math.floor(halfH / 2), cx - halfW, cx + halfW);
  }
  if (h >= 10) {
    vRoad(cx - Math.floor(halfW / 3), cy - halfH, cy + halfH);
    vRoad(cx + Math.floor(halfW / 3), cy - halfH, cy + halfH);
  }

  if (features.inn) setTile(cy - 2, cx + 4, 11);
  if (features.shop) setTile(cy + 2, cx - 4, 8);
  if (features.playerSpawn) setTile(cy, cx, 6);
  if (features.walls) {
    // Stone wall perimeter
    for (let c = cx - halfW; c <= cx + halfW; c++) {
      setTile(cy - halfH, c, 1);
      setTile(cy + halfH, c, 1);
    }
    for (let r = cy - halfH; r <= cy + halfH; r++) {
      setTile(r, cx - halfW, 1);
      setTile(r, cx + halfW, 1);
    }
    // Gate openings (wider for larger towns)
    setTile(cy, cx - halfW, 3);
    setTile(cy, cx - halfW + 1, 3);
    setTile(cy, cx + halfW, 3);
    setTile(cy, cx + halfW - 1, 3);
    setTile(cy - halfH, cx, 3);
    setTile(cy - halfH, cx + 1, 3);
    setTile(cy + halfH, cx, 3);
    setTile(cy + halfH, cx + 1, 3);
  }
}

// Verlan Farmstead (20, 177): 18x14, inn, shop, player spawn
buildTown('Verlan', 20, 177, 18, 14, { inn: true, shop: true, playerSpawn: true });

// Yuelian Hamlet (35, 133): 14x10, inn
buildTown('Yuelian', 35, 133, 14, 10, { inn: true, shop: false });

// Fort Bracken (50, 87): 22x14, stone walls, inn, shop
buildTown('FortBracken', 50, 87, 22, 14, { inn: true, shop: true, walls: true });

// Wenden Cemetery (80, 73): 14x10, inn
buildTown('Wenden', 80, 73, 14, 10, { inn: true, shop: false });

// The Monastery (165, 33): 18x10, inn
buildTown('Monastery', 165, 33, 18, 10, { inn: true, shop: false });

// Tavrish (160, 113): 18x10, inn, shop
buildTown('Tavrish', 160, 113, 18, 10, { inn: true, shop: true });

// ══════════════════════════════════════════════
// Step 9: DUNGEONS

// Vranek Spire (35, 13) — boss altar
// Clear a larger area around it (7x7)
fill(10, 32, 16, 38, 15); // mountain pass floor
setTile(13, 35, 10); // boss altar
setTile(13, 36, 18); // dungeon entrance nearby

// The Reliquary (115, 20) — dungeon entrance
fill(17, 112, 23, 118, 15); // clear area
setTile(20, 115, 18); // dungeon entrance

// ══════════════════════════════════════════════
// Step 10: Ensure roads connect properly after town building
// Re-lay key road segments that towns may have overwritten

// Verlan to Yuelian
wideVRoad(20, 170, 177); // short segment out of Verlan
wideVRoad(20, 128, 138); // into Yuelian area

// Yuelian to Fort Bracken
wideVRoad(35, 128, 138); // out of Yuelian
wideVRoad(35, 80, 94); // toward Fort Bracken

// Fort Bracken connections
wideHRoad(87, 39, 61); // through Fort Bracken east-west

// ══════════════════════════════════════════════
// Step 11: Ensure town areas have NPC spawn tiles cleared (they're just dirt/path)
// NPCs are placed by OverworldScene via pixel coords, not map tiles

// ══════════════════════════════════════════════
// OUTPUT

const rows = map.map(row => '  [' + row.join(',') + ']');
console.log('export const OVERWORLD_MAP = [');
console.log(rows.join(',\n'));
console.log('];');
