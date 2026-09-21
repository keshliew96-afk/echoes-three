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
import { RUN_CSS, isCompact } from './style.js';
import { SKILL_SLOTS } from '../../core/constants.js';
import { parseBootParams } from '../../app/params.js';
import { service } from '../../app/registry.js';
import { createDraftScreen } from './draft.js';
import { createPathScreen } from './path.js';
import { createShopScreen } from './shop.js';
import { createEndScreen } from './endscreens.js';

// phase -> screen name. Anything absent means "no meta screen".
const SCREEN_FOR = {
  reward: 'draft',
  path: 'path',
  shop: 'shop',
  victory: 'end',
  defeat: 'end',
};

export function createRunUi({ bus, world, socket = null, autostart = false }) {
  const style = document.createElement('style');
  style.id = 'run-style';
  style.textContent = RUN_CSS;
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

  const screens = {
    draft: createDraftScreen({ run, build }),
    path: createPathScreen({ run }),
    shop: createShopScreen({ run, build }),
    end: createEndScreen({ run }),
  };
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
    const s = Math.max(MIN_SCALE, fit);
    rootEl.style.setProperty('--rn-s', s.toFixed(4));
    lastFit = { s, compact, reserve, fit: Math.round(fit * 1e4) / 1e4, page: { w, h } };
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
  const NAV_KEYS = new Set(['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight']);
  // X (the draft's decline, ruling A13) is a commit key: settle-guarded and
  // fresh-press only, exactly like Enter.
  const COMMIT_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'KeyX']);
  // §23.9: the carry-over set follows the skill keys (Digit1..Digit8).
  const CARRY_KEYS = new Set([
    ...Array.from({ length: SKILL_SLOTS }, (_, i) => `Digit${i + 1}`),
    'KeyW', 'KeyS', 'KeyR', 'KeyE', 'Tab', 'F1', 'F2', 'F3', 'F4',
  ]);
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
    veil.classList.toggle('rn-victory', phase === 'victory');
    veil.classList.toggle('rn-defeat', phase === 'defeat');
    rootEl.classList.toggle('rn-victory', phase === 'victory');
    rootEl.classList.toggle('rn-defeat', phase === 'defeat');
  }

  // A cheap signature so a screen only re-renders when something it draws has
  // actually changed (the shop's shake animation must never be restarted by an
  // unrelated repaint).
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
      p ? `${p.nextRoom}:${p.focus}:${p.options.map((o) => o.win + o.reward).join(',')}` : '-',
      s ? s.stock.map((i) => `${i.node}${i.price}${i.sold ? 'x' : ''}${i.owned}`).join('|') : '-',
      v.summary ? `${v.summary.result}:${v.summary.rooms}:${v.summary.glint}` : '-',
    ].join('/');
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
    const t = `translateX(${x.toFixed(2)}%)`;
    for (const band of list) band.style.transform = t;
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
  const PREPAINT_WAIT = 20;
  const PREPAINT_SEQ = [
    { screen: 'shop', view: 'shop', frames: 16, dock: true, light: true },
    { screen: 'draft', view: 'draft', frames: 4 },
    { screen: 'path', view: 'path', frames: 4 },
    { screen: 'end', view: 'victory', frames: 4, tone: 'victory' },
    { screen: 'end', view: 'defeat', frames: 3, tone: 'defeat' },
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
    return {
      shop: {
        ...base,
        shop: {
          wallet: 42,
          stock: [
            { node: 'ascend', price: 35, sold: false, owned: false, affordable: true, rarity: 'legendary' },
            { node: 'bounce', price: 25, sold: true, owned: true, affordable: true, rarity: 'common' },
            { node: 'echo', price: 30, sold: false, owned: false, affordable: false, rarity: 'rare' },
          ],
        },
      },
      draft: {
        ...base,
        room: 1,
        freeSkillSlots: 0,
        reward: { type: 'node', id: 'ascend', substituted: false, line: null },
      },
      path: {
        ...base,
        path: {
          freeSkillSlots: 1,
          nextRoom: 4,
          options: [
            { win: 'kill_all', reward: 'skill' },
            { win: 'defend', reward: 'node' },
          ],
          focus: 0,
        },
      },
      victory: { ...base, phase: 'victory', summary },
      defeat: { ...base, phase: 'defeat', summary: { ...summary, rooms: 5, glint: 60 } },
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
    const page = screens[step.screen];
    prepaintPage = page.el;
    page.el.style.display = '';
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

  function prepaintEnd() {
    prepaintHidePage();
    prepaintSeedsRemove();
    prepaintStep = PREPAINT_SEQ.length;
    prepaintLog.step = null;
    prepaintLog.done = Math.round(performance.now());
    try { performance.mark('prepaint-end'); } catch (e) { /* trace marker only */ }
    signature = ''; // the synthetic content above must never be mistaken for state
    rootEl.classList.remove('rn-open', 'rn-dock', 'rn-victory', 'rn-defeat');
    veil.classList.remove('rn-open', 'rn-light', 'rn-victory', 'rn-defeat');
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
    setScreen(SCREEN_FOR[v.phase] ?? 'none');
    setVeilTone(v.phase);
    fade.classList.toggle('rn-on', v.phase === 'fade');
    if (!prepaintDone()) {
      if (current === 'none') prepaint();
      else if (prepaintStep >= 0) prepaintAbort();
    }
    if (current === 'none') return;
    const sig = sigOf(v);
    if (sig !== signature) {
      signature = sig;
      screens[current].render(v);
      refreshShines(); // the render replaced the card DOM
      fitScale(); // content changed => the page's layout height may have changed
    }
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
      if (CARRY_KEYS.has(code) && !e.repeat) carryAt = performance.now();
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
      if (screens[current].key(code, fresh)) {
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
    if (current === 'shop') screens.shop.denyShake(ev.index ?? 0);
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
  // §16: "Taking a node chains straight into the Socket screen with the
  // candidate pre-focused." The socket screen owns that focus; we only open it.
  // `ev.reward` (not `ev.type`): the bus builds events as
  // `{ tick, type, ...payload }`, so the reward's kind cannot live on `type`
  // without erasing the event's own name — see the note in sim/run.js.
  bus.on('draft_taken', (ev) => {
    if (ev.reward === 'node' && socket) socket.cmd('openSocket');
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
    `background:${'#221F1B'}EE;color:#F4EFE6;font:700 18px/1.2 "Nunito","Trebuchet MS",system-ui,sans-serif;` +
    'border:1px solid #9C918688;pointer-events:none;display:none;';
  document.body.appendChild(guestNote);
  const pingCss = document.createElement('style');
  pingCss.textContent = '.nt-pinged { outline: 3px solid #E8A23D !important; outline-offset: 4px; transition: outline-color 0.2s; }';
  document.head.appendChild(pingCss);
  const netGuest = () => {
    const n = service('net');
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };
  const GUEST_LINES = {
    draft: 'The Healer is choosing the reward…',
    path: 'The Healer picks the door — point with ←/→ and Enter',
    shop: 'The Healer is shopping…',
    end: 'Waiting for the Healer…',
  };
  function syncGuestNote() {
    const on = current !== 'none' && netGuest();
    const text = on ? GUEST_LINES[current] || 'The Healer is choosing…' : '';
    if (guestNote.textContent !== text) guestNote.textContent = text;
    const disp = on ? '' : 'none';
    if (guestNote.style.display !== disp) guestNote.style.display = disp;
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

  return {
    update,
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
        shopAnim: () => screens.shop.animState(),
        shopPin: (ms) => screens.shop.pin(ms),
      };
    },
  };
}
