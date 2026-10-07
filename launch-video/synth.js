// The film's sound, synthesised from its cues: no samples, no dependencies, the same samples every run.
//
//   dynaSynth(cues, duration) → { left, right, gain, sampleRate, peakDb }   (Float32Arrays; multiply by gain to play)
//
// A plain script, so the browser runs it too (launch-video/index.html builds the sound in a worker on the first play)
// and Node reads it through sound.mjs, which writes the WAV render.mjs lays under the picture.
// Quiet by design: a soft bed under the whole film, and short emphasis where the picture acts —
// a pen's grain, a key, a tap, a clean form snapping in, a chime when something is read.
const SR = 48000;
const NOTES = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51]; // D major pentatonic from D5

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// a state-variable filter: one sample at a time, its centre free to move
function svf() { let lo = 0, bp = 0; return (x, fc, q) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); const hp = x - lo - bp / q; bp += f * hp; lo += f * bp; return { lo, bp, hp }; }; }

function dynaSynth(cues, duration, { seed = 7 } = {}) {
  const n = Math.ceil((duration + 0.5) * SR);
  const L = new Float32Array(n), R = new Float32Array(n), send = new Float32Array(n);
  const r = rng(seed), noise = () => r() * 2 - 1;
  const put = (i, v, pan = 0, wet = 0) => { if (i < 0 || i >= n) return; L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); send[i] += v * wet; };
  const env = (u, a, d) => Math.min(1, u / a) * Math.exp(-u / d); // attack then exponential decay (seconds)

  const voices = {
    pen(c) { // paper grain: band-passed noise whose speed wavers like a hand's
      const d = c.dur || 1, f = svf(), g = 0.022 * (c.gain ?? 1); let sp = 0.7;
      for (let k = 0; k < d * SR; k++) { const u = k / SR; if (k % 480 === 0) sp += (0.75 + 0.25 * Math.sin(u * 9.1) - sp) * 0.5 + (r() - 0.5) * 0.15;
        const e = Math.min(1, u / 0.04, (d - u) / 0.06) * sp, y = f(noise(), 2600 + 900 * sp, 1.1).bp; put(Math.round(c.t * SR) + k, y * g * e, -0.1); }
    },
    type(c) { // keys: a short tick each ~75 ms
      const d = c.dur || 1, g = 0.05 * (c.gain ?? 1); let u = 0;
      while (u < d) { const i0 = Math.round((c.t + u) * SR), f = svf(), pan = (r() - 0.5) * 0.3, hz = 1700 + r() * 500;
        for (let k = 0; k < 0.03 * SR; k++) { const v = k / SR; put(i0 + k, g * (0.6 * f(noise(), 4000, 0.8).hp * Math.exp(-v / 0.004) + 0.4 * Math.sin(2 * Math.PI * hz * v) * Math.exp(-v / 0.012)), pan); }
        u += 0.06 + r() * 0.04; }
    },
    tick(c) { // a small glass bell
      const hz = NOTES[(c.note ?? 0) % NOTES.length] * 2, g = 0.035 * (c.gain ?? 1), i0 = Math.round(c.t * SR);
      for (let k = 0; k < 0.5 * SR; k++) { const u = k / SR; put(i0 + k, g * env(u, 0.002, 0.09) * (Math.sin(2 * Math.PI * hz * u) + 0.3 * Math.sin(2 * Math.PI * hz * 2.76 * u) * Math.exp(-u / 0.03)), 0.15, 0.5); }
    },
    chime(c) { // a soft bell: the fundamental and two partials, a long tail into the room
      const hz = NOTES[(c.note ?? 0) % NOTES.length], g = 0.06 * (c.gain ?? 1), i0 = Math.round(c.t * SR), pan = ((c.note ?? 0) % 2 ? 0.18 : -0.18);
      for (let k = 0; k < 2.2 * SR; k++) { const u = k / SR; put(i0 + k, g * env(u, 0.004, 0.7) * (Math.sin(2 * Math.PI * hz * u) + 0.35 * Math.sin(2 * Math.PI * hz * 2.01 * u) * Math.exp(-u / 0.25) + 0.12 * Math.sin(2 * Math.PI * hz * 3.02 * u) * Math.exp(-u / 0.12)), pan, 0.6); }
    },
    snap(c) { // a clean form arriving: a plucked string (Karplus–Strong) and a bright click
      const hz = NOTES[(c.note ?? 0) % NOTES.length], g = 0.09 * (c.gain ?? 1), i0 = Math.round(c.t * SR), P = Math.round(SR / hz), buf = Float32Array.from({ length: P }, () => noise());
      for (let k = 0; k < 0.7 * SR; k++) { const j = k % P, v = buf[j]; buf[j] = 0.5 * (v + buf[(j + 1) % P]) * 0.996; put(i0 + k, g * v * Math.min(1, (0.7 - k / SR) / 0.1), 0.05, 0.4); }
      for (let k = 0; k < 0.01 * SR; k++) put(i0 + k, g * 0.6 * noise() * Math.exp(-k / SR / 0.0015));
    },
    pop(c) { // something appears: a rising blip
      const g = 0.08 * (c.gain ?? 1), i0 = Math.round(c.t * SR); let ph = 0;
      for (let k = 0; k < 0.18 * SR; k++) { const u = k / SR, hz = 320 + 520 * Math.min(1, u / 0.05); ph += 2 * Math.PI * hz / SR; put(i0 + k, g * env(u, 0.003, 0.05) * Math.sin(ph), -0.05, 0.35); }
    },
    tap(c) { // a fingertip on glass: a woody knock
      const g = 0.11 * (c.gain ?? 1), i0 = Math.round(c.t * SR), f = svf(); let ph = 0;
      for (let k = 0; k < 0.12 * SR; k++) { const u = k / SR, hz = 520 - 160 * Math.min(1, u / 0.03); ph += 2 * Math.PI * hz / SR; put(i0 + k, g * (env(u, 0.001, 0.025) * Math.sin(ph) + 0.25 * f(noise(), 3000, 1).bp * Math.exp(-u / 0.004)), 0.1, 0.2); }
    },
    whoosh(c) { // the camera moving: filtered noise that rises and falls with the move
      const d = Math.max(0.3, c.dur || 0.65), g = 0.045 * (c.gain ?? 1), i0 = Math.round((c.t - 0.05) * SR), f = svf(), f2 = svf();
      for (let k = 0; k < (d + 0.25) * SR; k++) { const u = k / SR, p = Math.min(1, u / d), e = Math.sin(Math.PI * Math.min(1, u / (d + 0.25))) ** 2, fc = 350 + 1500 * Math.sin(Math.PI * p);
        const x = noise(); put(i0 + k, g * e * (f(x, fc, 0.9).bp * 0.8), -0.2 + 0.4 * p); put(i0 + k, g * e * 0.5 * f2(x, fc * 1.5, 0.7).bp, 0.2 - 0.4 * p); }
    },
    slide(c) { // things carried into place: a soft rising sweep
      const d = c.dur || 0.7, g = 0.03 * (c.gain ?? 1), i0 = Math.round(c.t * SR), f = svf();
      for (let k = 0; k < d * SR; k++) { const u = k / SR, p = u / d; put(i0 + k, g * Math.sin(Math.PI * p) * f(noise(), 600 + 1600 * p, 2.5).bp, 0, 0.3); }
    },
    scratch(c) { // a scratch-out: nine quick passes
      const d = c.dur || 1.4, g = 0.06 * (c.gain ?? 1), i0 = Math.round(c.t * SR), f = svf();
      for (let k = 0; k < d * SR; k++) { const u = k / SR, pass = (u / d) * 9, e = Math.sin(Math.PI * (pass % 1)) ** 2; put(i0 + k, g * e * f(noise(), 1400 + 500 * Math.sin(pass * Math.PI), 1.2).bp, 0.1 * Math.sin(pass * Math.PI)); }
    },
    erase(c) { // gone: a low, soft thump
      const g = 0.13 * (c.gain ?? 1), i0 = Math.round(c.t * SR), f = svf(); let ph = 0;
      for (let k = 0; k < 0.4 * SR; k++) { const u = k / SR, hz = 95 - 40 * Math.min(1, u / 0.2); ph += 2 * Math.PI * hz / SR; put(i0 + k, g * (env(u, 0.004, 0.11) * Math.sin(ph) + 0.3 * f(noise(), 400, 0.7).lo * Math.exp(-u / 0.05)), 0, 0.2); }
    },
    hmm(c) { // not sure: two soft notes stepping down
      const g = 0.05 * (c.gain ?? 1), i0 = Math.round(c.t * SR);
      [[440, 0], [369.99, 0.17]].forEach(([hz, at]) => { for (let k = 0; k < 0.5 * SR; k++) { const u = k / SR, s = Math.sin(2 * Math.PI * hz * u); put(i0 + Math.round(at * SR) + k, g * env(u, 0.015, 0.14) * (s + 0.2 * Math.sin(4 * Math.PI * hz * u)), 0, 0.4); } });
    },
    resolve(c) { // the name: an open D chord that blooms and settles
      const g = 0.045 * (c.gain ?? 1), i0 = Math.round(c.t * SR);
      [293.66, 440, 587.33, 739.99, 880].forEach((hz, j) => { const pan = (j - 2) * 0.15;
        for (let k = 0; k < 4.5 * SR; k++) { const u = k / SR, e = Math.min(1, u / 0.35) * Math.exp(-u / 1.6); put(i0 + Math.round(j * 0.06 * SR) + k, g * e * (Math.sin(2 * Math.PI * hz * u) + 0.15 * Math.sin(4 * Math.PI * hz * u)), pan, 0.6); } });
    },
  };
  for (const c of cues) { const v = voices[c.kind]; if (!v) throw new Error('no voice for cue kind ' + c.kind); v(c); }

  // the bed: an open fifth and a ninth, breathing slowly, fading in and out with the film
  const bed = [[146.83, 0.0], [220.0, 0.9], [329.63, 1.7], [147.2, 2.3], [219.6, 3.1]];
  for (let k = 0; k < n; k++) {
    const u = k / SR, e = Math.min(1, u / 4, Math.max(0, (duration - u) / 3)); let v = 0;
    for (const [hz, ph] of bed) v += Math.sin(2 * Math.PI * hz * u + ph) * (0.55 + 0.45 * Math.sin(2 * Math.PI * u / (11 + ph * 3) + ph));
    const b = 0.0055 * e * v; L[k] += b; R[k] += b * 0.97;
  }

  // the room: a small Schroeder reverb on what was sent to it
  const combs = [1557, 1617, 1491, 1422].map(d => ({ d, buf: new Float32Array(d), i: 0, fb: 0.78, lp: 0 }));
  const alls = [225, 556].map(d => ({ d, buf: new Float32Array(d), i: 0 }));
  for (let k = 0; k < n; k++) {
    let y = 0; for (const c of combs) { const o = c.buf[c.i]; c.lp = o * 0.7 + c.lp * 0.3; c.buf[c.i] = send[k] + c.lp * c.fb; c.i = (c.i + 1) % c.d; y += o; }
    y *= 0.25; for (const a of alls) { const o = a.buf[a.i], w = y + o * 0.5; a.buf[a.i] = w; a.i = (a.i + 1) % a.d; y = o - 0.5 * w; }
    L[k] += y * 0.32; R[k] += y * 0.3 * (k % 2 ? 1 : 0.98);
  }

  // master: a gentle soft clip, then peak at −3 dBFS
  let peak = 0; for (let k = 0; k < n; k++) { L[k] = Math.tanh(L[k] * 1.4) / 1.4; R[k] = Math.tanh(R[k] * 1.4) / 1.4; peak = Math.max(peak, Math.abs(L[k]), Math.abs(R[k])); }
  const gain = peak > 0 ? 0.708 / peak : 1;
  return { left: L, right: R, gain, sampleRate: SR, peakDb: 20 * Math.log10(peak), cues: cues.length };
}
if (typeof module === 'object' && module.exports) module.exports = dynaSynth;
