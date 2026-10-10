// CLASS SELECT (docs/CLASS_SELECT.md) — the camp's class picker. An app
// screen (registerScreen('classes')) the camp opens with C or the portal
// prompt's "Class" chip. Four cards — Healer, Tank, Swordsman, Archer — each
// with its critter, role, health, speed and the starting skills (the
// equipped unlock kit's when one is worn). Picking a card sets the
// `gameplay.playClass` setting: the next steps put the player on that body
// and the AI plays the other three. Esc / B backs out to the camp.
//
// THE TIDECALLER (docs/TIDECALLER.md): a fifth card, Rill the otter. Five
// classes, four seats, so the screen's second view asks "Who joins the
// team?": the Healer always does, the class you play always does, and the
// player chooses the rest (today's party by default). The Team button and
// the camp's Team chip (params { view: 'team' }) open it, and so does
// picking a class that was not in the team. The answer is the
// `gameplay.team` setting; data/lineup.js plannedLineup turns the two
// settings into the next campaign's lineup.
// Blocking: the single-player sim pauses while it is open.
import { px } from '../../app/style.js';
import { PALETTE as P, CLASS_ACCENTS } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { CLASS_NAME, STARTING_LOADOUT } from '../../data/classes.js';
import { HEALER } from '../../core/constants.js';
import { ALLY_CLASSES } from '../../sim/allies.js';
import { SKILLS, STARTING_SKILLS } from '../../sim/skills.js';
import { UNLOCKS } from '../../data/unlocks.js';
import { CLASS_CRITTER } from '../../net/seats.js';
import { PLAY_CLASS_KEY, TEAM_KEY, PLAY_CLASSES, playable } from '../../app/playclass.js';
import { LINEUP_CLASSES, plannedLineup, teamOf } from '../../data/lineup.js';
import { t } from '../../i18n/index.js';

const STYLE_ID = 'cs-classes-style';
const ROLE = Object.freeze({
  healer: () => t('Keeps the party standing: heals, wards and the revive. Fragile, so stay behind the line.'),
  tank: () => t('Holds the front: heavy blows, taunts and the most health. Slow on its feet.'),
  swordsman: () => t('Fast blade in the thick of it: quick strikes, dashes and burst damage.'),
  archer: () => t('Damage from range: arrows, volleys and traps. Keep your distance.'),
  tidecaller: () => t('Bends the fight with water: soak enemies, drag them together, then crash a wave into the soaked.'),
});
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.cs-classes .cs-wrap { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(96vw, ${px(1500)}); max-height: 94vh; overflow: auto; padding: ${px(26)} ${px(30)} ${px(20)};
  display: flex; flex-direction: column; gap: ${px(16)}; }
.cs-classes .cs-kicker { font-size: ${px(18)}; letter-spacing: 0.28em; color: ${P.warmGrey}; font-weight: 800; }
.cs-classes .cs-blurb { font-size: ${px(20)}; color: ${P.bone}; }
.cs-classes .cs-grid { display: grid; grid-template-columns: repeat(var(--cs-cols, 5), minmax(0, 1fr)); gap: ${px(14)}; }
.cs-classes .cs-card { position: relative; display: flex; flex-direction: column; gap: ${px(8)}; text-align: left; min-height: ${px(380)};
  padding: ${px(18)} ${px(18)} ${px(14)}; font: inherit; cursor: pointer; color: ${P.parchment};
  background: linear-gradient(172deg, var(--cs-acc) 0%, ${P.voidCharcoal} 62%); border: max(2px, ${px(2)}) solid ${P.warmGrey}77; border-radius: ${px(16)};
  transition: transform 90ms ease, box-shadow 90ms ease, border-color 90ms ease; }
.cs-classes .cs-card.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)}; transform: translateY(${px(-3)}) scale(1.02);
  box-shadow: 0 ${px(10)} ${px(24)} #000000AA, 0 0 ${px(18)} ${P.hearthAmber}33; }
