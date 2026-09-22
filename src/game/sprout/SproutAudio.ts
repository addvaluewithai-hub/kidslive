export class SproutAudio {
  private context: AudioContext | null = null;
  private ambientGain: GainNode | null = null;
  private riverGain: GainNode | null = null;
  private started = false;

  async ensureStarted() {
    if (this.started) return;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    this.context = context;
    this.started = true;

    const master = context.createGain();
    master.gain.value = 0.2;
    master.connect(context.destination);

    this.ambientGain = context.createGain();
    this.ambientGain.gain.value = 0.13;
    this.ambientGain.connect(master);

    const padA = context.createOscillator();
    const padB = context.createOscillator();
    const padFilter = context.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 420;
    padA.type = 'sine';
    padB.type = 'sine';
    padA.frequency.value = 110;
    padB.frequency.value = 164.81;
    padA.connect(padFilter);
    padB.connect(padFilter);
    padFilter.connect(this.ambientGain);
    padA.start();
    padB.start();

    this.riverGain = context.createGain();
    this.riverGain.gain.value = 0;
    this.riverGain.connect(master);
    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 760;
    noiseFilter.Q.value = 0.55;
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noise.connect(noiseFilter);
    noiseFilter.connect(this.riverGain);
    noise.start();

    if (context.state === 'suspended') await context.resume();
  }

  setRiverPresence(active: boolean) {
    if (!this.context || !this.riverGain) return;
    const now = this.context.currentTime;
    this.riverGain.gain.cancelScheduledValues(now);
    this.riverGain.gain.linearRampToValueAtTime(active ? 0.12 : 0.01, now + 1.1);
  }

  cue(kind: 'discovery' | 'reveal' | 'lumi' | 'final') {
    if (!this.context) return;
    const notes =
      kind === 'final'
        ? [293.66, 392, 523.25]
        : kind === 'lumi'
          ? [440, 659.25]
          : kind === 'reveal'
            ? [261.63, 392]
            : [329.63, 493.88];
    notes.forEach((frequency, index) => this.tone(frequency, index * 0.12, kind === 'final' ? 0.6 : 0.35));
  }

  private tone(frequency: number, delay: number, duration: number) {
    const context = this.context;
    if (!context) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.13, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }
}
