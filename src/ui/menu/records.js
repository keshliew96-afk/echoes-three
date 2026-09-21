// Records screen (docs/gauntlet/PLAN.md §1.3 'records', §3.4 profile, gate
// G2.8). Owner: M2. The top-10 high scores (score = the §3.4 formula) and the
// lifetime records, read from the persistent profile (echoes.profile.v1).
// Read-only; Esc / B / Back returns. The score formula is printed so a
// player can see why a run ranked where it did.
import { service } from '../../app/registry.js';
import { px } from '../../app/style.js';
import { PALETTE as P } from '../../data/palette.js';
import { createHints } from './hints.js';

const ACT_NAME = { 1: 'The Hollow Wood', 2: 'The Sunken Mill', 3: 'The Ashen Barrow' };

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
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};
const day = (iso) => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: '2-digit' });
};
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');

export function createRecordsScreen(ctx) {
  installStyle();
  const { app, manager } = ctx;
  const el = document.createElement('div');
  el.className = 'sv-records';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Records');
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="sv-rpanel ap-plate">
      <div class="sv-rhead"><h2 class="ap-h2">Records</h2><div class="sv-rsub"></div></div>
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
  const hints = createHints(app, [['back', 'Back']]);
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'ap-btn ap-primary';
  back.id = 'sv-records-back';
  back.textContent = 'Back';
  back.setAttribute('data-nav', '');
  back.setAttribute('data-nav-default', '');
  back.addEventListener('click', () => {
    if (manager.top() === 'records') manager.pop();
  });
  foot.append(hints.el, back);

  function render() {
    const s = service('save');
    const p = s ? s.profile() : null;
    scoresEl.textContent = '';
    side.textContent = '';
    if (!p) {
      scoresEl.innerHTML = '<div class="sv-rempty">Records are not available in this browser mode.</div>';
      return;
    }
    const last = s.lastRecord ? s.lastRecord() : null;
    sub.textContent = `${p.records.runs} run${p.records.runs === 1 ? '' : 's'} · ${p.records.victories} won`;
    if (!p.highScores.length) {
      const e = document.createElement('div');
      e.className = 'sv-rempty';
      e.textContent = 'No runs finished yet.\nYour ten best runs will be listed here.';
      e.style.whiteSpace = 'pre-line';
      scoresEl.appendChild(e);
    } else {
      const t = document.createElement('table');
      t.innerHTML = `<thead><tr><th class="sv-num">#</th><th class="sv-num">Score</th><th>Expedition</th><th>Result</th><th class="sv-num">Rooms</th><th class="sv-num">Kills</th><th class="sv-num sv-opt">Time</th><th class="sv-opt">Date</th></tr></thead>`;
      const tb = document.createElement('tbody');
      p.highScores.forEach((h, i) => {
        const tr = document.createElement('tr');
        if (i === 0) tr.className = 'sv-top';
        if (last && last.entry && last.entry.date === h.date && last.entry.score === h.score) tr.classList.add('sv-fresh');
        const cells = [
          [String(i + 1), 'sv-num'],
          [h.score.toLocaleString(), 'sv-num'],
          [`${['I', 'II', 'III'][h.act - 1] || h.act} · ${ACT_NAME[h.act] || ''}`, 'sv-wrapc'],
          [`${h.victory ? 'Victory' : 'Defeat'}${h.challenge && h.challenge !== 'standard' ? ` · ${cap(h.challenge)}` : ''}`, 'sv-wrapc'],
          [`${h.roomsCleared}/8`, 'sv-num'],
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
      t.appendChild(tb);
      scoresEl.appendChild(t);
    }
    const r = p.records;
    const h3 = document.createElement('h3');
    h3.textContent = 'Lifetime';
    const dl = document.createElement('dl');
    const add = (k, v) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.append(dt, dd);
    };
    add('Runs', String(r.runs));
    add('Victories · defeats', `${r.victories} · ${r.defeats}`);
    add('Best score', r.bestScore ? r.bestScore.toLocaleString() : '—');
    add('Most kills in a run', r.mostKills ? String(r.mostKills) : '—');
    for (const a of [1, 2, 3]) {
      add(`Fastest win — Act ${['I', 'II', 'III'][a - 1]}`, mmss(r.fastestVictorySec[a]));
      add(`Deepest room — Act ${['I', 'II', 'III'][a - 1]}`, r.deepestRoom[a] ? `${r.deepestRoom[a]} / 8` : '—');
    }
    add('Expeditions open', p.unlocks.acts.map((a) => ['I', 'II', 'III'][a - 1]).join(' · '));
    add('Time played', hours(p.playtimeSec));
    const f = document.createElement('div');
    f.className = 'sv-formula';
    f.textContent =
      'Score = (100 × rooms + 5 × kills + 1000 if won) × act (I 1.0 · II 1.5 · III 2.0) × challenge (relaxed 0.75 · standard 1 · harrowing 1.5), plus a speed bonus on a win (900 − seconds).';
    side.append(h3, dl, f);
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    defaultFocus: '#sv-records-back',
    onOpen() {
      render();
    },
    onFocus() {
      render();
    },
  };
}
