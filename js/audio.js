import { storage } from './storage.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.sfxOn = storage.getSfx();
    this.bgmOn = storage.getBgm();
    this.bgmTimer = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmOn ? 0.5 : 0;
      this.bgmGain.connect(this.master);
      if (this.bgmOn) this.startBgm();
    } catch (e) {
      this.ctx = null;
    }
  }

  setSfx(on) {
    this.sfxOn = on;
    storage.setSfx(on);
    if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0;
  }

  setBgm(on) {
    this.bgmOn = on;
    storage.setBgm(on);
    if (this.bgmGain) this.bgmGain.gain.value = on ? 0.5 : 0;
    if (!this.ctx) return;
    if (on) this.startBgm();
    else this.stopBgm();
  }

  tone(freq, dur, type, vol, glideTo, delay) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, glideTo), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (e) {
      /* ignore audio errors */
    }
  }

  noise(dur, vol, filterFreq, delay) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = filterFreq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(this.sfxGain);
      src.start(t0);
    } catch (e) {
      /* ignore audio errors */
    }
  }

  click() {
    this.tone(720, 0.08, 'square', 0.12, 900);
  }

  eat(size) {
    const base = Math.max(0.4, 1.6 - size / 130);
    this.tone(340 + 260 * base, 0.14, 'sine', 0.3, 640 * base + 300);
    this.tone(520 + 300 * base, 0.08, 'triangle', 0.16);
    this.noise(0.06, 0.1, 2200);
  }

  bigEat() {
    this.tone(160, 0.3, 'sine', 0.4, 90);
    this.tone(90, 0.34, 'triangle', 0.3, 60);
    this.noise(0.22, 0.2, 900);
  }

  levelup() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.22, undefined, i * 0.09));
    this.tone(1568, 0.4, 'sine', 0.14, undefined, 0.36);
  }

  hurt() {
    this.tone(240, 0.25, 'sawtooth', 0.24, 80);
    this.noise(0.18, 0.16, 700);
  }

  splash() {
    this.noise(0.25, 0.14, 1400);
  }

  boostStart() {
    this.tone(300, 0.18, 'triangle', 0.14, 620);
  }

  deny() {
    this.tone(220, 0.12, 'square', 0.1, 160);
  }

  coin() {
    this.tone(1240, 0.09, 'triangle', 0.16, 1660);
    this.tone(1660, 0.14, 'sine', 0.1, 2100, 0.06);
  }

  slimeHit() {
    this.tone(320, 0.08, 'triangle', 0.2, 520);
    this.noise(0.05, 0.08, 1600);
  }

  slimeDefeat() {
    const notes = [660, 520, 392];
    notes.forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.2, undefined, i * 0.1));
    this.tone(196, 0.4, 'sine', 0.22, 98, 0.3);
    this.noise(0.18, 0.12, 800);
  }

  gateOpen() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, undefined, i * 0.12));
    this.noise(0.3, 0.1, 2400, 0.6);
  }

  checkpoint() {
    this.tone(880, 0.14, 'sine', 0.16);
    this.tone(1175, 0.22, 'sine', 0.14, undefined, 0.12);
  }

  respawn() {
    const notes = [392, 523, 659, 784];
    notes.forEach((f, i) => this.tone(f, 0.2, 'sine', 0.18, undefined, i * 0.09));
  }

  levelStart() {
    this.tone(392, 0.16, 'triangle', 0.16, undefined, 0);
    this.tone(587, 0.28, 'triangle', 0.16, undefined, 0.14);
  }

  levelClear() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.2, undefined, i * 0.13));
    this.tone(1568, 0.6, 'sine', 0.14, undefined, 0.91);
  }

  vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {
      /* ignore */
    }
  }

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const pentatonic = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
    const play = () => {
      if (!this.ctx || !this.bgmOn) return;
      try {
        const f = pentatonic[Math.floor(Math.random() * pentatonic.length)];
        const t0 = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = f;
        const vol = 0.055;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        osc.connect(g);
        g.connect(this.bgmGain);
        osc.start(t0);
        osc.stop(t0 + 1.9);
      } catch (e) {
        /* ignore */
      }
    };
    play();
    this.bgmTimer = setInterval(play, 1350);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}
