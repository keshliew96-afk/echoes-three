// EVENT ROOMS (docs/EVENT_ROOMS.md): the encounter card (phase 'encounter')
// and the plate that names the encounter while the party walks up to it
// (phase 'event').
//
// The card: the encounter's drawn sigil in its own colour, a line of flavour,
// then COST and REWARD rows in words (never colour alone), and Take / Leave.
// A / D or arrows move, Enter commits under the run UI's fresh-press rule
// and settle window; a click on a button commits it; pad left / right / A.
// Take refused (too little Glint, no relic to give, every major curse
// taken) says why under the card; Leave always walks on.
import { esc } from './style.js';
import { PALETTE } from '../../data/palette.js';
import { t } from '../../i18n/index.js';
import { cap } from '../../app/controls.js';
import { service } from '../../app/registry.js';
import { ENCOUNTER_NPC, ENCOUNTER_LINES, NPCS, VOICE_TAKE, VOICE_LEAVE } from '../../data/story.js';

// Each encounter's accent (the card rim, the sigil, the plate's mark). Violet
// only on the corrupted altar (corruption), Bright Heal only on the spring
// (its water heals).
export const ENCOUNTER_COLOR = Object.freeze({
  blood_shrine: '#C2505F',
  wishing_well: PALETTE.signalBlue,
  trapped_chest: PALETTE.paleGold,
  lost_pilgrim: PALETTE.hearthAmber,
  corrupted_altar: PALETTE.godstuffViolet,
  wandering_spirit: '#A8D2DC',
  forgotten_cache: PALETTE.paleGold,
  healing_spring: PALETTE.brightHeal,
  // More event rooms (slice 6).
  fey_ring: '#D6E88C',
  sluice_gate: '#6FB7C9',
  barrow_ossuary: '#CFC3A0',
  heart_crystal: '#E07FB0',
  traveling_smith: '#D97B3F',
  gamblers_dice: '#EDE3C8',
});

