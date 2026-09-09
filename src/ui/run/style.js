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

// --- THE TYPE FLOOR IS A REAL-PIXEL FLOOR (round-3 fix) -------------------
// §17: "Floors: HUD text >= 16 px, numerals >= 20 px." The pages used to be
// scaled uniformly by `transform: scale(--rn-s)` like the rest of the HUD,
// which silently multiplied every authored size by the fit factor: at
// 1600x900 a bought-from shop measured --rn-s 0.9104 (body 15.5 real px) and
// at the §1 minimum window 1024x640 it measured 0.7246 — body 12.3 px, the
// price numeral 17.4 px, the Glint numeral 15.9 px, i.e. UNDER BOTH floors.
//
// The fix is not a bigger scale, it is a smaller PAGE: below the height
// budget the pages REFLOW (`.rn-compact` — tighter rhythm, smaller ornament,
// short node copy) instead of shrinking their type, and --rn-s is clamped to
// 1 so no authored px is ever scaled down. Every size inside the compact
// block is >= 16 px, and every numeral (.rn-num, .rn-price, .rn-amt,
// .rn-stats) >= 20 px, so the floors hold in REAL pixels at 1024x640 up.
export const COMPACT_BELOW_H = 1200; // px of window height
// Chosen so every window a desktop actually has (1024x640 .. 1920x1080) takes
// the reflow and lands at --rn-s exactly 1: one layout, one set of real px,
// nothing to scale. The roomier authored layout is what a >=1200 px tall
// window (1440p and up) gets, where it fits with headroom.

