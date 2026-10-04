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

const WIN_LABEL = {
  kill_all: 'clear every enemy',
  defend: 'hold the Waystone',
  boss: 'the Hollow Stag',
};
const REWARD_LABEL = { skill: 'a Skill draft', node: 'a Node draft' };

export function createPathScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-path';
  el.innerHTML = `
    <div class="rn-title">THE WAY ON</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-strip">
      <span class="rn-lab">SKILL SLOTS FREE</span><span class="rn-num rn-free">0</span>
      <span class="rn-lab">· NEXT ROOM</span><span class="rn-num rn-next">2</span>
      <span class="rn-lab">OF 8</span>
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
    <div class="rn-hint"><b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> walk through</div>`;

  const wraps = [...el.querySelectorAll('.rn-doorwrap')];
  const doors = wraps.map((w) => w.querySelector('.rn-door'));
  const winEls = wraps.map((w) => w.querySelector('.rn-gwin'));
  const rewEls = wraps.map((w) => w.querySelector('.rn-grew'));
  const legendEl = el.querySelector('.rn-legend');
  const curseNote = el.querySelector('.rl-cursenote');
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
      winEls[i].textContent = WIN_GLYPH[o.win] ?? '⚔';
      rewEls[i].textContent = REWARD_GLYPH[o.reward] ?? '✦';
      doors[i].classList.toggle('rn-focus', p.focus === i);
      doors[i].classList.toggle('rl-cursed', !!o.curse);
      curseMarks[i].style.display = o.curse ? '' : 'none';
      wraps[i].classList.toggle('rn-on', p.focus === i);
    }
    // Screen-level legend: decodes the two glyph families for BOTH doors at
    // once, so no door carries a third piece of information.
    const win = p.options[0].win;
    legendEl.innerHTML = `
      <span><b>${WIN_GLYPH[win] ?? '⚔'}</b> ${esc(win === 'boss' ? bossNameOfRun(view).replace(/^The /, 'the ') : WIN_LABEL[win] ?? win)}</span>
      <span><b>${REWARD_GLYPH.skill}</b> ${esc(REWARD_LABEL.skill)}</span>
      <span><b>${REWARD_GLYPH.node}</b> ${esc(REWARD_LABEL.node)}</span>`;
    // RELICS: what the cursed door costs and pays (words, not colour alone).
    const cursed = p.options.find((o) => o.curse);
    const c = cursed ? CURSES[cursed.curse] : null;
    curseNote.style.display = c ? '' : 'none';
    if (c) curseNote.innerHTML = `${curseIconHtml(26)}<div><b>Cursed door (${cursed.side === 0 ? 'left' : 'right'}): ${esc(c.name)}.</b> ${esc(c.text)} Clear the room for a relic.</div>`;
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
