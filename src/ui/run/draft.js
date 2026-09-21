// Draft screen (BUILD_BRIEF §16 "Draft"): ONE candidate card, take-or-decline.
// No reroll. No confirm dialog. No reopen. When the promised pool is empty the
// card carries the substitution line ("no slot free — offering a Node
// instead"); when both pools are empty the page says "the run moves on" and
// offers a single Continue.
//
// `free_skill_slots` rides the screen strip so the player can see WHY a skill
// reward turned into a node.
import { esc, isCompact } from './style.js';
import { skillCardHtml, nodeCardHtml, RARITY_COLOR } from './cards.js';
import { NODES } from '../../sim/nodes.js';

export function createDraftScreen({ run, build }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-draft';
  el.innerHTML = `
    <div class="rn-title">A GIFT ON THE ROAD</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-strip">
      <span class="rn-lab">SKILL SLOTS FREE</span><span class="rn-num rn-free">0</span>
      <span class="rn-lab">· ROOM</span><span class="rn-num rn-room">1</span>
    </div>
    <div class="rn-cardhost"></div>
    <div class="rn-note rn-subline" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn rn-take rn-primary">Take</div>
      <div class="rn-btn rn-decline">Decline</div>
    </div>
    <div class="rn-hint"><b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> commit · <b>X</b> decline · <b>Esc</b> pause</div>`;

  const host = el.querySelector('.rn-cardhost');
  const subline = el.querySelector('.rn-subline');
  const btnTake = el.querySelector('.rn-take');
  const btnDecline = el.querySelector('.rn-decline');
  const freeEl = el.querySelector('.rn-free');
  const roomEl = el.querySelector('.rn-room');
  // 0 = Take (the rn-primary), 1 = Decline. This is PER PAGE state: it is
  // re-initialised to Take every time the page opens (`open()`, called by the
  // manager) and again whenever the candidate on the card changes, so a
  // Decline the player moved to on one reward can never be the focus a later
  // reward opens on (certification B-r3 F1). Decline is only ever focused by
  // a deliberate choose-right made on THIS page after it settled.
  let focus = 0;
  let shown = ''; // room:type:id of the candidate currently on the card

  btnTake.addEventListener('click', () => run().takeReward());
  btnDecline.addEventListener('click', () => run().declineReward());

  function paintFocus() {
    btnTake.classList.toggle('rn-focus', focus === 0);
    btnDecline.classList.toggle('rn-focus', focus === 1);
  }

  function open() {
    focus = 0;
    paintFocus();
  }

  function render(view) {
    const r = view.reward;
    freeEl.textContent = String(view.freeSkillSlots);
    roomEl.textContent = String(view.room);
    if (!r) return;
    const candidate = `${view.room}:${r.type}:${r.id}`;
    if (candidate !== shown) {
      shown = candidate;
      focus = 0; // a new candidate is a new page: it opens on Take
    }
    const sys = build();
    if (r.type === 'skill') {
      host.innerHTML = `<div class="rn-card" style="--rar:${RARITY_COLOR.common}">${skillCardHtml(
        r.id
      )}</div>`;
    } else if (r.type === 'node') {
      const n = NODES[r.id];
      const verdict = sys ? sys.kitVerdict(r.id) : null;
      const extra = r.id === 'siphon' && sys ? sys.siphonCardLine() : null;
      host.innerHTML = `<div class="rn-card${
        n && n.rarity === 'legendary' ? ' rn-legendary' : ''
      }" style="--rar:${RARITY_COLOR[n ? n.rarity : 'common']}">${nodeCardHtml(r.id, {
        verdict,
        extra,
        compact: isCompact(),
      })}</div>`;
    } else {
      host.innerHTML = `<div class="rn-card" style="--rar:${RARITY_COLOR.common}">
        <div class="rn-cardkind">NOTHING LEFT TO OFFER</div>
        <div class="rn-cardicon">·</div>
        <div class="rn-cardname">Empty-handed</div>
        <div class="rn-body">Both pools are spent.</div></div>`;
    }
    // Substitution / empty line (§16).
    if (r.line) {
      subline.style.display = '';
      subline.textContent = r.line;
    } else {
      subline.style.display = 'none';
      subline.textContent = '';
    }
    // Both pools empty => a single "Continue" (nothing to take or decline).
    const empty = !r.type;
    btnTake.style.display = empty ? 'none' : '';
    btnDecline.textContent = empty ? 'Continue' : 'Decline';
    if (empty) focus = 1;
    paintFocus();
  }

  // Returns true when the key was consumed.
  function key(code, fresh) {
    if (code === 'KeyA' || code === 'ArrowLeft') {
      focus = 0;
      paintFocus();
      return true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      focus = 1;
      paintFocus();
      return true;
    }
    // Ruling A13 (PLAN §1.5): Esc opens the pause menu on every page and is
    // never consumed here — a reflexive pause press can never forfeit a
    // reward. Decline is X (settle-guarded + fresh-press, exactly like Enter)
    // or the Decline button.
    if (code === 'KeyX') {
      if (!fresh) return true;
      run().declineReward();
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      // Fresh-press rule: a key carried in from the previous screen never
      // commits (§16 binds it for the path screen; the drafts hold the same
      // line so a held Enter can never walk the whole reward chain).
      if (!fresh) return true;
      if (focus === 0 && btnTake.style.display !== 'none') run().takeReward();
      else run().declineReward();
      return true;
    }
    return false;
  }

  return { el, render, key, open, name: 'draft' };
}