.cs-classes .cs-card[data-on="true"] { border-color: ${P.hearthAmber}; box-shadow: inset 0 0 ${px(26)} ${P.hearthAmber}33; }
.cs-classes .cs-card .cs-crit { font-size: ${px(17)}; letter-spacing: 0.2em; font-weight: 800; color: ${P.bone}; }
.cs-classes .cs-card .cs-name { font-size: ${px(36)}; font-weight: 800; line-height: 1.05; }
.cs-classes .cs-card .cs-role { font-size: ${px(19)}; color: ${P.bone}; line-height: 1.35; }
.cs-classes .cs-card .cs-stats { display: flex; gap: ${px(14)}; font-size: ${px(19)}; color: ${P.parchment}; }
.cs-classes .cs-card .cs-stats b { color: ${P.hearthAmber}; }
.cs-classes .cs-card .cs-kit { font-size: ${px(18)}; color: ${P.bone}; line-height: 1.4; flex: 1 1 auto; }
.cs-classes .cs-card .cs-kit h4 { margin: 0 0 ${px(4)}; font-size: ${px(16)}; letter-spacing: 0.2em; color: ${P.warmGrey}; }
.cs-classes .cs-card .cs-foot { font-size: ${px(20)}; font-weight: 800; color: ${P.bone}; }
.cs-classes .cs-card[data-on="true"] .cs-foot { color: ${P.brightHeal}; }
.cs-classes .cs-note { min-height: ${px(26)}; font-size: ${px(20)}; color: ${P.bone}; text-align: center; }
.cs-classes .cs-keys { display: flex; gap: ${px(24)}; justify-content: center; flex-wrap: wrap; font-size: ${px(19)}; color: ${P.warmGrey}; }
.cs-classes .cs-keys b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(32)}; height: ${px(30)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
.cs-classes .cs-card .cs-name { overflow-wrap: anywhere; }
.cs-classes .cs-card[disabled] { opacity: 0.45; cursor: default; }
.cs-classes .cs-new { position: absolute; top: ${px(10)}; right: ${px(12)}; font-size: ${px(15)}; letter-spacing: 0.18em; font-weight: 800; color: ${P.voidCharcoal};
  background: ${P.hearthAmber}; border-radius: ${px(6)}; padding: ${px(2)} ${px(8)}; }
.cs-classes .cs-lineup { align-self: center; font: inherit; font-size: ${px(20)}; font-weight: 700; color: ${P.parchment}; cursor: pointer;
  padding: ${px(8)} ${px(18)}; border-radius: ${px(10)}; border: max(2px, ${px(2)}) solid ${P.warmGrey}88; background: ${P.voidCharcoal}; }
.cs-classes .cs-lineup.ap-focus { outline: max(2px, ${px(2)}) solid ${P.hearthAmber}; outline-offset: ${px(3)}; }
@media (max-width: 1100px) { .cs-classes .cs-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .cs-classes .cs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
`;
  document.head.appendChild(st);
}

const svc = (name) => {
  try {
    return service(name);
  } catch {
    return null;
  }
};

// The kit an equipped unlock gives a class (docs/UNLOCKS.md), else null.
function wornKit(cls) {
  const s = svc('save');
  try {
    const p = s && typeof s.profile === 'function' ? s.profile() : null;
    const id = p && p.meta && p.meta.loadout && p.meta.loadout.kits ? p.meta.loadout.kits[cls] : null;
    return id && UNLOCKS[id] ? UNLOCKS[id] : null;
  } catch {
    return null;
  }
}

function startSkills(cls, kit) {
  const ids = kit && Array.isArray(kit.skills) ? kit.skills : cls === 'healer' ? STARTING_SKILLS : STARTING_LOADOUT[cls] || [];
  return ids.filter(Boolean).map((id) => (SKILLS[id] ? t(SKILLS[id].name) : id));
}

export function createClassesScreen(ctx) {
  installStyle();
  const { manager, app } = ctx;
  const el = document.createElement('div');
  el.className = 'cs-classes';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="cs-wrap ap-plate">
      <div>
        <div class="cs-kicker"></div>
        <h2 class="ap-h2 cs-title"></h2>
      </div>
      <div class="cs-blurb"></div>
      <div class="cs-grid"></div>
      <button type="button" class="cs-lineup" data-nav=""></button>
      <div class="cs-note" aria-live="polite"></div>
      <div class="cs-keys">
        <span><b>←</b><b>→</b><span class="cs-k-move"></span></span>
        <span><b>Enter</b><span class="cs-k-pick"></span></span>
        <span><b>Esc</b><span class="cs-k-back"></span></span>
      </div>
    </div>`;
  const gridEl = el.querySelector('.cs-grid');
  const noteEl = el.querySelector('.cs-note');
  const lineupBtn = el.querySelector('.cs-lineup');
  const settings = app && app.settings ? app.settings : null;
  const chosen = () => (settings ? settings.get(PLAY_CLASS_KEY) : 'healer');
  const teamSetting = () => (settings ? settings.get(TEAM_KEY) : '');
  // The three who join the Healer in the next campaign.
  const teamNow = () => teamOf(plannedLineup(chosen(), teamSetting()));
  let view = 'classes'; // 'classes' | 'team'
  let openedOnTeam = false; // the camp's Team chip opens straight onto the team view
  let draft = []; // the team view's picks (up to three joiners)
  let log = [];
  lineupBtn.addEventListener('click', () => (view === 'team' ? done() : show('team')));

  function card(key, accent) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-card';
    b.dataset.cls = key;
    b.style.setProperty('--cs-acc', accent);
    b.setAttribute('data-nav', '');
    return b;
  }

  function show(next) {
    view = next;
    gridEl.innerHTML = '';
    noteEl.textContent = '';
    const list = PLAY_CLASSES.filter(playable);
    gridEl.style.setProperty('--cs-cols', String(list.length));
    if (view === 'team') draft = [...teamNow()];
    for (const cls of list) {
      const b = card(cls, CLASS_ACCENTS[cls]);
      b.addEventListener('click', () => (view === 'team' ? toggle(cls) : pick(cls)));
      gridEl.appendChild(b);
    }
    render();
    const cur = gridEl.querySelector('.cs-card[data-on="true"]:not([disabled])') || gridEl.querySelector('.cs-card:not([disabled])');
    if (cur && manager && typeof manager.focusElement === 'function') manager.focusElement(cur);
  }

  function render() {
    const team0 = view === 'team';
    el.querySelector('.cs-kicker').textContent = t('BEFORE THE RUN');
    el.querySelector('.cs-title').textContent = team0 ? t('Who joins the team?') : t('Choose your class');
    el.setAttribute('aria-label', team0 ? t('Who joins the team?') : t('Choose your class'));
    el.querySelector('.cs-blurb').textContent = team0
      ? t('Four seats: the Healer always comes, you play your class, and you choose who fills the rest. The AI plays everyone you do not.')
      : t('You play one of the five. The AI plays the rest of the party of four, so it is always whole.');
    el.querySelector('.cs-k-move').textContent = team0 ? t('Choose') : t('Class');
    el.querySelector('.cs-k-pick').textContent = team0 ? t('Joins or stays') : t('Play this class');
    el.querySelector('.cs-k-back').textContent = team0 ? t('Done') : t('Back to camp');
    const on = chosen();
    const names = (list) => list.map((c) => t(CLASS_NAME[c])).join(', ');
    lineupBtn.textContent = team0
      ? draft.length === 3
        ? t('Done')
        : t('{n} of 3 chosen · the rest from today’s party', { n: draft.length })
      : t('Team: {names}', { names: names(['healer', ...teamNow()]) });
    for (const b of gridEl.querySelectorAll('.cs-card')) {
      const cls = b.dataset.cls;
      const st = cls === 'healer' ? HEALER : ALLY_CLASSES[cls];
      const head =
        (cls === 'tidecaller' ? `<span class="cs-new">${esc(t('NEW'))}</span>` : '') +
        `<div class="cs-crit">${esc(t('THE {critter}', { critter: t(CLASS_CRITTER[cls]).toUpperCase() }))}</div>` +
        `<div class="cs-name">${esc(t(CLASS_NAME[cls]))}</div>`;
      if (team0) {
        const healer = cls === 'healer';
        const you = cls === on && !healer;
        const joins = healer || you || draft.includes(cls);
        b.dataset.on = String(joins);
        b.disabled = healer || you;
        b.innerHTML =
          head +
          `<div class="cs-role">${esc(healer ? t('The bell-carrier always comes along.') : you ? t('You play this class, so it comes along.') : ROLE[cls]())}</div>` +
          `<div class="cs-stats"><span>${t('Health <b>{hp}</b>', { hp: st.maxHp })}</span><span>${t('Speed <b>{speed}</b>', { speed: st.moveSpeed })}</span></div>` +
          `<div class="cs-kit"></div>` +
          `<div class="cs-foot">${esc(you ? t('Playing') : joins ? t('✓ Joins') : t('Stays at camp'))}</div>`;
      } else {
        const kit = wornKit(cls);
        const skills = startSkills(cls, kit);
        const away = cls !== 'healer' && !teamNow().includes(cls);
        b.dataset.on = String(cls === on);
        b.disabled = false;
        b.innerHTML =
          head +
          `<div class="cs-role">${esc(ROLE[cls]())}</div>` +
          `<div class="cs-stats"><span>${t('Health <b>{hp}</b>', { hp: st.maxHp })}</span><span>${t('Speed <b>{speed}</b>', { speed: st.moveSpeed })}</span></div>` +
          `<div class="cs-kit"><h4>${esc(kit ? t('KIT · {name}', { name: t(kit.name).toUpperCase() }) : t('STARTS WITH'))}</h4>${skills.length ? skills.map(esc).join(' · ') : esc(t('Basic attack and dodge. Skills come from wave rewards.'))}</div>` +
          `<div class="cs-foot">${esc(cls === on ? t('✓ Playing') : away ? t('At camp · Play') : t('Play'))}</div>`;
      }
      b.setAttribute('aria-label', b.textContent.replace(/\s+/g, ' ').trim());
    }
  }

  function save() {
    if (settings) settings.set(TEAM_KEY, draft.join(','));
  }

  function pick(cls) {
    if (!settings || !playable(cls)) return false;
    const joined = cls === 'healer' || teamNow().includes(cls);
    settings.set(PLAY_CLASS_KEY, cls);
    log.push(cls);
    if (log.length > 20) log.shift();
    if (typeof app.toast === 'function') app.toast(t('You play the {cls}', { cls: t(CLASS_NAME[cls]) }), { tone: 'info', ms: 2600 });
    // A class that was not in the team joins in place of the last pick;
    // show the team so the player sees who made room.
    if (!joined) {
      settings.set(TEAM_KEY, teamNow().join(','));
      show('team');
      return true;
    }
    render();
    if (manager.top() === 'classes') manager.pop();
    return true;
  }

  // Team view: a card joins or stays at camp. The Healer and the class you
  // play always join; three seats besides the Healer.
  function toggle(cls) {
    if (!settings || cls === 'healer' || cls === chosen() || !playable(cls)) return false;
    if (draft.includes(cls)) draft = draft.filter((c) => c !== cls);
    else if (draft.length >= 3) {
      noteEl.textContent = t('The team is full: choose someone to stay at camp first.');
      return false;
    } else draft = LINEUP_CLASSES.filter((c) => c === cls || draft.includes(c));
    noteEl.textContent = '';
    save();
    log.push(`team:${draft.join('+')}`);
    if (log.length > 20) log.shift();
    render();
    return true;
  }

  function done() {
    if (draft.length < 3 && typeof app.toast === 'function') app.toast(t('The rest of the team comes from today’s party'), { tone: 'info', ms: 2600 });
    if (typeof app.toast === 'function' && draft.length === 3) app.toast(t('Team: {names}', { names: ['healer', ...teamNow()].map((c) => t(CLASS_NAME[c])).join(', ') }), { tone: 'info', ms: 2600 });
    if (openedOnTeam) {
      if (manager.top() === 'classes') manager.pop();
    } else show('classes');
    return true;
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '.cs-card[data-on="true"]',
    onOpen(params = {}) {
      log = [];
      noteEl.textContent = '';
      openedOnTeam = !!(params && params.view === 'team');
      show(openedOnTeam ? 'team' : 'classes');
    },
    back() {
      if (view === 'team') return done();
      if (manager.top() === 'classes') manager.pop();
      return true;
    },
    pick,
    toggle,
    done,
    show,
    debug: () => ({
      view,
      chosen: chosen(),
      team: [...teamNow()],
      draft: draft.slice(),
      lineup: [...plannedLineup(chosen(), teamSetting())],
      log: log.slice(),
      cards: [...gridEl.querySelectorAll('.cs-card')].map((b) => ({ cls: b.dataset.cls, on: b.dataset.on === 'true', disabled: b.disabled, focused: b.classList.contains('ap-focus') })),
    }),
  };
}
