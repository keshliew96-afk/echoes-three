// Records screen (docs/gauntlet/PLAN.md §1.3 'records', §3.4 profile, gate
// G2.8). Owner: M2. The top-10 high scores (score = the §3.4 formula) and the
// lifetime records, read from the persistent profile (echoes.profile.v1).
// Read-only; Esc / B / Back returns. The score formula is printed so a
// player can see why a run ranked where it did.
import { service } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';
import { t, tn } from '../../i18n/index.js';

const ACT_NAME = {
  get 1() { return t('The Hollow Wood'); },
  get 2() { return t('The Sunken Mill'); },
  get 3() { return t('The Ashen Barrow'); },
  get 4() { return t('The Hollow Heart'); },
};
const CHALLENGE_NAME = {
  get relaxed() { return t('Relaxed'); },
  get standard() { return t('Standard'); },
  get harrowing() { return t('Harrowing'); },
};

const CSS = `
.sv-records .sv-rpanel {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(${px(1560)}, calc(100vw - 32px)); height: min(${px(900)}, calc(100vh - 32px));
  display: flex; flex-direction: column; padding: ${px(22)} ${px(30)} ${px(18)};
}
.sv-rhead { display: flex; align-items: baseline; gap: ${px(24)}; padding-bottom: ${px(12)}; border-bottom: 1px solid ${P.warmGrey}44; }
.sv-rhead .sv-rsub { font-size: ${px(22)}; color: ${P.warmGrey}; }
.sv-rbody { flex: 1 1 auto; min-height: 0; display: flex; gap: ${px(24)}; padding-top: ${px(14)}; }
.sv-scores { flex: 1 1 60%; min-width: 0; overflow: auto; }
.sv-scores table { width: 100%; border-collapse: collapse; font-size: ${px(22)}; font-variant-numeric: tabular-nums; }
.sv-scores th { text-align: left; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: ${P.warmGrey}; padding: ${px(6)} ${px(8)}; border-bottom: 1px solid ${P.warmGrey}55; white-space: nowrap; }
.sv-scores td { padding: ${px(8)} ${px(8)}; color: ${P.bone}; border-bottom: 1px solid ${P.warmGrey}22; white-space: nowrap; }
.sv-scores td.sv-num { text-align: right; }
.sv-scores td.sv-wrapc { white-space: normal; min-width: ${px(150)}; }
.sv-scores th.sv-num { text-align: right; }
.sv-scores tr.sv-top td { color: ${P.parchment}; font-weight: 700; }
.sv-scores tr.sv-fresh td { color: ${P.hearthAmber}; }
.sv-rside { flex: 0 0 31%; min-width: 0; display: flex; flex-direction: column; gap: ${px(12)}; padding: ${px(18)} ${px(22)}; border-radius: ${px(14)}; background: ${P.voidCharcoal}; border: 1px solid ${P.warmGrey}44; overflow: auto; }
.sv-rside h3 { margin: 0; font-size: ${px(24)}; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${P.parchment}; }
.sv-rside dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: ${px(4)} ${px(14)}; margin: 0; font-size: ${px(22)}; }
.sv-rside dt { color: ${P.warmGrey}; }
.sv-rside dd { margin: 0; color: ${P.parchment}; text-align: right; font-variant-numeric: tabular-nums; }
.sv-formula { font-size: ${px(22)}; color: ${P.warmGrey}; line-height: 1.4; }
.sv-rempty { margin: auto; text-align: center; font-size: ${px(24)}; color: ${P.bone}; line-height: 1.5; }
.sv-rfoot { display: flex; align-items: center; gap: ${px(16)}; padding-top: ${px(12)}; border-top: 1px solid ${P.warmGrey}44; margin-top: ${px(10)}; }
.sv-rfoot .ap-hints { flex: 1 1 auto; }
@media (max-width: 1180px) { .sv-scores td.sv-opt, .sv-scores th.sv-opt { display: none; } }
`;
let styled = false;
function installStyle() {
  if (styled || typeof document === 'undefined') return;
  styled = true;
  const s = document.createElement('style');
  s.id = 'sv-records-style';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const mmss = (sec) => {
  if (sec === null || sec === undefined || !Number.isFinite(sec)) return '—';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const hours = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? t('{h} h {m} min', { h, m }) : t('{m} min', { m });
};
const day = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: '2-digit' });
};
const cap = (s) => (s ? CHALLENGE_NAME[s] || s[0].toUpperCase() + s.slice(1) : '');
// CAMPAIGN (PLAN §12.8) record cells.
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
function levelCell(h) {
  if (h.campaign) {
    const from = h.startLevel ?? 1;
    return from === h.act ? `${ROMAN[from] ?? from} · ${ACT_NAME[from] || ''}` : t('{from} → {to} · Campaign', { from: ROMAN[from] ?? from, to: ROMAN[h.act] ?? h.act });
  }
  return `${ROMAN[h.act] || h.act} · ${ACT_NAME[h.act] || ''}`;
}
function resultWord(h) {
  if (h.result === 'abandoned') return t('Abandoned');
  if (h.campaign && h.victory) return t('Campaign complete');
  return h.victory ? t('Victory') : t('Defeat');
}

