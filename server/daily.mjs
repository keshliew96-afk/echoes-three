// Daily Descent leaderboard on the session server (docs/DAILY.md). Zero
// dependencies.
//
//   GET  /daily/board/<YYYY-MM-DD>[?me=<id>] -> { ok, key, today, entries: [...top], total, me?, store, durable }
//   POST /daily/score { key, id, name, cls, depth, won, ticks, seed, version }
//                                          -> { ok, rank, total, best, entry }
//
// One entry per player per day: the player's counted run, the day's first
// (the game posts only that one; a second, different run for the same id and
// day is refused with 'counted'). A score must also be plausible: the
// game's version line, the day's own seed, a depth the campaign has, a won
// run that cleared every room, and a time no shorter than MIN_ROOM_TICKS per
// room cleared (SHOP AND DAILY FIXES, content plan 3 slice 14).
// `id` is a random id the game keeps on the device (never shown); the board
// shows the name. Only today's board and yesterday's (a run that finished
// past midnight UTC) take scores; boards are kept for KEEP_DAYS.
//
// Where boards live: the same Upstash Redis REST database as cloud saves
// (ECHOES_CLOUD_REDIS_URL + ECHOES_CLOUD_REDIS_TOKEN), one hash per day;
// without it, in this process's memory (gone on a restart or redeploy, like
// cloud saves on the free Render disk).
import { dailyKey, dayDiff, isDailyKey, compareEntries, cleanName, dailySeed, DAILY_RULES } from '../src/data/daily.js';
import { CAMPAIGN_ACTS } from '../src/data/levels.js';
import { VERSION } from '../src/version.js';
import { windowCounter, REDIS_TIMEOUT_MS } from './cloud.mjs';

const KEEP_DAYS = 30;
const MAX_ENTRIES = 5000; // per day, in memory and in Redis
// SERVER HARDENING (docs/CODE_REVIEW.md #4): new player ids one client IP may
// put on a day's board (a household, a reinstall or two), and how many
// patch versions behind this server a posting game may be (a run that
// started just before a deploy still counts).
export const NEW_IDS_PER_IP_DAY = 6;
export const VERSION_PATCH_WINDOW = 3;
const CLASSES = new Set(['healer', 'tank', 'swordsman', 'archer', 'tidecaller', 'bellwright', 'duskwing']);
const RATE = { score: 30, board: 120, windowMs: 10 * 60 * 1000 };
const MAX_TICKS = 60 * 60 * 60 * 6; // six hours of play
// Every room of every level (a won run).
const MAX_DEPTH = DAILY_RULES.roomsPerLevel * CAMPAIGN_ACTS;
// The fewest ticks a cleared room may average: 4 s. The autopilot's fastest
// whole level over 64 seeds took 6046 ticks (756 a room, shop included), so a
// real run sits far above this; a made-up post (depth 40 in a minute) does not.
export const MIN_ROOM_TICKS = 240;
const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)$/;
// The game's version must be this server's line (major.minor), no newer
// than the server and at most VERSION_PATCH_WINDOW patches older: the day's
// relic and curse come from the version's relic list, a build the server
// does not know cannot be checked, and an old build's rules are not today's.
export function versionOk(v, server = VERSION) {
  const a = VERSION_RE.exec(typeof v === 'string' ? v : '');
  const b = VERSION_RE.exec(server);
  if (!a || !b) return false;
  return a[1] === b[1] && a[2] === b[2] && Number(a[3]) <= Number(b[3]) && Number(b[3]) - Number(a[3]) <= VERSION_PATCH_WINDOW;
}

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
    const res = await fetchImpl(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(args), signal: AbortSignal.timeout(REDIS_TIMEOUT_MS) });
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
      // The same per-day cap as memory: a new id past it is refused.
      if (Number(await cmd(['HLEN', hkey(key)])) >= MAX_ENTRIES && !(await cmd(['HEXISTS', hkey(key), id]))) return false;
      await cmd(['HSET', hkey(key), id, JSON.stringify(entry)]);
      await cmd(['EXPIRE', hkey(key), String(KEEP_DAYS * 86400)]);
      return true;
    },
  };
}

// A score as the game posts it: checked, cleaned, or a reason it is refused.
export function checkScore(b, today, { version = VERSION } = {}) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { error: 'bad_score' };
  if (!isDailyKey(b.key)) return { error: 'bad_day' };
  const age = dayDiff(b.key, today);
  if (!(age >= 0 && age <= DAILY_RULES.graceDays)) return { error: 'closed_day' };
  if (typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(b.id)) return { error: 'bad_id' };
  const depth = Number(b.depth);
  const ticks = Number(b.ticks);
  if (!Number.isInteger(depth) || depth < 0 || depth > MAX_DEPTH) return { error: 'bad_score' };
  if (!Number.isInteger(ticks) || ticks <= 0 || ticks > MAX_TICKS) return { error: 'bad_score' };
  if (!versionOk(b.version, version)) return { error: 'bad_version' };
  if (Number(b.seed) !== dailySeed(b.key)) return { error: 'bad_seed' };
  if (b.won && depth !== MAX_DEPTH) return { error: 'implausible' };
  if (ticks < depth * MIN_ROOM_TICKS) return { error: 'implausible' };
  return {
    entry: {
      name: cleanName(b.name),
      cls: CLASSES.has(b.cls) ? b.cls : 'healer',
      depth,
      won: !!b.won,
      ticks,
      version: b.version,
    },
  };
}

export function createDailyStore({ env = process.env, fetchImpl, now = () => Date.now() } = {}) {
  const redisUrl = env.ECHOES_CLOUD_REDIS_URL;
  const redisToken = env.ECHOES_CLOUD_REDIS_TOKEN;
  const durable = !!(redisUrl && redisToken);
  const backend = durable ? redisBackend(String(redisUrl).replace(/\/$/, ''), String(redisToken), fetchImpl) : memoryBackend();
  const hits = windowCounter(RATE.windowMs);
  const newIds = windowCounter(86400 * 1000);
  function allow(kind, ip) {
    return hits.add(`${kind}:${ip || '?'}`, 1, now()) <= RATE[kind];
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
    // One counted run a day: the first post stands. The same run sent again
    // (a retry after a lost answer) is answered as before; another is refused.
    if (cur && !(cur.depth === entry.depth && cur.ticks === entry.ticks && !!cur.won === entry.won)) {
      return { status: 409, body: { ok: false, error: 'counted', today } };
    }
    const best = !cur;
    if (best) {
      // SERVER HARDENING: a few new ids per IP per day (each fake id was a
      // fresh board entry).
      if (newIds.peek(`${b.key}:${ip || '?'}`, now()) >= NEW_IDS_PER_IP_DAY) return { status: 429, body: { ok: false, error: 'busy', today } };
      const ok = await backend.put(b.key, b.id, entry);
      if (ok) newIds.add(`${b.key}:${ip || '?'}`, 1, now());
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
