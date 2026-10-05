// CLASS SELECT (docs/CLASS_SELECT.md) — the camp's class picker. An app
// screen (registerScreen('classes')) the camp opens with C or the portal
// prompt's "Class" chip. Four cards — Healer, Tank, Swordsman, Archer — each
// with its critter, role, health, speed and the starting skills (the
// equipped unlock kit's when one is worn). Picking a card sets the
// `gameplay.playClass` setting: the next steps put the player on that body
// and the AI plays the other three. Esc / B backs out to the camp.
// Blocking: the single-player sim pauses while it is open.
import { px } from '../../app/style.js';
import { PALETTE as P, CLASS_ACCENTS } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { CLASS_NAME, STARTING_LOADOUT } from '../../data/classes.js';
import { HEALER } from '../../core/constants.js';
import { ALLY_CLASSES } from '../../sim/allies.js';
import { SKILLS, STARTING_SKILLS } from '../../sim/skills.js';
import { UNLOCKS } from '../../data/unlocks.js';
import { SEAT_CLASSES, SEAT_CRITTERS } from '../../net/seats.js';
import { PLAY_CLASS_KEY } from '../../app/playclass.js';

const STYLE_ID = 'cs-classes-style';
const ROLE = Object.freeze({
  healer: 'Keeps the party standing: heals, wards and the revive. Fragile, so stay behind the line.',
  tank: 'Holds the front: heavy blows, taunts and the most health. Slow on its feet.',
  swordsman: 'Fast blade in the thick of it: quick strikes, dashes and burst damage.',
  archer: 'Damage from range: arrows, volleys and traps. Keep your distance.',
});
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

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
.cs-classes .cs-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: ${px(16)}; }
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
@media (max-width: 900px) { .cs-classes .cs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
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
  return ids.map((id) => (SKILLS[id] ? SKILLS[id].name : id));
}

export function createClassesScreen(ctx) {
  installStyle();
  const { manager, app } = ctx;
  const el = document.createElement('div');
  el.className = 'cs-classes';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Choose your class');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="cs-wrap ap-plate">
      <div>
        <div class="cs-kicker">BEFORE THE RUN</div>
        <h2 class="ap-h2">Choose your class</h2>
      </div>
      <div class="cs-blurb">You play one of the four. The AI plays the other three, so the party is always whole.</div>
      <div class="cs-grid"></div>
      <div class="cs-note" aria-live="polite"></div>
      <div class="cs-keys">
        <span><b>←</b><b>→</b>Class</span>
        <span><b>Enter</b>Play this class</span>
        <span><b>Esc</b>Back to camp</span>
      </div>
    </div>`;
  const gridEl = el.querySelector('.cs-grid');
  const noteEl = el.querySelector('.cs-note');
  const settings = app && app.settings ? app.settings : null;
  const chosen = () => (settings ? settings.get(PLAY_CLASS_KEY) : 'healer');
  let log = [];

  for (const cls of SEAT_CLASSES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cs-card';
    b.dataset.cls = cls;
    b.style.setProperty('--cs-acc', CLASS_ACCENTS[cls]);
    b.setAttribute('data-nav', '');
    b.addEventListener('click', () => pick(cls));
    gridEl.appendChild(b);
  }

  function render() {
    const on = chosen();
    SEAT_CLASSES.forEach((cls, i) => {
      const b = gridEl.querySelector(`[data-cls="${cls}"]`);
      const st = cls === 'healer' ? HEALER : ALLY_CLASSES[cls];
      const kit = wornKit(cls);
      const skills = startSkills(cls, kit);
      b.dataset.on = String(cls === on);
      b.innerHTML =
        `<div class="cs-crit">THE ${SEAT_CRITTERS[i].toUpperCase()}</div>` +
        `<div class="cs-name">${CLASS_NAME[cls]}</div>` +
        `<div class="cs-role">${esc(ROLE[cls])}</div>` +
        `<div class="cs-stats"><span>Health <b>${st.maxHp}</b></span><span>Speed <b>${st.moveSpeed}</b></span></div>` +
        `<div class="cs-kit"><h4>${kit ? `KIT · ${esc(kit.name.toUpperCase())}` : 'STARTS WITH'}</h4>${skills.map(esc).join(' · ')}</div>` +
        `<div class="cs-foot">${cls === on ? '✓ Playing' : 'Play'}</div>`;
      b.setAttribute('aria-label', b.textContent.replace(/\s+/g, ' ').trim());
    });
  }

  function pick(cls) {
    if (!settings || !SEAT_CLASSES.includes(cls)) return false;
    settings.set(PLAY_CLASS_KEY, cls);
    log.push(cls);
    if (log.length > 20) log.shift();
    render();
    if (typeof app.toast === 'function') app.toast(`You play the ${CLASS_NAME[cls]}`, { tone: 'info', ms: 2600 });
    if (manager.top() === 'classes') manager.pop();
    return true;
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '.cs-card[data-on="true"]',
    onOpen() {
      log = [];
      noteEl.textContent = '';
      render();
      const cur = gridEl.querySelector('.cs-card[data-on="true"]');
      if (cur && manager && typeof manager.focusElement === 'function') manager.focusElement(cur);
    },
    back() {
      if (manager.top() === 'classes') manager.pop();
      return true;
    },
    pick,
    debug: () => ({
      chosen: chosen(),
      log: log.slice(),
      cards: [...gridEl.querySelectorAll('.cs-card')].map((b) => ({ cls: b.dataset.cls, on: b.dataset.on === 'true', focused: b.classList.contains('ap-focus') })),
    }),
  };
}
