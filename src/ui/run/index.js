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
import { RUN_CSS } from './style.js';
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

  // §17/A7 uniform virtual scale — the socket screen's grammar: the pages are
  // AUTHORED at their own px (every label at/above the 16 px text floor, every
  // numeral at/above 20, the §16 doors at exactly 160x220) and scaled by
  // min(1, fit) so they never overflow a small window and never inflate past
  // their authored ratio on a large one. The fit is measured against the LIVE
  // page (offsetWidth/Height are layout values, untouched by the transform),
  // so the tall shop shelf shrinks while the short draft card stays at 1:1.
  const DESIGN = { w: 980, h: 700 };
  const RESERVE = 120; // px kept clear at the bottom for the Zone 1 bar
  function fitScale() {
    const pg = current !== 'none' ? screens[current].el : null;
    const w = pg && pg.offsetWidth ? pg.offsetWidth : DESIGN.w;
    const h = pg && pg.offsetHeight ? pg.offsetHeight : DESIGN.h;
    rootEl.style.setProperty('--rn-reserve', `${RESERVE}px`);
    const s = Math.min(
      1,
      (window.innerWidth - 40) / w,
      (window.innerHeight - 28 - RESERVE) / h
    );
    rootEl.style.setProperty('--rn-s', s.toFixed(4));
    return s;
  }
  fitScale();
  window.addEventListener('resize', fitScale);

  // ------------------------------------------------------- fresh-press --
  const held = new Set();
  const stale = new Set();

  function markAllHeldStale() {
    for (const c of held) stale.add(c);
  }

  function setScreen(name) {
    if (name === current) return;
    if (current !== 'none' && screens[current]) screens[current].el.style.display = 'none';
    current = name;
    signature = '';
    const on = name !== 'none';
    rootEl.classList.toggle('rn-open', on);
    veil.classList.toggle('rn-open', on);
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

  function update() {
    maybeAutostart();
    const sys = run();
    if (!sys) return;
    const v = sys.view();
    setScreen(SCREEN_FOR[v.phase] ?? 'none');
    setVeilTone(v.phase);
    fade.classList.toggle('rn-on', v.phase === 'fade');
    if (current === 'none') return;
    const sig = sigOf(v);
    if (sig === signature) return;
    signature = sig;
    screens[current].render(v);
    fitScale(); // content changed => the page's layout height may have changed
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
  // §16: "Taking a node chains straight into the Socket screen with the
  // candidate pre-focused." The socket screen owns that focus; we only open it.
  bus.on('draft_taken', (ev) => {
    if (ev.type === 'node' && socket) socket.cmd('openSocket');
  });
  // A run ending or a room starting must never leave a page hanging.
  bus.on('room_start', () => setScreen('none'));

  // `?run=1` boots straight into room 1 (the camp hub that normally starts a
  // run is its own block). It is DEFERRED to the first update with a ticked
  // sim: starting a run before tick 1 would run the room-boundary sweep over
  // ally bodies the AI has not spun up yet.
  let pendingAutostart = !!autostart;
  function maybeAutostart() {
    if (!pendingAutostart || world.tick < 1) return;
    pendingAutostart = false;
    run().startRun();
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
      return {
        screen: current,
        phase: v.phase,
        room: v.room,
        wallet: v.wallet,
        freeSkillSlots: v.freeSkillSlots,
        open: current !== 'none',
        held: [...held],
        stale: [...stale],
        text: current === 'none' ? '' : screens[current].el.textContent.replace(/\s+/g, ' ').trim(),
        subline: rootEl.querySelector('.rn-subline')?.textContent ?? '',
        doors,
        buttons,
        cards,
        plaques,
        owned: [...rootEl.querySelectorAll('.rn-owned')].map((n) => n.textContent.trim()),
        fade: fade.classList.contains('rn-on'),
        veil: { open: veil.classList.contains('rn-open'), tone: veil.className },
      };
    },
  };
}
