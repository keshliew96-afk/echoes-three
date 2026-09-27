// Per-tab multiplayer session records + live-tab detection
// (docs/gauntlet/PLAN.md §3.7 "Reconnect + host drop"; fix-M5b-r4, NET4-F2).
// Owner: M5b.
//
// Every tab of one browser profile shares localStorage. Up to v0.5.133 the
// profile held ONE session record (`echoes.net.session`), rewritten by
// whichever tab saved last, so:
//   - a second tab opened while the host's tab was live was offered "Rejoin"
//     for that live session — and accepting it threw the live host to the
//     title and restarted the party's run from an empty camp;
//   - a reloaded GUEST tab of the host's profile was offered the HOST's seat
//     (the host's record was the newest) and took the host role.
// Now:
//   - records are kept PER TAB: localStorage `echoes.net.sessions` =
//     { [tabId]: { url, token, code, seat, role, savedAt, tabId } }; the tab
//     id lives in sessionStorage, which survives a reload of that tab and is
//     never shared with another tab (a "Duplicate tab" copy is detected and
//     re-keyed below);
//   - a tab in a room is LIVE: it answers "live?" queries on a
//     BroadcastChannel (every context, incl. http:// LAN pages) and holds a
//     Web Lock named after its session where the page is a secure context
//     (released by the browser the moment the tab closes, reloads or
//     crashes — also covers a frozen background tab that cannot answer);
//   - a record whose session is live in another tab is never offered: this
//     tab's own record first (a reload), else the newest record whose tab is
//     gone (a closed or crashed tab reopened from the link).
// Node (the netbench bots) has no storage here: every call is a no-op and
// nothing keeps the event loop alive.

export const SESSIONS_KEY = 'echoes.net.sessions';
export const LEGACY_SESSION_KEY = 'echoes.net.session'; // single record, builds <= v0.5.133
const TAB_KEY = 'echoes.net.tab';
const CHANNEL = 'echoes.net.tabs';
const LOCK_PREFIX = 'echoes.net.live.';
const ANNOUNCE_TTL_MS = 10000; // a cached "live" announcement counts this long
export const LIVE_QUERY_MS = 220; // how long a fresh query waits for answers

const randomId = () => {
  try {
    const a = new Uint8Array(8);
    crypto.getRandomValues(a);
    return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
  }
};
const validRecord = (r) => !!r && typeof r === 'object' && typeof r.token === 'string' && typeof r.code === 'string' && Number.isFinite(r.savedAt);

// Drop every stored session (reload onto a new build: its rooms are gone).
export function forgetStoredSessions(storage) {
  try {
    storage.removeItem(SESSIONS_KEY);
    storage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* storage blocked — nothing stored either */
  }
}

