// TUTORIAL (docs/TUTORIAL.md): the guided first room and the one-time tips.
//
// THE GUIDED ROOM. The first New Game asks "Play the tutorial?" on the title
// (Skip is one press); Settings ▸ Gameplay ▸ Play the tutorial replays it from
// the camp. The camp starts Level 1 room 1 as a tutorial campaign
// (sim/run.js startCampaign({ tutorial: true }): a gentle room in the
// clearing with the spring, the waves held, relics off) and this coach walks
// the player through it, one step at a time:
//   move -> attack -> dodge -> drink from the spring  (waves held)
//   -> the coach releases the waves -> clear them with the party
//   -> the first wave reward hands out a skill -> pick a door -> camp.
// The door ends it (run_end { result: 'tutorial' }: no record, no Embers) and
// a closing card in camp names the camp keys. Single-player only: an online
// session never starts it.
//
// THE TIPS. A short card the first time the player meets class select, a
// relic pick, a cursed door and the peddler: a centred card over the page,
// which waits (its keys are held) until Got it / Enter / Space / Esc. Each
// shows once: it is marked seen the moment it appears. The slick floor tip
// (docs/SLICK_FLOOR.md) comes up mid-fight, the first time the player's own
// body stands on a slick patch, so it rides the coach card at the bottom
// instead: nothing is held, the fight goes on, and it leaves after a few
// seconds or on Got it. The reward and the
// door lessons of the guided room use the same card.
// Settings ▸ Gameplay ▸ Show tips again brings them back.
//
// State lives in two settings keys (persisted like every setting):
//   tutorial.seen   the first New Game has offered the tutorial
//   tutorial.tips   comma list of the tips already shown
// Harness boots (?seed=, ?room=, ?menu=0 ...) show no tips unless ?tips=1, so
// the probes and the goldens never meet a card they did not ask for.
//
// Presentation only: reads run.view(), the bus and DOM input; its one sim
// write is run.tutorialRelease() / run.endTutorial(), the run system's own
// entry points.
import { registerSettingsRow, service, provide } from '../../app/registry.js';
import { V } from '../../app/settings.js';
import { AP_FONT } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { t } from '../../i18n/index.js';
import { bindings, PAD, MOUSE_BUTTON_CODE } from '../../core/bindings.js';
import { cap, padCap, moveCaps, skillsCap, usingPad, onHintsChange } from '../../app/controls.js';
import { tidecallerOpen } from '../../data/lineup.js';

export const TUTORIAL_SEEN_KEY = 'tutorial.seen';
export const TUTORIAL_TIPS_KEY = 'tutorial.tips';
export const TIP_IDS = Object.freeze(['classes', 'relic', 'curse', 'peddler', 'slick', 'event', 'hunt', 'purge', 'affix', 'champion', 'vault', 'lineup', 'soaked', 'escort', 'hold']);

