// Cloud saves on the session server (docs/CLOUD_SAVES.md). Zero dependencies.
//
//   POST /cloud/save        { bundle, code?, token? } -> { ok, code, token, savedAt, expiresAt, durable, store }
//   GET  /cloud/save/<CODE>                           -> { ok, bundle, savedAt, expiresAt } | 404 not_found
//   GET  /cloud/info                                  -> { ok, store, durable, ttlDays, maxBytes }
//
// A save is kept under a short code (8 letters and digits from an alphabet
// with no 0/O or 1/I/L, shown as ABCD-EFGH) plus a secret token only the
// device that made it holds. Saving again with that code + token replaces the
// same code — also when the server has forgotten it (a restart on an
// ephemeral disk), so the player's code comes back with one press.
//
// Where saves live (the first that is configured):
//   ECHOES_CLOUD_REDIS_URL + ECHOES_CLOUD_REDIS_TOKEN   an Upstash Redis REST
//       database (free tier, durable): survives restarts and redeploys.
//   ECHOES_CLOUD_DIR (or --cloud-dir)  a directory, one <CODE>.json per save
//       (default <cwd>/.echoes-cloud). Durable only when the directory is on a
//       persistent disk: say so with ECHOES_CLOUD_DURABLE=1.
// On free Render the default directory is on the instance's ephemeral disk:
// it is wiped on every deploy and every restart, and a free instance restarts
// when it wakes from sleep (about 15 minutes after the last visitor).
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, unlink, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LEN = 8;
export const MAX_BUNDLE_BYTES = 3 * 1024 * 1024;
const TTL_DAYS = 365;
const MAX_FILES = 5000;
// Per client IP: uploads and lookups per 10 minutes (a code guesser gets
// nowhere: 31^8 codes).
const RATE = { save: 30, load: 60, windowMs: 10 * 60 * 1000 };

// 'abcd efgh' / 'ABCD-EFGH' -> 'ABCDEFGH', or null when it is not a code.
export function normalizeCode(raw) {
  const s = String(raw == null ? '' : raw)
    .toUpperCase()
    .replace(/[\s-]+/g, '');
  if (s.length !== CODE_LEN) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}
export const formatCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;

