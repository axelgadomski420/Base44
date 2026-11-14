import { Injectable } from '@angular/core';

export interface PurreSound { id: string; name: string; emoji: string; bpm: number; }

/** Biblioteka PURRE Sounds (0.5.0): proceduralne loopki Web Audio — bez plików, zero uploadu. */
export const PURRE_TRACKS: PurreSound[] = [
  { id: 'aurora', name: 'Aurora Vibes', emoji: '🌌', bpm: 100 },
  { id: 'purre-beat', name: 'PURRE Beat', emoji: '🐾', bpm: 120 },
  { id: 'royal', name: 'Royal Waltz', emoji: '👑', bpm: 90 },
  { id: 'sunset', name: 'Sunset Lofi', emoji: '🌅', bpm: 80 },
  { id: 'forest', name: 'Forest Paws', emoji: '🌲', bpm: 110 },
  { id: 'midnight', name: 'Midnight Neon', emoji: '🌃', bpm: 128 }
];

const SEEDS: Record<string, number[]> = {
  'aurora': [220, 261.63, 329.63, 293.66],
  'purre-beat': [196, 233.08, 293.66, 261.63],
  'royal': [261.63, 329.63, 392, 349.23],
  'sunset': [174.61, 220, 261.63, 196],
  'forest': [233.08, 277.18, 349.23, 311.13],
  'midnight': [146.83, 174.61, 220, 196]
};

@Injectable({ providedIn: 'root' })
export class SoundLibraryService {
  private ctx: AudioContext | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly tracks = PURRE_TRACKS;

  byId(id: string | null | undefined): PurreSound | null {
    return PURRE_TRACKS.find(t => t.id === id) ?? null;
  }

  /** Krótki podgląd (~2 s) — wybór dźwięku w kreatorze. */
  preview(id: string): void {
    this.stop();
    const track = this.byId(id);
    if (!track) return;
    this.startLoop(track);
    this.stopTimeout = setTimeout(() => this.stop(), 2000);
  }

  /** Zapętlane odtwarzanie dźwięku Reelsa (przycisk 🔊 w feedzie). */
  playLoop(id: string): void {
    this.stop();
    const track = this.byId(id);
    if (!track) return;
    this.startLoop(track);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.stopTimeout) { clearTimeout(this.stopTimeout); this.stopTimeout = null; }
  }

  private ensureCtx(): AudioContext | null {
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      if (!this.ctx) this.ctx = new Ctor();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch { return null; }
  }

  private startLoop(track: PurreSound): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const stepMs = 30000 / track.bpm; // ósemki
    const notes = SEEDS[track.id] ?? SEEDS['aurora'];
    let step = 0;
    this.timer = setInterval(() => {
      try {
        const t = ctx.currentTime + 0.05;
        if (step % 4 === 0) this.kick(ctx, t);
        if (step % 4 === 2) this.hat(ctx, t);
        this.tone(ctx, notes[Math.floor(step / 2) % notes.length] / 2, t, stepMs / 1000 * 0.9, track.id);
        step++;
      } catch { this.stop(); }
    }, stepMs);
  }

  private kick(ctx: AudioContext, t: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.16);
  }

  private hat(ctx: AudioContext, t: number): void {
    const buffer = ctx.createBuffer(1, 1200, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    gain.gain.value = 0.12;
    src.buffer = buffer;
    src.connect(hp).connect(gain).connect(ctx.destination);
    src.start(t);
  }

  private tone(ctx: AudioContext, freq: number, t: number, dur: number, trackId: string): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = trackId === 'sunset' || trackId === 'royal' ? 'triangle' : 'sawtooth';
    osc.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1400;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp).connect(gain).connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
}
