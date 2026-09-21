// Settings store (docs/gauntlet/PLAN.md §3.2) — versioned, validated,
// persisted, observable. Owner: M1. Every module registers ITS keys with a
// default + validator (M3 registers audio.*, M5b net.*, M4a gameplay.challenge)
// and reads/writes through get/set; nothing else touches the storage key.
//
// Storage: localStorage[SETTINGS_STORAGE_KEY] = JSON
//   { "v": SETTINGS_VERSION, "savedAt": ISO, "data": { "<path>": value, ... } }
// Flat dotted paths ('display.renderScale') keep validation and migration
// trivial. Unknown keys found in storage are held as `pending` and adopted
// (validated) when their module registers them later in boot.
//
// Robustness (gate G1.8): unparsable JSON / wrong shape -> defaults, the raw
// blob is copied to `<key>.corrupt`, loadReport.status = 'recovered'; a newer
// version -> defaults + 'newer' (never overwrite the newer blob until the user
// changes something); older versions run through MIGRATIONS. Storage that
// throws (privacy mode, quota) degrades to an in-memory store — never a page
// error.
import { EventEmitterLite } from './emitter.js';

export const SETTINGS_STORAGE_KEY = 'echoes.settings';
export const SETTINGS_VERSION = 1;
const PERSIST_DEBOUNCE_MS = 150;

// v -> function(dataOfVersionV) -> dataOfVersionV+1
const MIGRATIONS = {
  // 1: (d) => ({ ...d, 'new.key': d['old.key'] }),
};

// ---------------------------------------------------------- validators --
// A validator returns the normalised value, or `undefined` to reject.
export const V = Object.freeze({
  num: (min, max, step = 0) => (v) => {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
    let c = Math.min(max, Math.max(min, n));
    if (step > 0) c = Math.round((c - min) / step) * step + min;
    return Math.round(c * 1e6) / 1e6;
  },
  int: (min, max) => (v) => {
    const n = typeof v === 'string' ? Number(v) : v;
    if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
    return Math.min(max, Math.max(min, Math.round(n)));
  },
  bool: () => (v) => (typeof v === 'boolean' ? v : v === 1 || v === 'true' ? true : v === 0 || v === 'false' ? false : undefined),
  oneOf: (list) => (v) => (list.includes(v) ? v : undefined),
  str: (maxLen = 64) => (v) => (typeof v === 'string' ? v.slice(0, maxLen) : undefined),
});

// Core keys owned by M1 (display + gameplay). Other modules register theirs
// with store.register(path, spec) during boot.
export const CORE_SETTINGS = Object.freeze({
  'display.renderScale': { default: 1.0, validate: V.num(0.5, 1.5, 0.05) },
  'display.fullscreen': { default: false, validate: V.bool() },
  'display.vsync': { default: true, validate: V.bool() },
  'display.frameLimit': { default: 0, validate: V.oneOf([0, 30, 60, 120, 144]) }, // 0 = unlimited
  'display.showFps': { default: false, validate: V.bool() },
  'gameplay.screenshake': { default: 1, validate: V.oneOf([0, 0.5, 1]) },
  'gameplay.autoPause': { default: true, validate: V.bool() }, // pause on blur/hidden (single-player)
});

