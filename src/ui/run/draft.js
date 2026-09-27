// Draft screen (BUILD_BRIEF §16 "Draft"): ONE candidate card, take-or-decline.
// No reroll. No confirm dialog. No reopen. When the promised pool is empty the
// card carries the substitution line ("no slot free — offering a Node
// instead"); when both pools are empty the page says "the run moves on" and
// offers a single Continue.
//
// `free_skill_slots` (4 − owned: at most 4 skills, M4c) rides the screen strip
// so the player can see WHY a skill reward turned into a node. The room's
// CLEAR SPOILS (M4c node supply: 2 nodes straight to the bench per combat
// clear) are named on their own line under the card — they are already on
// the bench, whatever the player does with this candidate.
import { esc, isCompact } from './style.js';
import { skillCardHtml, nodeCardHtml, RARITY_COLOR, NODE_GLYPH } from './cards.js';
import { NODES } from '../../sim/nodes.js';
import { SPOILS_PER_CLEAR } from '../../sim/draft.js';

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
    <div class="rn-note rn-spoils" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn rn-take rn-primary">Take</div>
      <div class="rn-btn rn-decline">Decline</div>
    </div>
    <div class="rn-hint"><b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> commit · <b>X</b> decline · <b>Esc</b> pause</div>`;

  const host = el.querySelector('.rn-cardhost');
  const subline = el.querySelector('.rn-subline');
  const spoilsEl = el.querySelector('.rn-spoils');
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
        upgrade: r.upgrade ?? null, // fix-M4a-r4: a full build's offer names its swap
      })}</div>`;
    } else {
      // fix-M4a-r4: the page says WHY nothing is offered, truthfully. With the
      // upgrade layer this only happens once no node fills or outranks any
      // socket of the 4 skills (the old "Both pools are spent" was untrue: the
      // pools were filtered out by a full build, not spent).
      // (A reward emptied by the schema-1 save migration carries no reason:
      // it gets the neutral line, never the build-complete claim.)
      const complete = r.reason === 'build_complete';
      host.innerHTML = `<div class="rn-card" style="--rar:${complete ? RARITY_COLOR.legendary : RARITY_COLOR.common}">
        <div class="rn-cardkind">${complete ? 'BUILD COMPLETE' : 'NOTHING TO OFFER'}</div>
        <div class="rn-cardicon">${complete ? '★' : '·'}</div>
        <div class="rn-cardname">${complete ? 'Nothing outranks your build' : 'Empty-handed'}</div>
        <div class="rn-body">${
          complete
            ? 'All 4 skills are equipped and every socket already holds a node no reward could beat.'
            : 'This reward has nowhere to go in your kit.'
        }</div></div>`;
    }
    // Clear spoils of THIS room (already on the bench).
    const dropped = !!(view.spoils && view.spoils.room === view.room); // a clear (a soft-fail forfeits: no drop)
    const sp = dropped ? view.spoils.nodes : [];
    const spUp = dropped && view.spoils.upgrades ? view.spoils.upgrades : [];
    const short = dropped && sp.length < SPOILS_PER_CLEAR;
    if (sp.length) {
      spoilsEl.style.display = '';
      // fix-M4a-r4: a drop that UPGRADES a full build carries ⇧, and the line
      // says how it gets in (B opens the sockets, F auto-fill swaps it in). A
      // SHORT drop says why it is short — the pools are not "spent", the
      // build has outgrown every common and rare that is left.
      const tail = short
        ? ' — the last common / rare upgrade: <b>F</b> auto-fill swaps it in'
        : spUp.length
          ? ' — <b>⇧</b> upgrades: <b>B</b> sockets · <b>F</b> auto-fill swaps them in'
          : '';
      spoilsEl.innerHTML = `<b>Spoils</b> → bench: ${sp
        .map((id) => {
          const n = NODES[id];
          const up = spUp.includes(id) ? '⇧ ' : '';
          return `<span style="color:${RARITY_COLOR[n ? n.rarity : 'common']}">${up}${esc(NODE_GLYPH[id] ?? '')} ${esc(n ? n.name : id)}</span>`;
        })
        .join(' · ')}${tail}`;
    } else if (short) {
      spoilsEl.style.display = '';
      spoilsEl.innerHTML = '<b>Spoils</b>: none — no common or rare node outranks your build any more';
    } else {
      spoilsEl.style.display = 'none';
      spoilsEl.textContent = '';
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
