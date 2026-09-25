// LEVEL-TRANSITION CARD (docs/gauntlet/PLAN.md §12.6 — the user's "brief
// victory transition screen"). Owner: CAMPAIGN. The run-UI page for sim phase
// 'transit':
//   kind 'clear'  — "<LEVEL> CLEARED", the next level, the carried build
//                   ("party restored"), a progress bar, "Enter — set out now";
//   kind 'depart' — a Level-N start from the Level Select: "SETTING OUT",
//                   the level, the starter grant.
// The card is a Void Charcoal plate over a WARM veil (never a black
// full-screen, PLAN §12.5): the cleared arena stays faintly visible under it
// until the next level's first room replaces it. It never advances the sim by
// itself: Enter asks the level manager (service('campaign').requestSkip()),
// which advances once the next level is ready (hard fallbacks there and in
// the sim).
import { esc } from './style.js';
import { SKILLS } from '../../sim/skills.js';
import { service } from '../../app/registry.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const FLAVOUR = {
  1: 'The Hollow Stag falls. The wood breathes out.',
  2: 'The mill wheel stops. The water runs clear again.',
  3: 'The barrow is still. The long night lifts.',
};

export const TRANSIT_CSS = `
  #run-veil.rn-transit {
    background: radial-gradient(ellipse at 50% 44%,
      rgba(255, 240, 210, 0.34) 0%, rgba(232, 162, 61, 0.30) 42%, rgba(70, 52, 36, 0.66) 100%);
  }
  #run-veil.rn-transit.rn-depart {
    background: radial-gradient(ellipse at 50% 44%,
      rgba(150, 118, 80, 0.88) 0%, rgba(96, 74, 52, 0.92) 50%, rgba(58, 46, 36, 0.95) 100%);
  }
  .rn-transit .rn-kicker { font-size: 18px; font-weight: 800; letter-spacing: 0.3em; color: #E8A23D; margin-bottom: 4px; }
  .rn-transit .rn-next { display: flex; align-items: baseline; gap: 12px; margin: 10px 0 6px; font-size: 22px; color: #F4EFE6; }
  .rn-transit .rn-next .rn-lab { font-size: 17px; letter-spacing: 0.2em; color: #9C9186; }
  .rn-transit .rn-next b { font-size: 26px; letter-spacing: 0.04em; }
  .rn-transit .rn-carry { display: grid; grid-template-columns: auto auto; gap: 6px 22px; margin: 8px 0 4px; font-size: 18px; }
  .rn-transit .rn-carry .rn-k { color: #9C9186; letter-spacing: 0.1em; }
  .rn-transit .rn-carry .rn-v { color: #F4EFE6; font-weight: 700; font-variant-numeric: tabular-nums; }
  .rn-transit .rn-kit { margin-top: 6px; font-size: 17px; color: #C9C2B3; text-align: center; max-width: 620px; }
  .rn-transit .rn-bar { position: relative; width: 420px; height: 10px; margin: 16px 0 6px; border-radius: 6px;
    background: #221F1B; border: 1px solid #9C918688; overflow: hidden; }
  .rn-transit .rn-bar i { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: linear-gradient(90deg, #D9B872, #E8A23D); }
  .rn-transit .rn-ready { font-size: 17px; color: #C9C2B3; min-height: 22px; }
`;

