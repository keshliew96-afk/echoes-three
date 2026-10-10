// Daily Descent leaderboard on the session server (docs/DAILY.md). Zero
// dependencies.
//
//   GET  /daily/board/<YYYY-MM-DD>[?me=<id>] -> { ok, key, today, entries: [...top], total, me?, store, durable }
//   POST /daily/score { key, id, name, cls, depth, won, ticks, version }
//                                          -> { ok, rank, total, best, entry }
//
// One entry per player per day: the player's best run (deeper, then faster).
// `id` is a random id the game keeps on the device (never shown); the board
// shows the name. Only today's board and yesterday's (a run that finished
// past midnight UTC) take scores; boards are kept for KEEP_DAYS.
//
// Where boards live: the same Upstash Redis REST database as cloud saves
// (ECHOES_CLOUD_REDIS_URL + ECHOES_CLOUD_REDIS_TOKEN), one hash per day;
// without it, in this process's memory (gone on a restart or redeploy, like
// cloud saves on the free Render disk).
import { dailyKey, dayDiff, isDailyKey, compareEntries, betterEntry, cleanName, DAILY_RULES } from '../src/data/daily.js';

const KEEP_DAYS = 30;
const MAX_ENTRIES = 5000; // per day, in memory
const CLASSES = new Set(['healer', 'tank', 'swordsman', 'archer', 'tidecaller']);
const RATE = { score: 30, board: 120, windowMs: 10 * 60 * 1000 };
const MAX_TICKS = 60 * 60 * 60 * 6; // six hours of play
const MAX_DEPTH = DAILY_RULES.roomsPerLevel * 8;

function memoryBackend() {
  const days = new Map(); // key -> Map(id -> entry)
  return {
    kind: 'memory',
    async all(key) {
      const d = days.get(key);
      return d ? [...d.values()] : [];
    },
    async get(key, id) {
      const d = days.get(key);
      return (d && d.get(id)) || null;
    },
    async put(key, id, entry) {
      let d = days.get(key);
      if (!d) {
        d = new Map();
        days.set(key, d);
        for (const k of days.keys()) if (!(dayDiff(k, key) <= KEEP_DAYS)) days.delete(k);
      }
      if (d.size >= MAX_ENTRIES && !d.has(id)) return false;
      d.set(id, entry);
      return true;
    },
  };
}

function redisBackend(url, token, fetchImpl = globalThis.fetch) {
  async function cmd(args) {
    const res = await fetchImpl(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const j = await res.json();
    if (j && j.error) throw new Error(`redis ${j.error}`);
    return j ? j.result : null;
  }
  const hkey = (key) => `echoes:daily:${key}`;
  const parse = (v) => {
    try {
      return typeof v === 'string' ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };
  return {
    kind: 'redis',
    async all(key) {
      const flat = await cmd(['HGETALL', hkey(key)]);
      const out = [];
      if (Array.isArray(flat)) for (let i = 1; i < flat.length; i += 2) {
        const e = parse(flat[i]);
        if (e) out.push(e);
      }
      return out;
    },
    async get(key, id) {
      return parse(await cmd(['HGET', hkey(key), id]));
    },
    async put(key, id, entry) {
      await cmd(['HSET', hkey(key), id, JSON.stringify(entry)]);
      await cmd(['EXPIRE', hkey(key), String(KEEP_DAYS * 86400)]);
      return true;
    },
  };
}

// A score as the game posts it: checked, cleaned, or a reason it is refused.
export function checkScore(b, today) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad_score' };
  if (!isDailyKey(b.key)) return { error: 'bad_day' };
  const age = dayDiff(b.key, today);
  if (!(age >= 0 && age <= DAILY_RULES.graceDays)) return { error: 'closed_day' };
  if (typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(b.id)) return { error: 'bad_id' };
  const depth = Number(b.depth);
  const ticks = Number(b.ticks);
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_DEPTH) return { error: 'bad_score' };
  if (!Number.isInteger(ticks) || ticks <= 0 || ticks > MAX_TICKS) return { error: 'bad_score' };
  return {
    entry: {
      name: cleanName(b.name),
      cls: CLASSES.has(b.cls) ? b.cls : 'healer',
      depth,
      won: !!b.won,
      ticks,
      version: typeof b.version === 'string' ? b.version.slice(0, 16) : null,
    },
  };
}

