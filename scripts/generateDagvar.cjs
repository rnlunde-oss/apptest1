// Generate dagvar_battle.png — dark death knight boss sprite
const { createCanvas } = require('canvas');
const fs = require('fs');

const W = 1024, H = 1536;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Helpers
function ellipse(cx, cy, rx, ry, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function roundRect(x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.fill();
}

function gradient(x1, y1, x2, y2, c1, c2) {
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

function radialGrad(cx, cy, r1, r2, c1, c2) {
  const g = ctx.createRadialGradient(cx, cy, r1, cx, cy, r2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

function tri(x1, y1, x2, y2, x3, y3, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

// Clear transparent
ctx.clearRect(0, 0, W, H);

// ─── Dark energy aura (background glow) ───
ctx.save();
ctx.globalAlpha = 0.12;
ctx.fillStyle = radialGrad(512, 750, 50, 450, '#8833aa', 'transparent');
ctx.fillRect(0, 0, W, H);
ctx.restore();

// ─── Cape / Cloak (behind body) ───
ctx.save();
ctx.fillStyle = gradient(400, 300, 400, 1350, '#1a1018', '#0d0810');
ctx.beginPath();
ctx.moveTo(360, 380);
ctx.quadraticCurveTo(280, 600, 260, 900);
ctx.quadraticCurveTo(240, 1100, 220, 1340);
ctx.lineTo(340, 1360);
ctx.quadraticCurveTo(360, 1200, 380, 1100);
ctx.lineTo(420, 600);
ctx.closePath();
ctx.fill();
// Right side of cape
ctx.beginPath();
ctx.moveTo(660, 380);
ctx.quadraticCurveTo(720, 600, 740, 900);
ctx.quadraticCurveTo(760, 1100, 790, 1340);
ctx.lineTo(680, 1360);
ctx.quadraticCurveTo(660, 1200, 640, 1100);
ctx.lineTo(600, 600);
ctx.closePath();
ctx.fill();
ctx.restore();

// Cape tattered edges
ctx.save();
ctx.fillStyle = '#1a1018';
for (let i = 0; i < 8; i++) {
  const bx = 230 + i * 18;
  tri(bx, 1330, bx + 10, 1380, bx + 20, 1330, '#0d0810');
}
for (let i = 0; i < 8; i++) {
  const bx = 670 + i * 18;
  tri(bx, 1330, bx + 10, 1380, bx + 20, 1330, '#0d0810');
}
ctx.restore();

// ─── Legs — armored greaves ───
// Left leg
ctx.fillStyle = gradient(380, 900, 380, 1350, '#2e2418', '#1a150e');
ctx.fillRect(385, 920, 100, 380);
// Right leg
ctx.fillStyle = gradient(540, 900, 540, 1350, '#2e2418', '#1a150e');
ctx.fillRect(540, 920, 100, 380);

// Knee guards
ctx.fillStyle = '#3d3225';
roundRect(375, 920, 120, 50, 8, '#3d3225');
roundRect(530, 920, 120, 50, 8, '#3d3225');
// Knee rivets
ellipse(435, 945, 8, 8, '#554a3a');
ellipse(590, 945, 8, 8, '#554a3a');

// Shin plate highlights
ctx.save();
ctx.globalAlpha = 0.15;
ctx.fillStyle = '#887766';
ctx.fillRect(400, 980, 20, 200);
ctx.fillRect(555, 980, 20, 200);
ctx.restore();

// Boots — heavy dark
roundRect(370, 1280, 130, 60, 10, '#1a150e');
roundRect(525, 1280, 130, 60, 10, '#1a150e');
// Boot soles
ctx.fillStyle = '#111';
ctx.fillRect(370, 1330, 130, 12);
ctx.fillRect(525, 1330, 130, 12);
// Boot straps
ctx.fillStyle = '#3a2e1e';
ctx.fillRect(375, 1260, 120, 8);
ctx.fillRect(530, 1260, 120, 8);
ctx.fillRect(375, 1290, 120, 8);
ctx.fillRect(530, 1290, 120, 8);

// ─── Torso — heavy dark breastplate ───
ctx.fillStyle = gradient(350, 380, 350, 880, '#2e2418', '#221c12');
ctx.beginPath();
ctx.moveTo(360, 400);
ctx.lineTo(660, 400);
ctx.lineTo(670, 880);
ctx.lineTo(350, 880);
ctx.closePath();
ctx.fill();

// Chest plate — layered armor plates
ctx.fillStyle = gradient(380, 420, 380, 700, '#3d3225', '#2e2418');
roundRect(380, 420, 260, 200, 15, '#3d3225');

// Chest center ridge
ctx.fillStyle = '#4a3d30';
ctx.fillRect(505, 430, 12, 180);

// Chest horizontal plate lines
ctx.strokeStyle = '#4a3d30';
ctx.lineWidth = 3;
for (let y = 470; y < 620; y += 45) {
  ctx.beginPath();
  ctx.moveTo(395, y);
  ctx.lineTo(625, y);
  ctx.stroke();
}

// Dark rune on chest — glowing purple
ctx.save();
ctx.strokeStyle = '#7733aa';
ctx.lineWidth = 4;
ctx.shadowColor = '#9944cc';
ctx.shadowBlur = 15;
// Vertical line
ctx.beginPath();
ctx.moveTo(512, 460);
ctx.lineTo(512, 580);
ctx.stroke();
// Horizontal line
ctx.beginPath();
ctx.moveTo(450, 520);
ctx.lineTo(574, 520);
ctx.stroke();
// Circle around center
ctx.beginPath();
ctx.arc(512, 520, 35, 0, Math.PI * 2);
ctx.stroke();
ctx.restore();

// ─── Belt ───
roundRect(345, 860, 330, 40, 5, '#4a3828');
// Belt buckle — skull
ellipse(512, 880, 20, 18, '#d4c8a0');
// Skull eyes
ellipse(505, 876, 4, 3, '#1a1018');
ellipse(519, 876, 4, 3, '#1a1018');
// Skull mouth
ctx.fillStyle = '#1a1018';
ctx.fillRect(507, 886, 10, 4);

// Belt rivets
for (let x = 370; x < 480; x += 30) {
  ellipse(x, 880, 5, 5, '#665540');
}
for (let x = 545; x < 660; x += 30) {
  ellipse(x, 880, 5, 5, '#665540');
}

// ─── Shoulder pauldrons ───
// Left pauldron
ctx.fillStyle = gradient(240, 340, 240, 440, '#3d3225', '#2a2018');
ctx.beginPath();
ctx.moveTo(240, 380);
ctx.quadraticCurveTo(240, 340, 360, 360);
ctx.lineTo(370, 440);
ctx.quadraticCurveTo(240, 440, 240, 380);
ctx.fill();
// Right pauldron
ctx.fillStyle = gradient(660, 340, 660, 440, '#3d3225', '#2a2018');
ctx.beginPath();
ctx.moveTo(780, 380);
ctx.quadraticCurveTo(780, 340, 660, 360);
ctx.lineTo(650, 440);
ctx.quadraticCurveTo(780, 440, 780, 380);
ctx.fill();

// Pauldron spikes
tri(260, 370, 230, 280, 300, 370, '#4a3d30');
tri(280, 360, 260, 290, 310, 360, '#3d3225');
tri(740, 370, 770, 280, 700, 370, '#4a3d30');
tri(720, 360, 740, 290, 690, 360, '#3d3225');

// Skull decoration on pauldrons
ellipse(310, 400, 18, 16, '#d4c8a0');
ellipse(304, 396, 4, 3, '#1a1018');
ellipse(316, 396, 4, 3, '#1a1018');
ellipse(710, 400, 18, 16, '#d4c8a0');
ellipse(704, 396, 4, 3, '#1a1018');
ellipse(716, 396, 4, 3, '#1a1018');

// ─── Arms — armored ───
// Left arm
ctx.fillStyle = gradient(280, 440, 280, 780, '#2e2418', '#221c12');
ctx.fillRect(270, 440, 90, 340);
// Right arm
ctx.fillStyle = gradient(650, 440, 650, 780, '#2e2418', '#221c12');
ctx.fillRect(650, 440, 90, 340);

// Elbow guards
roundRect(265, 580, 100, 40, 8, '#3d3225');
roundRect(645, 580, 100, 40, 8, '#3d3225');

// ─── Gauntlets ───
// Left gauntlet
roundRect(255, 750, 110, 60, 8, '#3d3225');
// Finger plates
for (let i = 0; i < 4; i++) {
  ctx.fillStyle = '#2e2418';
  ctx.fillRect(262 + i * 24, 800, 18, 25);
}
// Right gauntlet
roundRect(645, 750, 110, 60, 8, '#3d3225');
for (let i = 0; i < 4; i++) {
  ctx.fillStyle = '#2e2418';
  ctx.fillRect(652 + i * 24, 800, 18, 25);
}

// ─── Greatsword (right hand, extending upward) ───
ctx.save();
ctx.translate(720, 500);
ctx.rotate(-0.3);

// Pommel
ellipse(0, 350, 18, 18, '#4a3020');
ellipse(0, 350, 10, 10, '#884422');

// Grip — wrapped leather
ctx.fillStyle = '#3a2818';
ctx.fillRect(-10, 220, 20, 130);
// Grip wrapping
ctx.strokeStyle = '#554030';
ctx.lineWidth = 3;
for (let y = 230; y < 350; y += 15) {
  ctx.beginPath();
  ctx.moveTo(-10, y);
  ctx.lineTo(10, y + 10);
  ctx.stroke();
}

// Cross guard
ctx.fillStyle = gradient(-55, 210, 55, 210, '#555555', '#777777');
roundRect(-55, 205, 110, 20, 4, '#666666');
// Guard end caps
ellipse(-52, 215, 10, 12, '#555555');
ellipse(52, 215, 10, 12, '#555555');
// Purple gem in guard center
ellipse(0, 215, 10, 8, '#9944cc');
ctx.save();
ctx.shadowColor = '#bb66ee';
ctx.shadowBlur = 10;
ellipse(0, 215, 6, 5, '#cc88ff');
ctx.restore();

// Blade — broad and dark
ctx.fillStyle = gradient(-20, -200, 20, -200, '#8899aa', '#667788');
ctx.beginPath();
ctx.moveTo(-22, 205);
ctx.lineTo(22, 205);
ctx.lineTo(18, -180);
ctx.lineTo(0, -220);
ctx.lineTo(-18, -180);
ctx.closePath();
ctx.fill();

// Blade center fuller (groove)
ctx.fillStyle = '#5a6a7a';
ctx.fillRect(-5, -150, 10, 340);

// Dark energy on blade
ctx.save();
ctx.globalAlpha = 0.5;
ctx.fillStyle = gradient(-20, -100, 20, 200, '#662244', '#44113388');
ctx.beginPath();
ctx.moveTo(-18, 200);
ctx.lineTo(18, 200);
ctx.lineTo(14, -150);
ctx.lineTo(0, -200);
ctx.lineTo(-14, -150);
ctx.closePath();
ctx.fill();
ctx.restore();

// Blade edge highlights
ctx.strokeStyle = 'rgba(200, 210, 220, 0.4)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(-22, 200);
ctx.lineTo(-18, -180);
ctx.lineTo(0, -220);
ctx.stroke();

// Dark energy wisps on blade
ctx.save();
ctx.globalAlpha = 0.6;
ctx.strokeStyle = '#9944cc';
ctx.lineWidth = 3;
ctx.shadowColor = '#bb66ee';
ctx.shadowBlur = 8;
ctx.beginPath();
ctx.moveTo(-10, 100);
ctx.quadraticCurveTo(-30, 50, -8, 0);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(10, 50);
ctx.quadraticCurveTo(30, 0, 8, -50);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(-5, -30);
ctx.quadraticCurveTo(-25, -80, -3, -130);
ctx.stroke();
ctx.restore();

ctx.restore();

// ─── Helmet — dark horned helm ───
// Neck
ctx.fillStyle = '#2a2018';
ctx.fillRect(480, 300, 64, 80);

// Helm base
ctx.fillStyle = gradient(440, 160, 440, 320, '#3d3225', '#2a2018');
ctx.beginPath();
ctx.arc(512, 240, 90, 0, Math.PI * 2);
ctx.fill();

// Helm face plate — darker
ctx.fillStyle = '#1a150e';
roundRect(455, 210, 114, 80, 10, '#1a150e');

// Visor slit
ctx.fillStyle = '#0a0806';
roundRect(460, 250, 104, 22, 4, '#0a0806');

// Glowing red eyes
ctx.save();
ctx.shadowColor = '#ff2222';
ctx.shadowBlur = 20;
ctx.fillStyle = '#ff3333';
ellipse(488, 260, 14, 8, '#ff3333');
ellipse(536, 260, 14, 8, '#ff3333');
// Bright center
ctx.shadowBlur = 30;
ctx.fillStyle = '#ff8888';
ellipse(488, 260, 7, 4, '#ff8888');
ellipse(536, 260, 7, 4, '#ff8888');
ctx.restore();

// Helm brow ridge
ctx.fillStyle = '#4a3d30';
roundRect(445, 235, 134, 12, 4, '#4a3d30');

// Helm crest ridge (top)
ctx.fillStyle = '#3d3225';
ctx.beginPath();
ctx.moveTo(500, 155);
ctx.lineTo(512, 140);
ctx.lineTo(524, 155);
ctx.lineTo(520, 210);
ctx.lineTo(504, 210);
ctx.closePath();
ctx.fill();

// Horns — large, curving upward and outward
// Left horn
ctx.fillStyle = gradient(380, 220, 340, 80, '#4a3d30', '#665540');
ctx.beginPath();
ctx.moveTo(440, 220);
ctx.quadraticCurveTo(380, 180, 340, 80);
ctx.quadraticCurveTo(360, 90, 360, 180);
ctx.lineTo(450, 240);
ctx.closePath();
ctx.fill();
// Horn ridges
ctx.strokeStyle = '#554a3a';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(430, 225);
ctx.quadraticCurveTo(380, 180, 350, 100);
ctx.stroke();

// Right horn
ctx.fillStyle = gradient(640, 220, 680, 80, '#4a3d30', '#665540');
ctx.beginPath();
ctx.moveTo(584, 220);
ctx.quadraticCurveTo(640, 180, 680, 80);
ctx.quadraticCurveTo(660, 90, 660, 180);
ctx.lineTo(574, 240);
ctx.closePath();
ctx.fill();
ctx.strokeStyle = '#554a3a';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(594, 225);
ctx.quadraticCurveTo(640, 180, 670, 100);
ctx.stroke();

// ─── Dark energy particles / wisps around the character ───
ctx.save();
const particles = [
  { x: 180, y: 300, r: 25, a: 0.3 },
  { x: 830, y: 350, r: 20, a: 0.25 },
  { x: 150, y: 700, r: 18, a: 0.2 },
  { x: 860, y: 650, r: 22, a: 0.25 },
  { x: 200, y: 1000, r: 15, a: 0.15 },
  { x: 820, y: 950, r: 20, a: 0.2 },
  { x: 320, y: 200, r: 12, a: 0.2 },
  { x: 700, y: 180, r: 14, a: 0.2 },
  { x: 170, y: 500, r: 16, a: 0.18 },
  { x: 850, y: 500, r: 14, a: 0.15 },
];
for (const p of particles) {
  ctx.globalAlpha = p.a;
  ctx.fillStyle = radialGrad(p.x, p.y, 0, p.r, '#9944cc', 'transparent');
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
}
ctx.restore();

// Small floating wisps
ctx.save();
ctx.strokeStyle = '#7733aa';
ctx.lineWidth = 3;
ctx.globalAlpha = 0.4;
ctx.shadowColor = '#9944cc';
ctx.shadowBlur = 6;
const wisps = [
  [[160, 400], [140, 350], [170, 300]],
  [[850, 420], [870, 370], [840, 320]],
  [[190, 800], [170, 750], [200, 700]],
  [[830, 780], [850, 730], [820, 680]],
];
for (const w of wisps) {
  ctx.beginPath();
  ctx.moveTo(w[0][0], w[0][1]);
  ctx.quadraticCurveTo(w[1][0], w[1][1], w[2][0], w[2][1]);
  ctx.stroke();
}
ctx.restore();

// ─── Ground shadow ───
ctx.save();
ctx.globalAlpha = 0.25;
ctx.fillStyle = radialGrad(512, 1400, 20, 250, '#000000', 'transparent');
ctx.beginPath();
ctx.ellipse(512, 1400, 250, 60, 0, 0, Math.PI * 2);
ctx.fill();
ctx.restore();

// Save
const out = fs.createWriteStream('public/assets/sprites/dagvar_battle.png');
const stream = canvas.createPNGStream();
stream.pipe(out);
out.on('finish', () => console.log('dagvar_battle.png generated'));