const MOVE_DIST = 2.5; // world units walked to pass the move step
const ATTACK_MS = 450; // right button held this long (in total) passes the attack step
const USE_GIVE_UP_MS = 45000; // the spring step lets go after this long
const DONE_MS = 16000; // the closing card's own timeout
const POLL_MS = 200;
const FLOOR_TIP_MS = 9000; // the slick floor tip's time on screen

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Every line on the coach, by step. Keys stay untranslated (docs/I18N.md rule
// 5). Controls slice: the keys are the player's own (Settings ▸ Controls), and
// gamepad buttons while a gamepad is in use.
function stepText(id) {
  const pad = usingPad();
  switch (id) {
    case 'move':
      return { title: t('Move'), body: t('Walk around the clearing.'), keys: moveCaps() };
    case 'attack':
      return {
        title: t('Attack'),
        body: pad
          ? t('Aim with the right stick and hold {key} to attack. With the stick at rest you aim at the nearest foe.', { key: cap('attack') })
          : bindings.isDefault('attack')
            ? t('Aim with the mouse and hold the right mouse button to attack.')
            : t('Aim with the mouse and hold {key} to attack.', { key: cap('attack') }),
        keys: pad ? [padCap('aim'), cap('attack')] : [cap('attack')],
      };
    case 'dodge':
      return { title: t('Dodge'), body: t('Press {key} to dodge. You dash a short way, and nothing can hit you while you do.', { key: cap('dodge') }), keys: [cap('dodge')] };
    case 'use':
      return { title: t('Use'), body: t('The glowing spring heals the whole party once per room. Walk up to it and press {key} to drink.', { key: cap('interact') }), keys: [cap('interact')] };
    case 'fight':
      return { title: t('Clear the waves'), body: t('Beasts are coming. Your three friends fight beside you, played by the AI. Clear every wave to win the room.'), keys: [] };
    case 'reward':
      return {
        title: t('Your first skill'),
        body: t('Everyone starts with only the basic attack and dodge. Skills come from wave rewards: take the skill on your card and it fills an empty slot, cast with {skills}. Between rooms, {backpack} opens the sockets where nodes power your skills up.', {
          skills: skillsCap(),
          backpack: cap('backpack'),
        }),
        keys: ['skill1', 'skill2', 'skill3', 'skill4'].map((k) => cap(k)),
      };
    case 'door':
      return {
        title: t('Pick a door'),
        body: t('Each door shows what waits behind it: the kind of fight and the reward for clearing it. In a run it leads to the next room. Here it ends the tutorial.'),
        keys: [],
      };
    case 'done':
      return {
        title: t('Tutorial complete'),
        body: t('This is the camp. {classes} picks your class, {unlocks} spends Embers between runs. Walk to the portal at the north gate and press {interact} to set out.', {
          classes: cap('classes'),
          unlocks: cap('unlocks'),
          interact: cap('interact'),
        }),
        keys: [],
      };
    case 'skipped':
      return { title: t('Tutorial skipped'), body: t('You can play it again from Settings ▸ Gameplay.'), keys: [] };
    default:
      return null;
  }
}

function tipText(id) {
  switch (id) {
    case 'classes':
      // THE TIDECALLER: once Rill has joined, the tip names five heroes.
      return tidecallerOpen()
        ? { title: t('Choose who you play'), body: t('Five heroes now, Rill the Tidecaller among them. Each has its own health, speed and basic attack, and every one starts without skills. Switch here in camp before any run.') }
        : { title: t('Choose who you play'), body: t('Each hero has its own health, speed and basic attack, and every one starts without skills. Switch here in camp before any run.') };
    // THE TIDECALLER (docs/TIDECALLER.md): the first time the team view opens.
    case 'lineup':
      return { title: t('Who joins the team'), body: t('Four seats, five friends. The Healer always comes and so does the hero you play; you choose who fills the other seats, and whoever you leave out waits at the hearth.') };
    // ... and mid-fight, the first time a soaked enemy is crashed.
    case 'soaked':
      return { title: t('Soak, then crash'), body: t('Rill\'s water soaks enemies: they drip and move slower. Her Crash skills hit a soaked enemy 60% harder and use the soak up, so soak a pack first, then crash a wave through it.') };
    case 'relic':
      return { title: t('Relics'), body: t('A relic helps the whole party for the rest of the run. Pick one of the three; there is no reroll.') };
    case 'curse':
      return {
        title: t('Cursed doors'),
        body: t('A cursed door makes the next room harder, and clearing it earns an extra relic pick. A chained mark is a major curse that stays for the whole run.'),
      };
    case 'peddler':
      return { title: t('The peddler'), body: t('Spend the Glint you earned clearing rooms on nodes for your skills and relics for the party. Advance when you are done.') };
    case 'event':
      return {
        title: t('The "?" door'),
        body: t('A "?" door leads to a room with no fight. Something waits inside that trades HP, Glint, a curse or a relic for a reward, and you may always walk away. It takes the place of the room and its draft.'),
      };
    case 'slick':
      return {
        title: t('Slick floor'),
        body: t('Wet stone and grave frost are slick: you keep sliding when you stop, turn wide, and your dodge carries further. Ground enemies slide too.'),
      };
    case 'affix':
      return {
        title: t('Elite powers'),
        body: t('Some elites carry named powers, shown on the plate above them. A red ring on the ground warns before a Molten or Frozen burst lands, and a Warded elite takes no damage while its ward glows.'),
      };
    // ROOM OBJECTIVES (docs/ROOM_OBJECTIVES.md): on the doors before the first one.
    case 'hunt':
      return {
        title: t('The hunt'),
        body: t('A marked quarry breaks cover and runs. Chase it down and kill it before its timer runs out; it stops to catch its breath every few seconds. If it escapes, the room pays no reward.'),
      };
    case 'purge':
      return {
        title: t('The purge'),
        body: t('Three corruption nests keep spawning enemies. Destroy all three before the timer runs out; a wounded nest spawns faster. If the corruption takes root, the room pays no reward and the nests must still fall.'),
      };
    // ESCORT AND HOLD (docs/ROOM_OBJECTIVES.md): on the doors before the first one.
    case 'escort':
      return {
        title: t('The escort'),
        body: t('A lost pilgrim crosses the room with a lantern. It walks only while one of you stays near, and the beasts go for it. See it to the far side and the room is won; if it falls, the room pays no reward.'),
      };
    case 'hold':
      return {
        title: t('The sigil ring'),
        body: t('A sigil ring burns on the floor while rifts send beasts at it. Keep someone standing in it until the timer runs out. Left empty, it fades and goes out in a few seconds, and the room pays no reward.'),
      };
    // KEYS AND VAULTS (docs/VAULTS.md): on the first vault door.
    case 'vault':
      return {
        title: t('The vault door'),
        body: t('Champions, and now and then an elite, drop a key. While the party holds one, a vault door can appear on the path: behind it waits a treasure room with no fight, Glint, a feast and a relic chest. A key lasts only the level it was found in.'),
      };
    // CHAMPION ROOMS (docs/CHAMPIONS.md): on the first crown door.
    case 'champion':
      return {
        title: t('The crown door'),
        body: t('A named champion waits behind the crown door: a mini-boss with two telegraphed moves that rages below half health. Fell it and clear its two light waves to open its relic chest, a rare or legendary relic on top of the draft.'),
      };
    default:
      return null;
  }
}

const CSS = `
.tu-card {
  position: fixed; left: 50%; bottom: 84px; transform: translateX(-50%);
  z-index: 1050; display: none; flex-direction: column; gap: 8px;
  width: min(580px, calc(100vw - 32px)); padding: 12px 16px;
  font-family: ${AP_FONT}; color: ${P.parchment};
  background: linear-gradient(172deg, #2C2823F5 0%, ${P.voidCharcoal}F5 62%);
  border: 2px solid ${P.hearthAmber}AA; border-radius: 14px;
  box-shadow: 0 10px 30px #000000AA; pointer-events: auto;
}
.tu-card.tu-on { display: flex; }
.tu-card.tu-modal { top: 50%; bottom: auto; transform: translate(-50%, -50%); padding: 16px 20px; gap: 10px; }
.tu-card.tu-modal[data-kind="tip"] { border-color: ${P.bone}AA; }
.tu-veil { position: fixed; inset: 0; z-index: 1049; display: none; background: #120F0CA8; pointer-events: auto; }
.tu-veil.tu-on { display: block; }
.tu-head { display: flex; align-items: baseline; gap: 10px; }
.tu-kicker { font-size: 12px; letter-spacing: 0.18em; color: ${P.hearthAmber}; font-weight: 700; text-transform: uppercase; white-space: nowrap; }
.tu-title { font-size: 19px; font-weight: 800; flex: 1; min-width: 0; }
.tu-modal .tu-title { font-size: 22px; }
.tu-step { font-size: 13px; color: ${P.warmGrey}; white-space: nowrap; }
.tu-body { font-size: 15px; line-height: 1.4; color: ${P.bone}; }
.tu-modal .tu-body { font-size: 16px; }
.tu-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tu-keys { display: flex; gap: 6px; flex: 1; flex-wrap: wrap; }
.tu-key {
  display: inline-flex; align-items: center; justify-content: center; min-width: 30px; height: 28px;
  padding: 0 8px; border-radius: 6px; border: 2px solid ${P.warmGrey}AA; background: ${P.voidCharcoal};
  color: ${P.bone}; font-size: 15px; font-weight: 700; white-space: nowrap;
}
.tu-btn {
  font-family: inherit; font-size: 14px; color: ${P.parchment}; cursor: pointer; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px; border-radius: 8px; border: 2px solid ${P.warmGrey}AA;
  background: linear-gradient(180deg, #3A3530 0%, ${P.voidCharcoal} 100%);
}
.tu-btn:hover { border-color: ${P.hearthAmber}; }
.tu-btn.tu-primary { border-color: ${P.hearthAmber}; }
.tu-btn .tu-kc { font-size: 12px; color: ${P.warmGrey}; font-weight: 700; }
.tu-btn.tu-quiet { border-color: transparent; background: none; color: ${P.warmGrey}; }
`;

function installCss() {
  if (document.getElementById('tu-style')) return;
  const s = document.createElement('style');
  s.id = 'tu-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// The centred card holds the keyboard while it is up. This listener is added
// when the module is first imported, i.e. before the app shell's own capture
// listener (src/app/nav.js), so Enter / Space / Esc close the card instead of
// committing the page under it, and no other key leaks through.
const CLOSE_KEYS = new Set(['Enter', 'NumpadEnter', 'Space', 'Escape']);
let modalKeys = null;
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      if (!modalKeys) return;
      if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (!e.repeat && CLOSE_KEYS.has(e.code)) modalKeys(e.code);
    },
    { capture: true }
  );
}

