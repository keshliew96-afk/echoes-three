// Static game server for the one-process deploy (docs/gauntlet/PLAN.md §14.3,
// owner DEPLOY). Zero npm dependencies: node:fs, node:path, node:zlib.
//
//   const serve = createStaticHandler({ root: 'dist' });
//   http.on('request', (req, res) => serve(req, res));
//   readBuildInfo('dist') -> { version, entry } | null   (dist/version.json)
//
// `npm run serve` builds the game and runs the session server with
// `--static dist`: the page, its assets and the /echoes WebSocket share ONE
// origin, so a player opens the link and Multiplayer just works (the client
// resolves the server from the page's own origin).
//
// Behaviour (what a CDN / Netlify / Caddy file_server gives a Vite build):
//   - GET and HEAD only (405 + Allow otherwise); HEAD sends the headers alone.
//   - MIME types for every file a Vite build emits (incl. .wasm, .mjs, fonts,
//     audio, glTF); unknown -> application/octet-stream; always nosniff.
//   - `/` and any directory -> its index.html; an extension-less path that
//     is not a file (a client-side route) -> /index.html (200); a missing
//     file WITH an extension -> 404 (never HTML posing as a script).
//   - Cache-Control: index.html (and the fallback) + version.json +
//     unhashed files `no-cache` (revalidated every load, so a redeploy is
//     picked up on the next visit); hashed assets under assets/
//     (`name-HASH.ext`) `public, max-age=31536000, immutable`.
//   - ETag / Last-Modified + If-None-Match / If-Modified-Since -> 304.
//   - gzip / brotli for text, JSON, SVG and wasm (Accept-Encoding, q-values),
//     compressed once per file version and cached in memory (bounded);
//     `Vary: Accept-Encoding`.
//   - Single byte ranges (`Range: bytes=a-b`) on uncompressed responses
//     (media seeking, resumed downloads); 416 when unsatisfiable.
//   - Path traversal safe: the decoded path is normalised, `..`, NUL,
//     backslashes, drive letters and dot-files (except .well-known) are
//     refused, and the REAL path (symlinks resolved) must stay inside root.
import { createReadStream, promises as fsp, realpathSync, statSync, readFileSync } from 'node:fs';
import { resolve, join, sep, extname, posix, basename } from 'node:path';
import { brotliCompress, gzip, constants as zc } from 'node:zlib';
import { promisify } from 'node:util';

const brotliAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

