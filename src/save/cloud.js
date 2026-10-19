// Cloud saves and backup files (docs/CLOUD_SAVES.md): the whole local save —
// the profile (records, Embers, unlocks) plus every save slot — as one
// bundle, and the way back. The same bundle goes to the session server under
// a short code (Save to cloud) or to a file on disk (Save a backup file).
//
//   makeBundle(store, { game })   -> bundle  { kind: 'echoes-cloud', v: 1, game, savedAt, profile, slots }
//   readBundle(value)             -> { ok, bundle, summary } | { ok: false, error }
//   applyBundle(store, bundle)    -> { ok } | { ok: false, error } — replaces the
//                                    local profile and slots, then FREEZES the
//                                    store: the caller reloads the page. Staged:
//                                    a refused write changes nothing.
//   finishPendingApply(store)     -> a swap a closed page left part-way, finished at boot
//
// Slot pictures (.thumb) stay out: they are large and the next save of that
// slot takes a new one. Settings (language, keys, volume) are this device's
// own and are never in a bundle.
import { parseFile } from './codec.js';
import { PROFILE_KEY, INDEX_KEY } from './storage.js';
import { ALL_SLOTS, slotKey, isSlotId } from './slots.js';
import { parseProfile, newerProfile } from './profile.js';

export const BUNDLE_KIND = 'echoes-cloud';
export const BUNDLE_V = 1;

export function makeBundle(store, { game = null } = {}) {
  const slots = {};
  for (const id of ALL_SLOTS) {
    const text = store.read(slotKey(id));
    if (text !== null && parseFile(text).ok) slots[id] = text;
  }
  const p = store.read(PROFILE_KEY);
  return { kind: BUNDLE_KIND, v: BUNDLE_V, game, savedAt: new Date().toISOString(), profile: p !== null && (parseProfile(p) || newerProfile(p)) ? p : null, slots };
}

// A bundle from the server or a file: checked before anything is replaced.
// error: 'not_a_bundle' | 'newer' (made by a newer game) | 'corrupt' | 'empty'
export function readBundle(value) {
  let b = value;
  if (typeof b === 'string') {
    try {
      b = JSON.parse(b);
    } catch {
      return { ok: false, error: 'not_a_bundle' };
    }
  }
  if (!b || typeof b !== 'object' || b.kind !== BUNDLE_KIND) return { ok: false, error: 'not_a_bundle' };
  if (b.v !== BUNDLE_V) return { ok: false, error: b.v > BUNDLE_V ? 'newer' : 'not_a_bundle' };
  if (!b.slots || typeof b.slots !== 'object') return { ok: false, error: 'not_a_bundle' };
  const ids = Object.keys(b.slots).filter(isSlotId);
  let latest = null;
  for (const id of ids) {
    const pf = parseFile(b.slots[id]);
    if (!pf.ok) return { ok: false, error: pf.error === 'version' && /newer/.test(String(pf.detail)) ? 'newer' : 'corrupt', detail: `${id}: ${pf.detail || pf.error}` };
    const at = pf.file.savedAt || null;
    if (at && (!latest || at > latest)) latest = at;
  }
  const profile = b.profile != null ? parseProfile(b.profile) : null;
  if (b.profile != null && !profile) return { ok: false, error: newerProfile(b.profile) ? 'newer' : 'corrupt', detail: 'profile' };
  if (!profile && !ids.length) return { ok: false, error: 'empty' };
  const summary = {
    slots: ids.length,
    latest,
    savedAt: typeof b.savedAt === 'string' ? b.savedAt : latest,
    game: typeof b.game === 'string' ? b.game : null,
    embers: profile && profile.meta && Number.isFinite(profile.meta.embers) ? profile.meta.embers : 0,
    runs: profile && profile.records && Number.isFinite(profile.records.runs) ? profile.records.runs : null,
  };
  return { ok: true, bundle: b, summary, ids };
}

