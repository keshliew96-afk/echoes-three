// Path choice (BUILD_BRIEF §16 "Path choice"): two door panels, 160x220
// design-px, each showing ONLY a win-condition glyph + a reward-type glyph.
// `free_skill_slots` is displayed at SCREEN level (never on a door), and so is
// the glyph legend — the doors themselves carry two glyphs and nothing else.
//
// A/D or arrows focus; Enter commits under the FRESH-PRESS RULE (a held Enter
// carried in from the draft screen never commits). Irreversible; Esc inert.
// RELICS: a cursed door wears the curse mark; its words ride a note below.
import { CURSES } from '../../sim/relics.js';
import { curseIconHtml } from './relicicons.js';
import { esc } from './style.js';
import { WIN_GLYPH, REWARD_GLYPH } from '../../sim/run.js';
import { bossNameOfRun } from '../../data/levels.js';
import { t } from '../../i18n/index.js';
import { championById } from '../../sim/champions.js';
import { iconHtml } from '../hud/icons.js';

const WIN_LABEL = {
  kill_all: () => t('clear every enemy'),
  defend: () => t('hold the Waystone'),
  hunt: () => t('hunt the quarry before it escapes'),
  purge: () => t('destroy the three nests'),
  champion: () => t('fell the champion'),
  vault: () => t('the vault'),
  boss: () => t('the Hollow Stag'),
};
const REWARD_LABEL = { skill: () => t('a Skill draft'), node: () => t('a Node draft') };

