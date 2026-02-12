#!/usr/bin/env node
// Map generator for Defense of Rhaud — 80x60 world map
// Run: node scripts/generateMap.js

const COLS = 80;
const ROWS = 60;

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

// Asvam Farmlands: cols 2-40, rows 36-57
for (let r = 36; r <= 57; r++) {
  for (let c = 2; c <= 40; c++) {
    map[r][c] = 12; // farmland
    if (Math.random() < 0.08) map[r][c] = 0; // dirt patches
  }
}

// Fartheling Forest: cols 18-48, rows 17-30
for (let r = 17; r <= 30; r++) {
  for (let c = 18; c <= 48; c++) {
    map[r][c] = 13; // forest
    if (Math.random() < 0.15) map[r][c] = 17; // deep forest scatter
  }
}

// Thecundian Mountains: cols 6-48, rows 2-16
for (let r = 2; r <= 16; r++) {
  for (let c = 6; c <= 48; c++) {
    map[r][c] = 14; // mountain rock (impassable)
    if (Math.random() < 0.12) map[r][c] = 15; // mountain pass
  }
}

// Harrowed Woodlands: cols 42-70, rows 2-16
for (let r = 2; r <= 16; r++) {
  for (let c = 42; c <= 70; c++) {
    map[r][c] = 9; // harrowed
    if (Math.random() < 0.2) map[r][c] = 2; // cursed scatter
  }
}

// Coastline: cols 66-78, rows 17-57 — sand and water
for (let r = 17; r <= 57; r++) {
  for (let c = 66; c <= 78; c++) {
    if (c >= 74) map[r][c] = 4; // ocean water
    else if (c >= 71) map[r][c] = 16; // sand
    else if (c >= 68) map[r][c] = 16; // sand near coast
  }
}
// Ocean on left edge (small)
for (let r = 46; r <= 57; r++) {
  for (let c = 1; c <= 3; c++) {
    map[r][c] = 4;
  }
}

// Transition zones: dirt between farmlands and forest
for (let r = 31; r <= 35; r++) {
  for (let c = 2; c <= 48; c++) {
    if (map[r][c] === 0) {
      if (Math.random() < 0.3) map[r][c] = 12;
      else if (Math.random() < 0.2) map[r][c] = 13;
    }
  }
}

// Transition: forest to mountain (rows 15-18)
for (let r = 15; r <= 18; r++) {
  for (let c = 18; c <= 48; c++) {
    if (map[r][c] === 14 && Math.random() < 0.3) map[r][c] = 15;
    if (map[r][c] === 0 && Math.random() < 0.4) map[r][c] = 13;
  }
}

// ══════════════════════════════════════════════
// Step 4: RIVER — Ruah River from ~(col 4, row 32) curving to (col 66, row 34)
// 2-3 tiles wide, gentle curve
const riverPoints = [];
for (let c = 4; c <= 66; c++) {
  // Gentle sine curve
  const t = (c - 4) / (66 - 4);
  const baseRow = 32 + Math.sin(t * Math.PI * 1.5) * 3;
  const r = Math.round(baseRow);
  riverPoints.push({ c, r });
}
for (const { c, r } of riverPoints) {
  setTile(r, c, 4);
  setTile(r + 1, c, 4);
  if (Math.random() < 0.4) setTile(r - 1, c, 4);
}

// ══════════════════════════════════════════════
// Step 5: MOUNTAIN PASSES — clear walkable corridors

// Main east-west pass through mountains at row 10
for (let c = 6; c <= 48; c++) {
  setTile(10, c, 15);
  setTile(11, c, 15);
}
// North-south pass near col 14 (to reach Vranek Spire)
for (let r = 2; r <= 16; r++) {
  setTile(r, 14, 15);
  setTile(r, 15, 15);
}
// North-south pass near col 30 (connecting forest to mountains)
for (let r = 2; r <= 18; r++) {
  setTile(r, 30, 15);
  setTile(r, 31, 15);
}
// Pass near col 44 connecting to harrowed woodlands
for (let r = 2; r <= 16; r++) {
  setTile(r, 44, 15);
  setTile(r, 45, 15);
}

