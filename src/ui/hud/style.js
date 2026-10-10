// HUD stylesheet (BUILD_BRIEF §17 grammar). Every colour is derived from
// data/palette.js — the HUD is a calm geometric instrument panel of Void
// Charcoal plates, Warm Grey chrome and Parchment ink, and it NEVER adopts
// environment tinting (it is DOM above the canvas, so no scene light and no
// composer pass can reach it; tools/actions/hd-tint.json proves it by
// comparing HUD pixels across a dark frame and a brazier-lit one).
//
// ============================ SIZING CONTRACT ============================
// §17: "designed at 1920x1080 virtual px and uniformly scaled by
// min(innerWidth/1920, innerHeight/1080)". EVERYTHING here — geometry AND
// type — is authored once in that virtual space and scaled by one number,
// so the layout is literally identical at every window size.
//
// ONE documented deviation, forced by the §17 legibility floors (text >=16
// real px, numerals >=20 real px). At 1024x640 the pure §17 scale is
// min(0.5333, 0.5926) = 0.5333, at which a 30 px numeral lands at 16 px —
// under the floor. The earlier build answered that by inflating the TYPE
// inside fixed geometry, which collapsed the skill-slot abbrev box to ~6 px
// and clipped its glyph into the countdown numeral. So instead the scale is
// CLAMPED BELOW at
//     MIN_SCALE = max(16.4 / FS_KEY, 20.6 / FS_NUM) = 0.6867
// and the two zones are anchored to the WINDOW edges (index.js computes the
// virtual offsets --zb / --zt) so the clamp can never push a zone off-screen.
// Above the clamp — every window from 1318x742 up, which includes 1600x900,
// 1920x1080 and 2560x1440 — the scale is exactly §17's min().
//
// Sizes below are therefore virtual px, and the real px a reader sees is
// `virtual * s`. The type floors then hold at the clamp:
//     FS_KEY 24 * 0.6867 = 16.48 real px  (floor 16)
//     FS_NUM 30 * 0.6867 = 20.60 real px  (floor 20)
//
// COLLISION FENCE (criterion 1). A tile is 64x64 with a 2 px rim, so its
// inner box is 60 px tall, and it is cut into two DISJOINT bands:
//     rows  0..26  key chip   ("1".."4" / "SPC" / "F1".."F4")
//     rows 27..60  glyph band (the skill abbrev OR the countdown numeral)
// The abbrev and the numeral share the lower band and are mutually exclusive
// — `.is-counting` hides the abbrev outright — so the sub-1 s numeral cannot
// collide with the abbrev at any scale, by construction rather than by
// tuning. tools/actions/hd-boxes.json asserts the rectangles never intersect.
import { PALETTE, CLASS_ACCENTS, VFX_BIOME, VFX_MATTER } from '../../data/palette.js';

const hex2rgb = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

