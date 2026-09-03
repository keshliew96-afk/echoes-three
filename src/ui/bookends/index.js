// Run bookends — the ENVIRONMENT half of the §18 end screens.
//
// §18 binds two things about a run ending that a card page cannot say on its
// own, because both are statements about the WORLD behind the card:
//
//   Victory — "warm high-key wash — the ONLY screen where the environment
//             matches party warmth."
//   Defeat  — "soft God-stuff violet-white wash regardless of act (theatrical
//             curtain-call, not harsh) ... Vignette: static violet, fade-in
//             <= 600 ms, <= 12% screen width from edges, never touching text."
//
// The run block already ships the card itself (src/ui/run/endscreens.js: the
// summary rows, the wry "The gods applaud." line, "Return to Camp"). This
// module deliberately does NOT draw a second card — two pages fighting for the
// same phase would be a regression, not a feature. It supplies the wash, the
// violet edge vignette, and the camp-return orchestration the card sits in
// front of; the camp scene (src/scenes/camp.js) puts the WORLD behind that card
// back to the hearth on `run_end`, which is what makes "the environment matches
// party warmth" true of pixels rather than of a div.
//
// LAYERING (why z-index 11). #run-veil sits at 10 and #hud at 12, and §17 is
// explicit that "HUD never adopts environment tinting" — so the wash goes
// between them: over the world and over the run block's veil, under the command
// bar and under the card page (28). The card is opaque, so the violet vignette
// can never touch its text.
import { PALETTE } from '../../data/palette.js';

// §18: fade-in <= 600 ms. 520 ms leaves headroom for a slow frame.
const FADE_MS = 520;
// §18: the violet vignette reaches at most 12% of the screen in from an edge.
const VIGNETTE_INSET = 12;

const V = PALETTE.godstuffViolet; // #B79CF0
const VP = PALETTE.godstuffVioletPeak; // #F1ECFA

const BOOKEND_CSS = `
  #bk-wash, #bk-vignette {
    position: fixed; inset: 0; z-index: 11; pointer-events: none;
    opacity: 0; transition: opacity ${FADE_MS}ms ease;
  }
  #bk-wash.bk-on, #bk-vignette.bk-on { opacity: 1; }

  /* VICTORY — warm high-key. Bright cream core falling to Hearth Amber at the
     frame edge: no dark corner anywhere, because "high-key" is a value
     statement and a vignetted victory would contradict it. This is the one
     screen in the game whose environment is as warm as the party.
     Round D (camp critic A3): the first cut ran 0.74 / 0.66 / 0xA8 and
     flattened the camp into beige fog — FLAT 59.7% of 8x8 blocks, the hearth
     and tents illegible under it. §18 wants the WARM CAMP visible ("the
     environment matches party warmth"), so the wash is a tint the scene
     reads through, not a curtain. */
  #bk-wash.bk-victory {
    background: radial-gradient(ellipse at 50% 40%,
      rgba(255, 247, 226, 0.40) 0%,
      rgba(248, 214, 150, 0.36) 44%,
      ${PALETTE.hearthAmber}5C 100%);
  }

  /* DEFEAT — soft violet-white, theatrical rather than harsh: a curtain call,
     not a fail state. Low contrast, no crush, the peak violet sitting where a
     stage light would. */
  #bk-wash.bk-defeat {
    background: radial-gradient(ellipse at 50% 44%,
      ${VP}8C 0%,
      ${V}66 40%,
      ${V}4A 100%);
  }

  /* §18 defeat vignette: STATIC violet, <= 12% of the screen in from each
     edge. Four one-sided ramps rather than a radial, so the inset is a literal
     percentage of width/height and the centre stays completely clear. */
  #bk-vignette.bk-defeat {
    background:
      linear-gradient(to right, ${V}9E 0%, ${V}00 ${VIGNETTE_INSET}%),
      linear-gradient(to left, ${V}9E 0%, ${V}00 ${VIGNETTE_INSET}%),
      linear-gradient(to bottom, ${V}8A 0%, ${V}00 ${VIGNETTE_INSET}%),
      linear-gradient(to top, ${V}8A 0%, ${V}00 ${VIGNETTE_INSET}%);
  }
`;

export function createBookends({ bus, world }) {
  const style = document.createElement('style');
  style.id = 'bookend-style';
  style.textContent = BOOKEND_CSS;
  document.head.appendChild(style);

  const wash = document.createElement('div');
  wash.id = 'bk-wash';
  const vignette = document.createElement('div');
  vignette.id = 'bk-vignette';
  document.body.appendChild(wash);
  document.body.appendChild(vignette);

  let tone = 'none'; // none | victory | defeat
  let shownAt = 0;
  let lastEnd = null;

  function setTone(next) {
    if (next === tone) return;
    tone = next;
    wash.classList.toggle('bk-victory', next === 'victory');
    wash.classList.toggle('bk-defeat', next === 'defeat');
    vignette.classList.toggle('bk-defeat', next === 'defeat');
    wash.classList.toggle('bk-on', next !== 'none');
    // Only Defeat carries an edge vignette (§18 names it for Defeat alone —
    // Victory is high-key by definition and must not be darkened at the rim).
    vignette.classList.toggle('bk-on', next === 'defeat');
    if (next !== 'none') shownAt = performance.now();
  }

  bus.on('run_end', (ev) => {
    lastEnd = { result: ev.result, rooms: ev.rooms, glint: ev.glint, at: Math.round(performance.now()) };
  });

  function update() {
    const run = world.runSystem();
    if (!run) return;
    const phase = run.view().phase;
    setTone(phase === 'victory' ? 'victory' : phase === 'defeat' ? 'defeat' : 'none');
  }

  return {
    update,
    tone: () => tone,
    debug: () => ({
      tone,
      fadeMs: FADE_MS,
      vignetteInsetPct: VIGNETTE_INSET,
      shownForMs: tone === 'none' ? 0 : Math.round(performance.now() - shownAt),
      washOn: wash.classList.contains('bk-on'),
      vignetteOn: vignette.classList.contains('bk-on'),
      lastEnd,
    }),
  };
}
