// The PARTY PAGE (BUILD_BRIEF §25.6, PLAN §16.4) — the reward page after every
// combat room: one card per character on one page. Root class `rn-draft` is
// kept so every existing probe finds it; with the ally supply off (no
// `run.view().party`) it is exactly the §16 one-card draft page.
//
// §16 rules per card: ONE candidate, take-or-decline (Leave), no reroll, no
// confirm dialog, no reopen; the substitution / empty lines; the room's CLEAR
// SPOILS named on their own line (already on that character's bench).
//
// Ruling A17 (the user's rule, 2026-09-27): with 4 skills owned a skill card
// is a SWAP offer for EVERY character, the Healer included — titled NEW SKILL —
// SWAP, the REPLACES selector under it shows that character's 4 owned skills
// (the one the new skill would replace raised + ✕ "replace"); W / S or ↑ / ↓,
// the pad's D-pad, the mouse wheel over the strip or a click on a tile moves
// it; Take replaces it (its nodes go to that character's bench), Leave keeps
// the loadout. The selector opens on the AI's suggestion (§25.8); when the AI
// would Leave, the card opens on Leave so a reflexive Enter never costs a skill
// — and the moment the player picks the skill to replace, focus moves to
// "Take · Replace", so Enter / A commits that choice (gauntlet r5 F3).
//
// The PARTY STRIP (partystrip.js) across the top: the viewed character's card
// below it with its owner band ("FOR THE TANK"). Switching character is
// navigation, never a commit: Q / E, PgUp / PgDn, F1-F4, a click on a tab,
// pad LB / RB (the run UI's settle window drops them for the page's first
// 300 ms). Enter decides the viewed card and moves to the next card THIS
// player still has to decide; with none left the sim commits the page. In
// Suggested mode (default) the AI-held cards open decided, so ONE Enter on the
// Healer's card commits — exactly the Healer-only flow. Manual: nothing is
// pre-decided (4 Enters). Automatic: AI-held cards are a summary line.
import { esc, isCompact } from './style.js';
import { skillCardHtml, nodeCardHtml, RARITY_COLOR, NODE_GLYPH, cardIconHtml } from './cards.js';
import { NODES } from '../../sim/nodes.js';
import { SPOILS_PER_CLEAR } from '../../sim/draft.js';
import { SKILLS } from '../../sim/skills.js';
import { CLASS_OF_SEAT, CLASS_NAME } from '../../data/classes.js';
import { createPartyStrip, ownerBandHtml } from './partystrip.js';
import { service } from '../../app/registry.js';

const TICK_HZ = 60;