// Palette-only blends: every colour in this file is either a §19.1 hex or a
// mix of two of them, so nothing here invents a colour.
export function mix(a, b, t) {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return (
    '#' +
    [0, 1, 2]
      .map((i) =>
        Math.round(A[i] + (B[i] - A[i]) * t)
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

// ------------------------------------------------------------- metrics ---
export const FS_KEY = 24; // key chips + skill abbrevs  (>=16 real px floor)
export const FS_LAB = 26; // banner labels
export const FS_NUM = 30; // ALL numerals               (>=20 real px floor)
export const TEXT_FLOOR = 16.4; // 16 px + margin for sub-pixel rounding
export const NUM_FLOOR = 20.6; // 20 px + margin
export const MIN_SCALE = Math.max(TEXT_FLOOR / FS_KEY, NUM_FLOOR / FS_NUM);

const TILE = 64; // §17 "Portrait 64x64" — skill/dodge slots match it
const KEY_H = 26; // key-chip band height (top of the tile)
const MED = 34; // skill medallion diameter (the icon disc in the glyph band)
const MED_CX = 33; // medallion centre inside the 60x60 inner box
const MED_CY = 42;
const RINGBOX = 40; // ring SVG box (r 16.5 + 3 px stroke)
const NUM_H = 33; // skill-slot numeral-strip height (bottom of the slot tile)
const HP_H = 10; // portrait HP bar
const HP_GAP = 2;
const BAR_PAD = 5;
const BN_PAD = 4;

const C = PALETTE.voidCharcoal;
export const CHROME = {
  plate: C, // opaque charcoal plate (§17: combat text always on an opaque plate)
  plateHi: mix(C, PALETTE.warmGrey, 0.1),
  plateSunk: mix(C, '#000000', 0.35),
  rim: mix(C, PALETTE.warmGrey, 0.44),
  rimDim: mix(C, PALETTE.warmGrey, 0.24),
  rimHot: mix(C, PALETTE.warmGrey, 0.72), // hover = chrome +1 value step
  ink: PALETTE.parchment,
  inkDim: PALETTE.warmGrey,
};

// Class accent + a lifted twin for the HP-bar highlight. The accents are dark
// by design (§19.1); the lift keeps the bar readable on a charcoal track
// without changing its hue.
export const ACCENTS = Object.fromEntries(
  Object.entries(CLASS_ACCENTS).map(([k, v]) => [
    k,
    { base: v, lift: mix(v, PALETTE.parchment, 0.55), deep: mix(v, C, 0.45) },
  ])
);

export const FONT_STACK =
  "system-ui, 'Segoe UI Variable Display', 'Segoe UI', ui-rounded, 'Nunito', 'Trebuchet MS', sans-serif";

export function hudCss() {
  return `
/* ---------------------------------------------------------------- roots -- */
/* The 1920x1080 virtual canvas, centred on the window and uniformly scaled.
   --zb / --zt are the zones' offsets from the canvas edges, recomputed on
   resize so each zone lands a fixed number of REAL px from the window edge
   even when --s is clamped above the letterbox scale. */
#hud {
  position: fixed;
  left: 50%; top: 50%;
  width: 1920px; height: 1080px;
  margin: -540px 0 0 -960px;
  transform: scale(var(--s, 1));
  transform-origin: 50% 50%;
  pointer-events: none;
  user-select: none;
  z-index: 12;
  font-family: ${FONT_STACK};
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  -webkit-font-smoothing: antialiased;
  color: ${CHROME.ink};
}
#hud-threat {
  position: fixed;
  inset: 0;
  pointer-events: none;
  user-select: none;
  z-index: 11;
  font-family: ${FONT_STACK};
}
#hud * { box-sizing: border-box; }

/* ------------------------------------------- ZONE 1 — command bar (§17) -- */
.hud-bar {
  position: absolute;
  left: 50%;
  bottom: var(--zb, 20px);
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: ${BAR_PAD}px 22px;
  border-radius: 14px;
  /* Brushed charcoal, not a flat plate: a 6 px grain over the §17 plate
     gradient (round-1 check 1/9 — a flat rounded rect read as browser chrome),
     plus a lit top rail and a real cast shadow so the bar sits ON the world. */
  background:
    repeating-linear-gradient(94deg,
      #FFFFFF06 0px, #FFFFFF06 1px, #00000012 1px, #00000012 3px,
      #FFFFFF03 3px, #FFFFFF03 6px),
    linear-gradient(180deg, ${CHROME.plateHi} 0%, ${CHROME.plate} 42%, ${CHROME.plate} 100%);
  border: 2px solid ${CHROME.rim};
  box-shadow: inset 0 0 0 1px ${CHROME.plateSunk}, inset 0 1px 0 ${PALETTE.parchment}1F,
              0 3px 0 0 ${CHROME.plateSunk}, 0 10px 24px #000000AA;
}
/* Ornamental end caps — the same bracket-and-stud grammar as the boss plate's
   medallion studs, so the two plates read as one instrument set. Absolutely
   positioned: they add ornament without touching the bar's layout width. */
.hud-cap {
  position: absolute; top: 7px; bottom: 7px; width: 10px;
  border-top: 2px solid ${CHROME.rimHot};
  border-bottom: 2px solid ${CHROME.rimHot};
  pointer-events: none;
}
.hud-cap-l { left: 6px; border-left: 2px solid ${CHROME.rimHot}; border-radius: 7px 0 0 7px; }
.hud-cap-r { right: 6px; border-right: 2px solid ${CHROME.rimHot}; border-radius: 0 7px 7px 0; }
.hud-cap::after {
  content: ''; position: absolute; top: 50%; width: 9px; height: 9px; margin-top: -4.5px;
  background: ${CHROME.rimHot}; border: 2px solid ${CHROME.plate};
  transform: rotate(45deg);
}
.hud-cap-l::after { left: -6px; }
.hud-cap-r::after { right: -6px; }
.hud-group { display: flex; gap: 7px; align-items: flex-start; }
.hud-sep {
  position: relative;
  width: 2px;
  height: ${TILE}px;
  margin: 0 -5px;
  border-radius: 1px;
  background: linear-gradient(180deg, transparent, ${CHROME.rimHot} 22%, ${CHROME.rimHot} 78%, transparent);
}
/* A small diamond on the divider — the third beat of the bracket-and-stud
   ornament grammar (boss plate studs / bar end caps / group dividers). */
.hud-sep::after {
  content: ''; position: absolute; left: 50%; top: 50%;
  width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px;
  background: ${CHROME.plate}; border: 2px solid ${CHROME.rimHot};
  transform: rotate(45deg);
}

/* ---------------------------------------------------- portrait tile (§17) */
.hud-port {
  position: relative;
  width: ${TILE}px;
  pointer-events: auto;
  cursor: pointer;
}
.hud-port-tile {
  position: relative;
  width: ${TILE}px; height: ${TILE}px;
  border-radius: 12px;
  border: 2px solid var(--accent, ${CHROME.rim});
  /* A lifted-charcoal studio backdrop: the critter's own ink line IS Void
     Charcoal, so a pure charcoal plate would swallow the silhouette. */
  background: linear-gradient(180deg, ${mix(C, PALETTE.warmGrey, 0.26)} 0%, ${mix(C, PALETTE.warmGrey, 0.08)} 62%, ${CHROME.plateSunk} 100%);
  overflow: hidden;
}
.hud-port-crop { position: absolute; inset: 0; overflow: hidden; }
.hud-port-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  transform-origin: 50% 50%;
}
.hud-port-fallback {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 30px; font-weight: 800; color: var(--accentLift, ${CHROME.ink});
}
/* inner frame — the Critical value-pulse target (1 -> 3 px, charcoal<->bone) */
.hud-port-inner {
  position: absolute; inset: 2px;
  border-radius: 8px;
  border: 0 solid transparent;
  pointer-events: none;
  z-index: 5;
}
/* Selected override (F1-F4 / click): STATIC 2 px Hearth Amber outline (§17) */
.hud-port-sel {
  position: absolute; inset: -4px;
  border-radius: 15px;
  border: 2px solid ${PALETTE.hearthAmber};
  display: none;
  pointer-events: none;
}
.hud-port.is-selected .hud-port-sel { display: block; }
/* colour-blind fence (§19.1): selection is also a SHAPE — a corner tab */
.hud-port-tab {
  position: absolute; bottom: 12px; right: -1px;
  width: 0; height: 0;
  border-left: 15px solid transparent;
  border-bottom: 15px solid ${PALETTE.hearthAmber};
  display: none;
  pointer-events: none;
}
.hud-port.is-selected .hud-port-tab { display: block; }
/* Rally confirm: outer expanding-ring flash on all 4 at once (§8/§17). It is a
   separate element from .hud-port-inner so it composites with Critical. */
.hud-port-rally {
  position: absolute; inset: 0;
  border-radius: 12px;
  border: 3px solid ${PALETTE.hearthAmber};
  opacity: 0;
  pointer-events: none;
}
@keyframes hud-rally {
  0%   { transform: scale(1);    opacity: 0.95; }
  100% { transform: scale(1.55); opacity: 0; }
}
.hud-port-rally.go { animation: hud-rally 380ms ease-out; }
/* §23.3 shield: a Parchment HEX RIM around the portrait tile (a shape, never
   colour alone) + the shield's points on its own small opaque plate at the
   tile's top-left, clear of the F-key chip (top-right band) and the Critical
   numeral (bottom-right). */
.hud-port-shield {
  position: absolute; left: -6px; top: -6px; width: ${TILE + 12}px; height: ${TILE + 12}px;
  display: none; pointer-events: none; overflow: visible; z-index: 7;
}
.hud-port-shield path { fill: none; stroke: ${PALETTE.parchment}; stroke-width: 2.6; stroke-linejoin: round;
  filter: drop-shadow(0 0 1.5px ${PALETTE.voidCharcoal}); }
.hud-port.has-shield .hud-port-shield { display: block; }
.hud-port-shieldnum {
  position: absolute; left: -10px; top: 30px; min-width: 30px; height: 28px; padding: 0 4px;
  display: none; align-items: center; justify-content: center; z-index: 8;
  background: ${CHROME.plate}; border: 2px solid ${PALETTE.parchment}; border-radius: 6px;
  font-size: ${FS_KEY}px; font-weight: 800; line-height: 1; color: ${PALETTE.parchment};
  pointer-events: none;
}
.hud-port.has-shield .hud-port-shieldnum { display: flex; }

/* PORTRAIT TOP BAND (rows 0..${KEY_H}). ONE opaque charcoal plate carrying the
   F-key chip — "F1".."F4", the §8 heal-override affordance — at its NATURAL
   width, in every state. See the ART FENCE note above: the bust is framed to
   keep this band empty.
   ROUND-3 DEFECT (criterion 1). The Critical HP numeral used to share this
   flex line: the numeral was flex:0 0 auto and the chip flex:0 1 auto with
   overflow:hidden, so on a Critical tile the chip was squeezed from 24.6 px
   to 14.4 px and the label was CLIPPED mid-word ("F2" rendering as "2", 6 px
   from a "30" -> the band read "230"). A label is never truncated to make room
   now: the chip is flex:0 0 auto and the numeral has moved off this line
   entirely, onto its own plate (see .hud-port-num). */
.hud-port-top {
  position: absolute; left: 0; top: 0;
  height: ${KEY_H}px;
  display: flex; align-items: center;
  padding: 0 4px;
  border-bottom-right-radius: 9px;
  background: ${CHROME.plate};
  z-index: 3;
}
.hud-port-key i { font-style: normal; }
.hud-port-key {
  flex: 0 0 auto;
  overflow: visible;
  color: ${CHROME.inkDim};
  font-size: ${FS_KEY}px;
  font-weight: 800;
  line-height: 1;
  white-space: nowrap;
}
/* CRITICAL NUMERAL (§17: persistent, >=20 px). Its own opaque plate in the
   tile's BOTTOM-LEFT corner — the emptiest corner of the bust (portraits.js
   frame (right/bottom offsets = the 2 px rim, the 2 px gap and the 10 px HP
   track), so:
     * it shares no line, and no plate, with the F-key chip — the two boxes are
       disjoint by construction, at every scale (round-3 defect: the chip was
       clipped to "2" and read as one number with the HP value);
     * it never breaks the class frame and never covers ANY of the HP track,
       so §17's Critical frame+track pulse stays fully legible underneath;
     * the character art keeps its face — the plate is ~28% of the tile's inner
       box, in the corner (round 2 rejected a bottom strip that ate 51.6%).
   z-index 6 clears the tile (crop 0, top band 3, ring 4, inner frame 5). */
.hud-port-num {
  position: absolute;
  left: 6px; bottom: ${HP_H + HP_GAP + 5}px;
  height: 28px; min-width: 26px;
  padding: 0 4px;
  display: none;
  align-items: center; justify-content: flex-end;
  border-radius: 7px 4px 7px 4px;
  background: ${CHROME.plate};
  border: 1px solid ${CHROME.rimDim};
  color: ${CHROME.ink};
  font-size: ${FS_NUM}px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;
  z-index: 6;
}
.hud-port.is-critical .hud-port-num { display: flex; }
.hud-slot-key {
  position: absolute; left: 0; top: 0;
  height: ${KEY_H}px;
  padding: 0 6px;
  display: flex; align-items: center;
  border-bottom-right-radius: 9px;
  background: ${CHROME.plate};
  color: ${CHROME.inkDim};
  font-size: ${FS_KEY}px;
  font-weight: 800;
  line-height: 1;
  z-index: 3;
}

/* Downed: horizontal portrait treatment + hollow Bone ring with a hold-E
   glyph; Being-revived fills that ring clockwise in Parchment (§17). */
.hud-port.is-downed .hud-port-tile { border-color: ${PALETTE.bone}; }
/* IDENTITY RING (§10: "accent color desaturates toward charcoal; identity ring
   stays visible"). ROUND-3 DEFECT: the Bone downed ring replaced the accent
   outright and the F-key chip stands down, so three downed tiles measured as
   the same histogram — a healer could not tell WHO was down. A 2 px
   class-accent hairline now sits concentric INSIDE the Bone ring, and the HP
   track wears the accent on its rim, so class survives the downed treatment
   without competing with the revive instrument. */
/* ROUND-D ADVISORY (two downed tiles read as one object: mean tile diff
   14.4/channel vs 45.0 healthy). Three changes: the hairline and track rim
   carry the class BASE accent (#6B6157 vs #6E7A3F are far apart; their lifts
   were <=11/255 apart), the F-key chip stays up (see .hud-port-top below),
   and the bust keeps enough colour and size to stay a badger / a hare. */
.hud-port-ident {
  position: absolute; inset: 0;
  border-radius: 10px;
  border: 2px solid var(--accent, ${PALETTE.bone});
  display: none;
  pointer-events: none;
  z-index: 2;
}
.hud-port.is-downed .hud-port-ident { display: block; }
.hud-port.is-downed .hud-port-hp { border-color: var(--accent, ${CHROME.rimDim}); }
.hud-port.is-downed .hud-port-crop { clip-path: inset(24% 0 24% 0); }
.hud-port.is-downed .hud-port-img {
  transform: rotate(78deg) scale(0.94);
  filter: grayscale(0.45) brightness(0.92);
}
.hud-port-ring {
  position: absolute; inset: 0;
  display: none;
  z-index: 4;
}
.hud-port.is-downed .hud-port-ring { display: block; }
.hud-port-ring .rk { fill: none; stroke: ${CHROME.plate}; stroke-width: 11; opacity: 0.62; }
.hud-port-ring .rb { fill: none; stroke: ${PALETTE.bone}; stroke-width: 5; }
.hud-port-ring .rf {
  fill: none; stroke: ${PALETTE.parchment}; stroke-width: 7;
  stroke-linecap: butt;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}
/* DOWNED TOP BAND. Round 3 hid the F-key chip while Downed (the chip sat on
   the ring's 12 o'clock start); round D measured the cost — two downed tiles
   became the same Bone ring. The chip now STAYS UP, in the class accent, and
   the hold-E glyph becomes a second keycap mirrored at the top-right. Both
   caps paint ABOVE the ring (z 5 > ring 4) and the ring's visible arc is cut
   to the span the caps leave free (commandbar.js ARC_START/ARC_SWEEP), so the
   two chips never share a pixel with each other, with the ring, or with the
   bust's crop band. A 64 px tile cannot hold a 26 px keycap, a 26 px E plate
   and a full circle with no overlap; this is the composition that keeps all
   three legible. */
.hud-port.is-downed .hud-port-top { z-index: 5; }
.hud-port.is-downed .hud-port-key { color: var(--accentLift, ${CHROME.inkDim}); }
.hud-port-e {
  position: absolute; right: 0; top: 0;
  height: ${KEY_H}px; padding: 0 4px;
  border-bottom-left-radius: 9px;
  display: none;
  align-items: center; justify-content: center;
  background: ${CHROME.plate};
  font-size: ${FS_KEY}px;
  font-weight: 800;
  line-height: 1;
  color: ${PALETTE.bone};
  z-index: 5;
}
.hud-port.is-downed .hud-port-e { display: flex; }
@keyframes hud-shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
.hud-port.shake { animation: hud-shake 160ms ease-out; }

/* HP bar: class accent on a charcoal track (§17).
   POLARITY FENCE. The track interior is ALWAYS Void Charcoal, at every phase
   of the Critical pulse: the filled part must stay the brighter element or the
   bar inverts its reading (a 15%-HP bar that looks 85% full). §17's
   "track value-pulse charcoal<->bone" is therefore carried by the track's
   OUTLINE (2 px while Critical) plus the tile's inner frame, and the VALUE
   pulse rides the fill itself, which brightens toward Parchment. See
   commandbar.js paintCritical(). */
.hud-port-hp {
  position: relative;
  margin-top: ${HP_GAP}px;
  height: ${HP_H}px;
  border-radius: 3px;
  background: ${CHROME.plate};
  border: 1px solid ${CHROME.rimDim};
  overflow: hidden;
}
/* The Critical track pulse rides an OUTLINE, which is painted outside the
   border box: the track's 10 px interior is never narrowed, so a probe that
   samples the track always samples Void Charcoal. */
.hud-port.is-critical .hud-port-hp { outline: 2px solid transparent; }
.hud-port-hp i {
  display: block; height: 100%; width: 100%;
  background: linear-gradient(180deg, var(--accentLift) 0%, var(--accentLift) 34%, var(--accent) 62%, var(--accentDeep) 100%);
  box-shadow: inset 0 -1px 0 ${CHROME.plateSunk};
}
/* Hover: +1 VALUE step ONLY (§17) — no layout, and no colour SEMANTICS.
   ROUND-3 DEFECT. The old rule set border-color:rimHot and
   swapped the plate gradient for a flat chrome fill, which threw away the
   thing the frame is FOR: the class accent (measured rgb(110,122,63) Archer
   -> rgb(122,113,104) neutral, i.e. hover erased class identity and landed a
   hair off the Critical bone frame — two states reading the same in a static
   frame). Hover now LIFTS what is already there: the same class accent one
   value step up (--accentLift) and the same charcoal gradient one step
   brighter. Hue is preserved, so hover can never be confused with Critical
   (neutral bone) or Selected (Hearth Amber). */
.hud-port:hover .hud-port-tile,
.hud-port.is-hover .hud-port-tile {
  background: linear-gradient(180deg, ${mix(C, PALETTE.warmGrey, 0.4)} 0%, ${mix(C, PALETTE.warmGrey, 0.2)} 62%, ${mix(C, PALETTE.warmGrey, 0.06)} 100%);
  border-color: var(--accentLift, ${CHROME.rimHot});
}
.hud-port:hover .hud-port-top,
.hud-port.is-hover .hud-port-top { background: ${CHROME.plateHi}; }
.hud-port:hover .hud-port-key,
.hud-port.is-hover .hud-port-key { color: ${CHROME.ink}; }
.hud-port:hover .hud-port-hp,
.hud-port.is-hover .hud-port-hp { border-color: ${CHROME.rimHot}; }

/* ------------------------------------------------------- skill/dodge slot */
/* ICON FIELD. §17 spends the cooldown as a "70% charcoal overlay" — which is
   invisible on a pure Void Charcoal plate, and whose conic edge then only
   shows by cutting a hard diagonal through the abbrev glyph. So the slot's
   field is charcoal LIFTED toward Warm Grey (the same studio backdrop the
   portrait tiles use): the veil now darkens the FIELD, the wipe reads as a
   clock, and the glyph is dimmed uniformly by .is-cooling instead of being
   sliced. Parchment ink on this field measures 9.4:1 (criterion 5). */
.hud-slot {
  position: relative;
  width: ${TILE}px; height: ${TILE}px;
  border-radius: 12px;
  background: linear-gradient(180deg, ${mix(C, PALETTE.warmGrey, 0.30)} 0%, ${mix(C, PALETTE.warmGrey, 0.22)} 100%);
  box-shadow: inset 0 -2px 0 0 ${CHROME.plateSunk};
  border: 2px solid ${CHROME.rim};
  overflow: hidden;
}
/* SOCKET-FILL strip (M4c): 8 segments under each skill tile, in the row
   where a portrait carries its HP bar (same gap, same height), so the bar's
   silhouette is unchanged. Live node = filled Parchment; grey / inert node =
   a hollow Bone segment; vacant = the dark plate. */
.hud-skillcol { position: relative; width: ${TILE}px; }
.hud-slot-pips {
  display: flex; gap: 2px;
  margin-top: ${HP_GAP}px; height: ${HP_H}px;
}
.hud-slot-pips i {
  flex: 1 1 0; border-radius: 2px;
  background: ${CHROME.plateSunk};
  border: 1px solid ${CHROME.rimDim};
}
.hud-slot-pips i.is-on { background: ${PALETTE.parchment}; border-color: ${PALETTE.parchment}; }
.hud-slot-pips i.is-grey { background: transparent; border: 2px solid ${PALETTE.bone}; }
.hud-slot.is-empty { border-style: dashed; border-color: ${CHROME.rimDim}; }
.hud-slot.is-empty { background: ${CHROME.plate}; }
.hud-slot.is-empty .hud-slot-abbrev { color: ${CHROME.rimHot}; background: ${CHROME.plate}; box-shadow: none; }
.hud-slot.is-empty .hud-slot-ring .rr { stroke: ${CHROME.rimDim}; stroke-dasharray: 3 4; }
.hud-slot-key { background: ${CHROME.plateHi}; z-index: 4; }
/* GLYPH BAND = the MEDALLION (check 9: icons + cooldown radials). A ${MED}px
   sunk charcoal disc centred in the band below the key chip; the conic veil is
   clipped INSIDE it (a clock face, not a corner wedge), the drawn icon sits
   above the veil, and .hud-slot-ring paints the Parchment progress arc on the
   rim. .is-counting still hides the medallion and hands the band to the
   numeral strip — the two stay mutually exclusive, so they never overlap. */
.hud-slot-abbrev {
  position: absolute;
  left: ${MED_CX - MED / 2}px; top: ${MED_CY - MED / 2}px;
  width: ${MED}px; height: ${MED}px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  background: radial-gradient(circle at 50% 38%, ${mix(C, PALETTE.warmGrey, 0.16)} 0%, ${CHROME.plateSunk} 78%);
  box-shadow: inset 0 1px 2px ${CHROME.plateSunk};
  color: ${CHROME.ink};
  z-index: 2;
}
.hud-slot.is-counting .hud-slot-abbrev,
.hud-slot.is-counting .hud-slot-ring { display: none; }
.hud-slot-ico { position: relative; display: block; width: 26px; height: 26px; z-index: 2; }
.hud-slot-ico svg { display: block; width: 26px; height: 26px; }
/* Ring: chrome rim always (a dim circle framing the icon); the Parchment arc
   carries the elapsed cooldown, clockwise from 12. */
.hud-slot-ring {
  position: absolute;
  left: ${MED_CX - RINGBOX / 2}px; top: ${MED_CY - RINGBOX / 2}px;
  width: ${RINGBOX}px; height: ${RINGBOX}px;
  z-index: 3;
  pointer-events: none;
  overflow: visible;
}
.hud-slot-ring .rr { fill: none; stroke: ${CHROME.rimDim}; stroke-width: 2; }
.hud-slot-ring .rf {
  fill: none; stroke: ${PALETTE.parchment}; stroke-width: 3;
  stroke-linecap: butt;
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
  opacity: 0;
}
.hud-slot.is-cooling .hud-slot-ring .rf { opacity: 1; }
.hud-slot.is-cooling .hud-slot-ring .rr { stroke: ${CHROME.plateSunk}; }
/* The sweep hand (round-2 check-9 fix): a Parchment spoke from the medallion
   centre to a diamond head on the rim, sitting exactly on the veil's conic
   edge. Hidden unless the slot is actually cooling, so a ready slot is still
   "full icon, no veil". */
.hud-slot-ring .hd { opacity: 0; }
.hud-slot-ring .hd line {
  stroke: ${PALETTE.parchment}; stroke-width: 1.7; stroke-linecap: round;
}
.hud-slot-ring .hd .hh { fill: ${PALETTE.parchment}; stroke: none; }
.hud-slot.is-cooling .hud-slot-ring .hd { opacity: 1; }
/* Cooling: the icon dims UNIFORMLY (5.1:1 on the field) — the veil never
   half-lights a glyph. */
.hud-slot.is-cooling .hud-slot-abbrev { color: ${mix(PALETTE.parchment, C, 0.3)}; }
/* The veil lives INSIDE the medallion: z 1, under the icon (2). */
.hud-slot-wipe { position: absolute; inset: 0; border-radius: 50%; z-index: 1; }
/* The on_cooldown nudge paints HERE, not on the wipe itself: the wipe's own
   background-image is the conic charcoal veil, so a background-colour flash on
   it would only show through the wedge that is already spent — the opposite of
   the icon the player needs. This layer sits above the veil and washes the
   whole tile. */
.hud-slot-flash { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
/* Dedicated frame layer for the empty_slot blink. Every denial nudge owns its
   OWN element and its OWN animated property, so two reasons can never land on
   one node and let stylesheet order pick the winner (the round-2 defect: a
   dash-cancel's skip-pulse permanently killed the frame blink on that slot). */
.hud-slot-frame {
  position: absolute; inset: 0;
  border: 3px solid transparent;
  border-radius: 12px;
  z-index: 7;
  pointer-events: none;
}
.hud-slot-num {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: ${NUM_H}px;
  display: none;
  align-items: center; justify-content: center;
  background: ${CHROME.plate};
  border-top: 1px solid ${CHROME.rimDim};
  color: ${CHROME.ink};
  font-size: ${FS_NUM}px;
  font-weight: 800;
  line-height: 1;
  z-index: 5;
}
.hud-slot.is-counting .hud-slot-num { display: flex; }
/* Passive slot (Warding Aura): static glyph, never a wipe (§7/§17) */
.hud-slot.is-passive { border-color: ${ACCENTS.healer.lift}; }
/* The passive marker lives in the KEY-CHIP band (top-right), never in the
   glyph band, so it cannot touch the abbrev. */
.hud-slot-passive {
  position: absolute; right: 5px; top: 4px;
  font-size: 17px; color: ${ACCENTS.healer.lift};
  line-height: 1;
  display: none; z-index: 2;
}
.hud-slot.is-passive .hud-slot-passive { display: block; }
/* Grey-socketed-node marker: hollow icon + diagonal strike, persistent (§17) */
.hud-slot-grey { position: absolute; inset: 0; display: none; z-index: 6; }
.hud-slot.is-grey .hud-slot-grey { display: block; }
.hud-slot.is-grey .hud-slot-abbrev { color: ${CHROME.inkDim}; }

/* denial nudges — ICON level, ~180 ms, restart on repeat, never alarms (§17).
   Three DIFFERENT channels so the three reasons are told apart without colour:
     on_cooldown        -> a Warm Grey wash across the icon   (fill)
     empty_slot         -> the dashed frame blinks Parchment  (frame)
     priority_suppressed-> the icon skip-pulses in scale      (motion) */
@keyframes hud-wipe-nudge {
  0%,100% { background-color: transparent; }
  40%     { background-color: ${PALETTE.warmGrey}66; }
}
.hud-nudge-wipe { animation: hud-wipe-nudge 180ms ease-out; }
@keyframes hud-frame-blink {
  0%,100% { border-color: transparent; }
  50%     { border-color: ${PALETTE.parchment}; }
}
.hud-nudge-blink { animation: hud-frame-blink 180ms ease-out; }
@keyframes hud-skip-pulse {
  0%   { transform: scale(1); }
  42%  { transform: scale(1.14); }
  100% { transform: scale(1); }
}
.hud-nudge-skip { animation: hud-skip-pulse 180ms ease-out; }
/* ready-pop: 120 ms scale 1 -> 1.15 -> 1 + plate flash charcoal -> warm grey */
@keyframes hud-ready-pop {
  0%   { transform: scale(1);    box-shadow: inset 0 0 0 40px transparent; }
  45%  { transform: scale(1.15); box-shadow: inset 0 0 0 40px ${PALETTE.warmGrey}; }
  100% { transform: scale(1);    box-shadow: inset 0 0 0 40px transparent; }
}
.hud-ready { animation: hud-ready-pop 120ms ease-out; }

/* STATIC PEAK classes. A 180 ms nudge is a coin-flip for a screenshot, and
   pausing a WAAPI animation does not survive the HUD's per-frame class writes
   (round-2 defect: __echoes.hud.pinAnimations reverted 400 ms later). These
   classes carry the keyframe PEAK as plain declarations — no animation, no
   timeline — so __echoes.hud.forceNudge(target, kind, holdMs) can hold a real
   nudge at its peak for as long as a capture needs and the pixels are the same
   pixels the animation reaches at 40-50%. */
/* Scoped through #hud so a held peak outranks the state rules it has to beat
   (a running animation wins the cascade on its own, but a STATIC class does
   not: plain .hud-peak-blink loses to .hud-slot.is-empty's dim border, which
   is exactly the "border stays rimDim" symptom round 2 reported). */
#hud .hud-peak-wipe  { background-color: ${PALETTE.warmGrey}66; }
#hud .hud-peak-blink { border-color: ${PALETTE.parchment}; }
#hud .hud-peak-skip  { transform: scale(1.14); }
#hud .hud-peak-ready { transform: scale(1.15); box-shadow: inset 0 0 0 40px ${PALETTE.warmGrey}; }

/* ------------------------------------ corner plates (Reference D chrome) -- */
/* Location label top-left ("Gate Bridge") and the Glint counter top-right.
   Both are §17 plates; the counter is the ONE place Pale Gold appears (§14). */
.hud-loc, .hud-glint {
  position: absolute;
  top: var(--zt, 18px);
  display: flex; align-items: center;
  border-radius: 12px;
  background: linear-gradient(180deg, ${CHROME.plateHi} 0%, ${CHROME.plate} 55%);
  border: 2px solid ${CHROME.rim};
  box-shadow: inset 0 0 0 1px ${CHROME.plateSunk}, 0 2px 0 0 ${CHROME.plateSunk};
  white-space: nowrap;
}
.hud-loc { left: var(--zx, 18px); gap: 10px; padding: 5px 16px 5px 9px; }
/* Narrow windows: the plate drops one row so the centred boss plate never
   lands on it (see the collision note in ui/hud/index.js). */
.hud-loc.hud-loc-drop { top: calc(var(--zt, 18px) + var(--bnH, 76px)); }
.hud-loc-ico { display: block; width: 30px; height: 30px; color: ${PALETTE.bone}; flex: 0 0 auto; }
.hud-loc-text { display: flex; flex-direction: column; gap: 1px; }
.hud-loc-name { font-size: ${FS_LAB}px; font-weight: 800; line-height: 1.05; letter-spacing: 0.08em; color: ${CHROME.ink}; }
.hud-loc-sub { font-size: ${FS_KEY}px; font-weight: 700; line-height: 1.05; letter-spacing: 0.1em; color: ${CHROME.inkDim}; }
.hud-glint { right: var(--zx, 18px); gap: 9px; padding: 6px 16px 6px 10px; }
.hud-glint-coin {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 50%;
  color: ${mix(PALETTE.paleGold, C, 0.55)};
  background: radial-gradient(circle at 36% 30%, ${mix(PALETTE.paleGold, PALETTE.parchment, 0.55)} 0%, ${PALETTE.paleGold} 52%, ${mix(PALETTE.paleGold, C, 0.5)} 100%);
  border: 2px solid ${CHROME.plateSunk};
  box-shadow: 0 0 12px ${PALETTE.paleGold}88;
}
.hud-glint-coin svg { display: block; width: 24px; height: 24px; }
.hud-glint-num {
  font-size: ${FS_NUM}px; font-weight: 800; line-height: 1;
  color: ${PALETTE.paleGold};
  text-shadow: 0 0 10px ${PALETTE.paleGold}66;
}
.hud-glint-lab { font-size: ${FS_KEY}px; font-weight: 700; letter-spacing: 0.14em; color: ${CHROME.inkDim}; line-height: 1; }
/* KEYS AND VAULTS (docs/VAULTS.md): the party's key, under the Glint plate
   while one is held. It pops in on the pick-up and says it lasts the level. */
.hud-key {
  position: absolute;
  right: var(--zx, 18px);
  top: calc(var(--zt, 18px) + 64px);
  display: none; align-items: center; gap: 8px;
  padding: 4px 14px 4px 8px;
  border-radius: 10px;
  background: linear-gradient(180deg, ${CHROME.plateHi} 0%, ${CHROME.plate} 55%);
  border: 2px solid ${PALETTE.paleGold};
  box-shadow: inset 0 0 0 1px ${CHROME.plateSunk}, 0 0 14px ${PALETTE.paleGold}55;
  white-space: nowrap;
}
.hud-key.hud-key-on { display: flex; }
.hud-key.hud-key-pop { animation: hud-key-pop 0.7s cubic-bezier(.2,1.6,.4,1); }
@keyframes hud-key-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); } }
.hud-key-ico { color: ${PALETTE.paleGold}; filter: drop-shadow(0 0 6px ${PALETTE.paleGold}AA); display: flex; }
.hud-key-ico svg { display: block; width: 30px; height: 30px; }
.hud-key-txt { display: flex; flex-direction: column; gap: 2px; }
.hud-key-name { font-size: ${FS_KEY + 2}px; font-weight: 800; letter-spacing: 0.12em; color: ${PALETTE.paleGold}; line-height: 1; }
.hud-key-sub { font-size: ${FS_KEY - 2}px; font-weight: 700; letter-spacing: 0.1em; color: ${CHROME.inkDim}; line-height: 1; }

/* ------------------------------------------- ZONE 2 — room banner (§17) -- */
#hud-banner {
  position: absolute;
  left: 50%; top: var(--zt, 18px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: ${BN_PAD}px 20px;
  border-radius: 12px;
  background: linear-gradient(180deg, ${CHROME.plateHi} 0%, ${CHROME.plate} 46%);
  border: 2px solid ${CHROME.rim};
  box-shadow: inset 0 0 0 1px ${CHROME.plateSunk};
  opacity: 0;
  /* 150 ms: the fade-out shares its <=300 ms budget with the reward page the
     run UI builds in the same frame (measured 158-250 ms of main thread), and
     banner.js anchors the transition before that build. */
  transition: opacity 150ms linear;
  white-space: nowrap;
}
#hud-banner.show { opacity: 1; }
#hud-banner.boss {
  /* Ornate plate: medallion | name row (name + numeral) / bar row (caps + bar + pips). */
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  column-gap: 12px; row-gap: 3px;
  align-items: center;
  padding: ${BN_PAD}px 22px ${BN_PAD + 2}px 8px;
  border-color: ${PALETTE.godstuffViolet};
  box-shadow: inset 0 0 0 1px ${CHROME.plateSunk}, 0 0 0 3px ${CHROME.plate},
              0 0 0 4px ${mix(C, PALETTE.godstuffViolet, 0.55)}, 0 0 22px ${PALETTE.godstuffViolet}55;
}
#hud-banner.boss .hud-bn-label { grid-row: 1; grid-column: 2; letter-spacing: 0.14em; }
#hud-banner.boss .hud-bn-num { grid-row: 1; grid-column: 3; justify-self: end; }
#hud-banner.boss .hud-bn-barrow { grid-row: 2; grid-column: 2 / span 2; }
/* Medallion: violet double ring, four studs, the drawn Stag in violet-white. */
.hud-bn-medal {
  display: none;
  position: relative;
  width: 58px; height: 58px;
  border-radius: 50%;
  align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 40%, ${mix(C, PALETTE.godstuffViolet, 0.32)} 0%, ${CHROME.plateSunk} 72%);
  border: 2px solid ${PALETTE.godstuffViolet};
  box-shadow: 0 0 0 2px ${CHROME.plate}, 0 0 0 3px ${mix(C, PALETTE.godstuffViolet, 0.6)}, 0 0 16px ${PALETTE.godstuffViolet}77;
  color: ${PALETTE.godstuffVioletPeak};
  margin: -8px 0;
}
#hud-banner.boss .hud-bn-medal { display: flex; grid-row: 1 / span 2; grid-column: 1; }
.hud-bn-medal-ico { position: relative; display: block; width: 34px; height: 34px; z-index: 1;
  filter: drop-shadow(0 0 4px ${PALETTE.godstuffViolet}); }
/* Boss identity: the five newer bosses keep the violet boss rim and studs
   but sink their medal into their own ground (the Stag keeps the plain
   violet well): bramble, millrace foam, oak and iron, cinder, grave mist. */
${Object.entries({
  thornmother: mix(VFX_BIOME[1], VFX_MATTER.bramble, 0.3),
  heron: mix(VFX_MATTER.water, VFX_BIOME[2], 0.45),
  millwheel: mix(VFX_MATTER.oak, VFX_MATTER.iron, 0.35),
  wyrm: mix(VFX_MATTER.cinder, VFX_MATTER.earth, 0.5),
  lichram: mix(VFX_MATTER.wisp, VFX_MATTER.boneplate, 0.25),
  // Act IV: the Cantor sinks into the heart's own violet light, the
  // Colossus into slate and pale glass.
  cantor: mix(VFX_MATTER.heartvein, VFX_MATTER.heartpeak, 0.3),
  colossus: mix(VFX_MATTER.stone, VFX_MATTER.heartcrystal, 0.4),
  // Third bosses: the wolf in moonlit grey, the toad in millpond silt.
  gloamwolf: mix(VFX_MATTER.owlfeather, VFX_BIOME[1], 0.45),
  mireking: mix(VFX_MATTER.silt, VFX_MATTER.water, 0.4),
  // Slice 11: the raven in pyre ash and bone, the weaver in lit vein.
  ashraven: mix(VFX_MATTER.cinder, VFX_MATTER.boneplate, 0.35),
  veinweaver: mix(VFX_MATTER.heartflesh, VFX_MATTER.heartvein, 0.45),
})
  .map(
    ([k, tint]) => `.hud-bn-medal[data-boss="${k}"] {
  background: radial-gradient(circle at 50% 40%, ${mix(C, mix(PALETTE.godstuffViolet, tint, 0.62), 0.42)} 0%, ${CHROME.plateSunk} 74%);
}`
  )
  .join('\n')}
.hud-bn-medal-ring { position: absolute; inset: -7px; border-radius: 50%; pointer-events: none; }
.hud-bn-stud {
  position: absolute; width: 9px; height: 9px;
  background: ${PALETTE.godstuffViolet};
  border: 2px solid ${CHROME.plate};
  transform: rotate(45deg);
}
.hud-bn-stud.s0 { left: 50%; top: -2px; margin-left: -4.5px; }
.hud-bn-stud.s1 { right: -2px; top: 50%; margin-top: -4.5px; }
.hud-bn-stud.s2 { left: 50%; bottom: -2px; margin-left: -4.5px; }
.hud-bn-stud.s3 { left: -2px; top: 50%; margin-top: -4.5px; }
/* Bar row: caps + bar + phase pips */
.hud-bn-barrow { display: flex; align-items: center; gap: 0; position: relative; }
.hud-bn-cap { display: none; width: 0; height: 0; flex: 0 0 auto; }
#hud-banner.boss .hud-bn-cap { display: block; }
.hud-bn-cap-l {
  border-top: 11px solid transparent; border-bottom: 11px solid transparent;
  border-right: 13px solid ${PALETTE.godstuffViolet};
  margin-right: -2px;
}
.hud-bn-cap-r {
  border-top: 11px solid transparent; border-bottom: 11px solid transparent;
  border-left: 13px solid ${PALETTE.godstuffViolet};
  margin-left: -2px;
}
.hud-bn-phases { display: none; position: absolute; left: 13px; right: 13px; top: 0; bottom: 0; pointer-events: none; }
#hud-banner.boss .hud-bn-phases { display: block; }
.hud-bn-phase {
  position: absolute; top: -6px;
  width: 10px; height: 10px; margin-left: -7px;
  background: ${CHROME.plate};
  border: 2px solid ${PALETTE.godstuffViolet};
  transform: rotate(45deg);
}
.hud-bn-phase.fired { background: ${PALETTE.godstuffVioletPeak}; border-color: ${PALETTE.godstuffVioletPeak}; box-shadow: 0 0 6px ${PALETTE.godstuffVioletPeak}; }
.hud-bn-label {
  font-size: ${FS_LAB}px;
  font-weight: 800;
  line-height: ${FS_NUM}px;
  letter-spacing: 0.09em;
  color: ${CHROME.ink};
}
.hud-bn-sub { color: ${CHROME.inkDim}; letter-spacing: 0.12em; }
.hud-bn-num {
  font-size: ${FS_NUM}px;
  font-weight: 800;
  line-height: ${FS_NUM}px;
  color: ${CHROME.ink};
}
.hud-bn-num.warn { color: ${PALETTE.hearthAmber}; }
.hud-bn-pips { display: flex; gap: 7px; align-items: center; height: ${FS_NUM}px; }
.hud-bn-pip {
  width: 14px; height: 14px;
  border-radius: 50%;
  border: 2px solid ${CHROME.rimHot};
  background: transparent;
}
.hud-bn-pip.done { background: ${PALETTE.parchment}; border-color: ${PALETTE.parchment}; }
.hud-bn-pip.now  { background: ${PALETTE.hearthAmber}; border-color: ${PALETTE.hearthAmber}; }
/* ROOM OBJECTIVES: a purge's pips are its nests — violet while one stands,
   a hollow ring once it is destroyed. */
.hud-banner[data-mode="purge"] .hud-bn-pip { width: 16px; height: 16px; background: ${PALETTE.godstuffViolet}; border-color: ${PALETTE.godstuffVioletPeak}; box-shadow: 0 0 8px ${PALETTE.godstuffViolet}; }
.hud-banner[data-mode="purge"] .hud-bn-pip.done { background: transparent; border-color: ${CHROME.rimHot}; box-shadow: none; opacity: 0.6; }
.hud-bn-bar {
  position: relative;
  width: 300px; height: 18px;
  border-radius: 4px;
  background: ${CHROME.plateSunk};
  border: 1px solid ${CHROME.rimDim};
  overflow: hidden;
}
#hud-banner.boss .hud-bn-bar {
  width: 520px; height: 20px; border-radius: 2px;
  border-color: ${mix(C, PALETTE.godstuffViolet, 0.6)};
  box-shadow: inset 0 0 0 1px ${CHROME.plate}, 0 0 10px ${PALETTE.godstuffViolet}44;
}
.hud-bn-bar i {
  display: block; height: 100%; width: 100%;
  background: linear-gradient(180deg, var(--barLift) 0%, var(--barBase) 62%);
  transition: width 140ms linear;
}

/* --------------------------------------- off-screen threat markers (§17) -- */
/* Real-pixel layer (NOT inside the 1080p scaler): these are world-anchored
   pointers that must sit exactly on the window edge at any resolution.
   The WRAPPER only translates; the arrow SVG carries the rotation and the
   count badge stays upright, so a merged pointer can be read as "3 threats
   that way" without tilting its numeral. */
/* No will-change here: up to MAX_MARKERS pointers would each be promoted to
   their own compositor layer, which costs more than the transform it saves. */
#hud-threat .tm {
  position: absolute;
  left: 0; top: 0;
  width: 0; height: 0;
}
#hud-threat .tm-rot {
  position: absolute;
  left: -21px; top: -21px;
  width: 42px; height: 42px;
  display: block;
  overflow: visible;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.75));
}
#hud-threat .tm .tm-plate { fill: ${CHROME.plate}; stroke: ${CHROME.rimHot}; stroke-width: 2; }
#hud-threat .tm .tm-head { fill: ${PALETTE.bone}; stroke: ${CHROME.plate}; stroke-width: 2.5; stroke-linejoin: round; }
#hud-threat .tm.telegraph .tm-head { fill: ${PALETTE.emberDanger}; }
#hud-threat .tm.telegraph .tm-ring { stroke: ${PALETTE.emberDanger}; }
#hud-threat .tm.spawn .tm-head { fill: none; stroke: ${PALETTE.godstuffViolet}; stroke-width: 3.5; }
#hud-threat .tm.spawn .tm-dot { fill: ${PALETTE.godstuffViolet}; }
#hud-threat .tm .tm-ring { fill: none; stroke: none; stroke-width: 2.5; }
#hud-threat .tm.marked .tm-ring { stroke: ${PALETTE.signalBlue}; }
/* Burrowed threat (a Grave Mole underground, PLAN §3.6 (d)): the dirt-ripple
   variant — a hollow, dashed Bone head over a dashed ring, so the pointer
   says "something is tunnelling this way" without claiming a hittable body. */
#hud-threat .tm.burrow .tm-head { fill: none; stroke: ${PALETTE.bone}; stroke-width: 3; stroke-dasharray: 4 3; }
#hud-threat .tm.burrow .tm-ring { stroke: ${PALETTE.bone}; stroke-dasharray: 3 4; }
/* HIT TICK. An off-frame enemy still takes damage, and §9's juice contract
   wants that hit to READ. The clamped damage numeral (render/numbers.js) puts
   the number on the frame edge; this ring is the pointer's own half of the
   answer — a Parchment pulse on the disc that is warning about that enemy, so
   the pointer says WHERE the threat is AND that damage is landing on it. */
#hud-threat .tm .tm-hit {
  fill: none;
  stroke: ${PALETTE.parchment};
  stroke-width: 3;
  opacity: 0;
}
/* Merge badge: when two threats share a perimeter cell their pointers merge
   into one and the badge counts them, so raising the marker budget never
   leaves a direction unmarked (criterion 6). >=20 px numeral, upright. */
#hud-threat .tm-badge {
  position: absolute;
  left: 0; top: 0;
  margin: -14px 0 0 -17px;
  min-width: 34px; height: 28px;
  padding: 0 4px;
  border-radius: 8px;
  display: none;
  align-items: center; justify-content: center;
  background: ${CHROME.plate};
  border: 2px solid ${CHROME.rimHot};
  color: ${CHROME.ink};
  font-size: 20px;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 1px 3px rgba(0,0,0,0.7);
}
#hud-threat .tm.merged .tm-badge { display: flex; }
`;
}