export function createTabSessions({ storage = null, wallNow = () => Date.now(), windowMs = 60000, log = () => {} } = {}) {
  const browser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const enabled = !!storage && browser;
  let tabStore = null;
  try {
    tabStore = enabled ? window.sessionStorage : null;
  } catch {
    tabStore = null;
  }
  let tabId = null;
  try {
    tabId = tabStore && tabStore.getItem(TAB_KEY);
  } catch {
    tabId = null;
  }
  if (!tabId) {
    tabId = randomId();
    try {
      if (tabStore) tabStore.setItem(TAB_KEY, tabId);
    } catch {
      /* no per-tab storage: the id lives for this page only */
    }
  }
  // liveGetter() -> { token, code, role, seat } | null: this tab's session.
  let liveGetter = () => null;
  const cache = new Map(); // token -> { code, role, seat, tabId, at }
  const waiters = new Set();
  let lockToken = null;
  let lockRelease = null;
  const locks = enabled && typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function' ? navigator.locks : null;

  let ch = null;
  if (enabled && typeof BroadcastChannel === 'function') {
    try {
      ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = (e) => onMessage(e && e.data);
    } catch {
      ch = null;
    }
  }
  const post = (m) => {
    try {
      if (ch) ch.postMessage(m);
    } catch {
      /* closed */
    }
  };
  function mine() {
    try {
      return liveGetter() || null;
    } catch {
      return null;
    }
  }
  function onMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'q') {
      const s = mine();
      if (s && s.token) post({ t: 'live', token: s.token, code: s.code, role: s.role, seat: s.seat, tabId, re: m.n });
    } else if (m.t === 'live' && typeof m.token === 'string') {
      const e = { code: m.code, role: m.role, seat: m.seat, tabId: m.tabId, at: wallNow() };
      cache.set(m.token, e);
      for (const w of waiters) w(m.token, e);
    } else if (m.t === 'gone' && typeof m.token === 'string') {
      cache.delete(m.token);
    } else if (m.t === 'tab?' && m.tabId === tabId && m.n !== nonce) {
      // A "Duplicate tab" copied our sessionStorage (and our id): tell it.
      post({ t: 'tab!', tabId, n: m.n });
    } else if (m.t === 'tab!' && m.tabId === tabId && m.n === nonce) {
      rekey();
    }
  }
  // Duplicate-tab check: a tab that answers for our id is another tab.
  const nonce = randomId();
  post({ t: 'tab?', tabId, n: nonce });
  function rekey() {
    const old = tabId;
    tabId = randomId();
    try {
      if (tabStore) tabStore.setItem(TAB_KEY, tabId);
    } catch {
      /* page-local id */
    }
    log('tab_rekeyed', { from: old, to: tabId });
  }

  // ------------------------------------------------------------ records --
  function readMap() {
    try {
      const s = storage && storage.getItem(SESSIONS_KEY);
      const m = s ? JSON.parse(s) : null;
      return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
    } catch {
      return {};
    }
  }
  function writeMap(m) {
    try {
      if (!storage) return;
      const t = wallNow();
      for (const k of Object.keys(m)) if (!validRecord(m[k]) || t - m[k].savedAt > windowMs) delete m[k];
      if (Object.keys(m).length) storage.setItem(SESSIONS_KEY, JSON.stringify(m));
      else storage.removeItem(SESSIONS_KEY);
    } catch {
      /* storage unavailable (private mode / quota) — sessions just do not survive a reload */
    }
  }
  function readLegacy() {
    try {
      const s = storage && storage.getItem(LEGACY_SESSION_KEY);
      const r = s ? JSON.parse(s) : null;
      return validRecord(r) ? { ...r, tabId: null, legacy: true } : null;
    } catch {
      return null;
    }
  }
  function save(rec) {
    if (!storage) return;
    const m = readMap();
    m[tabId] = { url: rec.url, token: rec.token, code: rec.code, seat: rec.seat, role: rec.role, savedAt: wallNow(), tabId };
    writeMap(m);
    try {
      storage.removeItem(LEGACY_SESSION_KEY); // the old single record is superseded
    } catch {
      /* blocked */
    }
  }
  function remove(id = tabId) {
    if (!storage) return;
    const m = readMap();
    if (m[id]) {
      delete m[id];
      writeMap(m);
    }
  }
  // Every record inside the rejoin window, newest first.
  function candidates() {
    const t = wallNow();
    const out = Object.values(readMap()).filter((r) => validRecord(r) && t - r.savedAt <= windowMs);
    const leg = readLegacy();
    if (leg && t - leg.savedAt <= windowMs && !out.some((r) => r.token === leg.token)) out.push(leg);
    return out.sort((a, b) => b.savedAt - a.savedAt);
  }
  function own() {
    const r = readMap()[tabId];
    return validRecord(r) && wallNow() - r.savedAt <= windowMs ? r : null;
  }

  // --------------------------------------------------------- liveness --
  function setLive(fn) {
    liveGetter = typeof fn === 'function' ? fn : () => null;
  }
  // This tab joined / refreshed a session: tell the other tabs, hold the lock.
  function announce() {
    const s = mine();
    if (!s || !s.token) return;
    post({ t: 'live', token: s.token, code: s.code, role: s.role, seat: s.seat, tabId });
    holdLock(s.token);
  }
  // This tab's session ended (left, lost, room closed, page going away).
  function gone(token = null) {
    const tk = token || lockToken;
    if (tk) post({ t: 'gone', token: tk, tabId });
    releaseLock();
  }
  function holdLock(token) {
    if (!locks || lockToken === token) return;
    releaseLock();
    lockToken = token;
    try {
      locks
        .request(LOCK_PREFIX + token, { mode: 'shared' }, () => new Promise((res) => (lockRelease = res)))
        .catch(() => {
          /* aborted / unsupported */
        });
    } catch {
      lockToken = null;
    }
  }
  function releaseLock() {
    if (lockRelease) lockRelease();
    lockRelease = null;
    lockToken = null;
  }
  // A fresh query: every other live tab answers within a few ms (a message
  // event is not a throttled timer, so background tabs answer too); held
  // Web Locks add tabs that cannot answer (frozen). -> Map(token -> info)
  async function live(timeoutMs = LIVE_QUERY_MS) {
    const found = new Map();
    const selfToken = (mine() || {}).token || null;
    if (!enabled) return found;
    const add = (tk, e) => {
      if (tk && tk !== selfToken) found.set(tk, e);
    };
    const w = (tk, e) => add(tk, e);
    waiters.add(w);
    const n = randomId();
    post({ t: 'q', n });
    let held = null;
    if (locks && typeof locks.query === 'function') {
      held = locks
        .query()
        .then((q) => {
          for (const l of [...(q.held || []), ...(q.pending || [])]) {
            if (l && typeof l.name === 'string' && l.name.startsWith(LOCK_PREFIX)) {
              const tk = l.name.slice(LOCK_PREFIX.length);
              if (tk !== lockToken) add(tk, found.get(tk) || { lock: true, at: wallNow() });
            }
          }
        })
        .catch(() => {});
    }
    await new Promise((r) => setTimeout(r, ch ? timeoutMs : 0));
    if (held) await held;
    waiters.delete(w);
    // The cache follows the freshest picture (tabs that did not answer are gone).
    for (const tk of [...cache.keys()]) if (!found.has(tk)) cache.delete(tk);
    for (const [tk, e] of found) cache.set(tk, { ...e, at: wallNow() });
    return found;
  }
  // Cached picture (announcements + the last query): sync callers.
  function knownLive() {
    const t = wallNow();
    const out = new Map();
    const selfToken = (mine() || {}).token || null;
    for (const [tk, e] of cache) if (t - e.at <= ANNOUNCE_TTL_MS && tk !== selfToken) out.set(tk, e);
    return out;
  }
  // The record this tab may offer / rejoin: its own (a reload) unless that
  // session is live in another tab (a duplicated tab), else the newest record
  // whose tab is gone. `code` narrows to one room.
  function pick({ liveMap = knownLive(), code = null } = {}) {
    const list = candidates().filter((r) => (!code || r.code === code) && !liveMap.has(r.token));
    return list.find((r) => r.tabId === tabId) || list[0] || null;
  }
  // Sessions of this profile that are live in OTHER tabs right now.
  function elsewhere(liveMap = knownLive()) {
    return [...liveMap.values()].filter((e) => e && e.code).map((e) => ({ code: e.code, role: e.role ?? null, seat: e.seat ?? null }));
  }

  // The page is going away (reload / close): the record's clock starts now
  // (the 60 s rejoin window counts from the drop) and the other tabs stop
  // counting this one as live.
  if (enabled) {
    try {
      window.addEventListener('pagehide', () => {
        const s = mine();
        if (s && s.token) {
          const r = readMap()[tabId];
          if (r && r.token === s.token) save({ ...r });
          post({ t: 'gone', token: s.token, tabId });
        }
      });
    } catch {
      /* no window events */
    }
  }

  return {
    get tabId() {
      return tabId;
    },
    enabled,
    save,
    remove,
    clear: () => remove(tabId),
    candidates,
    own,
    setLive,
    announce,
    gone,
    live,
    knownLive,
    pick,
    elsewhere,
  };
}
