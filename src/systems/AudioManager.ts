type SoundMode = 'menu' | 'map' | 'battle' | 'boss' | 'salvage' | 'none';

class AudioManagerClass {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentMode: SoundMode = 'none';
  private activeOscillators: OscillatorNode[] = [];
  private tickInterval: number | null = null;
  private volume = 0.3;
  private muted = false;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.ensureContext();
    return this.masterGain!;
  }

  // ── Volume Control ──
  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  // ── Music Modes ──
  setMode(mode: SoundMode): void {
    if (mode === this.currentMode) return;
    this.stopAll();
    this.currentMode = mode;

    switch (mode) {
      case 'menu':    this.playMenuAmbient(); break;
      case 'map':     this.playMapAmbient(); break;
      case 'battle':  this.playBattleMusic(); break;
      case 'boss':    this.playBossMusic(); break;
      case 'salvage': this.playSalvageAmbient(); break;
      case 'none':    break;
    }
  }

  stopAll(): void {
    for (const osc of this.activeOscillators) {
      try { osc.stop(); } catch {}
    }
    this.activeOscillators = [];
    if (this.tickInterval !== null) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  // ── Menu: Low drone + distant tick ──
  private playMenuAmbient(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Deep drone
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 55; // A1
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.06;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;
    drone.connect(droneFilter).connect(droneGain).connect(master);
    drone.start();
    this.activeOscillators.push(drone);

    // Tick-tock rhythm
    this.tickInterval = window.setInterval(() => {
      this.playTick(0.04, 2200, 0.03);
    }, 2000);
  }

  // ── Map: Industrial ambient + tick-tock + distant hammering ──
  private playMapAmbient(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Drone (slightly warmer)
    const drone = ctx.createOscillator();
    drone.type = 'sawtooth';
    drone.frequency.value = 73.4; // D2
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150;
    drone.connect(filter).connect(droneGain).connect(master);
    drone.start();
    this.activeOscillators.push(drone);

    // Sub bass pad
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 36.7; // D1
    const subGain = ctx.createGain();
    subGain.gain.value = 0.08;
    sub.connect(subGain).connect(master);
    sub.start();
    this.activeOscillators.push(sub);

    // Tick rhythm (faster = exploration)
    this.tickInterval = window.setInterval(() => {
      this.playTick(0.03, 1800, 0.02);
      // Random hammer sound
      if (Math.random() < 0.3) {
        setTimeout(() => this.playHit(0.02, 200 + Math.random() * 100), 500);
      }
    }, 1500);
  }

  // ── Battle: Metallic percussion + faster tempo ──
  private playBattleMusic(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Tense drone
    const drone = ctx.createOscillator();
    drone.type = 'square';
    drone.frequency.value = 110; // A2
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.04;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    drone.connect(filter).connect(droneGain).connect(master);
    drone.start();
    this.activeOscillators.push(drone);

    // Rhythmic hits
    let beat = 0;
    this.tickInterval = window.setInterval(() => {
      beat++;
      // Kick
      this.playHit(0.08, 60, 0.08);
      // Hi-hat on offbeat
      if (beat % 2 === 0) {
        setTimeout(() => this.playTick(0.05, 6000, 0.01), 200);
      }
      // Metallic accent every 4 beats
      if (beat % 4 === 0) {
        setTimeout(() => this.playHit(0.06, 300 + Math.random() * 200), 100);
      }
    }, 400);
  }

  // ── Boss: Heavy orchestral industrial ──
  private playBossMusic(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    // Heavy drone (two detuned oscillators)
    for (const freq of [82.4, 83.2]) { // E2 detuned
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.value = 0.05;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 250;
      osc.connect(filter).connect(gain).connect(master);
      osc.start();
      this.activeOscillators.push(osc);
    }

    // Heavy kick pattern
    let beat = 0;
    this.tickInterval = window.setInterval(() => {
      beat++;
      this.playHit(0.12, 45, 0.1);
      if (beat % 2 === 0) this.playHit(0.06, 150);
      if (beat % 3 === 0) this.playTick(0.06, 4000, 0.02);
      if (beat % 8 === 0) {
        // Crash accent
        this.playNoise(0.08, 0.3);
      }
    }, 350);
  }

  // ── Salvage: Quiet mechanical clicking ──
  private playSalvageAmbient(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();

    const drone = ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 65.4; // C2
    const gain = ctx.createGain();
    gain.gain.value = 0.03;
    drone.connect(gain).connect(master);
    drone.start();
    this.activeOscillators.push(drone);

    this.tickInterval = window.setInterval(() => {
      this.playTick(0.02, 3000 + Math.random() * 2000, 0.015);
    }, 800 + Math.random() * 400);
  }

  // ── SFX Primitives ──
  playTick(vol: number, freq = 2000, duration = 0.02): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  playHit(vol: number, freq = 100, duration = 0.06): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
  }

  playNoise(vol: number, duration = 0.1): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    source.connect(filter).connect(gain).connect(master);
    source.start();
  }

  // ── Game SFX ──
  playSteamAttack(): void {
    this.playHit(0.07, 80, 0.08);
    setTimeout(() => this.playNoise(0.04, 0.15), 30);
  }

  playElectricAttack(): void {
    this.playTick(0.06, 4000, 0.01);
    setTimeout(() => this.playTick(0.04, 5500, 0.008), 20);
    setTimeout(() => this.playTick(0.03, 3000, 0.006), 50);
  }

  playSoulAttack(): void {
    const ctx = this.ensureContext();
    const master = this.getMaster();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  }

  playSalvageClick(): void {
    this.playTick(0.06, 1200, 0.02);
    setTimeout(() => this.playTick(0.08, 800, 0.015), 50);
  }

  playOverloadWarning(): void {
    this.playTick(0.06, 600, 0.1);
    setTimeout(() => this.playTick(0.04, 650, 0.08), 150);
  }

  playExplosion(): void {
    this.playHit(0.15, 40, 0.2);
    this.playNoise(0.1, 0.4);
    setTimeout(() => this.playHit(0.08, 30, 0.3), 100);
  }

  playVictory(): void {
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTick(0.06, freq, 0.15), i * 150);
    });
  }

  playDefeat(): void {
    this.playTick(0.06, 300, 0.5);
    setTimeout(() => this.playTick(0.04, 200, 0.6), 300);
  }
}

export const AudioManager = new AudioManagerClass();