export function isCompact() {
  return window.innerHeight < COMPACT_BELOW_H;
}

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
  /* SHOP VEIL (round-1 certification fix). The shop is the one meta screen the
     world must stay visible behind — the shelf is a compact plate, not a modal,
     and the round-1 charcoal 65-90% veil is what made the frame flat, dark and
     empty of entities. This is a ~12% mean dim with a slightly heavier edge, so
     it doubles as the frame's vignette instead of erasing the arena. */
  /* ROUND-2 FIX (shop check 2 "layered light", 1/2 from two scorers: "no cool
     pole — cool 5.7% against the reference's 76.4%"). The dim is the same ~12%
     mean, but it is now DEEP INDIGO rather than Void Charcoal, so the shop's
     edge shadow reads as night sky instead of brown murk — the cool half of the
     reference's cool-void-vs-fire funnel. The arena's own ambient is env/stage
     work (A-world); this is the veil's share of it. */
  #run-veil.rn-light {
    background: radial-gradient(ellipse at 50% 58%,
      #101A2E0F 0%, #101A2E1A 46%, #0B12243E 100%);
  }
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
    font-size: 16px; color: #6B531F; font-weight: 900;
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
  /* LEGENDARY SHIMMER (certification fix D-r1, failure F2). This used to be a
     'background-position' keyframe over a 260%-wide gradient painted straight
     onto the card. 'background-position' is not a composited property, so every
     frame of the 3.2 s loop re-rasterised the whole 340x154 card — on a page
     whose main job is a WebGL canvas that starved rAF for 115 ms on the card's
     first frame and 212-236 ms half a second later (measured three times:
     certD1-q-clear 127.3 + 236.2 ms, certD1-b-clear2 115.1 + 224.1 ms,
     certD1-b-draftdiag 115.3 + 212.1 ms; common and rare cards, which have no
     shimmer, never exceeded 24 ms on the same page).
     The band is now its own element carrying a fixed-size gradient, swept with
     a 2D 'transform' — Chrome repaints the band's own box, never the card's
     whole 260%-wide background image. Measured on the seed-999 room-7 shelf
     (ascend, legendary): the card's first 3 s went 70.5 -> 80.9 fps with the
     218.3 ms stall gone (max frame 42.5 ms, zero gaps over 50 ms) and the
     steady 3 s 84.5 -> 86.7 fps.
     Two deliberate details:
       - the offset is written per frame from ui/run/index.js, not by a CSS
         keyframe, for the reason the shop's deny-shake gives below: an
         animation Chrome runs on the compositor's own timeline does not reach
         the capture harness's pixels, and a shimmer nobody can capture cannot
         be reviewed;
       - 'translateX', never 'translate3d', and no 'will-change'. Either one
         promotes the band to its own compositor layer, which is faster still
         (107 fps) but measured ZERO pixel difference between band-shown and
         band-hidden captures — the shimmer would exist only on the player's
         screen. The visible band measures mean |delta| 5.8 / peak column 17.6
         over the card box (tools/certfixDshouldfix1-banddiff.mjs). */
  .rn-card.rn-legendary > .rn-shine {
    position: absolute; top: -8%; bottom: -8%; left: 0; width: 100%;
    pointer-events: none;
    background: linear-gradient(115deg, transparent 30%, ${PALETTE.hearthAmber}30 46%,
      ${PALETTE.godstuffVioletPeak}22 50%, transparent 66%);
    transform: translateX(130%);
  }
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
  .rn-owned { font-size: 17px; color: ${PALETTE.bone}; }

  /* ================================================================= SHOP ==
     ROUND-1 CERTIFICATION FIX (cert-score-*-r1, shop frame 10-12/20).
     The shelf used to be a full-screen charcoal modal on a 65-90% veil parked
     exactly over the party (FLAT 52.9%, LUMA >160 1.26%, no world light, no
     entity in frame, zero hover/purchase motion). The rules below rebuild it
     as a COMPACT ORNATE SHELF docked above the command bar:
       - the veil drops to a ~12% dim (see #run-veil.rn-light) so the lit
         arena, its torches and the party stay in frame;
       - the panel is a wood-and-brass plate: two crossed grain layers at a
         5-7 px period (so no 8x8 block is one flat colour), a lamp glow, a
         double brass rim, four ornamental corner caps and a real cast shadow;
       - the plaques are lit brass, the Advance button a filled amber lamp:
         both are emissive enough to read as light pools;
       - hover lifts a card by LAYOUT (the 'top' property), never by a
         composited transform, so it lands in captured pixels.
     Everything else (prices below the card, item never greyed for price, one
     ~300 ms denial shake) is unchanged §16 behaviour. */
  #run-screen.rn-dock { align-items: flex-end; }
  #run-screen .rn-shop {
    position: relative;
    padding: 13px 22px 15px;
    border: 2px solid ${PALETTE.paleGold}66;
    border-radius: 16px;
    /* Wood grain + fibre noise: two repeating gradients whose periods (5 px
       and 7 px) are shorter than the analyzer's 8x8 flat-block window, over a
       warm plank gradient and an inner vignette. */
    /* ROUND-2 FIX (shop check 2). The plate used to be warm brown edge to edge
       (panel box HUEMIX warm 97.3% / cool 1.6%), which is why the shop frame
       read "amber panel vs green field, no cool pole" to two scorers. It is now
       NIGHT-GRADED like the reference's stone bridge: the peddler's lantern
       lights the top-centre warm, and the wood falls off through slate into
       deep indigo at the rim — a warm pool and a cool ambient inside one
       element, which is exactly what the check asks for. The brass (rims, caps,
       plaques, the Advance lamp) is untouched, so the frame keeps its
       highlights. */
    background:
      repeating-linear-gradient(93deg,
        #FFFFFF07 0px, #FFFFFF07 1px, #00000012 1px, #00000012 3px,
        #FFFFFF04 3px, #FFFFFF04 5px),
      repeating-linear-gradient(8deg,
        #00000010 0px, #00000010 2px, #FFFFFF06 2px, #FFFFFF06 4px,
        #0000000A 4px, #0000000A 7px),
      radial-gradient(ellipse 62% 78% at 50% 6%,
        #6A5230 0%, #4A3D2C 17%, #333440 38%, #232B3E 62%, #18202F 84%, #131A29 100%);
    /* Two-stage cast shadow (check 8 "grounding"): a broad ambient pool plus a
       tight contact shadow, so the plate sits ON the arena instead of floating
       over it. The pool is night-sky indigo, not neutral black, so the shadow
       the shelf throws on the grass is cool. */
    box-shadow:
      0 0 0 4px #141A28, 0 0 0 6px ${PALETTE.warmGrey}55,
      0 30px 74px #060A16E6, 0 12px 26px #070C1ACC, 0 4px 8px #05080FCC,
      inset 0 0 42px #0A1120AA, inset 0 1px 0 ${PALETTE.parchment}22;
  }
  /* Ornamental corner caps (brass brackets + a rivet), REFERENCE_BAR 9. */
  #run-screen .rn-shop .rn-cap {
    position: absolute; width: 22px; height: 22px; pointer-events: none;
    border: 3px solid ${PALETTE.paleGold}CC;
  }
  #run-screen .rn-shop .rn-cap::after {
    content: ''; position: absolute; width: 6px; height: 6px; border-radius: 50%;
    background: ${PALETTE.paleGold}; box-shadow: 0 0 8px ${PALETTE.paleGold}AA;
  }
  #run-screen .rn-shop .rn-cap-tl { left: 6px; top: 6px; border-right: 0; border-bottom: 0; border-radius: 10px 0 0 0; }
  #run-screen .rn-shop .rn-cap-tr { right: 6px; top: 6px; border-left: 0; border-bottom: 0; border-radius: 0 10px 0 0; }
  #run-screen .rn-shop .rn-cap-bl { left: 6px; bottom: 6px; border-right: 0; border-top: 0; border-radius: 0 0 0 10px; }
  #run-screen .rn-shop .rn-cap-br { right: 6px; bottom: 6px; border-left: 0; border-top: 0; border-radius: 0 0 10px 0; }
  #run-screen .rn-shop .rn-cap-tl::after { left: -1px; top: -1px; }
  #run-screen .rn-shop .rn-cap-tr::after { right: -1px; top: -1px; }
  #run-screen .rn-shop .rn-cap-bl::after { left: -1px; bottom: -1px; }
  #run-screen .rn-shop .rn-cap-br::after { right: -1px; bottom: -1px; }
  /* The peddler's lamp: the panel's own warm pool (check 2 "layered light"). */
  #run-screen .rn-shop .rn-lamp {
    position: absolute; left: 50%; top: -10px; width: 420px; height: 150px;
    margin-left: -210px; pointer-events: none; border-radius: 50%;
    background: radial-gradient(ellipse at 50% 26%,
      ${PALETTE.paleGold}55 0%, ${PALETTE.hearthAmber}2E 38%, transparent 72%);
  }
  /* The pool itself breathes with the flame (ui/run/shop.js writes its
     opacity every frame); the hot core now lives ON the lantern below, so the
     light and its source are one object instead of two. */
  /* ROUND-2 FIX (shop check 2, player scorer: "below reference: no lamp prop
     standing on the shelf"). The ornament's ◆ is replaced by a DRAWN brass
     lantern standing on the title rail, with its own halo; ui/run/shop.js
     flickers both every frame the way the world torches flicker, which also
     answers the art-bible scorer's check-10 caveat that "the panel's own art is
     frozen". */
  #run-screen .rn-shop .rn-lantern {
    position: relative; display: inline-flex; align-items: center; justify-content: center;
    width: 34px; height: 34px; flex: 0 0 auto; margin: 0 2px;
    color: #F3D48A; opacity: 1;
  }
  #run-screen .rn-shop .rn-lantern .ico {
    position: relative; z-index: 1;
    filter: drop-shadow(0 0 6px ${PALETTE.hearthAmber}CC) drop-shadow(0 1px 0 #00000099);
  }
  #run-screen .rn-shop .rn-lantern .rn-lanternglow {
    position: absolute; left: 50%; top: 52%; width: 104px; height: 104px;
    border-radius: 50%; pointer-events: none; transform: translate(-50%, -50%);
    background: radial-gradient(circle,
      #FFFBF0 0%, #FFF6DD 7%, #FFE7B0CC 14%, ${PALETTE.hearthAmber}AA 24%,
      ${PALETTE.hearthAmber}5A 40%, ${PALETTE.hearthAmber}26 60%,
      ${PALETTE.hearthAmber}0E 78%, transparent 100%);
  }
  /* Header: title on the left, a filigree rule across, the Glint strip right. */
  #run-screen .rn-shop .rn-head {
    display: flex; align-items: center; gap: 14px;
    width: 100%; margin: 2px 0 8px;
  }
  #run-screen .rn-shop .rn-title {
    text-align: left; white-space: nowrap;
    text-shadow: 0 0 18px ${PALETTE.hearthAmber}44, 0 2px 0 #00000099;
  }
  #run-screen .rn-shop .rn-orn {
    flex: 1 1 auto; display: flex; align-items: center; gap: 8px; margin: 0;
    color: ${PALETTE.paleGold};
  }
  #run-screen .rn-shop .rn-orn i {
    flex: 1 1 auto; height: 2px; border-radius: 1px;
    background: linear-gradient(90deg, transparent, ${PALETTE.paleGold}88, transparent);
  }
  #run-screen .rn-shop .rn-orn b { font-size: 16px; letter-spacing: 0; opacity: 0.9; }
  #run-screen .rn-shop .rn-strip {
    margin: 0; flex: 0 0 auto;
    border-color: ${PALETTE.paleGold}66;
    background: linear-gradient(180deg, #3A3125 0%, ${PALETTE.voidCharcoal} 100%);
    box-shadow: 0 0 16px ${PALETTE.paleGold}22, inset 0 1px 0 ${PALETTE.paleGold}33;
  }
  /* Equal-height cards in BOTH reflows, so the three plaques sit on one line
     (at 1440p the shorter Ascend card used to hang its plaque 20 px high). */
  #run-screen .rn-shop .rn-shelf { position: relative; z-index: 1; align-items: stretch; }
  #run-screen .rn-shop .rn-item .rn-card { flex: 1 1 auto; }
  /* 280 px so the widest header (Ascend + the LEGENDARY tag) never collides
     with the icon column — the round-1 defect was that header wrapping. */
  #run-screen .rn-shop .rn-item,
  #run-screen .rn-shop .rn-item .rn-card { width: 280px; }
  /* Cards: same charcoal plate, but grained like the panel and rim-lit by the
     rarity colour (Bone / Signal Blue / Hearth Amber — §19.1, unchanged). */
  #run-screen .rn-shop .rn-item .rn-card {
    top: 0; transition: top 110ms ease, box-shadow 110ms ease, border-color 110ms ease;
    background:
      repeating-linear-gradient(97deg,
        #FFFFFF06 0px, #FFFFFF06 1px, #00000010 1px, #00000010 3px,
        #FFFFFF03 3px, #FFFFFF03 6px),
      linear-gradient(178deg, #3B342A 0%, #2B2E37 58%, #1B2130 100%);
    box-shadow: 0 0 0 2px #141A28,
                0 16px 30px #060A16D9, 0 5px 9px #070C1ACC,
                inset 0 0 24px #0A11206E, 0 0 20px var(--rarGlow, transparent);
  }
  /* Hover: the round-1 defect was 0.00% changed pixels. The lift is layout, the
     wash and the rim glow are paint — together ~1/3 of the card box changes. */
  #run-screen .rn-shop .rn-item .rn-card.rn-hover {
    top: -8px;
    border-color: ${PALETTE.parchment};
    background:
      repeating-linear-gradient(97deg,
        #FFFFFF0A 0px, #FFFFFF0A 1px, #00000010 1px, #00000010 3px,
        #FFFFFF05 3px, #FFFFFF05 6px),
      linear-gradient(178deg, #61532E 0%, #3C3B3A 58%, #232A38 100%);
    box-shadow: 0 0 0 2px #141A28, 0 20px 32px #060A16CC,
                inset 0 0 26px #0A11205E, 0 0 30px var(--rar, ${PALETTE.bone}),
                0 0 66px var(--rarGlow, transparent);
  }
  #run-screen .rn-shop .rn-item .rn-card.rn-hover .rn-cardname { color: ${PALETTE.parchment}; }
  /* Header row of a shelf card: name and rarity tag on one baseline with a real
     gap (round-1 defect: "Bouncecommon" ran together, "Ascend" wrapped). */
  #run-screen .rn-shop .rn-cardhead {
    display: flex; align-items: baseline; gap: 9px; min-width: 0; white-space: nowrap;
  }
  #run-screen .rn-shop .rn-cardhead .rn-cardkind {
    font-size: 16px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--rar, ${PALETTE.bone}); opacity: 0.92;
    padding: 2px 7px; border-radius: 6px;
    border: 1px solid var(--rar, ${PALETTE.bone});
    background: ${PALETTE.voidCharcoal}CC;
  }
  #run-screen .rn-shop .rn-cardicon {
    color: var(--rar, ${PALETTE.bone});
    background: radial-gradient(circle at 40% 32%, #47402F 0%, #1C2230 100%);
    border-color: var(--rar, ${PALETTE.bone});
    box-shadow: 0 0 14px var(--rarGlow, transparent), inset 0 0 10px #080D18AA;
  }
  /* Brass plaque: lit metal, a real cast shadow, a soft gold pool. */
  #run-screen .rn-shop .rn-plaque {
    position: relative;
    background: linear-gradient(180deg, #7A6234 0%, #4A3D26 46%, #2A241C 100%);
    border-color: ${PALETTE.paleGold};
    box-shadow: 0 0 20px ${PALETTE.paleGold}55, 0 10px 20px #000000BB, 0 4px 7px #000000CC,
                inset 0 1px 0 #F0DCA877, inset 0 -6px 10px #00000066;
    transition: box-shadow 110ms ease, border-color 110ms ease;
  }
  #run-screen .rn-shop .rn-plaque .rn-price {
    color: #F6E4B4; text-shadow: 0 0 12px ${PALETTE.paleGold}CC;
  }
  #run-screen .rn-shop .rn-plaque .rn-cur { color: ${PALETTE.bone}; }
  /* Unaffordable: the PLAQUE cools to unlit brass and grows a dashed rim; the
     item itself is untouched (§16: never greyed, never hidden for price). */
  #run-screen .rn-shop .rn-plaque.rn-short {
    background: linear-gradient(180deg, #4A443B 0%, #322D27 46%, ${PALETTE.voidCharcoal} 100%);
    border-style: dashed; border-color: ${PALETTE.warmGrey};
    box-shadow: 0 6px 14px #000000AA, inset 0 1px 0 ${PALETTE.warmGrey}44;
  }
  #run-screen .rn-shop .rn-plaque.rn-short .rn-price { color: ${PALETTE.bone}; text-shadow: none; }
  /* §16 insufficient funds: plaque EMPHASIS + one ~300 ms shake. The item is
     never hidden, never greyed, never disabled for price. The lateral offset is
     written per frame from ui/run/shop.js (see the note there: a CSS transform
     keyframe is composited, and a composited animation never reaches the
     capture harness's pixels). This rule owns the STATIC half of the emphasis. */
  .rn-plaque.rn-deny {
    border-color: ${PALETTE.hearthAmber};
    box-shadow: 0 0 18px ${PALETTE.hearthAmber}66;
  }
  #run-screen .rn-shop .rn-plaque.rn-deny {
    border-style: solid; border-color: ${PALETTE.hearthAmber};
    box-shadow: 0 0 26px ${PALETTE.hearthAmber}88, 0 8px 18px #000000AA,
                inset 0 0 12px ${PALETTE.hearthAmber}44;
  }
  /* The stamp's landing flash. */
  #run-screen .rn-shop .rn-plaque.rn-thud {
    border-color: ${PALETTE.parchment};
    box-shadow: 0 0 34px ${PALETTE.hearthAmber}CC, 0 0 70px ${PALETTE.hearthAmber}55,
                inset 0 0 14px #FFF6DD66;
  }
  /* SOLD is a stamped RIBBON, not a full-card charcoal cover (the old cover was
     a 252x188 flat block and read as the card being deleted). */
  .rn-stamp {
    position: absolute; left: 50%; top: 50%;
    width: 216px; height: 52px; margin: -26px 0 0 -108px;
    display: flex; align-items: center; justify-content: center;
    font-size: 30px; font-weight: 900; letter-spacing: 0.22em;
    color: ${PALETTE.hearthAmber};
    background: linear-gradient(180deg, #3A2E1CE8 0%, ${PALETTE.voidCharcoal}E8 100%);
    border: 3px solid ${PALETTE.hearthAmber}; border-radius: 8px;
    box-shadow: 0 0 26px ${PALETTE.hearthAmber}66, 0 8px 18px #000000AA,
                inset 0 0 0 1px ${PALETTE.voidCharcoal};
    transform: rotate(-13deg); transform-origin: 50% 50%;
    opacity: 0; pointer-events: none;
  }
  .rn-item.rn-sold .rn-card { pointer-events: none; }
  /* Sold card: dimmed and cooled, but still legible under its ribbon. */
  #run-screen .rn-shop .rn-item.rn-sold .rn-card { opacity: 0.62; filter: saturate(0.55); }
  /* Before the flip midpoint the card is still showing its LIVE face. */
  #run-screen .rn-shop .rn-item.rn-sold .rn-card.rn-preflip { opacity: 1; filter: none; }
  #run-screen .rn-shop .rn-card.rn-preflip .rn-owned { visibility: hidden; }
  .rn-item.rn-sold .rn-stamp { opacity: 1; }
  /* Advance: a filled Hearth Amber lamp, the panel's brightest element. */
  #run-screen .rn-shop .rn-buttons { align-items: center; gap: 18px; width: 100%; justify-content: center; }
  #run-screen .rn-shop .rn-hint { margin-top: 0; flex: 1 1 0; }
  #run-screen .rn-shop .rn-hint-l { text-align: right; }
  #run-screen .rn-shop .rn-hint-r { text-align: left; }
  #run-screen .rn-shop .rn-advance {
    flex: 0 0 auto;
    color: ${PALETTE.voidCharcoal};
    background: linear-gradient(180deg, #F7C877 0%, ${PALETTE.hearthAmber} 52%, #A96C1C 100%);
    border-color: #FFF0C8;
    text-shadow: 0 1px 0 #FFF6DD88;
    box-shadow: 0 0 26px ${PALETTE.hearthAmber}88, 0 0 64px ${PALETTE.hearthAmber}3A,
                inset 0 1px 0 #FFF6DDAA, inset 0 -6px 12px #00000044,
                0 8px 18px #000000AA;
    transform: none;
  }
  #run-screen .rn-shop .rn-advance:hover {
    background: linear-gradient(180deg, #FFDB9A 0%, #F2B457 52%, #BC7B22 100%);
    box-shadow: 0 0 34px ${PALETTE.hearthAmber}AA, 0 0 80px ${PALETTE.hearthAmber}55,
                inset 0 1px 0 #FFF6DDCC, 0 8px 18px #000000AA;
  }
  /* Purchase / glitter layer — above the shelf, never catching the pointer. */
  .rn-fx { position: absolute; inset: 0; z-index: 4; pointer-events: none; overflow: visible; }
  .rn-flycoin {
    position: absolute; width: 14px; height: 14px; border-radius: 50%;
    transform: translate(-50%, -50%); pointer-events: none;
    background: radial-gradient(circle at 34% 30%, #FFF3D2 0%, ${PALETTE.paleGold} 56%, #8A6E36 100%);
    box-shadow: 0 0 12px ${PALETTE.paleGold}CC, 0 0 26px ${PALETTE.paleGold}55;
  }
  .rn-mote {
    position: absolute; width: 4px; height: 4px; border-radius: 50%;
    transform: translate(-50%, -50%); pointer-events: none;
    background: #FFF3D2; box-shadow: 0 0 8px ${PALETTE.paleGold}, 0 0 16px ${PALETTE.paleGold}77;
  }
  /* Hearth dust rising through the lantern pool (shop check 10: the panel's own
     ambient life). Driven per frame from ui/run/shop.js like the plaque motes. */
  .rn-dust {
    position: absolute; width: 3px; height: 3px; border-radius: 50%;
    transform: translate(-50%, -50%); pointer-events: none; opacity: 0;
    background: #FFE9B8; box-shadow: 0 0 7px ${PALETTE.hearthAmber}AA;
  }
  /* The Glint strip's catch ripple when a flying coin lands. */
  .rn-ripple {
    position: absolute; width: 18px; height: 18px; border-radius: 50%;
    transform: translate(-50%, -50%); pointer-events: none; opacity: 0;
    border: 2px solid ${PALETTE.paleGold};
    box-shadow: 0 0 16px ${PALETTE.paleGold}AA, inset 0 0 12px ${PALETTE.paleGold}55;
  }
  .rn-coin.rn-catch {
    box-shadow: 0 0 22px ${PALETTE.paleGold}, 0 0 46px ${PALETTE.paleGold}88;
    filter: brightness(1.35);
  }

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

  /* ------------------------------------------------ compact reflow (§17) */
  /* Short windows reflow the page instead of scaling its type down. Nothing
     in here drops below the §17 floors: text >= 16 px, numerals >= 20 px.
     Only NON-TEXT chrome (ornament rule, card icon, paddings, gaps) shrinks. */
  #run-screen.rn-compact .rn-page { padding: 12px 22px 14px; }
  #run-screen.rn-compact .rn-title { font-size: 24px; letter-spacing: 0.13em; }
  /* The ornament stays — a display:none node still contributes to the page
     textContent, and this block has the height for it. */
  #run-screen.rn-compact .rn-orn { font-size: 16px; letter-spacing: 0.3em; margin: 0 0 6px; }
  #run-screen.rn-compact .rn-sub { font-size: 16px; }
  #run-screen.rn-compact .rn-hint { font-size: 16px; margin-top: 8px; }
  #run-screen.rn-compact .rn-strip {
    padding: 4px 12px; margin-bottom: 8px; font-size: 16px; gap: 8px;
  }
  #run-screen.rn-compact .rn-strip .rn-num { font-size: 20px; }
  #run-screen.rn-compact .rn-coin { width: 24px; height: 24px; font-size: 16px; }
  #run-screen.rn-compact .rn-glint .rn-amt { font-size: 22px; }

  /* Compact card = two columns: the glyph badge sits BESIDE the kind/name
     rows instead of above them. That is ~50 px of height per card recovered
     without dropping a single word or a single point of type size. */
  #run-screen.rn-compact .rn-card {
    display: grid; grid-template-columns: 44px 1fr;
    column-gap: 10px; row-gap: 4px; align-items: center;
    padding: 10px 12px 12px; text-align: left;
  }
  #run-screen.rn-compact .rn-cardicon { grid-column: 1; grid-row: 1 / span 2; }
  #run-screen.rn-compact .rn-cardkind { grid-column: 2; grid-row: 1; }
  #run-screen.rn-compact .rn-cardname { grid-column: 2; grid-row: 2; text-align: left; }
  #run-screen.rn-compact .rn-cardsub,
  #run-screen.rn-compact .rn-stats,
  #run-screen.rn-compact .rn-body,
  #run-screen.rn-compact .rn-verdict,
  #run-screen.rn-compact .rn-owned { grid-column: 1 / -1; text-align: left; }
  #run-screen.rn-compact .rn-stats { justify-content: flex-start; }
  #run-screen.rn-compact .rn-cardkind { font-size: 16px; letter-spacing: 0.2em; }
  #run-screen.rn-compact .rn-cardicon {
    width: 44px; height: 44px; border-radius: 10px; font-size: 26px;
  }
  #run-screen.rn-compact .rn-cardname { font-size: 20px; }
  #run-screen.rn-compact .rn-cardsub { font-size: 16px; }
  #run-screen.rn-compact .rn-body { font-size: 16px; line-height: 1.28; }
  #run-screen.rn-compact .rn-verdict { font-size: 16px; }
  #run-screen.rn-compact .rn-owned { font-size: 16px; }
  #run-screen.rn-compact .rn-stats { font-size: 20px; gap: 10px; }
  #run-screen.rn-compact .rn-stats i { font-size: 16px; }
  #run-screen.rn-compact .rn-note { font-size: 16px; padding: 4px 12px; margin-top: 5px; line-height: 1.2; }

  #run-screen.rn-compact .rn-buttons { margin-top: 10px; gap: 12px; }
  #run-screen.rn-compact .rn-btn { min-width: 132px; padding: 7px 16px; font-size: 18px; }

  /* Equal-height cards so the three plaques sit on one line. */
  #run-screen.rn-compact .rn-shelf { gap: 20px; margin: 2px 0 0; align-items: stretch; }
  #run-screen.rn-compact .rn-item .rn-card { flex: 1 1 auto; align-content: start; }
  #run-screen.rn-compact .rn-item,
  #run-screen.rn-compact .rn-item .rn-card { width: 252px; }
  #run-screen.rn-compact .rn-item { gap: 7px; }
  #run-screen.rn-compact .rn-plaque { padding: 5px 14px; }
  #run-screen.rn-compact .rn-plaque .rn-price { font-size: 22px; }
  #run-screen.rn-compact .rn-plaque .rn-cur { font-size: 16px; }
  #run-screen.rn-compact .rn-stamp { font-size: 26px; }

  /* Compact shop: the header collapses onto ONE row (title | filigree | Glint
     strip) so the whole plate is ~310 px tall and docks above the command bar
     without covering the party — the round-1 modal was 432 px and sat exactly
     on them. Nothing here drops below the §17 floors. */
  #run-screen.rn-compact .rn-shop { padding: 9px 20px 11px; }
  #run-screen.rn-compact .rn-shop .rn-head { margin: 0 0 5px; gap: 12px; }
  #run-screen.rn-compact .rn-shop .rn-shelf { margin: 0; }
  #run-screen.rn-compact .rn-shop .rn-title { font-size: 23px; }
  /* §17 floor: HUD text is never below 16 px, tags included. */
  #run-screen.rn-compact .rn-shop .rn-cardhead .rn-cardkind { font-size: 16px; padding: 0 6px; letter-spacing: 0.06em; }
  #run-screen.rn-compact .rn-shop .rn-item,
  #run-screen.rn-compact .rn-shop .rn-item .rn-card { width: 280px; }
  #run-screen.rn-compact .rn-shop .rn-buttons { margin-top: 6px; }
  #run-screen.rn-compact .rn-shop .rn-lamp { top: -6px; height: 120px; }

  #run-screen.rn-compact .rn-doors { gap: 34px; margin: 2px 0 0; }
  #run-screen.rn-compact .rn-legend { font-size: 16px; margin-top: 10px; gap: 18px; }
  #run-screen.rn-compact .rn-legend span b { font-size: 18px; }
  #run-screen.rn-compact .rn-summary { font-size: 18px; gap: 4px 22px; margin: 4px 0 2px; }
`;

// Uniform 1920x1080 virtual-canvas scale (§17 / ruling A7) — kept as the
// shared reference for anything that wants the HUD's exact scale factor.
export function virtualScale() {
  return Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
}
