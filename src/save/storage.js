// Save storage — localStorage with crash-safe writes (docs/gauntlet/PLAN.md
// §3.4 "Integrity + atomic write"). Owner: M2.
//
// Keys (PLAN §2.3): echoes.save.v1.<slot> (+ .bak, .tmp, .thumb),
// echoes.save.v1.index, echoes.profile.v1 (+ .bak, .tmp).
//
// writeAtomic(key, text) — the torn-write-safe protocol:
//   1. write <key>.tmp                      (quota -> fail, main untouched)
//   2. copy the current <key> to <key>.bak  (the last good file survives)
//   3. write <key>                          (quota -> main keeps its old value)
//   4. remove <key>.tmp
// A crash between 1 and 3 leaves main + a newer .tmp: recoverTmp() promotes a
// VALID tmp that is newer than main on the next boot, and drops an invalid
// one. Every call is wrapped: nothing on this path throws to the page.
//
// Probe seams (PLAN §6.4 __echoes.save): simulateQuota(on) makes every write
// throw a real-looking QuotaExceededError; simulateTornWrite(key, text) stops
// the protocol after step 1, exactly like a tab killed mid-save.
export const SAVE_PREFIX = 'echoes.save.v1.';
export const INDEX_KEY = `${SAVE_PREFIX}index`;
export const PROFILE_KEY = 'echoes.profile.v1';

function quotaError() {
  let e;
  try {
    e = new DOMException('The quota has been exceeded (simulated).', 'QuotaExceededError');
  } catch {
    e = new Error('QuotaExceededError (simulated)');
    e.name = 'QuotaExceededError';
  }
  return e;
}

export function isQuotaError(err) {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    /quota/i.test(String(err.message || ''))
  );
}

export function createSaveStorage({ storage = typeof localStorage !== 'undefined' ? localStorage : null } = {}) {
  let quotaSim = false;
  let available = false;
  try {
    if (storage) {
      const k = `${SAVE_PREFIX}__probe`;
      storage.setItem(k, '1');
      storage.removeItem(k);
      available = true;
    }
  } catch {
    available = false;
  }
  // In-memory fallback so a private-mode session still plays (saves are then
  // session-only and the UI says so).
  const mem = new Map();
  const backend = available
    ? storage
    : {
        getItem: (k) => (mem.has(k) ? mem.get(k) : null),
        setItem: (k, v) => mem.set(k, String(v)),
        removeItem: (k) => mem.delete(k),
        key: (i) => [...mem.keys()][i] ?? null,
        get length() {
          return mem.size;
        },
      };

  function read(key) {
    try {
      return backend.getItem(key);
    } catch {
      return null;
    }
  }
  function write(key, text) {
    if (quotaSim) throw quotaError();
    backend.setItem(key, text);
  }
  function remove(key) {
    try {
      backend.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
  function keys(prefix = 'echoes.') {
    const out = [];
    try {
      for (let i = 0; i < backend.length; i++) {
        const k = backend.key(i);
        if (k && k.startsWith(prefix)) out.push(k);
      }
    } catch {
      /* unavailable */
    }
    return out.sort();
  }

  // -> { ok: true } | { ok: false, error: 'quota' | 'unavailable', detail }
  function writeAtomic(key, text) {
    const tmp = `${key}.tmp`;
    try {
      write(tmp, text);
    } catch (err) {
      remove(tmp);
      return { ok: false, error: isQuotaError(err) ? 'quota' : 'unavailable', detail: String(err && err.message) };
    }
    try {
      const cur = read(key);
      if (cur !== null && cur !== text) write(`${key}.bak`, cur);
    } catch (err) {
      remove(tmp);
      return { ok: false, error: isQuotaError(err) ? 'quota' : 'unavailable', detail: String(err && err.message) };
    }
    try {
      write(key, text);
    } catch (err) {
      remove(tmp);
      return { ok: false, error: isQuotaError(err) ? 'quota' : 'unavailable', detail: String(err && err.message) };
    }
    remove(tmp);
    return { ok: true };
  }

  // A plain (non-atomic) write for small derived records (index, thumbnails).
  function writePlain(key, text) {
    try {
      write(key, text);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: isQuotaError(err) ? 'quota' : 'unavailable', detail: String(err && err.message) };
    }
  }

  // Probe: the protocol stopped after step 1 (a tab killed mid-save).
  function simulateTornWrite(key, text) {
    try {
      write(`${key}.tmp`, text);
      return true;
    } catch {
      return false;
    }
  }

  // usage() -> { total, keys: { key: bytes } } (UTF-16: 2 bytes per char)
  function usage() {
    const out = {};
    let total = 0;
    for (const k of keys('echoes.')) {
      const v = read(k);
      const b = v === null ? 0 : (k.length + v.length) * 2;
      out[k] = b;
      total += b;
    }
    return { total, keys: out, backend: available ? 'localStorage' : 'memory' };
  }

  return {
    available,
    read,
    remove,
    keys,
    writeAtomic,
    writePlain,
    simulateTornWrite,
    usage,
    simulateQuota(on) {
      quotaSim = !!on;
      return quotaSim;
    },
    get quotaSimulated() {
      return quotaSim;
    },
  };
}
