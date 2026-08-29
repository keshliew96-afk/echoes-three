// Shared chrome for the run's meta screens (BUILD_BRIEF §16 "All meta screens:
// flat storybook card pages, non-diegetic, Zone 1 HUD persists beneath;
// enter/exit <=300 ms fades" + the §17 HUD grammar: charcoal plates, warm-grey
// chrome, parchment ink, tabular numerals, text >=16 px / numerals >=20 px,
// never a browser default).
//
// Everything is AUTHORED at 1920x1080 virtual px and uniformly scaled to the
// window by --rn-s (ruling A7), exactly like the socket screen, so every px
// number below holds at any window size.
import { PALETTE } from '../../data/palette.js';

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// §16 path doors are authored at 160x220 design px.
export const DOOR = Object.freeze({ w: 160, h: 220 });

export const RUN_CSS = `
  #run-screen {
    position: fixed; inset: 0; z-index: 28; display: none;
    align-items: center; justify-content: center;
    /* §16: Zone 1 persists BENEATH — the card page lifts off the command bar
       instead of sitting on top of it. The same reserve feeds the scaler in
       ui/run/index.js, so a tall page shrinks instead of running off the top. */
    padding-bottom: var(--rn-reserve, 120px);
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: ${PALETTE.parchment};
    user-select: none;
    opacity: 0;
    transition: opacity 220ms ease; /* §16: enter/exit <= 300 ms fades */
  }
  #run-screen.rn-open { display: flex; opacity: 1; }
  #run-screen * { box-sizing: border-box; }
  /* The veil is its OWN layer at z-index 10 — under #hud (12) — so §16's
     "Zone 1 HUD persists beneath" holds literally: the command bar stays crisp
     while the world behind the card page is pushed back. */
  #run-veil {
    position: fixed; inset: 0; z-index: 10; pointer-events: none;
    display: none; opacity: 0; transition: opacity 220ms ease;
    background: radial-gradient(ellipse at center,
      ${PALETTE.voidCharcoal}A6 0%, ${PALETTE.voidCharcoal}E6 100%);
  }
  #run-veil.rn-open { display: block; opacity: 1; }
  .rn-page {
    position: relative;
    transform: scale(var(--rn-s, 1)); transform-origin: center center;
    display: flex; flex-direction: column; align-items: center;
    padding: 22px 34px 26px;
    background: linear-gradient(172deg, #2c2823 0%, ${PALETTE.voidCharcoal} 62%);
    border: 2px solid ${PALETTE.warmGrey}88;
    border-radius: 18px;
    box-shadow: 0 0 0 5px ${PALETTE.voidCharcoal}CC, 0 0 0 6px ${PALETTE.warmGrey}44,
                0 22px 70px #000000AA, inset 0 0 0 1px ${PALETTE.bone}22;
  }
  /* Storybook rule above and below the title — the page's only ornament. */
  .rn-title {
    font-size: 30px; font-weight: 800; letter-spacing: 0.16em;
    color: ${PALETTE.parchment}; text-align: center;
  }
  .rn-orn { color: ${PALETTE.warmGrey}; font-size: 16px; letter-spacing: 0.42em; margin: 2px 0 12px; }
  .rn-sub { font-size: 17px; color: ${PALETTE.warmGrey}; letter-spacing: 0.05em; text-align: center; }
  .rn-hint { font-size: 17px; color: ${PALETTE.warmGrey}; margin-top: 14px; text-align: center; }
  .rn-hint b { color: ${PALETTE.bone}; font-weight: 700; }

  /* ---------------------------------------------------------- screen strip */
  .rn-strip {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 14px; margin-bottom: 12px;
    border: 1px solid ${PALETTE.warmGrey}55; border-radius: 999px;
    background: ${PALETTE.voidCharcoal}CC;
    font-size: 17px; color: ${PALETTE.bone};
  }
  .rn-strip .rn-num {
    font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums;
    color: ${PALETTE.parchment};
  }
  .rn-strip .rn-lab { letter-spacing: 0.12em; color: ${PALETTE.warmGrey}; }

  /* Glint counter: Pale Gold + a >=24 px coin icon (§14). */
  .rn-glint { display: flex; align-items: center; gap: 8px; }
  .rn-coin {
    width: 26px; height: 26px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #F0DCA8 0%, ${PALETTE.paleGold} 55%, #8A6E36 100%);
    border: 2px solid ${PALETTE.voidCharcoal};
    box-shadow: 0 0 10px ${PALETTE.paleGold}66;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: #6B531F; font-weight: 900;
  }
  .rn-glint .rn-amt {
    font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums;
    color: ${PALETTE.paleGold};
  }

  /* ------------------------------------------------------------ path doors */
  .rn-doors { display: flex; gap: 46px; margin: 6px 0 4px; }
  .rn-door {
    position: relative; width: ${DOOR.w}px; height: ${DOOR.h}px;
    border-radius: 78px 78px 12px 12px; /* arch */
    background: linear-gradient(180deg, #322C26 0%, #221F1B 78%);
    border: 3px solid ${PALETTE.warmGrey}77;
    box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  }
  .rn-door .rn-gwin { font-size: 62px; line-height: 1; color: ${PALETTE.bone}; }
  .rn-door .rn-grew { font-size: 46px; line-height: 1; color: ${PALETTE.warmGrey}; }
  .rn-door .rn-split {
    width: 74px; height: 2px; border-radius: 1px;
    background: linear-gradient(90deg, transparent, ${PALETTE.warmGrey}AA, transparent);
  }
  .rn-door.rn-focus {
    border-color: ${PALETTE.hearthAmber};
    transform: translateY(-6px);
    box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066,
                0 0 26px ${PALETTE.hearthAmber}55;
  }
  .rn-door.rn-focus .rn-gwin { color: ${PALETTE.parchment}; }
  .rn-door.rn-focus .rn-grew { color: ${PALETTE.hearthAmber}; }
  /* Focus caret sits OUTSIDE the panel: the door itself carries two glyphs
     and nothing else (§16). */
  .rn-doorwrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .rn-caret { font-size: 20px; color: ${PALETTE.hearthAmber}; opacity: 0; }
  .rn-doorwrap.rn-on .rn-caret { opacity: 1; }
  .rn-legend {
    display: flex; gap: 22px; margin-top: 16px; flex-wrap: wrap; justify-content: center;
    font-size: 16px; color: ${PALETTE.warmGrey};
  }
  .rn-legend span b { color: ${PALETTE.bone}; font-weight: 700; font-size: 18px; }

  /* ------------------------------------------------------------ draft card */
  .rn-card {
    width: 340px; padding: 16px 18px 18px;
    background: linear-gradient(178deg, #302B25 0%, ${PALETTE.voidCharcoal} 70%);
    border: 3px solid var(--rar, ${PALETTE.bone}); border-radius: 14px;
    box-shadow: 0 0 0 2px ${PALETTE.voidCharcoal}, 0 12px 30px #000000AA;
    position: relative; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
  }
  .rn-card.rn-legendary::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 30%, ${PALETTE.hearthAmber}30 46%,
      ${PALETTE.godstuffVioletPeak}22 50%, transparent 66%);
    background-size: 260% 100%;
    animation: rn-shimmer 3.2s linear infinite; /* shimmer, never a pulse */
  }
  @keyframes rn-shimmer { from { background-position: 130% 0; } to { background-position: -130% 0; } }
  .rn-cardkind {
    font-size: 16px; letter-spacing: 0.28em; color: ${PALETTE.warmGrey};
  }
  .rn-cardicon {
    width: 76px; height: 76px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    font-size: 42px; color: var(--rar, ${PALETTE.bone});
    background: #2e2a25; border: 2px solid ${PALETTE.warmGrey}55;
  }
  .rn-cardname { font-size: 25px; font-weight: 800; text-align: center; }
  .rn-cardsub { font-size: 17px; color: ${PALETTE.warmGrey}; letter-spacing: 0.05em; }
  .rn-stats {
    display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
    font-size: 20px; color: ${PALETTE.bone}; font-variant-numeric: tabular-nums;
  }
  .rn-stats i { font-style: normal; color: ${PALETTE.warmGrey}; font-size: 16px; letter-spacing: 0.1em; }
  .rn-body { font-size: 17px; color: ${PALETTE.bone}; text-align: center; line-height: 1.35; }
  .rn-verdict { font-size: 17px; color: ${PALETTE.hearthAmber}; text-align: center; }
  .rn-verdict.rn-cold { color: ${PALETTE.warmGrey}; }
  .rn-note {
    margin-top: 10px; padding: 8px 14px; border-radius: 10px;
    border: 1px solid ${PALETTE.warmGrey}66; background: ${PALETTE.voidCharcoal};
    font-size: 18px; color: ${PALETTE.bone}; text-align: center;
  }

  /* --------------------------------------------------------------- buttons */
  .rn-buttons { display: flex; gap: 16px; margin-top: 16px; }
  .rn-btn {
    min-width: 148px; padding: 10px 20px;
    font-size: 19px; font-weight: 700; letter-spacing: 0.06em;
    color: ${PALETTE.parchment};
    background: ${PALETTE.voidCharcoal};
    border: 2px solid ${PALETTE.warmGrey}88; border-radius: 10px;
    cursor: pointer; text-align: center;
    transition: border-color 120ms ease, color 120ms ease, transform 120ms ease;
  }
  .rn-btn:hover { border-color: ${PALETTE.bone}; }
  .rn-btn.rn-focus {
    border-color: ${PALETTE.hearthAmber}; color: ${PALETTE.hearthAmber};
    transform: translateY(-2px);
    box-shadow: 0 0 18px ${PALETTE.hearthAmber}44;
  }
  .rn-btn.rn-primary { border-color: ${PALETTE.hearthAmber}AA; }

  /* ------------------------------------------------------------ shop shelf */
  .rn-shelf { display: flex; gap: 26px; margin: 4px 0 2px; align-items: flex-start; }
  .rn-item { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 220px; }
  .rn-item .rn-card { width: 220px; cursor: pointer; }
  .rn-item.rn-sold .rn-card { opacity: 0.28; pointer-events: none; }
  .rn-plaque {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 16px; border-radius: 10px;
    background: linear-gradient(180deg, #3A342C 0%, ${PALETTE.voidCharcoal} 100%);
    border: 2px solid ${PALETTE.paleGold}88;
    box-shadow: inset 0 0 0 1px ${PALETTE.voidCharcoal};
  }
  .rn-plaque .rn-price {
    font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums;
    color: ${PALETTE.paleGold};
  }
  .rn-plaque .rn-cur { font-size: 16px; color: ${PALETTE.warmGrey}; letter-spacing: 0.14em; }
  /* §16 insufficient funds: plaque EMPHASIS + one ~300 ms shake. The item is
     never hidden, never greyed, never disabled for price. The lateral offset is
     written per frame from ui/run/shop.js (see the note there: a CSS transform
     keyframe is composited, and a composited animation never reaches the
     capture harness's pixels). This rule owns the STATIC half of the emphasis. */
  .rn-plaque.rn-deny {
    border-color: ${PALETTE.hearthAmber};
    box-shadow: 0 0 18px ${PALETTE.hearthAmber}66;
  }
  .rn-owned { font-size: 17px; color: ${PALETTE.bone}; }
  .rn-stamp {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 30px; font-weight: 900; letter-spacing: 0.2em;
    color: ${PALETTE.hearthAmber}; background: ${PALETTE.voidCharcoal}CC;
    opacity: 0; pointer-events: none;
  }
  .rn-item.rn-sold .rn-stamp { opacity: 1; }

  /* ------------------------------------------------------------ end screens */
  #run-veil.rn-victory {
    /* §18: warm high-key wash — the one screen where the world matches the
       party's warmth. */
    background: radial-gradient(ellipse at 50% 40%,
      ${PALETTE.hearthAmber}7A 0%, ${PALETTE.paleGold}4E 42%, ${PALETTE.voidCharcoal}E8 100%);
  }
  #run-veil.rn-defeat {
    /* §18: soft God-stuff violet-white wash, theatrical rather than harsh. */
    background: radial-gradient(ellipse at 50% 45%,
      ${PALETTE.godstuffViolet}4A 0%, ${PALETTE.godstuffViolet}28 45%, ${PALETTE.voidCharcoal}EE 100%);
  }
  #run-screen.rn-victory .rn-page {
    border-color: ${PALETTE.hearthAmber}AA;
    background: linear-gradient(172deg, #4A3A22 0%, #2A231A 68%);
    box-shadow: 0 0 0 5px ${PALETTE.voidCharcoal}CC, 0 0 0 6px ${PALETTE.hearthAmber}55,
                0 22px 80px #000000AA, 0 0 90px ${PALETTE.hearthAmber}33;
  }
  #run-screen.rn-victory .rn-title { color: ${PALETTE.hearthAmber}; }
  #run-screen.rn-defeat .rn-title { color: ${PALETTE.godstuffVioletPeak}; }
  .rn-summary {
    display: grid; grid-template-columns: auto auto; gap: 6px 26px;
    margin: 6px 0 4px; font-size: 19px;
  }
  .rn-summary .rn-k { color: ${PALETTE.warmGrey}; letter-spacing: 0.08em; }
  .rn-summary .rn-v { color: ${PALETTE.parchment}; font-variant-numeric: tabular-nums; text-align: right; }

  /* ------------------------------------------------- transition fade (§13) */
  #run-fade {
    position: fixed; inset: 0; z-index: 27; pointer-events: none;
    background: ${PALETTE.voidCharcoal};
    opacity: 0; transition: opacity 150ms linear;
  }
  #run-fade.rn-on { opacity: 1; }

`;

// Uniform 1920x1080 virtual-canvas scale (§17 / ruling A7) — kept as the
// shared reference for anything that wants the HUD's exact scale factor.
export function virtualScale() {
  return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}
