// Procedural chiptune SFX via Web Audio API — no external files needed.

export class SoundManager {
  constructor() {
    this._ctx = null;
    this._masterGain = null;
    this._noiseBuffer = null;
    this._muted = false;
    this._volume = 0.5;
  }

  // ──── Context & Helpers ────

  _ensureContext() {
    if (this._ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this._ctx = new AC();
    this._masterGain = this._ctx.createGain();
    this._masterGain.gain.value = this._volume;
    this._masterGain.connect(this._ctx.destination);

    // Pre-generate white noise buffer (1 second)
    const sr = this._ctx.sampleRate;
    this._noiseBuffer = this._ctx.createBuffer(1, sr, sr);
    const data = this._noiseBuffer.getChannelData(0);
    for (let i = 0; i < sr; i++) data[i] = Math.random() * 2 - 1;
  }

  resume() {
    this._ensureContext();
    if (this._ctx && this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
  }

  get volume() { return this._volume; }
  set volume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this._masterGain) {
      this._masterGain.gain.value = this._muted ? 0 : this._volume;
    }
  }

  get muted() { return this._muted; }
  set muted(v) {
    this._muted = v;
    if (this._masterGain) {
      this._masterGain.gain.value = v ? 0 : this._volume;
    }
  }

  toggleMute() {
    this.muted = !this._muted;
    return this._muted;
  }

  _canPlay() {
    this._ensureContext();
    return this._ctx && this._ctx.state !== 'suspended';
  }

  // Create + schedule an oscillator
  _osc(type, freq, start, duration, gain = 0.3) {
    const ctx = this._ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = typeof freq === 'number' ? freq : freq[0];
    g.gain.value = gain;
    o.connect(g);
    g.connect(this._masterGain);
    o.start(start);
    o.stop(start + duration);
    o.onended = () => { try { g.disconnect(); } catch (_) {} };
    return { osc: o, gain: g };
  }

  // White noise burst
  _noise(duration, start, gain = 0.2) {
    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    g.connect(this._masterGain);
    src.start(start);
    src.stop(start + duration);
    src.onended = () => { try { g.disconnect(); } catch (_) {} };
    return { src, gain: g };
  }

  // ──── Battle SFX ────

  playAttackHit() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    // Noise burst
    const n = this._noise(0.08, t, 0.2);
    n.gain.gain.setValueAtTime(0.2, t);
    n.gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    // Square drop 200→80Hz
    const { osc, gain } = this._osc('square', 200, t, 0.15, 0.2);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  }

  playSpellCast() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    // Triangle sweep 800→1200Hz
    const { osc: o1, gain: g1 } = this._osc('triangle', 800, t, 0.25, 0.2);
    o1.frequency.exponentialRampToValueAtTime(1200, t + 0.25);
    g1.gain.setValueAtTime(0.2, t);
    g1.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    // Sine 400→600Hz
    const { osc: o2, gain: g2 } = this._osc('sine', 400, t, 0.25, 0.15);
    o2.frequency.exponentialRampToValueAtTime(600, t + 0.25);
    g2.gain.setValueAtTime(0.15, t);
    g2.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  }

  playHeal() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const start = t + i * 0.1;
      const { gain } = this._osc('sine', freq, start, 0.15, 0.25);
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);
    });
  }

  playBuff() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('square', 440, t, 0.2, 0.15);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.2);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  }

  playDebuff() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('square', 440, t, 0.2, 0.15);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.2);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
  }

  playPoisonTick() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('triangle', 300, t, 0.18, 0.15);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    const n = this._noise(0.06, t, 0.1);
    n.gain.gain.setValueAtTime(0.1, t);
    n.gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
  }

  playEnemyDeath() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    this._noise(0.2, t, 0.15);
    const { osc, gain } = this._osc('square', 300, t, 0.4, 0.2);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
  }

  playVictoryFanfare() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      const start = t + i * 0.22;
      const { gain: g1 } = this._osc('square', freq, start, 0.25, 0.15);
      g1.gain.setValueAtTime(0.15, start);
      g1.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
      const { gain: g2 } = this._osc('triangle', freq, start, 0.25, 0.1);
      g2.gain.setValueAtTime(0.1, start);
      g2.gain.exponentialRampToValueAtTime(0.01, start + 0.25);
    });
  }

  playDefeat() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [330, 262, 220]; // E4, C4, A3
    notes.forEach((freq, i) => {
      const start = t + i * 0.33;
      const { gain } = this._osc('triangle', freq, start, 0.4, 0.2);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
    });
  }

  playLevelUp() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const start = t + i * 0.18;
      const { gain: g1 } = this._osc('square', freq, start, 0.22, 0.15);
      g1.gain.setValueAtTime(0.15, start);
      g1.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
      const { gain: g2 } = this._osc('triangle', freq, start, 0.22, 0.1);
      g2.gain.setValueAtTime(0.1, start);
      g2.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
    });
  }

  playMiss() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const n = this._noise(0.1, t, 0.08);
    n.gain.gain.setValueAtTime(0.08, t);
    n.gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    const { gain } = this._osc('sine', 200, t, 0.15, 0.06);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
  }

  // ──── UI SFX ────

  playButtonClick() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('square', 800, t, 0.06, 0.12);
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1000, t + 0.03);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
  }

  playMenuOpen() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('triangle', 400, t, 0.12, 0.15);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.12);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
  }

  playMenuClose() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { osc, gain } = this._osc('triangle', 800, t, 0.1, 0.15);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
  }

  playDialogueAdvance() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const { gain } = this._osc('square', 600, t, 0.04, 0.1);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
  }

  // ──── Overworld SFX ────

  playEncounterStart() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    // V-shape: 200→400→200Hz
    const { osc, gain } = this._osc('square', 200, t, 0.35, 0.2);
    osc.frequency.linearRampToValueAtTime(400, t + 0.175);
    osc.frequency.linearRampToValueAtTime(200, t + 0.35);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    const n = this._noise(0.15, t + 0.1, 0.12);
    n.gain.gain.setValueAtTime(0.12, t + 0.1);
    n.gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
  }

  playItemPickup() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [587, 880]; // D5, A5
    notes.forEach((freq, i) => {
      const start = t + i * 0.1;
      const { gain } = this._osc('sine', freq, start, 0.12, 0.2);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);
    });
  }

  playNPCRecruit() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    notes.forEach((freq, i) => {
      const start = t + i * 0.12;
      const { gain } = this._osc('triangle', freq, start, 0.18, 0.2);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.18);
    });
  }

  // ──── Shop / Inn SFX ────

  playPurchase() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [523, 784]; // C5, G5
    notes.forEach((freq, i) => {
      const start = t + i * 0.07;
      const { gain } = this._osc('triangle', freq, start, 0.1, 0.18);
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
    });
  }

  playRestHeal() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [262, 330, 392]; // C4, E4, G4
    notes.forEach((freq, i) => {
      const start = t + i * 0.16;
      const { gain } = this._osc('sine', freq, start, 0.22, 0.2);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.22);
    });
  }

  playSave() {
    if (!this._canPlay()) return;
    const t = this._ctx.currentTime;
    const notes = [784, 523]; // G5, C5
    notes.forEach((freq, i) => {
      const start = t + i * 0.06;
      const { gain } = this._osc('square', freq, start, 0.08, 0.12);
      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.08);
    });
  }
}
