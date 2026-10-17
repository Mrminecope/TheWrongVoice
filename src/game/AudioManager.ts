/**
 * Procedural Web Audio API synthesizer for THE WRONG VOICE.
 * Generates layered storm rain, indoor 60Hz electrical hum, room acoustics, footsteps,
 * creaky doors, flashlight clicks, cassette tape warble, radio tuning heterodyne static,
 * decoy tin clatter, and The Receiver's distorted voice mimicry without external audio files.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stormGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private threatGain: GainNode | null = null;
  private threatOsc: OscillatorNode | null = null;
  private isMuted = false;
  private volume = 0.75;
  private initialized = false;

  public initAfterUserGesture(initialVolume = 0.75): void {
    this.volume = initialVolume;
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.updateMasterGain();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbienceLoops();
      this.initialized = true;
    } catch {
      // Ignore Web Audio errors on headless environments without audio device
    }
  }

  private setupAmbienceLoops(): void {
    if (!this.ctx || !this.masterGain) return;

    // 1. Storm Rain Pink/Brown Noise Loop
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = output[i];
      output[i] *= 0.35;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 650;
    rainFilter.Q.value = 0.6;

    this.stormGain = this.ctx.createGain();
    this.stormGain.gain.value = 0.16;

    whiteNoise.connect(rainFilter);
    rainFilter.connect(this.stormGain);
    this.stormGain.connect(this.masterGain);
    whiteNoise.start();

    // 2. Indoor 60Hz Electrical Transformer Hum
    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'sawtooth';
    humOsc.frequency.value = 60;

    const humFilter = this.ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 140;

    this.humGain = this.ctx.createGain();
    this.humGain.gain.value = 0.02;

    humOsc.connect(humFilter);
    humFilter.connect(this.humGain);
    this.humGain.connect(this.masterGain);
    humOsc.start();

    // 3. Sub-bass Threat Drone when The Receiver is near
    this.threatOsc = this.ctx.createOscillator();
    this.threatOsc.type = 'triangle';
    this.threatOsc.frequency.value = 44;

    this.threatGain = this.ctx.createGain();
    this.threatGain.gain.value = 0.0;

    this.threatOsc.connect(this.threatGain);
    this.threatGain.connect(this.masterGain);
    this.threatOsc.start();
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateMasterGain();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.updateMasterGain();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private updateMasterGain(): void {
    if (!this.ctx || !this.masterGain) return;
    const target = this.isMuted ? 0 : this.volume;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  public updateSpatialAmbience(
    isOutdoor: boolean,
    powerRestored: boolean,
    creatureDistance: number,
    isChasing: boolean,
  ): void {
    if (!this.ctx || !this.stormGain || !this.humGain || !this.threatGain || !this.threatOsc) return;
    const now = this.ctx.currentTime;

    // Rain is louder on the exterior porch, muffled indoors
    const targetRain = isOutdoor ? 0.24 : 0.06;
    this.stormGain.gain.setTargetAtTime(targetRain, now, 0.25);

    // Electrical hum increases once basement fuse is restored
    const targetHum = isOutdoor ? 0.005 : powerRestored ? 0.055 : 0.015;
    this.humGain.gain.setTargetAtTime(targetHum, now, 0.25);

    // Threat drone scales with proximity to The Receiver
    const proximity = Math.max(0, 1 - creatureDistance / 13);
    const targetThreat = isChasing ? 0.22 : proximity * 0.14;
    this.threatGain.gain.setTargetAtTime(targetThreat, now, 0.15);
    this.threatOsc.frequency.setTargetAtTime(isChasing ? 58 : 42 + proximity * 12, now, 0.15);
  }

  public playFootstep(isSprint: boolean, isCrouch: boolean, isWood = true): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    const baseFreq = isWood ? 88 : 115;
    const pitchJitter = 0.92 + Math.random() * 0.16;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.075);

    const amp = isCrouch ? 0.04 : isSprint ? 0.18 : 0.1;
    gain.gain.setValueAtTime(amp, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playFlashlightClick(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.03);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playPickup(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.11);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playDoorCreak(isOpen: boolean): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(isOpen ? 190 : 240, now);
    osc.frequency.linearRampToValueAtTime(isOpen ? 275 : 155, now + 0.32);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 320;
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playPowerRestoreSurge(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.85);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.0);
  }

  public playDecoyClatter(): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const bounces = [0, 0.08, 0.15, 0.24, 0.31];
    bounces.forEach((offset, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(920 + idx * 170 + Math.random() * 220, now + offset);
      osc.frequency.exponentialRampToValueAtTime(310, now + offset + 0.06);
      gain.gain.setValueAtTime(0.22 / (idx + 1), now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.065);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.07);
    });
  }

  public playVoiceSynthCue(isImitation: boolean): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = isImitation ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isImitation ? 145 : 195, now);
    osc.frequency.linearRampToValueAtTime(isImitation ? 112 : 178, now + 0.55);

    mod.frequency.value = isImitation ? 28 : 8;
    modGain.gain.value = isImitation ? 45 : 12;

    mod.connect(modGain);
    modGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    mod.start(now);
    osc.start(now);
    mod.stop(now + 0.62);
    osc.stop(now + 0.62);
  }

  public playRadioTone(clarity: number): void {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520 + clarity * 3.6, now);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const audioManager = new AudioManager();