export function createPathScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-path';
  el.innerHTML = `
    <div class="rn-title">${esc(t('THE WAY ON'))}</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-strip">
      <span class="rn-lab">${esc(t('SKILL SLOTS FREE'))}</span><span class="rn-num rn-free">0</span>
      <span class="rn-lab">· ${esc(t('NEXT ROOM'))}</span><span class="rn-num rn-next">2</span>
      <span class="rn-lab">${esc(t('OF {n}', { n: 8 }))}</span>
    </div>
    <div class="rn-doors">
      <div class="rn-doorwrap" data-side="0">
        <div class="rn-door">
          <div class="rn-gwin">⚔</div>
          <div class="rn-split"></div>
          <div class="rn-grew">✦</div>
        </div>
        <div class="rn-caret">▲</div>
      </div>
      <div class="rn-doorwrap" data-side="1">
        <div class="rn-door">
          <div class="rn-gwin">⚔</div>
          <div class="rn-split"></div>
          <div class="rn-grew">◈</div>
        </div>
        <div class="rn-caret">▲</div>
      </div>
    </div>
    <div class="rn-legend"></div>
    <div class="rl-cursenote" style="display:none"></div>
    <div class="ev-note" style="display:none"></div>
    <div class="ev-note ch-note" style="display:none"></div>
    <div class="ev-note vk-note" style="display:none"></div>
    <div class="rn-hint">${t('<b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> walk through')}</div>`;

  const wraps = [...el.querySelectorAll('.rn-doorwrap')];
  const doors = wraps.map((w) => w.querySelector('.rn-door'));
  const winEls = wraps.map((w) => w.querySelector('.rn-gwin'));
  const rewEls = wraps.map((w) => w.querySelector('.rn-grew'));
  const legendEl = el.querySelector('.rn-legend');
  const curseNote = el.querySelector('.rl-cursenote');
  const eventNote = el.querySelector('.ev-note:not(.ch-note):not(.vk-note)');
  const crownNote = el.querySelector('.ch-note');
  const vaultNote = el.querySelector('.vk-note');
  const curseMarks = doors.map((d) => {
    const m = document.createElement('div');
    m.className = 'rl-gcurse';
    m.innerHTML = curseIconHtml(30);
    m.style.display = 'none';
    d.appendChild(m);
    return m;
  });
  const freeEl = el.querySelector('.rn-free');
  const nextEl = el.querySelector('.rn-next');

  wraps.forEach((w, i) => {
    w.addEventListener('mouseenter', () => run().focusPath(i));
    w.addEventListener('click', () => {
      run().focusPath(i);
      run().choosePath(i);
    });
  });

  function render(view) {
    const p = view.path;
    if (!p) return;
    freeEl.textContent = String(p.freeSkillSlots);
    nextEl.textContent = String(p.nextRoom);
    for (let i = 0; i < 2; i++) {
      const o = p.options[i];
      // KEYS AND VAULTS: the vault door wears a drawn keyhole (no font glyph).
      if (o.vault) {
        if (winEls[i].dataset.vk !== '1') {
          winEls[i].dataset.vk = '1';
          winEls[i].innerHTML = iconHtml('keyhole', { size: 78 });
        }
      } else {
        delete winEls[i].dataset.vk;
        winEls[i].textContent = WIN_GLYPH[o.win] ?? '⚔';
      }
      rewEls[i].textContent = REWARD_GLYPH[o.reward] ?? '✦';
      doors[i].classList.toggle('rn-focus', p.focus === i);
      doors[i].classList.toggle('rl-cursed', !!o.curse);
      doors[i].classList.toggle('rl-major', !!o.major);
      // EVENT ROOMS: the "?" door wears one big mark and no reward glyph.
      doors[i].classList.toggle('ev-door', !!o.event);
      // CHAMPION ROOMS: the crown door is gold-rimmed and keeps its reward.
      doors[i].classList.toggle('ch-door', !!o.champion);
      // KEYS AND VAULTS: the vault door is iron and gold and keeps its reward.
      doors[i].classList.toggle('vk-door', !!o.vault);
      curseMarks[i].style.display = o.curse ? '' : 'none';
      // Slice 2: a MAJOR curse wears the chained mark.
      const mk = o.major ? 'major' : 'room';
      if (curseMarks[i].dataset.mk !== mk) {
        curseMarks[i].dataset.mk = mk;
        curseMarks[i].innerHTML = curseIconHtml(30, !!o.major);
      }
      wraps[i].classList.toggle('rn-on', p.focus === i);
    }
    // Screen-level legend: decodes the two glyph families for BOTH doors at
    // once, so no door carries a third piece of information.
    // EVENT ROOMS: the legend decodes the room behind the plain door.
    // CHAMPION ROOMS: and never the crown door (its note below says it all).
    // KEYS AND VAULTS: nor the vault door.
    const plain = p.options.find((o) => !o.event && !o.champion && !o.vault) ?? p.options.find((o) => !o.event && !o.vault) ?? p.options[0];
    const win = plain.win;
    legendEl.innerHTML = `
      <span><b>${WIN_GLYPH[win] ?? '⚔'}</b> ${esc(win === 'boss' ? t(bossNameOfRun(view)).replace(/^The /, 'the ') : WIN_LABEL[win] ? WIN_LABEL[win]() : win)}</span>
      <span><b>${REWARD_GLYPH.skill}</b> ${esc(REWARD_LABEL.skill())}</span>
      <span><b>${REWARD_GLYPH.node}</b> ${esc(REWARD_LABEL.node())}</span>`;
    // RELICS: what the cursed door costs and pays (words, not colour alone).
    const cursed = p.options.find((o) => o.curse);
    const c = cursed ? CURSES[cursed.curse] : null;
    curseNote.style.display = c ? '' : 'none';
    curseNote.classList.toggle('rl-majornote', !!(cursed && cursed.major));
    const left = cursed && cursed.side === 0;
    if (c && cursed.major)
      curseNote.innerHTML = `${curseIconHtml(26, true)}<div>${
        left
          ? t('<b>Major curse (left door): {name}.</b> {text} Clear the room for a greater relic (rare or legendary).', { name: esc(t(c.name)), text: esc(t(c.text)) })
          : t('<b>Major curse (right door): {name}.</b> {text} Clear the room for a greater relic (rare or legendary).', { name: esc(t(c.name)), text: esc(t(c.text)) })
      }</div>`;
    else if (c)
      curseNote.innerHTML = `${curseIconHtml(26)}<div>${
        left
          ? t('<b>Cursed door (left): {name}.</b> {text} Clear the room for a relic.', { name: esc(t(c.name)), text: esc(t(c.text)) })
          : t('<b>Cursed door (right): {name}.</b> {text} Clear the room for a relic.', { name: esc(t(c.name)), text: esc(t(c.text)) })
      }</div>`;
    // EVENT ROOMS: what the "?" door means (words, not the mark alone).
    const ev = p.options.find((o) => o.event);
    eventNote.style.display = ev ? '' : 'none';
    if (ev)
      eventNote.innerHTML =
        ev.side === 0
          ? t('<b>? Left door: an event.</b> No fight: a trade of HP, Glint, a curse or a relic for a reward. It takes the place of this room and its draft.')
          : t('<b>? Right door: an event.</b> No fight: a trade of HP, Glint, a curse or a relic for a reward. It takes the place of this room and its draft.');
    // CHAMPION ROOMS: who waits behind the crown door and what it pays.
    const cr = p.options.find((o) => o.champion);
    const champ = cr ? championById(cr.champion) : null;
    crownNote.style.display = cr ? '' : 'none';
    if (cr) {
      const name = esc(t(champ ? champ.name : 'The Champion'));
      crownNote.innerHTML =
        cr.side === 0
          ? t('<b>♛ Left door: {name}.</b> A champion and two light waves. Fell it for a relic chest (rare or legendary) on top of the draft.', { name })
          : t('<b>♛ Right door: {name}.</b> A champion and two light waves. Fell it for a relic chest (rare or legendary) on top of the draft.', { name });
    }
    // KEYS AND VAULTS: the party's key opens the vault door.
    const vd = p.options.find((o) => o.vault);
    vaultNote.style.display = vd ? '' : 'none';
    if (vd) {
      const key = iconHtml('key', { size: 22 });
      vaultNote.innerHTML =
        vd.side === 0
          ? t('{key} <b>Left door: the vault.</b> Your key opens it: no fight, a hoard of Glint, a feast and a relic chest, then the draft. The key lasts only this level.', { key })
          : t('{key} <b>Right door: the vault.</b> Your key opens it: no fight, a hoard of Glint, a feast and a relic chest, then the draft. The key lasts only this level.', { key });
    }
    shownFocus = p.focus;
  }
  // fix-M3-r5 (AUD5-F1): the focused door as drawn, the selection signature
  // the run UI polls for its selection ticks (src/audio/uiselect.js).
  let shownFocus = null;
  const sel = () => (shownFocus === null ? null : `0|${shownFocus}`);

  function key(code, fresh) {
    const sys = run();
    const view = sys.view();
    const focus = view.path ? view.path.focus : 0;
    if (code === 'KeyA' || code === 'ArrowLeft') {
      sys.focusPath(0);
      render(sys.view());
      return true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      sys.focusPath(1);
      render(sys.view());
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      // §16 FRESH-PRESS RULE: "a held Enter from the previous screen never
      // commits". `fresh` is false for auto-repeat and for any key that was
      // already down when this screen opened.
      if (!fresh) return true;
      sys.choosePath(focus);
      return true;
    }
    // Esc is NOT this page's key (PLAN §1.5, ruling A13): it passes through,
    // unconsumed, to the pause menu. The page itself stays inert to it.
    return false;
  }

  // Gamepad (PLAN §16.4 pad parity on the build pages; fix-M3-r5 — the door
  // picker had no pad() at all, so a pad could neither move nor commit here):
  // d-pad / stick left / right focus a door, A walks through the focused one.
  // The run UI's padAction drops both while the page settles.
  function pad(action) {
    const sys = run();
    if (action === 'left' || action === 'right') {
      sys.focusPath(action === 'left' ? 0 : 1);
      render(sys.view());
      return true;
    }
    if (action === 'confirm') {
      const view = sys.view();
      sys.choosePath(view.path ? view.path.focus : 0);
      return true;
    }
    return false;
  }

  return { el, render, key, pad, sel, name: 'path' };
}
