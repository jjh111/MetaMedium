// Builds the film's sound off the page's thread (about 3 s of arithmetic): cues in, two channels out, transferred.
importScripts('synth.js');
onmessage = (e) => {
  const { cues, duration } = e.data;
  const { left, right, gain, sampleRate } = dynaSynth(cues, duration);
  for (let k = 0; k < left.length; k++) { left[k] *= gain; right[k] *= gain; }
  postMessage({ left, right, sampleRate }, [left.buffer, right.buffer]);
};
