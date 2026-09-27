// Victory / Defeat (BUILD_BRIEF §18 "Meta screens"):
//   Victory — warm high-key wash (the ONE screen where the environment matches
//     party warmth), run summary + "Return to Camp".
//   Defeat  — soft God-stuff violet-white wash regardless of act, wry tone
//     ("The gods applaud."), "Return to Camp".
// Both render from the FROZEN run summary the sim took at run end: the live
// state is already wiped by then (§13 "wiped at run end: everything").
import { esc } from './style.js';
import { SKILLS } from '../../sim/skills.js';
import { buildsHtml } from './transit.js';
import { NODES } from '../../sim/nodes.js';
import { service } from '../../app/registry.js'; // M2 NEW-BEST: the save service's run record
import { levelFor } from '../../data/levels.js';
import { CAMPAIGN_LEVELS } from '../../data/campaign.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export function createEndScreen({ run }) {
  const el = document.createElement('div');
  el.className = 'rn-page rn-end';
  el.innerHTML = `
    <div class="rn-title rn-headline">VICTORY</div>
    <div class="rn-orn">◆ ◆ ◆</div>
    <div class="rn-sub rn-flavour"></div>
    <div class="rn-summary"></div>
    <div class="rn-note rn-kit" style="display:none"></div>
    <div class="rn-buttons">
      <div class="rn-btn rn-camp rn-primary rn-focus">Return to Camp</div>
    </div>
    <div class="rn-hint"><b>Enter</b> return to camp</div>`;

  const headline = el.querySelector('.rn-headline');
  const flavour = el.querySelector('.rn-flavour');
  const summaryEl = el.querySelector('.rn-summary');
  const kitEl = el.querySelector('.rn-kit');
  const hintEl = el.querySelector('.rn-hint');
  el.querySelector('.rn-camp').addEventListener('click', () => run().returnToCamp());

  function row(k, v) {
    return `<div class="rn-k">${esc(k)}</div><div class="rn-v">${esc(v)}</div>`;
  }

  function render(view) {
    const s = view.summary;
    const win = view.phase === 'victory';
    // CAMPAIGN (PLAN §12.6): a campaign's end card speaks for the whole
    // campaign; CAMPAIGN COMPLETE returns to camp by itself (sim time).
    const camp = s && s.campaign && s.campaign.mode === 'campaign' ? s.campaign : null;
    const complete = !!(camp && camp.complete);
    headline.textContent = win ? (complete ? 'CAMPAIGN COMPLETE' : 'VICTORY') : camp ? 'THE CAMPAIGN ENDS' : 'THE RUN ENDS';
    flavour.textContent = win
      ? complete
        ? 'The last Stag falls. Every level is clear — the long night is over.'
        : 'The Hollow Stag falls. The wood breathes out.'
      : 'The gods applaud.';
    {
      const c = run().campaign ? run().campaign() : null;
      const secs = c && c.autoReturnInTicks !== null && c.autoReturnInTicks !== undefined ? Math.ceil(c.autoReturnInTicks / 60) : null;
      hintEl.innerHTML = secs !== null && win ? `Returning to camp in ${secs} s &nbsp;·&nbsp; <b>Enter</b> return now` : '<b>Enter</b> return to camp';
    }
    if (!s) {
      summaryEl.innerHTML = '';
      kitEl.style.display = 'none';
      return;
    }
    // @gnt:M2 NEW-BEST begin — "New best" line + score rank (profile, §3.4).
    // The save service recorded this run at run_end (score formula §3.4);
    // the card shows the score, its high-score rank and a New best flag.
    let scoreRow = '';
    {
      const sv = service('save');
      const rec = sv && typeof sv.lastRecord === 'function' ? sv.lastRecord() : null;
      // (CAMPAIGN: matched by seed + length — a campaign's rooms span levels.)
      const same = rec && rec.summary && rec.summary.seed === s.seed && Math.round(rec.summary.timeSec * 60) === s.ticks;
      if (same) {
        const tail = rec.newBest ? ' · New best!' : rec.rank ? ` · #${rec.rank} on your records` : '';
        scoreRow = row('SCORE', `${rec.score.toLocaleString()}${tail}`);
      }
    }
    // @gnt:M2 NEW-BEST end
    const campRows = [];
    let roomsRow = row('ROOMS CLEARED', `${s.rooms} / 8`);
    if (camp) {
      const span = CAMPAIGN_LEVELS.filter((l) => l >= camp.startLevel);
      const rooms = (camp.levels || []).reduce((n, l) => n + (l.rooms || 0), 0);
      campRows.push(row('LEVELS CLEARED', `${camp.levelsCleared} / ${span.length}`));
      campRows.push(row(complete ? 'FINAL LEVEL' : 'FURTHEST LEVEL', `${ROMAN[camp.level] ?? camp.level} · ${levelFor(camp.level).name}`));
      roomsRow = row('ROOMS CLEARED', `${rooms} / ${8 * (camp.levels || []).length}`);
    }
    summaryEl.innerHTML = [
      scoreRow,
      ...campRows,
      roomsRow,
      row('GLINT EARNED', String(s.glint)),
      row('SKILLS CARRIED', String(s.skills.length)),
      row('NODES HELD', String(s.nodes.bench.length + s.nodes.socketed.length)),
      row('RUN SEED', String(s.seed ?? '—')),
      row(camp ? 'CAMPAIGN LENGTH' : 'RUN LENGTH', `${Math.round(s.ticks / 60)} s`),
    ].join('');
    const names = s.skills.map((id) => (SKILLS[id] ? SKILLS[id].name : id));
    const nodes = s.nodes.bench
      .concat(s.nodes.socketed.map((x) => x.split(':')[1]))
      .map((id) => (NODES[id] ? NODES[id].name : id));
    kitEl.style.display = '';
    kitEl.innerHTML = `<b>${esc(names.join(' · '))}</b>${
      nodes.length ? ` &nbsp;·&nbsp; ${esc(nodes.join(' · '))}` : ''
    }${s.builds ? `<div class="rn-builds">${buildsHtml(s.builds)}</div>` : ''}`;
  }

  function key(code, fresh) {
    // Esc is the pause key on every page (PLAN §1.5, ruling A13) — the end
    // card no longer treats it as "return to camp".
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      if (!fresh) return true;
      run().returnToCamp();
      return true;
    }
    return false;
  }

  return { el, render, key, name: 'end' };
}
