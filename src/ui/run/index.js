// Run meta-screen manager (BUILD_BRIEF §16 "Draft, shop, path flow", §13
// transition fade, §18 end screens).
//
// One DOM host that shows exactly ONE screen at a time, chosen by the sim's
// run phase — the UI never decides what should be on screen, it only draws
// `runSystem().view()`:
//
//   phase 'reward'  -> draft screen   (one candidate, take-or-decline)
//   phase 'path'    -> path screen    (two doors, two glyphs each)
//   phase 'shop'    -> shop shelf     (3 cards, price plaques, Glint strip)
//   phase 'fade'    -> transition fade only (§13 step 6 -> 7)
//   phase 'victory' -> warm Victory page (§18)
//   phase 'defeat'  -> violet-white Defeat page (§18)
//
// Every button and key routes into the SAME sim entry points __echoes.cmd
// drives (run.takeReward / declineReward / focusPath / choosePath / buy /
// advanceFromShop / returnToCamp), so a scripted capture and a human press are
// literally the same code path.
//
// THE FRESH-PRESS RULE (§16, binding): "Enter commits under the fresh-press
// rule (a held Enter from the previous screen never commits)." Implemented
// with two sets:
//   `held`  — codes currently down, maintained by keydown/keyup
//   `stale` — codes that were ALREADY down at the moment the current screen
//             opened; they stay stale until their keyup
// A commit needs `!e.repeat && !stale.has(code) && !held.has(code)`. Walking
// draft -> path with Enter pinned down therefore stops dead at the doors, and
// only a genuine release-and-press walks through.
//
// THE SETTLE WINDOW (certification B-r3 F1, binding): A and D are WASD in
// combat and choose-left/right on every page, and a page is on screen ~10 ms
// after the clearing kill. A strafing tap that landed in that instant used to
// retarget the draft to Decline, and the next Enter — the key the page itself
// advertises — destroyed the reward with no confirmation (12 of 12 rewards
// lost across two real-input runs). So for GRACE_MS after a page opens, every
// navigation and commit key is dropped, and a key pressed before the page
// settled (or already down when it opened) must be RELEASED and pressed again
// before it counts. Esc alone is honoured at once: it has no combat meaning,
// so it can only be deliberate. After the window the documented bindings
// apply unchanged. Each page also re-initialises its own focus to its
// rn-primary when it opens (draft: Take; path: the sim's door 0), so no page
// ever inherits a focus from the page before it.
import { RUN_CSS, isCompact, isShort } from './style.js';
import { viewerSeat } from '../../app/viewerseat.js';
import { PARTY_STRIP_CSS } from './partystrip.js';
import { SKILL_SLOTS } from '../../core/constants.js';
import { parseBootParams } from '../../app/params.js';
import { service } from '../../app/registry.js';
import { createDraftScreen } from './draft.js';
import { createPathScreen } from './path.js';
import { createShopScreen } from './shop.js';
import { createEndScreen, END_CSS } from './endscreens.js';
// CAMPAIGN (docs/gauntlet/PLAN.md §12.6): the level-transition card.
import { createTransitScreen, TRANSIT_CSS } from './transit.js';
// RELICS (docs/CONTENT_PLAN.md §5): the relic page + the relic strip.
import { createRelicScreen, RELIC_CSS } from './relic.js';
import { createRelicStrip, RELIC_STRIP_CSS } from './relicstrip.js';
// EVENT ROOMS (docs/EVENT_ROOMS.md): the encounter card + the walk-up plate.
import { createEncounterScreen, createEventPlate, ENCOUNTER_CSS } from './encounter.js';
import { ENCOUNTERS } from '../../sim/encounters.js';
import { RELICS, CURSES } from '../../sim/relics.js';
// @gnt:M3 RUN-NAV-SOUND (fix-M3-r5): selection ticks for the build pages.
import { createSelectionSound } from '../../audio/uiselect.js';
import { t } from '../../i18n/index.js';
import { bindings } from '../../core/bindings.js';

// phase -> screen name. Anything absent means "no meta screen".
const SCREEN_FOR = {
  reward: 'draft',
  path: 'path',
  shop: 'shop',
  victory: 'end',
  defeat: 'end',
  transit: 'transit', // CAMPAIGN: level-clear / setting-out card
  relic: 'relic', // RELICS: pick one of three
  encounter: 'encounter', // EVENT ROOMS: Take or Leave
};