export const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.ktx2': 'image/ktx2',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
});
const COMPRESSIBLE = /^(text\/|application\/(json|javascript|manifest\+json|wasm|xml)|image\/svg\+xml|model\/gltf\+json|font\/(ttf|otf))/;
const COMPRESS_MIN = 1024; // bytes; smaller bodies are not worth a header
const COMPRESS_MAX = 32 * 1024 * 1024; // larger files stream uncompressed
const COMPRESS_CACHE_MAX = 64 * 1024 * 1024; // compressed bytes kept in memory
// Vite names a content-hashed asset `name-HASH.ext` (8+ base64url chars).
const HASHED = /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/;
const SEC_HEADERS = Object.freeze({ 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' });

export function mimeOf(file) {
  return MIME[extname(file).toLowerCase()] || 'application/octet-stream';
}

// The build a static root holds: dist/version.json (written by the Vite
// build, see vite.config.js) — { version, entry } — or, without it, the
// entry chunk named in index.html. Cached per mtime.
export function readBuildInfo(root) {
  const vj = join(root, 'version.json');
  try {
    const j = JSON.parse(readFileSync(vj, 'utf8'));
    if (j && typeof j.version === 'string') return { version: j.version, entry: typeof j.entry === 'string' ? j.entry : null };
  } catch {
    /* no version.json */
  }
  try {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const m = /<script[^>]+type="module"[^>]+src="[^"]*\/([^"/]+\.m?js)"/i.exec(html);
    return m ? { version: null, entry: m[1] } : null;
  } catch {
    return null;
  }
}
export function createBuildInfoReader(root) {
  let stamp = null;
  let info = null;
  return () => {
    let s = '';
    try {
      const a = statSync(join(root, 'version.json'), { throwIfNoEntry: false });
      const b = statSync(join(root, 'index.html'), { throwIfNoEntry: false });
      s = `${a ? a.mtimeMs : 0}:${b ? b.mtimeMs : 0}`;
    } catch {
      s = 'x';
    }
    if (s !== stamp) {
      stamp = s;
      info = readBuildInfo(root);
    }
    return info;
  };
}

// Accept-Encoding -> 'br' | 'gzip' | null (honours q=0 and q-values).
export function pickEncoding(header) {
  if (!header) return null;
  const q = {};
  for (const part of String(header).split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    let qv = 1;
    for (const p of params) {
      const m = /^\s*q=([0-9.]+)\s*$/.exec(p);
      if (m) qv = Number(m[1]);
    }
    q[name] = Number.isFinite(qv) ? qv : 0;
  }
  const star = q['*'];
  const val = (n) => (q[n] !== undefined ? q[n] : star !== undefined ? star : 0);
  const br = val('br');
  const gz = val('gzip');
  if (br <= 0 && gz <= 0) return null;
  return br >= gz ? 'br' : 'gzip';
}

function etagOf(st) {
  return `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
}

export function cacheControlFor(rel) {
  const r = rel.replace(/\\/g, '/');
  if (/^assets\//.test(r) && HASHED.test(basename(r))) return 'public, max-age=31536000, immutable';
  return 'no-cache';
}

// Maps a request path to a file inside root, or a refusal. Exported for
// the traversal probes.
export function resolveInside(rootAbs, pathname) {
  if (typeof pathname !== 'string' || pathname.includes('\0') || pathname.includes('\\')) return { ok: false, status: 400 };
  const norm = posix.normalize(`/${pathname}`);
  const rel = norm.replace(/^\/+/, '');
  const segs = rel.split('/').filter(Boolean);
  if (segs.some((s) => s === '..' || s.includes(':'))) return { ok: false, status: 400 };
  if (segs.some((s) => s.startsWith('.') && s !== '.well-known')) return { ok: false, status: 404 };
  const abs = resolve(rootAbs, ...segs);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + sep)) return { ok: false, status: 404 };
  return { ok: true, abs, rel: segs.join('/'), dirHint: pathname.endsWith('/') };
}

export function createStaticHandler({ root, spa = true, log = null } = {}) {
  const rootAbs = realpathSync(resolve(root));
  const zcache = new Map(); // `${abs}|${enc}` -> { stamp, buf }
  let zbytes = 0;
  const counters = { requests: 0, notFound: 0, notModified: 0, compressed: 0, fallback: 0, refused: 0, ranges: 0 };

  function plain(res, status, text, extra = {}) {
    const body = Buffer.from(`${text}\n`);
    res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store', ...SEC_HEADERS, ...extra });
    res.end(res.req && res.req.method === 'HEAD' ? undefined : body);
  }

  async function statFile(abs) {
    try {
      const st = await fsp.stat(abs);
      return st;
    } catch {
      return null;
    }
  }

  // Compression runs on libuv's thread pool (async zlib), never on the
  // event loop: the same process relays live game traffic, and a 1 MB
  // brotli pass done synchronously would stall every session for its
  // duration. One pass per file version; concurrent requests share it.
  const inflight = new Map();
  async function compressed(abs, st, enc) {
    const key = `${abs}|${enc}`;
    const stamp = `${st.size}:${st.mtimeMs}`;
    const hit = zcache.get(key);
    if (hit && hit.stamp === stamp) return hit.buf;
    const fk = `${key}|${stamp}`;
    if (inflight.has(fk)) return inflight.get(fk);
    const job = (async () => {
      const raw = await fsp.readFile(abs);
      const buf =
        enc === 'br'
          ? await brotliAsync(raw, { params: { [zc.BROTLI_PARAM_QUALITY]: 9, [zc.BROTLI_PARAM_SIZE_HINT]: raw.length } })
          : await gzipAsync(raw, { level: 9 });
      const old = zcache.get(key);
      if (old) zbytes -= old.buf.length;
      zcache.set(key, { stamp, buf });
      zbytes += buf.length;
      while (zbytes > COMPRESS_CACHE_MAX && zcache.size > 1) {
        const [k, v] = zcache.entries().next().value;
        zcache.delete(k);
        zbytes -= v.buf.length;
      }
      return buf;
    })();
    inflight.set(fk, job);
    try {
      return await job;
    } finally {
      inflight.delete(fk);
    }
  }
  // Compress every text asset in the background at start-up, so the first
  // player's load does not wait for it.
  async function warm() {
    const out = { files: 0, bytes: 0 };
    async function walk(dir) {
      let list = [];
      try {
        list = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const d of list) {
        if (d.name.startsWith('.')) continue;
        const abs = join(dir, d.name);
        if (d.isDirectory()) await walk(abs);
        else if (d.isFile() && COMPRESSIBLE.test(mimeOf(abs))) {
          const st = await statFile(abs);
          if (!st || st.size < COMPRESS_MIN || st.size > COMPRESS_MAX) continue;
          for (const enc of ['br', 'gzip']) {
            try {
              const b = await compressed(abs, st, enc);
              out.bytes += b.length;
            } catch {
              /* served uncompressed on demand */
            }
          }
          out.files += 1;
        }
      }
    }
    await walk(rootAbs);
    return out;
  }

  async function handle(req, res) {
    counters.requests += 1;
    if (req.method !== 'GET' && req.method !== 'HEAD') return plain(res, 405, 'Method not allowed', { allow: 'GET, HEAD' });
    let pathname;
    try {
      // origin-form targets are paths: "//etc/passwd" is the path //etc/passwd,
      // not a protocol-relative URL naming the host "etc".
      const target = String(req.url || '/');
      pathname = decodeURIComponent(new URL(/^[a-z][a-z0-9+.-]*:/i.test(target) ? target : `http://x${target.startsWith('/') ? '' : '/'}${target}`).pathname);
    } catch {
      counters.refused += 1;
      return plain(res, 400, 'Bad request');
    }
    const r = resolveInside(rootAbs, pathname);
    if (!r.ok) {
      counters.refused += 1;
      return plain(res, r.status, r.status === 400 ? 'Bad request' : 'Not found');
    }
    let abs = r.abs;
    let rel = r.rel;
    let st = await statFile(abs);
    if (st && st.isDirectory()) {
      abs = join(abs, 'index.html');
      rel = rel ? `${rel}/index.html` : 'index.html';
      st = await statFile(abs);
    }
    let fallback = false;
    if (!st || !st.isFile()) {
      // A client-side route (no extension) gets the app; a missing asset is
      // a real 404 — never index.html posing as a script or an image.
      if (spa && !extname(r.rel || '') && !r.dirHint) {
        abs = join(rootAbs, 'index.html');
        rel = 'index.html';
        st = await statFile(abs);
        fallback = true;
      }
      if (!st || !st.isFile()) {
        counters.notFound += 1;
        return plain(res, 404, 'Not found');
      }
      counters.fallback += 1;
    }
    // Symlinks must not lead outside the root.
    try {
      const real = realpathSync(abs);
      if (real !== rootAbs && !real.startsWith(rootAbs + sep)) {
        counters.refused += 1;
        return plain(res, 404, 'Not found');
      }
    } catch {
      return plain(res, 404, 'Not found');
    }
    const type = mimeOf(abs);
    const etag = etagOf(st);
    const lastModified = new Date(Math.floor(st.mtimeMs / 1000) * 1000).toUTCString();
    const headers = {
      'content-type': type,
      'cache-control': fallback ? 'no-cache' : cacheControlFor(rel),
      etag,
      'last-modified': lastModified,
      ...SEC_HEADERS,
    };
    const canZip = COMPRESSIBLE.test(type) && st.size >= COMPRESS_MIN && st.size <= COMPRESS_MAX;
    if (canZip) headers.vary = 'Accept-Encoding';
    else headers['accept-ranges'] = 'bytes';
    // Conditional GET.
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    const matchTag = inm && String(inm).split(',').some((t) => t.trim() === '*' || t.trim().replace(/^W\//, '') === etag.replace(/^W\//, ''));
    const notModifiedSince = !inm && ims && Date.parse(ims) >= Date.parse(lastModified);
    if (matchTag || notModifiedSince) {
      counters.notModified += 1;
      res.writeHead(304, headers);
      return res.end();
    }
    const enc = canZip ? pickEncoding(req.headers['accept-encoding']) : null;
    if (enc) {
      let buf;
      try {
        buf = await compressed(abs, st, enc);
      } catch {
        return plain(res, 500, 'Could not read the file');
      }
      counters.compressed += 1;
      res.writeHead(200, { ...headers, 'content-encoding': enc, 'content-length': buf.length });
      return res.end(req.method === 'HEAD' ? undefined : buf);
    }
    // Single byte range on an uncompressed body.
    const range = !canZip && req.headers.range ? /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range).trim()) : null;
    if (range && (range[1] !== '' || range[2] !== '')) {
      let start = range[1] === '' ? Math.max(0, st.size - Number(range[2])) : Number(range[1]);
      let end = range[1] === '' || range[2] === '' ? st.size - 1 : Math.min(Number(range[2]), st.size - 1);
      if (!(start <= end) || start >= st.size) {
        res.writeHead(416, { ...headers, 'content-range': `bytes */${st.size}`, 'content-length': 0 });
        return res.end();
      }
      counters.ranges += 1;
      res.writeHead(206, { ...headers, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': end - start + 1 });
      if (req.method === 'HEAD') return res.end();
      return pipe(createReadStream(abs, { start, end }), res);
    }
    res.writeHead(200, { ...headers, 'content-length': st.size });
    if (req.method === 'HEAD') return res.end();
    return pipe(createReadStream(abs), res);
  }

  function pipe(stream, res) {
    return new Promise((done) => {
      stream.on('error', (err) => {
        if (log) log('static_error', { error: String(err && err.message) });
        res.destroy();
        done();
      });
      res.on('close', () => {
        stream.destroy();
        done();
      });
      stream.pipe(res);
    });
  }

  handle.root = rootAbs;
  handle.counters = counters;
  handle.warm = warm;
  return handle;
}