function newCode() {
  const b = randomBytes(CODE_LEN);
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
  return s;
}
const hashToken = (tok) => createHash('sha256').update(String(tok)).digest('hex');
function sameHash(a, b) {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

// A bundle the game made (src/save/cloud.js): checked for shape, not content.
export function checkBundle(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 'not_a_bundle';
  if (b.kind !== 'echoes-cloud' || b.v !== 1) return 'not_a_bundle';
  if (b.profile !== null && typeof b.profile !== 'string') return 'not_a_bundle';
  if (!b.slots || typeof b.slots !== 'object' || Array.isArray(b.slots)) return 'not_a_bundle';
  for (const [k, v] of Object.entries(b.slots)) if (!/^[a-z0-9-]{1,16}$/.test(k) || typeof v !== 'string') return 'not_a_bundle';
  return null;
}

// ------------------------------------------------------------ backends --
function fileBackend(dir) {
  let ready = null;
  const ensure = () => (ready = ready || mkdir(dir, { recursive: true }));
  const path = (code) => join(dir, `${code}.json`);
  async function prune() {
    try {
      const names = (await readdir(dir)).filter((n) => /^[A-Z0-9]{8}\.json$/.test(n));
      if (names.length <= MAX_FILES) return;
      const st = await Promise.all(names.map(async (n) => ({ n, t: (await stat(join(dir, n))).mtimeMs })));
      st.sort((a, b) => a.t - b.t);
      for (const { n } of st.slice(0, names.length - MAX_FILES)) await unlink(join(dir, n)).catch(() => {});
    } catch {
      /* best effort */
    }
  }
  return {
    kind: 'disk',
    async get(code) {
      try {
        return JSON.parse(await readFile(path(code), 'utf8'));
      } catch {
        return null;
      }
    },
    async put(code, rec) {
      await ensure();
      const tmp = `${path(code)}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(rec));
      await rename(tmp, path(code));
      prune();
    },
  };
}

// Upstash Redis over its REST API: POST <url> with a command array.
function redisBackend(url, token, fetchImpl = globalThis.fetch) {
  async function cmd(args) {
    const res = await fetchImpl(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(args) });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const j = await res.json();
    if (j && j.error) throw new Error(`redis ${j.error}`);
    return j ? j.result : null;
  }
  return {
    kind: 'redis',
    async get(code) {
      const v = await cmd(['GET', `echoes:cloud:${code}`]);
      if (typeof v !== 'string') return null;
      try {
        return JSON.parse(v);
      } catch {
        return null;
      }
    },
    async put(code, rec) {
      await cmd(['SET', `echoes:cloud:${code}`, JSON.stringify(rec), 'EX', String(TTL_DAYS * 86400)]);
    },
  };
}

export function createCloudStore({ dir = null, env = process.env, fetchImpl } = {}) {
  const redisUrl = env.ECHOES_CLOUD_REDIS_URL;
  const redisToken = env.ECHOES_CLOUD_REDIS_TOKEN;
  let backend;
  let durable;
  if (redisUrl && redisToken) {
    backend = redisBackend(String(redisUrl).replace(/\/$/, ''), String(redisToken), fetchImpl);
    durable = true;
  } else {
    backend = fileBackend(resolve(dir || env.ECHOES_CLOUD_DIR || '.echoes-cloud'));
    durable = env.ECHOES_CLOUD_DURABLE === '1' || env.ECHOES_CLOUD_DURABLE === 'true';
  }
  const hits = new Map(); // `${kind}:${ip}` -> { n, since }
  function allow(kind, ip) {
    const k = `${kind}:${ip || '?'}`;
    const now = Date.now();
    let h = hits.get(k);
    if (!h || now - h.since > RATE.windowMs) {
      h = { n: 0, since: now };
      hits.set(k, h);
    }
    if (hits.size > 20000) hits.clear();
    h.n += 1;
    return h.n <= RATE[kind];
  }
  const info = () => ({ ok: true, store: backend.kind, durable, ttlDays: TTL_DAYS, maxBytes: MAX_BUNDLE_BYTES });
  const expires = (ms) => new Date(ms + TTL_DAYS * 86400 * 1000).toISOString();

  async function save({ bundle, code = null, token = null }, ip) {
    if (!allow('save', ip)) return { status: 429, body: { ok: false, error: 'busy' } };
    const bad = checkBundle(bundle);
    if (bad) return { status: 400, body: { ok: false, error: bad } };
    const now = Date.now();
    let use = null;
    const want = normalizeCode(code);
    if (want && typeof token === 'string' && token.length >= 16) {
      const cur = await backend.get(want);
      // Same device (token matches) or a code the server has forgotten:
      // the player keeps their code.
      if (!cur || sameHash(cur.tokenHash, hashToken(token))) use = { code: want, token };
    }
    if (!use) {
      let c = null;
      for (let i = 0; i < 6 && !c; i++) {
        const k = newCode();
        if (!(await backend.get(k))) c = k;
      }
      if (!c) return { status: 503, body: { ok: false, error: 'unavailable' } };
      use = { code: c, token: randomBytes(18).toString('base64url') };
    }
    const savedAt = new Date(now).toISOString();
    await backend.put(use.code, { v: 1, tokenHash: hashToken(use.token), savedAt, bundle });
    return { status: 200, body: { ok: true, code: use.code, token: use.token, savedAt, expiresAt: expires(now), ...info() } };
  }

  async function load(raw, ip) {
    if (!allow('load', ip)) return { status: 429, body: { ok: false, error: 'busy' } };
    const code = normalizeCode(raw);
    if (!code) return { status: 400, body: { ok: false, error: 'bad_code' } };
    const rec = await backend.get(code);
    if (!rec || !rec.bundle) return { status: 404, body: { ...info(), ok: false, error: 'not_found' } };
    return { status: 200, body: { ok: true, code, bundle: rec.bundle, savedAt: rec.savedAt, expiresAt: expires(Date.parse(rec.savedAt) || Date.now()) } };
  }

  return { info, save, load, kind: backend.kind, durable };
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
        rej(Object.assign(new Error('not json'), { code: 'not_a_bundle' }));
      }
    });
    req.on('error', rej);
  });
}

// The HTTP routes. Returns false for any other path.
export async function handleCloud(req, res, { store, ip, cors }) {
  let url;
  try {
    url = new URL(req.url, 'http://x');
  } catch {
    return false;
  }
  if (!url.pathname.startsWith('/cloud/')) return false;
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors });
    res.end(JSON.stringify(body));
  };
  try {
    if (req.method === 'GET' && url.pathname === '/cloud/info') return send(200, store.info()), true;
    if (req.method === 'POST' && url.pathname === '/cloud/save') {
      let body;
      try {
        body = await readJson(req, MAX_BUNDLE_BYTES + 4096);
      } catch (err) {
        return send(err.code === 'too_large' ? 413 : 400, { ok: false, error: err.code || 'not_a_bundle' }), true;
      }
      const r = await store.save(body || {}, ip);
      return send(r.status, r.body), true;
    }
    const m = /^\/cloud\/save\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const r = await store.load(decodeURIComponent(m[1]), ip);
      return send(r.status, r.body), true;
    }
    return send(404, { ok: false, error: 'not_found' }), true;
  } catch (err) {
    send(503, { ok: false, error: 'unavailable', detail: String(err && err.message).slice(0, 120) });
    return true;
  }
}