// SAVE SAFETY (docs/CLOUD_SAVES.md "Loading safely"): nothing on this
// device changes until every file the bundle brings is written. Each one is
// first staged beside its key as <key>.incoming; a write refused while
// staging (quota) removes the staged copies and leaves every local file as it
// was ({ ok: false, error, unchanged: true }). Only then is APPLY_KEY written
// (the plan of the swap) and the files swapped in. A slot the swap cannot
// write with its backup kept frees that slot's old copies first, so the swap
// needs no room beyond what staging proved. A swap that still stops part-way
// returns { ok: false, error: 'partial' } and freezes the store, and a page
// closed mid-swap finishes it on its next boot (finishPendingApply).
export const INCOMING = '.incoming';
export const APPLY_KEY = 'echoes.cloud.applying';

export function applyBundle(store, value) {
  const r = readBundle(value);
  if (!r.ok) return r;
  const { bundle, ids } = r;
  const files = ids.map((id) => [slotKey(id), bundle.slots[id]]);
  if (bundle.profile != null) files.push([PROFILE_KEY, bundle.profile]);
  const staged = [];
  const unstage = () => {
    for (const k of staged) store.remove(`${k}${INCOMING}`);
  };
  for (const [key, text] of files) {
    staged.push(key);
    const w = store.writePlain(`${key}${INCOMING}`, text);
    if (!w.ok) {
      unstage();
      return { ok: false, error: w.error, unchanged: true };
    }
  }
  const plan = { slots: ids, profile: bundle.profile != null };
  const m = store.writePlain(APPLY_KEY, JSON.stringify(plan));
  if (!m.ok) {
    unstage();
    store.remove(APPLY_KEY);
    return { ok: false, error: m.error, unchanged: true };
  }
  const s = swapIn(store, plan);
  store.freeze();
  if (!s.ok) return { ok: false, error: 'partial', detail: s.detail };
  return { ok: true, summary: r.summary };
}

// One staged file into its key. The old copy goes to .bak as any save does
// (only when it is readable: a damaged one never replaces a good backup);
// when that does not fit, the old copies make room first.
function swapFile(store, key, readable) {
  const text = store.read(`${key}${INCOMING}`);
  if (text === null) return { ok: true }; // swapped in before a reload
  store.remove(`${key}.tmp`);
  let w = store.writeAtomic(key, text, { backupIf: readable });
  if (!w.ok) {
    store.remove(`${key}.bak`);
    store.remove(key);
    w = store.writePlain(key, text);
  }
  if (!w.ok) {
    store.remove(`${key}${INCOMING}`);
    w = store.writePlain(key, text);
    if (!w.ok) store.writePlain(`${key}${INCOMING}`, text);
  }
  if (!w.ok) return { ok: false, detail: `${key}: ${w.error}` };
  store.remove(`${key}${INCOMING}`);
  return { ok: true };
}

// Every slot first (the profile last), as before staging: a slot the bundle
// does not hold is removed with its backup.
function swapIn(store, plan) {
  const slots = Array.isArray(plan.slots) ? plan.slots.filter(isSlotId) : [];
  for (const id of ALL_SLOTS) {
    const key = slotKey(id);
    store.remove(`${key}.thumb`);
    if (slots.includes(id)) {
      const w = swapFile(store, key, (cur) => parseFile(cur).ok);
      if (!w.ok) return w;
    } else {
      store.remove(`${key}.tmp`);
      store.remove(key);
      store.remove(`${key}.bak`);
      store.remove(`${key}${INCOMING}`);
    }
  }
  store.remove(INDEX_KEY); // rebuilt from the slots on the next boot
  if (plan.profile) {
    const w = swapFile(store, PROFILE_KEY, (cur) => parseProfile(cur) !== null || newerProfile(cur));
    if (!w.ok) return w;
  }
  store.remove(APPLY_KEY);
  return { ok: true };
}

// Boot, before the profile and the slots are read: a swap a closed page left
// part-way is finished; staged files with no plan (the page closed while
// staging) are dropped. -> null (nothing pending) | { ok, resumed: true }
export function finishPendingApply(store) {
  const text = store.read(APPLY_KEY);
  let plan = null;
  if (text !== null) {
    try {
      plan = JSON.parse(text);
    } catch {
      plan = null;
    }
  }
  if (!plan || typeof plan !== 'object') {
    for (const k of store.keys('echoes.')) if (k.endsWith(INCOMING)) store.remove(k);
    if (text !== null) store.remove(APPLY_KEY);
    return null;
  }
  return { ...swapIn(store, plan), resumed: true };
}
