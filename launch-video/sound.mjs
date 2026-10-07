// The film's sound as a WAV — no samples, no dependencies, the same bytes every run.
//   node launch-video/sound.mjs [cues.json] [out.wav]      (default: out/cues.json → out/sound.wav)
// render.mjs writes cues.json from the page's window.CUES and calls synth() itself. The synthesis is synth.js's,
// which the browser runs too.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const dynaSynth = createRequire(import.meta.url)('./synth.js');

export function synth(cues, duration, opts) {
  const { left: L, right: R, gain, sampleRate: SR, peakDb } = dynaSynth(cues, duration, opts), n = L.length;
  const wav = Buffer.alloc(44 + n * 4);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + n * 4, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(n * 4, 40);
  for (let k = 0; k < n; k++) { wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[k] * gain)) * 32767), 44 + k * 4); wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[k] * gain)) * 32767), 46 + k * 4); }
  return { wav, peakDb, cues: cues.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = dirname(fileURLToPath(import.meta.url));
  const [inPath = join(here, 'out/cues.json'), outPath = join(here, 'out/sound.wav')] = process.argv.slice(2);
  const { cues, duration } = JSON.parse(readFileSync(inPath, 'utf8'));
  const { wav, cues: count } = synth(cues, duration);
  writeFileSync(outPath, wav);
  console.log(`${count} cues, ${duration.toFixed(1)} s → ${outPath}`);
}
