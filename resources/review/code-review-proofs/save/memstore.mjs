export function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  let quotaAfter = Infinity, budget = Infinity;
  const s = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (s.failKey && s.failKey(k, v)) { const e = new Error('quota exceeded'); e.name = 'QuotaExceededError'; throw e; }
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _m: m,
  };
  return s;
}
