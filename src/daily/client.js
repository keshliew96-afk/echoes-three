// DAILY DESCENT (docs/DAILY.md): the game's side of the day's run — which
// day it is, the day's relic and curse, the leaderboard on the session
// server, and posting a finished daily run to it. Provided as the `daily`
// service (the Level Select card, the daily screen, the end card).
//
//   today()            'YYYY-MM-DD' (UTC; ?daily=<day> pins it for probes)
//   omen(key)          { relic, curse } of that day (sim/relics.js dailyOmen)
//   board(key, fresh?) Promise<{ ok, entries, total, me?, error? }> (cached)
//   cached(key)        the last board fetched for the day, or null
//   localBest(key)     this device's counted run that day { depth, ticks, won } | null
//   counted(key)       'open' (the day's counted run is still to play) |
//                      'started' (set out, not finished) | 'done'
//   attempt(key)       at Set out: { practice } — the first run of the day is
//                      the counted one (marked here, so a closed tab spends
//                      it too); every later run is practice and never posted
//   last()             the last daily run's posting: { key, depth, ticks, won,
//                      state: 'posting' | 'posted' | 'failed' | 'practice', rank?, total?, best?, error? }
//   rev()              bumps whenever any of the above changes (UI repaint)
import { dailyKey, isDailyKey, dailySeed, betterEntry, cleanName } from '../data/daily.js';
import { dailyOmen } from '../sim/relics.js';
import { resolveServerAddress } from '../net/address.js';
import { VERSION } from '../version.js';

const STORE_KEY = 'echoes.daily.v1';
const TIMEOUT_MS = 15000;
const KEEP_DAYS = 14;

function readStore() {
  try {
    const j = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (j && typeof j === 'object' && typeof j.id === 'string' && j.days && typeof j.days === 'object') return j;
  } catch {
    /* fresh below */
  }
  return null;
}
function writeStore(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* the board still has it */
  }
}
function newId() {
  const b = new Uint8Array(18);
  (globalThis.crypto || {}).getRandomValues?.(b);
  let s = '';
  for (const x of b) s += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[(x || Math.floor(Math.random() * 256)) & 63];
  return s;
}

export function createDailyClient({ bus, world, service, settings, classOf = () => 'healer' }) {
  let store = readStore() || { id: newId(), days: {} };
  writeStore(store);
  const boards = new Map(); // key -> { at, data }
  let lastPost = null;
  let revision = 0;
  const bump = () => {
    revision += 1;
  };

  function today() {
    let q = null;
    try {
      q = new URLSearchParams(window.location.search).get('daily');
    } catch {
      q = null;
    }
    if (q && isDailyKey(q)) return q;
    return dailyKey(Date.now());
  }
  const omen = (key) => dailyOmen(dailySeed(key));

  function base() {
    let ws = null;
    try {
      const n = service('net');
      ws = n && typeof n.addressInfo === 'function' ? n.addressInfo().url : null;
    } catch {
      ws = null;
    }
    if (!ws) ws = resolveServerAddress().url;
    try {
      const u = new URL(ws);
      return `${u.protocol === 'wss:' ? 'https:' : 'http:'}//${u.host}`;
    } catch {
      return '';
    }
  }
  async function call(path, { method = 'GET', body = null } = {}) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : 0;
    try {
      const res = await fetch(`${base()}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
        signal: ctl ? ctl.signal : undefined,
      });
      let j = null;
      try {
        j = await res.json();
      } catch {
        j = null;
      }
      if (j && typeof j === 'object') return { status: res.status, ...j, ok: !!j.ok && res.ok };
      return { ok: false, status: res.status, error: 'server' };
    } catch {
      return { ok: false, status: 0, error: 'network' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function board(key, fresh = false) {
    const c = boards.get(key);
    if (c && !fresh && Date.now() - c.at < 30000) return c.data;
    const r = await call(`/daily/board/${encodeURIComponent(key)}?me=${encodeURIComponent(store.id)}`);
    boards.set(key, { at: Date.now(), data: r });
    bump();
    return r;
  }
  const cached = (key) => (boards.get(key) || {}).data || null;

  function localBest(key) {
    const d = store.days[key];
    return d && Number.isFinite(d.depth) ? d : null;
  }
  // SHOP AND DAILY FIXES: one counted run a day. A day with a result from
  // before this rule (no `counted` mark) is done too.
  function counted(key) {
    const d = store.days[key];
    if (!d) return 'open';
    if (d.counted === 'started' && !Number.isFinite(d.depth)) return 'started';
    return 'done';
  }
  function attempt(key) {
    store = readStore() || store;
    if (!isDailyKey(key) || counted(key) !== 'open') return { practice: true };
    store.days[key] = { counted: 'started' };
    trimDays();
    writeStore(store);
    bump();
    return { practice: false };
  }
  function trimDays() {
    const keys = Object.keys(store.days).sort();
    while (keys.length > KEEP_DAYS) delete store.days[keys.shift()];
  }
  function noteLocal(key, run) {
    store = readStore() || store;
    if (betterEntry(run, localBest(key))) store.days[key] = { depth: run.depth, ticks: run.ticks, won: !!run.won, counted: 'done' };
    trimDays();
    writeStore(store);
  }

  function playerName() {
    let n = '';
    try {
      // ?netname= names the player for harnesses, as it does in lobbies.
      const q = new URLSearchParams(window.location.search).get('netname');
      if (q) return cleanName(q);
    } catch {
      /* the setting below */
    }
    try {
      n = settings && typeof settings.get === 'function' ? settings.get('net.playerName') : '';
    } catch {
      n = '';
    }
    return cleanName(n);
  }

  async function post(run) {
    lastPost = { ...run, state: 'posting' };
    bump();
    const r = await call('/daily/score', {
      method: 'POST',
      body: { key: run.key, id: store.id, name: playerName(), cls: classOf(), depth: run.depth, won: run.won, ticks: run.ticks, seed: dailySeed(run.key), version: VERSION },
    });
    if (lastPost && lastPost.key === run.key && lastPost.ticks === run.ticks) {
      lastPost = r.ok ? { ...lastPost, state: 'posted', rank: r.rank, total: r.total, best: !!r.best } : { ...lastPost, state: 'failed', error: r.error || 'server' };
    }
    boards.delete(run.key);
    bump();
    return r;
  }

  // A finished daily run (any end but the tutorial's) is posted once.
  if (bus) {
    bus.on('run_end', (ev) => {
      if (!ev || ev.result === 'tutorial') return;
      let s = null;
      try {
        s = world.runSystem().view().summary;
      } catch {
        s = null;
      }
      const d = s && s.campaign && s.campaign.daily;
      if (!d || !isDailyKey(d.key)) return;
      // A network guest never runs a daily (the camp refuses it), so this is
      // the local player's own run.
      const run = { key: d.key, depth: d.depth | 0, ticks: Math.max(1, s.ticks | 0), won: !!d.won };
      // A practice run (the day's counted run is spent) stays off the board.
      if (d.practice) {
        lastPost = { ...run, state: 'practice' };
        bump();
        return;
      }
      noteLocal(d.key, run);
      post(run);
    });
  }

  return {
    today,
    omen,
    board,
    cached,
    localBest,
    counted,
    attempt,
    last: () => lastPost,
    rev: () => revision,
    playerName,
    post,
    debug: () => ({ today: today(), id: store.id ? `${store.id.slice(0, 4)}…` : null, last: lastPost, boards: [...boards.keys()], days: { ...store.days } }),
  };
}