export function createRunUi({ bus, world, socket = null, autostart = false }) {
  const style = document.createElement('style');
  style.id = 'run-style';
  style.textContent = RUN_CSS + TRANSIT_CSS + PARTY_STRIP_CSS + END_CSS + RELIC_CSS + RELIC_STRIP_CSS + ENCOUNTER_CSS; // fix-INT-r5: + the end card
  document.head.appendChild(style);

  // Veil sits UNDER #hud (§16: Zone 1 persists beneath); the page and the
  // transition fade sit above everything the world draws.
  const veil = document.createElement('div');
  veil.id = 'run-veil';
  const fade = document.createElement('div');
  fade.id = 'run-fade';
  const rootEl = document.createElement('div');
  rootEl.id = 'run-screen';
  document.body.appendChild(veil);
  document.body.appendChild(fade);
  document.body.appendChild(rootEl);

  const run = () => world.runSystem();
  const build = () => world.buildSystem();
  // PARTY: the party system (the three ally builds) for the build pages.
  const party = () => (typeof world.partySystem === 'function' ? world.partySystem() : null);

  const screens = {
    draft: createDraftScreen({ run, build, party }),
    path: createPathScreen({ run }),
    shop: createShopScreen({ run, build, party }),
    end: createEndScreen({ run }),
    transit: createTransitScreen({ run }),
    relic: createRelicScreen({ run }),
    encounter: createEncounterScreen({ run }),
  };
  const eventPlate = createEventPlate();
  const relicStrip = createRelicStrip();
  for (const s of Object.values(screens)) {
    s.el.style.display = 'none';
    rootEl.appendChild(s.el);
  }

  let current = 'none';
  let signature = '';

  // §17/A7 page fit. The pages are AUTHORED at their own px (every label
  // at/above the 16 px text floor, every numeral at/above 20, the §16 doors at
  // exactly 160x220). Uniform `transform: scale()` was the old lever and it
  // BROKE the floors — see the long note in ./style.js. Now:
  //
  //   1. the bottom reserve is the MEASURED command bar, not a fixed 120 px
  //      (the bar is itself HUD-scaled, so at 1024x640 it is 78 px tall, not
  //      120 — reserving 120 threw away 42 px of usable page for nothing);
  //   2. short windows get `.rn-compact`, which REFLOWS the page (tighter
  //      rhythm, smaller ornament/icon, short node copy) with every type size
  //      still at/above its floor;
  //   3. --rn-s is clamped to a floor of 1 so no authored px is ever scaled
  //      DOWN. Only a window below the §1 minimum (1024x640) — where the
  //      compact page still does not fit — is allowed under the clamp, and
  //      then shrinking beats clipping.
  const DESIGN = { w: 980, h: 700 };
  const RESERVE_FALLBACK = 120; // px, until the HUD bar exists to be measured
  const MIN_SCALE = 1; // §17 floors are REAL px: never scale the pages down
  const UNDER_MIN_SCALE = 0.75; // a window under 1024x640 only
  let lastFit = { s: 1, compact: false, reserve: RESERVE_FALLBACK, fit: 1 };

  function reservePx() {
    const bar = document.querySelector('.hud-bar');
    if (bar) {
      const r = bar.getBoundingClientRect();
      if (r.height > 0) return Math.max(48, Math.round(window.innerHeight - r.top) + 6);
    }
    return RESERVE_FALLBACK;
  }

  function fitScale(pageEl = null) {
    // Compact is decided by the WINDOW, never by the measured page, so the
    // screens can pick their copy variant before they render (a page that
    // reflowed only after measuring would need two renders to settle).
    const compact = isCompact();
    rootEl.classList.toggle('rn-compact', compact);
    rootEl.classList.toggle('rn-short', isShort());
    const reserve = reservePx();
    rootEl.style.setProperty('--rn-reserve', `${reserve}px`);
    const pg = pageEl ?? (current !== 'none' ? screens[current].el : null);
    const w = pg && pg.offsetWidth ? pg.offsetWidth : DESIGN.w;
    const h = pg && pg.offsetHeight ? pg.offsetHeight : DESIGN.h;
    const fit = Math.min(
      1,
      (window.innerWidth - 40) / w,
      (window.innerHeight - 28 - reserve) / h
    );
    // Below the §1 minimum window (1024x640) a page that still does not fit
    // shrinks rather than clips (the note above); at 1024x640 and up the
    // clamp holds and the §17 floors are real px.
    const underMin = window.innerWidth < 1024 || window.innerHeight < 640;
    let s = Math.max(underMin ? UNDER_MIN_SCALE : MIN_SCALE, fit);
    // gauntlet r5 PARTY F4: the DOCKED shop grows upward from the command
    // bar, so a shelf taller than the room above the bar (the compact
    // layouts fit every measured stock, but the fixed frame takes the
    // tallest class shelf — Siphon's binding quote, owned / upgrade lines)
    // must never push its header off the window: it shrinks just enough to
    // keep the page on screen (4 px) — shrinking beats clipping, and a page
    // that fits keeps the §17 clamp above.
    // fix-INT-r5 (J5-F2): the end card is never clipped either — it shrinks
    // under the same rule when a window at / above the minimum is too short.
    const endCard = current === 'end' && !pageEl;
    if (!underMin && (rootEl.classList.contains('rn-dock') || endCard) && pg && h * s > window.innerHeight - reserve - 4) {
      s = Math.max(UNDER_MIN_SCALE, (window.innerHeight - reserve - 4) / h);
    }
    rootEl.style.setProperty('--rn-s', s.toFixed(4));
    // fix-INT-r5 (J5-F2): the end card also keeps clear of the HUD's corner
    // plates (location, Glint) when the room between them and the command bar
    // holds it — it centres in that band (--rn-top = the plates' bottom);
    // a window without that room centres it as before (--rn-top 0).
    let top = 0;
    if (endCard && pg) {
      let band = 0;
      for (const sel of ['.hud-loc', '.hud-glint']) {
        const n = document.querySelector(sel);
        const r = n ? n.getBoundingClientRect() : null;
        if (r && r.width > 1 && r.height > 1) band = Math.max(band, Math.round(r.bottom) + 8);
      }
      if (band > 0 && h * s <= window.innerHeight - reserve - band - 8) top = band;
    }
    rootEl.style.setProperty('--rn-top', `${top}px`);
    lastFit = { s, compact, reserve, fit: Math.round(fit * 1e4) / 1e4, page: { w, h }, top };
    return s;
  }
  fitScale();
  window.addEventListener('resize', () => {
    fitScale();
    // A resize can cross the compact threshold, which changes the COPY the
    // cards carry — force the next update() to repaint.
    signature = '';
  });

  // ------------------------------------------------------- fresh-press --
  const held = new Set();
  const stale = new Set();

  function markAllHeldStale() {
    for (const c of held) stale.add(c);
  }

  // ----------------------------------------------------- settle window --
  // See the header note. 300 ms sits inside §16's "interactive within 350 ms"
  // and past the 220 ms entrance fade, so a page never takes a navigation or
  // commit key before it has finished arriving.
  //
  // CARRY-OVER: the hazard is not "a tap in the first 300 ms", it is "the
  // hands are still running the fight pattern". A key that has a combat
  // meaning and NO meaning on any page (skill 1-4, W/S, R, E, Tab, F1-F4) is
  // unambiguous evidence of that, so each one restarts the 300 ms settle —
  // measured: the strafing pattern of certB3-b2b lands "A@146 2@271 3@334
  // D@396" on a fresh reward page, and that D is a carried-over strafe, not
  // a choice. The restart is capped at SETTLE_MAX_MS after open so a page is
  // never held hostage; A/D/arrows/Enter/Space themselves never extend it,
  // so a lone choose key after a quiet 300 ms counts exactly as documented.
  const GRACE_MS = 300;
  const SETTLE_MAX_MS = 1000;
  // Ruling A17: W / S, ↑ / ↓ move a swap offer's Replaces mark — navigation,
  // so the settle window drops them too (a carried strafe never moves it).
  // PARTY (PLAN §16.4): the character switch (Q / E, PgUp / PgDn, F1-F4) is
  // navigation too — dropped for the page's first 300 ms, and E / F1-F4 (the
  // combat's revive / heal-override keys) keep restarting that window.
  const NAV_KEYS = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'KeyQ', 'KeyE', 'PageUp', 'PageDown', 'F1', 'F2', 'F3', 'F4']);
  // X (the draft's decline, ruling A13) is a commit key: settle-guarded and
  // fresh-press only, exactly like Enter.
  const COMMIT_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'KeyX', 'KeyR']);
  // §23.9: the carry-over set follows the skill keys (Digit1..Digit8).
  const CARRY_KEYS = new Set([
    ...Array.from({ length: SKILL_SLOTS }, (_, i) => `Digit${i + 1}`),
    'KeyW', 'KeyS', 'KeyR', 'KeyE', 'Tab', 'F1', 'F2', 'F3', 'F4',
  ]);
  // Controls slice: a rebound play key carries over like its default did.
  const isPlayKey = (code) => {
    const a = bindings.action(code);
    return !!a && a !== 'pause' && a !== 'backpack' && !/^move(Left|Right)$/.test(a) && !/^(levels|unlocks|classes)$/.test(a);
  };
  let openedAt = -Infinity; // performance.now() when the current page appeared
  let carryAt = -Infinity; // last carry-over key pressed on the current page
  const sinceOpen = () => performance.now() - openedAt;
  const settleAt = () => Math.min(Math.max(openedAt, carryAt) + GRACE_MS, openedAt + SETTLE_MAX_MS);
  const settled = () => performance.now() >= settleAt();

  function setScreen(name) {
    if (name === current) return;
    if (current !== 'none' && screens[current]) screens[current].el.style.display = 'none';
    current = name;
    signature = '';
    openedAt = performance.now();
    carryAt = -Infinity;
    const on = name !== 'none';
    // A page re-initialises its own focus the moment it opens — it never
    // inherits where the previous page left off (F1: one D two pages earlier
    // used to arm Decline on every later reward until the player pressed left).
    if (on && typeof screens[name].open === 'function') screens[name].open();
    rootEl.classList.toggle('rn-open', on);
    veil.classList.toggle('rn-open', on);
    // ROUND-1 CERTIFICATION FIX — the shop is a diegetic SHELF, not a modal:
    // it docks above the command bar (`rn-dock`) and its veil is a ~12% dim
    // (`rn-light`) so the lit arena and the party stay in frame behind it.
    // Every other meta screen keeps the §16 full veil.
    rootEl.classList.toggle('rn-dock', name === 'shop');
    veil.classList.toggle('rn-light', name === 'shop');
    if (on) screens[name].el.style.display = '';
    fitScale();
    // Every key that was already down when this page appeared is stale: it
    // belongs to the press that OPENED the page, never to a commit on it.
    markAllHeldStale();
  }

  function setVeilTone(phase) {
    // CAMPAIGN: the transition card's warm veil (never a black full-screen).
    veil.classList.toggle('rn-transit', phase === 'transit');
    if (phase === 'transit') {
      const c = run().campaign ? run().campaign() : null;
      veil.classList.toggle('rn-depart', !!(c && c.card && c.card.kind === 'depart'));
    } else veil.classList.remove('rn-depart');
    veil.classList.toggle('rn-victory', phase === 'victory');
    veil.classList.toggle('rn-defeat', phase === 'defeat');
    rootEl.classList.toggle('rn-victory', phase === 'victory');
    rootEl.classList.toggle('rn-defeat', phase === 'defeat');
  }

  // A cheap signature so a screen only re-renders when something it draws has
  // actually changed (the shop's shake animation must never be restarted by an
  // unrelated repaint).
  function partyFill() {
    const P = party();
    if (!P) return '';
    return [1, 2, 3].map((i) => (P.slots(i) || []).join(',') + ':' + P.view(i).filled).join(';');
  }

  function swapFill() {
    const b = build();
    return b ? b.view().skills.map((s) => s.filled).join(',') : '';
  }

  function sigOf(v) {
    const r = v.reward;
    const p = v.path;
    const s = v.shop;
    return [
      isCompact() ? 'c' : 'f', // the compact reflow changes the card copy
      v.phase,
      v.room,
      v.wallet,
      v.freeSkillSlots,
      r ? `${r.type}:${r.id}:${r.substituted}` : '-',
      // Ruling A17: a swap offer repaints when its Replaces mark moves or the
      // socket screen changed how many nodes a skill holds.
      r && r.swap ? `${r.replace}:${r.suggest}:${swapFill()}` : '-',
      // PARTY: the party page's decisions / replaces / countdown seconds and
      // the party shelves (purses, sold, marks).
      v.party
        ? v.party.cards.map((c) => `${c.seat}${c.type}${c.id}${c.decided ? 1 : 0}${c.choice}${c.replace}`).join('|') +
          `/${v.party.mode}/${v.party.deadlineInTicks === null ? '-' : Math.ceil(v.party.deadlineInTicks / 60)}/${partyFill()}`
        : '-',
      v.partyShop
        ? v.partyShop.shelves
            .slice(1)
            .map((s) => `${s.purse}:${s.stock.map((i) => `${i.node}${i.sold ? 'x' : ''}${i.marked ? 'm' : ''}${i.owned}`).join(',')}`)
            .join('|') + `/${v.partyShop.leaveInTicks === null ? '-' : Math.ceil(v.partyShop.leaveInTicks / 60)}/${v.partyShop.deadlineInTicks === null ? '-' : Math.ceil(v.partyShop.deadlineInTicks / 60)}`
        : '-',
      p ? `${p.nextRoom}:${p.focus}:${p.options.map((o) => o.win + o.reward + (o.curse ?? '')).join(',')}` : '-',
      // RELICS: the relic page's offer and focus.
      // EVENT ROOMS: the card's state, focus and refusal.
      v.encounter ? `${v.encounter.id}:${v.encounter.state}:${v.encounter.focus}:${v.encounter.refused ?? ''}` : '-',
      v.relics && v.relics.offer ? `${v.relics.offer.room}:${v.relics.offer.focus}:${v.relics.offer.choices.map((c) => c.id).join(',')}:${v.relics.owned.length}` : '-',
      s ? s.stock.map((i) => `${i.node}${i.price}${i.sold ? 'x' : ''}${i.owned}`).join('|') : '-',
      // SHOP REFRESH: the Refresh button's price moves with each refresh.
      s ? `r${s.refreshes || 0}:${v.partyShop && v.partyShop.refreshes ? v.partyShop.refreshes.join(',') : ''}` : '-',
      v.summary ? `${v.summary.result}:${v.summary.rooms}:${v.summary.glint}` : '-',
      campaignSig(v),
    ].join('/');
  }

  // CAMPAIGN: the transition card and the CAMPAIGN COMPLETE countdown
  // repaint when their numbers move (whole seconds only).
  function campaignSig(v) {
    if (v.phase !== 'transit' && v.phase !== 'victory') return '-';
    const c = run().campaign ? run().campaign() : null;
    if (!c) return '-';
    if (v.phase === 'transit') return c.card ? `${c.card.kind}:${c.card.from}:${c.card.to}:${c.card.startTick}` : '-';
    return c.autoReturnInTicks !== null && c.autoReturnInTicks !== undefined ? `r${Math.ceil(c.autoReturnInTicks / 60)}` : '-';
  }

  // ---------------------------------------------- legendary shimmer (F2) --
  // A legendary card carries one sweeping highlight band (§16 "shimmer, never
  // a pulse"). The band used to be a CSS `background-position` keyframe, which
  // repainted the whole card 60 times a second and cost the run loop a 115 ms
  // frame when the card appeared and a 212-236 ms frame half a second later
  // (certification D-r1, F2). It is now a real child element moved with a
  // 2D `transform`, written HERE — once per frame, one style property per
  // legendary card on screen — because a CSS keyframe Chrome runs on the
  // compositor timeline never lands in the capture harness's pixels (same
  // reason the shop's deny-shake is written per frame). See ui/run/style.js
  // for why the band must NOT be promoted to its own layer.
  const SHINE_MS = 3200; // the §16 shimmer period, unchanged
  let shines = [];
  function refreshShines() {
    shines.length = 0;
    if (current === 'none') return;
    for (const card of screens[current].el.querySelectorAll('.rn-card.rn-legendary')) {
      let band = card.querySelector(':scope > .rn-shine');
      if (!band) {
        band = document.createElement('i');
        band.className = 'rn-shine';
        card.appendChild(band);
      }
      shines.push(band);
    }
  }
  function driveShines(nowMs, list = shines) {
    if (list.length === 0) return;
    // 130% -> -130% of the card's width, the travel the old keyframe ran.
    const x = 130 - 260 * ((nowMs % SHINE_MS) / SHINE_MS);
    // gauntlet r5 PARTY: the band's BOX stays on the card (its ::before
    // sweeps), so no layout probe ever finds a shine box off the window.
    const t = `${x.toFixed(2)}%`;
    for (const band of list) band.style.setProperty('--shx', t);
  }

  // ----------------------------------------------------- boot pre-paint --
  // Certification D-r1 (first-page hitches) and D-r3 S1 / round 4 (the shop
  // shelf's first open still cost a 300-1400 ms frame with the main thread
  // free). The mechanism, from a Chrome trace of the open with the Skia
  // shader categories on (tools/certfixDshouldfix4-trace.mjs --cats shaders
  // --traceBoot 1, reduced by tools/certfixDshouldfix4-pipes.mjs): the page is
  // rasterised by Skia GRAPHITE, which builds one GPU pipeline per distinct
  // (render pass config x render step x shader tree x clip) and blocks the
  // raster flush on the driver's compile the first time a combination is
  // drawn — 60-150 ms per new pipeline on this ANGLE/D3D stack. The pass
  // config is decided PER RASTER TILE (viewport-wide strips): a strip becomes
  // MSAA when an SVG path (icon, threat pointer) lands in it, and a strip that
  // is partially repainted gets a "w/ msaa load" pass. So the same CSS
  // gradient compiles up to three different pipelines depending on WHERE it
  // lands and whether it moves, and the old pre-paint — all four pages side by
  // side at boot — warmed the wrong variants: 12 pipelines were still created
  // at the real open, 10 of them MSAA / msaa-load variants of the shelf's
  // gradients (captures/certfixDshouldfix4-tboot-shop4.trace.json).
  //
  // So the pre-paint now OPENS each page the way the game does: the shop
  // docked above the command bar with its light veil, a legendary card with
  // its shine band, a sold card with its ember-breath ribbon and the glitter
  // motes animating for ten frames (partial repaints => the msaa-load
  // variants); then the draft, the path doors, the victory and the defeat
  // cards with the full veil. One page at a time, ~25 frames in total, at
  // 2/1000 opacity with the fades suppressed, ~20 frames after boot in camp.
  // The player sees nothing (the camp frame's analyzer numbers are unchanged)
  // and the first real open of every page finds its pipelines built.
  //
  // PARTY: the shop and the party page are opened the PARTY way too — the
  // character strip with its portraits, the owner tabs, the Suggested
  // ribbons (an ally's shelf, `seat: 1`), the owner band, the spoils line and
  // a swap card's Replaces row (the Tank's card). Without them the first
  // real shop open measured two 206 / 286 ms frames at v0.5.163 (GP.15) —
  // the synthetic shop view also has to be IN the shop phase, or the PARTY
  // shop's render (which ignores a view of another phase) paints nothing.
  const PREPAINT_WAIT = 20;
  const PREPAINT_SEQ = [
    { screen: 'shop', view: 'shop', frames: 16, dock: true, light: true },
    { screen: 'shop', view: 'shop', frames: 8, dock: true, light: true, seat: 1 },
    { screen: 'draft', view: 'draft', frames: 4 },
    { screen: 'draft', view: 'draft', frames: 4, seat: 1 },
    { screen: 'path', view: 'path', frames: 4 },
    { screen: 'relic', view: 'relic', frames: 4 }, // RELICS
    { screen: 'end', view: 'victory', frames: 4, tone: 'victory' },
    { screen: 'end', view: 'defeat', frames: 3, tone: 'defeat' },
    { screen: 'transit', view: 'transit', frames: 4, tone: 'transit' }, // CAMPAIGN card
  ];
  const prepaintLog = { started: null, done: null, frames: 0, step: null }; // probe surface
  let prepaintWait = PREPAINT_WAIT;
  let prepaintStep = -1; // index into PREPAINT_SEQ; >= length => finished
  let prepaintHold = 0;
  let prepaintPage = null;
  const prepaintShines = [];
  const prepaintDone = () => prepaintStep >= PREPAINT_SEQ.length;
  // MSAA seeds: three 6 px SVG paths, one per raster strip (top / middle /
  // bottom of the frame). A strip is rasterised with MSAA only while a path
  // sits in it, so each page is held with the seeds ON for the first half of
  // its frames (the MSAA and msaa-load pipeline variants) and OFF for the
  // second half (the plain variants) — the two configurations a page meets in
  // a real run, depending on where the threat pointers happen to be.
  const PREPAINT_SEED_ROWS = [0.12, 0.5, 0.88];
  const prepaintSeeds = [];
  function prepaintSeedsEnsure() {
    if (prepaintSeeds.length) return;
    for (const row of PREPAINT_SEED_ROWS) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '6');
      svg.setAttribute('height', '6');
      svg.setAttribute('viewBox', '0 0 6 6');
      svg.style.cssText = `position:fixed;left:3px;top:${(row * 100).toFixed(0)}%;width:6px;height:6px;pointer-events:none;opacity:0.002`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0 0 L6 3 L0 6 Z');
      path.setAttribute('fill', '#F4EFE6');
      svg.appendChild(path);
      rootEl.appendChild(svg);
      prepaintSeeds.push(svg);
    }
  }
  function prepaintSeedsShow(on) {
    for (const s of prepaintSeeds) s.style.display = on ? 'block' : 'none';
  }
  function prepaintSeedsRemove() {
    for (const s of prepaintSeeds) s.remove();
    prepaintSeeds.length = 0;
  }

  // Synthetic content that exercises every state the pages can show. The sim
  // is idle at boot and has nothing to offer; every render is guarded — a
  // warm-up may never be able to break the game.
  function prepaintViews(base) {
    const summary = {
      rooms: 8,
      glint: 120,
      skills: ['sanctuary'],
      nodes: { bench: ['ascend'], socketed: [] },
      seed: 4242,
      ticks: 3600,
    };
    // PARTY: an ally shelf per seat (the class nodes, marked / unmarked /
    // sold / short) and a party page with an ally swap card.
    const it = (node, rarity, price, o = {}) => ({ node, rarity, price, sold: false, marked: false, owned: 0, affordable: true, ...o });
    const partyShop = {
      room: 7,
      touched: [false, false, false, false],
      done: [false, false, false, false],
      deadlineTick: null,
      leaveTick: null,
      deadlineInTicks: null,
      leaveInTicks: null,
      shelves: [
        null,
        { seat: 1, purse: 72, stock: [it('galvanize', 'common', 15, { marked: true }), it('echo', 'rare', 20, { sold: true, owned: 1 }), it('aegis', 'legendary', 25), it('reach', 'common', 15, { marked: true, affordable: false })] },
        { seat: 2, purse: 72, stock: [it('siphon', 'common', 15, { marked: true }), it('reach', 'common', 15), it('pursuit', 'rare', 20, { marked: true }), it('ascend', 'legendary', 25)] },
        { seat: 3, purse: 72, stock: [it('skewer', 'common', 15, { marked: true }), it('concussive', 'common', 15), it('split', 'rare', 20, { owned: 1 }), it('heartseeker', 'legendary', 25)] },
      ],
    };
    const card = (seat, type, id, o = {}) => ({ seat, type, id, swap: false, substituted: false, line: null, spoils: [], replace: null, suggest: { choice: 'take', replace: null }, decided: false, choice: null, by: null, ...o });
    const party = {
      room: 1,
      promised: 'node',
      openedTick: 0,
      deadlineTick: null,
      deadlineInTicks: null,
      mode: 'suggest',
      owners: ['human', 'ai', 'ai', 'ai'],
      cards: [
        card(0, 'node', 'ascend'),
        card(1, 'skill', 'shield_wall', { swap: true, spoils: ['widen'], replace: 2, suggest: { choice: 'take', replace: 2 }, decided: true, choice: 'take', by: 'ai' }),
        card(2, 'skill', 'riposte', { swap: true, spoils: ['multiply'], replace: 3, suggest: { choice: 'take', replace: 3 }, decided: true, choice: 'leave', by: 'ai' }),
        card(3, 'node', 'split', { spoils: ['split'] }),
      ],
    };
    return {
      shop: {
        ...base,
        phase: 'shop',
        room: 7,
        shop: {
          wallet: 42,
          stock: [
            { node: 'ascend', price: 35, sold: false, owned: false, affordable: true, rarity: 'legendary' },
            { node: 'bounce', price: 25, sold: true, owned: true, affordable: true, rarity: 'common' },
            { node: 'echo', price: 30, sold: false, owned: false, affordable: false, rarity: 'rare' },
            { node: 'reach', price: 15, sold: false, owned: false, affordable: true, rarity: 'common' },
          ],
        },
        partyShop,
      },
      draft: {
        ...base,
        phase: 'reward',
        room: 1,
        freeSkillSlots: 0,
        reward: { type: 'node', id: 'ascend', substituted: false, line: null },
        spoils: { room: 1, nodes: ['snare', 'sharpen'] },
        party,
      },
      path: {
        ...base,
        path: {
          freeSkillSlots: 1,
          nextRoom: 4,
          options: [
            { win: 'kill_all', reward: 'skill' },
            { win: 'defend', reward: 'node', curse: 'iron_hide' },
          ],
          focus: 0,
        },
      },
      // RELICS: a cursed room's relic page (one card of each rarity).
      relic: {
        ...base,
        phase: 'relic',
        relics: {
          owned: [{ id: 'whetstone', ...RELICS.whetstone }],
          curse: null,
          cursesTaken: 1,
          offer: {
            room: 3,
            source: 'curse',
            focus: 1,
            curse: { id: 'iron_hide', name: CURSES.iron_hide.name },
            choices: ['millstone', 'hearthstone', 'last_light'].map((id) => ({ id, ...RELICS[id] })),
          },
        },
      },
      victory: { ...base, phase: 'victory', summary },
      defeat: { ...base, phase: 'defeat', summary: { ...summary, rooms: 5, glint: 60 } },
      transit: {
        ...base,
        phase: 'transit',
        __card: { kind: 'clear', from: 1, to: 2, name: 'The Sunken Mill', fromName: 'The Hollow Wood', startTick: 0, untilTick: 180, elapsedTicks: 60, due: false, summary: { skills: ['mending_bolt'], socketed: 12, sockets: 32, bench: 1, wallet: 34 } },
      },
    };
  }

  function prepaintHidePage() {
    for (const band of prepaintShines) band.remove();
    prepaintShines.length = 0;
    // Never hide the page a real setScreen() has just put up (the abort path).
    const live = current !== 'none' ? screens[current].el : null;
    if (prepaintPage && prepaintPage !== live) prepaintPage.style.display = 'none';
    prepaintPage = null;
  }

  function prepaintBegin(step) {
    prepaintHidePage();
    prepaintLog.step = step.view;
    // Exactly the classes setScreen() gives the real page, so the layout, the
    // veil and the tone — and with them the raster strips — are the real ones.
    rootEl.classList.add('rn-open');
    veil.classList.add('rn-open');
    rootEl.classList.toggle('rn-dock', !!step.dock);
    veil.classList.toggle('rn-light', !!step.light);
    rootEl.classList.toggle('rn-victory', step.tone === 'victory');
    rootEl.classList.toggle('rn-defeat', step.tone === 'defeat');
    veil.classList.toggle('rn-victory', step.tone === 'victory');
    veil.classList.toggle('rn-defeat', step.tone === 'defeat');
    veil.classList.toggle('rn-transit', step.tone === 'transit');
    const page = screens[step.screen];
    prepaintPage = page.el;
    page.el.style.display = '';
    // PARTY: an ally's tab (the Suggested ribbons, a swap card's Replaces row).
    try {
      if (typeof page.setView === 'function') page.setView(step.seat ?? 0, false);
    } catch (e) {
      /* warm-up only */
    }
    try {
      const sys = run();
      if (sys) page.render(prepaintViews(sys.view())[step.view]);
    } catch (e) {
      /* warm-up only */
    }
    for (const card of page.el.querySelectorAll('.rn-card.rn-legendary')) {
      const band = document.createElement('i');
      band.className = 'rn-shine';
      card.appendChild(band);
      prepaintShines.push(band);
    }
    // The shop's veil is a ~12% dim: drawn at its real opacity here (a
    // quarter-second of dim in camp, ~0.4 s after boot) because a veil inside
    // an opacity group is drawn through an offscreen layer with a different
    // pipeline than the one the real open uses. The full storybook veil of
    // the other pages stays at 2/1000 — it would be a black flash.
    veil.style.opacity = step.light ? '1' : '0.002';
    prepaintSeedsEnsure();
    prepaintSeedsShow(true);
    fitScale(page.el);
    void rootEl.offsetHeight; // force the layout NOW, on this frame
    prepaintHold = step.frames;
  }

  // Per-frame state changes inside a step, so the strips get PARTIAL repaints
  // (the msaa-load variants): a hover lift, a denial shake, the shine band.
  function prepaintMutate(step, left) {
    if (step.screen !== 'shop') return;
    const cards = prepaintPage ? prepaintPage.querySelectorAll('.rn-card') : [];
    if (left === step.frames - 3 && cards[0]) cards[0].classList.add('rn-hover');
    if (left === step.frames - 9 && cards[0]) cards[0].classList.remove('rn-hover');
    if (left === step.frames - 6) {
      try { screens.shop.denyShake(2); } catch (e) { /* warm-up only */ }
    }
  }

  // The pages the pre-paint switched to an ally's tab open on their own tab
  // again (the draft re-picks it in open(); the shop keeps its tab, so it is
  // put back here without a render).
  function prepaintResetViews() {
    try {
      if (typeof screens.shop.resetView === 'function') screens.shop.resetView();
    } catch (e) {
      /* warm-up only */
    }
  }

  function prepaintEnd() {
    prepaintResetViews();
    prepaintHidePage();
    prepaintSeedsRemove();
    prepaintStep = PREPAINT_SEQ.length;
    prepaintLog.step = null;
    prepaintLog.done = Math.round(performance.now());
    try { performance.mark('prepaint-end'); } catch (e) { /* trace marker only */ }
    signature = ''; // the synthetic content above must never be mistaken for state
    rootEl.classList.remove('rn-open', 'rn-dock', 'rn-victory', 'rn-defeat');
    veil.classList.remove('rn-open', 'rn-light', 'rn-victory', 'rn-defeat', 'rn-transit');
    rootEl.style.opacity = '';
    rootEl.style.pointerEvents = '';
    veil.style.opacity = '';
    rootEl.style.transition = '';
    veil.style.transition = '';
  }

  // A real page opened while the warm-up was still running (only possible
  // with `?run=1` and a very fast first room): drop the synthetic page and the
  // overrides, keep the classes setScreen() has just set.
  function prepaintAbort() {
    prepaintResetViews();
    prepaintHidePage();
    prepaintSeedsRemove();
    prepaintStep = PREPAINT_SEQ.length;
    prepaintLog.step = null;
    prepaintLog.done = Math.round(performance.now());
    rootEl.style.opacity = '';
    rootEl.style.pointerEvents = '';
    veil.style.opacity = '';
    rootEl.style.transition = '';
    veil.style.transition = '';
  }

  function prepaint() {
    if (prepaintWait > 0) {
      prepaintWait -= 1;
      return;
    }
    if (prepaintStep < 0) {
      prepaintLog.started = Math.round(performance.now());
      try { performance.mark('prepaint-start'); } catch (e) { /* trace marker only */ }
      rootEl.style.transition = 'none';
      veil.style.transition = 'none';
      rootEl.style.opacity = '0.002';
      rootEl.style.pointerEvents = 'none'; // on screen for a few frames — it must not eat a click
      veil.style.opacity = '0.002';
      prepaintStep = 0;
      prepaintBegin(PREPAINT_SEQ[0]);
    } else if (--prepaintHold <= 0) {
      prepaintStep += 1;
      if (prepaintDone()) {
        prepaintEnd();
        return;
      }
      prepaintBegin(PREPAINT_SEQ[prepaintStep]);
    }
    const step = PREPAINT_SEQ[prepaintStep];
    prepaintSeedsShow(prepaintHold > step.frames / 2);
    prepaintMutate(step, prepaintHold);
    prepaintLog.frames += 1;
    driveShines(performance.now(), prepaintShines);
  }

  function update() {
    maybeAutostart();
    const sys = run();
    if (!sys) return;
    const v = sys.view();
    relicStrip.update(v); // RELICS: the strip under the Glint plate
    eventPlate.update(v); // EVENT ROOMS: the plate over a "?" room
    setScreen(SCREEN_FOR[v.phase] ?? 'none');
    setVeilTone(v.phase);
    fade.classList.toggle('rn-on', v.phase === 'fade');
    if (!prepaintDone()) {
      if (current === 'none') prepaint();
      else if (prepaintStep >= 0) prepaintAbort();
    }
    if (current === 'none') return;
    const sig = sigOf(v);
    // PARTY: a page that changed its own view (a character switch, a moved
    // Replaces mark) asks for a repaint too.
    const pageDirty = typeof screens[current].dirty === 'function' && screens[current].dirty();
    if (sig !== signature || pageDirty) {
      signature = sig;
      screens[current].render(v);
      refreshShines(); // the render replaced the card DOM
      fitScale(); // content changed => the page's layout height may have changed
    }
    // Per-frame page work (the transition card's progress bar / readiness).
    if (typeof screens[current].tick === 'function') screens[current].tick(v);
    driveShines(performance.now());
  }

  // ----------------------------------------------------------- input --
  window.addEventListener(
    'keydown',
    (e) => {
      const code = e.code;
      const fresh = !e.repeat && !stale.has(code) && !held.has(code);
      held.add(code);
      if (current === 'none') return;
      // The socket screen is the topmost modal (§16 chains a taken node
      // straight into it); while it is open it owns the keyboard.
      if (socket && socket.isOpen()) return;
      // A combat-only key on a page = the fight pattern is still running:
      // restart the settle (see the settle-window note; capped there).
      if ((CARRY_KEYS.has(code) || isPlayKey(code)) && !e.repeat) carryAt = performance.now();
      const nav = NAV_KEYS.has(code);
      if ((nav || COMMIT_KEYS.has(code)) && !settled()) {
        // Settle window: the press belongs to the fight that just ended, not
        // to this page. It is also marked stale so that HOLDING it past the
        // window can never make it count — release, then press again.
        stale.add(code);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (nav && !fresh) {
        // A choose key that was down when the page opened (or is auto-
        // repeating) never moves the focus: a page's focus only ever moves on
        // a deliberate press made while the page was already up.
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (screens[current].key(code, fresh, e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );
  window.addEventListener(
    'keyup',
    (e) => {
      held.delete(e.code);
      stale.delete(e.code);
    },
    true
  );
  window.addEventListener('blur', () => {
    held.clear();
    stale.clear();
  });

  // ------------------------------------------------------- sim events --
  // §16 insufficient funds: plaque emphasis + one ~300 ms shake, driven by the
  // sim's own denial event so a scripted buy shakes exactly like a click.
  bus.on('currency_denied', (ev) => {
    if (current === 'shop') screens.shop.denyShakeSeat(ev); // PARTY: the shelf on show
  });
  // §16 purchase: "price-stamp flash -> card departs to the bench". The sim
  // emits `shop_purchase` BEFORE the shelf re-renders, so the screen only
  // records which index was bought and starts its choreography (card flip ->
  // SOLD ribbon slam -> coin-fly into the Glint strip) on the freshly built
  // card. Without this wire the purchase was an instant swap, which is exactly
  // what round-1 critics scored 1/2 on motion juice.
  bus.on('shop_purchase', (ev) => {
    if (current === 'shop') screens.shop.onPurchase(ev);
  });
  // RELICS slice 2: the relic shelf's own buy flare and denial shake.
  // SHOP REFRESH: the shelf flip on the viewed shelf, and the button's shake.
  bus.on('shop_refresh', (ev) => {
    if (current === 'shop') screens.shop.onRefresh(ev);
  });
  bus.on('refresh_denied', (ev) => {
    if (current === 'shop') screens.shop.onRefreshDenied(ev);
  });
  bus.on('relic_purchase', (ev) => {
    if (current === 'shop') screens.shop.onRelicPurchase(ev);
  });
  bus.on('relic_denied', (ev) => {
    if (current === 'shop') screens.shop.onRelicDenied(ev);
  });
  // §16: "Taking a node chains straight into the Socket screen with the
  // candidate pre-focused." The socket screen owns that focus; we only open it.
  // `ev.reward` (not `ev.type`): the bus builds events as
  // `{ tick, type, ...payload }`, so the reward's kind cannot live on `type`
  // without erasing the event's own name — see the note in sim/run.js.
  bus.on('draft_taken', (ev) => {
    // v0.5.227: the Healer's card chains to its socket screen only for the
    // player who plays the Healer; an AI Healer sockets its own nodes.
    if (viewerSeat() !== 0) return;
    if (ev.reward === 'node' && socket) socket.cmd('openSocket');
    // Ruling A17: a taken SWAP whose replaced skill held nodes chains into the
    // socket screen too — the released nodes wait on the bench with the
    // auto-fill offered (F).
    if (ev.reward === 'skill' && ev.swap && Array.isArray(ev.released) && ev.released.length > 0 && socket)
      socket.cmd('openSocket', { released: ev.released.length });
  });
  // PARTY: one toast for an old save's ally catch-up (PLAN §16.6) and for a
  // network auto-pick (PLAN §16.5: the owner's line says nothing is lost).
  bus.on('party_catchup', (ev) => {
    const a = service('app');
    const each = ev.perSeat ? Math.max(...Object.values(ev.perSeat)) : 0;
    if (a && typeof a.toast === 'function') a.toast(t('Your allies caught up: {n} nodes each', { n: each }), { tone: 'info', ms: 5200 });
  });
  bus.on('party_autopick', (ev) => {
    const a = service('app');
    if (!a || typeof a.toast !== 'function') return;
    const cls = ['Healer', 'Tank', 'Swordsman', 'Archer'][ev.seat];
    const who = cls ? t(cls) : t('party');
    if (ev.reason === 'door_timeout') a.toast(t("Time's up — the left door was taken"), { tone: 'info', ms: 4200 });
    else {
      const mine = ev.seat === ownSeat();
      const msg = ev.choice === 'take'
        ? (mine ? t("Time's up — the {who}'s reward was picked (taken) — you can re-socket it between rooms", { who }) : t("Time's up — the {who}'s reward was picked (taken)", { who }))
        : (mine ? t("Time's up — the {who}'s reward was picked (left) — you can re-socket it between rooms", { who }) : t("Time's up — the {who}'s reward was picked (left)", { who }));
      a.toast(msg, { tone: 'info', ms: 4800 });
    }
  });
  function ownSeat() {
    return viewerSeat();
  }
  // RELICS: a toast when the party walks into a cursed room (the strip
  // carries it for the rest of the room).
  bus.on('curse_apply', (ev) => {
    const a = service('app');
    const c = CURSES[ev.curse];
    if (!a || typeof a.toast !== 'function' || !c) return;
    if (c.major) a.toast(t('Bound for the run: {name}. {text} Clear this room for a greater relic.', { name: t(c.name), text: t(c.text) }), { tone: 'info', ms: 6000 });
    else a.toast(t('Cursed room: {name}. {text} Clear it for a relic.', { name: t(c.name), text: t(c.text) }), { tone: 'info', ms: 5200 });
  });
  // EVENT ROOMS: what an encounter paid out when no page follows it, and
  // what it took (the spirit's relic, the altar's curse).
  bus.on('event_take', (ev) => {
    const a = service('app');
    if (!a || typeof a.toast !== 'function') return;
    const name = ENCOUNTERS[ev.encounter] ? t(ENCOUNTERS[ev.encounter].name) : '';
    const r = ev.relic ? RELICS[ev.relic] : null;
    const c = ev.curse ? CURSES[ev.curse] : null;
    if (ev.encounter === 'wishing_well' && r) a.toast(t('The well gives a relic: {name}. {text}', { name: t(r.name), text: t(r.text) }), { tone: 'info', ms: 5600 });
    else if (ev.encounter === 'wishing_well') a.toast(t('The well gives back {n} Glint.', { n: ev.glint ?? 0 }), { tone: 'info', ms: 4200 });
    else if (ev.encounter === 'forgotten_cache') a.toast(t('{name}: +{n} Glint, and some for each ally.', { name, n: ev.glint ?? 0 }), { tone: 'info', ms: 4200 });
    else if (ev.encounter === 'healing_spring') a.toast(t('{name}: the party is whole again.', { name }), { tone: 'info', ms: 4200 });
    else if (ev.encounter === 'trapped_chest') a.toast(t('Ambush! Win the fight to open the chest.'), { tone: 'info', ms: 4200 });
    else if (c) a.toast(t('Bound for the run: {name}. {text}', { name: t(c.name), text: t(c.text) }), { tone: 'info', ms: 6000 });
  });
  bus.on('relic_lose', (ev) => {
    const a = service('app');
    const r = RELICS[ev.relic];
    if (a && typeof a.toast === 'function' && r) a.toast(t('The spirit takes {name}.', { name: t(r.name) }), { tone: 'info', ms: 4200 });
  });
  // Slice 2: an elite's relic drop, a relic bought at the peddler.
  bus.on('relic_drop', (ev) => {
    const a = service('app');
    const r = RELICS[ev.relic];
    if (a && typeof a.toast === 'function' && r) a.toast(t('The elite dropped a relic: {name}. {text}', { name: t(r.name), text: t(r.text) }), { tone: 'info', ms: 5600 });
  });
  bus.on('relic_purchase', (ev) => {
    const a = service('app');
    const r = RELICS[ev.relic];
    if (a && typeof a.toast === 'function' && r) a.toast(t('{name} joins the party. {text}', { name: t(r.name), text: t(r.text) }), { tone: 'info', ms: 4200 });
  });
  // A run ending or a room starting must never leave a page hanging.
  bus.on('room_start', () => setScreen('none'));

  // `?run=1` boots straight into room 1 (the camp hub that normally starts a
  // run is its own block). It is DEFERRED to the first update with a ticked
  // sim: starting a run before tick 1 would run the room-boundary sweep over
  // ally bodies the AI has not spun up yet.
  // @gnt:M2 RESTORE-RESYNC begin — one `state_restored` handler: close the
  // page or re-open the one run.view() implies (PLAN §3.4 rule 5). Closing
  // is enough: the next update() opens SCREEN_FOR[phase] FRESH — its own
  // focus, a new settle window, every held key (the Enter that confirmed the
  // load) marked stale — so a load can never commit a pick by itself.
  bus.on('state_restored', () => {
    setScreen('none');
    signature = '';
  });
  // @gnt:M2 RESTORE-RESYNC end
  // @gnt:M5b GUEST-GUARD begin — guests see pages read-only ("The Healer is
  // choosing…"); their presses become CMD pings, never sim calls.
  // The guard itself is the net session's run-system proxy (every mutating
  // call on a guest becomes a CMD the host answers command_rejected + a
  // party-wide ping); this block adds what the guest SEES: a banner that
  // says who decides, and the ping highlight on the card / door / item a
  // party member pointed at (`net_ping`, a view-only replayed event).
  const guestNote = document.createElement('div');
  guestNote.className = 'nt-guest-note';
  guestNote.style.cssText =
    'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:70;padding:8px 18px;border-radius:12px;' +
    `background:${'#221F1B'}EE;color:#F4EFE6;font:700 18px/1.2 "Nunito","Trebuchet MS",system-ui,var(--i18n-font, sans-serif);` +
    'border:1px solid #9C918688;pointer-events:none;display:none;';
  document.body.appendChild(guestNote);
  const pingCss = document.createElement('style');
  pingCss.textContent = '.nt-pinged { outline: 3px solid #E8A23D !important; outline-offset: 4px; transition: outline-color 0.2s; }';
  document.head.appendChild(pingCss);
  const netGuest = () => {
    const n = service('net');
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };
  // Who decides: the host's seat — the Healer, unless a migration moved the
  // host and a human is back on the Healer (then the host's class decides;
  // net/seats.js chooserSeat).
  const GUEST_LINES = {
    draft: (w) => t('The {cls} is choosing the reward…', { cls: t(w) }),
    path: (w) => t('The {cls} picks the door — point with ←/→ and Enter', { cls: t(w) }),
    shop: (w) => t('The {cls} is shopping…', { cls: t(w) }),
    end: (w) => t('Waiting for the {cls}…', { cls: t(w) }),
    transit: (w) => t('The {cls} leads on to the next level…', { cls: t(w) }),
  };
  const chooserLabel = () => {
    const n = service('net');
    try {
      return (n && n.session && typeof n.session.chooserLabel === 'function' && n.session.chooserLabel()) || 'Healer';
    } catch {
      return 'Healer';
    }
  };
  // PARTY (PLAN §16.5): per tab — the guest's OWN card / shelf is its to
  // decide (no banner, or its own countdown); another tab says who decides.
  const SEAT_NAME = ['Healer', 'Tank', 'Swordsman', 'Archer'];
  function partyTabLine(w) {
    if (current !== 'draft' && current !== 'shop') return null;
    const sc = screens[current];
    const pr = sc && typeof sc.probe === 'function' ? sc.probe() : null;
    const v = world.runSystem() ? world.runSystem().view() : null;
    const party = current === 'draft' ? v && v.party : v && v.partyShop;
    if (!pr || !party) return null;
    const seat = pr.viewSeat;
    const me = ownSeat();
    const left = current === 'draft' ? party.deadlineInTicks : [party.leaveInTicks, party.deadlineInTicks].filter((t) => t !== null && t !== undefined).reduce((a, b) => Math.min(a, b), Infinity);
    const timed = Number.isFinite(left) && left !== null && left <= 600;
    const secs = timed ? Math.max(0, Math.ceil(left / 60)) : 0;
    if (seat === me) {
      if (current === 'draft') {
        const c = party.cards && party.cards[seat];
        if (c && c.decided) return timed ? t('Your pick is in — waiting for the party — {secs} s', { secs }) : t('Your pick is in — waiting for the party');
        return timed ? t('Your card — auto-pick — {secs} s', { secs }) : '';
      }
      if (party.done && party.done[seat]) return timed ? t('Done — waiting for the party — {secs} s', { secs }) : t('Done — waiting for the party');
      return timed ? t('The shop closes — {secs} s', { secs }) : '';
    }
    const owners = current === 'draft' ? party.owners : null;
    const human = seat === 0 || (owners ? owners[seat] === 'human' : false);
    const cls = t(w);
    const ally = t(SEAT_NAME[seat] ?? '');
    const up = (x) => `${x.charAt(0).toUpperCase()}${x.slice(1)}`;
    if (current === 'draft') {
      if (seat === 0) return up(timed ? t('{cls} is choosing… — {secs} s', { cls, secs }) : t('{cls} is choosing…', { cls }));
      if (human) return up(timed ? t("{ally}'s player is choosing… — {secs} s", { ally, secs }) : t("{ally}'s player is choosing…", { ally }));
      return up(timed ? t('The {cls} (for the {ally}) is choosing… — {secs} s', { cls, ally, secs }) : t('The {cls} (for the {ally}) is choosing…', { cls, ally }));
    }
    if (seat === 0) return up(timed ? t('{cls} is shopping… — {secs} s', { cls, secs }) : t('{cls} is shopping…', { cls }));
    if (human) return up(timed ? t("{ally}'s player is shopping… — {secs} s", { ally, secs }) : t("{ally}'s player is shopping…", { ally }));
    return up(timed ? t('The {cls} (for the {ally}) is shopping… — {secs} s', { cls, ally, secs }) : t('The {cls} (for the {ally}) is shopping…', { cls, ally }));
  }
  function syncGuestNote() {
    const on = current !== 'none' && netGuest();
    const w = on ? chooserLabel() : 'Healer';
    const tab = on ? partyTabLine(w) : null;
    const text = on ? (tab !== null ? tab : GUEST_LINES[current] ? GUEST_LINES[current](w) : t('The {cls} is choosing…', { cls: t(w) })) : '';
    const changed = guestNote.textContent !== text || guestNote.style.display !== (on && text ? '' : 'none');
    if (guestNote.textContent !== text) guestNote.textContent = text;
    const disp = on && text ? '' : 'none';
    if (guestNote.style.display !== disp) guestNote.style.display = disp;
    placeGuestNote(disp === '', changed);
  }
  // fix-M5a-r5 (NET5-F1 family, 2026-09-30): the note never covers the page
  // it talks about (at 1024x576 the party page starts 8 px from the top, so
  // the note sat on the party strip — over the viewed tab's caret). In
  // order: top centre while the page leaves room above it; a compact 16 px
  // line in the band above the page; in the band under it (clear of the
  // command bar and the network chip); beside a narrow page (the doors);
  // in the command bar's row right of the bar (wrapping to its width).
  // Where none is free — and while the socket screen is open (its header
  // shows its own countdown) — it steps aside: the page's party strip /
  // countdown carries the same news. Re-placed at once when the line
  // changes, else at 10 Hz when the page, bar or window moved.
  let notePlacedAt = 0;
  let noteSig = '';
  const NOTE_FULL = { top: '14px', left: '50%', transform: 'translateX(-50%)', padding: '8px 18px', fontSize: '18px', lineHeight: '1.2', maxWidth: '', whiteSpace: 'nowrap', textAlign: '' };
  const NOTE_COMPACT = { ...NOTE_FULL, top: '4px', padding: '4px 14px', fontSize: '16px' };
  const rectOf = (sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };
  function placeGuestNote(shown, now = false) {
    if (!shown) return;
    const t = performance.now();
    if (!now && t - notePlacedAt < 100) return;
    notePlacedAt = t;
    const sockOpen = !!(socket && typeof socket.isOpen === 'function' && socket.isOpen());
    const pg = current !== 'none' && screens[current] ? screens[current].el : null;
    const pr = !sockOpen && pg && pg.style.display !== 'none' ? pg.getBoundingClientRect() : null;
    const chipR = rectOf('#nt-hud:not(.nt-off) .nt-chip');
    const br = rectOf('.hud-bar');
    const q = (r) => (r ? `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}` : '-');
    const sig = `${sockOpen}|${window.innerWidth}x${window.innerHeight}|${q(pr)}|${q(chipR)}|${q(br)}|${guestNote.textContent}`;
    if (!now && sig === noteSig) return;
    noteSig = sig;
    const setPlace = (where, css, hidden = false) => {
      guestNote.dataset.place = where;
      for (const k of Object.keys(css)) guestNote.style[k] = css[k];
      guestNote.style.visibility = hidden ? 'hidden' : '';
    };
    if (sockOpen) return setPlace('aside', NOTE_FULL, true);
    setPlace('top', NOTE_FULL);
    if (!pr || pr.height <= 0) return;
    const PAD = 4;
    const fps = rectOf('#fps-meter');
    const obstacles = [[pr, PAD], [chipR, PAD], [fps, 2]].filter(([o]) => o);
    const clear = (r) => r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight && obstacles.every(([o, pad]) => r.right <= o.left - pad || r.left >= o.right + pad || r.bottom <= o.top - pad || r.top >= o.bottom + pad);
    const at = (where, css) => {
      setPlace(where, css);
      return clear(guestNote.getBoundingClientRect());
    };
    if (clear(guestNote.getBoundingClientRect())) return;
    setPlace('top', NOTE_COMPACT);
    const h = guestNote.getBoundingClientRect().height;
    if (pr.top - PAD >= h + 4 && at('top-compact', { ...NOTE_COMPACT, top: `${Math.max(4, Math.round((pr.top - h) / 2))}px` })) return;
    const limit = br ? br.top : window.innerHeight;
    if (limit - pr.bottom >= h + 2 * PAD && at('under-page', { ...NOTE_COMPACT, top: `${Math.round(pr.bottom + (limit - pr.bottom - h) / 2)}px` })) return;
    // Wrapped variants (a column beside the page / the bar): 16 px, 1.1 lines.
    const wrapCss = (x0, room) => ({ ...NOTE_COMPACT, left: `${x0}px`, transform: 'none', maxWidth: `${room - 26}px`, whiteSpace: 'normal', padding: '3px 12px', lineHeight: '1.1', textAlign: 'left' });
    const besideX = Math.round(pr.right + 12);
    const besideRoom = window.innerWidth - 14 - besideX;
    if (besideRoom >= 200) {
      setPlace('beside-page', wrapCss(besideX, besideRoom));
      const r = guestNote.getBoundingClientRect();
      if (at('beside-page', { ...wrapCss(besideX, besideRoom), top: `${Math.round(pr.top + Math.max(0, (pr.height - r.height) / 2))}px` })) return;
    }
    if (br) {
      const x0 = Math.round(br.right + 10);
      const room = window.innerWidth - 14 - x0;
      if (room >= 160) {
        setPlace('bar-right', wrapCss(x0, room));
        const r = guestNote.getBoundingClientRect();
        // Top-aligned with the bar (the corner's fps meter sits low).
        if (r.height <= br.height && at('bar-right', { ...wrapCss(x0, room), top: `${Math.round(br.top + 1)}px` })) return;
      }
    }
    setPlace('aside', NOTE_FULL, true);
  }
  bus.on('net_ping', (ev) => {
    if (current === 'none' || !Number.isInteger(ev.index)) return;
    const page = screens[current] && screens[current].el;
    if (!page) return;
    const items = [...page.querySelectorAll(current === 'path' ? '.rn-door' : '.rn-card')];
    const el = items[ev.index];
    if (!el) return;
    el.classList.add('nt-pinged');
    setTimeout(() => el.classList.remove('nt-pinged'), 1400);
  });
  const pageUpdate = update;
  // eslint-disable-next-line no-func-assign
  update = function guestAwareUpdate() {
    pageUpdate();
    syncGuestNote();
  };
  // @gnt:M5b GUEST-GUARD end
  // @gnt:M3 RUN-NAV-SOUND begin — fix-M3-r5 AUD5-F1 (PLAN §3.5 "app nav ->
  // UI bus"): moving the selection on a build page ticks exactly like a menu
  // move — the character tab (Q / E, F1-F4, LB / RB, a tab click), Take /
  // Leave (A / D), the Replaces mark (W / S, wheel, a click), the doors, the
  // shop's card focus — by keyboard, pad and pointer, and the pointer
  // entering a page's button / door / card / tab ticks once (a hover). The
  // pages only report a cheap signature (page.sel()); src/audio/uiselect.js
  // decides and emits the app `nav` event the audio engine already plays.
  // Commit keys never tick (their own cue plays: draft_take, path, purchase).
  const selSound = createSelectionSound('run');
  const SEL_COMMIT_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'KeyX', 'KeyR', 'Escape']);
  const HOVER_SEL = {
    draft: '.rn-btn, .rn-rep, .rn-ptab',
    path: '.rn-doorwrap',
    shop: '.rn-card, .rn-suggest, .rn-advance, .rn-refresh, .rn-ptab',
    end: '.rn-btn',
  };
  const pageOpen = () => current !== 'none' && !(socket && socket.isOpen());
  window.addEventListener(
    'keydown',
    (e) => {
      // A key the page drops (the settle window, a held key) moves nothing.
      if (!pageOpen() || !settled() || e.repeat) return;
      selSound.input('keyboard', SEL_COMMIT_KEYS.has(e.code));
    },
    true
  );
  let hoverKey = null;
  let lastPX = null;
  let lastPY = null;
  rootEl.addEventListener(
    'pointermove',
    (e) => {
      // Real pointer motion only (a page opening under a still cursor, or a
      // re-render under it, makes the browser re-send the SAME position).
      const moved = e.clientX !== lastPX || e.clientY !== lastPY;
      lastPX = e.clientX;
      lastPY = e.clientY;
      if (!pageOpen() || e.pointerType === 'touch' || !moved) return;
      selSound.input('mouse', false);
      const q = HOVER_SEL[current];
      const el = q && e.target && e.target.closest ? e.target.closest(q) : null;
      // Keyed by the item's place on the page, so a rebuilt card under the
      // cursor is the same item, not a new hover.
      const key = el && !el.closest('.rn-sold') ? `${current}:${[...screens[current].el.querySelectorAll(q)].indexOf(el)}` : null;
      if (key === hoverKey) return;
      hoverKey = key;
      if (key && settled()) selSound.hover(current);
    },
    { passive: true }
  );
  rootEl.addEventListener('pointerleave', () => (hoverKey = null), { passive: true });
  for (const type of ['pointerdown', 'wheel']) rootEl.addEventListener(type, () => pageOpen() && selSound.input('mouse', false), { passive: true, capture: true });
  const selUpdate = update;
  // eslint-disable-next-line no-func-assign
  update = function selectionAwareUpdate() {
    selUpdate();
    const s = current === 'none' ? null : screens[current];
    if (current === 'none') hoverKey = null;
    selSound.poll(current, s && typeof s.sel === 'function' ? s.sel() : null);
  };
  // @gnt:M3 RUN-NAV-SOUND end
  let pendingAutostart = !!autostart;
  function maybeAutostart() {
    if (!pendingAutostart || world.tick < 1) return;
    pendingAutostart = false;
    // `?run=1&act=N` (PLAN §6.1): the expedition and the Gameplay-tab
    // challenge ride startRun, exactly like the portal press.
    const p = parseBootParams();
    const challenge = service('settings')?.get?.('gameplay.challenge') ?? 'standard';
    run().startRun({ act: p.act ?? 1, challenge });
  }

  // PARTY (PLAN §16.4): the pad on the build pages (app.js routes it here
  // when no app screen is open) — the current page's pad(); a page still
  // arriving drops navigation / commits exactly like the keyboard's settle.
  function padAction(action) {
    if (current === 'none' || (socket && socket.isOpen())) return false;
    const s = screens[current];
    if (!s || typeof s.pad !== 'function') return false;
    if (!settled()) return true;
    selSound.input('gamepad', action === 'confirm' || action === 'secondary'); // @gnt:M3 RUN-NAV-SOUND (fix-M3-r5)
    const used = s.pad(action);
    if (used) signature = '';
    return used;
  }

  return {
    update,
    padAction,
    isOpen: () => current !== 'none',
    screen: () => current,
    debug: () => {
      const v = run().view();
      const doors = [...rootEl.querySelectorAll('.rn-doorwrap')].map((w) => {
        const d = w.querySelector('.rn-door');
        const r = d.getBoundingClientRect();
        return {
          win: w.querySelector('.rn-gwin').textContent,
          reward: w.querySelector('.rn-grew').textContent,
          // Every text node inside the panel — proof that a door carries the
          // two glyphs and nothing else.
          glyphs: [...d.querySelectorAll('*')]
            .map((n) => n.textContent.trim())
            .filter((t) => t.length > 0),
          focused: d.classList.contains('rn-focus'),
          box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        };
      });
      const buttons = [...rootEl.querySelectorAll('.rn-page:not([style*="display: none"]) .rn-btn')]
        .filter((b) => b.offsetParent !== null)
        .map((b) => b.textContent.trim());
      const cards = [...rootEl.querySelectorAll('.rn-page:not([style*="display: none"]) .rn-card')]
        .filter((c) => c.offsetParent !== null)
        .map((c) => {
          const r = c.getBoundingClientRect();
          const st = getComputedStyle(c);
          return {
            name: c.querySelector('.rn-cardname')?.textContent ?? '',
            opacity: Number(st.opacity),
            filter: st.filter,
            box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
          };
        });
      const plaques = [...rootEl.querySelectorAll('.rn-plaque')].map((p) => ({
        price: p.querySelector('.rn-price')?.textContent ?? '',
        shaking: p.classList.contains('rn-deny'),
      }));
      // §17 type-floor audit: every text/numeral node the live page draws,
      // in REAL px (authored px x the live --rn-s). A critic can read the
      // floors straight off this instead of trusting the CSS.
      const pageEl = current === 'none' ? null : screens[current].el;
      const typeAudit = [];
      if (pageEl) {
        const s = lastFit.s;
        for (const n of pageEl.querySelectorAll('*')) {
          if (n.offsetParent === null && n !== pageEl) continue;
          const txt = [...n.childNodes]
            .filter((c) => c.nodeType === 3)
            .map((c) => c.textContent.trim())
            .join('');
          if (!txt) continue;
          const fs = parseFloat(getComputedStyle(n).fontSize);
          const cls = String(n.className || '');
          // §17's numeral floor is about NUMERAL FIELDS (tabular-nums:
          // HP/timer/price/count), not about prose that happens to contain a
          // digit ("within 2.2 u"). Classify by role, not by regex.
          const numeral = ['rn-num', 'rn-price', 'rn-amt', 'rn-stats'].some((c) =>
            n.classList.contains(c)
          );
          typeAudit.push({
            cls: cls || n.tagName.toLowerCase(),
            txt: txt.slice(0, 22),
            authored: fs,
            real: Math.round(fs * s * 100) / 100,
            numeral,
          });
        }
      }
      const floors = {
        minText: typeAudit.length ? Math.min(...typeAudit.map((t) => t.real)) : null,
        minNumeral: typeAudit.filter((t) => t.numeral).length
          ? Math.min(...typeAudit.filter((t) => t.numeral).map((t) => t.real))
          : null,
      };
      return {
        screen: current,
        phase: v.phase,
        room: v.room,
        prepaint: { ...prepaintLog },
        fit: lastFit,
        floors,
        typeAudit,
        wallet: v.wallet,
        freeSkillSlots: v.freeSkillSlots,
        open: current !== 'none',
        held: [...held],
        stale: [...stale],
        // Settle-window probe surface (F1): how long the current page has been
        // up, whether it is taking navigation/commit keys yet, and the window.
        sinceOpenMs: current === 'none' ? null : Math.round(sinceOpen()),
        settled: current !== 'none' && settled(),
        settleInMs: current === 'none' ? null : Math.max(0, Math.round(settleAt() - performance.now())),
        carryMs: current !== 'none' && carryAt > openedAt ? Math.round(performance.now() - carryAt) : null,
        graceMs: GRACE_MS,
        settleMaxMs: SETTLE_MAX_MS,
        text: current === 'none' ? '' : screens[current].el.textContent.replace(/\s+/g, ' ').trim(),
        subline: rootEl.querySelector('.rn-subline')?.textContent ?? '',
        doors,
        buttons,
        cards,
        plaques,
        owned: [...rootEl.querySelectorAll('.rn-owned')].map((n) => n.textContent.trim()),
        fade: fade.classList.contains('rn-on'),
        veil: { open: veil.classList.contains('rn-open'), tone: veil.className },
        // --------------------------------------------- shop probe surface --
        // The purchase choreography is ~620 ms and one harness screenshot
        // costs several hundred ms of page time, so a scripted capture can
        // miss the whole thing (round-1 critics saw only the finished SOLD
        // card and scored motion 1/2). shopPin(ms) freezes the animation
        // clock at a chosen offset — the same step function, told what time
        // it is — so a capture can photograph any phase; shopPin(null) hands
        // the clock back and the choreography finishes normally.
        // Ruling A17: the draft page's swap state (focus 0 Take / 1 Leave,
        // the Replaces mark, the 4 owned ids).
        draft: typeof screens.draft.probe === 'function' ? screens.draft.probe() : null,
        // PARTY: the shop's viewed tab, card owners and lamp copy.
        shop: typeof screens.shop.probe === 'function' ? screens.shop.probe() : null,
        shopAnim: () => screens.shop.animState(),
        shopPin: (ms) => screens.shop.pin(ms),
      };
    },
  };
}