export function createRecordsScreen(ctx) {
  installStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'sv-records';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', t('Records'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="sv-rpanel ap-plate">
      <div class="sv-rhead"><h2 class="ap-h2">${t('Records')}</h2><div class="sv-rsub"></div></div>
      <div class="sv-rbody">
        <div class="sv-scores"></div>
        <aside class="sv-rside"></aside>
      </div>
      <div class="sv-rfoot"></div>
    </div>`;
  const sub = el.querySelector('.sv-rsub');
  const scoresEl = el.querySelector('.sv-scores');
  const side = el.querySelector('.sv-rside');
  const foot = el.querySelector('.sv-rfoot');
  const hints = createHints(app, [['back', t('Back')]]);
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'ap-btn ap-primary';
  back.id = 'sv-records-back';
  back.textContent = t('Back');
  back.setAttribute('data-nav', '');
  back.setAttribute('data-nav-default', '');
  back.addEventListener('click', () => {
    if (manager.top() === 'records') manager.pop();
  });
  foot.append(hints.el, back);

  let offProfile = null;
  function render() {
    const s = service('save');
    const p = s ? s.profile() : null;
    scoresEl.textContent = '';
    side.textContent = '';
    if (!p) {
      scoresEl.innerHTML = `<div class="sv-rempty">${t('Records are not available in this browser mode.')}</div>`;
      return;
    }
    const last = s.lastRecord ? s.lastRecord() : null;
    sub.textContent = tn(p.records.runs, '{n} run · {won} won', '{n} runs · {won} won', { won: p.records.victories });
    if (!p.highScores.length) {
      const e = document.createElement('div');
      e.className = 'sv-rempty';
      e.textContent = t('No runs finished yet.\nYour ten best runs will be listed here.');
      e.style.whiteSpace = 'pre-line';
      scoresEl.appendChild(e);
    } else {
      const tbl = document.createElement('table');
      tbl.innerHTML = `<thead><tr><th class="sv-num">#</th><th class="sv-num">${t('Score')}</th><th>${t('Level')}</th><th>${t('Result')}</th><th class="sv-num">${t('Rooms')}</th><th class="sv-num">${t('Kills')}</th><th class="sv-num sv-opt">${t('Time')}</th><th class="sv-opt">${t('Date')}</th></tr></thead>`;
      const tb = document.createElement('tbody');
      p.highScores.forEach((h, i) => {
        const tr = document.createElement('tr');
        if (i === 0) tr.className = 'sv-top';
        if (last && last.entry && last.entry.date === h.date && last.entry.score === h.score) tr.classList.add('sv-fresh');
        const cells = [
          [String(i + 1), 'sv-num'],
          [h.score.toLocaleString(), 'sv-num'],
          // CAMPAIGN (PLAN §12.8): a campaign entry names its span ("I → III");
          // a single-level entry its level. Result: Campaign complete /
          // Victory / Defeat / Abandoned (Quit to Lobby).
          [levelCell(h), 'sv-wrapc'],
          [`${resultWord(h)}${h.challenge && h.challenge !== 'standard' ? ` · ${cap(h.challenge)}` : ''}`, 'sv-wrapc'],
          [h.campaign ? String(h.roomsCleared) : `${h.roomsCleared}/8`, 'sv-num'],
          [String(h.kills), 'sv-num'],
          [mmss(h.timeSec), 'sv-num sv-opt'],
          [day(h.date), 'sv-opt'],
        ];
        for (const [v, c] of cells) {
          const td = document.createElement('td');
          if (c) td.className = c;
          td.textContent = v;
          tr.appendChild(td);
        }
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
      scoresEl.appendChild(tbl);
    }
    const r = p.records;
    const h3 = document.createElement('h3');
    h3.textContent = t('Lifetime');
    const dl = document.createElement('dl');
    const add = (k, v) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    };
    add(t('Runs'), String(r.runs));
    add(t('Victories · defeats'), `${r.victories} · ${r.defeats}`);
    // CAMPAIGN (PLAN §12.8)
    add(t('Campaigns completed'), t('{done} of {total}', { done: r.campaignsCompleted ?? 0, total: r.campaigns ?? 0 }));
    add(t('Abandoned'), String(r.abandoned ?? 0));
    add(t('Furthest level'), r.furthestLevel ? t('Level {level}', { level: ROMAN[r.furthestLevel] ?? r.furthestLevel }) : '—');
    add(t('Fastest campaign'), mmss(r.fastestCampaignSec));
    add(t('Best score'), r.bestScore ? r.bestScore.toLocaleString() : '—');
    add(t('Most kills in a run'), r.mostKills ? String(r.mostKills) : '—');
    // One row per level: clears · fastest clear · deepest room.
    for (const a of [1, 2, 3]) {
      const lc = r.levelClears ? r.levelClears[a] ?? 0 : 0;
      // Cleared: how often + the fastest clear; never cleared: the deepest room.
      const v = lc > 0 ? `×${lc}${r.fastestVictorySec[a] ? ` · ${mmss(r.fastestVictorySec[a])}` : ''}` : r.deepestRoom[a] ? t('room {room}/8', { room: r.deepestRoom[a] }) : '—';
      add(t('Level {level} cleared', { level: ROMAN[a] }), v);
    }
    add(t('Levels open'), p.unlocks.acts.map((a) => ROMAN[a] ?? a).join(' · '));
    add(t('Time played'), hours(p.playtimeSec));
    const f = document.createElement('div');
    f.className = 'sv-formula';
    f.textContent =
      t('Score = the sum over the levels played of (100 × rooms + 5 × kills + 1000 if cleared) × level (I 1.0 · II 1.5 · III 2.0 · IV 2.5), × challenge (relaxed 0.75 · standard 1 · harrowing 1.5), plus a speed bonus on a completed campaign (900 × levels played − seconds).');
    side.append(h3, dl, f);
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    defaultFocus: '#sv-records-back',
    onOpen() {
      render();
      // Another tab of the game recorded a run (SAVE4-F1): redraw in place.
      const s = service('save');
      if (!offProfile && s && typeof s.onProfileChanged === 'function') offProfile = s.onProfileChanged(() => render());
    },
    onFocus() {
      render();
    },
    onClose() {
      if (offProfile) offProfile();
      offProfile = null;
    },
  };
}
