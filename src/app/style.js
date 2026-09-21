// App-layer stylesheet (docs/gauntlet/PLAN.md §3.2 widget grammar, §2.3
// namespaces). Owner: M1. Every selector is under the `ap-` prefix or the
// #app-ui root; the only foreign ids touched are the game-UI roots hidden while
// the title owns the screen (body.ap-hide-game), which is a prefixed class.
//
// SCALE. Menus are fluid layouts sized in authored 1920x1080 px multiplied by
// --ap-s = clamp(min(innerWidth/1920, innerHeight/1080), 0.75, 1.5). The
// clamp is the type-floor guarantee (G1.1): the smallest authored text is 22 px,
// i.e. >= 16.5 CSS px at 1024x576 (s clamps to 0.75) and >= 18.3 CSS px at
// 1600x900 (s = 0.833); hit targets are authored >= 56 px (>= 42 CSS px at the
// smallest window). Nothing is a fixed 1920 canvas, so a small window reflows
// instead of shrinking type below the floor.
//
// PALETTE (BUILD_BRIEF §19.1, storybook HUD grammar): Void Charcoal plates,
// Parchment ink, Warm Grey chrome, Bone secondary ink, Hearth Amber focus and
// selection. No Ember, no violet, no Heal green anywhere in the menus.
import { PALETTE as P } from '../data/palette.js';

export const AP_FONT =
  "system-ui, 'Segoe UI Variable Display', 'Segoe UI', ui-rounded, 'Nunito', 'Trebuchet MS', sans-serif";

// Authored px -> CSS length that follows --ap-s.
export const px = (n) => `calc(${n}px * var(--ap-s, 1))`;

export function apScale(w = window.innerWidth, h = window.innerHeight) {
  const s = Math.min(w / 1920, h / 1080);
  return Math.min(1.5, Math.max(0.75, s));
}

const PLATE_TOP = '#2C2823';
const PLATE_LIFT = '#38322B';
const INK_DIM = P.warmGrey;

