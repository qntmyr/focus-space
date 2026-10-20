// Ambient sounds synthesised with the Web Audio API: no files, no rights, works offline.

type Voice = { gain: GainNode; stop: () => void };

export class Soundscape {
  private ctx: AudioContext | null = null;
  private voices = new Map<string, Voice>();
  private master: GainNode | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setLevel(name: string, level: number): void {
    const v = Math.max(0, Math.min(1, level));
    if (v === 0) {
      const voice = this.voices.get(name);
      if (voice) {
        voice.gain.gain.setTargetAtTime(0, this.ctx!.currentTime, 0.2);
        window.setTimeout(() => voice.stop(), 600);
        this.voices.delete(name);
      }
      return;
    }
    const ctx = this.ensure();
    let voice = this.voices.get(name);
    if (!voice) {
      const made = this.make(name, ctx);
      if (!made) return;
      voice = made;
      voice.gain.connect(this.master!);
      this.voices.set(name, voice);
    }
    voice.gain.gain.setTargetAtTime(v * v, ctx.currentTime, 0.1);
  }

  private noiseBuffer(ctx: AudioContext, kind: "white" | "pink" | "brown"): AudioBuffer {
    const seconds = 4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      if (kind === "white") data[i] = white * 0.5;
      else if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      } else {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    }
    return buf;
  }

  private loop(ctx: AudioContext, kind: "white" | "pink" | "brown"): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, kind);
    src.loop = true;
    src.start();
    return src;
  }

  private make(name: string, ctx: AudioContext): Voice | null {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const nodes: AudioNode[] = [];
    const timers: number[] = [];

    switch (name) {
      case "brown": {
        const src = this.loop(ctx, "brown");
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 500;
        src.connect(lp).connect(gain);
        nodes.push(src);
        break;
      }
      case "rain": {
        const src = this.loop(ctx, "pink");
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1800;
        bp.Q.value = 0.6;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 400;
        src.connect(hp).connect(bp).connect(gain);
        // soft random droplets
        const drops = ctx.createGain();
        drops.gain.value = 0.25;
        drops.connect(gain);
        const tick = () => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = 2500 + Math.random() * 3000;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.005);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
          o.connect(g).connect(drops);
          o.start();
          o.stop(ctx.currentTime + 0.08);
          timers.push(window.setTimeout(tick, 40 + Math.random() * 220));
        };
        tick();
        nodes.push(src);
        break;
      }
      case "wind": {
        const src = this.loop(ctx, "pink");
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 300;
        bp.Q.value = 1.2;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain).connect(bp.frequency);
        lfo.start();
        src.connect(bp).connect(gain);
        nodes.push(src, lfo);
        break;
      }
      case "cafe": {
        const src = this.loop(ctx, "brown");
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 700;
        bp.Q.value = 0.5;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.35;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.25;
        const mod = ctx.createGain();
        mod.gain.value = 0.6;
        lfo.connect(lfoGain).connect(mod.gain);
        lfo.start();
        src.connect(bp).connect(mod).connect(gain);
        // occasional cup clinks
        const clink = () => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "triangle";
          o.frequency.value = 1800 + Math.random() * 1500;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          o.connect(g).connect(gain);
          o.start();
          o.stop(ctx.currentTime + 0.3);
          timers.push(window.setTimeout(clink, 3000 + Math.random() * 9000));
        };
        timers.push(window.setTimeout(clink, 2000));
        nodes.push(src, lfo);
        break;
      }
      case "fire": {
        const src = this.loop(ctx, "brown");
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 900;
        src.connect(lp).connect(gain);
        const crackle = () => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "square";
          o.frequency.value = 80 + Math.random() * 300;
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.003);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 1500;
          o.connect(hp).connect(g).connect(gain);
          o.start();
          o.stop(ctx.currentTime + 0.05);
          timers.push(window.setTimeout(crackle, 60 + Math.random() * 500));
        };
        crackle();
        nodes.push(src);
        break;
      }
      default:
        return null;
    }

    return {
      gain,
      stop: () => {
        timers.forEach((t) => window.clearTimeout(t));
        nodes.forEach((n) => {
          try {
            (n as AudioScheduledSourceNode).stop?.();
          } catch {
            /* already stopped */
          }
          n.disconnect();
        });
        gain.disconnect();
      },
    };
  }

  chime(): void {
    const ctx = this.ensure();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 1);
    });
  }
}
