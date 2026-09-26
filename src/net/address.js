// Where the multiplayer server is (docs/gauntlet/PLAN.md §14, owner DEPLOY).
// ISOMORPHIC: the browser client and the Node bots (netbench) import it; no
// DOM access at module scope.
//
// A player who opens the host's link and clicks Multiplayer must never type
// an address. The client therefore resolves its session server as
//
//   1. ?net=<ws url>          the page link / harness param (probes pass it)
//   2. saved                  an address the player explicitly saved
//                             (Settings ▸ Network or "Change server")
//   3. build                  VITE_NET_URL baked in at build time — a game
//                             on a CDN whose session server lives elsewhere
//   4. site                   the page's own origin: https -> wss://<host>/echoes,
//                             http -> ws://<host>/echoes (the one-process
//                             deploy `npm run serve`, a Caddy/nginx proxy, and
//                             the dev / preview servers, which proxy /echoes)
//   5. local                  no site to ask (file://, Node): this computer,
//                             ws://127.0.0.1:7800/echoes
//
// Source 4 is "Automatic (this site)" in the UI; 3 and 5 are automatic too
// (the player saved nothing). An https page never resolves to ws:// — the
// browser would block it as mixed content — so a saved/param ws:// address on
// an https page is skipped with a reason the UI can show.
import { DEFAULT_URL, WS_PATH } from './protocol/constants.js';

// The address every pre-DEPLOY build saved as its DEFAULT (≤ v0.5.117). A
// settings blob from those builds holds it whether or not the player ever
// chose it; session.js migrates it to "automatic" exactly once.
export const LEGACY_DEFAULT_URL = DEFAULT_URL;

// validateServerUrl(u, { https }) -> { ok, url } | { ok:false, reason }
export function validateServerUrl(u, { https = false } = {}) {
  if (typeof u !== 'string' || !u.trim()) return { ok: false, reason: 'empty' };
  let parsed;
  try {
    parsed = new URL(u.trim());
  } catch {
    return { ok: false, reason: 'not_a_url' };
  }
  if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return { ok: false, reason: 'not_ws' };
  if (https && parsed.protocol === 'ws:') return { ok: false, reason: 'insecure_on_https' };
  return { ok: true, url: parsed.href.replace(/\/$/, parsed.pathname === '/' ? '' : '/') };
}

// The page's own location, or null (Node, workers without one).
export function pageLocation() {
  try {
    return typeof location !== 'undefined' && location && typeof location.protocol === 'string' ? location : null;
  } catch {
    return null;
  }
}

// The session server of the site this page came from, or null when the page
// has no web origin (file://, about:blank, Node).
export function siteServerUrl(loc = pageLocation()) {
  if (!loc || (loc.protocol !== 'http:' && loc.protocol !== 'https:') || !loc.host) return null;
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}${WS_PATH}`;
}

// VITE_NET_URL, statically replaced by Vite at build time; undefined in Node.
export function buildServerUrl() {
  let v = null;
  try {
    v = import.meta.env ? import.meta.env.VITE_NET_URL : null;
  } catch {
    v = null;
  }
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export function isLoopbackHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return LOOPBACK_HOSTS.has(h) || h.endsWith('.localhost') || /^127\./.test(h);
}

// resolveServerAddress({ param, saved, build, loc }) -> {
//   url, source: 'param'|'saved'|'build'|'site'|'local', auto, site, https,
//   file, skipped: [{ source, url, reason }] }
export function resolveServerAddress({ param = null, saved = null, build = buildServerUrl(), loc = pageLocation() } = {}) {
  const https = !!loc && loc.protocol === 'https:';
  const file = !!loc && loc.protocol === 'file:';
  const site = siteServerUrl(loc);
  const skipped = [];
  const pick = (source, raw) => {
    if (!raw) return null;
    const v = validateServerUrl(String(raw), { https });
    if (v.ok) return { url: v.url, source };
    skipped.push({ source, url: String(raw), reason: v.reason });
    return null;
  };
  const hit = pick('param', param) || pick('saved', saved) || pick('build', build) || (site ? { url: site, source: 'site' } : null) || { url: DEFAULT_URL, source: 'local' };
  return { ...hit, auto: hit.source === 'site' || hit.source === 'build' || hit.source === 'local', site, https, file, skipped };
}

// A short human label for where the address came from (Settings ▸ Network,
// the Multiplayer side panel).
export function sourceLabel(source) {
  switch (source) {
    case 'param':
      return 'Set by the page link (?net=)';
    case 'saved':
      return 'Custom address';
    case 'build':
      return 'Automatic (this build’s server)';
    case 'site':
      return 'Automatic (this site)';
    default:
      return 'Automatic (this computer)';
  }
}

// ------------------------------------------------------------ versions --
// '0.5.117' -> [0, 5, 117]; null when it is not a dotted version.
export function parseVersion(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
// True when `a` is a strictly newer version than `b` (both dotted).
export function isNewerVersion(a, b) {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return false;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

// The hashed entry chunk this page runs ('index-RG0Trzja.js'), or null in dev
// / Node. This module is bundled into the entry chunk, so its own URL names
// it; the production build writes the same name into version.json and a
// `--static` server reports it, which catches a redeploy that kept the
// version number.
export function ownEntryChunk() {
  try {
    const m = /\/([^/]+-[A-Za-z0-9_-]{6,}\.m?js)$/.exec(new URL(import.meta.url).pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// The build the page's own site serves now (`version.json`, written next to
// index.html by the production build). A game on a CDN whose session server
// lives elsewhere still learns it was redeployed. Browser only; null on any
// failure (dev server, file://, offline, a host without the file).
export async function fetchSiteBuild({ timeoutMs = 2500 } = {}) {
  const loc = pageLocation();
  if (!loc || (loc.protocol !== 'http:' && loc.protocol !== 'https:') || typeof fetch !== 'function') return null;
  let ctl = null;
  let timer = null;
  try {
    ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    if (ctl) timer = setTimeout(() => ctl.abort(), timeoutMs);
    const base = typeof document !== 'undefined' && document.baseURI ? document.baseURI : loc.href;
    const res = await fetch(new URL('version.json', base).href, { cache: 'no-store', headers: { accept: 'application/json' }, signal: ctl ? ctl.signal : undefined });
    if (!res.ok || !/json/i.test(res.headers.get('content-type') || '')) return null;
    const j = await res.json();
    return j && typeof j.version === 'string' && parseVersion(j.version) ? { version: j.version, entry: typeof j.entry === 'string' ? j.entry : null } : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