export function createDraftScreen({ run, build, party = () => null }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-draft';
  el.innerHTML = `
    <div class="rn-title">A GIFT ON THE ROAD</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-striphost"></div>
    <div class="rn-headrow">
      <div class="rn-strip">
        <span class="rn-lab rn-freelab">SKILL SLOTS FREE</span><span class="rn-num rn-free">0</span>
        <span class="rn-lab">· ROOM</span><span class="rn-num rn-room">1</span>
      </div>
      <div class="rn-ownerhost"></div>
    </div>
    <div class="rn-cardrow">
      <div class="rn-cardhost"></div>
      <div class="rn-replace" style="display:none"></div>
    </div>
    <div class="rn-noterow">
      <div class="rn-note rn-repline" style="display:none"></div>
      <div class="rn-note rn-subline" style="display:none"></div>
      <div class="rn-note rn-spoils" style="display:none"></div>
      <div class="rn-note rn-summary-line" style="display:none"></div>
      <div class="rn-note rn-countdown" style="display:none"></div>
    </div>
    <div class="rn-buttons">
      <div class="rn-btn rn-take rn-primary">Take</div>
      <div class="rn-btn rn-decline">Decline</div>
    </div>
    <div class="rn-hint rn-drafthint"></div>`;

  const stripHost = el.querySelector('.rn-striphost');
  const ownerHost = el.querySelector('.rn-ownerhost');
  const host = el.querySelector('.rn-cardhost');
  const subline = el.querySelector('.rn-subline');
  const spoilsEl = el.querySelector('.rn-spoils');
  const summaryEl = el.querySelector('.rn-summary-line');
  const countdownEl = el.querySelector('.rn-countdown');
  const btnTake = el.querySelector('.rn-take');
  const btnDecline = el.querySelector('.rn-decline');
  const freeEl = el.querySelector('.rn-free');
  const freeLab = el.querySelector('.rn-freelab');
  const roomEl = el.querySelector('.rn-room');
  const repEl = el.querySelector('.rn-replace');
  const repLine = el.querySelector('.rn-repline');
  const hintEl = el.querySelector('.rn-drafthint');
  const HINT_PARTY =
    '<b>Q</b>/<b>E</b> · <b>F1</b>–<b>F4</b> character · <b>A</b>/<b>D</b> choose · <b>Enter</b> commit · <b>X</b> leave · <b>Esc</b> pause';
  const HINT_SWAP =
    '<b>Q</b>/<b>E</b> · <b>F1</b>–<b>F4</b> character · <b>W</b>/<b>S</b> replace · <b>A</b>/<b>D</b> choose · <b>Enter</b> commit · <b>X</b> leave';
  const HINT_SOLO = '<b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> commit · <b>X</b> decline · <b>Esc</b> pause';
  const HINT_SOLO_SWAP =
    '<b>W</b>/<b>S</b> or <b>↑</b>/<b>↓</b> replace · <b>A</b>/<b>D</b> choose · <b>Enter</b> commit · <b>X</b> leave · <b>Esc</b> pause';

  // 0 = Take (the rn-primary), 1 = Leave. PER PAGE state, re-initialised when
  // the page opens and whenever the viewed candidate changes, so a Leave the
  // player moved to on one card is never where a later card opens
  // (certification B-r3 F1).
  let focus = 0;
  // gauntlet r5 CAMPAIGN F3: the focus the PLAYER chose on a candidate (A / D,
  // or picking the skill a swap replaces) — kept per candidate so switching to
  // another character's tab and back never reverts it to the suggestion.
  const chosenFocus = new Map(); // candidate key -> 0 | 1
  let shown = ''; // room:seat:type:id of the candidate currently on the card
  let viewSeat = 0; // the character whose card is on show
  let lastView = null; // the last run view rendered
  let swapView = null; // { seat, replace, ids } of a swap card on show, else null
  let openedRoom = -1;

  const strip = createPartyStrip({ onSelect: (seat) => setView(seat, true), host: stripHost });

  // The viewer's own seat: the Healer in single-player / on the host; a
  // guest's own class seat in a network session.
  function ownSeat() {
    const n = service('net');
    try {
      if (n && typeof n.isGuest === 'function' && n.isGuest()) return Number.isInteger(n.seat) ? n.seat : 0;
    } catch {
      /* no session */
    }
    return 0;
  }
  const isGuest = () => {
    const n = service('net');
    try {
      return !!(n && typeof n.isGuest === 'function' && n.isGuest());
    } catch {
      return false;
    }
  };
  // May this viewer decide `seat`'s card? Single-player / host: its own seat
  // and every AI-held seat; a guest: its own seat only (the host validates).
  function owns(seat, page) {
    if (!page) return seat === 0;
    const me = ownSeat();
    if (seat === me) return true;
    if (isGuest()) return false;
    return !page.owners || page.owners[seat] !== 'human';
  }

  const partyPage = (v) => (v && v.party ? v.party : null);
  // The viewed card: seat 0 = run.reward (+ its page decision), else the page card.
  function cardOf(v, seat) {
    const page = partyPage(v);
    if (seat === 0 || !page) {
      const r = v.reward;
      if (!r) return null;
      const c0 = page ? page.cards[0] : null;
      return { seat: 0, ...r, decided: c0 ? c0.decided : false, choice: c0 ? c0.choice : null, by: c0 ? c0.by : null, spoils: v.spoils && v.spoils.room === v.room ? v.spoils.nodes : [] };
    }
    return page.cards[seat] ?? null;
  }

  btnTake.addEventListener('click', () => decide('take'));
  btnDecline.addEventListener('click', () => decide('leave'));
  repEl.addEventListener('click', (e) => {
    const t = e.target.closest('.rn-rep');
    if (!t || !swapView) return;
    setReplace(Number(t.dataset.slot));
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

  // A player's pick on the Replaces selector (W / S, ↑ / ↓, D-pad, wheel,
  // click) IS the choice to take the swap: focus moves to "Take · Replace", so
  // the confirm (Enter / A) commits the replacement the player just chose —
  // also when the AI would Leave (gauntlet r5 CAMPAIGN F3: the card opened on
  // Leave for such a suggestion and a pick + Enter silently discarded the new
  // skill). A reflexive Enter with no pick still follows the suggestion; X /
  // the Leave button / D then Enter keep the loadout.
  function setReplace(slot) {
    if (!swapView) return;
    const r = viewSeat === 0 ? run().setRewardReplace(slot) : run().partyReplace(viewSeat, slot);
    if (Number.isInteger(r)) swapView.replace = r;
    setFocus(0);
    rerender();
  }
  // Player-chosen focus (remembered for the candidate on show).
  function setFocus(f) {
    focus = f;
    if (shown) chosenFocus.set(shown, f);
    paintFocus();
  }
  function cycleReplace(dir) {
    if (!swapView) return false;
    const owned = swapView.ids.map((id, i) => (id ? i : -1)).filter((i) => i >= 0);
    if (owned.length === 0) return false;
    const at = owned.indexOf(swapView.replace);
    setReplace(owned[(at + dir + owned.length) % owned.length]);
    return true;
  }

  // Decide the VIEWED card, then walk to the next card this player still has
  // to decide (the sim commits the page when every card is decided).
  function decide(choice) {
    const v = lastView;
    if (!v) return;
    const page = partyPage(v);
    const c = cardOf(v, viewSeat);
    if (!c) return;
    if (!page) {
      // No party page (the ally supply off): the §16 one-card draft.
      if (choice === 'take' && c.type) run().takeReward();
      else run().declineReward();
      return;
    }
    if (!owns(viewSeat, page)) return; // read-only tab (another player's card)
    const pick = choice === 'take' && c.type ? 'take' : 'leave';
    const replace = c.swap ? (swapView && swapView.seat === viewSeat ? swapView.replace : c.replace) : null;
    const seatNow = viewSeat;
    run().partyPick(seatNow, pick, replace);
    // Next undecided own card (after this one, wrapping).
    const after = run().view();
    const p2 = after && after.party;
    if (!p2) return; // committed
    for (let k = 1; k <= 4; k++) {
      const s = (seatNow + k) % 4;
      const cc = s === 0 ? { decided: p2.cards[0].decided } : p2.cards[s];
      if (cc && !cc.decided && owns(s, p2) && !(p2.mode === 'auto' && s !== 0 && p2.owners[s] !== 'human')) {
        setView(s, false);
        return;
      }
    }
  }

  function setView(seat, byPlayer) {
    const s = ((Number(seat) % 4) + 4) % 4;
    if (s === viewSeat && byPlayer) return;
    viewSeat = s;
    rerender();
  }
  // A view / Replaces change repaints on the run UI's next frame (through
  // update(), so the page is re-fitted too).
  let dirtyFlag = false;
  function rerender() {
    dirtyFlag = true;
  }
  const dirty = () => {
    const d = dirtyFlag;
    dirtyFlag = false;
    return d;
  };

  function paintFocus() {
    btnTake.classList.toggle('rn-focus', focus === 0);
    btnDecline.classList.toggle('rn-focus', focus === 1);
  }

  function open() {
    focus = 0;
    viewSeat = ownSeat();
    shown = '';
    chosenFocus.clear();
    paintFocus();
  }

  function chipOf(v, seat, page) {
    const c = cardOf(v, seat);
    if (!c) return { chip: '—' };
    if (!c.type) return { chip: '— nothing' };
    const ai = page && page.owners && page.owners[seat] !== 'human' && seat !== 0;
    if (c.decided) {
      const lab = c.choice === 'take' ? '✓ Take' : '✕ Leave';
      return { chip: `${c.by === 'ai' || (ai && page.mode === 'auto') ? 'AI ' : c.by === 'timeout' ? 'Auto ' : ''}${lab}`, tone: c.choice === 'take' ? 'take' : '' };
    }
    const dl = page && page.deadlineInTicks !== null && page.deadlineInTicks !== undefined ? Math.ceil(page.deadlineInTicks / TICK_HZ) : null;
    return { chip: dl !== null && dl <= 10 ? `… ${dl} s` : '… choose', tone: 'wait' };
  }

  function render(view, force = false) {
    lastView = view;
    const page = partyPage(view);
    if (view.room !== openedRoom) {
      openedRoom = view.room;
      viewSeat = ownSeat();
    }
    // Automatic mode: AI-held tabs are summaries — the view stays on own tabs
    // unless the player clicked one.
    roomEl.textContent = String(view.room);
    const c = cardOf(view, viewSeat) ?? cardOf(view, 0);
    if (!c) return;
    const seat = c.seat;
    // Strip (party page only).
    stripHost.style.display = page ? '' : 'none';
    // The party page's strip is its header: a short window drops the title
    // for it (style.js `rn-short`).
    el.classList.toggle('rn-party', !!page);
    if (page) {
      const rows = [0, 1, 2, 3].map((s) => ({
        ...chipOf(view, s, page),
        owner: page.owners && isNet() ? (s === ownSeat() ? 'you' : page.owners[s] === 'human' ? 'player' : 'AI') : '',
      }));
      strip.update(rows, seat);
    }
    ownerHost.innerHTML = page ? ownerBandHtml(seat, { you: seat === ownSeat() }) : '';
    const candidate = `${view.room}:${seat}:${c.type}:${c.id}`;
    if (candidate !== shown) {
      shown = candidate;
      // A new candidate opens on Take — except a swap the AI would Leave;
      // a candidate the player already chose on keeps the player's choice.
      const sug = c.swap ? (seat === 0 ? c.suggest : c.suggest && c.suggest.choice) : null;
      focus = chosenFocus.has(candidate) ? chosenFocus.get(candidate) : c.decided ? (c.choice === 'leave' ? 1 : 0) : c.swap && sug === 'leave' ? 1 : 0;
    }
    // Strip text: the viewed character's free slots / the swap line.
    const slots = slotsOf(seat);
    const free = slots.filter((x) => !x).length;
    freeLab.textContent = c.swap ? 'SKILL SLOTS FULL · CHOOSE ONE TO REPLACE, OR LEAVE' : page && seat !== 0 ? `${CLASS_NAME[CLASS_OF_SEAT[seat]].toUpperCase()} · SKILL SLOTS FREE` : 'SKILL SLOTS FREE';
    freeEl.style.display = c.swap ? 'none' : '';
    freeEl.textContent = String(seat === 0 ? view.freeSkillSlots : free);
    hintEl.innerHTML = page ? (c.swap ? HINT_SWAP : HINT_PARTY) : c.swap ? HINT_SOLO_SWAP : HINT_SOLO;
    // The card.
    if (c.type === 'skill') {
      host.innerHTML = `<div class="rn-card" data-seat="${seat}" style="--rar:${RARITY_COLOR.common}">${skillCardHtml(c.id)}</div>`;
      if (c.swap) {
        const kind = host.querySelector('.rn-cardkind');
        if (kind) kind.innerHTML = '<span class="rn-swapkind">NEW SKILL — SWAP</span>';
      }
    } else if (c.type === 'node') {
      const n = NODES[c.id];
      const sys = seat === 0 ? build() : party() ? party().build(seat) : null;
      let verdict = sys ? sys.kitVerdict(c.id) : null;
      if (verdict && seat !== 0) verdict = verdict.replace('your kit', `the ${CLASS_NAME[CLASS_OF_SEAT[seat]]}'s kit`);
      const extra = c.id === 'siphon' && sys ? sys.siphonCardLine() : null;
      host.innerHTML = `<div class="rn-card${n && n.rarity === 'legendary' ? ' rn-legendary' : ''}" data-seat="${seat}" style="--rar:${RARITY_COLOR[n ? n.rarity : 'common']}">${nodeCardHtml(c.id, {
        verdict,
        extra,
        compact: isCompact(),
        upgrade: c.upgrade ?? null,
      })}</div>`;
    } else {
      const complete = c.reason === 'build_complete';
      host.innerHTML = `<div class="rn-card" data-seat="${seat}" style="--rar:${complete ? RARITY_COLOR.legendary : RARITY_COLOR.common}">
        <div class="rn-cardkind">${complete ? 'BUILD COMPLETE' : 'NOTHING TO OFFER'}</div>
        <div class="rn-cardicon">${complete ? '★' : '·'}</div>
        <div class="rn-cardname">${complete ? 'Nothing outranks this build' : 'Empty-handed'}</div>
        <div class="rn-body">${
          complete
            ? 'All 4 skills are equipped and every socket already holds a node no reward could beat.'
            : 'This reward has nowhere to go in this kit.'
        }</div></div>`;
    }
    renderSwap(c, seat);
    renderSpoils(view, c, seat);
    // Substitution / empty line (§16).
    if (c.line) {
      subline.style.display = '';
      subline.textContent = c.line;
    } else {
      subline.style.display = 'none';
      subline.textContent = '';
    }
    // Automatic mode: one summary line for the AI-held characters.
    if (page && page.mode === 'auto') {
      const bits = [1, 2, 3]
        .filter((s) => page.owners[s] !== 'human')
        .map((s) => {
          const cc = page.cards[s];
          const nm = CLASS_NAME[CLASS_OF_SEAT[s]];
          if (!cc.type) return `${nm}: nothing`;
          const what = cc.type === 'skill' ? SKILLS[cc.id].name : NODES[cc.id].name;
          return cc.choice === 'take' ? `${nm} takes ${what}` : `${nm} leaves ${what}`;
        });
      summaryEl.style.display = '';
      summaryEl.textContent = `Automatic · ${bits.join(' · ')}`;
    } else {
      summaryEl.style.display = 'none';
      summaryEl.textContent = '';
    }
    // Network countdown (only with ≥ 2 humans — the sim sets no deadline otherwise).
    if (page && page.deadlineInTicks !== null && page.deadlineInTicks !== undefined && page.deadlineInTicks <= 600) {
      const secs = Math.ceil(page.deadlineInTicks / TICK_HZ);
      const waiting = [0, 1, 2, 3].filter((s) => page.owners[s] === 'human' && !page.cards[s].decided).map((s) => CLASS_NAME[CLASS_OF_SEAT[s]]);
      countdownEl.style.display = '';
      countdownEl.textContent = waiting.length ? `Waiting for ${waiting.join(', ')} — auto-pick in ${secs} s` : `Committing in ${secs} s`;
    } else {
      countdownEl.style.display = 'none';
      countdownEl.textContent = '';
    }
    // Buttons: Take / Leave on the viewed card (read-only for a tab this
    // viewer does not own).
    const empty = !c.type;
    const mine = owns(seat, page);
    btnTake.style.display = empty ? 'none' : '';
    btnDecline.textContent = empty ? 'Continue' : c.swap ? 'Leave' : seat === 0 && !page ? 'Decline' : 'Leave';
    btnTake.textContent = c.swap ? 'Take · Replace' : 'Take';
    btnTake.classList.toggle('rn-disabled', !mine);
    btnDecline.classList.toggle('rn-disabled', !mine);
    if (empty) focus = 1;
    paintFocus();
    void force;
  }

  const isNet = () => {
    const n = service('net');
    try {
      return !!(n && typeof n.isGuest === 'function' && (n.isGuest() || (typeof n.isHost === 'function' && n.isHost())));
    } catch {
      return false;
    }
  };

  function slotsOf(seat) {
    if (seat === 0) {
      const sys = build();
      const v = sys ? sys.view() : null;
      const ids = v ? v.skills.map((s) => s.id) : [];
      while (ids.length < 4) ids.push(null);
      return ids;
    }
    const P = party();
    return P && P.slots(seat) ? [...P.slots(seat)] : [null, null, null, null];
  }
  function skillsOf(seat) {
    if (seat === 0) {
      const sys = build();
      return sys ? sys.view().skills : [];
    }
    const P = party();
    return P ? P.view(seat).skills : [];
  }

  // Ruling A17: the Replaces selector of a swap card (any character).
  function renderSwap(c, seat) {
    if (!(c.type === 'skill' && c.swap)) {
      swapView = null;
      repEl.style.display = 'none';
      repEl.innerHTML = '';
      repLine.style.display = 'none';
      repLine.textContent = '';
      return;
    }
    const skills = skillsOf(seat);
    const ids = [0, 1, 2, 3].map((i) => (skills[i] ? skills[i].id : null));
    const rep = Number.isInteger(c.replace) ? c.replace : 0;
    swapView = { seat, replace: rep, ids };
    repEl.style.display = '';
    repEl.innerHTML = skills
      .slice(0, 4)
      .map((sk, i) => {
        const def = SKILLS[sk.id];
        const sel = i === rep;
        return `<div class="rn-rep${sel ? ' rn-sel' : ''}" data-slot="${i}" data-skill="${esc(sk.id)}" data-seat="${seat}">
          <span class="rn-repkey">${i + 1}</span><span class="rn-repx">✕</span>
          ${cardIconHtml(sk.id, 30)}
          <div class="rn-repname">${esc(def ? def.name : sk.id)}</div>
          <div class="rn-repmeta">${sel ? 'replace · ' : ''}◈ ${sk.filled}</div>
        </div>`;
      })
      .join('');
    const out = skills[rep];
    const newName = SKILLS[c.id] ? SKILLS[c.id].name : c.id;
    const oldName = out && SKILLS[out.id] ? SKILLS[out.id].name : out ? out.id : '';
    const n = out ? out.filled : 0;
    const whose = seat === 0 ? 'the bench' : `the ${CLASS_NAME[CLASS_OF_SEAT[seat]]}'s bench`;
    const nodes = n === 0 ? `${oldName} holds no nodes` : `${oldName}'s ${n} node${n === 1 ? '' : 's'} go to ${whose}`;
    const sug = seat === 0 ? c.suggest : c.suggest && c.suggest.choice;
    const advice = sug === 'leave' ? ' · suggested: Leave — the current four outrank it' : '';
    repLine.style.display = '';
    repLine.textContent = `${newName} replaces ${oldName} — ${nodes}${advice}`;
  }

  // The viewed character's clear spoils (already on its bench).
  function renderSpoils(view, c, seat) {
    const dropped = seat === 0 ? !!(view.spoils && view.spoils.room === view.room) : true;
    const sp = seat === 0 ? (dropped ? view.spoils.nodes : []) : c.spoils ?? [];
    const spUp = seat === 0 && dropped && view.spoils.upgrades ? view.spoils.upgrades : [];
    const want = seat === 0 ? SPOILS_PER_CLEAR : 1;
    const short = dropped && sp.length < want;
    const whose = seat === 0 ? 'bench' : `${CLASS_NAME[CLASS_OF_SEAT[seat]]}'s bench`;
    if (sp.length) {
      spoilsEl.style.display = '';
      const tail = short
        ? ' — the last common / rare upgrade: <b>F</b> auto-fill swaps it in'
        : spUp.length
          ? ' — <b>⇧</b> upgrades: <b>B</b> sockets · <b>F</b> auto-fill swaps them in'
          : '';
      spoilsEl.innerHTML = `<b>Spoils</b> → ${esc(whose)}: ${sp
        .map((id) => {
          const n = NODES[id];
          const up = spUp.includes(id) ? '⇧ ' : '';
          return `<span style="color:${RARITY_COLOR[n ? n.rarity : 'common']}">${up}${esc(NODE_GLYPH[id] ?? '')} ${esc(n ? n.name : id)}</span>`;
        })
        .join(' · ')}${tail}`;
    } else if (short && seat === 0) {
      spoilsEl.style.display = '';
      spoilsEl.innerHTML = '<b>Spoils</b>: none — no common or rare node outranks your build any more';
    } else {
      spoilsEl.style.display = 'none';
      spoilsEl.textContent = '';
    }
  }

  // Returns true when the key was consumed.
  function key(code, fresh) {
    const page = partyPage(lastView);
    // Character switch (party page only) — navigation, never a commit.
    if (page) {
      const fk = { F1: 0, F2: 1, F3: 2, F4: 3 }[code];
      if (fk !== undefined) {
        if (fresh) setView(fk, true);
        return true;
      }
      if (code === 'KeyQ' || code === 'PageUp' || code === 'KeyE' || code === 'PageDown') {
        if (fresh) setView(viewSeat + (code === 'KeyQ' || code === 'PageUp' ? -1 : 1), true);
        return true;
      }
    }
    // Ruling A17: W / S, ↑ / ↓ move the Replaces mark (fresh presses only —
    // the page's settle window already dropped carried-over strafes).
    if (swapView && (code === 'KeyW' || code === 'ArrowUp' || code === 'KeyS' || code === 'ArrowDown')) {
      if (fresh) cycleReplace(code === 'KeyW' || code === 'ArrowUp' ? -1 : 1);
      return true;
    }
    if (code === 'KeyA' || code === 'ArrowLeft') {
      setFocus(0);
      return true;
    }
    if (code === 'KeyD' || code === 'ArrowRight') {
      setFocus(1);
      return true;
    }
    // Ruling A13 (PLAN §1.5): Esc opens the pause menu on every page and is
    // never consumed here. Leave is X (settle-guarded + fresh-press, exactly
    // like Enter) or the Leave button.
    if (code === 'KeyX') {
      if (!fresh) return true;
      decide('leave');
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      // Fresh-press rule: a key carried in from the previous screen never commits.
      if (!fresh) return true;
      if (focus === 0 && btnTake.style.display !== 'none') decide('take');
      else decide('leave');
      return true;
    }
    return false;
  }

  // Gamepad (app/gamepad.js → run UI): LB / RB characters, D-pad left / right
  // Take / Leave, up / down Replaces, A decide, X leave.
  function pad(action) {
    const page = partyPage(lastView);
    if ((action === 'tabPrev' || action === 'tabNext') && page) {
      setView(viewSeat + (action === 'tabPrev' ? -1 : 1), true);
      return true;
    }
    if (action === 'up' || action === 'down') {
      if (swapView) cycleReplace(action === 'up' ? -1 : 1);
      return true;
    }
    if (action === 'left' || action === 'right') {
      setFocus(action === 'left' ? 0 : 1);
      return true;
    }
    if (action === 'confirm') {
      if (focus === 0 && btnTake.style.display !== 'none') decide('take');
      else decide('leave');
      return true;
    }
    if (action === 'secondary') {
      decide('leave');
      return true;
    }
    return false;
  }

  // Probe surface (runUi().draft / runUi().party).
  const probe = () => ({
    focus,
    viewSeat,
    ownSeat: ownSeat(),
    swap: !!swapView,
    replace: swapView ? swapView.replace : null,
    ids: swapView ? [...swapView.ids] : null,
    tabs: strip.tabs().map((t) => ({ seat: Number(t.dataset.seat), viewed: t.classList.contains('rn-pview'), chip: t.querySelector('.rn-pchip').textContent, h: t.getBoundingClientRect().height })),
    owner: ownerHost.textContent.trim(),
    cardSeat: host.querySelector('.rn-card') ? Number(host.querySelector('.rn-card').dataset.seat) : null,
  });

  return { el, render, key, pad, open, probe, setView, dirty, name: 'draft' };
}