export function registerTutorialSettings(settings) {
  settings.register(TUTORIAL_SEEN_KEY, { default: false, validate: V.bool() });
  settings.register(TUTORIAL_TIPS_KEY, { default: '', validate: V.str(256) });
}

export function createTutorial({ app, world, bus, scene: campScene = null, params = null }) {
  const settings = app.settings;
  registerTutorialSettings(settings);
  installCss();
  const harness = !!(params && params.menuSkip);
  const query = new URLSearchParams(window.location.search);
  const tipsOn = query.get('tips') === '1' || (!harness && query.get('tips') !== '0');

  // ------------------------------------------------------------ the DOM --
  const coach = document.createElement('div');
  coach.className = 'tu-card';
  coach.id = 'tu-coach';
  coach.setAttribute('role', 'status');
  coach.setAttribute('aria-live', 'polite');
  coach.innerHTML = `
    <div class="tu-head"><span class="tu-kicker"></span><span class="tu-title"></span><span class="tu-step"></span></div>
    <div class="tu-body"></div>
    <div class="tu-foot"><span class="tu-keys"></span><button type="button" class="tu-btn tu-quiet tu-skip"></button><button type="button" class="tu-btn tu-ok"></button></div>`;
  const veil = document.createElement('div');
  veil.className = 'tu-veil';
  veil.id = 'tu-veil';
  const modal = document.createElement('div');
  modal.className = 'tu-card tu-modal';
  modal.id = 'tu-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="tu-head"><span class="tu-kicker"></span><span class="tu-title"></span><span class="tu-step"></span></div>
    <div class="tu-body"></div>
    <div class="tu-foot"><span class="tu-keys"></span><button type="button" class="tu-btn tu-quiet tu-skip"></button><button type="button" class="tu-btn tu-primary tu-ok"></button></div>`;
  document.body.append(coach, veil, modal);

  const run = () => (world && typeof world.runSystem === 'function' ? world.runSystem() : null);
  const view = () => {
    const r = run();
    try {
      return r ? r.view() : null;
    } catch {
      return null;
    }
  };
  const localBody = () => {
    const nv = world.netView;
    const b = nv && typeof nv.followTarget === 'function' ? nv.followTarget() : null;
    return b || world.player;
  };
  const scene = () => campScene;
  const inSession = () => {
    const n = service('net');
    try {
      return !!(n && ((typeof n.isGuest === 'function' && n.isGuest()) || (typeof n.isHost === 'function' && n.isHost())));
    } catch {
      return false;
    }
  };
  const screensOpen = () => !!(app.screens && app.screens.isOpen());
  const socketOpen = () => {
    const el = document.getElementById('socket-screen');
    return !!(el && el.classList.contains('nd-open'));
  };
  const keysHtml = (keys) => keys.map((k) => `<span class="tu-key">${esc(k)}</span>`).join('');

  // ----------------------------------------------------- the centred card --
  // shown: null | { kind: 'tip' | 'lesson', id }
  let shown = null;
  function openModal(kind, id) {
    const txt = kind === 'tip' ? tipText(id) : stepText(id);
    if (!txt) return;
    shown = { kind, id };
    modal.dataset.kind = kind;
    modal.dataset.id = id;
    modal.querySelector('.tu-kicker').textContent = kind === 'tip' ? t('Tip') : t('Tutorial');
    modal.querySelector('.tu-title').textContent = txt.title;
    const i = ORDER.indexOf(id);
    modal.querySelector('.tu-step').textContent = kind === 'lesson' && i >= 0 ? t('Step {n} of {total}', { n: i + 1, total: ORDER.length }) : '';
    modal.querySelector('.tu-body').textContent = txt.body;
    modal.querySelector('.tu-keys').innerHTML = keysHtml(txt.keys || []);
    const skip = modal.querySelector('.tu-skip');
    skip.textContent = t('Skip tutorial');
    skip.style.display = kind === 'lesson' ? '' : 'none';
    modal.querySelector('.tu-ok').innerHTML = `${esc(t('Got it'))}<span class="tu-kc">${usingPad() ? 'A' : 'Enter'}</span>`;
    modal.classList.add('tu-on');
    veil.classList.add('tu-on');
    modalKeys = () => closeModal();
    if (kind === 'tip') markTip(id);
  }
  function closeModal() {
    shown = null;
    modalKeys = null;
    modal.classList.remove('tu-on');
    veil.classList.remove('tu-on');
    delete modal.dataset.id;
  }
  modal.querySelector('.tu-ok').addEventListener('click', () => closeModal());
  modal.querySelector('.tu-skip').addEventListener('click', () => {
    closeModal();
    skipTutorial();
  });

  // ---------------------------------------------------------- the coach --
  // step: null (no tutorial) | 'move' | 'attack' | 'dodge' | 'use' | 'fight'
  //       | 'reward' | 'door' | 'done' | 'skipped'
  // move..fight ride the coach card at the top of the screen; reward and
  // door open the centred card over their page; done / skipped close it out
  // in camp.
  let step = null;
  let stepAt = 0;
  let origin = null;
  let rmbDownAt = 0;
  let rmbTotal = 0;
  let doneUntil = 0;
  const log = []; // probe record: [{ step, at }]
  const HELD = ['move', 'attack', 'dodge', 'use'];
  const ORDER = ['move', 'attack', 'dodge', 'use', 'fight', 'reward', 'door'];
  const LESSONS = ['reward', 'door'];

  function setStep(next) {
    if (next === step) return;
    if (shown && shown.kind === 'lesson') closeModal();
    step = next;
    stepAt = performance.now();
    log.push({ step: next, at: Math.round(stepAt) });
    if (log.length > 40) log.shift();
    if (next === 'move') {
      const b = localBody();
      origin = b ? { x: b.x, z: b.z } : null;
    }
    if (next === 'attack') rmbTotal = 0;
    if (next === 'done' || next === 'skipped') doneUntil = performance.now() + (next === 'done' ? DONE_MS : 8000);
    // The waves come once the four held lessons are through.
    if (next === 'fight') {
      const r = run();
      const v = view();
      if (r && v && v.tutorial && v.tutorial.hold && typeof r.tutorialRelease === 'function') r.tutorialRelease();
    }
    if (LESSONS.includes(next)) openModal('lesson', next);
    renderCoach();
  }

  // The slick floor tip on the coach card (never during the guided room).
  let floorTip = null; // null | { id, until }
  function renderFloorTip() {
    const txt = floorTip ? tipText(floorTip.id) : null;
    if (!txt) return;
    coach.querySelector('.tu-kicker').textContent = t('Tip');
    coach.querySelector('.tu-title').textContent = txt.title;
    coach.querySelector('.tu-step').textContent = '';
    coach.querySelector('.tu-body').textContent = txt.body;
    coach.querySelector('.tu-keys').innerHTML = '';
    coach.querySelector('.tu-skip').style.display = 'none';
    const ok = coach.querySelector('.tu-ok');
    ok.textContent = t('Got it');
    ok.style.display = '';
    coach.dataset.tip = floorTip.id;
    delete coach.dataset.step;
    syncCoachVisible();
  }
  function closeFloorTip() {
    if (!floorTip) return;
    floorTip = null;
    delete coach.dataset.tip;
    syncCoachVisible();
  }

  function renderCoach() {
    const txt = step && !LESSONS.includes(step) ? stepText(step) : null;
    if (!txt) {
      if (floorTip) return renderFloorTip();
      coach.classList.remove('tu-on');
      delete coach.dataset.step;
      return;
    }
    coach.querySelector('.tu-kicker').textContent = t('Tutorial');
    coach.querySelector('.tu-title').textContent = txt.title;
    const i = ORDER.indexOf(step);
    coach.querySelector('.tu-step').textContent = i >= 0 ? t('Step {n} of {total}', { n: i + 1, total: ORDER.length }) : '';
    coach.querySelector('.tu-body').textContent = txt.body;
    coach.querySelector('.tu-keys').innerHTML = keysHtml(txt.keys);
    const skip = coach.querySelector('.tu-skip');
    const ok = coach.querySelector('.tu-ok');
    const live = ORDER.includes(step);
    skip.textContent = t('Skip tutorial');
    skip.style.display = live ? '' : 'none';
    ok.textContent = t('Got it');
    ok.style.display = live ? 'none' : '';
    coach.dataset.step = step;
    syncCoachVisible();
  }
  function syncCoachVisible() {
    const lesson = !!step && !LESSONS.includes(step) && !!stepText(step);
    const on = (lesson || (!step && !!floorTip)) && app.state === 'playing' && !screensOpen() && !shown;
    coach.classList.toggle('tu-on', on);
  }

  coach.querySelector('.tu-skip').addEventListener('click', () => skipTutorial());
  coach.querySelector('.tu-ok').addEventListener('click', () => (floorTip && !step ? closeFloorTip() : setStep(null)));

  function skipTutorial() {
    const r = run();
    if (r && typeof r.endTutorial === 'function') r.endTutorial('skip');
  }

  // Input for the held lessons (class-agnostic: whatever body the player
  // drives, these are the controls that drive it). Controls slice: the
  // attack is the input controller's live hold (the bound key or mouse
  // button, or RT), sampled every poll; the dodge is the bound key or LT.
  window.addEventListener('keydown', (e) => {
    if (e.repeat || screensOpen()) return;
    if (bindings.is(e.code, 'dodge') && step === 'dodge') setStep('use');
  });
  window.addEventListener('mousedown', (e) => {
    if (screensOpen()) return;
    if (bindings.is(MOUSE_BUTTON_CODE[e.button], 'dodge') && step === 'dodge') setStep('use');
  });
  bindings.onPad((i) => {
    if (i === PAD.LT && step === 'dodge') queueMicrotask(() => step === 'dodge' && setStep('use'));
    return false;
  });
  let attackPollAt = 0;
  function pollAttack(now) {
    const live = app.input && typeof app.input.attackHeld === 'function' && app.input.attackHeld();
    if (live && attackPollAt) rmbTotal += Math.min(POLL_MS * 2, now - attackPollAt);
    rmbDownAt = live ? rmbDownAt || now : 0;
    attackPollAt = live ? now : 0;
  }
  // A rebind or a switch between keyboard and gamepad repaints the cards.
  onHintsChange(() => {
    if (step && !LESSONS.includes(step)) renderCoach();
    if (shown) openModal(shown.kind, shown.id);
  });

  // THE TIDECALLER: the soaked tip waits for the first crash it sees.
  let crashSeen = false;
  bus.on('crash', () => {
    crashSeen = true;
  });
  bus.on('interact', (ev) => {
    if (step === 'use' && ev && ev.itype === 'dewfont') setStep('fight');
  });
  bus.on('tutorial_end', (ev) => {
    setStep(ev && ev.reason === 'done' ? 'done' : 'skipped');
  });

  function pollCoach() {
    const v = view();
    const inTutorial = !!(v && v.active && v.tutorial);
    if (inTutorial) {
      if (v.phase === 'combat') {
        if (v.tutorial.hold) {
          if (!HELD.includes(step)) setStep('move');
          const now = performance.now();
          if (step === 'move') {
            const b = localBody();
            if (!origin && b) origin = { x: b.x, z: b.z };
            if (b && origin && Math.hypot(b.x - origin.x, b.z - origin.z) >= MOVE_DIST) setStep('attack');
          } else if (step === 'attack') {
            pollAttack(now);
            if (rmbTotal >= ATTACK_MS) setStep('dodge');
          } else if (step === 'use' && now - stepAt >= USE_GIVE_UP_MS) {
            setStep('fight');
          }
        } else if (step !== 'fight') setStep('fight');
      } else if (v.phase === 'reward') setStep('reward');
      else if (v.phase === 'path') setStep('door');
      else if (v.phase === 'transit') {
        if (step) setStep(null);
      }
    } else if (ORDER.includes(step)) {
      // The run went away without a tutorial_end (a load, a reset).
      setStep(null);
    } else if ((step === 'done' || step === 'skipped') && performance.now() >= doneUntil) {
      setStep(null);
    }
    syncCoachVisible();
  }

  // ----------------------------------------------------------- the tips --
  const tipsSeen = () =>
    String(settings.get(TUTORIAL_TIPS_KEY) || '')
      .split(',')
      .filter(Boolean);
  function markTip(id) {
    const seen = tipsSeen();
    if (seen.includes(id)) return;
    seen.push(id);
    settings.set(TUTORIAL_TIPS_KEY, seen.join(','), { source: 'tutorial' });
  }

  // Which tip the screen in front of the player calls for right now.
  function tipContext() {
    if (app.state !== 'playing' || socketOpen()) return null;
    if (app.screens && app.screens.top && app.screens.top() === 'classes') {
      // THE TIDECALLER: the team view has its own tip (once the class tip is seen).
      const cs = document.querySelector('.cs-classes .cs-title');
      const teamView = !!(cs && cs.textContent === t('Who joins the team?'));
      if (teamView && tidecallerOpen() && tipsSeen().includes('classes') && !(shown && shown.id === 'classes')) return 'lineup';
      return 'classes';
    }
    if (screensOpen()) return null;
    const v = view();
    if (!v || !v.active || v.tutorial) return null;
    if (v.phase === 'relic') return 'relic';
    const doors = v.phase === 'path' && v.path && Array.isArray(v.path.options) ? v.path.options : [];
    // A cursed door, a "?" door and an objective room can meet on one
    // screen: the tip on screen stays, else the first not yet seen speaks
    // (curse, then "?", then hunt / purge / escort / hold).
    const want = [];
    if (doors.some((o) => o.curse)) want.push('curse');
    if (doors.some((o) => o.event)) want.push('event');
    for (const m of ['hunt', 'purge', 'escort', 'hold']) if (doors.some((o) => o.win === m)) want.push(m);
    if (doors.some((o) => o.champion)) want.push('champion');
    if (doors.some((o) => o.vault)) want.push('vault');
    if (want.length) {
      if (shown && want.includes(shown.id)) return shown.id;
      return want.find((id) => !tipsSeen().includes(id)) ?? want[0];
    }
    if (v.phase === 'shop') return 'peddler';
    return null;
  }
  // Is the player's own body standing on a slick patch in a live fight?
  function onSlick() {
    if (app.state !== 'playing' || screensOpen()) return false;
    const v = view();
    if (!v || !v.active || v.tutorial || v.phase !== 'combat') return false;
    const b = localBody();
    if (!b || !(b.hp > 0) || typeof world.entities !== 'function') return false;
    for (const e of world.entities()) {
      if (e.kind === 'hazard' && e.htype === 'slip' && Math.hypot(b.x - e.x, b.z - e.z) <= e.radius) return true;
    }
    return false;
  }
  // ELITE AFFIXES: is an elite with named powers in the live fight?
  function affixElite() {
    if (app.state !== 'playing' || screensOpen()) return false;
    const v = view();
    if (!v || !v.active || v.tutorial || v.phase !== 'combat' || typeof world.entities !== 'function') return false;
    for (const e of world.entities()) if (Array.isArray(e.affixes) && e.affixes.length && e.state === 'active') return true;
    return false;
  }
  function pollFloorTip() {
    if (floorTip) {
      if (performance.now() >= floorTip.until || step) closeFloorTip();
      else syncCoachVisible();
      return;
    }
    if (!tipsOn || step || shown) return;
    const id = !tipsSeen().includes('slick') && onSlick() ? 'slick' : !tipsSeen().includes('affix') && affixElite() ? 'affix' : !tipsSeen().includes('soaked') && crashSeen ? 'soaked' : null;
    if (!id) return;
    floorTip = { id, until: performance.now() + FLOOR_TIP_MS };
    markTip(id);
    renderFloorTip();
  }

  function pollTips() {
    pollFloorTip();
    const ctx = tipContext();
    if (shown && shown.kind === 'tip') {
      if (ctx !== shown.id) closeModal(); // its page closed under it
      return;
    }
    if (shown || !ctx || !tipsOn) return;
    if (tipsSeen().includes(ctx)) return;
    openModal('tip', ctx);
  }
  // A lesson card whose page went away (a load, a forced advance) closes too.
  function pollLesson() {
    if (!shown || shown.kind !== 'lesson') return;
    if (step !== shown.id || screensOpen()) closeModal();
  }

  setInterval(() => {
    try {
      pollCoach();
      pollLesson();
      pollTips();
    } catch (err) {
      console.warn('[tutorial] poll failed', err);
    }
  }, POLL_MS);

  // ------------------------------------------------------- starting it --
  // From the camp only, single-player, nothing open but (optionally) menus,
  // which close first. Returns true when the camp took the start.
  function canStart() {
    if (app.state !== 'playing' || inSession()) return false;
    const s = scene();
    if (s && typeof s.isCamp === 'function' && !s.isCamp()) return false;
    const r = run();
    return !(r && r.isActive && r.isActive());
  }
  function startNow(via = 'settings') {
    if (!canStart()) return false;
    if (app.screens && app.screens.isOpen()) app.screens.clear();
    const s = scene();
    const ok = !!(s && typeof s.cmd === 'function' && s.cmd('campTutorial', [via]));
    if (ok) settings.set(TUTORIAL_SEEN_KEY, true, { source: 'tutorial' });
    return ok;
  }
  // After New Game the camp needs a frame or two before it can set out.
  function startSoon(via = 'title') {
    let tries = 0;
    const go = () => {
      if (startNow(via)) return;
      if (++tries < 40) setTimeout(go, 100);
    };
    go();
  }
  // The title's first New Game: true when the question should be asked.
  const shouldOffer = () => !settings.get(TUTORIAL_SEEN_KEY) && !harness;

  async function offerOnNewGame(newGame) {
    // THE HEARTH SONG (docs/STORY.md): Wick's prologue comes first, once.
    {
      const story = service('story');
      if (story && typeof story.prologueFirst === 'function') await story.prologueFirst();
    }
    if (!shouldOffer() || typeof app.confirm !== 'function') return newGame();
    const play = await app.confirm({
      title: t('Play the tutorial?'),
      body: t('A short guided fight teaches moving, attacking, dodging and how skills arrive. Your party comes along. You can replay it any time from Settings ▸ Gameplay.'),
      confirmLabel: t('Play the tutorial'),
      cancelLabel: t('Skip'),
      defaultFocus: 'confirm',
    });
    settings.set(TUTORIAL_SEEN_KEY, true, { source: 'tutorial' });
    const r = await newGame();
    if (r && play) startSoon('title');
    return r;
  }

  // ------------------------------------------- Settings ▸ Gameplay rows --
  registerSettingsRow('gameplay', {
    id: 'tutorial',
    order: 90,
    build(ctx) {
      const { widgets } = ctx;
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = 'calc(10px * var(--ap-s, 1))';
      const why = () => {
        if (inSession()) return t('Not in an online game');
        if (app.state !== 'playing') return t('Start or continue a game first');
        if (!canStart()) return t('Available in camp, between runs');
        return '';
      };
      const play = widgets.button({
        id: 'ap-gameplay-tutorial',
        label: t('Play the tutorial'),
        help: t('The guided first room: moving, attacking, dodging, the spring, a wave reward and a door. Starts from the camp.'),
        onPress: () => startNow('settings'),
      });
      const tips = widgets.button({
        id: 'ap-gameplay-tips',
        label: t('Show tips again'),
        help: t('The one-time tips for class select, relics, cursed doors, "?" doors, the peddler, slick floors and elite powers show again the next time you meet each.'),
        onPress: () => {
          settings.set(TUTORIAL_TIPS_KEY, '', { source: 'ui' });
          if (typeof app.toast === 'function') app.toast(t('Tips will show again'), { tone: 'good' });
          sync();
        },
      });
      function sync() {
        const w = why();
        play.setDisabled(!!w, w);
        const none = tipsSeen().length === 0;
        tips.setDisabled(none, t('No tips shown yet'));
      }
      sync();
      wrap.append(play.el, tips.el);
      const off = settings.subscribe(TUTORIAL_TIPS_KEY, sync);
      return { el: wrap, sync, destroy: () => off && off() };
    },
  });

  const api = {
    // The pad on the centred card (app.js routes it here first): A / B close it.
    padAction(action) {
      if (!shown) return false;
      if (action === 'confirm' || action === 'back') closeModal();
      return true;
    },
    startNow,
    offerOnNewGame,
    shouldOffer,
    skip: skipTutorial,
    resetTips: () => settings.set(TUTORIAL_TIPS_KEY, '', { source: 'probe' }),
    debug: () => ({
      step,
      log: log.slice(),
      coach: coach.classList.contains('tu-on'),
      card: shown ? { ...shown } : null,
      tip: shown && shown.kind === 'tip' ? shown.id : null,
      floorTip: floorTip ? floorTip.id : null,
      tipsSeen: tipsSeen(),
      seen: !!settings.get(TUTORIAL_SEEN_KEY),
      tipsOn,
      rmbTotal: Math.round(rmbTotal),
    }),
  };
  provide('tutorial', api);
  return api;
}
