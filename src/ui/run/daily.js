// DAILY DESCENT (docs/DAILY.md): the day's screen, opened from the Daily
// card of the Level Select (or cmd('campDaily')). It shows the day, the
// relic and the major curse every player starts with, today's leaderboard
// (the session server's, docs/DAILY.md) with this player's own place, and
// sets out on the day's run.
//
// Keys: E / Enter / pad A = Set out (on the focused button), R = refresh the
// board, Esc / B = back to camp. Blocking: the single-player sim pauses.
//
// params: { via, onChoose(key) -> { ok, reason? }, onCancel() }
import { px } from '../../app/style.js';
import { PALETTE as P, VFX_SIGNATURE } from '../../data/palette.js';
import { service } from '../../app/registry.js';
import { RELICS, CURSES } from '../../sim/relics.js';
import { CLASS_NAME } from '../../data/classes.js';
import { depthPlace, clockOf, DAILY_RULES } from '../../data/daily.js';
import { relicIconHtml, curseIconHtml } from './relicicons.js';
import { RARITY_COLOR } from './cards.js';
import { t, tn, getLanguage } from '../../i18n/index.js';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const STYLE_ID = 'dl-daily-style';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// 'Level II · 5 rooms' / 'Cleared' for a board depth.
export function placeLine(depth, won) {
  if (won) return t('Every level cleared');
  const p = depthPlace(depth);
  return t('Level {level} · {rooms}', { level: ROMAN[p.level] ?? p.level, rooms: tn(p.room, '{n} room', '{n} rooms') });
}
// The day as the player's language writes it.
export function dayLabel(key) {
  try {
    return new Date(`${key}T12:00:00Z`).toLocaleDateString(getLanguage(), { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return key;
  }
}
// Hours and minutes to the next UTC midnight.
export function untilNext(now = Date.now()) {
  const d = new Date(now);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  const m = Math.max(1, Math.ceil((next - now) / 60000));
  return { h: Math.floor(m / 60), m: m % 60 };
}

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `
.dl-daily .dl-wrap {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: min(94vw, ${px(1480)}); max-height: 94vh; overflow: auto; padding: ${px(26)} ${px(34)} ${px(20)};
  display: flex; flex-direction: column; gap: ${px(16)};
  background:
    radial-gradient(ellipse 70% 55% at 50% -8%, ${P.hearthAmber}26 0%, ${P.hearthAmber}00 70%),
    linear-gradient(172deg, #2B2531 0%, ${P.voidCharcoal} 64%);
}
.dl-daily .dl-head { display: flex; flex-direction: column; align-items: center; gap: ${px(4)}; text-align: center; }
.dl-daily .dl-day { font-size: ${px(22)}; color: ${P.hearthAmber}; letter-spacing: 0.12em; font-weight: 700; text-transform: uppercase; }
.dl-daily .dl-sub { font-size: ${px(21)}; color: ${P.bone}; max-width: ${px(1100)}; line-height: 1.35; }
.dl-daily .dl-body { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: ${px(24)}; }
.dl-daily .dl-col { display: flex; flex-direction: column; gap: ${px(12)}; min-width: 0; }
.dl-daily .dl-label { font-size: ${px(18)}; font-weight: 800; letter-spacing: 0.22em; color: ${P.warmGrey}; text-transform: uppercase; }
.dl-daily .dl-omen {
  position: relative; display: grid; grid-template-columns: ${px(70)} 1fr; gap: ${px(14)}; align-items: center;
  padding: ${px(14)} ${px(16)}; border-radius: ${px(14)};
  background: linear-gradient(160deg, #00000040 0%, #00000010 100%);
  border: max(2px, ${px(2)}) solid var(--edge); overflow: hidden;
}
.dl-daily .dl-omen::before {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(circle at ${px(40)} 50%, var(--edge) 0%, transparent ${px(90)});
  opacity: 0.22; animation: dl-breathe 3.2s ease-in-out infinite;
}
.dl-daily .dl-curse::before { animation-duration: 2.4s; }
@keyframes dl-breathe { 0%, 100% { opacity: 0.14; } 50% { opacity: 0.34; } }
.dl-daily .dl-icon { position: relative; width: ${px(64)}; height: ${px(64)}; color: var(--edge); filter: drop-shadow(0 0 ${px(8)} var(--edge)); }
.dl-daily .dl-icon svg { width: 100%; height: 100%; }
.dl-daily .dl-kind { position: relative; font-size: ${px(16)}; font-weight: 800; letter-spacing: 0.18em; color: var(--edge); text-transform: uppercase; }
.dl-daily .dl-name { position: relative; font-size: ${px(27)}; font-weight: 800; color: ${P.parchment}; line-height: 1.15; }
.dl-daily .dl-text { position: relative; font-size: ${px(19)}; color: ${P.bone}; line-height: 1.3; }
.dl-daily .dl-rules { font-size: ${px(18)}; color: ${P.warmGrey}; line-height: 1.4; }
.dl-daily .dl-best { font-size: ${px(20)}; color: ${P.parchment}; }
.dl-daily .dl-best b { color: ${P.hearthAmber}; }
.dl-daily .dl-board {
  border-radius: ${px(14)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}55; background: #00000033;
  padding: ${px(8)} ${px(10)}; min-height: ${px(330)}; display: flex; flex-direction: column;
}
.dl-daily .dl-row {
  display: grid; grid-template-columns: ${px(52)} minmax(0, 1fr) minmax(0, 1.15fr) ${px(92)};
  gap: ${px(10)}; align-items: center; padding: ${px(5)} ${px(8)}; border-radius: ${px(8)};
  font-size: ${px(19)}; color: ${P.parchment};
}
.dl-daily .dl-row:nth-child(even) { background: #FFFFFF08; }
.dl-daily .dl-row.dl-hd { color: ${P.warmGrey}; font-size: ${px(15)}; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; background: none; }
.dl-daily .dl-row.dl-me { background: ${P.hearthAmber}22; outline: 1px solid ${P.hearthAmber}88; }
.dl-daily .dl-rank { font-weight: 800; color: ${P.bone}; text-align: right; }
.dl-daily .dl-row:nth-child(2) .dl-rank { color: ${P.hearthAmber}; }
.dl-daily .dl-row:nth-child(3) .dl-rank { color: ${P.parchment}; }
.dl-daily .dl-who { display: flex; align-items: center; gap: ${px(8)}; min-width: 0; }
.dl-daily .dl-who span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-daily .dl-pip { flex: none; width: ${px(12)}; height: ${px(12)}; border-radius: 50%; background: var(--cls); box-shadow: 0 0 0 1px ${P.bone}88; }
.dl-daily .dl-where { color: ${P.bone}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-daily .dl-time { text-align: right; font-variant-numeric: tabular-nums; color: ${P.bone}; }
.dl-daily .dl-gap { text-align: center; color: ${P.warmGrey}; font-size: ${px(18)}; padding: ${px(2)} 0; }
.dl-daily .dl-empty { flex: 1 1 auto; display: flex; align-items: center; justify-content: center; text-align: center; color: ${P.bone}; font-size: ${px(20)}; padding: ${px(18)}; line-height: 1.4; }
.dl-daily .dl-boardnote { font-size: ${px(16)}; color: ${P.warmGrey}; min-height: ${px(20)}; }
.dl-daily .dl-actions { display: flex; gap: ${px(16)}; justify-content: center; align-items: center; flex-wrap: wrap; }
.dl-daily .dl-go.ap-btn { min-width: ${px(260)}; font-size: ${px(26)}; border-color: ${P.hearthAmber}CC;
  background: linear-gradient(180deg, #4A3A22 0%, #2E2618 100%); }
.dl-daily .dl-foot { display: flex; gap: ${px(24)}; align-items: center; flex-wrap: wrap; justify-content: center; font-size: ${px(19)}; color: ${P.warmGrey}; }
.dl-daily .dl-foot b { display: inline-flex; align-items: center; justify-content: center; min-width: ${px(32)}; height: ${px(30)}; padding: 0 ${px(8)}; margin-right: ${px(6)};
  border-radius: ${px(7)}; border: max(1px, ${px(2)}) solid ${P.warmGrey}AA; background: ${P.voidCharcoal}; color: ${P.bone}; font-weight: 700; }
@media (max-height: 640px) {
  .dl-daily .dl-wrap { gap: ${px(10)}; padding: ${px(18)} ${px(28)} ${px(14)}; }
  .dl-daily .dl-board { min-height: ${px(250)}; }
  .dl-daily .dl-row { font-size: ${px(17)}; padding: ${px(3)} ${px(8)}; }
}
`;
  document.head.appendChild(st);
}

export function createDailyScreen(ctx) {
  installStyle();
  const { manager, app } = ctx;
  const daily = () => service('daily');
  const el = document.createElement('div');
  el.className = 'dl-daily';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', t('The Daily Descent'));
  el.innerHTML = `
    <div class="ap-veil"></div>
    <div class="dl-wrap ap-plate">
      <div class="dl-head">
        <div class="ap-orn">◆ ◇ ◆</div>
        <h2 class="ap-h2">${t('The Daily Descent')}</h2>
        <div class="dl-day"></div>
        <div class="dl-sub">${t('One run a day, the same for every player: the same levels, doors and bosses, and the same relic and curse from the first room. Go as deep as you can; the fastest breaks a tie.')}</div>
      </div>
      <div class="dl-body">
        <div class="dl-col">
          <div class="dl-label">${t("Today's omen")}</div>
          <div class="dl-omen dl-relic"><div class="dl-icon"></div><div><div class="dl-kind"></div><div class="dl-name"></div><div class="dl-text"></div></div></div>
          <div class="dl-omen dl-curse"><div class="dl-icon"></div><div><div class="dl-kind"></div><div class="dl-name"></div><div class="dl-text"></div></div></div>
          <div class="dl-rules">${t('Campaign rules from Level I · Standard challenge · nothing equipped from Unlocks · single player. Play as often as you like: your best run counts.')}</div>
          <div class="dl-best"></div>
        </div>
        <div class="dl-col">
          <div class="dl-label">${t("Today's board")}</div>
          <div class="dl-board" aria-live="polite"></div>
          <div class="dl-boardnote"></div>
        </div>
      </div>
      <div class="dl-actions">
        <button type="button" class="ap-btn ap-primary dl-go" data-nav data-nav-default>${t('Set out')}</button>
        <button type="button" class="ap-btn dl-back" data-nav>${t('Back to camp')}</button>
      </div>
      <div class="dl-foot">
        <span><b>E</b><b>Enter</b>${t('Set out')}</span>
        <span><b>R</b>${t('Refresh the board')}</span>
        <span><b>Esc</b>${t('Back to camp')}</span>
      </div>
    </div>`;
  const dayEl = el.querySelector('.dl-day');
  const boardEl = el.querySelector('.dl-board');
  const boardNote = el.querySelector('.dl-boardnote');
  const bestEl = el.querySelector('.dl-best');
  let p = null;
  let settled = false;
  let key = null;
  let shown = -1;
  let timer = 0;

  function finish(go) {
    if (settled) return;
    settled = true;
    if (manager.top() === 'daily') manager.pop();
    if (!go) {
      p?.onCancel?.();
      return;
    }
    const r = p?.onChoose?.(key);
    if (r && r.ok === false && app && typeof app.toast === 'function') app.toast(t("Can't set out right now"), { tone: 'warn' });
  }
  el.querySelector('.dl-go').addEventListener('click', () => finish(true));
  el.querySelector('.dl-back').addEventListener('click', () => finish(false));

  function omenCard(sel, kind, name, text, edge, icon) {
    const c = el.querySelector(sel);
    c.style.setProperty('--edge', edge);
    c.querySelector('.dl-icon').innerHTML = icon;
    c.querySelector('.dl-kind').textContent = kind;
    c.querySelector('.dl-name').textContent = name;
    c.querySelector('.dl-text').textContent = text;
  }

  function renderStatic() {
    const d = daily();
    key = d ? d.today() : null;
    dayEl.textContent = key ? dayLabel(key) : '';
    const o = d && key ? d.omen(key) : { relic: null, curse: null };
    const r = o.relic && RELICS[o.relic];
    const c = o.curse && CURSES[o.curse];
    const RW = { common: t('common'), rare: t('rare'), legendary: t('legendary') };
    omenCard('.dl-relic', t('Relic · {rarity}', { rarity: r ? RW[r.rarity] ?? r.rarity : '' }), r ? t(r.name) : '—', r ? t(r.text) : '', r ? RARITY_COLOR[r.rarity] ?? P.bone : P.bone, r ? relicIconHtml(o.relic, 64) : '');
    omenCard('.dl-curse', t('Major curse · the whole run'), c ? t(c.name) : '—', c ? t(c.text) : '', P.godstuffViolet, curseIconHtml(64, true));
  }

  function renderBoard() {
    const d = daily();
    if (!d || !key) return;
    shown = d.rev();
    const mine = d.localBest(key);
    const { h, m } = untilNext();
    const next = t('A new descent in {h} h {m} min', { h, m });
    bestEl.innerHTML = mine
      ? `${t('Your best today: <b>{place}</b> in {time}', { place: esc(placeLine(mine.depth, mine.won)), time: clockOf(mine.ticks) })} · ${esc(next)}`
      : `${t('You have not gone down today.')} · ${esc(next)}`;
    const b = d.cached(key);
    if (!b) {
      boardEl.innerHTML = `<div class="dl-empty">${t('Reading the board…')}</div>`;
      boardNote.textContent = '';
      return;
    }
    if (!b.ok) {
      boardEl.innerHTML = `<div class="dl-empty">${b.error === 'network' ? t('Couldn’t reach the server. The run still counts on this device; the board will have it when you post a run online.') : t('The board is not available right now.')}</div>`;
      boardNote.textContent = '';
      return;
    }
    const rows = (b.entries || []).slice(0, DAILY_RULES.boardSize);
    if (!rows.length) {
      boardEl.innerHTML = `<div class="dl-empty">${t('Nobody has gone down today yet. Be the first on the board.')}</div>`;
    } else {
      const me = b.me || null;
      const line = (e, isMe) =>
        `<div class="dl-row${isMe ? ' dl-me' : ''}"><div class="dl-rank">${e.rank}</div><div class="dl-who" style="--cls:${(VFX_SIGNATURE[e.cls] && VFX_SIGNATURE[e.cls].glow) ?? P.bone}"><i class="dl-pip"></i><span>${esc(e.name)}</span></div><div class="dl-where">${esc(placeLine(e.depth, e.won))}</div><div class="dl-time">${clockOf(e.ticks)}</div></div>`;
      const show = rows.slice(0, me && me.rank > 10 ? 9 : 10);
      let html = `<div class="dl-row dl-hd"><div class="dl-rank">#</div><div>${t('Name')}</div><div>${t('Depth')}</div><div class="dl-time">${t('Time')}</div></div>`;
      html += show.map((e) => line(e, !!me && e.rank === me.rank)).join('');
      if (me && me.rank > show.length) html += `<div class="dl-gap">⋯</div>${line(me, true)}`;
      boardEl.innerHTML = html;
    }
    boardNote.textContent = `${tn(b.total || 0, '{n} player today', '{n} players today')}${b.durable === false ? ` · ${t('This server forgets the board when it restarts.')}` : ''}`;
  }

  const onKey = (e) => {
    if (e.code === 'KeyR' && !e.repeat && !e.ctrlKey && !e.metaKey && manager.top() === 'daily') refresh(true);
  };

  function refresh(fresh) {
    const d = daily();
    if (!d || !key) return;
    d.board(key, fresh).then(() => {
      if (!settled) renderBoard();
    });
    renderBoard();
  }

  return {
    el,
    blocking: true,
    layer: 'screen',
    reusable: false,
    defaultFocus: '[data-nav-default]',
    onOpen(params = {}) {
      p = params;
      settled = false;
      renderStatic();
      refresh(false);
      window.addEventListener('keydown', onKey);
      timer = setInterval(() => {
        const d = daily();
        if (d && d.rev() !== shown) renderBoard();
      }, 500);
    },
    onClose() {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      if (!settled) {
        settled = true;
        p?.onCancel?.();
      }
    },
    onNav(action, source) {
      if (action === 'tabNext' && source === 'keyboard') {
        const f = el.querySelector('.ap-btn.ap-focus') ?? el.querySelector('[data-nav-default]');
        if (f) f.click();
        return true;
      }
      if (action === 'tabPrev') return true;
      return false;
    },
    back() {
      finish(false);
      return true;
    },
    debug: () => ({
      key,
      via: p?.via ?? null,
      relic: el.querySelector('.dl-relic .dl-name').textContent,
      curse: el.querySelector('.dl-curse .dl-name').textContent,
      best: bestEl.textContent,
      board: [...boardEl.querySelectorAll('.dl-row:not(.dl-hd)')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()),
      note: boardNote.textContent,
      empty: (boardEl.querySelector('.dl-empty') || {}).textContent || null,
    }),
  };
}
