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
//
// Ruling A17 (the user's rule, 2026-09-27): with 4 skills owned a skill
// reward is a SWAP offer — the card is titled NEW SKILL — SWAP, the
// REPLACES selector under it shows the 4 owned skills (the one the new skill
// would replace raised + ✕ "replace"), W / S or ↑ / ↓, the mouse wheel over
// the strip or a click on a tile moves it; Take replaces it (its nodes go to
// the bench), Leave keeps the loadout. The selector opens on the AI's
// suggestion (the lowest-priority owned skill); when the AI would Leave, the
// page opens with Leave focused so a reflexive Enter never costs a skill.
import { esc, isCompact } from './style.js';
import { skillCardHtml, nodeCardHtml, RARITY_COLOR, NODE_GLYPH } from './cards.js';
import { NODES } from '../../sim/nodes.js';
import { SPOILS_PER_CLEAR } from '../../sim/draft.js';
import { SKILLS } from '../../sim/skills.js';
import { cardIconHtml } from './cards.js';

export function createDraftScreen({ run, build }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-draft';
  el.innerHTML = `
    <div class="rn-title">A GIFT ON THE ROAD</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-strip">
      <span class="rn-lab rn-freelab">SKILL SLOTS FREE</span><span class="rn-num rn-free">0</span>
      <span class="rn-lab">· ROOM</span><span class="rn-num rn-room">1</span>
    </div>
    <div class="rn-cardhost"></div>
    <div class="rn-replace" style="display:none"></div>
    <div class="rn-note rn-repline" style="display:none"></div>
    <div class="rn-note rn-subline" style="display:none"></div>
    <div class="rn-note rn-spoils" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn rn-take rn-primary">Take</div>
      <div class="rn-btn rn-decline">Decline</div>
    </div>
    <div class="rn-hint rn-drafthint"><b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> commit · <b>X</b> decline · <b>Esc</b> pause</div>`;
  const HINT_PLAIN = el.querySelector('.rn-drafthint').innerHTML;
  const HINT_SWAP =
    '<b>W</b>/<b>S</b> or <b>↑</b>/<b>↓</b> replace · <b>A</b>/<b>D</b> choose · <b>Enter</b> commit · <b>X</b> leave · <b>Esc</b> pause';

  const host = el.querySelector('.rn-cardhost');
  const subline = el.querySelector('.rn-subline');
  const spoilsEl = el.querySelector('.rn-spoils');
  const btnTake = el.querySelector('.rn-take');
  const btnDecline = el.querySelector('.rn-decline');
  const freeEl = el.querySelector('.rn-free');
  const freeLab = el.querySelector('.rn-freelab');
  const roomEl = el.querySelector('.rn-room');
  const repEl = el.querySelector('.rn-replace');
  const repLine = el.querySelector('.rn-repline');
  const hintEl = el.querySelector('.rn-drafthint');
  let swapView = null; // { replace, ids } of the swap offer on the card, else null
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
  // Ruling A17: a click on a tile picks it; the wheel over the strip cycles.
  repEl.addEventListener('click', (e) => {
    const t = e.target.closest('.rn-rep');
    if (!t || !swapView) return;
    run().setRewardReplace(Number(t.dataset.slot));
  });
  repEl.addEventListener(
    'wheel',
    (e) => {
      if (!swapView) return;
      e.preventDefault();
      cycleReplace(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  function cycleReplace(dir) {
    if (!swapView) return false;
    const owned = swapView.ids.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
    if (owned.length === 0) return false;
    const at = owned.indexOf(swapView.replace);
    const next = owned[(at + dir + owned.length) % owned.length];
    const r = run().setRewardReplace(next);
    if (Number.isInteger(r)) swapView.replace = r;
    return true;
  }

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
      // A new candidate is a new page: it opens on Take — except a swap the
      // AI would Leave (ruling A17), which opens on Leave.
      focus = r.swap && r.suggest === 'leave' ? 1 : 0;
    }
    const sys = build();
    freeLab.textContent = r.swap ? 'SKILL SLOTS FULL · CHOOSE ONE TO REPLACE, OR LEAVE' : 'SKILL SLOTS FREE';
    freeEl.style.display = r.swap ? 'none' : '';
    hintEl.innerHTML = r.swap ? HINT_SWAP : HINT_PLAIN;
    if (r.type === 'skill') {
      host.innerHTML = `<div class="rn-card" style="--rar:${RARITY_COLOR.common}">${skillCardHtml(
        r.id
      )}</div>`;
      if (r.swap) {
        const kind = host.querySelector('.rn-cardkind');
        if (kind) kind.innerHTML = `<span class="rn-swapkind">NEW SKILL — SWAP</span>`;
      }
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
    renderSwap(r, sys);
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
    btnDecline.textContent = empty ? 'Continue' : r.swap ? 'Leave' : 'Decline';
    btnTake.textContent = r.swap ? 'Take · Replace' : 'Take';
    if (empty) focus = 1;
    paintFocus();
  }

  // Ruling A17: the Replaces selector of a swap offer.
  function renderSwap(r, sys) {
    if (!(r.type === 'skill' && r.swap)) {
      swapView = null;
      repEl.style.display = 'none';
      repEl.innerHTML = '';
      repLine.style.display = 'none';
      repLine.textContent = '';
      return;
    }
    const skills = sys ? sys.view().skills : [];
    const ids = [0, 1, 2, 3].map((i) => (skills[i] ? skills[i].id : null));
    swapView = { replace: r.replace, ids };
    repEl.style.display = '';
    repEl.innerHTML = skills
      .slice(0, 4)
      .map((sk, i) => {
        const def = SKILLS[sk.id];
        const sel = i === r.replace;
        return `<div class="rn-rep${sel ? ' rn-sel' : ''}" data-slot="${i}" data-skill="${esc(sk.id)}">
          <span class="rn-repkey">${i + 1}</span><span class="rn-repx">✕</span>
          ${cardIconHtml(sk.id, 30)}
          <div class="rn-repname">${esc(def ? def.name : sk.id)}</div>
          <div class="rn-repmeta">${sel ? 'replace · ' : ''}◈ ${sk.filled}</div>
        </div>`;
      })
      .join('');
    const out = skills[r.replace];
    const newName = SKILLS[r.id] ? SKILLS[r.id].name : r.id;
    const oldName = out && SKILLS[out.id] ? SKILLS[out.id].name : out ? out.id : '';
    const n = out ? out.filled : 0;
    const nodes = n === 0 ? `${oldName} holds no nodes` : `${oldName}'s ${n} node${n === 1 ? '' : 's'} go to the bench`;
    const advice = r.suggest === 'leave' ? ' · suggested: Leave — your four outrank it' : '';
    repLine.style.display = '';
    repLine.textContent = `${newName} replaces ${oldName} — ${nodes}${advice}`;
  }

  // Returns true when the key was consumed.
  function key(code, fresh) {
    // Ruling A17: W / S, ↑ / ↓ move the Replaces mark (fresh presses only —
    // the page's settle window already dropped carried-over strafes).
    if (swapView && (code === 'KeyW' || code === 'ArrowUp' || code === 'KeyS' || code === 'ArrowDown')) {
      if (fresh) cycleReplace(code === 'KeyW' || code === 'ArrowUp' ? -1 : 1);
      return true;
    }
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

  // Probe surface (runUi().draft): what the page shows.
  const probe = () => ({ focus, swap: !!swapView, replace: swapView ? swapView.replace : null, ids: swapView ? [...swapView.ids] : null });

  return { el, render, key, open, probe, name: 'draft' };
}