const CSS = `
:root { --ap-s: 1; }
#app-ui { font-family: ${AP_FONT}; color: ${P.parchment}; }
#app-ui * { box-sizing: border-box; }
#app-ui button { font-family: inherit; }

/* ------------------------------------------------------------- screens -- */
.ap-screen {
  position: fixed; inset: 0; display: none; pointer-events: auto;
  opacity: 0; transition: opacity 180ms ease;
  user-select: none; -webkit-user-select: none;
  font-family: ${AP_FONT}; color: ${P.parchment};
  -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums;
  font-size: ${px(24)}; line-height: 1.3;
  /* Its own compositor layer: text renders with grayscale antialiasing. LCD
     subpixel AA (Windows) paints red / blue colour fringes on glyph edges —
     measured as Ember- and violet-band pixels inside the farewell plate
     (G1.12) — and the fade needs the layer anyway. */
  will-change: opacity;
}
.ap-screen.ap-open { display: block; }
.ap-screen.ap-in { opacity: 1; }
.ap-screen.ap-out { opacity: 0; pointer-events: none; transition-duration: 150ms; }
.ap-screen.ap-nonblocking { pointer-events: none; }
.ap-layer-screen { z-index: 1000; }
.ap-layer-overlay { z-index: 1100; }
.ap-layer-dialog { z-index: 1200; }
.ap-layer-loading { z-index: 1400; }
.ap-layer-farewell { z-index: 1500; }

/* The game UI steps aside while the title / loading / farewell own the
   screen (the live camp keeps rendering behind them). */
body.ap-hide-game #hud, body.ap-hide-game #hud-threat, body.ap-hide-game #camp-prompt,
body.ap-hide-game #dmg-num-layer, body.ap-hide-game #nd-fizzle-layer { visibility: hidden; }

/* Native focus outlines off (zero specificity, so the ring rules below win). */
:where(#app-ui [data-nav]), :where(#app-ui [data-nav]:focus), :where(#app-ui [data-nav]:focus-visible) { outline: none; }
:where(#app-ui [data-nav])::-moz-focus-inner { border: 0; }

/* -------------------------------------------------------------- plates -- */
.ap-plate {
  background: linear-gradient(172deg, ${PLATE_TOP} 0%, ${P.voidCharcoal} 62%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}88;
  border-radius: ${px(18)};
  box-shadow: 0 0 0 ${px(5)} ${P.voidCharcoal}CC, 0 0 0 ${px(6)} ${P.warmGrey}44,
              0 ${px(22)} ${px(70)} #000000AA, inset 0 0 0 1px ${P.bone}22;
}
.ap-veil {
  position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, ${P.voidCharcoal}B0 0%, ${P.voidCharcoal}EE 100%);
}
.ap-orn { color: ${P.warmGrey}; letter-spacing: 0.42em; font-size: ${px(22)}; }
.ap-h2 {
  margin: 0; font-size: ${px(34)}; font-weight: 800; letter-spacing: 0.16em;
  text-transform: uppercase; color: ${P.parchment};
}
.ap-kbd {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: ${px(34)}; height: ${px(32)}; padding: 0 ${px(8)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA;
  background: ${P.voidCharcoal}; color: ${P.bone};
  font-size: ${px(22)}; font-weight: 700; line-height: 1; white-space: nowrap;
}
.ap-kbd.ap-pad { border-radius: 999px; }

/* ------------------------------------------------------------- buttons -- */
.ap-btn, .ap-mbtn, .ap-tab {
  font-family: ${AP_FONT}; color: ${P.parchment}; cursor: pointer;
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease, background 90ms ease;
  -webkit-tap-highlight-color: transparent;
}
.ap-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: ${px(10)};
  min-height: ${px(56)}; min-width: ${px(150)}; padding: 0 ${px(26)};
  font-size: ${px(24)}; font-weight: 700; letter-spacing: 0.06em;
  background: linear-gradient(180deg, ${PLATE_LIFT} 0%, ${PLATE_TOP} 100%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}88; border-radius: ${px(12)};
  white-space: nowrap;
}
.ap-btn.ap-primary { border-color: ${P.hearthAmber}AA; }
.ap-btn.ap-danger { border-color: ${P.bone}; background: linear-gradient(180deg, #3A302A 0%, ${P.bruiseUmber} 100%); }
.ap-btn[disabled], .ap-mbtn[disabled] { cursor: default; color: ${INK_DIM}; }
.ap-btn[disabled] { opacity: 0.7; }

/* THE FOCUS RING (PLAN §3.3): 2 px Hearth Amber outline + 3% scale + plate
   lift, on exactly one item of the top screen. */
.ap-btn.ap-focus, .ap-mbtn.ap-focus, .ap-tab.ap-focus, .ap-focusable.ap-focus {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)};
  transform: translateY(${px(-2)}) scale(1.03);
  box-shadow: 0 ${px(10)} ${px(24)} #000000AA, 0 0 ${px(18)} ${P.hearthAmber}33;
  border-color: ${P.hearthAmber}CC;
}

/* --------------------------------------------------------------- title -- */
.ap-title .ap-title-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(90deg, ${P.voidCharcoal}F2 0%, ${P.voidCharcoal}D9 24%, ${P.voidCharcoal}66 44%, ${P.voidCharcoal}00 62%),
    linear-gradient(0deg, ${P.voidCharcoal}B3 0%, ${P.voidCharcoal}00 22%);
}
.ap-title .ap-title-col {
  position: absolute; left: ${px(120)}; top: 0; bottom: 0;
  display: flex; flex-direction: column; justify-content: center;
  gap: ${px(34)}; padding: ${px(40)} 0 ${px(110)};
}
.ap-logo { display: flex; flex-direction: column; align-items: flex-start; gap: ${px(6)}; }
.ap-logo-word {
  font-size: ${px(128)}; font-weight: 800; letter-spacing: 0.2em; line-height: 1;
  color: ${P.parchment};
  text-shadow: 0 ${px(4)} 0 ${P.voidCharcoal}, 0 0 ${px(38)} ${P.hearthAmber}44;
  margin-left: ${px(-6)};
}
.ap-logo-rule { display: flex; align-items: center; gap: ${px(14)}; color: ${P.hearthAmber}; font-size: ${px(22)}; }
.ap-logo-rule::before, .ap-logo-rule::after {
  content: ''; display: block; width: ${px(120)}; height: max(1px, ${px(2)});
  background: linear-gradient(90deg, ${P.hearthAmber}00, ${P.hearthAmber}AA, ${P.hearthAmber}00);
}
.ap-logo-sub { font-size: ${px(26)}; color: ${P.bone}; letter-spacing: 0.04em; }
.ap-menu { display: flex; flex-direction: column; gap: ${px(12)}; align-items: flex-start; }
.ap-mbtn {
  display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
  width: ${px(470)}; min-height: ${px(64)}; padding: ${px(8)} ${px(28)};
  text-align: left; font-size: ${px(30)}; font-weight: 700; letter-spacing: 0.06em;
  background: linear-gradient(172deg, ${PLATE_TOP} 0%, ${P.voidCharcoal} 70%);
  border: max(2px, ${px(2)}) solid ${P.warmGrey}66; border-radius: ${px(14)};
  box-shadow: 0 ${px(6)} ${px(18)} #00000080;
}
.ap-mbtn .ap-mcap {
  font-size: ${px(22)}; font-weight: 500; letter-spacing: 0.02em; color: ${INK_DIM}; margin-top: ${px(2)};
}
.ap-mbtn.ap-focus .ap-mcap { color: ${P.bone}; }
.ap-mbtn.ap-focus::before {
  content: ''; position: absolute; left: ${px(-26)}; top: 50%;
  width: ${px(12)}; height: ${px(12)}; margin-top: ${px(-6)};
  background: ${P.hearthAmber}; transform: rotate(45deg); border-radius: ${px(2)};
}
.ap-mbtn { position: relative; }
.ap-title-foot {
  position: absolute; left: ${px(120)}; right: ${px(40)}; bottom: ${px(34)};
  display: flex; align-items: center; gap: ${px(26)}; flex-wrap: wrap;
  font-size: ${px(22)}; color: ${INK_DIM};
}

/* ----------------------------------------------------------- hints bar -- */
.ap-hints { display: flex; align-items: center; gap: ${px(22)}; flex-wrap: wrap; font-size: ${px(22)}; color: ${INK_DIM}; }
.ap-hint { display: inline-flex; align-items: center; gap: ${px(8)}; white-space: nowrap; }

/* ------------------------------------------------------------ settings -- */
.ap-settings .ap-panel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(1560)}, calc(100vw - 32px)); height: min(${px(900)}, calc(100vh - 32px));
  display: flex; flex-direction: column; padding: ${px(22)} ${px(30)} ${px(18)};
}
.ap-set-head { display: flex; align-items: center; gap: ${px(28)}; padding-bottom: ${px(14)}; border-bottom: 1px solid ${P.warmGrey}44; }
.ap-tabs { display: flex; align-items: center; gap: ${px(10)}; flex-wrap: nowrap; }
.ap-tab {
  min-height: ${px(56)}; padding: 0 ${px(24)}; font-size: ${px(24)}; font-weight: 700; letter-spacing: 0.08em;
  background: transparent; border: max(2px, ${px(2)}) solid transparent; border-radius: ${px(12)};
  color: ${INK_DIM};
}
.ap-tab.ap-active { color: ${P.parchment}; background: ${PLATE_LIFT}; border-color: ${P.warmGrey}88; }
.ap-tab.ap-active::after {
  content: ''; display: block; height: max(2px, ${px(3)}); margin-top: ${px(4)};
  background: ${P.hearthAmber}; border-radius: 2px;
}
.ap-set-body { flex: 1 1 auto; min-height: 0; display: flex; gap: ${px(26)}; padding-top: ${px(16)}; }
.ap-tabwrap { flex: 1 1 62%; min-width: 0; overflow-y: auto; overflow-x: hidden; padding: ${px(6)} ${px(16)} ${px(6)} ${px(6)}; scrollbar-color: ${P.warmGrey}88 transparent; }
.ap-tabbody { display: none; flex-direction: column; gap: ${px(10)}; }
.ap-tabbody.ap-active { display: flex; }
.ap-info {
  flex: 0 0 34%; min-width: 0; align-self: stretch;
  padding: ${px(20)} ${px(24)}; border-radius: ${px(14)};
  background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}44;
  display: flex; flex-direction: column; gap: ${px(12)}; overflow: hidden;
}
.ap-info-title { font-size: ${px(28)}; font-weight: 800; letter-spacing: 0.06em; color: ${P.parchment}; }
.ap-info-body { font-size: ${px(22)}; color: ${P.bone}; line-height: 1.4; white-space: pre-line; }
.ap-info-live { font-size: ${px(22)}; color: ${P.hearthAmber}; line-height: 1.4; white-space: pre-line; }
.ap-set-foot {
  display: flex; align-items: center; gap: ${px(18)}; padding-top: ${px(14)};
  border-top: 1px solid ${P.warmGrey}44; margin-top: ${px(12)};
}
.ap-set-foot .ap-hints { flex: 1 1 auto; }
.ap-set-foot .ap-foot-note { font-size: ${px(22)}; color: ${P.bone}; }
.ap-measured { font-size: ${px(22)}; color: ${P.bone}; padding: ${px(8)} ${px(14)}; border-radius: ${px(10)}; background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}33; }

/* ----------------------------------------------------------- widgets -- */
.ap-section { margin: ${px(6)} 0 0; font-size: ${px(22)}; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: ${INK_DIM}; }
/* A row = label over its one-line status note (left) + the control (right,
   vertically centred): two text lines and one 56-authored-px control share
   the same height, so five Display rows fit a 1024x576 window unscrolled. */
.ap-row {
  display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  grid-template-areas: "label ctl" "note ctl"; align-items: center;
  column-gap: ${px(18)}; row-gap: 0;
  min-height: ${px(64)}; padding: ${px(4)} ${px(16)};
  border-radius: ${px(12)}; border: max(2px, ${px(2)}) solid transparent;
  background: ${P.voidCharcoal}99;
  transition: transform 90ms ease, background 90ms ease, border-color 90ms ease;
}
.ap-row .ap-label { grid-area: label; align-self: end; font-size: ${px(24)}; font-weight: 600; color: ${P.parchment}; line-height: 1.25; }
.ap-row .ap-ctl { grid-area: ctl; display: flex; align-items: center; gap: ${px(10)}; min-width: 0; justify-content: flex-end; }
.ap-row .ap-note { grid-area: note; align-self: start; font-size: ${px(22)}; color: ${INK_DIM}; line-height: 1.3; }
.ap-row:has(.ap-note:empty) .ap-label { grid-row: 1 / 3; align-self: center; }
.ap-row .ap-note:empty { display: none; }
.ap-row:has(.ap-focus) {
  outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: 0;
  background: ${PLATE_LIFT}; border-color: ${P.hearthAmber}55;
  transform: translateY(${px(-1)}) scale(1.01);
  box-shadow: 0 ${px(8)} ${px(20)} #00000099;
}
.ap-row:has([disabled]) .ap-label { color: ${INK_DIM}; }
.ap-value { min-width: ${px(92)}; text-align: right; font-size: ${px(24)}; font-weight: 700; color: ${P.parchment}; font-variant-numeric: tabular-nums; }
.ap-range {
  -webkit-appearance: none; appearance: none; flex: 1 1 auto; min-width: ${px(160)};
  height: ${px(56)}; background: transparent; cursor: pointer; margin: 0;
}
.ap-range::-webkit-slider-runnable-track {
  height: ${px(10)}; border-radius: 999px;
  background: linear-gradient(90deg, ${P.hearthAmber} 0%, ${P.hearthAmber} var(--ap-fill, 50%), ${P.bruiseUmber} var(--ap-fill, 50%), ${P.bruiseUmber} 100%);
  border: 1px solid ${P.warmGrey}66;
}
.ap-range::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: ${px(28)}; height: ${px(28)}; margin-top: ${px(-10)};
  border-radius: 50%; background: ${P.parchment}; border: max(2px, ${px(3)}) solid ${P.voidCharcoal};
  box-shadow: 0 0 0 max(1px, ${px(2)}) ${P.warmGrey};
}
.ap-range::-moz-range-track { height: ${px(10)}; border-radius: 999px; background: ${P.bruiseUmber}; }
.ap-range::-moz-range-progress { height: ${px(10)}; border-radius: 999px; background: ${P.hearthAmber}; }
.ap-range::-moz-range-thumb { width: ${px(26)}; height: ${px(26)}; border-radius: 50%; background: ${P.parchment}; border: 3px solid ${P.voidCharcoal}; }
.ap-row:has(.ap-range.ap-focus) .ap-range::-webkit-slider-thumb { box-shadow: 0 0 0 max(2px, ${px(3)}) ${P.hearthAmber}; }
.ap-switch {
  display: inline-flex; align-items: center; gap: ${px(12)};
  min-height: ${px(56)}; min-width: ${px(150)}; padding: 0 ${px(16)} 0 ${px(10)};
  border-radius: 999px; border: max(2px, ${px(2)}) solid ${P.warmGrey}88;
  background: ${P.voidCharcoal}; color: ${P.parchment}; cursor: pointer;
  font-size: ${px(24)}; font-weight: 700;
}
.ap-switch .ap-knob {
  width: ${px(56)}; height: ${px(30)}; border-radius: 999px; position: relative; flex: 0 0 auto;
  background: ${P.bruiseUmber}; border: 1px solid ${P.warmGrey}66; transition: background 120ms ease;
}
.ap-switch .ap-knob::after {
  content: ''; position: absolute; top: ${px(3)}; left: ${px(3)}; width: ${px(22)}; height: ${px(22)};
  border-radius: 50%; background: ${P.bone}; transition: transform 120ms ease, background 120ms ease;
}
.ap-switch[aria-checked="true"] .ap-knob { background: ${P.hearthAmber}; }
.ap-switch[aria-checked="true"] .ap-knob::after { transform: translateX(${px(26)}); background: ${P.parchment}; }
.ap-switch[disabled] { opacity: 0.6; cursor: default; }
.ap-choice {
  flex: 1 1 auto; min-width: ${px(150)}; min-height: ${px(56)}; padding: 0 ${px(10)};
  border-radius: ${px(10)}; border: max(2px, ${px(2)}) solid ${P.warmGrey}66;
  background: ${P.voidCharcoal}; color: ${P.parchment}; cursor: pointer;
  font-size: ${px(24)}; font-weight: 700; text-align: center; white-space: nowrap;
}
.ap-step {
  flex: 0 0 auto; width: ${px(56)}; height: ${px(56)}; border-radius: ${px(10)};
  border: max(2px, ${px(2)}) solid ${P.warmGrey}55; background: ${PLATE_TOP}; color: ${P.bone};
  font-size: ${px(30)}; font-weight: 800; line-height: 1; cursor: pointer; padding: 0;
}
.ap-step:hover { border-color: ${P.hearthAmber}88; color: ${P.parchment}; }
.ap-select .ap-choice[disabled], .ap-select .ap-step[disabled] { opacity: 0.6; cursor: default; }
p.ap-note { margin: 0; font-size: ${px(22)}; color: ${INK_DIM}; line-height: 1.35; }
p.ap-note.ap-warn { color: ${P.bone}; }

/* ------------------------------------------------------------ dialogs -- */
.ap-dialog .ap-dlg {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(820)}, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto;
  padding: ${px(30)} ${px(36)} ${px(28)}; display: flex; flex-direction: column; gap: ${px(16)};
}
.ap-dlg-title { font-size: ${px(32)}; font-weight: 800; letter-spacing: 0.08em; color: ${P.parchment}; }
.ap-dlg-body { font-size: ${px(24)}; color: ${P.bone}; line-height: 1.4; white-space: pre-line; }
.ap-dlg-list { margin: 0; padding-left: ${px(26)}; font-size: ${px(24)}; color: ${P.parchment}; line-height: 1.45; }
.ap-dlg-count { font-size: ${px(24)}; color: ${P.hearthAmber}; font-weight: 700; font-variant-numeric: tabular-nums; }
.ap-dlg-btns { display: flex; gap: ${px(16)}; justify-content: flex-end; flex-wrap: wrap; margin-top: ${px(6)}; }

/* ------------------------------------------------------------ loading -- */
/* 99% (not 100%) opaque on purpose: Chrome keeps LCD subpixel text on an
   OPAQUE composited layer, and its red/green glyph fringes land in the Ember
   and Heal bands (G1.12); a translucent layer renders grayscale AA. */
.ap-loading { background: ${P.voidCharcoal}FC; }
.ap-loading .ap-load-col {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: ${px(26)};
  width: min(${px(760)}, calc(100vw - 32px));
}
.ap-loading .ap-logo { align-items: center; }
.ap-loading .ap-logo-word { font-size: ${px(110)}; margin-left: 0.2em; }
.ap-bar { width: 100%; height: ${px(12)}; border-radius: 999px; background: ${P.bruiseUmber}; border: 1px solid ${P.warmGrey}55; overflow: hidden; }
.ap-bar > i { display: block; height: 100%; width: 0%; background: ${P.hearthAmber}; border-radius: 999px; transition: width 160ms linear; }
.ap-load-status { font-size: ${px(24)}; color: ${P.bone}; min-height: 1.3em; }
.ap-press {
  font-size: ${px(30)}; font-weight: 700; letter-spacing: 0.14em; color: ${P.parchment};
  padding: ${px(12)} ${px(28)}; border-radius: 999px; border: max(2px, ${px(2)}) solid ${P.hearthAmber}AA;
  background: ${PLATE_TOP}; visibility: hidden;
  animation: ap-breathe 2.4s ease-in-out infinite;
}
.ap-press.ap-on { visibility: visible; }
@keyframes ap-breathe { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }

/* ----------------------------------------------------------- farewell -- */
.ap-farewell { background: ${P.voidCharcoal}FC; } /* translucent: grayscale text AA (see .ap-loading) */
.ap-farewell .ap-dlg {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(900)}, calc(100vw - 32px)); padding: ${px(40)} ${px(46)} ${px(34)};
  display: flex; flex-direction: column; gap: ${px(18)}; align-items: center; text-align: center;
}
.ap-farewell .ap-logo { align-items: center; }
.ap-farewell .ap-logo-word { font-size: ${px(84)}; margin-left: 0.2em; }

/* -------------------------------------------------------------- toasts -- */
.ap-toasts {
  position: fixed; left: 50%; bottom: ${px(160)}; transform: translateX(-50%);
  z-index: 1300; display: flex; flex-direction: column-reverse; align-items: center; gap: ${px(10)};
  pointer-events: none; width: min(${px(900)}, calc(100vw - 32px));
  will-change: opacity; /* grayscale text AA, as .ap-screen */
}
.ap-toast {
  font-family: ${AP_FONT}; font-size: ${px(24)}; color: ${P.parchment}; text-align: center;
  padding: ${px(12)} ${px(24)}; border-radius: ${px(12)}; max-width: 100%;
  background: ${P.voidCharcoal}F2; border: max(2px, ${px(2)}) solid ${P.warmGrey}AA;
  box-shadow: 0 ${px(10)} ${px(28)} #000000AA;
  opacity: 0; transform: translateY(${px(10)}); transition: opacity 160ms ease, transform 160ms ease;
}
.ap-toast.ap-in { opacity: 1; transform: none; }
.ap-toast.ap-good { border-color: ${P.hearthAmber}; }
.ap-toast.ap-warn { border-color: ${P.bone}; }
.ap-toast.ap-error { border-color: ${P.parchment}; background: ${P.bruiseUmber}F2; }

/* --------------------------------------------------- controls reference -- */
.ap-ref { display: grid; grid-template-columns: 1fr 1fr; gap: ${px(10)} ${px(26)}; }
.ap-ref-col { display: flex; flex-direction: column; gap: ${px(4)}; min-width: 0; }
.ap-ref-row { display: flex; align-items: center; justify-content: space-between; gap: ${px(12)}; min-height: ${px(38)}; padding: 0 ${px(8)}; border-bottom: 1px solid ${P.warmGrey}22; }
.ap-ref-row .ap-ref-act { font-size: ${px(22)}; color: ${P.parchment}; }
.ap-ref-row .ap-ref-keys { display: inline-flex; gap: ${px(6)}; flex-wrap: wrap; justify-content: flex-end; }

/* Narrow windows: the info panel steps aside so every row keeps a one-line
   status note at the type floor (the notes carry the honest copy). */
@media (max-width: 1180px) {
  .ap-info { display: none; }
  .ap-tabwrap { flex-basis: 100%; }
}

/* Short windows: the title stack tightens (type floors unchanged). */
@media (max-height: 700px) {
  .ap-title .ap-title-col { gap: ${px(22)}; padding-bottom: ${px(90)}; }
  .ap-logo-word { font-size: ${px(104)}; }
  .ap-menu { gap: ${px(9)}; }
  .ap-mbtn { min-height: ${px(58)}; padding-top: ${px(5)}; padding-bottom: ${px(5)}; }
}
`;

let installed = false;
export function installAppStyle() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.id = 'ap-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  const apply = () => document.documentElement.style.setProperty('--ap-s', String(Math.round(apScale() * 10000) / 10000));
  apply();
  window.addEventListener('resize', apply);
}