function safeStorage(storage) {
  try {
    if (!storage) return null;
    const probe = 'echoes.__probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function createSettingsStore({
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
  key = SETTINGS_STORAGE_KEY,
  specs = CORE_SETTINGS,
} = {}) {
  const store = safeStorage(storage);
  const emitter = new EventEmitterLite();
  const registry = new Map(); // path -> { default, validate, persist }
  const values = new Map(); // path -> current value (registered keys only)
  let pending = {}; // raw values from storage for keys not registered yet
  let timer = null;
  let dirty = false;
  let holdNewer = false; // a newer-version blob is on disk: don't clobber it unprompted
  const loadReport = { status: 'defaults', from: null, errors: [], storage: store ? 'localStorage' : 'memory' };

  function readDisk() {
    if (!store) return;
    let raw = null;
    try {
      raw = store.getItem(key);
    } catch (err) {
      loadReport.errors.push(`read: ${err && err.message}`);
      return;
    }
    if (raw === null) return;
    let doc;
    try {
      doc = JSON.parse(raw);
      if (!doc || typeof doc !== 'object' || typeof doc.v !== 'number' || !doc.data || typeof doc.data !== 'object') {
        throw new Error('bad shape');
      }
    } catch (err) {
      loadReport.status = 'recovered';
      loadReport.errors.push(`parse: ${err && err.message}`);
      try {
        store.setItem(`${key}.corrupt`, raw);
      } catch {
        /* quota — the corrupt copy is best-effort */
      }
      return;
    }
    loadReport.from = doc.v;
    if (doc.v > SETTINGS_VERSION) {
      loadReport.status = 'newer';
      holdNewer = true;
      return;
    }
    let data = doc.data;
    for (let v = doc.v; v < SETTINGS_VERSION; v++) {
      if (MIGRATIONS[v]) data = MIGRATIONS[v](data);
    }
    loadReport.status = doc.v < SETTINGS_VERSION ? 'migrated' : 'ok';
    pending = { ...data };
  }

  function register(path, spec) {
    if (registry.has(path)) return get(path);
    const s = { persist: true, ...spec };
    registry.set(path, s);
    let v = s.default;
    if (Object.prototype.hasOwnProperty.call(pending, path)) {
      const norm = s.validate ? s.validate(pending[path]) : pending[path];
      if (norm !== undefined) v = norm;
      else loadReport.errors.push(`invalid ${path}`);
      delete pending[path];
    }
    values.set(path, v);
    return v;
  }

  function get(path) {
    if (values.has(path)) return values.get(path);
    const s = registry.get(path);
    return s ? s.default : undefined;
  }

  // set(path, value, { persist = true, source = 'api' }) -> the stored value,
  // or undefined when the key is unknown / the value is rejected.
  function set(path, value, { persist = true, source = 'api' } = {}) {
    const s = registry.get(path);
    if (!s) return undefined;
    const norm = s.validate ? s.validate(value) : value;
    if (norm === undefined) return undefined;
    const prev = values.get(path);
    if (Object.is(prev, norm)) return norm;
    values.set(path, norm);
    emitter.emit('change', { path, value: norm, prev, source });
    if (persist && s.persist) schedulePersist();
    return norm;
  }

  // subscribe('display.renderScale' | 'display' | '*', fn(value, path, prev, source))
  function subscribe(keyOrPrefix, fn) {
    return emitter.on('change', ({ path, value, prev, source }) => {
      if (keyOrPrefix === '*' || path === keyOrPrefix || path.startsWith(`${keyOrPrefix}.`)) {
        fn(value, path, prev, source);
      }
    });
  }

  function reset(prefix = '') {
    for (const [path, s] of registry) {
      if (!prefix || path === prefix || path.startsWith(`${prefix}.`)) set(path, s.default, { source: 'reset' });
    }
  }

  function snapshot() {
    const out = {};
    for (const [path, v] of values) out[path] = v;
    return out;
  }

  function schedulePersist() {
    dirty = true;
    holdNewer = false; // an explicit change wins over a newer blob
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      persist();
    }, PERSIST_DEBOUNCE_MS);
  }

  // persist() -> true when written. Keeps not-yet-registered pending keys so a
  // module that registers late never loses its saved value.
  function persist() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!store || holdNewer || !dirty) return false;
    const data = { ...pending };
    for (const [path, v] of values) if (registry.get(path).persist) data[path] = v;
    try {
      store.setItem(key, JSON.stringify({ v: SETTINGS_VERSION, savedAt: new Date().toISOString(), data }));
      dirty = false;
      return true;
    } catch (err) {
      loadReport.errors.push(`write: ${err && err.message}`);
      return false;
    }
  }

  readDisk();
  for (const [path, spec] of Object.entries(specs)) register(path, spec);
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persist();
    });
  }

  return {
    register,
    get,
    set,
    subscribe,
    reset,
    snapshot,
    persist,
    get loadReport() {
      return { ...loadReport, errors: [...loadReport.errors] };
    },
    get storageKey() {
      return key;
    },
    keys: () => [...registry.keys()],
  };
}