// ══════════════════════════════════════════════
// Step 6: ROADS — stone paths connecting towns

// Verlan Farmstead (8, 53) to Yuelian Hamlet (14, 40)
vRoad(8, 40, 53);
hRoad(40, 8, 14);

// Yuelian Hamlet (14, 40) to Fort Bracken (20, 26)
vRoad(14, 26, 40);
hRoad(26, 14, 20);

// Fort Bracken (20, 26) road east to connect
hRoad(26, 20, 35);
// Fort Bracken south to farmlands
vRoad(20, 26, 36);

// Road from Fort Bracken area to Wenden Cemetery (32, 22)
hRoad(22, 20, 32);
vRoad(32, 22, 26);

// Wenden Cemetery (32, 22) to The Monastery (66, 10)
hRoad(22, 32, 50);
vRoad(50, 10, 22);
hRoad(10, 50, 66);

// Road to Tavrish (64, 34) from main road
vRoad(64, 22, 34);
hRoad(34, 50, 64);

// Road from Verlan Farmstead east
hRoad(53, 8, 30);

// Main north-south road from forest to mountains
vRoad(30, 10, 36);

// Road to Vranek Spire
vRoad(14, 4, 18);

// Road to The Reliquary (46, 6)
hRoad(6, 30, 46);

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

  // Internal path
  hRoad(cy, cx - halfW, cx + halfW);
  vRoad(cx, cy - halfH, cy + halfH);

  if (features.inn) setTile(cy - 1, cx + 2, 11);
  if (features.shop) setTile(cy + 1, cx - 2, 8);
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
    // Gate openings
    setTile(cy, cx - halfW, 3);
    setTile(cy, cx + halfW, 3);
    setTile(cy - halfH, cx, 3);
    setTile(cy + halfH, cx, 3);
  }
}

// Verlan Farmstead (8, 53): 9x7, inn, shop, player spawn
buildTown('Verlan', 8, 53, 9, 7, { inn: true, shop: true, playerSpawn: true });

// Yuelian Hamlet (14, 40): 7x5, inn
buildTown('Yuelian', 14, 40, 7, 5, { inn: true, shop: false });

// Fort Bracken (20, 26): 11x7, stone walls, inn, shop
buildTown('FortBracken', 20, 26, 11, 7, { inn: true, shop: true, walls: true });

// Wenden Cemetery (32, 22): 7x5, inn
buildTown('Wenden', 32, 22, 7, 5, { inn: true, shop: false });

// The Monastery (66, 10): 9x5, inn
buildTown('Monastery', 66, 10, 9, 5, { inn: true, shop: false });

// Tavrish (64, 34): 9x5, inn, shop
buildTown('Tavrish', 64, 34, 9, 5, { inn: true, shop: true });

// ══════════════════════════════════════════════
// Step 9: DUNGEONS

// Vranek Spire (14, 4) — boss altar
setTile(4, 14, 10);
setTile(4, 15, 18); // dungeon entrance nearby
// Clear a small area around it
fill(3, 13, 5, 16, 15); // mountain pass floor
setTile(4, 14, 10); // boss altar

// The Reliquary (46, 6) — dungeon entrance
fill(5, 45, 7, 47, 15); // clear area
setTile(6, 46, 18); // dungeon entrance

// ══════════════════════════════════════════════
// Step 10: Ensure roads connect properly after town building
// Re-lay key road segments that towns may have overwritten

// Verlan to Yuelian
vRoad(8, 50, 53); // short segment out of Verlan
vRoad(8, 38, 42); // into Yuelian area

// Yuelian to Fort Bracken
vRoad(14, 38, 42); // out of Yuelian
vRoad(14, 24, 30); // toward Fort Bracken

// ══════════════════════════════════════════════
// Step 11: Ensure town areas have NPC spawn tiles cleared (they're just dirt/path)
// NPCs are placed by OverworldScene via pixel coords, not map tiles

// ══════════════════════════════════════════════
// OUTPUT

const rows = map.map(row => '  [' + row.join(',') + ']');
console.log('export const OVERWORLD_MAP = [');
console.log(rows.join(',\n'));
console.log('];');
