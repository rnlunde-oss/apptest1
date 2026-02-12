// CharacterPortrait — Defense of Rhaud
// Canvas 2D layered portrait renderer for inventory/battle/cutscene/dialogue

import { EQUIPMENT } from '../data/equipment.js';
import { PORTRAIT_SLOT_CONFIG, BODY_TEMPLATES, CHARACTER_APPEARANCE } from './portraitConfig.js';

export class CharacterPortrait {
  constructor(width = 64, height = 80) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
  }

  render(character, context = 'inventory') {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const bodyType = character.bodyType || 'medium';
    const tmpl = BODY_TEMPLATES[bodyType] || BODY_TEMPLATES.medium;
    const appear = CHARACTER_APPEARANCE[character.id] || {
      skin: '#d4a574', hair: '#554433', hairStyle: 'short',
    };

    // Draw base body
    this._drawBaseBody(ctx, tmpl, appear, character.color);

    // Collect visible equipped layers
    const layers = [];
    if (character.equipment) {
      for (const [slot, config] of Object.entries(PORTRAIT_SLOT_CONFIG)) {
        if (!config.contexts[context]) continue;
        const itemId = character.equipment[slot];
        if (!itemId) continue;
        const item = EQUIPMENT[itemId];
        if (!item) continue;
        layers.push({ slot, item, drawOrder: config.drawOrder });
      }
    }

    // Sort by draw order and render
    layers.sort((a, b) => a.drawOrder - b.drawOrder);
    for (const layer of layers) {
      this._drawEquipmentLayer(ctx, tmpl, layer.slot, layer.item, character);
    }
  }

  renderToTexture(scene, textureKey, character, context = 'inventory') {
    this.render(character, context);

    // Remove old texture if exists
    if (scene.textures.exists(textureKey)) {
      scene.textures.remove(textureKey);
    }

    // Create new CanvasTexture
    const tex = scene.textures.createCanvas(textureKey, this.width, this.height);
    const destCtx = tex.getContext();
    destCtx.drawImage(this.canvas, 0, 0);
    tex.refresh();
  }

  // ──── Base Body ────

  _drawBaseBody(ctx, tmpl, appear, classColor) {
    const cx = this.width / 2;
    const skinColor = appear.skin;
    const outfitColor = this._hexToCSS(classColor);

    // Legs
    ctx.fillStyle = skinColor;
    const legLeft = cx - tmpl.legSpacing - tmpl.legW;
    const legRight = cx + tmpl.legSpacing;
    ctx.fillRect(legLeft, tmpl.kneeY, tmpl.legW, tmpl.feetY - tmpl.kneeY);
    ctx.fillRect(legRight, tmpl.kneeY, tmpl.legW, tmpl.feetY - tmpl.kneeY);

    // Torso (outfit color)
    ctx.fillStyle = outfitColor;
    this._roundRect(ctx, tmpl.torsoX, tmpl.neckY, tmpl.torsoW, tmpl.torsoH, 3);

    // Arms
    const armLeftX = cx - tmpl.armOffsetX - tmpl.armW;
    const armRightX = cx + tmpl.armOffsetX;
    ctx.fillStyle = skinColor;
    ctx.fillRect(armLeftX, tmpl.neckY + 2, tmpl.armW, tmpl.armH);
    ctx.fillRect(armRightX, tmpl.neckY + 2, tmpl.armW, tmpl.armH);

    // Head
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, tmpl.headY, tmpl.headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    this._drawHair(ctx, cx, tmpl, appear);

    // Eyes
    ctx.fillStyle = '#222222';
    ctx.fillRect(cx - 3, tmpl.headY - 1, 2, 2);
    ctx.fillRect(cx + 1, tmpl.headY - 1, 2, 2);
  }

  _drawHair(ctx, cx, tmpl, appear) {
    ctx.fillStyle = appear.hair;
    const r = tmpl.headRadius;
    const hy = tmpl.headY;

    switch (appear.hairStyle) {
      case 'short':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 1, Math.PI, Math.PI * 2);
        ctx.fill();
        break;
      case 'shaved':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 0.5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.fill();
        break;
      case 'long':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 1, Math.PI, Math.PI * 2);
        ctx.fill();
        // Side hair
        ctx.fillRect(cx - r - 1, hy, 3, r + 6);
        ctx.fillRect(cx + r - 2, hy, 3, r + 6);
        break;
      case 'medium':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 1, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        ctx.fillRect(cx - r - 1, hy, 2, r + 2);
        ctx.fillRect(cx + r - 1, hy, 2, r + 2);
        break;
      case 'wild':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 2, Math.PI, Math.PI * 2);
        ctx.fill();
        // Spiky bits
        ctx.fillRect(cx - r - 2, hy - 3, 3, 5);
        ctx.fillRect(cx + r, hy - 3, 3, 5);
        ctx.fillRect(cx - 2, hy - r - 3, 4, 4);
        break;
      case 'tied':
        ctx.beginPath();
        ctx.arc(cx, hy, r + 1, Math.PI, Math.PI * 2);
        ctx.fill();
        // Ponytail
        ctx.fillRect(cx + r - 1, hy - 2, 3, 2);
        ctx.fillRect(cx + r + 1, hy, 2, 8);
        break;
      default:
        ctx.beginPath();
        ctx.arc(cx, hy, r + 1, Math.PI, Math.PI * 2);
        ctx.fill();
    }
  }

  // ──── Equipment Layers ────

  _drawEquipmentLayer(ctx, tmpl, slot, item, character) {
    const color = this._hexToCSS(item.portraitColor || 0x888888);
    const dark = this._darken(item.portraitColor || 0x888888, 0.7);

    switch (slot) {
      case 'helmet':    this._drawHelmet(ctx, tmpl, color, dark); break;
      case 'breastplate': this._drawBreastplate(ctx, tmpl, color, dark); break;
      case 'shoulderpads': this._drawShoulderpads(ctx, tmpl, color, dark); break;
      case 'boots':     this._drawBoots(ctx, tmpl, color, dark); break;
      case 'greaves':   this._drawGreaves(ctx, tmpl, color, dark); break;
      case 'belt':      this._drawBelt(ctx, tmpl, color, dark); break;
      case 'gloves':    this._drawGloves(ctx, tmpl, color, dark); break;
      case 'rightHand': this._drawRightHand(ctx, tmpl, color, dark, item); break;
      case 'leftHand':  this._drawLeftHand(ctx, tmpl, color, dark, item, character); break;
    }
  }

  _drawHelmet(ctx, tmpl, color, dark) {
    const cx = this.width / 2;
    const r = tmpl.headRadius;

    // Dome arc over head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, tmpl.headY, r + 2, Math.PI, Math.PI * 2);
    ctx.fill();

    // Brim
    ctx.fillStyle = dark;
    ctx.fillRect(cx - r - 3, tmpl.headY - 1, (r + 3) * 2, 3);
  }

  _drawBreastplate(ctx, tmpl, color, dark) {
    // Rounded rect over torso
    ctx.fillStyle = color;
    this._roundRect(ctx, tmpl.torsoX - 1, tmpl.neckY + 1, tmpl.torsoW + 2, tmpl.torsoH - 2, 3);

    // Outline/detail
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(tmpl.torsoX, tmpl.neckY + 2, tmpl.torsoW, tmpl.torsoH - 3);
  }

  _drawShoulderpads(ctx, tmpl, color, dark) {
    const cx = this.width / 2;

    // Wide rects at shoulder line
    ctx.fillStyle = color;
    const padW = tmpl.shoulderW;
    const padH = 5;
    const padY = tmpl.neckY;

    // Left shoulder
    ctx.fillRect(cx - tmpl.armOffsetX - tmpl.armW - 1, padY, padW, padH);
    // Right shoulder
    ctx.fillRect(cx + tmpl.armOffsetX + tmpl.armW + 1 - padW, padY, padW, padH);

    // Dark border on bottom
    ctx.fillStyle = dark;
    ctx.fillRect(cx - tmpl.armOffsetX - tmpl.armW - 1, padY + padH - 1, padW, 1);
    ctx.fillRect(cx + tmpl.armOffsetX + tmpl.armW + 1 - padW, padY + padH - 1, padW, 1);
  }

  _drawBoots(ctx, tmpl, color, dark) {
    const cx = this.width / 2;
    const bootH = 6;
    const legLeft = cx - tmpl.legSpacing - tmpl.legW;
    const legRight = cx + tmpl.legSpacing;

    ctx.fillStyle = color;
    ctx.fillRect(legLeft - 1, tmpl.feetY - bootH, tmpl.legW + 2, bootH);
    ctx.fillRect(legRight - 1, tmpl.feetY - bootH, tmpl.legW + 2, bootH);

    ctx.fillStyle = dark;
    ctx.fillRect(legLeft - 1, tmpl.feetY - 1, tmpl.legW + 2, 1);
    ctx.fillRect(legRight - 1, tmpl.feetY - 1, tmpl.legW + 2, 1);
  }

  _drawGreaves(ctx, tmpl, color, dark) {
    const cx = this.width / 2;
    const legLeft = cx - tmpl.legSpacing - tmpl.legW;
    const legRight = cx + tmpl.legSpacing;
    const grH = Math.floor((tmpl.feetY - tmpl.kneeY) * 0.6);

    ctx.fillStyle = color;
    ctx.fillRect(legLeft - 1, tmpl.kneeY, tmpl.legW + 2, grH);
    ctx.fillRect(legRight - 1, tmpl.kneeY, tmpl.legW + 2, grH);

    ctx.fillStyle = dark;
    ctx.fillRect(legLeft - 1, tmpl.kneeY + grH - 1, tmpl.legW + 2, 1);
    ctx.fillRect(legRight - 1, tmpl.kneeY + grH - 1, tmpl.legW + 2, 1);
  }

  _drawBelt(ctx, tmpl, color, dark) {
    // Thin rect at waist
    ctx.fillStyle = color;
    ctx.fillRect(tmpl.torsoX - 1, tmpl.waistY - 2, tmpl.torsoW + 2, 4);

    ctx.fillStyle = dark;
    ctx.fillRect(tmpl.torsoX - 1, tmpl.waistY + 1, tmpl.torsoW + 2, 1);
  }

  _drawGloves(ctx, tmpl, color, dark) {
    const cx = this.width / 2;
    const armLeftX = cx - tmpl.armOffsetX - tmpl.armW;
    const armRightX = cx + tmpl.armOffsetX;
    const gloveH = 5;
    const gloveY = tmpl.neckY + 2 + tmpl.armH - gloveH;

    ctx.fillStyle = color;
    ctx.fillRect(armLeftX - 1, gloveY, tmpl.armW + 2, gloveH);
    ctx.fillRect(armRightX - 1, gloveY, tmpl.armW + 2, gloveH);

    ctx.fillStyle = dark;
    ctx.fillRect(armLeftX - 1, gloveY, tmpl.armW + 2, 1);
    ctx.fillRect(armRightX - 1, gloveY, tmpl.armW + 2, 1);
  }

  _drawRightHand(ctx, tmpl, color, dark, item) {
    const cx = this.width / 2;
    const armRightX = cx + tmpl.armOffsetX;
    const weaponX = armRightX + tmpl.armW + 1;
    const weaponY = tmpl.neckY + 4;
    const isTwoHanded = item.twoHanded;
    const weaponLen = isTwoHanded ? tmpl.armH + 8 : tmpl.armH - 4;

    // Weapon shaft
    ctx.fillStyle = color;
    ctx.fillRect(weaponX, weaponY, 3, weaponLen);

    // Weapon head (wider top)
    ctx.fillStyle = dark;
    if (isTwoHanded) {
      // Axe head
      ctx.fillRect(weaponX - 2, weaponY, 7, 6);
    } else {
      ctx.fillRect(weaponX - 1, weaponY, 5, 4);
    }
  }

  _drawLeftHand(ctx, tmpl, color, dark, item, character) {
    const cx = this.width / 2;
    const armLeftX = cx - tmpl.armOffsetX - tmpl.armW;

    // Check if right hand weapon is two-handed
    const rhItemId = character.equipment && character.equipment.rightHand;
    const rhItem = rhItemId ? EQUIPMENT[rhItemId] : null;
    if (rhItem && rhItem.twoHanded) {
      // Draw grip on left side of two-handed weapon
      const armRightX = cx + tmpl.armOffsetX;
      const weaponX = armRightX + tmpl.armW + 1;
      const gripY = tmpl.neckY + 4 + tmpl.armH - 6;
      ctx.fillStyle = this._hexToCSS(character.color);
      ctx.fillRect(weaponX - 1, gripY, 5, 4);
      return;
    }

    const shieldX = armLeftX - 4;
    const shieldY = tmpl.neckY + 6;

    // Shield/offhand shape
    ctx.fillStyle = color;
    ctx.fillRect(shieldX, shieldY, 8, 10);

    ctx.strokeStyle = dark;
    ctx.lineWidth = 1;
    ctx.strokeRect(shieldX, shieldY, 8, 10);
  }

  // ──── Helpers ────

  _hexToCSS(hex) {
    if (typeof hex === 'string') return hex;
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    return `rgb(${r},${g},${b})`;
  }

  _darken(hex, factor) {
    if (typeof hex === 'string') {
      // Parse CSS hex string
      hex = parseInt(hex.replace('#', ''), 16);
    }
    const r = Math.floor(((hex >> 16) & 0xFF) * factor);
    const g = Math.floor(((hex >> 8) & 0xFF) * factor);
    const b = Math.floor((hex & 0xFF) * factor);
    return `rgb(${r},${g},${b})`;
  }

  _roundRect(ctx, x, y, w, h, r) {
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
    ctx.closePath();
    ctx.fill();
  }
}