// Line-drawn sigils, 24-unit box, stroke = currentColor.
const SIGIL = {
  blood_shrine: '<path d="M5 13h14l-2 5H7z"/><path d="M12 13V6"/><path d="M12 3.5c1.6 1.8 2.2 2.9 2.2 3.8a2.2 2.2 0 0 1-4.4 0c0-.9.6-2 2.2-3.8z"/><path d="M8 21h8"/>',
  wishing_well: '<path d="M5 11h14v9H5z"/><path d="M4 11l8-6 8 6"/><path d="M12 5v8"/><circle cx="12" cy="15" r="1.6"/><path d="M8 20v-3M16 20v-3"/>',
  trapped_chest: '<path d="M4 10h16v10H4z"/><path d="M4 10c0-3 3.5-5 8-5s8 2 8 5"/><path d="M11 13h2v3h-2z"/><path d="M2 7l3 2M22 7l-3 2M12 2v2"/>',
  lost_pilgrim: '<circle cx="10" cy="5" r="2"/><path d="M10 8l-3 6 2 1-1 6M10 8l2 5-1 8"/><path d="M14 9l3 1v4"/><path d="M15.5 14h3v4h-3z"/>',
  corrupted_altar: '<path d="M5 20h14M7 20v-6h10v6"/><path d="M6 14h12"/><path d="M12 3l3 5-3 4-3-4z"/><path d="M4 6l2 1M20 6l-2 1"/>',
  wandering_spirit: '<path d="M7 20V10a5 5 0 0 1 10 0v10l-2-2-1.5 2-1.5-2-1.5 2L9 18z"/><circle cx="10" cy="10" r=".9"/><circle cx="14" cy="10" r=".9"/>',
  forgotten_cache: '<path d="M3 12h9v8H3zM12 14h9v6h-9zM6 6h9v6H6z"/><path d="M3 12l3-6M21 14l-6-2"/>',
  healing_spring: '<path d="M4 18c2.5-2 5.5-2 8 0s5.5 2 8 0"/><path d="M12 4c2.4 3 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0C8.4 9 9.6 7 12 4z"/><path d="M7 21h10"/>',
  fey_ring: '<ellipse cx="12" cy="17" rx="9.5" ry="3.6"/><path d="M4 14a2.2 2.2 0 0 1 4.4 0zM6.2 14v2.6"/><path d="M15 12a2.8 2.8 0 0 1 5.6 0zM17.8 12v4.6"/><path d="M9.6 9.5a2.4 2.4 0 0 1 4.8 0zM12 9.5v3.6"/><path d="M12 2.5v2M7.5 4.5l1.2 1.2M16.5 4.5l-1.2 1.2"/>',
  sluice_gate: '<path d="M5 3v13M19 3v13"/><path d="M5 5h14v7H5z"/><path d="M9.7 5v7M14.3 5v7"/><path d="M2.5 17c1.6-1.3 3.2-1.3 4.8 0s3.2 1.3 4.8 0 3.2-1.3 4.8 0 3.2 1.3 4.8 0"/><path d="M2.5 21c1.6-1.3 3.2-1.3 4.8 0s3.2 1.3 4.8 0 3.2-1.3 4.8 0 3.2 1.3 4.8 0"/>',
  barrow_ossuary: '<path d="M6 10.5a6 6 0 0 1 12 0c0 2-1 3.2-2 3.7V17H8v-2.8c-1-.5-2-1.7-2-3.7z"/><circle cx="9.5" cy="10.8" r="1.4"/><circle cx="14.5" cy="10.8" r="1.4"/><path d="M10 17v2M12 17v2M14 17v2"/><path d="M3 21h18"/>',
  heart_crystal: '<path d="M12 2l3 6.5-3 12.5-3-12.5z"/><path d="M7 9l2.2 3.2-1.6 7L5 13.5z"/><path d="M17 9l2.2 4.3-2.6 6.2-1.6-7.2z"/><path d="M4 21h16"/>',
  traveling_smith: '<path d="M3 9h13l4.5 2-4.5 1.2V14H8v-2C5 12 3 11 3 9z"/><path d="M9.5 14l-1.2 4h7.4l-1.2-4"/><path d="M6.5 21h11"/><path d="M14.5 1.8l3.8 3.8-2 2-3.8-3.8z"/><path d="M13.4 6.6L10.6 9"/>',
  gamblers_dice: '<rect x="2.5" y="9.5" width="9.5" height="9.5" rx="1.6"/><path d="M14.2 5.2l6.8 1.8-1.8 6.8-6.8-1.8z"/><circle cx="5.2" cy="12.2" r=".6"/><circle cx="7.25" cy="14.25" r=".6"/><circle cx="9.3" cy="16.3" r=".6"/><circle cx="16.4" cy="8.3" r=".6"/><circle cx="18.2" cy="10.6" r=".6"/>',
};
export function encounterSigil(id, size = 44) {
  const p = SIGIL[id] ?? '<path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .8-1 1.5V14M12 17.5v.5"/>';
  return `<svg class="ev-sigil" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
}

export const ENCOUNTER_CSS = `
  .rn-encounter .ev-card { width: 460px; max-width: 86vw; --rar: var(--evc); }
  .rn-encounter .ev-card .rn-cardicon { color: var(--evc); border-color: var(--evc); box-shadow: 0 0 22px var(--evc), inset 0 0 14px #00000088;
    background: radial-gradient(circle at 50% 38%, #3A342C 0%, #1C2230 100%); }
  .rn-encounter .ev-flavour { font-size: 17px; font-style: italic; color: ${PALETTE.warmGrey}; text-align: center; line-height: 1.35; }
  /* THE HEARTH SONG: the character who speaks on the card. */
  .rn-encounter .ev-say { display: block; box-sizing: border-box; flex: none; align-self: stretch; text-align: left; width: 100%; padding: 8px 12px; border-radius: 9px; border-left: 3px solid var(--evc); background: #00000040; }
  .rn-encounter .ev-say b { display: block; font-size: 14px; letter-spacing: 0.16em; color: var(--evc); text-transform: uppercase; }
  .rn-encounter .ev-say span { display: block; margin-top: 2px; font-size: 17px; color: ${PALETTE.parchment}; line-height: 1.32; }
  .rn-encounter .ev-rows { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 4px; }
  .rn-encounter .ev-row { display: flex; gap: 12px; align-items: baseline; padding: 7px 10px; border-radius: 9px; background: #00000033; border: 1px solid ${PALETTE.warmGrey}44; }
  .rn-encounter .ev-row b { flex: none; width: 92px; font-size: 14px; letter-spacing: 0.18em; color: ${PALETTE.warmGrey}; }
  .rn-encounter .ev-row span { font-size: 17px; color: ${PALETTE.bone}; line-height: 1.3; }
  .rn-encounter .ev-row.ev-cost b { color: ${PALETTE.hearthAmber}; }
  .rn-encounter .ev-row.ev-gain b { color: ${PALETTE.paleGold}; }
  .rn-encounter .ev-refused { margin-top: 10px; font-size: 17px; color: ${PALETTE.hearthAmber}; text-align: center; }
  .rn-encounter .rn-btn.rn-focus { background: ${PALETTE.hearthAmber}; color: ${PALETTE.voidCharcoal}; border-color: ${PALETTE.hearthAmber}; }
  .rn-encounter .rn-btn.ev-off { opacity: 0.5; border-style: dashed; }
  #run-screen.rn-compact .rn-encounter .ev-flavour,
  #run-screen.rn-compact .rn-encounter .ev-say,
  #run-screen.rn-compact .rn-encounter .ev-rows { grid-column: 1 / -1; }
  #run-screen.rn-compact .rn-encounter .ev-flavour { text-align: left; }

  /* The "?" door: a gold-rimmed door with one big mark (shape + the words in
     the note below, never colour alone). */
  .rn-door.ev-door { border-color: ${PALETTE.paleGold}AA; background: radial-gradient(circle at 50% 42%, #4A4130 0%, #24211C 72%); }
  .rn-door.ev-door.rn-focus { border-color: ${PALETTE.paleGold}; box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066, 0 0 30px ${PALETTE.paleGold}77; }
  .rn-door.ev-door .rn-gwin { font-size: 96px; font-weight: 900; color: ${PALETTE.paleGold}; text-shadow: 0 0 18px ${PALETTE.paleGold}88; line-height: 1; }
  .rn-door.ev-door .rn-split, .rn-door.ev-door .rn-grew { display: none; }
  .rn-path .ev-note {
    margin-top: 12px; padding: 8px 14px; border-radius: 10px; max-width: 560px;
    border: 1px solid ${PALETTE.paleGold}88; background: ${PALETTE.voidCharcoal};
    font-size: 17px; color: ${PALETTE.bone}; text-align: center;
  }
  .rn-path .ev-note b { color: ${PALETTE.paleGold}; }
  /* CHAMPION ROOMS: the crown door, gold-rimmed with a crown that breathes;
     it keeps its reward glyph (the draft still follows the room). */
  .rn-door.ch-door { border-color: ${PALETTE.paleGold}; background: radial-gradient(circle at 50% 30%, #5A4A2A 0%, #2A2418 70%); }
  .rn-door.ch-door.rn-focus { box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066, 0 0 34px ${PALETTE.paleGold}99; }
  .rn-door.ch-door .rn-gwin { color: ${PALETTE.paleGold}; font-size: 76px; text-shadow: 0 0 20px ${PALETTE.paleGold}AA; animation: ch-crown 2.4s ease-in-out infinite; }
  @keyframes ch-crown { 0%, 100% { text-shadow: 0 0 14px ${PALETTE.paleGold}77; } 50% { text-shadow: 0 0 28px ${PALETTE.paleGold}EE; } }
  .rn-path .ch-note { border-color: ${PALETTE.paleGold}; }
  /* KEYS AND VAULTS: the vault door, black iron banded in gold with a lit
     keyhole that breathes; it keeps its reward glyph (the draft follows). */
  .rn-door.vk-door { border-color: ${PALETTE.paleGold}; background:
      repeating-linear-gradient(90deg, transparent 0 46px, ${PALETTE.paleGold}55 46px 50px, transparent 50px 96px),
      radial-gradient(circle at 50% 34%, #3A3426 0%, #17161A 74%); }
  .rn-door.vk-door.rn-focus { box-shadow: inset 0 0 0 2px ${PALETTE.voidCharcoal}, inset 0 -18px 34px #00000066, 0 0 38px ${PALETTE.paleGold}AA; }
  .rn-door.vk-door .rn-gwin { color: #F7E7C0; filter: drop-shadow(0 0 10px ${PALETTE.paleGold}) drop-shadow(0 0 22px ${PALETTE.paleGold}88); animation: vk-hole 2.2s ease-in-out infinite; line-height: 0; }
  .rn-door.vk-door .rn-gwin svg { width: 78px; height: 78px; }
  @keyframes vk-hole { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }
  .rn-path .vk-note { border-color: ${PALETTE.paleGold}; }
  .rn-path .vk-note svg { width: 22px; height: 22px; vertical-align: -5px; color: ${PALETTE.paleGold}; }

  /* The plate over the event room while the party walks up. */
  #ev-plate {
    position: fixed; left: 50%; bottom: 138px; transform: translateX(-50%); z-index: 30;
    display: flex; align-items: center; gap: 12px; padding: 8px 18px 8px 12px; border-radius: 12px;
    background: ${PALETTE.voidCharcoal}E6; border: 2px solid var(--evc, ${PALETTE.paleGold});
    box-shadow: 0 0 22px #000000AA, 0 0 16px var(--evc, transparent);
    font-family: system-ui, var(--i18n-font, sans-serif); color: ${PALETTE.parchment};
    pointer-events: none; opacity: 0; transition: opacity 220ms ease;
  }
  #ev-plate.ev-on { opacity: 1; }
  #ev-plate .ev-sigil { color: var(--evc); flex: none; }
  #ev-plate .ev-pname { font-size: 19px; font-weight: 800; letter-spacing: 0.08em; }
  #ev-plate .ev-phint { font-size: 15px; color: ${PALETTE.bone}; }
  #ev-plate kbd { font: inherit; font-weight: 800; padding: 0 6px; border-radius: 5px; border: 1px solid ${PALETTE.bone}; color: ${PALETTE.parchment}; }
`;

const REFUSED = {
  glint: (e, v) => t('Not enough Glint: it costs {price} and you carry {wallet}.', { price: e.price ?? 0, wallet: v.wallet ?? 0 }),
  relic: () => t('You carry no relic to give.'),
  major: () => t('Every major curse is already on you.'),
  curses: () => t('You carry no major curse for it to feed on.'),
};

export function createEncounterScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-encounter';
  el.innerHTML = `
    <div class="rn-title ev-title"></div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-card ev-card">
      <div class="rn-cardkind">${esc(t('AN ENCOUNTER'))}</div>
      <div class="rn-cardicon ev-icon"></div>
      <div class="rn-cardname ev-name"></div>
      <div class="ev-flavour"></div>
      <div class="ev-say" style="display:none"><b class="ev-who"></b><span class="ev-said"></span></div>
      <div class="ev-rows">
        <div class="ev-row ev-cost"><b>${esc(t('COST'))}</b><span class="ev-detail"></span></div>
        <div class="ev-row ev-gain"><b>${esc(t('REWARD'))}</b><span class="ev-effect"></span></div>
      </div>
    </div>
    <div class="ev-refused" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn ev-take rn-primary">${esc(t('Take'))}</div>
      <div class="rn-btn ev-leave">${esc(t('Leave'))}</div>
    </div>
    <div class="rn-hint">${t('<b>A</b>/<b>D</b> or <b>←</b>/<b>→</b> choose · <b>Enter</b> confirm')}</div>`;
  const titleEl = el.querySelector('.ev-title');
  const card = el.querySelector('.ev-card');
  const icon = el.querySelector('.ev-icon');
  const nameEl = el.querySelector('.ev-name');
  const flavour = el.querySelector('.ev-flavour');
  const sayEl = el.querySelector('.ev-say');
  // THE HEARTH SONG (docs/STORY.md): Sedge, the First Bell and the Hollow
  // Voice are the same characters every time; each card met counts once (per
  // run seed and room) and picks that meeting's line.
  const meetings = new Map(); // `${seed}|${act}|${room}|${npc}` -> meeting number
  function meetingFor(view, npc) {
    const k = `${view.frame ? view.frame.seed : ''}|${view.act}|${view.room}|${npc}`;
    if (!meetings.has(k)) {
      const sv = service('save');
      let n = 1;
      try {
        n = sv && typeof sv.meetNpc === 'function' ? sv.meetNpc(npc) || 1 : 1;
      } catch {
        n = 1;
      }
      meetings.set(k, n);
    }
    return meetings.get(k);
  }
  // After a choice on the altar the Voice answers (take or leave), once the
  // card has actually closed (a refused Take stays on the card).
  function answer(choice, id) {
    if (ENCOUNTER_NPC[id] !== 'voice') return;
    queueMicrotask(() => {
      const v = run().view();
      if (v.phase === 'encounter') return;
      const st = service('story');
      if (st && typeof st.voice === 'function') st.voice(choice === 'take' ? VOICE_TAKE.text : VOICE_LEAVE.text);
    });
  }
  function choose(choice) {
    const e = run().view().encounter;
    run().chooseEncounter(choice);
    if (e) answer(choice, e.id);
  }
  const detail = el.querySelector('.ev-detail');
  const effect = el.querySelector('.ev-effect');
  const refused = el.querySelector('.ev-refused');
  const btns = [el.querySelector('.ev-take'), el.querySelector('.ev-leave')];
  let shownFocus = null;

  btns.forEach((b, i) => {
    b.addEventListener('mouseenter', () => run().focusEncounter(i));
    b.addEventListener('click', () => {
      run().focusEncounter(i);
      choose(i === 0 ? 'take' : 'leave');
    });
  });

  function render(view) {
    const e = view.encounter;
    if (!e) return;
    const c = ENCOUNTER_COLOR[e.id] ?? PALETTE.paleGold;
    card.style.setProperty('--evc', c);
    titleEl.textContent = t(e.name).toUpperCase();
    icon.innerHTML = encounterSigil(e.id, 46);
    nameEl.textContent = t(e.name);
    flavour.textContent = t(e.text);
    const npc = ENCOUNTER_NPC[e.id];
    if (npc) {
      const lines = ENCOUNTER_LINES[npc].text;
      const n = meetingFor(view, npc);
      sayEl.querySelector('.ev-who').textContent = t(NPCS[npc].name);
      sayEl.querySelector('.ev-said').textContent = `“${t(lines[Math.min(n, lines.length) - 1])}”`;
      sayEl.dataset.npc = npc;
      sayEl.dataset.meeting = String(n);
      sayEl.style.display = '';
    } else {
      sayEl.style.display = 'none';
    }
    detail.textContent = t(e.detail);
    effect.textContent = t(e.effect);
    const why = e.refused && REFUSED[e.refused] ? REFUSED[e.refused](e, view) : null;
    refused.style.display = why ? '' : 'none';
    refused.textContent = why ?? '';
    btns[0].classList.toggle('ev-off', !!why);
    btns.forEach((b, i) => b.classList.toggle('rn-focus', e.focus === i));
    shownFocus = e.focus;
  }
  const sel = () => (shownFocus === null ? null : `0|${shownFocus}`);

  function key(code, fresh) {
    const sys = run();
    const e = sys.view().encounter;
    if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyD' || code === 'ArrowRight') {
      sys.focusEncounter(code === 'KeyA' || code === 'ArrowLeft' ? 0 : 1);
      render(sys.view());
      return true;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true; // §16 fresh-press rule
      choose(e && e.focus === 1 ? 'leave' : 'take');
      return true;
    }
    return false; // Esc passes through to the pause menu
  }

  function pad(action) {
    const sys = run();
    if (action === 'left' || action === 'right') {
      sys.focusEncounter(action === 'left' ? 0 : 1);
      render(sys.view());
      return true;
    }
    if (action === 'confirm') {
      const e = sys.view().encounter;
      choose(e && e.focus === 1 ? 'leave' : 'take');
      return true;
    }
    return false;
  }

  function open() {
    shownFocus = null;
  }

  return { el, render, key, pad, sel, open, name: 'encounter' };
}

// The plate over the "?" room until the card opens: the encounter's sigil,
// its name and how to reach it (the interact key as bound right now).
export function createEventPlate() {
  const el = document.createElement('div');
  el.id = 'ev-plate';
  el.innerHTML = `<span class="ev-pico"></span><div><div class="ev-pname"></div><div class="ev-phint"></div></div>`;
  document.body.appendChild(el);
  const ico = el.querySelector('.ev-pico');
  const nameEl = el.querySelector('.ev-pname');
  const hint = el.querySelector('.ev-phint');
  let shown = '';
  function update(v) {
    const e = v && v.active && v.phase === 'event' ? v.encounter : null;
    const key = e ? `${e.id}:${cap('interact')}` : '';
    if (key !== shown) {
      shown = key;
      if (e) {
        el.style.setProperty('--evc', ENCOUNTER_COLOR[e.id] ?? PALETTE.paleGold);
        ico.innerHTML = encounterSigil(e.id, 34);
        nameEl.textContent = t(e.name).toUpperCase();
        hint.innerHTML = t('Walk up to it and press {key}', { key: `<kbd>${esc(cap('interact'))}</kbd>` });
      }
    }
    el.classList.toggle('ev-on', !!e);
  }
  return { el, update };
}