export function createTransitScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-transit';
  el.innerHTML = `
    <div class="rn-kicker"></div>
    <div class="rn-title rn-headline"></div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rn-flavour"></div>
    <div class="rn-next"><span class="rn-lab">NEXT</span><b class="rn-nextname"></b></div>
    <div class="rn-carry"></div>
    <div class="rn-kit"></div>
    <div class="rn-bar"><i></i></div>
    <div class="rn-ready" aria-live="polite"></div>
    <div class="rn-hint"><b>Enter</b> set out now</div>`;
  const kicker = el.querySelector('.rn-kicker');
  const headline = el.querySelector('.rn-headline');
  const flavour = el.querySelector('.rn-flavour');
  const nextName = el.querySelector('.rn-nextname');
  const nextRow = el.querySelector('.rn-next');
  const carryEl = el.querySelector('.rn-carry');
  const kitEl = el.querySelector('.rn-kit');
  const barFill = el.querySelector('.rn-bar i');
  const readyEl = el.querySelector('.rn-ready');
  const hintEl = el.querySelector('.rn-hint');

  const row = (k, v) => `<div class="rn-k">${esc(k)}</div><div class="rn-v">${esc(v)}</div>`;
  const guest = () => {
    const n = service('net');
    return !!(n && typeof n.isGuest === 'function' && n.isGuest());
  };

  // `v.__card` = the boot pre-paint's synthetic card (ui/run/index.js).
  const liveCard = (v) => {
    if (v && v.__card) return v.__card;
    const c = run().campaign ? run().campaign() : null;
    return c && c.card ? c.card : null;
  };

  function render(v) {
    const card = liveCard(v);
    if (!card) return;
    const s = card.summary || {};
    const to = card.to;
    if (card.kind === 'clear') {
      kicker.textContent = `LEVEL ${ROMAN[card.from] ?? card.from} CLEARED`;
      headline.textContent = (card.fromName || '').toUpperCase();
      flavour.textContent = FLAVOUR[card.from] ?? 'The way ahead opens.';
      nextRow.style.display = '';
      nextName.textContent = `Level ${ROMAN[to] ?? to} · ${card.name}`;
      carryEl.innerHTML = [
        row('SKILLS CARRIED', `${(s.skills || []).length} / 4`),
        row('SOCKETS FILLED', `${s.socketed ?? 0} / ${s.sockets ?? 0}`),
        row('BENCH', String(s.bench ?? 0)),
        row('GLINT', String(s.wallet ?? 0)),
        row('PARTY', 'restored to full'),
      ].join('');
    } else {
      kicker.textContent = 'SETTING OUT';
      headline.textContent = `LEVEL ${ROMAN[to] ?? to} · ${String(card.name || '').toUpperCase()}`;
      flavour.textContent = 'The campaign begins here and runs on to the final level.';
      nextRow.style.display = 'none';
      const g = s.grant;
      carryEl.innerHTML = g
        ? [row('STARTER SKILLS', `+${(g.skills || []).length}`), row('STARTER NODES', String((g.nodes || []).length)), row('SOCKETS FILLED', `${s.socketed ?? 0} / ${s.sockets ?? 0}`), row('GLINT', String(s.wallet ?? 0))].join('')
        : row('KIT', 'the starting kit');
    }
    const names = (s.skills || []).map((id) => (SKILLS[id] ? SKILLS[id].name : id));
    // (a network guest sees the party leader's build — it says whose it is)
    kitEl.textContent = guest() && names.length ? `The Healer carries · ${names.join(' · ')}` : names.join(' · ');
    hintEl.innerHTML = guest() ? 'The Healer leads on…' : '<b>Enter</b> set out now';
  }

  // Per-frame: progress bar + readiness line (the level manager's status).
  function tick(v) {
    const card = liveCard(v);
    if (!card) return;
    const span = Math.max(1, card.untilTick - card.startTick);
    const frac = Math.max(0, Math.min(1, card.elapsedTicks / span));
    barFill.style.width = `${Math.round(frac * 100)}%`;
    const mgr = service('campaign');
    const st = mgr && typeof mgr.status === 'function' ? mgr.status() : null;
    let line = '';
    if (st && st.level === card.to) {
      if (!st.ready) line = `Preparing ${card.name}… ${st.built}/${st.total}`;
      else if (card.due) line = `Setting out…`;
      else line = `${card.name} is ready · setting out in ${Math.max(1, Math.ceil((card.untilTick - card.startTick - card.elapsedTicks) / 60))} s`;
    }
    if (readyEl.textContent !== line) readyEl.textContent = line;
  }

  function key(code, fresh) {
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true;
      const mgr = service('campaign');
      if (mgr && typeof mgr.requestSkip === 'function') mgr.requestSkip('enter');
      return true;
    }
    return false;
  }

  return { el, render, key, tick, name: 'transit' };
}
