// Mixer slider math (docs/gauntlet/PLAN.md §3.5) — the binding mapping from a
// volume slider position s in [0, 1] to bus gain, for BOTH modes. Owner: M3.
// Pure module (Node-testable). Every Audio-tab slider, every bus gain and the
// audio critic's gain-curve probe use exactly these functions.
//
//   LINEAR mode      gain = s                       dB = 20·log10(s)
//                    s:  0     0.25    0.50   0.75   1.00
//                    dB: -inf  -12.04  -6.02  -2.50  0.00
//
//   LOG mode         dB = 10·log2(s)   ("every halving of the slider halves the
//   (dB-perceptual)                     perceived loudness", the -10 dB/half
//                                       loudness rule)
//                    gain = 10^(dB/20) = s^(log2(10)/2) = s^1.66096
//                    s:  0     0.25    0.50    0.75   1.00
//                    dB: -inf  -20.00  -10.00  -4.15  0.00
//                    s below LOG_FLOOR (0.001, -99.7 dB) is silence (gain 0).
//
// Effective gain of a channel bus = channelGain × masterGain (decoupled:
// channels never multiply each other). Mute multiplies by 0 without moving
// the stored slider value.

export const MODES = Object.freeze(['log', 'linear']);
export const LOG_EXPONENT = Math.log2(10) / 2; // 1.660964...
export const LOG_FLOOR = 0.001;

const clamp01 = (s) => (Number.isFinite(s) ? Math.min(1, Math.max(0, s)) : 0);

export function sliderToGain(s, mode = 'log') {
  const v = clamp01(s);
  if (mode === 'linear') return v;
  if (v < LOG_FLOOR) return 0;
  return Math.pow(v, LOG_EXPONENT);
}

export function gainToDb(g) {
  return g > 0 ? 20 * Math.log10(g) : -Infinity;
}

export function dbToGain(db) {
  return Number.isFinite(db) ? Math.pow(10, db / 20) : 0;
}

export function sliderToDb(s, mode = 'log') {
  return gainToDb(sliderToGain(s, mode));
}

// Inverse mapping (used when a mode switch must keep the loudness constant,
// PLAN §3.5: "switching mode preserves the current gain").
export function dbToSlider(db, mode = 'log') {
  if (!Number.isFinite(db)) return 0;
  const g = dbToGain(Math.min(0, db));
  if (mode === 'linear') return clamp01(g);
  return clamp01(Math.pow(g, 1 / LOG_EXPONENT));
}

export function formatDb(db) {
  if (!Number.isFinite(db)) return '−∞ dB';
  const r = Math.round(db * 10) / 10;
  return `${r > 0 ? '+' : r < 0 ? '−' : ''}${Math.abs(r).toFixed(1)} dB`;
}

// Reference table for the audio gate (G3.1) — computed, not typed.
export function referenceTable() {
  const pts = [0, 0.25, 0.5, 0.75, 1];
  return pts.map((s) => ({
    s,
    linearDb: Math.round(sliderToDb(s, 'linear') * 100) / 100,
    logDb: Math.round(sliderToDb(s, 'log') * 100) / 100,
  }));
}
