// A-world r2, step 4: the flame's FEATHER lands in the amber band, and the
// camp forge burns at the same temperature as the hearth.
//
// Measured on captures/certfixAworld2-t9-camp.png, box 132,668,44,44 (the
// forge fire): 11.1% of its coloured pixels sit at hue 15-30 against the
// hearth's 2.6% (box 660,300,80,80). The mechanism is the alpha feather, not
// the body: the outer gradient's terminal stop was rgba(190,124,52) — hue 26.1
// — and an amber that red, alpha-blended at 0.2-0.3 over indigo night ground,
// composites to hue 17-28, i.e. into (or on the lip of) the reserved Ember
// Danger band §19.1 keeps for enemy threats. Both terminal stops move up ~8
// hue degrees; every §19.1 anchor the flame is built from is unchanged, and
// both stops stay far under the GAIN_MAX bloom-threshold budget
// (rgba(216,154,66,0.32): 0.377 x 0.32 x 0.96 = 0.116 against 0.68).
//
// The forge additionally ran at gain 0.78 against the hearth stack's 0.84/0.90:
// a dimmer flame is a flame whose near-neutral core contributes less and whose
// coloured feather contributes more, which is exactly the wrong direction for
// this. 0.90 matches the hearth's own licking tongues and is still under
// GAIN_MAX.
import { edit } from './certfixAworld2-patch.mjs';
edit('src/env/flame.js', [
  [
`  g.addColorStop(0.82, 'rgba(214,146,54,0.32)');
  g.addColorStop(1, 'rgba(190,124,52,0)');`,
`  g.addColorStop(0.82, 'rgba(216,154,66,0.32)');
  g.addColorStop(1, 'rgba(212,150,70,0)');`,
  ],
]);
edit('src/env/camp/hearth.js', [
  [`        const body = makeFlameSprite(0.5, 0.95, 0.78);`, `        const body = makeFlameSprite(0.5, 0.95, 0.9);`],
]);