export function createDailyStore({ env = process.env, fetchImpl, now = () => Date.now() } = {}) {
  const redisUrl = env.ECHOES_CLOUD_REDIS_URL;
  const redisToken = env.ECHOES_CLOUD_REDIS_TOKEN;
  const durable = !!(redisUrl && redisToken);
  const backend = durable ? redisBackend(String(redisUrl).replace(/\/$/, ''), String(redisToken), fetchImpl) : memoryBackend();
  const hits = new Map();
  function allow(kind, ip) {
    const k = `${kind}:${ip || '?'}`;
    const t = now();
    let h = hits.get(k);
    if (!h || t - h.since > RATE.windowMs) {
      h = { n: 0, since: t };
      hits.set(k, h);
    }
    if (hits.size > 20000) hits.clear();
    h.n += 1;
    return h.n <= RATE[kind];
  }
  const info = () => ({ store: backend.kind, durable });
  // Public view of an entry (the id stays on the server).
  const pub = (e, rank) => ({ rank, name: e.name, cls: e.cls, depth: e.depth, won: e.won, ticks: e.ticks, at: e.at });

  async function ranked(key) {
    const list = await backend.all(key);
    list.sort(compareEntries);
    return list;
  }

  async function board(key, me, ip) {
    if (!allow('board', ip)) return { status: 429, body: { ok: false, error: 'busy' } };
    if (!isDailyKey(key)) return { status: 400, body: { ok: false, error: 'bad_day' } };
    const list = await ranked(key);
    const body = { ok: true, key, today: dailyKey(now()), total: list.length, entries: list.slice(0, DAILY_RULES.boardSize).map((e, i) => pub(e, i + 1)), ...info() };
    if (typeof me === 'string' && me) {
      const i = list.findIndex((e) => e.id === me);
      if (i >= 0) body.me = pub(list[i], i + 1);
    }
    return { status: 200, body };
  }

  async function score(b, ip) {
    if (!allow('score', ip)) return { status: 429, body: { ok: false, error: 'busy' } };
    const today = dailyKey(now());
    const c = checkScore(b, today);
    if (c.error) return { status: 400, body: { ok: false, error: c.error, today } };
    const entry = { ...c.entry, id: b.id, at: new Date(now()).toISOString() };
    const cur = await backend.get(b.key, b.id);
    const best = betterEntry(entry, cur);
    if (best) {
      const ok = await backend.put(b.key, b.id, entry);
      if (!ok) return { status: 503, body: { ok: false, error: 'full' } };
    }
    const list = await ranked(b.key);
    const i = list.findIndex((e) => e.id === b.id);
    return { status: 200, body: { ok: true, key: b.key, best, rank: i + 1, total: list.length, entry: pub(best ? entry : cur, i + 1), ...info() } };
  }

  return { board, score, info, kind: backend.kind, durable };
}

function readJson(req, max) {
  return new Promise((res, rej) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) {
        rej(Object.assign(new Error('too large'), { code: 'too_large' }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        res(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        rej(Object.assign(new Error('not json'), { code: 'bad_score' }));
      }
    });
    req.on('error', rej);
  });
}

// The HTTP routes. Returns false for any other path.
export async function handleDaily(req, res, { store, ip, cors }) {
  let url;
  try {
    url = new URL(req.url, 'http://x');
  } catch {
    return false;
  }
  if (!url.pathname.startsWith('/daily/')) return false;
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors });
    res.end(JSON.stringify(body));
  };
  try {
    if (req.method === 'POST' && url.pathname === '/daily/score') {
      let body;
      try {
        body = await readJson(req, 4096);
      } catch (err) {
        return send(err.code === 'too_large' ? 413 : 400, { ok: false, error: err.code || 'bad_score' }), true;
      }
      const r = await store.score(body || {}, ip);
      return send(r.status, r.body), true;
    }
    const m = /^\/daily\/board\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const r = await store.board(decodeURIComponent(m[1]), url.searchParams.get('me'), ip);
      return send(r.status, r.body), true;
    }
    return send(404, { ok: false, error: 'not_found' }), true;
  } catch (err) {
    send(503, { ok: false, error: 'unavailable', detail: String(err && err.message).slice(0, 120) });
    return true;
  }
}
